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
    normalizeAlertConfig
} = require('./src/path-alerts/path-alert-utils');
const { buildPathAlertQuoteCandidatesFromConfig } = require('./src/server/path-alert-candidate-service');
const { createCetusAggregatorClient } = require('./src/server/cetus-aggregator-config');
const { createEvmProviders } = require('./src/server/evm-provider-utils');
const {
    createQueuedJsonFileWriter,
    readJsonFile,
    readJsonFileSync,
    resolveProjectFilePath
} = require('./src/server/json-file-utils');
const { createRuntimeConfigStore, loadStartupCetusAggregatorConfig } = require('./src/server/runtime-config-utils');
const { registerQuoteRoutes } = require('./src/server/quote-route-utils');
const { sendPathAlertRemoteWebhooks } = require('./src/server/path-alert-webhook-utils');
const { normalizeArbCycleStartPriority } = require('./src/arb/arb-cycle-priority-utils');
const fs = require('fs').promises;
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
const CONFIG_PATH = resolveProjectFilePath('config.json', 'CONFIG_PATH', { rootDir: __dirname });
const CONFIG_MORE_PATH = resolveProjectFilePath('config_more.json', 'CONFIG_MORE_PATH', { rootDir: __dirname });
const REQUEST_CHANNELS_PATH = resolveProjectFilePath('request_channels.json', 'REQUEST_CHANNELS_PATH', { rootDir: __dirname });
const METADATA_CACHE_PATH = resolveProjectFilePath('metadata-cache.json', 'METADATA_CACHE_PATH', { rootDir: __dirname });
const ALERT_CONFIG_PATH = resolveProjectFilePath('alert.json', 'ALERT_CONFIG_PATH', { rootDir: __dirname });
const PRICE_SNAPSHOT_DIR = path.resolve(process.env.PRICE_SNAPSHOT_DIR || path.join(__dirname, 'db', 'price'));
const CHART_PAIR_WINDOW_MS = 10 * 60 * 1000;
const jsonFileWriter = createQueuedJsonFileWriter({
    writeFile: (filePath, content, encoding) => fs.writeFile(filePath, content, encoding),
    rename: (tempPath, targetPath) => fs.rename(tempPath, targetPath),
    logger: console
});
const requestChannelAgentCache = createRequestChannelAgentCache();
const fetchOnce = createFetchOnce({
    fetchImpl: fetch,
    agentCache: requestChannelAgentCache,
    logFailure: (url, error) => {
        logMessage('HTTP_FAIL', `请求失败: ${url} | error=${error.message}`, 'warn');
    }
});

async function safeWriteJsonFile(filePath, data) {
    return jsonFileWriter.writeJsonFile(filePath, data);
}

async function safeWriteConfig(data) {
    return safeWriteJsonFile(CONFIG_PATH, data);
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

const evmProviders = createEvmProviders({
    ProviderClass: ethers.JsonRpcProvider,
    logger: console
});

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
        res.json(await buildPathAlertQuoteCandidatesFromConfig({
            configPath: CONFIG_PATH,
            readJsonFile,
            marketClients
        }));
    } catch (error) {
        console.error('Path Alert Candidate Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/send-path-alert-webhook', async (req, res) => {
    try {
        const result = await sendPathAlertRemoteWebhooks({
            alertConfig: await getAlertConfig(),
            configMore: await getConfigMore(),
            title: req.body && req.body.title,
            body: req.body && req.body.body,
            telegramHtmlBody: req.body && req.body.telegramHtmlBody
        }, {
            fetchImpl: fetch,
            telegramBotApiBaseUrlOverride: process.env.TELEGRAM_BOT_API_BASE_URL
        });
        if (result.statusCode >= 400) {
            return res.status(result.statusCode).json(result.payload);
        }
        res.json(result.payload);
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

registerQuoteRoutes({
    app,
    marketClients,
    buildQuoteRequestInput,
    logQuoteError,
    withQuoteLogRequestChannel
});

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
