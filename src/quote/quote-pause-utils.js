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
      lastTotalAmountOut: null,
      lastResultText: '',
      inverseRawPrice: null,
      inverseTotalAmountOut: null,
      inverseFromSymbol: '',
      inverseToSymbol: '',
      usedSource: '',
      usedSourceReal: '',
      cexOrderbook: null
    };
  }

  function buildQuotePauseButtonState(quote) {
    const paused = isQuotePaused(quote);
    return {
      title: paused ? '恢复' : '暂停',
      ariaLabel: paused ? '恢复' : '暂停',
      ariaPressed: paused ? 'true' : 'false',
      icon: paused ? '▶️' : '⏸️'
    };
  }

  function buildCategoryPauseButtonState(quotes) {
    const action = getCategoryPauseAction(quotes);
    const allPaused = action === 'resume';
    return {
      action,
      title: allPaused ? '恢复分区' : '暂停分区',
      ariaLabel: allPaused ? '恢复分区' : '暂停分区',
      ariaPressed: allPaused ? 'true' : 'false',
      icon: allPaused ? '▶️' : '⏸️'
    };
  }

  return {
    isQuotePaused,
    getActiveQuotes,
    getCategoryPauseAction,
    buildPausedQuoteState,
    buildQuotePauseButtonState,
    buildCategoryPauseButtonState
  };
});
