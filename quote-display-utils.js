(function (root, factory) {
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('./chain-defaults')
    : root.ChainDefaults;
  const api = factory(chainDefaults);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.QuoteDisplayUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.QuoteDisplayUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (chainDefaults) {
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
    if (chainDefaults && typeof chainDefaults.isCexOrderbookChain === 'function') {
      return chainDefaults.isCexOrderbookChain(chain);
    }
    const normalized = String(chain || '').trim().toLowerCase();
    return normalized === 'bybit' || normalized === 'binance';
  }

  function formatQuoteDisplayNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(6) : null;
  }

  function formatCexBookValue(value, maxDecimals = 10) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
    const abs = Math.abs(value);
    let decimals = maxDecimals;
    if (abs >= 1000) decimals = Math.min(decimals, 2);
    else if (abs >= 1) decimals = Math.min(decimals, 6);
    else if (abs >= 0.01) decimals = Math.min(decimals, 8);
    return Number(value.toFixed(decimals)).toString();
  }

  function extractPriceFromText(text) {
    if (!text) return null;
    const normalizedText = String(text);
    const delimiterMatch = normalizedText.match(/(?:≈|=|:)\s*([-+]?\d*\.?\d+(?:e[+-]?\d+)?)/i);
    if (delimiterMatch) return Number(delimiterMatch[1]);
    const numberMatch = normalizedText.match(/[-+]?\d*\.?\d+(?:e[+-]?\d+)?/i);
    return numberMatch ? Number(numberMatch[0]) : null;
  }

  function buildCexOrderbookSummary(symbol, orderbook) {
    if (!orderbook) return `${symbol}: 等待盘口...`;
    const ask = `ASK ${formatCexBookValue(orderbook.bestAskPrice)} × ${formatCexBookValue(orderbook.bestAskSize, 6)}`;
    const bid = `BID ${formatCexBookValue(orderbook.bestBidPrice)} × ${formatCexBookValue(orderbook.bestBidSize, 6)}`;
    return `${ask}\n${bid}`;
  }

  function buildCexOrderbookTooltipHtml(orderbook) {
    if (!orderbook) {
      return '<div class="cex-orderbook-tooltip-empty">盘口等待数据...</div>';
    }

    const feeRate = Number(orderbook.feeRate);
    const feeNotice = Number.isFinite(feeRate)
      ? `<div class="cex-orderbook-fee-note">已计入手续费 ${(feeRate * 100).toFixed(2)}%</div>`
      : '';

    function renderSide(title, levels) {
      if (!Array.isArray(levels) || levels.length === 0) {
        return `
                    <div class="cex-orderbook-side">
                        <div class="cex-orderbook-title">${escapeHtml(title)}</div>
                        <div class="cex-orderbook-level empty">暂无数据</div>
                    </div>
                `;
      }

      const rows = levels.map((level, index) => `
                <div class="cex-orderbook-level">
                    <span>${index + 1}. ${formatCexBookValue(level.price)}</span>
                    <span>${formatCexBookValue(level.size, 6)}</span>
                </div>
            `).join('');

      return `
                <div class="cex-orderbook-side">
                    <div class="cex-orderbook-title">${escapeHtml(title)}</div>
                    ${rows}
                </div>
            `;
    }

    return `
            <div class="cex-orderbook-tooltip">
                ${feeNotice}
                ${renderSide('ASK', orderbook.asksTop5)}
                ${renderSide('BID', orderbook.bidsTop5)}
            </div>
        `;
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
    buildCexOrderbookSummary,
    buildCexOrderbookTooltipHtml,
    buildInverseQuoteDisplayTextForState,
    buildQuotePairLabelHtml,
    buildQuoteDisplayText,
    buildQuoteDisplayTextForState,
    buildQuoteRequestChannelTagHtml,
    extractPriceFromText,
    formatCexBookValue,
    getCexPairLabel,
    getQuotePairLabel,
    shouldShowKyberDirectPoolsBadge,
    normalizeQuoteDisplayMode
  };
});
