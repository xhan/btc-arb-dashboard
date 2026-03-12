(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.QuotePauseUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.QuotePauseUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isQuotePaused(quote) {
    return !!quote && quote.paused === true;
  }

  function getActiveQuotes(quotes) {
    return Array.isArray(quotes) ? quotes.filter((quote) => !isQuotePaused(quote)) : [];
  }

  function getCategoryPauseAction(quotes) {
    const items = Array.isArray(quotes) ? quotes : [];
    if (items.length > 0 && getActiveQuotes(items).length === 0) {
      return 'resume';
    }
    return 'pause';
  }

  function buildPausedQuoteState(previousState) {
    const state = previousState && typeof previousState === 'object' ? previousState : {};
    return {
      fromSymbol: state.fromSymbol || '',
      toSymbol: state.toSymbol || '',
      lastRawPrice: null,
      lastResultText: '',
      inverseRawPrice: null,
      inverseFromSymbol: '',
      inverseToSymbol: '',
      usedSource: '',
      usedSourceReal: '',
      cexOrderbook: null,
      hasUnreadAlert: false,
      logShown: false,
      isSoundActive: false
    };
  }

  return {
    isQuotePaused,
    getActiveQuotes,
    getCategoryPauseAction,
    buildPausedQuoteState
  };
});
