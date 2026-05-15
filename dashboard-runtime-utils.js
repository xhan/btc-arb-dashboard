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

  function hasActivePathAlertEvaluationTarget(alertConfig) {
    const alerts = Array.isArray(alertConfig && alertConfig.alerts)
      ? alertConfig.alerts
      : [];
    return alerts.some((alert) => (
      alert
        && alert.enabled !== false
        && alert.target
        && alert.target.type !== 'quote'
    ));
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
    buildDataTerminalRecordsCacheKey,
    buildQuoteMarketStateSignature,
    hasQuoteMarketStateChanged,
    hasActivePathAlertEvaluationTarget,
    isPanelVisible
  };
});
