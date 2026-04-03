(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.QuoteDisplayUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.QuoteDisplayUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const QUOTE_DISPLAY_MODE_RATE = 'rate';
  const QUOTE_DISPLAY_MODE_AMOUNT = 'amount';

  function normalizeQuoteDisplayMode(mode) {
    return mode === QUOTE_DISPLAY_MODE_AMOUNT
      ? QUOTE_DISPLAY_MODE_AMOUNT
      : QUOTE_DISPLAY_MODE_RATE;
  }

  function formatQuoteDisplayNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(6) : null;
  }

  function buildQuoteDisplayText(options = {}) {
    const fallbackText = options.fallbackText || '...';
    const fromSymbol = String(options.fromSymbol || '').trim();
    const toSymbol = String(options.toSymbol || '').trim();
    if (!fromSymbol || !toSymbol) return fallbackText;

    const mode = normalizeQuoteDisplayMode(options.mode);
    if (mode === QUOTE_DISPLAY_MODE_AMOUNT) {
      const amountText = String(options.amount ?? '').trim();
      const totalAmountOutText = formatQuoteDisplayNumber(options.totalAmountOut);
      if (!amountText || !totalAmountOutText) return fallbackText;
      if (options.hideAmountPrefix) {
        return `${fromSymbol} ≈ ${totalAmountOutText} ${toSymbol}`;
      }
      return `${amountText} ${fromSymbol} ≈ ${totalAmountOutText} ${toSymbol}`;
    }

    const rateText = formatQuoteDisplayNumber(options.rate);
    if (!rateText) return fallbackText;
    return `1 ${fromSymbol} ≈ ${rateText} ${toSymbol}`;
  }

  return {
    QUOTE_DISPLAY_MODE_AMOUNT,
    QUOTE_DISPLAY_MODE_RATE,
    buildQuoteDisplayText,
    normalizeQuoteDisplayMode
  };
});
