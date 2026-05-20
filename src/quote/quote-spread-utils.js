(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.QuoteSpreadUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.QuoteSpreadUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeQuoteStateMap(quoteStateById) {
    return quoteStateById instanceof Map ? quoteStateById : new Map();
  }

  function formatQuoteSpreadNumber(value) {
    if (value === null || value === undefined || value === '') return '--';
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(6) : '--';
  }

  function formatQuoteSpreadBp(value) {
    if (value === null || value === undefined || value === '') return '--';
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return '--';
    return `${numericValue >= 0 ? '+' : ''}${numericValue.toFixed(2)}bp`;
  }

  function buildPairLabel(state, quote) {
    const fromSymbol = String(state && state.fromSymbol || '').trim();
    const toSymbol = String(state && state.toSymbol || '').trim();
    if (fromSymbol && toSymbol) return `${fromSymbol}/${toSymbol}`;
    return `#${quote && quote.id != null ? quote.id : '--'}`;
  }

  function buildQuoteSpreadRows(dashboardState, quoteStateById, options = {}) {
    const dashboard = Array.isArray(dashboardState) ? dashboardState : [];
    const stateById = normalizeQuoteStateMap(quoteStateById);
    const limit = Number.isFinite(Number(options.limit)) && Number(options.limit) > 0
      ? Number(options.limit)
      : 20;
    const formatChainLabel = typeof options.formatChainLabel === 'function'
      ? options.formatChainLabel
      : (chain) => String(chain || '');
    const rows = [];

    dashboard.forEach((category) => {
      const quotes = Array.isArray(category && category.quotes) ? category.quotes : [];
      quotes.forEach((quote) => {
        const state = stateById.get(quote && quote.id) || {};
        const forwardRate = Number(state.lastRawPrice);
        const inverseRate = Number(state.inverseRawPrice);
        if (!Number.isFinite(forwardRate) || !Number.isFinite(inverseRate)) return;

        const product = forwardRate * inverseRate;
        if (!Number.isFinite(product)) return;

        rows.push({
          quoteId: quote && quote.id,
          categoryName: category && category.name || '',
          chain: quote && quote.chain || '',
          chainLabel: formatChainLabel(quote && quote.chain),
          pairLabel: buildPairLabel(state, quote),
          forwardRate,
          inverseRate,
          product,
          spreadBp: (product - 1) * 10000
        });
      });
    });

    return rows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const productDiff = right.row.product - left.row.product;
        if (productDiff !== 0) return productDiff;
        return left.index - right.index;
      })
      .slice(0, limit)
      .map(({ row }) => row);
  }

  function buildQuoteSpreadPanelHtml(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return '<div class="quote-spread-empty">暂无可计算的买/卖 spread</div>';
    }

    return `
      <div class="quote-spread-table">
        <div class="quote-spread-row quote-spread-head">
          <span>交易对</span>
          <span>链</span>
          <span>正向</span>
          <span>反向</span>
          <span>乘积</span>
          <span>Spread</span>
        </div>
        ${rows.map((row) => `
          <div class="quote-spread-row">
            <span class="quote-spread-pair">${escapeHtml(row.pairLabel)}</span>
            <span>${escapeHtml(row.chainLabel || row.chain)}</span>
            <span>${escapeHtml(formatQuoteSpreadNumber(row.forwardRate))}</span>
            <span>${escapeHtml(formatQuoteSpreadNumber(row.inverseRate))}</span>
            <span>${escapeHtml(formatQuoteSpreadNumber(row.product))}</span>
            <span class="quote-spread-bp">${escapeHtml(formatQuoteSpreadBp(row.spreadBp))}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  return {
    buildQuoteSpreadPanelHtml,
    buildQuoteSpreadRows,
    formatQuoteSpreadBp,
    formatQuoteSpreadNumber
  };
});
