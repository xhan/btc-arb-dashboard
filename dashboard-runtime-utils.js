(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.DashboardRuntimeUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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

  function buildDataTerminalRecordsCacheKey(dashboardState, quoteStateRevision) {
    const revision = Number.isFinite(Number(quoteStateRevision)) ? Number(quoteStateRevision) : 0;
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
    hasActivePathAlertEvaluationTarget,
    isPanelVisible
  };
});
