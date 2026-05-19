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
    providerSettings: {
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
      llamaParaSwapProxyUrl: 'http://127.0.0.1:18081',
      llamaParaSwapSlippage: '0.5'
    },
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
    llamaParaSwapProxyUrl: 'http://127.0.0.1:18081',
    llamaParaSwapSlippage: '0.5',
    enablePriceSnapshot: false,
    priceSnapshotIntervalSec: 10,
    arbCycleStartPriority: Array.from(DEFAULT_ARB_CYCLE_START_PRIORITY),
    telegramBotToken: '',
    telegramChatId: '',
    telegramBotApiBaseUrl: DEFAULT_TELEGRAM_BOT_API_BASE_URL
  };
}

function normalizeConfigMoreData(configMore = {}) {
  const providerSettings = configMore.providerSettings && typeof configMore.providerSettings === 'object'
    ? configMore.providerSettings
    : {};
  const pickString = (...values) => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  };
  const pickArray = (...values) => {
    for (const value of values) {
      const normalized = normalizeStringArray(value);
      if (normalized.length > 0) return normalized;
    }
    return [];
  };
  const rawClientId = pickString(providerSettings.kyberClientId, configMore.kyberClientId);
  const rawLifiApiKey = pickString(providerSettings.lifiApiKey, configMore.lifiApiKey, configMore.LIFIApiKey);
  const rawLifiIntegrator = pickString(providerSettings.lifiIntegrator, configMore.lifiIntegrator, configMore.LIFIIntegrator);
  const rawLifiSlippage = pickString(providerSettings.lifiSlippage, configMore.lifiSlippage, configMore.LIFISlippage);
  const rawJupiterApiKey = pickString(providerSettings.jupiterApiKey, configMore.jupiterApiKey);
  const rawCetusAggregatorEndpoint = pickString(providerSettings.cetusAggregatorEndpoint, configMore.cetusAggregatorEndpoint);
  const rawCetusAggregatorApiKey = pickString(providerSettings.cetusAggregatorApiKey, configMore.cetusAggregatorApiKey);
  const rawVeloraPartner = pickString(providerSettings.veloraPartner, configMore.veloraPartner);
  const rawVeloraIncludeDEXS = pickArray(providerSettings.veloraIncludeDEXS, configMore.veloraIncludeDEXS);
  const rawLlamaParaSwapProxyUrl = pickString(
    providerSettings.llamaParaSwapProxyUrl,
    configMore.llamaParaSwapProxyUrl,
    configMore.defillamaProxyUrl
  );
  const rawLlamaParaSwapSlippage = pickString(
    providerSettings.llamaParaSwapSlippage,
    configMore.llamaParaSwapSlippage,
    configMore.defillamaProxySlippage
  );
  const rawTelegramBotToken = typeof configMore.telegramBotToken === 'string' ? configMore.telegramBotToken.trim() : '';
  const rawTelegramChatId = typeof configMore.telegramChatId === 'string' ? configMore.telegramChatId.trim() : '';
  const rawTelegramBotApiBaseUrl = typeof configMore.telegramBotApiBaseUrl === 'string'
    ? configMore.telegramBotApiBaseUrl.trim()
    : '';
  const cetusAggregatorConfig = normalizeCetusAggregatorConfig({
    ...configMore,
    cetusAggregatorEndpoint: rawCetusAggregatorEndpoint,
    cetusAggregatorApiKey: rawCetusAggregatorApiKey
  });
  const arbCycleStartPriority = normalizeArbCycleStartPriority(configMore.arbCycleStartPriority);

  const normalized = {
    kyberClientId: rawClientId || 'xh-quote-dashboard',
    lifiApiKey: rawLifiApiKey,
    lifiIntegrator: rawLifiIntegrator,
    lifiSlippage: rawLifiSlippage || '0.0001',
    jupiterApiKey: rawJupiterApiKey,
    cetusAggregatorEndpoint: cetusAggregatorConfig.endpoint,
    cetusAggregatorApiKey: cetusAggregatorConfig.apiKey,
    veloraPartner: rawVeloraPartner,
    veloraIncludeDEXS: rawVeloraIncludeDEXS,
    veloraOtherExchangePrices: providerSettings.veloraOtherExchangePrices === true || configMore.veloraOtherExchangePrices === true,
    llamaParaSwapProxyUrl: rawLlamaParaSwapProxyUrl || 'http://127.0.0.1:18081',
    llamaParaSwapSlippage: rawLlamaParaSwapSlippage || '0.5',
    enablePriceSnapshot: configMore.enablePriceSnapshot === true,
    priceSnapshotIntervalSec: Number.parseInt(configMore.priceSnapshotIntervalSec, 10) || 10,
    arbCycleStartPriority,
    telegramBotToken: rawTelegramBotToken,
    telegramChatId: rawTelegramChatId,
    telegramBotApiBaseUrl: rawTelegramBotApiBaseUrl || DEFAULT_TELEGRAM_BOT_API_BASE_URL
  };
  return {
    ...normalized,
    providerSettings: {
      kyberClientId: normalized.kyberClientId,
      lifiApiKey: normalized.lifiApiKey,
      lifiIntegrator: normalized.lifiIntegrator,
      lifiSlippage: normalized.lifiSlippage,
      jupiterApiKey: normalized.jupiterApiKey,
      cetusAggregatorEndpoint: normalized.cetusAggregatorEndpoint,
      cetusAggregatorApiKey: normalized.cetusAggregatorApiKey,
      veloraPartner: normalized.veloraPartner,
      veloraIncludeDEXS: normalized.veloraIncludeDEXS,
      veloraOtherExchangePrices: normalized.veloraOtherExchangePrices,
      llamaParaSwapProxyUrl: normalized.llamaParaSwapProxyUrl,
      llamaParaSwapSlippage: normalized.llamaParaSwapSlippage
    }
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
    const rawConfigMore = readJsonFileSync(configMorePath);
    const providerSettings = rawConfigMore && rawConfigMore.providerSettings && typeof rawConfigMore.providerSettings === 'object'
      ? rawConfigMore.providerSettings
      : {};
    return normalizeCetusAggregatorConfig({
      ...rawConfigMore,
      cetusAggregatorEndpoint: providerSettings.cetusAggregatorEndpoint || rawConfigMore.cetusAggregatorEndpoint,
      cetusAggregatorApiKey: providerSettings.cetusAggregatorApiKey || rawConfigMore.cetusAggregatorApiKey
    });
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
