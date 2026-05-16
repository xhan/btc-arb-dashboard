(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.DashboardRuntimeUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const QUOTE_MARKET_STATE_FIELDS = [
    'fromSymbol',
    'toSymbol',
    'lastResultText',
    'lastRawPrice',
    'lastTotalAmountOut',
    'inverseRawPrice',
    'inverseTotalAmountOut',
    'inverseFromSymbol',
    'inverseToSymbol',
    'usedSource',
    'usedSourceReal',
    'cexOrderbook'
  ];
  const NON_MARKET_QUOTE_STATE_FIELDS = new Set([
    'hasUnreadAlert',
    'trendTimer',
    // Legacy UI fields may still arrive from old runtime snapshots.
    'logShown',
    'isSoundActive'
  ]);

  function normalizeMarketStateValue(value) {
    if (value === undefined) return null;
    if (value && typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  }

  function buildQuoteMarketStateSignature(state) {
    const source = state && typeof state === 'object' ? state : {};
    return QUOTE_MARKET_STATE_FIELDS
      .map((field) => `${field}:${String(normalizeMarketStateValue(source[field]))}`)
      .join('|');
  }

  function hasQuoteMarketStateChanged(previousState, nextState) {
    return buildQuoteMarketStateSignature(previousState) !== buildQuoteMarketStateSignature(nextState);
  }

  function sanitizeQuoteMarketState(state) {
    const source = state && typeof state === 'object' ? state : {};
    const result = {};
    for (const [key, value] of Object.entries(source)) {
      if (!NON_MARKET_QUOTE_STATE_FIELDS.has(key)) {
        result[key] = value;
      }
    }
    return result;
  }

  function buildDefaultQuoteUiState() {
    return {
      hasUnreadAlert: false,
      trendTimer: null
    };
  }

  function normalizeQuoteStateKey(quoteId) {
    const numericQuoteId = Number(quoteId);
    return Number.isFinite(numericQuoteId) ? numericQuoteId : quoteId;
  }

  function getQuoteUiState(stateMap, quoteId) {
    const map = stateMap instanceof Map ? stateMap : new Map();
    return map.get(normalizeQuoteStateKey(quoteId)) || buildDefaultQuoteUiState();
  }

  function mergeQuoteUiState(currentState, nextState) {
    return {
      ...buildDefaultQuoteUiState(),
      ...(currentState && typeof currentState === 'object' ? currentState : {}),
      ...(nextState && typeof nextState === 'object' ? nextState : {})
    };
  }

  function buildQuoteAlertUiUpdate(currentState, hasTriggered) {
    const nextState = mergeQuoteUiState(currentState, {
      hasUnreadAlert: hasTriggered ? true : currentState && currentState.hasUnreadAlert === true
    });
    return {
      nextState,
      highlighted: hasTriggered === true,
      highlightPast: hasTriggered !== true && nextState.hasUnreadAlert === true
    };
  }

  function hasActivePathAlertSound(runtimeState) {
    if (!(runtimeState instanceof Map)) return false;
    for (const runtime of runtimeState.values()) {
      if (runtime && runtime.isSoundActive) return true;
    }
    return false;
  }

  function setQuoteUiState(stateMap, quoteId, nextState) {
    const map = stateMap instanceof Map ? stateMap : new Map();
    const key = normalizeQuoteStateKey(quoteId);
    const merged = mergeQuoteUiState(getQuoteUiState(map, key), nextState);
    map.set(key, merged);
    return merged;
  }

  function clearQuoteTrendTimer(stateMap, quoteId, clearTimeoutImpl) {
    const map = stateMap instanceof Map ? stateMap : new Map();
    const key = normalizeQuoteStateKey(quoteId);
    const state = map.get(key);
    if (!state || !state.trendTimer) return false;
    const clearTimer = typeof clearTimeoutImpl === 'function'
      ? clearTimeoutImpl
      : (typeof clearTimeout === 'function' ? clearTimeout : null);
    if (clearTimer) {
      clearTimer(state.trendTimer);
    }
    map.set(key, { ...state, trendTimer: null });
    return true;
  }

  function resetQuoteUiRuntimeState(stateMap, quoteId, clearTimeoutImpl) {
    const map = stateMap instanceof Map ? stateMap : new Map();
    clearQuoteTrendTimer(map, quoteId, clearTimeoutImpl);
    map.set(normalizeQuoteStateKey(quoteId), buildDefaultQuoteUiState());
    return buildDefaultQuoteUiState();
  }

  function deleteQuoteUiRuntimeState(stateMap, quoteId, clearTimeoutImpl) {
    const map = stateMap instanceof Map ? stateMap : new Map();
    clearQuoteTrendTimer(map, quoteId, clearTimeoutImpl);
    return map.delete(normalizeQuoteStateKey(quoteId));
  }

  function getQuoteResultSymbols(quoteResult) {
    return quoteResult && quoteResult.symbols && typeof quoteResult.symbols === 'object'
      ? quoteResult.symbols
      : {};
  }

  function buildQuoteResultMarketState(previousState, quoteResult, options = {}) {
    const baseState = previousState && typeof previousState === 'object'
      ? { ...previousState }
      : {};
    const symbols = getQuoteResultSymbols(quoteResult);

    if (options.isInverseFetch) {
      return {
        ...baseState,
        inverseRawPrice: quoteResult && quoteResult.rawPrice,
        inverseTotalAmountOut: quoteResult && quoteResult.finalAmountOut,
        inverseFromSymbol: symbols.from || '',
        inverseToSymbol: symbols.to || ''
      };
    }

    return {
      ...baseState,
      fromSymbol: symbols.from || '',
      toSymbol: symbols.to || '',
      lastResultText: quoteResult && quoteResult.resultText || '',
      lastRawPrice: quoteResult && quoteResult.rawPrice,
      lastTotalAmountOut: quoteResult && quoteResult.finalAmountOut,
      cexOrderbook: quoteResult && quoteResult.cexOrderbook || null,
      usedSource: quoteResult && quoteResult.usedSource || '',
      usedSourceReal: options.successSource || null
    };
  }

  function buildSwappedQuoteMarketState(previousState) {
    const source = previousState && typeof previousState === 'object' ? previousState : {};
    const nextState = {
      ...source,
      lastRawPrice: null,
      lastTotalAmountOut: null,
      inverseRawPrice: null,
      inverseTotalAmountOut: null
    };

    if (nextState.fromSymbol && nextState.toSymbol) {
      const temp = nextState.fromSymbol;
      nextState.fromSymbol = nextState.toSymbol;
      nextState.toSymbol = temp;
    }

    return nextState;
  }

  function isPanelVisible(panel, getComputedStyleImpl) {
    if (!panel) return false;
    const readStyle = typeof getComputedStyleImpl === 'function'
      ? getComputedStyleImpl
      : (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function'
        ? window.getComputedStyle.bind(window)
        : null);

    if (!readStyle) return true;

    try {
      const style = readStyle(panel);
      return !style || style.display !== 'none';
    } catch {
      return true;
    }
  }

  function getActivePathAlertEvaluationAlerts(alertConfig) {
    const alerts = Array.isArray(alertConfig && alertConfig.alerts)
      ? alertConfig.alerts
      : [];
    return alerts.filter((alert) => (
      alert
        && alert.id
        && alert.enabled !== false
        && alert.target
        && alert.target.type !== 'quote'
    ));
  }

  function hasActivePathAlertEvaluationTarget(alertConfig) {
    return getActivePathAlertEvaluationAlerts(alertConfig).length > 0;
  }

  function findDashboardQuoteMatchById(dashboardState, quoteId) {
    const numericQuoteId = Number(quoteId);
    if (!Number.isFinite(numericQuoteId)) return null;
    const categories = Array.isArray(dashboardState) ? dashboardState : [];
    for (const category of categories) {
      const quotes = Array.isArray(category && category.quotes) ? category.quotes : [];
      const quote = quotes.find((item) => Number(item && item.id) === numericQuoteId);
      if (quote) return { quote, category };
    }
    return null;
  }

  function findDashboardQuoteById(dashboardState, quoteId) {
    const match = findDashboardQuoteMatchById(dashboardState, quoteId);
    return match ? match.quote : null;
  }

  function buildArbRuleSnapshotCacheKey(dashboardState, quoteMarketStateRevision) {
    const revision = Number.isFinite(Number(quoteMarketStateRevision)) ? Number(quoteMarketStateRevision) : 0;
    const dashboard = Array.isArray(dashboardState) ? dashboardState : [];
    const categorySignature = dashboard
      .map((category) => {
        const quotes = Array.isArray(category && category.quotes)
          ? category.quotes
          : [];
        const quoteIds = quotes
          .filter((quote) => quote && quote.paused !== true)
          .map((quote) => `${quote.id}:${quote.chain}:${quote.toChain || ''}:${quote.showInverse ? 1 : 0}`)
          .join(',');
        return `${category && category.name || ''}:${quoteIds}`;
      })
      .join('|');
    return `${revision}|${categorySignature}`;
  }

  function buildQuotesByCategoryName(dashboardState, isQuoteActive) {
    const result = new Map();
    const dashboard = Array.isArray(dashboardState) ? dashboardState : [];
    const isActive = typeof isQuoteActive === 'function' ? isQuoteActive : () => true;
    for (const category of dashboard) {
      if (!category || !category.name) continue;
      const quotes = Array.isArray(category.quotes) ? category.quotes : [];
      result.set(category.name, quotes.filter(isActive));
    }
    return result;
  }

  function buildQuoteMetaById(dashboardState) {
    const result = new Map();
    const dashboard = Array.isArray(dashboardState) ? dashboardState : [];
    for (const category of dashboard) {
      const quotes = Array.isArray(category && category.quotes) ? category.quotes : [];
      for (const quote of quotes) {
        if (!quote || quote.id === undefined || quote.id === null) continue;
        result.set(quote.id, { categoryName: category && category.name });
      }
    }
    return result;
  }

  function getNextFutureExpiryMs(entries, nowMs) {
    const items = Array.isArray(entries) ? entries : [];
    let nextExpiry = Infinity;
    for (const entry of items) {
      const expiresAt = Number(entry && entry.expiresAt);
      if (Number.isFinite(expiresAt) && expiresAt > nowMs && expiresAt < nextExpiry) {
        nextExpiry = expiresAt;
      }
    }
    return Number.isFinite(nextExpiry) ? nextExpiry : null;
  }

  function resolveMutedStateRefreshDelay(options = {}) {
    const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
    const visibleRefreshMs = Number.isFinite(Number(options.visibleRefreshMs)) && Number(options.visibleRefreshMs) > 0
      ? Number(options.visibleRefreshMs)
      : 1000;
    const hiddenMaxRefreshMs = Number.isFinite(Number(options.hiddenMaxRefreshMs)) && Number(options.hiddenMaxRefreshMs) > 0
      ? Number(options.hiddenMaxRefreshMs)
      : 60 * 1000;
    const hiddenMinRefreshMs = Number.isFinite(Number(options.hiddenMinRefreshMs)) && Number(options.hiddenMinRefreshMs) > 0
      ? Number(options.hiddenMinRefreshMs)
      : 1000;
    const entries = []
      .concat(Array.isArray(options.mutedPathTargets) ? options.mutedPathTargets : [])
      .concat(Array.isArray(options.mutedPathLegs) ? options.mutedPathLegs : []);

    if (!entries.length) return null;
    if (options.visible === true) return visibleRefreshMs;

    const nextExpiry = getNextFutureExpiryMs(entries, nowMs);
    if (nextExpiry === null) return hiddenMinRefreshMs;
    const delayUntilExpiry = Math.max(hiddenMinRefreshMs, nextExpiry - nowMs + 50);
    return Math.min(delayUntilExpiry, hiddenMaxRefreshMs);
  }

  function createInputDebounceRuntime(options = {}) {
    const timers = new Map();
    const setTimer = typeof options.setTimeout === 'function'
      ? options.setTimeout
      : (typeof setTimeout === 'function' ? setTimeout : null);
    const clearTimer = typeof options.clearTimeout === 'function'
      ? options.clearTimeout
      : (typeof clearTimeout === 'function' ? clearTimeout : null);
    const defaultDelayMs = Number.isFinite(Number(options.delayMs)) && Number(options.delayMs) >= 0
      ? Number(options.delayMs)
      : 0;

    function clear(key) {
      if (!timers.has(key)) return false;
      const timer = timers.get(key);
      if (clearTimer) {
        clearTimer(timer);
      }
      timers.delete(key);
      return true;
    }

    function schedule(key, callback, delayMs = defaultDelayMs) {
      clear(key);
      if (typeof callback !== 'function' || !setTimer) return null;
      const safeDelayMs = Number.isFinite(Number(delayMs)) && Number(delayMs) >= 0
        ? Number(delayMs)
        : defaultDelayMs;
      const timer = setTimer(() => {
        timers.delete(key);
        callback();
      }, safeDelayMs);
      timers.set(key, timer);
      return timer;
    }

    function clearAll() {
      for (const key of Array.from(timers.keys())) {
        clear(key);
      }
    }

    return {
      clear,
      clearAll,
      getTimers: () => timers,
      has: (key) => timers.has(key),
      schedule
    };
  }

  function buildDataTerminalRecordsCacheKey(dashboardState, quoteMarketStateRevision) {
    const revision = Number.isFinite(Number(quoteMarketStateRevision)) ? Number(quoteMarketStateRevision) : 0;
    const dashboard = Array.isArray(dashboardState) ? dashboardState : [];
    const topology = dashboard.map((category) => {
      const quotes = Array.isArray(category && category.quotes) ? category.quotes : [];
      const quoteSignature = quotes.map((quote) => {
        if (!quote || typeof quote !== 'object') return '';
        return [
          quote.id,
          quote.chain,
          quote.toChain || '',
          quote.fromToken || '',
          quote.toToken || '',
          quote.symbol || '',
          quote.amount ?? '',
          quote.showInverse === true ? 1 : 0,
          quote.paused === true ? 1 : 0
        ].join(':');
      }).join(',');
      return `${category && (category.id || category.name) || ''}:${quoteSignature}`;
    }).join('|');

    return `${revision}|${topology}`;
  }

  return {
    buildArbRuleSnapshotCacheKey,
    buildDataTerminalRecordsCacheKey,
    buildDefaultQuoteUiState,
    buildQuoteAlertUiUpdate,
    buildQuoteMetaById,
    buildQuoteResultMarketState,
    buildQuotesByCategoryName,
    buildSwappedQuoteMarketState,
    clearQuoteTrendTimer,
    createInputDebounceRuntime,
    deleteQuoteUiRuntimeState,
    findDashboardQuoteById,
    findDashboardQuoteMatchById,
    getActivePathAlertEvaluationAlerts,
    getQuoteUiState,
    hasActivePathAlertSound,
    hasQuoteMarketStateChanged,
    resetQuoteUiRuntimeState,
    sanitizeQuoteMarketState,
    setQuoteUiState,
    hasActivePathAlertEvaluationTarget,
    isPanelVisible,
    resolveMutedStateRefreshDelay
  };
});
