(function (root, factory) {
  const quotePauseUtils = typeof module !== 'undefined' && module.exports
    ? require('../quote/quote-pause-utils')
    : root.QuotePauseUtils;
  const api = factory(quotePauseUtils);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.PriceSnapshotPayloadUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.PriceSnapshotPayloadUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (quotePauseUtils) {
  const isQuotePaused = quotePauseUtils && typeof quotePauseUtils.isQuotePaused === 'function'
    ? quotePauseUtils.isQuotePaused
    : (quote) => !!quote && quote.paused === true;

  function buildPriceSnapshotPayload(options = {}) {
    const dashboardState = Array.isArray(options.dashboardState) ? options.dashboardState : [];
    const quoteStateById = options.quoteStateById instanceof Map ? options.quoteStateById : new Map();
    const quotes = [];

    for (const category of dashboardState) {
      const categoryId = category?.id ?? null;
      const categoryName = category?.name || '';
      for (const quote of (category?.quotes || [])) {
        if (isQuotePaused(quote)) continue;

        const state = quoteStateById.get(quote.id) || {};
        const fromSymbol = state.fromSymbol || '';
        const toSymbol = state.toSymbol || '';
        const inverseFromSymbol = state.inverseFromSymbol || '';
        const inverseToSymbol = state.inverseToSymbol || '';
        const size = quote.amount || 1;
        const pair = fromSymbol && toSymbol
          ? `${fromSymbol}/${toSymbol}`
          : (quote.symbol || '');
        const inversePair = inverseFromSymbol && inverseToSymbol
          ? `${inverseFromSymbol}/${inverseToSymbol}`
          : '';

        quotes.push({
          quoteId: quote.id,
          categoryId,
          categoryName,
          chain: quote.chain,
          pair,
          size,
          preferredSource: quote.preferredSource || 'Kyber',
          usedSource: state.usedSource || '',
          fromToken: quote.fromToken || '',
          toToken: quote.toToken || '',
          fromSymbol,
          toSymbol,
          price: typeof state.lastRawPrice === 'number' ? state.lastRawPrice : null,
          inversePrice: typeof state.inverseRawPrice === 'number' ? state.inverseRawPrice : null,
          resultText: state.lastResultText || '',
          inversePair,
          inverseResultText: inversePair && typeof state.inverseRawPrice === 'number' && size
            ? `${size} ${inverseFromSymbol} ≈ ${(size * state.inverseRawPrice).toFixed(6)} ${inverseToSymbol}`
            : ''
        });
      }
    }

    return {
      clientCapturedAt: options.clientCapturedAt || new Date().toISOString(),
      quotes
    };
  }

  function createPriceSnapshotTimerRuntime(options = {}) {
    const setTimer = typeof options.setInterval === 'function'
      ? options.setInterval
      : (typeof setInterval === 'function' ? setInterval : null);
    const clearTimer = typeof options.clearInterval === 'function'
      ? options.clearInterval
      : (typeof clearInterval === 'function' ? clearInterval : null);
    let timer = null;

    function clear() {
      if (timer === null) return false;
      if (clearTimer) {
        clearTimer(timer);
      }
      timer = null;
      return true;
    }

    function start(config = {}, callback) {
      clear();
      if (!config || config.enabled !== true || typeof callback !== 'function' || !setTimer) return false;
      const intervalSec = Number(config.intervalSec);
      if (!Number.isFinite(intervalSec) || intervalSec <= 0) return false;
      timer = setTimer(callback, intervalSec * 1000);
      return true;
    }

    return {
      clear,
      getTimer: () => timer,
      start
    };
  }

  function createPriceSnapshotSaveRuntime(options = {}) {
    const getConfig = typeof options.getConfig === 'function'
      ? options.getConfig
      : () => options.config || {};
    const buildPayload = typeof options.buildPayload === 'function'
      ? options.buildPayload
      : () => null;
    const savePayload = typeof options.savePayload === 'function'
      ? options.savePayload
      : async () => {};
    const logWarning = typeof options.logWarning === 'function'
      ? options.logWarning
      : () => {};

    async function saveIfNeeded() {
      const config = getConfig() || {};
      if (config.enabled !== true) {
        return { saved: false, reason: 'disabled' };
      }

      const payload = buildPayload();
      if (!payload || !Array.isArray(payload.quotes) || !payload.quotes.length) {
        return { saved: false, reason: 'empty' };
      }

      try {
        await savePayload(payload);
        return { saved: true, reason: 'saved', payload };
      } catch (error) {
        logWarning('保存价格快照失败:', error);
        return { saved: false, reason: 'error', error };
      }
    }

    return {
      saveIfNeeded
    };
  }

  return {
    buildPriceSnapshotPayload,
    createPriceSnapshotSaveRuntime,
    createPriceSnapshotTimerRuntime
  };
});
