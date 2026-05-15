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

  function buildQuoteDisplayTextForState(quote, state, options = {}) {
    if (options.paused) return options.pausedText || '已暂停';

    const fallbackText = (state && state.lastResultText) || options.fallbackText || '...';
    if (isCexOrderbookChain(quote && quote.chain)) {
      return fallbackText;
    }

    return buildQuoteDisplayText({
      mode: options.mode,
      amount: quote && quote.amount ? quote.amount : 1,
      fromSymbol: state && state.fromSymbol,
      toSymbol: state && state.toSymbol,
      totalAmountOut: state && state.lastTotalAmountOut,
      rate: state && state.lastRawPrice,
      hideAmountPrefix: true,
      fallbackText
    });
  }

  function buildInverseQuoteDisplayTextForState(quote, state, options = {}) {
    return buildQuoteDisplayText({
      mode: options.mode,
      amount: quote && quote.amount ? quote.amount : 1,
      fromSymbol: state && state.inverseFromSymbol,
      toSymbol: state && state.inverseToSymbol,
      totalAmountOut: state && state.inverseTotalAmountOut,
      rate: state && state.inverseRawPrice,
      fallbackText: options.fallbackText || '反向报价排队中...'
    });
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

  function buildQuoteRequestChannelTagHtml(quote, channel) {
    if (!quote || !channel) return '';
    return `<span class="quote-channel-tag" id="quote-channel-tag-${escapeHtml(quote.id)}">${escapeHtml(channel.name)}</span>`;
  }

  return {
    QUOTE_DISPLAY_MODE_AMOUNT,
    QUOTE_DISPLAY_MODE_RATE,
    buildInverseQuoteDisplayTextForState,
    buildQuotePairLabelHtml,
    buildQuoteDisplayText,
    buildQuoteDisplayTextForState,
    buildQuoteRequestChannelTagHtml,
    getCexPairLabel,
    getQuotePairLabel,
    shouldShowKyberDirectPoolsBadge,
    normalizeQuoteDisplayMode
  };
});
