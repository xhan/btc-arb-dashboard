const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { ethers } = require('ethers');
const { AggregatorClient } = require('@cetusprotocol/aggregator-sdk');
const BN = require('bn.js');
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { buildLifiChainIdMap, resolveLifiChainId } = require('./lifi-utils');
const { getDisplayedToAmountRaw } = require('./lifi-quote-utils');
const { normalizePriceSnapshotConfig, appendPriceSnapshot, getClosestPriceSnapshot } = require('./price-snapshot-store');
const { decorateSnapshotSelection, buildReplayFromSnapshot, renderReplayText } = require('./price-snapshot-replay');
const { parseUtc8Input } = require('./time-utils');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SERVER_VERBOSE = process.argv.includes('-v')
    || process.argv.includes('--verbose')
    || process.env.SERVER_VERBOSE === '1'
    || ['verbose', 'silly'].includes(String(process.env.npm_config_loglevel || '').toLowerCase());
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/snapshot', (req, res) => {
    res.sendFile(path.join(__dirname, 'snapshot.html'));
});
const CONFIG_PATH = './config.json';
const CONFIG_MORE_PATH = './config_more.json';
const METADATA_CACHE_PATH = './metadata-cache.json';
const PRICE_SNAPSHOT_DIR = path.resolve(process.env.PRICE_SNAPSHOT_DIR || path.join(__dirname, 'db', 'price'));

let tokenMetaCache = {};

let writeQueue = Promise.resolve();

async function safeWriteConfig(data) {
    writeQueue = writeQueue.then(async () => {
        try {
            const tempPath = `${CONFIG_PATH}.tmp`;
            await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
            await fs.rename(tempPath, CONFIG_PATH); 
        } catch (error) {
            console.error('❌ 写入配置失败:', error);
        }
    });
    return writeQueue;
}

function stripBom(text) {
    return text.replace(/^\uFEFF/, '');
}

function getLogTimestamp() {
    const d = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hour = pad(d.getHours());
    const minute = pad(d.getMinutes());
    const second = pad(d.getSeconds());
    const ms = pad(d.getMilliseconds(), 3);

    const offsetMinutes = -d.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMinutes);
    const offsetHour = pad(Math.floor(abs / 60));
    const offsetMin = pad(abs % 60);
    return `${year}-${month}-${day} ${hour}:${minute}:${second}.${ms} ${sign}${offsetHour}:${offsetMin}`;
}

function logMessage(category, message, level = 'info') {
    const line = `[${getLogTimestamp()}] [${category}] ${message}`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
}

function verboseLog(category, message) {
    if (!SERVER_VERBOSE) return;
    logMessage(category, message, 'info');
}

function shortAddr(addr = '') {
    const s = String(addr);
    if (s.length <= 12) return s;
    return `${s.slice(0, 6)}...${s.slice(-4)}`;
}

function getQuoteLogPairLabel(chain, fromSymbol, toSymbol, fromToken, toToken) {
    const left = fromSymbol || shortAddr(fromToken);
    const right = toSymbol || shortAddr(toToken);
    return `${String(chain || '').toLowerCase()} ${left}/${right}`;
}

function logQuoteRequest(source, ctx) {
    const pair = getQuoteLogPairLabel(ctx.chain, ctx.fromSymbol, ctx.toSymbol, ctx.fromToken, ctx.toToken);
    verboseLog(`${source}_REQ`, `${pair} amount=${ctx.amount ?? ''} url=${ctx.url}`);
}

function logQuoteResult(source, ctx) {
    const pair = getQuoteLogPairLabel(ctx.chain, ctx.fromSymbol, ctx.toSymbol, ctx.fromToken, ctx.toToken);
    const price = Number.isFinite(ctx.rawPrice) ? ctx.rawPrice : NaN;
    const amountOut = Number.isFinite(ctx.amountOut) ? ctx.amountOut : NaN;
    const priceText = Number.isFinite(price) ? price.toFixed(10) : 'NaN';
    const amountOutText = Number.isFinite(amountOut) ? amountOut.toString() : 'NaN';
    verboseLog(`${source}_RES`, `${pair} 结果=OK price=${priceText} amountOut=${amountOutText}`);
}

function logQuoteError(source, ctx, error) {
    const pair = getQuoteLogPairLabel(ctx.chain, ctx.fromSymbol, ctx.toSymbol, ctx.fromToken, ctx.toToken);
    logMessage(`${source}_ERR`, `${pair} ${error.message}`, 'warn');
}

async function readJsonFile(filePath) {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(stripBom(data));
}

async function getConfigMore() {
    try {
        const configMore = await readJsonFile(CONFIG_MORE_PATH);
        const rawClientId = typeof configMore.kyberClientId === 'string' ? configMore.kyberClientId.trim() : '';
        const rawLifiApiKey = typeof configMore.LIFIApiKey === 'string' ? configMore.LIFIApiKey.trim() : '';
        const rawLifiIntegrator = typeof configMore.LIFIIntegrator === 'string' ? configMore.LIFIIntegrator.trim() : '';

        return {
            kyberClientId: rawClientId || 'xh-quote-dashboard',
            lifiApiKey: rawLifiApiKey,
            lifiIntegrator: rawLifiIntegrator,
            enablePriceSnapshot: configMore.enablePriceSnapshot === true,
            priceSnapshotIntervalSec: Number.parseInt(configMore.priceSnapshotIntervalSec, 10) || 10
        };
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn(`⚠️ 读取config_more失败，使用默认值: ${error.message}`);
        }
        return {
            kyberClientId: 'xh-quote-dashboard',
            lifiApiKey: '',
            lifiIntegrator: '',
            enablePriceSnapshot: false,
            priceSnapshotIntervalSec: 10
        };
    }
}

async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                 const errorText = await response.text();
                 
                 try {
                     const errorKv = JSON.parse(errorText);
                     if (errorKv.reason) throw new Error(errorKv.reason);
                     if (errorKv.message) throw new Error(errorKv.message);
                     
                     if (errorKv.code && errorKv.validationErrors) {
                         const details = errorKv.validationErrors.map(e => e.reason || e.field).join(', ');
                         throw new Error(`0x校验错误: ${details}`);
                     }
                 } catch(e) {
                     
                 }
                 throw new Error(`API响应错误: ${response.status} ${response.statusText} - ${errorText}`);
            }
            return response; 
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            if (i === retries - 1) {
                 logMessage('HTTP_FINAL_FAIL', `请求最终失败: ${url} | error=${error.message}`, 'warn');
            }
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; 
            } else {
                throw error; 
            }
        }
    }
}

async function loadCache() {
    try {
        tokenMetaCache = await readJsonFile(METADATA_CACHE_PATH);
        console.log('代币元数据缓存已加载');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('ℹ️ 未找到元数据缓存文件，将自动创建一个新的。');
        } else {
            console.error('❌ 加载元数据缓存失败:', error);
        }
    }
}

async function saveCache() {
    try {
        await fs.writeFile(METADATA_CACHE_PATH, JSON.stringify(tokenMetaCache, null, 2), 'utf-8');
    } catch (error) {
        console.error('❌ 保存元数据缓存失败:', error);
    }
}

async function getCachedMetadata(key, fetchFunction) {
    if (tokenMetaCache[key]) {
        return tokenMetaCache[key];
    }
    const metadata = await fetchFunction();
    tokenMetaCache[key] = metadata;
    await saveCache();
    return metadata;
}
// chainlist.org RPC endpoints
const RPC_URLS = {
    ethereum: 'https://eth.llamarpc.com',
    optimism: 'https://optimism-rpc.publicnode.com',
    bsc: 'https://bsc-rpc.publicnode.com',
    polygon: 'https://polygon-bor-rpc.publicnode.com',
    base: 'https://base.llamarpc.com',
    arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
    avalanche: 'https://api.avax.network/ext/bc/C/rpc',
    linea: 'https://linea-rpc.publicnode.com',
    scroll: 'https://rpc.scroll.io',
    mantle: 'https://mantle-rpc.publicnode.com',
    blast: 'https://rpc.blast.io',
    mode: 'https://mainnet.mode.network',

    sonic: 'https://rpc.soniclabs.com',
    berachain: 'https://berachain-rpc.publicnode.com',
    ronin: 'https://ronin.drpc.org',
    unichain: 'https://sepolia.unichain.org',
    hyperevm: 'https://rpc.hypurrscan.io',
    plasma: 'https://rpc.plasma.to',
    etherlink: 'https://node.mainnet.etherlink.com',
    monad: 'https://monad-mainnet.drpc.org',

    zksync: 'https://mainnet.era.zksync.io',
    moonbeam: 'https://rpc.api.moonbeam.network',
    boba: 'https://mainnet.boba.network',
    gnosis: 'https://rpc.gnosischain.com',
    rootstock: 'https://public-node.rsk.co',
    'polygon-zkevm': 'https://zkevm-rpc.com',
    taiko: 'https://rpc.mainnet.taiko.xyz',
    sei: 'https://evm-rpc.sei-apis.com',
    filecoin: 'https://api.node.glif.io/rpc/v1',
    celo: 'https://forno.celo.org',
    fantom: 'https://rpc.ftm.tools',
    cronos: 'https://evm.cronos.org'
};

const ZEROX_API_KEY = '7e3d32e8-2cf8-413a-9cbe-24b8b0779588';
const ZEROX_CHAIN_IDS = {
    'ethereum': 1,
    'optimism': 10,
    'bsc': 56,
    'polygon': 137,
    'base': 8453,
    'arbitrum': 42161,
    'avalanche': 43114,
    'linea': 59144,
    'scroll': 534352,
    'mantle': 5000,
    'blast': 81457,
    'mode': 34443
};

const evmProviders = {};
for (const chain in RPC_URLS) {
    try {
        evmProviders[chain] = new ethers.JsonRpcProvider(RPC_URLS[chain]);
    } catch (e) {
        console.warn(`⚠️ ${chain} Provider 初始化失败:`, e.message);
    }
}
console.log("所有 EVM Provider 初始化尝试完成");

const ERC20_ABI = ["function decimals() view returns (uint8)", "function symbol() view returns (string)"];
const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
const cetusAggregator = new AggregatorClient('https://api.cetus.zone/router_v2/find_routes');
const solanaRpc = 'https://mainnet.helius-rpc.com/?api-key=f5e20297-9ca2-4afb-98f9-be16153777b5';
const LIFI_API_BASE_URL = 'https://li.quest/v1';
const LIFI_DEFAULT_FROM_ADDRESS = '0x1111111111111111111111111111111111111111';
const LIFI_DEFAULT_SLIPPAGE = '0.005';

let lifiChainIdMapCache = null;
let lifiChainIdMapFetchedAt = 0;
const LIFI_CHAIN_MAP_TTL_MS = 10 * 60 * 1000;

function getLifiHeaders(configMore = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const apiKey = configMore.lifiApiKey;
    if (apiKey) {
        headers['x-lifi-api-key'] = apiKey;
    }
    return headers;
}

async function getLifiChainIdMap(configMore = {}) {
    const now = Date.now();
    if (lifiChainIdMapCache && (now - lifiChainIdMapFetchedAt) < LIFI_CHAIN_MAP_TTL_MS) {
        return lifiChainIdMapCache;
    }

    const response = await fetchWithRetry(`${LIFI_API_BASE_URL}/chains`, { headers: getLifiHeaders(configMore) });
    const data = await response.json();
    lifiChainIdMapCache = buildLifiChainIdMap(data?.chains);
    lifiChainIdMapFetchedAt = now;
    return lifiChainIdMapCache;
}

async function getLifiTokenMeta(chainId, tokenAddress, configMore = {}) {
    const params = new URLSearchParams({
        chain: String(chainId),
        token: tokenAddress
    });
    const response = await fetchWithRetry(`${LIFI_API_BASE_URL}/token?${params.toString()}`, { headers: getLifiHeaders(configMore) });
    const data = await response.json();
    if (!data || !Number.isFinite(Number(data.decimals))) {
        throw new Error(`LI.FI 无法识别代币: ${tokenAddress}`);
    }
    return { decimals: Number(data.decimals), symbol: data.symbol || '???' };
}

app.post('/api/save-config', async (req, res) => {
    try {
        await safeWriteConfig(req.body);
        res.json({ message: '配置保存成功' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/get-config', async (req, res) => {
    try {
        const parsedData = await readJsonFile(CONFIG_PATH);
        res.json(parsedData);
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error("Config JSON Parse Error:", error);
            return res.json([]);
        }
        if (error.code === 'ENOENT') { return res.json([]); }
        console.error("Config Read Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/get-price-snapshot-config', async (req, res) => {
    try {
        const configMore = await getConfigMore();
        res.json(normalizePriceSnapshotConfig(configMore));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/save-price-snapshot', async (req, res) => {
    try {
        const configMore = await getConfigMore();
        const snapshotConfig = normalizePriceSnapshotConfig(configMore);
        if (!snapshotConfig.enabled) {
            return res.json({ message: '价格快照未启用', skipped: true });
        }

        const savedPath = await appendPriceSnapshot(PRICE_SNAPSHOT_DIR, req.body || {});
        verboseLog('SNAPSHOT', `价格快照已保存: ${savedPath}`);
        res.json({ message: '价格快照保存成功' });
    } catch (error) {
        logMessage('SNAPSHOT_ERR', `价格快照保存失败: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/get-price-snapshot', async (req, res) => {
    try {
        const at = req.query.at ? parseUtc8Input(req.query.at) : new Date();
        if (Number.isNaN(at.getTime())) {
            throw new Error('无效的 at 参数');
        }

        const mode = ['floor', 'nearest', 'ceil'].includes(String(req.query.mode || '')) ? String(req.query.mode) : 'floor';
        const maxGapSec = Number.parseInt(req.query.maxGapSec || req.query['max-gap-sec'], 10);
        const maxGapMs = Number.isFinite(maxGapSec) && maxGapSec > 0 ? maxGapSec * 1000 : null;
        const selection = await getClosestPriceSnapshot(PRICE_SNAPSHOT_DIR, at, { mode, maxGapMs });
        if (!selection) {
            return res.json(null);
        }

        res.json(decorateSnapshotSelection(selection));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/replay-arb-snapshot', async (req, res) => {
    try {
        const at = req.query.at ? parseUtc8Input(req.query.at) : new Date();
        if (Number.isNaN(at.getTime())) {
            throw new Error('无效的 at 参数');
        }

        const mode = ['floor', 'nearest', 'ceil'].includes(String(req.query.mode || '')) ? String(req.query.mode) : 'floor';
        const format = String(req.query.format || 'json').toLowerCase() === 'text' ? 'text' : 'json';
        const maxGapSec = Number.parseInt(req.query.maxGapSec || req.query['max-gap-sec'], 10);
        const maxGapMs = Number.isFinite(maxGapSec) && maxGapSec > 0 ? maxGapSec * 1000 : null;
        const selection = await getClosestPriceSnapshot(PRICE_SNAPSHOT_DIR, at, { mode, maxGapMs });

        if (!selection) {
            if (format === 'text') {
                return res.status(404).type('text/plain; charset=utf-8').send('未找到满足条件的快照');
            }
            return res.status(404).json({ error: '未找到满足条件的快照' });
        }

        const replay = buildReplayFromSnapshot(selection);
        if (format === 'text') {
            return res.type('text/plain; charset=utf-8').send(renderReplayText(replay));
        }

        res.json(replay);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function getEvmTokenMeta(chain, tokenAddress, provider) {
    return await getCachedMetadata(`${chain}-${tokenAddress}`, async () => {
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [decimals, symbol] = await Promise.all([contract.decimals(), contract.symbol()]);
        return { decimals: Number(decimals), symbol };
    });
}

app.post('/api/get-evm-meta', async (req, res) => {
    const { chain, tokenAddress } = req.body;
    try {
        const provider = evmProviders[chain];
        if (!provider) throw new Error(`不支持的EVM链: ${chain}`);
        const meta = await getEvmTokenMeta(chain, tokenAddress, provider);
        res.json(meta);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/get-0x-quote', async (req, res) => {
    const { chain, fromToken, toToken, amount } = req.body;
    const finalAmount = amount || 1;
    let logCtx = { chain, fromToken, toToken, amount: finalAmount };

    try {
        const chainId = ZEROX_CHAIN_IDS[chain.toLowerCase()];
        if (!chainId) throw new Error(`0x 不支持此链: ${chain}`);

        const provider = evmProviders[chain];
        if (!provider) throw new Error(`不支持的EVM链或Provider未初始化: ${chain}`);

        const [fromMeta, toMeta] = await Promise.all([
            getEvmTokenMeta(chain, fromToken, provider),
            getEvmTokenMeta(chain, toToken, provider)
        ]);
        logCtx = { ...logCtx, fromSymbol: fromMeta.symbol, toSymbol: toMeta.symbol };

        const amountInWei = ethers.parseUnits(finalAmount.toString(), fromMeta.decimals).toString();
        
        
        
        
        const params = new URLSearchParams({
            chainId: chainId.toString(),
            sellToken: fromToken,
            buyToken: toToken,
            sellAmount: amountInWei
            
        });

        const apiUrl = `https://api.0x.org/swap/permit2/price?${params.toString()}`;
        logQuoteRequest('ZEROX', { ...logCtx, url: apiUrl });
        
        const response = await fetchWithRetry(apiUrl, { 
            headers: { 
                '0x-api-key': ZEROX_API_KEY,
                '0x-version': 'v2',
                'Content-Type': 'application/json'
            } 
        });

        if (response.status === 429) throw new Error("0x 请求过快 (Rate Limit)");

        const resultData = await response.json();
        
        
        if (resultData.liquidityAvailable === false) {
             throw new Error("流动性不足 (0x: Liquidity Unavailable)");
        }
        
        
        if (resultData.issues && resultData.issues.simulationIncomplete) {
            
        }

        
        
        let destAmountRaw = BigInt(resultData.buyAmount);
        
        if (!destAmountRaw) throw new Error("0x未返回有效购买数量");

        
        if (resultData.fees && resultData.fees.zeroExFee) {
            const fee = resultData.fees.zeroExFee;
            const feeAmount = BigInt(fee.amount);
            const feeTokenLower = fee.token.toLowerCase();
            
            if (feeTokenLower === toToken.toLowerCase()) {
                
                
                destAmountRaw += feeAmount; 
            } else if (feeTokenLower === fromToken.toLowerCase()) {
                
                
                
                
                const sellAmountBN = BigInt(amountInWei);
                if (sellAmountBN > feeAmount) {
                    const effectiveSellAmount = sellAmountBN - feeAmount;
                    
                    destAmountRaw = (destAmountRaw * sellAmountBN) / effectiveSellAmount;
                }
            }
        }
        
        

        
        const finalAmountOut = parseFloat(ethers.formatUnits(destAmountRaw, toMeta.decimals));

        const result = {
            fromSymbol: fromMeta.symbol,
            toSymbol: toMeta.symbol,
            amountOut: finalAmountOut,
            raw_price: finalAmountOut / finalAmount,
            source: '0x'
        };
        logQuoteResult('ZEROX', { ...logCtx, amountOut: result.amountOut, rawPrice: result.raw_price });
        res.json(result);

    } catch (error) {
        logQuoteError('ZEROX', logCtx, error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/get-lifi-quote', async (req, res) => {
    const { chain, fromToken, toToken, amount } = req.body;
    const finalAmount = amount || 1;
    let logCtx = { chain, fromToken, toToken, amount: finalAmount };

    try {
        if (!chain || !fromToken || !toToken) {
            throw new Error('缺少 chain/fromToken/toToken 参数');
        }

        const configMore = await getConfigMore();
        const chainIdMap = await getLifiChainIdMap(configMore);
        const chainId = resolveLifiChainId(chain, chainIdMap);
        if (!chainId) {
            throw new Error(`LI.FI 不支持此链: ${chain}`);
        }

        const [fromMeta, toMeta] = await Promise.all([
            getLifiTokenMeta(chainId, fromToken, configMore),
            getLifiTokenMeta(chainId, toToken, configMore)
        ]);
        logCtx = { ...logCtx, fromSymbol: fromMeta.symbol, toSymbol: toMeta.symbol };

        const fromAmount = ethers.parseUnits(finalAmount.toString(), fromMeta.decimals).toString();
        const quoteParams = new URLSearchParams({
            fromChain: String(chainId),
            toChain: String(chainId),
            fromToken,
            toToken,
            fromAmount,
            fromAddress: LIFI_DEFAULT_FROM_ADDRESS,
            toAddress: LIFI_DEFAULT_FROM_ADDRESS,
            slippage: LIFI_DEFAULT_SLIPPAGE
        });

        const integrator = configMore.lifiIntegrator;
        if (integrator) {
            quoteParams.set('integrator', integrator);
        }

        const lifiQuoteUrl = `${LIFI_API_BASE_URL}/quote?${quoteParams.toString()}`;
        logQuoteRequest('LIFI', { ...logCtx, url: lifiQuoteUrl });
        const quoteResp = await fetchWithRetry(
            lifiQuoteUrl,
            { headers: getLifiHeaders(configMore) }
        );
        const quoteData = await quoteResp.json();
        const toAmountRaw = getDisplayedToAmountRaw(quoteData);
        if (!toAmountRaw) {
            throw new Error(quoteData?.message || 'LI.FI 未返回有效报价');
        }

        const finalAmountOut = parseFloat(ethers.formatUnits(toAmountRaw, toMeta.decimals));
        const result = {
            fromSymbol: fromMeta.symbol,
            toSymbol: toMeta.symbol,
            amountOut: finalAmountOut,
            raw_price: finalAmountOut / finalAmount,
            source: 'LI.FI'
        };
        logQuoteResult('LIFI', { ...logCtx, amountOut: result.amountOut, rawPrice: result.raw_price });
        res.json(result);
    } catch (error) {
        logQuoteError('LIFI', logCtx, error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/get-kyber-quote', async (req, res) => {
    const { chain, fromToken, toToken, amount } = req.body;
    const finalAmount = amount || 1; 
    let logCtx = { chain, fromToken, toToken, amount: finalAmount };
    
    try {
        const provider = evmProviders[chain];
        if (!provider) throw new Error(`不支持的EVM链或Provider未初始化: ${chain}`);
        
        const [fromMeta, toMeta] = await Promise.all([
            getEvmTokenMeta(chain, fromToken, provider),
            getEvmTokenMeta(chain, toToken, provider)
        ]);
        logCtx = { ...logCtx, fromSymbol: fromMeta.symbol, toSymbol: toMeta.symbol };
        
        const amountInWei = ethers.parseUnits(finalAmount.toString(), fromMeta.decimals);
        let finalAmountOut = null;

        const apiUrl = `https://aggregator-api.kyberswap.com/${chain}/api/v1/routes?tokenIn=${fromToken}&tokenOut=${toToken}&amountIn=${amountInWei.toString()}`;
        const configMore = await getConfigMore();
        const kyberClientId = configMore.kyberClientId;
        logQuoteRequest('KYBER', { ...logCtx, url: apiUrl });
        const response = await fetchWithRetry(apiUrl, { headers: { 'X-Client-Id': kyberClientId } });
        const resultData = await response.json();

        if (resultData.code !== 0) throw new Error(resultData.message || `Kyber API返回错误`);
        
        finalAmountOut = parseFloat(ethers.formatUnits(resultData.data.routeSummary.amountOut, toMeta.decimals));

        const result = { 
            fromSymbol: fromMeta.symbol, 
            toSymbol: toMeta.symbol, 
            amountOut: finalAmountOut, 
            raw_price: finalAmountOut / finalAmount,
            source: 'Kyber'
        };
        logQuoteResult('KYBER', { ...logCtx, amountOut: result.amountOut, rawPrice: result.raw_price });
        res.json(result);

    } catch (error) { 
        logQuoteError('KYBER', logCtx, error);
        res.status(500).json({ error: error.message }); 
    }
});

app.post('/api/get-cetus-quote', async (req, res) => {
    const { fromToken, toToken, amount } = req.body;
    const finalAmount = amount || 1;

    try {
        const [fromMeta, toMeta] = await Promise.all([
            getCachedMetadata(`sui-${fromToken}`, async () => {
                const meta = await suiClient.getCoinMetadata({ coinType: fromToken });
                if (!meta) throw new Error(`无法获取SUI元数据: ${fromToken}`);
                return { decimals: meta.decimals, symbol: meta.symbol };
            }),
            getCachedMetadata(`sui-${toToken}`, async () => {
                const meta = await suiClient.getCoinMetadata({ coinType: toToken });
                if (!meta) throw new Error(`无法获取SUI元数据: ${toToken}`);
                return { decimals: meta.decimals, symbol: meta.symbol };
            })
        ]);
        
        const amountInSmallestBigInt = ethers.parseUnits(finalAmount.toString(), fromMeta.decimals);
        
        const amountInSmallest = new BN(amountInSmallestBigInt.toString());
        const cetusResult = await cetusAggregator.findRouters({ from: fromToken, target: toToken, amount: amountInSmallest, byAmountIn: true });
        if (cetusResult.error) throw new Error(cetusResult.error.msg);
        
        const finalAmountOut = Number(cetusResult.amountOut.toString()) / (10 ** toMeta.decimals);
        const result = { fromSymbol: fromMeta.symbol, toSymbol: toMeta.symbol, amountOut: finalAmountOut, raw_price: finalAmountOut / finalAmount };
        res.json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/solana-metadata', async (req, res) => {
    const { mint } = req.query;
    try {
        const metadata = await getCachedMetadata(`solana-${mint}`, async () => {
            const response = await fetchWithRetry(solanaRpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: '1', method: 'getAsset', params: { id: mint } }) });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            let symbol = data.result?.content?.metadata?.symbol;
            if (!symbol) symbol = data.result?.token_info?.symbol;
            if (!symbol) symbol = "UNKNOWN"; 
            
            const decimals = data.result?.token_info?.decimals || 0;

            return { decimals, symbol };
        });
        res.json(metadata);
    } catch (error) { res.status(500).json({ error: `无法获取 ${mint} 的元数据` }); }
});

(async () => {
    await loadCache();
    const server = app.listen(PORT, () => {
        console.log(`聚合报价后端服务正在 http://localhost:${PORT} 上运行`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`错误：端口 ${PORT} 已被占用。`);
            process.exit(1);
        } else {
            throw err;
        }
    });
})();
