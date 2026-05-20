(function (root, factory) {
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('../shared/chain-defaults')
    : root.ChainDefaults;
  const api = factory(chainDefaults);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.RequestChannelUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (chainDefaults) {
  const DEFAULT_REQUEST_CHANNEL_ID = 'default';
  const DEFAULT_REQUEST_CHANNEL_NAME = '默认通道';
  const MULTI_CHANNEL_ENABLED_STORAGE_KEY = 'dashboard-multi-channel-enabled';
  const DEFAULT_INTERVALS = {
    kyber: 170,
    zerox: 110,
    velora: 700,
    llamaparaswap: 800,
    lifi: 170,
    bybit: 1000,
    binance: 1000,
    solana: 3500,
    sui: 500,
    starknet: 1000
  };
  const CHANNEL_AWARE_SOURCE_KEYS = ['kyber', 'zerox', 'velora', 'llamaparaswap', 'lifi', 'solana', 'starknet'];

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
      } else if (quote && quote.preferredSource === 'Llama-ParaSwap') {
        sourceKey = 'llamaparaswap';
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

  function applyMultiChannelToggleButtonState(buttonEl, enabled) {
    if (!buttonEl) return false;
    const state = buildMultiChannelToggleState(enabled);
    buttonEl.textContent = state.text;
    buttonEl.title = state.title;
    if (typeof buttonEl.setAttribute === 'function') {
      buttonEl.setAttribute('aria-pressed', state.ariaPressed);
    }
    if (buttonEl.classList && typeof buttonEl.classList.toggle === 'function') {
      buttonEl.classList.toggle('active', state.active);
    }
    return true;
  }

  function buildRequestChannelTagId(quote) {
    if (!quote || quote.id == null || quote.id === '') return '';
    return `quote-channel-tag-${quote.id}`;
  }

  function buildRequestChannelTagHtml(quote, channel) {
    const tagId = buildRequestChannelTagId(quote);
    if (!tagId || !channel) return '';
    return `<span class="quote-channel-tag" id="${escapeHtml(tagId)}">${escapeHtml(channel.name)}</span>`;
  }

  function buildRequestChannelTagPatch(quote, channel, options = {}) {
    if (!quote) return null;
    const hasExistingTag = options.hasExistingTag === true;
    if (!channel) {
      return hasExistingTag ? { action: 'remove' } : null;
    }
    if (hasExistingTag) {
      return {
        action: 'update',
        text: String(channel.name == null ? '' : channel.name)
      };
    }
    const html = buildRequestChannelTagHtml(quote, channel);
    if (!html) return null;
    return {
      action: 'insert',
      html
    };
  }

  function escapeCssIdentifier(value, options = {}) {
    if (typeof options.escapeCssIdentifier === 'function') {
      return options.escapeCssIdentifier(value);
    }
    if (typeof CSS !== 'undefined' && CSS && typeof CSS.escape === 'function') {
      return CSS.escape(value);
    }
    return String(value == null ? '' : value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function getRequestChannelTagElement(itemEl, quote, options = {}) {
    const tagId = buildRequestChannelTagId(quote);
    if (!tagId || !itemEl || typeof itemEl.querySelector !== 'function') return null;
    return itemEl.querySelector(`#${escapeCssIdentifier(tagId, options)}`);
  }

  function applyRequestChannelTagForQuote(quote, requestChannels, options = {}) {
    if (!quote) return false;
    const getElementById = typeof options.getElementById === 'function'
      ? options.getElementById
      : (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
    const itemEl = getElementById(`quote-item-${quote.id}`);
    if (!itemEl || typeof itemEl.querySelector !== 'function') return false;

    const labelRow = itemEl.querySelector('.quote-label-row');
    if (!labelRow || typeof labelRow.querySelector !== 'function') return false;

    const existingTag = getRequestChannelTagElement(itemEl, quote, options);
    const channel = getRequestChannelDisplayForQuote(quote, requestChannels);
    const patch = buildRequestChannelTagPatch(quote, channel, {
      hasExistingTag: Boolean(existingTag)
    });
    if (!patch) return false;

    if (patch.action === 'remove') {
      if (existingTag && typeof existingTag.remove === 'function') {
        existingTag.remove();
      }
      return true;
    }

    if (patch.action === 'update') {
      if (existingTag) existingTag.textContent = patch.text;
      return true;
    }

    const labelEl = labelRow.querySelector('.quote-label');
    if (!labelEl || typeof labelEl.insertAdjacentHTML !== 'function') return false;
    labelEl.insertAdjacentHTML('afterend', patch.html);
    return true;
  }

  function applyRequestChannelTagsVisibility(bodyEl, visible) {
    if (!bodyEl || !bodyEl.classList || typeof bodyEl.classList.toggle !== 'function') return false;
    bodyEl.classList.toggle('show-request-channel-tags', visible === true);
    return true;
  }

  function createRequestChannelTagVisibilityRuntime(options = {}) {
    let visible = options.visible !== false;
    const getBody = typeof options.getBody === 'function'
      ? options.getBody
      : () => options.body || (typeof document !== 'undefined' ? document.body : null);

    function apply() {
      return applyRequestChannelTagsVisibility(getBody(), visible);
    }

    function set(nextVisible) {
      visible = nextVisible === true;
      apply();
      return visible;
    }

    return {
      apply,
      get: () => visible,
      set,
      toggle: () => set(!visible)
    };
  }

  function parseMultiChannelEnabledStorageValue(value, fallback = true) {
    if (value == null) return fallback !== false;
    return value !== 'false';
  }

  function formatMultiChannelEnabledStorageValue(enabled) {
    return enabled === true ? 'true' : 'false';
  }

  function loadMultiChannelEnabledFromStorage(storage, options = {}) {
    const fallback = options.fallback !== false;
    if (!storage || typeof storage.getItem !== 'function') return fallback;
    try {
      return parseMultiChannelEnabledStorageValue(
        storage.getItem(options.storageKey || MULTI_CHANNEL_ENABLED_STORAGE_KEY),
        fallback
      );
    } catch (error) {
      if (typeof options.onError === 'function') {
        options.onError(error);
      }
      return fallback;
    }
  }

  function persistMultiChannelEnabledToStorage(storage, enabled, options = {}) {
    if (!storage || typeof storage.setItem !== 'function') return false;
    try {
      storage.setItem(
        options.storageKey || MULTI_CHANNEL_ENABLED_STORAGE_KEY,
        formatMultiChannelEnabledStorageValue(enabled)
      );
      return true;
    } catch (error) {
      if (typeof options.onError === 'function') {
        options.onError(error);
      }
      return false;
    }
  }

  function createMultiChannelToggleRuntime(options = {}) {
    let enabled = options.initialEnabled !== false;
    const getStorage = typeof options.getStorage === 'function'
      ? options.getStorage
      : () => options.storage || null;
    const getButton = typeof options.getButton === 'function'
      ? options.getButton
      : () => options.button || null;

    function render() {
      return applyMultiChannelToggleButtonState(getButton(), enabled);
    }

    function persist() {
      return persistMultiChannelEnabledToStorage(getStorage(), enabled, {
        onError: options.onPersistError
      });
    }

    function load() {
      enabled = loadMultiChannelEnabledFromStorage(getStorage(), {
        fallback: enabled,
        onError: options.onLoadError
      });
      render();
      return enabled;
    }

    function set(nextValue) {
      const previousEnabled = enabled;
      enabled = nextValue !== false;
      render();
      persist();
      return {
        previousEnabled,
        nextEnabled: enabled,
        changed: previousEnabled !== enabled
      };
    }

    return {
      get: () => enabled,
      load,
      persist,
      render,
      set,
      toggle: () => set(!enabled)
    };
  }

  function flattenDashboardQuotes(dashboardState) {
    return (Array.isArray(dashboardState) ? dashboardState : [])
      .flatMap((category) => (Array.isArray(category && category.quotes) ? category.quotes : []));
  }

  function buildMultiChannelChangedQuotes(dashboardState, requestChannels, previousEnabled, nextEnabled) {
    return flattenDashboardQuotes(dashboardState).filter((quote) => {
      if (!supportsRequestChannelForQuote(quote)) return false;
      const previousChannelId = getEffectiveRequestChannelIdForQuote(quote, requestChannels, {
        multiChannelEnabled: previousEnabled
      });
      const nextChannelId = getEffectiveRequestChannelIdForQuote(quote, requestChannels, {
        multiChannelEnabled: nextEnabled
      });
      return previousChannelId !== nextChannelId;
    });
  }

  function createRequestChannelRuntime(options = {}) {
    let requestChannelPayload = options.payload && typeof options.payload === 'object'
      ? options.payload
      : { channels: [] };
    let defaultIntervals = normalizeIntervals(options.defaultIntervals);
    let requestChannels = getRequestChannelOptions(requestChannelPayload, defaultIntervals);
    const multiChannelToggleRuntime = options.multiChannelToggleRuntime || createMultiChannelToggleRuntime(options.multiChannelToggleOptions || {});

    function refreshOptions() {
      requestChannels = getRequestChannelOptions(requestChannelPayload, defaultIntervals);
      return requestChannels;
    }

    function setPayload(nextPayload) {
      requestChannelPayload = nextPayload && typeof nextPayload === 'object'
        ? nextPayload
        : { channels: [] };
      return refreshOptions();
    }

    function setDefaultIntervals(nextIntervals) {
      defaultIntervals = normalizeIntervals(nextIntervals);
      return refreshOptions();
    }

    function isMultiChannelEnabled() {
      return multiChannelToggleRuntime.get();
    }

    function getEffectiveChannelIdForQuote(quote, options = {}) {
      const overrideOptions = options && typeof options === 'object' ? options : {};
      const enabled = Object.prototype.hasOwnProperty.call(overrideOptions, 'multiChannelEnabled')
        ? overrideOptions.multiChannelEnabled
        : isMultiChannelEnabled();
      return getEffectiveRequestChannelIdForQuote(quote, requestChannels, {
        multiChannelEnabled: enabled
      });
    }

    function updateTagForQuote(quote, tagOptions = {}) {
      return applyRequestChannelTagForQuote(quote, requestChannels, tagOptions);
    }

    function getChangedQuotesForMultiChannelToggle(previousEnabled, nextEnabled, dashboardState) {
      return buildMultiChannelChangedQuotes(dashboardState, requestChannels, previousEnabled, nextEnabled);
    }

    function applyMultiChannelToggleResult(result, dashboardState, callbacks = {}) {
      if (!result || result.changed !== true) {
        return {
          ...(result || {
            previousEnabled: isMultiChannelEnabled(),
            nextEnabled: isMultiChannelEnabled(),
            changed: false
          }),
          changedQuotes: []
        };
      }
      const changedQuotes = getChangedQuotesForMultiChannelToggle(
        result.previousEnabled,
        result.nextEnabled,
        dashboardState
      );
      changedQuotes.forEach((quote) => {
        if (typeof callbacks.removeFromQueue === 'function') {
          callbacks.removeFromQueue(quote.id);
        }
        if (typeof callbacks.queueQuoteRefresh === 'function') {
          callbacks.queueQuoteRefresh(quote, { updateSchedulers: false });
        }
      });
      if (changedQuotes.length && typeof callbacks.updateSchedulers === 'function') {
        callbacks.updateSchedulers();
      }
      return {
        ...result,
        changedQuotes
      };
    }

    function setMultiChannelEnabled(nextValue, dashboardState, callbacks = {}) {
      return applyMultiChannelToggleResult(
        multiChannelToggleRuntime.set(nextValue),
        dashboardState,
        callbacks
      );
    }

    function toggleMultiChannel(dashboardState, callbacks = {}) {
      return setMultiChannelEnabled(!isMultiChannelEnabled(), dashboardState, callbacks);
    }

    return {
      getDefaultIntervals: () => ({ ...defaultIntervals }),
      getEffectiveChannelIdForQuote,
      getOptions: () => requestChannels,
      getPayload: () => requestChannelPayload,
      getChangedQuotesForMultiChannelToggle,
      isMultiChannelEnabled,
      loadMultiChannelEnabled: () => multiChannelToggleRuntime.load(),
      renderMultiChannelToggle: () => multiChannelToggleRuntime.render(),
      setDefaultIntervals,
      setMultiChannelEnabled,
      setPayload,
      toggleMultiChannel,
      updateTagForQuote
    };
  }

  function getBrowserLocalStorage(env = {}, options = {}) {
    const runtimeWindow = env.window || (typeof window !== 'undefined' ? window : null);
    if (!runtimeWindow) return null;
    try {
      return runtimeWindow.localStorage || null;
    } catch (error) {
      if (typeof options.onError === 'function') {
        options.onError(error);
      }
      return null;
    }
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
    MULTI_CHANNEL_ENABLED_STORAGE_KEY,
    applyMultiChannelToggleButtonState,
    applyRequestChannelTagForQuote,
    applyRequestChannelTagsVisibility,
    buildQueueKey,
    buildMultiChannelToggleState,
    buildMultiChannelChangedQuotes,
    buildRequestChannelTagHtml,
    buildRequestChannelTagPatch,
    buildRequestChannelOptionsHtml,
    createMultiChannelToggleRuntime,
    createRequestChannelRuntime,
    createRequestChannelTagVisibilityRuntime,
    formatMultiChannelEnabledStorageValue,
    getBrowserLocalStorage,
    getEffectiveRequestChannelIdForQuote,
    getEffectiveIntervalForQueue,
    getRequestChannelDisplayForQuote,
    getQueueKeyForQuote,
    getRequestChannelOptions,
    isChannelAwareSourceKey,
    loadMultiChannelEnabledFromStorage,
    normalizeIntervals,
    parseMultiChannelEnabledStorageValue,
    parseQueueKey,
    persistMultiChannelEnabledToStorage,
    resolveRequestChannelIdForQuote,
    supportsRequestChannelForQuote
  };
});
