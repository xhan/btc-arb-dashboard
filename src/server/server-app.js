const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { ethers } = require('ethers');
const { AggregatorClient } = require('@cetusprotocol/aggregator-sdk');
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { createMarketClients } = require('../market-clients');
const {
  resolveRequestChannelContext
} = require('../request-channel/request-channel-config');
const {
  createRequestChannelAgentCache
} = require('../request-channel/request-channel-http');
const { createFetchOnce } = require('./fetch-once');
const { createCetusAggregatorClient } = require('./cetus-aggregator-config');
const { createEvmProviders } = require('./evm-provider-utils');
const {
  createQueuedJsonFileWriter,
  readJsonFile,
  readJsonFileSync,
  resolveProjectFilePath
} = require('./json-file-utils');
const { createRuntimeConfigStore, loadStartupCetusAggregatorConfig } = require('./runtime-config-utils');
const { registerConfigRoutes } = require('./config-route-utils');
const { createQuoteLogger, withQuoteLogRequestChannel } = require('./quote-log-utils');
const { registerQuoteRoutes } = require('./quote-route-utils');
const { registerPathAlertRoutes } = require('./path-alert-route-utils');
const { registerPriceSnapshotRoutes } = require('./price-snapshot-route-utils');
const fs = require('fs').promises;
const path = require('path');

const DEFAULT_SOLANA_RPC = 'https://mainnet.helius-rpc.com/?api-key=f5e20297-9ca2-4afb-98f9-be16153777b5';

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

function isServerVerbose(argv = [], env = {}) {
  return argv.includes('-v')
    || argv.includes('--verbose')
    || env.SERVER_VERBOSE === '1'
    || ['verbose', 'silly'].includes(String(env.npm_config_loglevel || '').toLowerCase());
}

function createDashboardServer(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..', '..');
  const env = options.env || process.env;
  const argv = Array.isArray(options.argv) ? options.argv : process.argv;
  const logger = options.logger || console;
  const app = options.app || express();
  const port = Number(env.PORT) || 3000;
  const publicDir = path.join(rootDir, 'public');
  const srcDir = path.join(rootDir, 'src');
  const serverVerbose = isServerVerbose(argv, env);

  app.use(cors());
  app.use(express.json());
  app.use(express.static(publicDir));
  app.use('/src', express.static(srcDir));

  app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
  app.get('/snapshot', (req, res) => {
    res.sendFile(path.join(publicDir, 'snapshot.html'));
  });
  app.get('/charts', (req, res) => {
    res.sendFile(path.join(publicDir, 'charts.html'));
  });
  app.get('/path-alerts', (req, res) => {
    res.sendFile(path.join(publicDir, 'path-alerts.html'));
  });
  app.get('/queue-stats', (req, res) => {
    res.sendFile(path.join(publicDir, 'queue-stats.html'));
  });

  const configPath = resolveProjectFilePath('config.json', 'CONFIG_PATH', { rootDir });
  const configMorePath = resolveProjectFilePath('config_more.json', 'CONFIG_MORE_PATH', { rootDir });
  const requestChannelsPath = resolveProjectFilePath('request_channels.json', 'REQUEST_CHANNELS_PATH', { rootDir });
  const metadataCachePath = resolveProjectFilePath(path.join('db', 'metadata-cache.json'), 'METADATA_CACHE_PATH', { rootDir });
  const alertConfigPath = resolveProjectFilePath('alert.json', 'ALERT_CONFIG_PATH', { rootDir });
  const priceSnapshotDir = path.resolve(env.PRICE_SNAPSHOT_DIR || path.join(rootDir, 'db', 'price'));

  function logMessage(category, message, level = 'info') {
    const line = `[${getLogTimestamp()}] [${category}] ${message}`;
    if (level === 'error') logger.error(line);
    else if (level === 'warn') logger.warn(line);
    else logger.log(line);
  }

  function verboseLog(category, message) {
    if (!serverVerbose) return;
    logMessage(category, message, 'info');
  }

  const jsonFileWriter = createQueuedJsonFileWriter({
    writeFile: (filePath, content, encoding) => fs.writeFile(filePath, content, encoding),
    rename: (tempPath, targetPath) => fs.rename(tempPath, targetPath),
    logger
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
    return safeWriteJsonFile(configPath, data);
  }

  const {
    logQuoteError,
    logQuoteRequest,
    logQuoteResult
  } = createQuoteLogger({ logMessage, verboseLog });

  const runtimeConfigStore = createRuntimeConfigStore({
    configPath,
    configMorePath,
    requestChannelsPath,
    readJsonFile,
    logger
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
    logger
  });

  const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
  const cetusAggregator = createCetusAggregatorClient(loadStartupCetusAggregatorConfig(configMorePath, {
    readJsonFileSync,
    logger
  }), AggregatorClient);
  const marketClients = createMarketClients({
    cachePath: metadataCachePath,
    cetusAggregator,
    evmProviders,
    ensureDir: (dirPath) => fs.mkdir(dirPath, { recursive: true }),
    fetchOnce,
    getConfigMore,
    logQuoteRequest,
    logQuoteResult,
    readJsonFile,
    solanaRpc: options.solanaRpc || DEFAULT_SOLANA_RPC,
    suiClient,
    writeFile: (filePath, content, encoding) => fs.writeFile(filePath, content, encoding)
  });

  registerPathAlertRoutes({
    app,
    alertConfigPath,
    configPath,
    readJsonFile,
    safeWriteJsonFile,
    getConfigMore,
    marketClients,
    fetchImpl: fetch,
    telegramBotApiBaseUrlOverride: env.TELEGRAM_BOT_API_BASE_URL,
    logger
  });

  registerConfigRoutes({
    app,
    configPath,
    readJsonFile,
    safeWriteConfig,
    refreshRuntimeConfigCache,
    getRequestChannelsConfig,
    getConfigMore,
    logger
  });

  registerPriceSnapshotRoutes({
    app,
    priceSnapshotDir,
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

  return {
    app,
    logger,
    marketClients,
    port,
    refreshRuntimeConfigCache
  };
}

async function startDashboardServer(options = {}) {
  const context = createDashboardServer(options);
  await context.refreshRuntimeConfigCache();
  await context.marketClients.loadTokenMetaCache();

  const server = context.app.listen(context.port, () => {
    context.logger.log(`聚合报价后端服务正在 http://localhost:${context.port} 上运行`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      context.logger.error(`错误：端口 ${context.port} 已被占用。`);
      const exit = options.exit || process.exit;
      exit(1);
      return;
    }
    throw err;
  });

  return {
    ...context,
    server
  };
}

module.exports = {
  createDashboardServer,
  startDashboardServer
};
