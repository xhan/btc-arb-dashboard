(function (root, factory) {
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('./chain-defaults')
    : root.ChainDefaults;
  const api = factory(chainDefaults);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.RequestChannelUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (chainDefaults) {
  const DEFAULT_REQUEST_CHANNEL_ID = 'default';
  const DEFAULT_REQUEST_CHANNEL_NAME = '默认通道';
  const DEFAULT_INTERVALS = {
    kyber: 170,
    zerox: 110,
    velora: 700,
    lifi: 170,
    bybit: 1000,
    binance: 1000,
    solana: 3500,
    sui: 500,
    starknet: 1000
  };
  const CHANNEL_AWARE_SOURCE_KEYS = ['kyber', 'zerox', 'velora', 'lifi', 'solana', 'starknet'];

  function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeChain(chain) {
    if (chainDefaults && typeof chainDefaults.normalizeChain === 'function') {
      return chainDefaults.normalizeChain(chain);
    }
    return normalizeString(chain).toLowerCase();
  }

  function isEvmChain(chain) {
    if (chainDefaults && typeof chainDefaults.isEvmChain === 'function') {
      return chainDefaults.isEvmChain(chain);
    }
    const normalized = normalizeChain(chain);
    const nonEvm = new Set(['solana', 'sui', 'starknet', 'bybit', 'binance']);
    return !!normalized && !nonEvm.has(normalized);
  }

  function isCrossChainQuote(quote) {
    if (chainDefaults && typeof chainDefaults.isCrossChainQuote === 'function') {
      return chainDefaults.isCrossChainQuote(quote);
    }
    const fromChain = normalizeChain(quote && quote.chain);
    const toChain = normalizeChain(quote && quote.toChain);
    return Boolean(fromChain && toChain && fromChain !== toChain);
  }

  function isChannelAwareSourceKey(sourceKey) {
    return CHANNEL_AWARE_SOURCE_KEYS.includes(normalizeString(sourceKey).toLowerCase());
  }

  function normalizeRequestChannelId(value) {
    const normalized = normalizeString(value);
    return normalized || DEFAULT_REQUEST_CHANNEL_ID;
  }

  function getQueueSourceKeyForQuote(quote) {
    const chain = String(quote && quote.chain ? quote.chain : '');
    const normalized = normalizeChain(chain);
    let sourceKey = 'kyber';

    if (isCrossChainQuote(quote)) return 'lifi';
    if (normalized === 'bybit') return 'bybit';
    if (normalized === 'binance') return 'binance';
    if (normalized === 'solana') return 'solana';
    if (normalized === 'sui') return 'sui';
    if (normalized === 'starknet') return 'starknet';

    if (isEvmChain(chain)) {
      if (quote && quote.preferredSource === 'Velora') {
        sourceKey = 'velora';
      } else if (quote && quote.preferredSource === '0x') {
        sourceKey = 'zerox';
      } else if (quote && quote.preferredSource === 'LI.FI') {
        sourceKey = 'lifi';
      }
    }

    return sourceKey;
  }

  function supportsRequestChannelForQuote(quote) {
    return isChannelAwareSourceKey(getQueueSourceKeyForQuote(quote));
  }

  function normalizeIntervals(source) {
    const intervals = { ...DEFAULT_INTERVALS };
    const raw = source && typeof source === 'object' ? source : {};

    Object.keys(intervals).forEach((key) => {
      const value = Number(raw[key]);
      if (Number.isFinite(value) && value >= 0) {
        intervals[key] = value;
      }
    });

    return intervals;
  }

  function normalizeChannel(rawChannel, defaultIntervals) {
    const raw = rawChannel && typeof rawChannel === 'object' ? rawChannel : {};
    const id = normalizeRequestChannelId(raw.id);
    return {
      id,
      name: normalizeString(raw.name) || (id === DEFAULT_REQUEST_CHANNEL_ID ? DEFAULT_REQUEST_CHANNEL_NAME : id),
      isDefault: id === DEFAULT_REQUEST_CHANNEL_ID,
      httpProxy: normalizeString(raw.httpProxy),
      intervals: normalizeIntervals({
        ...(defaultIntervals || DEFAULT_INTERVALS),
        ...(raw.intervals && typeof raw.intervals === 'object' ? raw.intervals : {})
      })
    };
  }

  function getRequestChannelOptions(rawData, defaultIntervals) {
    const rawChannels = rawData && Array.isArray(rawData.channels) ? rawData.channels : [];
    const effectiveDefaultIntervals = normalizeIntervals(defaultIntervals);
    const channels = [
      normalizeChannel(
        {
          id: DEFAULT_REQUEST_CHANNEL_ID,
          name: DEFAULT_REQUEST_CHANNEL_NAME,
          intervals: effectiveDefaultIntervals
        },
        effectiveDefaultIntervals
      )
    ];
    const byId = new Map([[DEFAULT_REQUEST_CHANNEL_ID, channels[0]]]);

    rawChannels.forEach((rawChannel) => {
      const normalized = normalizeChannel(rawChannel, effectiveDefaultIntervals);
      if (normalized.id === DEFAULT_REQUEST_CHANNEL_ID || byId.has(normalized.id)) {
        return;
      }
      channels.push(normalized);
      byId.set(normalized.id, normalized);
    });

    return {
      channels,
      byId,
      defaultChannelId: DEFAULT_REQUEST_CHANNEL_ID
    };
  }

  function resolveRequestChannelIdForQuote(quote, requestChannels) {
    if (!supportsRequestChannelForQuote(quote)) {
      return DEFAULT_REQUEST_CHANNEL_ID;
    }
    const channelId = normalizeRequestChannelId(quote && quote.requestChannelId);
    if (!requestChannels || !(requestChannels.byId instanceof Map)) {
      return channelId;
    }
    return requestChannels.byId.has(channelId) ? channelId : DEFAULT_REQUEST_CHANNEL_ID;
  }

  function getEffectiveRequestChannelIdForQuote(quote, requestChannels, options) {
    const resolvedChannelId = resolveRequestChannelIdForQuote(quote, requestChannels);
    if (!quote || !supportsRequestChannelForQuote(quote)) {
      return DEFAULT_REQUEST_CHANNEL_ID;
    }
    if (options && options.multiChannelEnabled === false) {
      return DEFAULT_REQUEST_CHANNEL_ID;
    }
    return resolvedChannelId;
  }

  function getRequestChannelDisplayForQuote(quote, requestChannels) {
    const channelId = resolveRequestChannelIdForQuote(quote, requestChannels);
    if (channelId === DEFAULT_REQUEST_CHANNEL_ID) {
      return null;
    }
    if (requestChannels && requestChannels.byId instanceof Map) {
      return requestChannels.byId.get(channelId) || null;
    }
    return {
      id: channelId,
      name: channelId,
      isDefault: false
    };
  }

  function buildRequestChannelOptionsHtml(channels) {
    return (Array.isArray(channels) ? channels : []).map((channel) => {
      const suffix = channel && channel.isDefault ? ' (默认)' : '';
      return `<option value="${escapeHtml(channel && channel.id)}">${escapeHtml(channel && channel.name)}${suffix}</option>`;
    }).join('');
  }

  function buildMultiChannelToggleState(enabled) {
    const active = enabled === true;
    return {
      text: `多渠道: ${active ? '开' : '关'}`,
      title: active
        ? '已开启多渠道，点击后临时并入默认渠道'
        : '已关闭多渠道，点击后恢复按交易对渠道请求',
      ariaPressed: active ? 'true' : 'false',
      active
    };
  }

  function buildQueueKey(sourceKey, channelId) {
    const normalizedSourceKey = normalizeString(sourceKey).toLowerCase();
    if (!normalizedSourceKey) return '';
    if (!isChannelAwareSourceKey(normalizedSourceKey)) {
      return normalizedSourceKey;
    }
    return `${normalizedSourceKey}:${normalizeRequestChannelId(channelId)}`;
  }

  function parseQueueKey(queueKey) {
    const normalized = normalizeString(queueKey);
    if (!normalized) {
      return {
        queueKey: '',
        sourceKey: '',
        channelId: DEFAULT_REQUEST_CHANNEL_ID,
        isChannelAware: false
      };
    }
    const splitIndex = normalized.indexOf(':');
    if (splitIndex < 0) {
      const sourceKey = normalized.toLowerCase();
      return {
        queueKey: normalized,
        sourceKey,
        channelId: DEFAULT_REQUEST_CHANNEL_ID,
        isChannelAware: isChannelAwareSourceKey(sourceKey)
      };
    }
    const sourceKey = normalized.slice(0, splitIndex).toLowerCase();
    return {
      queueKey: normalized,
      sourceKey,
      channelId: normalizeRequestChannelId(normalized.slice(splitIndex + 1)),
      isChannelAware: isChannelAwareSourceKey(sourceKey)
    };
  }

  function getQueueKeyForQuote(quote, requestChannels, options) {
    const sourceKey = getQueueSourceKeyForQuote(quote);
    const channelId = getEffectiveRequestChannelIdForQuote(quote, requestChannels, options);
    return buildQueueKey(sourceKey, channelId);
  }

  function getEffectiveIntervalForQueue(queueKey, defaultIntervals, requestChannels) {
    const normalizedDefaultIntervals = normalizeIntervals(defaultIntervals);
    const parsed = parseQueueKey(queueKey);
    if (!parsed.sourceKey) return 0;
    if (!parsed.isChannelAware) {
      return normalizedDefaultIntervals[parsed.sourceKey];
    }
    const channel = requestChannels && requestChannels.byId instanceof Map
      ? requestChannels.byId.get(parsed.channelId)
      : null;
    if (channel && channel.intervals && Number.isFinite(Number(channel.intervals[parsed.sourceKey]))) {
      return Number(channel.intervals[parsed.sourceKey]);
    }
    return normalizedDefaultIntervals[parsed.sourceKey];
  }

  return {
    CHANNEL_AWARE_SOURCE_KEYS,
    DEFAULT_INTERVALS,
    DEFAULT_REQUEST_CHANNEL_ID,
    DEFAULT_REQUEST_CHANNEL_NAME,
    buildQueueKey,
    buildMultiChannelToggleState,
    buildRequestChannelOptionsHtml,
    getEffectiveRequestChannelIdForQuote,
    getEffectiveIntervalForQueue,
    getRequestChannelDisplayForQuote,
    getQueueKeyForQuote,
    getRequestChannelOptions,
    isChannelAwareSourceKey,
    normalizeIntervals,
    parseQueueKey,
    resolveRequestChannelIdForQuote,
    supportsRequestChannelForQuote
  };
});
