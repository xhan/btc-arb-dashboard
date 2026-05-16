(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.QuoteStateRuntimeUtils = api;
    if (root.window) {
      root.window.QuoteStateRuntimeUtils = api;
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeQuoteStateKey(quoteId) {
    const numericQuoteId = Number(quoteId);
    return Number.isFinite(numericQuoteId) ? numericQuoteId : quoteId;
  }

  function getDashboardRuntimeUtils(options) {
    const utils = options && options.dashboardRuntimeUtils;
    if (!utils) {
      throw new Error('dashboardRuntimeUtils is required');
    }
    return utils;
  }

  function createQuoteStateRuntime(options = {}) {
    const dashboardRuntimeUtils = getDashboardRuntimeUtils(options);
    const quoteMarketState = new Map();
    const quoteUiState = new Map();
    let marketRevision = 0;

    function getMarketState(quoteId, fallback = {}) {
      const key = normalizeQuoteStateKey(quoteId);
      return quoteMarketState.get(key) || fallback;
    }

    function setMarketState(quoteId, nextState) {
      const key = normalizeQuoteStateKey(quoteId);
      const previousState = quoteMarketState.get(key) || null;
      const marketState = dashboardRuntimeUtils.sanitizeQuoteMarketState(nextState);
      const marketStateChanged = dashboardRuntimeUtils.hasQuoteMarketStateChanged(previousState, marketState);
      quoteMarketState.set(key, marketState);
      if (marketStateChanged) {
        marketRevision += 1;
      }
      return marketStateChanged;
    }

    function deleteMarketState(quoteId) {
      return quoteMarketState.delete(normalizeQuoteStateKey(quoteId));
    }

    function bumpMarketRevision() {
      marketRevision += 1;
      return marketRevision;
    }

    function getMarketRevision() {
      return marketRevision;
    }

    function getMarketStateMap() {
      return quoteMarketState;
    }

    function getUiState(quoteId) {
      return dashboardRuntimeUtils.getQuoteUiState(quoteUiState, quoteId);
    }

    function setUiState(quoteId, nextState) {
      return dashboardRuntimeUtils.setQuoteUiState(quoteUiState, quoteId, nextState);
    }

    function clearTrendTimer(quoteId, clearTimeoutImpl) {
      return dashboardRuntimeUtils.clearQuoteTrendTimer(quoteUiState, quoteId, clearTimeoutImpl);
    }

    function resetUiRuntimeState(quoteId, clearTimeoutImpl) {
      return dashboardRuntimeUtils.resetQuoteUiRuntimeState(quoteUiState, quoteId, clearTimeoutImpl);
    }

    function deleteUiRuntimeState(quoteId, clearTimeoutImpl) {
      return dashboardRuntimeUtils.deleteQuoteUiRuntimeState(quoteUiState, quoteId, clearTimeoutImpl);
    }

    function getUiStateMap() {
      return quoteUiState;
    }

    return {
      bumpMarketRevision,
      clearTrendTimer,
      deleteMarketState,
      deleteUiRuntimeState,
      getMarketRevision,
      getMarketState,
      getMarketStateMap,
      getUiState,
      getUiStateMap,
      resetUiRuntimeState,
      setMarketState,
      setUiState
    };
  }

  return {
    createQuoteStateRuntime
  };
});
