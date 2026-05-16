const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { ethers } = require('ethers');
const { AggregatorClient } = require('@cetusprotocol/aggregator-sdk');
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const {
    normalizePriceSnapshotConfig,
    appendPriceSnapshot,
    getClosestPriceSnapshot,
    listRecentChartPairs,
    getChartSeries
} = require('./src/price-snapshots/price-snapshot-store');
const { decorateSnapshotSelection, buildReplayFromSnapshot, renderReplayText } = require('./src/price-snapshots/price-snapshot-replay');
const { parseUtc8Input } = require('./src/shared/time-utils');
const { createMarketClients } = require('./market-clients');
const {
    resolveRequestChannelContext,
    sanitizeRequestChannelsForClient
} = require('./src/request-channel/request-channel-config');
const {
    createRequestChannelAgentCache
} = require('./src/request-channel/request-channel-http');
const { createFetchOnce } = require('./src/server/fetch-once');
const {
    buildPathAlertWebhookUrl,
    buildTelegramBotApiUrl,
    DEFAULT_TELEGRAM_BOT_API_BASE_URL,
    normalizeAlertConfig
} = require('./src/path-alerts/path-alert-utils');
const { buildPathAlertCandidates } = require('./src/path-alerts/path-alert-candidate-utils');
const { splitCompactTradingPairSymbol } = require('./src/shared/trading-pair-utils');
const { createCetusAggregatorClient } = require('./src/server/cetus-aggregator-config');
const { createRuntimeConfigStore, loadStartupCetusAggregatorConfig } = require('./src/server/runtime-config-utils');
const { normalizeArbCycleStartPriority } = require('./src/arb/arb-cycle-priority-utils');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const SRC_DIR = path.join(__dirname, 'src');
const SERVER_VERBOSE = process.argv.includes('-v')
    || process.argv.includes('--verbose')
    || process.env.SERVER_VERBOSE === '1'
    || ['verbose', 'silly'].includes(String(process.env.npm_config_loglevel || '').toLowerCase());
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));
app.use('/src', express.static(SRC_DIR));

app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});
app.get('/snapshot', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'snapshot.html'));
});
app.get('/charts', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'charts.html'));
});
app.get('/path-alerts', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'path-alerts.html'));
});
app.get('/queue-stats', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'queue-stats.html'));
});
function resolveProjectFilePath(fileName, envKey) {
    const overridePath = envKey ? String(process.env[envKey] || '').trim() : '';
    if (overridePath) {
        return path.resolve(overridePath);
    }
    return path.join(__dirname, fileName);
}

function readJsonFileSync(filePath) {
    const data = fsSync.readFileSync(filePath, 'utf-8');
    return JSON.parse(stripBom(data));
}

const CONFIG_PATH = resolveProjectFilePath('config.json', 'CONFIG_PATH');
const CONFIG_MORE_PATH = resolveProjectFilePath('config_more.json', 'CONFIG_MORE_PATH');
const REQUEST_CHANNELS_PATH = resolveProjectFilePath('request_channels.json', 'REQUEST_CHANNELS_PATH');
const METADATA_CACHE_PATH = resolveProjectFilePath('metadata-cache.json', 'METADATA_CACHE_PATH');
const ALERT_CONFIG_PATH = resolveProjectFilePath('alert.json', 'ALERT_CONFIG_PATH');
const PRICE_SNAPSHOT_DIR = path.resolve(process.env.PRICE_SNAPSHOT_DIR || path.join(__dirname, 'db', 'price'));
const CHART_PAIR_WINDOW_MS = 10 * 60 * 1000;
const PATH_ALERT_CHAIN_LABELS = {
    ethereum: 'ETH',
    arbitrum: 'Arbitrum',
    optimism: 'Optimism',
    bsc: 'BSC',
    polygon: 'Polygon',
    avalanche: 'Avalanche',
    base: 'Base',
    linea: 'Linea',
    mantle: 'Mantle',
    sonic: 'Sonic',
    berachain: 'Berachain',
    ronin: 'Ronin',
    unichain: 'Unichain',
    hyperevm: 'HyperEVM',
    plasma: 'Plasma',
    scroll: 'Scroll',
    blast: 'Blast',
    mode: 'Mode',
    monad: 'Monad',
    etherlink: 'Etherlink',
    megaeth: 'MegaETH',
    fantom: 'Fantom',
    cronos: 'Cronos',
    moonbeam: 'Moonbeam',
    boba: 'Boba',
    gnosis: 'Gnosis',
    celo: 'Celo',
    hemi: 'Hemi',
    katana: 'Katana',
    solana: 'SOL',
    sui: 'SUI',
    starknet: 'Starknet',
    Bybit: 'Bybit',
    bybit: 'Bybit',
    Binance: 'Binance',
    binance: 'Binance'
};

let writeQueue = Promise.resolve();
const requestChannelAgentCache = createRequestChannelAgentCache();
const fetchOnce = createFetchOnce({
    fetchImpl: fetch,
    agentCache: requestChannelAgentCache,
    logFailure: (url, error) => {
        logMessage('HTTP_FAIL', `请求失败: ${url} | error=${error.message}`, 'warn');
    }
});

async function safeWriteJsonFile(filePath, data) {
    writeQueue = writeQueue.then(async () => {
        try {
            const tempPath = `${filePath}.tmp`;
            await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
            await fs.rename(tempPath, filePath);
        } catch (error) {
            console.error('❌ 写入配置失败:', error);
        }
    });
    return writeQueue;
}

async function safeWriteConfig(data) {
    return safeWriteJsonFile(CONFIG_PATH, data);
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

function formatPathAlertChainLabel(chain) {
    return PATH_ALERT_CHAIN_LABELS[chain] || chain || '';
}

function buildPathAlertCandidateLabel(chain, fromSymbol, toSymbol, suffix = '') {
    return `(${formatPathAlertChainLabel(chain)}) ${fromSymbol || '--'} -> ${toSymbol || '--'}${suffix}`;
}

function isCexOrderbookChain(chain) {
    const normalized = String(chain || '').trim().toLowerCase();
    return normalized === 'bybit' || normalized === 'binance';
}

async function resolveQuoteTokenSymbols(quote) {
    if (!quote || !quote.chain) {
        return { fromSymbol: shortAddr(quote && quote.fromToken), toSymbol: shortAddr(quote && quote.toToken) };
    }

    if (isCexOrderbookChain(quote.chain)) {
        const parsed = splitCompactTradingPairSymbol(quote.symbol);
        return {
            fromSymbol: parsed?.fromSymbol || shortAddr(quote.symbol),
            toSymbol: parsed?.toSymbol || 'QUOTE'
        };
    }

    try {
        if (String(quote.chain).toLowerCase() === 'solana') {
            const [fromMeta, toMeta] = await Promise.all([
                marketClients.getSolanaTokenMeta(quote.fromToken),
                marketClients.getSolanaTokenMeta(quote.toToken)
            ]);
            return { fromSymbol: fromMeta.symbol || shortAddr(quote.fromToken), toSymbol: toMeta.symbol || shortAddr(quote.toToken) };
        }

        if (String(quote.chain).toLowerCase() === 'sui') {
            const [fromMeta, toMeta] = await Promise.all([
                marketClients.getSuiTokenMeta(quote.fromToken),
                marketClients.getSuiTokenMeta(quote.toToken)
            ]);
            return { fromSymbol: fromMeta.symbol || shortAddr(quote.fromToken), toSymbol: toMeta.symbol || shortAddr(quote.toToken) };
        }

        if (String(quote.chain).toLowerCase() === 'starknet') {
            const [fromMeta, toMeta] = await Promise.all([
                marketClients.getStarknetTokenMeta(quote.fromToken),
                marketClients.getStarknetTokenMeta(quote.toToken)
            ]);
            return { fromSymbol: fromMeta.symbol || shortAddr(quote.fromToken), toSymbol: toMeta.symbol || shortAddr(quote.toToken) };
        }

        const [fromMeta, toMeta] = await Promise.all([
            marketClients.getEvmTokenMeta(quote.chain, quote.fromToken),
            marketClients.getEvmTokenMeta(quote.chain, quote.toToken)
        ]);
        return { fromSymbol: fromMeta.symbol || shortAddr(quote.fromToken), toSymbol: toMeta.symbol || shortAddr(quote.toToken) };
    } catch {
        return {
            fromSymbol: shortAddr(quote.fromToken),
            toSymbol: shortAddr(quote.toToken)
        };
    }
}

async function buildPathAlertQuoteCandidatesFromConfig() {
    const config = await readJsonFile(CONFIG_PATH).catch((error) => {
        if (error.code === 'ENOENT') return [];
        throw error;
    });
    const dashboard = Array.isArray(config) ? config : (Array.isArray(config.dashboard) ? config.dashboard : []);
    const records = [];

    for (const category of dashboard) {
        for (const quote of (category.quotes || [])) {
            const resolved = await resolveQuoteTokenSymbols(quote);
            records.push({
                categoryName: category.name,
                quote,
                fromSymbol: resolved.fromSymbol,
                toSymbol: resolved.toSymbol,
                searchText: `${category.name || ''} ${quote.chain || ''} ${quote.symbol || ''} ${quote.fromToken || ''} ${quote.toToken || ''} ${resolved.fromSymbol || ''} ${resolved.toSymbol || ''}`
            });
        }
    }

    return buildPathAlertCandidates(records, {
        buildLabel: (chain, fromSymbol, toSymbol, suffix = '') => buildPathAlertCandidateLabel(chain, fromSymbol, toSymbol, suffix)
    });
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

function getQuoteLogChannelLabel(ctx) {
    const channelId = String(ctx && ctx.channelId || '').trim() || 'default';
    const channelName = String(ctx && ctx.channelName || '').trim();
    if (channelName && channelName !== channelId) {
        return `${channelName}/${channelId}`;
    }
    return channelId;
}

function withQuoteLogRequestChannel(ctx, input) {
    const requestContext = input && input.requestContext ? input.requestContext : null;
    return {
        ...(ctx && typeof ctx === 'object' ? ctx : {}),
        channelId: requestContext && requestContext.channelId ? requestContext.channelId : undefined,
        channelName: requestContext && requestContext.channelName ? requestContext.channelName : undefined
    };
}

function logQuoteError(source, ctx, error) {
    const pair = getQuoteLogPairLabel(ctx.chain, ctx.fromSymbol, ctx.toSymbol, ctx.fromToken, ctx.toToken);
    const channel = getQuoteLogChannelLabel(ctx);
    logMessage(`${source}_ERR`, `[channel=${channel}] ${pair} ${error.message}`, 'warn');
}

async function readJsonFile(filePath) {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(stripBom(data));
}

const runtimeConfigStore = createRuntimeConfigStore({
    configPath: CONFIG_PATH,
    configMorePath: CONFIG_MORE_PATH,
    requestChannelsPath: REQUEST_CHANNELS_PATH,
    readJsonFile,
    logger: console
});
const {
    getConfigMore,
    getRequestChannelsConfig,
    refreshRuntimeConfigCache
} = runtimeConfigStore;

async function buildQuoteRequestInput(body, sourceKey) {
    const requestChannelsConfig = await getRequestChannelsConfig();
    const requestContext = resolveRequestChannelContext({
        requestChannelId: body && body.requestChannelId,
        sourceKey,
        requestChannelsConfig
    });

    return {
        ...(body && typeof body === 'object' ? body : {}),
        requestContext
    };
}

async function sendPathAlertDayAppWebhook(alertConfig, title, body) {
    if (!alertConfig || !alertConfig.settings || alertConfig.settings.webhookEnabled !== true) {
        return { sent: false, channel: 'dayapp', reason: 'disabled' };
    }
    if (alertConfig.settings.dayAppEnabled !== true) {
        return { sent: false, channel: 'dayapp', reason: 'disabled' };
    }
    const webhookUrl = buildPathAlertWebhookUrl(alertConfig.settings.webhookUrl, title, body);
    if (!webhookUrl) {
        return { sent: false, channel: 'dayapp', reason: 'missing-config' };
    }

    const response = await fetch(webhookUrl, { method: 'GET' });
    if (!response.ok) {
        throw new Error(`Day.app 响应异常: ${response.status}`);
    }
    return { sent: true, channel: 'dayapp' };
}

async function sendPathAlertTelegramWebhook(configMore, title, body, telegramHtmlBody = '') {
    if (!configMore || configMore.telegramEnabled === false) {
        return { sent: false, channel: 'telegram', reason: 'disabled' };
    }
    const botToken = String(configMore && configMore.telegramBotToken || '').trim();
    const chatId = String(configMore && configMore.telegramChatId || '').trim();
    const apiBaseUrl = String(configMore && configMore.telegramBotApiBaseUrl || DEFAULT_TELEGRAM_BOT_API_BASE_URL).trim();
    if (!botToken || !chatId) {
        return { sent: false, channel: 'telegram', reason: 'missing-config' };
    }

    const url = buildTelegramBotApiUrl(botToken, 'sendMessage', process.env.TELEGRAM_BOT_API_BASE_URL || apiBaseUrl);
    if (!url) {
        return { sent: false, channel: 'telegram', reason: 'missing-config' };
    }

    const hasTelegramHtmlBody = String(telegramHtmlBody || '').trim().length > 0;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: chatId,
            text: `${title}\n\n${hasTelegramHtmlBody ? String(telegramHtmlBody || '').trim() : body}`,
            ...(hasTelegramHtmlBody ? { parse_mode: 'HTML' } : {})
        })
    });
    if (!response.ok) {
        throw new Error(`Telegram 响应异常: ${response.status}`);
    }
    return { sent: true, channel: 'telegram' };
}

async function getAlertConfig() {
    try {
        const parsedData = await readJsonFile(ALERT_CONFIG_PATH);
        return normalizeAlertConfig(parsedData);
    } catch (error) {
        if (error instanceof SyntaxError || error.code === 'ENOENT') {
            return normalizeAlertConfig();
        }
        throw error;
    }
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
    megaeth: 'https://mainnet.megaeth.com/rpc',

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

const evmProviders = {};
for (const chain in RPC_URLS) {
    try {
        evmProviders[chain] = new ethers.JsonRpcProvider(RPC_URLS[chain]);
    } catch (e) {
        console.warn(`⚠️ ${chain} Provider 初始化失败:`, e.message);
    }
}
console.log("所有 EVM Provider 初始化尝试完成");

const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
const cetusAggregator = createCetusAggregatorClient(loadStartupCetusAggregatorConfig(CONFIG_MORE_PATH, {
    readJsonFileSync,
    logger: console
}), AggregatorClient);
const solanaRpc = 'https://mainnet.helius-rpc.com/?api-key=f5e20297-9ca2-4afb-98f9-be16153777b5';
const marketClients = createMarketClients({
    cachePath: METADATA_CACHE_PATH,
    cetusAggregator,
    evmProviders,
    fetchOnce,
    getConfigMore,
    logQuoteRequest,
    logQuoteResult,
    readJsonFile,
    solanaRpc,
    suiClient,
    writeFile: (filePath, content, encoding) => fs.writeFile(filePath, content, encoding)
});

app.post('/api/save-config', async (req, res) => {
    try {
        await safeWriteConfig(req.body);
        await refreshRuntimeConfigCache();
        res.json({ message: '配置保存成功' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/request-update-config', async (req, res) => {
    try {
        const cache = await refreshRuntimeConfigCache();
        res.json({
            message: '运行时配置已刷新',
            requestChannelCount: Array.isArray(cache.requestChannelsConfig.channels) ? cache.requestChannelsConfig.channels.length : 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/save-alert-config', async (req, res) => {
    try {
        const normalized = normalizeAlertConfig(req.body);
        await safeWriteJsonFile(ALERT_CONFIG_PATH, normalized);
        res.json({ message: '路径报警配置保存成功' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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

app.get('/api/get-alert-config', async (req, res) => {
    try {
        res.json(await getAlertConfig());
    } catch (error) {
        console.error('Alert Config Read Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/get-request-channels', async (req, res) => {
    try {
        res.json(sanitizeRequestChannelsForClient(await getRequestChannelsConfig()));
    } catch (error) {
        console.error('Request Channel Read Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/path-alert-quote-candidates', async (req, res) => {
    try {
        res.json(await buildPathAlertQuoteCandidatesFromConfig());
    } catch (error) {
        console.error('Path Alert Candidate Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/send-path-alert-webhook', async (req, res) => {
    try {
        const alertConfig = await getAlertConfig();
        const configMore = await getConfigMore();
        const title = String(req.body && req.body.title || '').trim();
        const body = String(req.body && req.body.body || '').trim();
        const telegramHtmlBody = String(req.body && req.body.telegramHtmlBody || '').trim();
        if (!alertConfig.settings.webhookEnabled) {
            return res.status(400).json({ error: '路径报警 webhook 未配置' });
        }

        const results = await Promise.all([
            sendPathAlertDayAppWebhook(alertConfig, title, body),
            sendPathAlertTelegramWebhook({
                ...configMore,
                telegramEnabled: alertConfig.settings.telegramEnabled !== false
            }, title, body, telegramHtmlBody)
        ]);
        if (!results.some((item) => item.sent)) {
            return res.status(400).json({ error: '路径报警远程推送未配置' });
        }
        res.json({
            message: '路径报警 webhook 已发送',
            channels: results.filter((item) => item.sent).map((item) => item.channel)
        });
    } catch (error) {
        console.error('Path Alert Webhook Error:', error);
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

app.get('/api/get-arb-settings', async (req, res) => {
    try {
        const configMore = await getConfigMore();
        res.json({
            cycleStartPriority: normalizeArbCycleStartPriority(configMore.arbCycleStartPriority)
        });
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

app.get('/api/chart-pairs', async (req, res) => {
    try {
        const pairs = await listRecentChartPairs(PRICE_SNAPSHOT_DIR, { windowMs: CHART_PAIR_WINDOW_MS });
        res.json(pairs);
    } catch (error) {
        logMessage('CHART_PAIRS_ERR', `读取图表候选失败: ${error.message}`, 'error');
        res.status(500).json({ error: '读取图表候选失败' });
    }
});

app.get('/api/chart-series', async (req, res) => {
    try {
        const quoteId = Number(req.query.quoteId);
        const direction = req.query.direction === 'inverse' ? 'inverse' : req.query.direction === 'forward' ? 'forward' : '';
        const windowSec = Number(req.query.windowSec);
        if (!Number.isFinite(quoteId) || !direction) {
            res.status(400).json({ error: '缺少合法的 quoteId 或 direction' });
            return;
        }

        const series = await getChartSeries(PRICE_SNAPSHOT_DIR, {
            quoteId,
            direction,
            windowMs: Number.isFinite(windowSec) && windowSec > 0 ? windowSec * 1000 : undefined
        });
        if (!series) {
            res.status(404).json({ error: '未找到图表数据' });
            return;
        }

        res.json(series);
    } catch (error) {
        logMessage('CHART_SERIES_ERR', `读取图表序列失败: ${error.message}`, 'error');
        res.status(500).json({ error: '读取图表序列失败' });
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

        const configMore = await getConfigMore();
        const replay = buildReplayFromSnapshot(selection, {
            cycleStartPriority: configMore.arbCycleStartPriority
        });
        if (format === 'text') {
            return res.type('text/plain; charset=utf-8').send(renderReplayText(replay));
        }

        res.json(replay);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function buildDefaultQuoteErrorContext(body) {
    const { chain, fromToken, toToken, amount } = body;
    return { chain, fromToken, toToken, amount: amount || 1 };
}

function registerMarketQuoteRoute({ routePath, providerKey, sourceKey, logSource, buildErrorContext = buildDefaultQuoteErrorContext }) {
    app.post(routePath, async (req, res) => {
        let input = null;
        try {
            input = await buildQuoteRequestInput(req.body, sourceKey);
            const result = await marketClients.providers[providerKey].getQuote(input);
            res.json(result);
        } catch (error) {
            logQuoteError(logSource, withQuoteLogRequestChannel(buildErrorContext(req.body), input), error);
            res.status(500).json({ error: error.message });
        }
    });
}

function registerCexQuoteRoute({ routePath, providerKey, logSource, chainLabel }) {
    app.post(routePath, async (req, res) => {
        try {
            const result = await marketClients.providers[providerKey].getQuote(req.body);
            res.json(result);
        } catch (error) {
            const { amount, symbol } = req.body;
            logQuoteError(logSource, { chain: chainLabel, fromSymbol: symbol, amount: amount || 1 }, error);
            res.status(500).json({ error: error.message });
        }
    });
}

const MARKET_QUOTE_ROUTES = [
    {
        routePath: '/api/get-0x-quote',
        providerKey: 'zerox',
        sourceKey: 'zerox',
        logSource: 'ZEROX'
    },
    {
        routePath: '/api/get-lifi-quote',
        providerKey: 'lifi',
        sourceKey: 'lifi',
        logSource: 'LIFI',
        buildErrorContext: (body) => {
            const { chain, toChain, fromToken, toToken, amount } = body;
            const logChain = toChain && toChain !== chain ? `${chain}->${toChain}` : chain;
            return { chain: logChain, fromToken, toToken, amount: amount || 1 };
        }
    },
    {
        routePath: '/api/get-ekubo-quote',
        providerKey: 'ekubo',
        sourceKey: 'starknet',
        logSource: 'EKUBO'
    },
    {
        routePath: '/api/get-jupiter-quote',
        providerKey: 'jupiter',
        sourceKey: 'solana',
        logSource: 'JUPITER',
        buildErrorContext: (body) => {
            const { fromToken, toToken, amount } = body;
            return { chain: 'solana', fromToken, toToken, amount: amount || 1 };
        }
    },
    {
        routePath: '/api/get-kyber-quote',
        providerKey: 'kyber',
        sourceKey: 'kyber',
        logSource: 'KYBER'
    },
    {
        routePath: '/api/get-velora-quote',
        providerKey: 'velora',
        sourceKey: 'velora',
        logSource: 'VELORA'
    },
    {
        routePath: '/api/get-cetus-quote',
        providerKey: 'cetus',
        sourceKey: 'sui',
        logSource: 'CETUS'
    }
];

const CEX_QUOTE_ROUTES = [
    {
        routePath: '/api/get-bybit-quote',
        providerKey: 'bybit',
        logSource: 'BYBIT',
        chainLabel: 'Bybit'
    },
    {
        routePath: '/api/get-binance-quote',
        providerKey: 'binance',
        logSource: 'BINANCE',
        chainLabel: 'Binance'
    }
];

for (const routeConfig of MARKET_QUOTE_ROUTES) {
    registerMarketQuoteRoute(routeConfig);
}

for (const routeConfig of CEX_QUOTE_ROUTES) {
    registerCexQuoteRoute(routeConfig);
}

(async () => {
    await refreshRuntimeConfigCache();
    await marketClients.loadTokenMetaCache();
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
