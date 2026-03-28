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
  const next = {
    ...base
  };

  if ('kyberClientId' in overrides) {
    next.kyberClientId = String(overrides.kyberClientId || '').trim();
  }
  if ('lifiApiKey' in overrides || 'LIFIApiKey' in overrides) {
    next.lifiApiKey = String(overrides.lifiApiKey || overrides.LIFIApiKey || '').trim();
  }
  if ('lifiIntegrator' in overrides || 'LIFIIntegrator' in overrides) {
    next.lifiIntegrator = String(overrides.lifiIntegrator || overrides.LIFIIntegrator || '').trim();
  }
  if ('jupiterApiKey' in overrides) {
    next.jupiterApiKey = String(overrides.jupiterApiKey || '').trim();
  }
  if ('veloraPartner' in overrides) {
    next.veloraPartner = String(overrides.veloraPartner || '').trim();
  }
  if ('veloraIncludeDEXS' in overrides) {
    next.veloraIncludeDEXS = Array.isArray(overrides.veloraIncludeDEXS)
      ? overrides.veloraIncludeDEXS.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
  }
  if ('veloraOtherExchangePrices' in overrides) {
    next.veloraOtherExchangePrices = overrides.veloraOtherExchangePrices === true;
  }

  return next;
}

function normalizeRequestChannelsConfig(rawData, defaultIntervals = DEFAULT_INTERVALS, defaultConfigMore = {}) {
  const requestChannels = getRequestChannelOptions(rawData, defaultIntervals);
  const channels = requestChannels.channels.map((channel) => ({
    ...channel,
    configMore: normalizeConfigMore(
      channel.id === DEFAULT_REQUEST_CHANNEL_ID ? defaultConfigMore : (rawData && Array.isArray(rawData.channels)
        ? (rawData.channels.find((item) => item && item.id === channel.id) || {}).configMore
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
