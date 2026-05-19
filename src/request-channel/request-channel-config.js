const {
  CHANNEL_AWARE_SOURCE_KEYS,
  DEFAULT_INTERVALS,
  DEFAULT_REQUEST_CHANNEL_ID,
  DEFAULT_REQUEST_CHANNEL_NAME,
  getRequestChannelOptions,
  isChannelAwareSourceKey
} = require('./request-channel-utils');

function normalizeConfigMore(rawConfigMore, defaultConfigMore) {
  const base = defaultConfigMore && typeof defaultConfigMore === 'object' ? defaultConfigMore : {};
  const overrides = rawConfigMore && typeof rawConfigMore === 'object' ? rawConfigMore : {};
  const overrideSettings = overrides.providerSettings && typeof overrides.providerSettings === 'object'
    ? overrides.providerSettings
    : overrides;
  const next = {
    ...base
  };

  if ('kyberClientId' in overrideSettings) {
    next.kyberClientId = String(overrideSettings.kyberClientId || '').trim();
  }
  if ('lifiApiKey' in overrideSettings || 'LIFIApiKey' in overrideSettings) {
    next.lifiApiKey = String(overrideSettings.lifiApiKey || overrideSettings.LIFIApiKey || '').trim();
  }
  if ('lifiIntegrator' in overrideSettings || 'LIFIIntegrator' in overrideSettings) {
    next.lifiIntegrator = String(overrideSettings.lifiIntegrator || overrideSettings.LIFIIntegrator || '').trim();
  }
  if ('jupiterApiKey' in overrideSettings) {
    next.jupiterApiKey = String(overrideSettings.jupiterApiKey || '').trim();
  }
  if ('veloraPartner' in overrideSettings) {
    next.veloraPartner = String(overrideSettings.veloraPartner || '').trim();
  }
  if ('veloraIncludeDEXS' in overrideSettings) {
    next.veloraIncludeDEXS = Array.isArray(overrideSettings.veloraIncludeDEXS)
      ? overrideSettings.veloraIncludeDEXS.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
  }
  if ('veloraOtherExchangePrices' in overrideSettings) {
    next.veloraOtherExchangePrices = overrideSettings.veloraOtherExchangePrices === true;
  }
  if ('llamaParaSwapProxyUrl' in overrideSettings || 'defillamaProxyUrl' in overrideSettings) {
    next.llamaParaSwapProxyUrl = String(overrideSettings.llamaParaSwapProxyUrl || overrideSettings.defillamaProxyUrl || '').trim();
  }
  if ('llamaParaSwapSlippage' in overrideSettings || 'defillamaProxySlippage' in overrideSettings) {
    next.llamaParaSwapSlippage = String(overrideSettings.llamaParaSwapSlippage || overrideSettings.defillamaProxySlippage || '').trim();
  }

  return {
    ...next,
    providerSettings: {
      ...(base.providerSettings && typeof base.providerSettings === 'object' ? base.providerSettings : {}),
      kyberClientId: next.kyberClientId,
      lifiApiKey: next.lifiApiKey,
      lifiIntegrator: next.lifiIntegrator,
      jupiterApiKey: next.jupiterApiKey,
      veloraPartner: next.veloraPartner,
      veloraIncludeDEXS: next.veloraIncludeDEXS,
      veloraOtherExchangePrices: next.veloraOtherExchangePrices,
      llamaParaSwapProxyUrl: next.llamaParaSwapProxyUrl,
      llamaParaSwapSlippage: next.llamaParaSwapSlippage
    }
  };
}

function normalizeRequestChannelsConfig(rawData, defaultIntervals = DEFAULT_INTERVALS, defaultConfigMore = {}) {
  const requestChannels = getRequestChannelOptions(rawData, defaultIntervals);
  const channels = requestChannels.channels.map((channel) => ({
    ...channel,
    configMore: normalizeConfigMore(
      channel.id === DEFAULT_REQUEST_CHANNEL_ID ? defaultConfigMore : (rawData && Array.isArray(rawData.channels)
        ? (() => {
            const rawChannel = rawData.channels.find((item) => item && item.id === channel.id) || {};
            return rawChannel.providerSettings || rawChannel.configMore;
          })()
        : {}),
      defaultConfigMore
    )
  }));
  const byId = new Map(channels.map((channel) => [channel.id, channel]));

  return {
    channels,
    byId,
    channelAwareSourceKeys: [...CHANNEL_AWARE_SOURCE_KEYS],
    defaultChannelId: DEFAULT_REQUEST_CHANNEL_ID
  };
}

function resolveRequestChannelContext({ requestChannelId, sourceKey, requestChannelsConfig }) {
  const config = requestChannelsConfig && requestChannelsConfig.byId instanceof Map
    ? requestChannelsConfig
    : normalizeRequestChannelsConfig();
  const normalizedSourceKey = String(sourceKey || '').trim().toLowerCase();
  const requestedId = String(requestChannelId || '').trim() || DEFAULT_REQUEST_CHANNEL_ID;
  const shouldUseRequestedChannel = isChannelAwareSourceKey(normalizedSourceKey) && config.byId.has(requestedId);
  const channelId = shouldUseRequestedChannel ? requestedId : DEFAULT_REQUEST_CHANNEL_ID;
  const channel = config.byId.get(channelId) || config.byId.get(DEFAULT_REQUEST_CHANNEL_ID);

  return {
    channelId,
    channelName: channel ? channel.name : DEFAULT_REQUEST_CHANNEL_NAME,
    isDefault: channelId === DEFAULT_REQUEST_CHANNEL_ID,
    httpProxy: channel ? channel.httpProxy : '',
    intervals: channel ? channel.intervals : { ...DEFAULT_INTERVALS },
    configMore: channel ? channel.configMore : {}
  };
}

function sanitizeRequestChannelsForClient(requestChannelsConfig) {
  const config = requestChannelsConfig && Array.isArray(requestChannelsConfig.channels)
    ? requestChannelsConfig
    : normalizeRequestChannelsConfig();

  return {
    channels: config.channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      isDefault: channel.id === DEFAULT_REQUEST_CHANNEL_ID,
      httpProxy: channel.httpProxy,
      intervals: { ...channel.intervals }
    }))
  };
}

module.exports = {
  normalizeRequestChannelsConfig,
  resolveRequestChannelContext,
  sanitizeRequestChannelsForClient
};
