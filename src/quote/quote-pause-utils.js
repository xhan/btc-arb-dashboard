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

  function applyPauseButtonDomState(buttonEl, state) {
    if (!buttonEl || !state) return false;
    buttonEl.title = state.title;
    if (typeof buttonEl.setAttribute === 'function') {
      buttonEl.setAttribute('aria-label', state.ariaLabel);
      buttonEl.setAttribute('aria-pressed', state.ariaPressed);
    }
    buttonEl.innerHTML = state.icon;
    return true;
  }

  function applyQuotePauseButtonState(buttonEl, quote) {
    return applyPauseButtonDomState(buttonEl, buildQuotePauseButtonState(quote));
  }

  function applyCategoryPauseButtonState(buttonEl, quotes) {
    return applyPauseButtonDomState(buttonEl, buildCategoryPauseButtonState(quotes));
  }

  return {
    isQuotePaused,
    getActiveQuotes,
    getCategoryPauseAction,
    applyCategoryPauseButtonState,
    applyQuotePauseButtonState,
    buildPausedQuoteState,
    buildQuotePauseButtonState,
    buildCategoryPauseButtonState
  };
});
