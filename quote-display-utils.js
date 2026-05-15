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

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isCexOrderbookChain(chain) {
    const normalized = String(chain || '').trim().toLowerCase();
    return normalized === 'bybit' || normalized === 'binance';
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

  function getCexPairLabel(quote, state) {
    if (!isCexOrderbookChain(quote && quote.chain)) return '';
    if (state && state.fromSymbol && state.toSymbol) {
      return `${state.fromSymbol}/${state.toSymbol}`;
    }
    return String((quote && quote.symbol) || '').trim().toUpperCase();
  }

  function getQuotePairLabel(quote, state) {
    if (!quote) return '';
    if (state && state.fromSymbol && state.toSymbol) {
      return `${state.fromSymbol}/${state.toSymbol}`;
    }
    return getCexPairLabel(quote, state);
  }

  function shouldShowKyberDirectPoolsBadge(quote) {
    if (!quote || quote.kyberOnlyDirectPools !== true) return false;
    const preferredSource = String(quote.preferredSource || 'Kyber').trim();
    return preferredSource === 'Kyber' || preferredSource === 'Auto';
  }

  function buildQuotePairLabelHtml(quote, state) {
    const label = getQuotePairLabel(quote, state);
    if (!label) return '';
    const badgeHtml = shouldShowKyberDirectPoolsBadge(quote)
      ? '<span class="quote-direct-badge" title="Kyber 仅直连池"></span>'
      : '';
    return `${escapeHtml(label)}${badgeHtml}`;
  }

  return {
    QUOTE_DISPLAY_MODE_AMOUNT,
    QUOTE_DISPLAY_MODE_RATE,
    buildQuotePairLabelHtml,
    buildQuoteDisplayText,
    getCexPairLabel,
    getQuotePairLabel,
    shouldShowKyberDirectPoolsBadge,
    normalizeQuoteDisplayMode
  };
});
