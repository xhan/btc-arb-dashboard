const { DEFAULT_ARB_CYCLE_START_PRIORITY, normalizeArbCycleStartPriority } = require('../arb/arb-cycle-priority-utils');
const { DEFAULT_TELEGRAM_BOT_API_BASE_URL } = require('../path-alerts/path-alert-utils');
const { normalizeRequestChannelsConfig } = require('../request-channel/request-channel-config');
const { DEFAULT_INTERVALS, normalizeIntervals } = require('../request-channel/request-channel-utils');
const { normalizeCetusAggregatorConfig } = require('./cetus-aggregator-config');

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function buildDefaultConfigMore() {
  return {
    kyberClientId: 'xh-quote-dashboard',
    lifiApiKey: '',
    lifiIntegrator: '',
    lifiSlippage: '0.0001',
    jupiterApiKey: '',
    cetusAggregatorEndpoint: normalizeCetusAggregatorConfig().endpoint,
    cetusAggregatorApiKey: '',
    veloraPartner: '',
    veloraIncludeDEXS: [],
    veloraOtherExchangePrices: false,
    enablePriceSnapshot: false,
    priceSnapshotIntervalSec: 10,
    arbCycleStartPriority: Array.from(DEFAULT_ARB_CYCLE_START_PRIORITY),
    telegramBotToken: '',
    telegramChatId: '',
    telegramBotApiBaseUrl: DEFAULT_TELEGRAM_BOT_API_BASE_URL
  };
}

function normalizeConfigMoreData(configMore = {}) {
  const rawClientId = typeof configMore.kyberClientId === 'string' ? configMore.kyberClientId.trim() : '';
  const rawLifiApiKey = typeof configMore.LIFIApiKey === 'string' ? configMore.LIFIApiKey.trim() : '';
  const rawLifiIntegrator = typeof configMore.LIFIIntegrator === 'string' ? configMore.LIFIIntegrator.trim() : '';
  const rawLifiSlippage = typeof configMore.LIFISlippage === 'string' ? configMore.LIFISlippage.trim() : '';
  const rawJupiterApiKey = typeof configMore.jupiterApiKey === 'string' ? configMore.jupiterApiKey.trim() : '';
  const rawVeloraPartner = typeof configMore.veloraPartner === 'string' ? configMore.veloraPartner.trim() : '';
  const rawVeloraIncludeDEXS = normalizeStringArray(configMore.veloraIncludeDEXS);
  const rawTelegramBotToken = typeof configMore.telegramBotToken === 'string' ? configMore.telegramBotToken.trim() : '';
  const rawTelegramChatId = typeof configMore.telegramChatId === 'string' ? configMore.telegramChatId.trim() : '';
  const rawTelegramBotApiBaseUrl = typeof configMore.telegramBotApiBaseUrl === 'string'
    ? configMore.telegramBotApiBaseUrl.trim()
    : '';
  const cetusAggregatorConfig = normalizeCetusAggregatorConfig(configMore);
  const arbCycleStartPriority = normalizeArbCycleStartPriority(configMore.arbCycleStartPriority);

  return {
    kyberClientId: rawClientId || 'xh-quote-dashboard',
    lifiApiKey: rawLifiApiKey,
    lifiIntegrator: rawLifiIntegrator,
    lifiSlippage: rawLifiSlippage || '0.0001',
    jupiterApiKey: rawJupiterApiKey,
    cetusAggregatorEndpoint: cetusAggregatorConfig.endpoint,
    cetusAggregatorApiKey: cetusAggregatorConfig.apiKey,
    veloraPartner: rawVeloraPartner,
    veloraIncludeDEXS: rawVeloraIncludeDEXS,
    veloraOtherExchangePrices: configMore.veloraOtherExchangePrices === true,
    enablePriceSnapshot: configMore.enablePriceSnapshot === true,
    priceSnapshotIntervalSec: Number.parseInt(configMore.priceSnapshotIntervalSec, 10) || 10,
    arbCycleStartPriority,
    telegramBotToken: rawTelegramBotToken,
    telegramChatId: rawTelegramChatId,
    telegramBotApiBaseUrl: rawTelegramBotApiBaseUrl || DEFAULT_TELEGRAM_BOT_API_BASE_URL
  };
}

function buildDefaultRuntimeConfigData() {
  return { dashboard: [], settings: {} };
}

function getConfigSettings(rawData) {
  if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
    return rawData.settings && typeof rawData.settings === 'object'
      ? rawData.settings
      : {};
  }
  return {};
}

function buildDefaultIntervals(normalizeIntervalsImpl) {
  return typeof normalizeIntervalsImpl === 'function'
    ? normalizeIntervalsImpl({})
    : { ...DEFAULT_INTERVALS };
}

function createRuntimeConfigStore(options = {}) {
  const readJsonFile = options.readJsonFile;
  const logger = options.logger || console;
  const normalizeIntervalsImpl = options.normalizeIntervals || normalizeIntervals;
  const normalizeRequestChannelsConfigImpl = options.normalizeRequestChannelsConfig || normalizeRequestChannelsConfig;
  const configPath = options.configPath;
  const configMorePath = options.configMorePath;
  const requestChannelsPath = options.requestChannelsPath;
  const defaultConfigMore = buildDefaultConfigMore();
  const runtimeConfigCache = {
    loaded: false,
    configData: buildDefaultRuntimeConfigData(),
    configMore: defaultConfigMore,
    requestChannelsData: { channels: [] },
    requestChannelsConfig: normalizeRequestChannelsConfigImpl(
      { channels: [] },
      buildDefaultIntervals(normalizeIntervalsImpl),
      defaultConfigMore
    )
  };

  async function readConfigMoreForRuntime() {
    try {
      return normalizeConfigMoreData(await readJsonFile(configMorePath));
    } catch (error) {
      if (error.code !== 'ENOENT' && logger && typeof logger.warn === 'function') {
        logger.warn(`⚠️ 读取config_more失败，使用默认值: ${error.message}`);
      }
      return buildDefaultConfigMore();
    }
  }

  async function readConfigDataForRuntime() {
    try {
      const configData = await readJsonFile(configPath);
      return configData && typeof configData === 'object'
        ? configData
        : buildDefaultRuntimeConfigData();
    } catch (error) {
      if (!(error.code === 'ENOENT' || error instanceof SyntaxError)) {
        throw error;
      }
      return buildDefaultRuntimeConfigData();
    }
  }

  async function readRequestChannelsDataForRuntime() {
    try {
      const requestChannelsData = await readJsonFile(requestChannelsPath);
      return requestChannelsData && typeof requestChannelsData === 'object'
        ? requestChannelsData
        : { channels: [] };
    } catch (error) {
      if (!(error.code === 'ENOENT' || error instanceof SyntaxError)) {
        throw error;
      }
      return { channels: [] };
    }
  }

  async function refreshRuntimeConfigCache() {
    const [configMore, configData, requestChannelsData] = await Promise.all([
      readConfigMoreForRuntime(),
      readConfigDataForRuntime(),
      readRequestChannelsDataForRuntime()
    ]);

    const intervals = typeof normalizeIntervalsImpl === 'function'
      ? normalizeIntervalsImpl(getConfigSettings(configData))
      : { ...DEFAULT_INTERVALS };

    runtimeConfigCache.configData = configData;
    runtimeConfigCache.configMore = configMore;
    runtimeConfigCache.requestChannelsData = requestChannelsData;
    runtimeConfigCache.requestChannelsConfig = normalizeRequestChannelsConfigImpl(requestChannelsData, intervals, configMore);
    runtimeConfigCache.loaded = true;

    return runtimeConfigCache;
  }

  async function ensureRuntimeConfigCacheLoaded() {
    if (runtimeConfigCache.loaded) {
      return runtimeConfigCache;
    }
    return refreshRuntimeConfigCache();
  }

  async function getConfigMore() {
    const cache = await ensureRuntimeConfigCacheLoaded();
    return cache.configMore;
  }

  async function getRequestChannelsConfig() {
    const cache = await ensureRuntimeConfigCacheLoaded();
    return cache.requestChannelsConfig;
  }

  return {
    ensureRuntimeConfigCacheLoaded,
    getConfigMore,
    getRequestChannelsConfig,
    readConfigDataForRuntime,
    readConfigMoreForRuntime,
    readRequestChannelsDataForRuntime,
    refreshRuntimeConfigCache
  };
}

function loadStartupCetusAggregatorConfig(configMorePath, options = {}) {
  const readJsonFileSync = options.readJsonFileSync;
  const logger = options.logger || console;
  try {
    return normalizeCetusAggregatorConfig(readJsonFileSync(configMorePath));
  } catch (error) {
    if (error.code !== 'ENOENT' && logger && typeof logger.warn === 'function') {
      logger.warn(`⚠️ 读取 Cetus Aggregator 配置失败，使用默认值: ${error.message}`);
    }
    return normalizeCetusAggregatorConfig();
  }
}

module.exports = {
  buildDefaultConfigMore,
  buildDefaultRuntimeConfigData,
  createRuntimeConfigStore,
  getConfigSettings,
  loadStartupCetusAggregatorConfig,
  normalizeConfigMoreData,
  normalizeStringArray
};
