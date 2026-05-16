const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { ethers } = require('ethers');
const { AggregatorClient } = require('@cetusprotocol/aggregator-sdk');
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { createMarketClients } = require('./src/market-clients');
const {
    resolveRequestChannelContext
} = require('./src/request-channel/request-channel-config');
const {
    createRequestChannelAgentCache
} = require('./src/request-channel/request-channel-http');
const { createFetchOnce } = require('./src/server/fetch-once');
const { createCetusAggregatorClient } = require('./src/server/cetus-aggregator-config');
const { createEvmProviders } = require('./src/server/evm-provider-utils');
const {
    createQueuedJsonFileWriter,
    readJsonFile,
    readJsonFileSync,
    resolveProjectFilePath
} = require('./src/server/json-file-utils');
const { createRuntimeConfigStore, loadStartupCetusAggregatorConfig } = require('./src/server/runtime-config-utils');
const { registerConfigRoutes } = require('./src/server/config-route-utils');
const { createQuoteLogger, withQuoteLogRequestChannel } = require('./src/server/quote-log-utils');
const { registerQuoteRoutes } = require('./src/server/quote-route-utils');
const { registerPathAlertRoutes } = require('./src/server/path-alert-route-utils');
const { registerPriceSnapshotRoutes } = require('./src/server/price-snapshot-route-utils');
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
const METADATA_CACHE_PATH = resolveProjectFilePath(path.join('db', 'metadata-cache.json'), 'METADATA_CACHE_PATH', { rootDir: __dirname });
const ALERT_CONFIG_PATH = resolveProjectFilePath('alert.json', 'ALERT_CONFIG_PATH', { rootDir: __dirname });
const PRICE_SNAPSHOT_DIR = path.resolve(process.env.PRICE_SNAPSHOT_DIR || path.join(__dirname, 'db', 'price'));
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

const {
    logQuoteError,
    logQuoteRequest,
    logQuoteResult
} = createQuoteLogger({ logMessage, verboseLog });

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
    ensureDir: (dirPath) => fs.mkdir(dirPath, { recursive: true }),
    fetchOnce,
    getConfigMore,
    logQuoteRequest,
    logQuoteResult,
    readJsonFile,
    solanaRpc,
    suiClient,
    writeFile: (filePath, content, encoding) => fs.writeFile(filePath, content, encoding)
});

registerPathAlertRoutes({
    app,
    alertConfigPath: ALERT_CONFIG_PATH,
    configPath: CONFIG_PATH,
    readJsonFile,
    safeWriteJsonFile,
    getConfigMore,
    marketClients,
    fetchImpl: fetch,
    telegramBotApiBaseUrlOverride: process.env.TELEGRAM_BOT_API_BASE_URL,
    logger: console
});

registerConfigRoutes({
    app,
    configPath: CONFIG_PATH,
    readJsonFile,
    safeWriteConfig,
    refreshRuntimeConfigCache,
    getRequestChannelsConfig,
    getConfigMore,
    logger: console
});

registerPriceSnapshotRoutes({
    app,
    priceSnapshotDir: PRICE_SNAPSHOT_DIR,
    getConfigMore,
    logMessage,
    verboseLog
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
