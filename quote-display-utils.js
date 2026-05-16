(function (root, factory) {
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('./chain-defaults')
    : root.ChainDefaults;
  const tradingPairUtils = typeof module !== 'undefined' && module.exports
    ? require('./shared/trading-pair-utils')
    : root.TradingPairUtils;
  const api = factory(chainDefaults, tradingPairUtils);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.QuoteDisplayUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.QuoteDisplayUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (chainDefaults, tradingPairUtils) {
  const QUOTE_DISPLAY_MODE_RATE = 'rate';
  const QUOTE_DISPLAY_MODE_AMOUNT = 'amount';

  function normalizeQuoteDisplayMode(mode) {
    return mode === QUOTE_DISPLAY_MODE_AMOUNT
      ? QUOTE_DISPLAY_MODE_AMOUNT
      : QUOTE_DISPLAY_MODE_RATE;
  }

  function buildQuoteDisplayToggleState(mode) {
    const displayMode = normalizeQuoteDisplayMode(mode);
    const isRateMode = displayMode === QUOTE_DISPLAY_MODE_RATE;
    return {
      text: isRateMode ? '价格: 汇率' : '价格: 数量',
      title: isRateMode
        ? '切换看板报价显示为数量 (P)'
        : '切换看板报价显示为汇率 (P)',
      mode: displayMode
    };
  }

  function getNextQuoteDisplayMode(mode) {
    return normalizeQuoteDisplayMode(mode) === QUOTE_DISPLAY_MODE_RATE
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

  function parseCexTradingPairSymbol(symbol) {
    if (tradingPairUtils && typeof tradingPairUtils.parseCexTradingPairSymbol === 'function') {
      return tradingPairUtils.parseCexTradingPairSymbol(symbol);
    }
    return null;
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

  function buildQuoteAlertDisplayLabel(quote, state = {}, direction = 'forward') {
    if (!quote) return '--';
    const isInverse = direction === 'inverse';
    if (isCexOrderbookChain(quote.chain)) {
      const parsed = parseCexTradingPairSymbol(quote.symbol);
      if (parsed) {
        const fromSymbol = isInverse ? parsed.toSymbol : parsed.fromSymbol;
        const toSymbol = isInverse ? parsed.fromSymbol : parsed.toSymbol;
        return `${fromSymbol}/${toSymbol}`;
      }
      return String(quote.symbol || '').trim() || '--';
    }
    if (state && state.fromSymbol && state.toSymbol) {
      return isInverse
        ? `${state.toSymbol}/${state.fromSymbol}`
        : `${state.fromSymbol}/${state.toSymbol}`;
    }
    const fromToken = isInverse ? quote.toToken : quote.fromToken;
    const toToken = isInverse ? quote.fromToken : quote.toToken;
    return `${String(fromToken || '').slice(0, 4)}.../${String(toToken || '').slice(0, 4)}...`;
  }

  function buildQuoteRequestChannelTagHtml(quote, channel) {
    if (!quote || !channel) return '';
    return `<span class="quote-channel-tag" id="quote-channel-tag-${escapeHtml(quote.id)}">${escapeHtml(channel.name)}</span>`;
  }

  function buildQuoteHoverTooltipState(quote, state, options = {}) {
    if (!quote) return null;
    if (isCexOrderbookChain(quote.chain)) {
      return {
        html: buildCexOrderbookTooltipHtml(state ? state.cexOrderbook : null),
        className: 'cex-orderbook-tooltip-host'
      };
    }

    const sourceInfo = state ? (state.usedSource || '未知') : '等待数据...';
    const lines = [`<div>来源：<strong>${sourceInfo}</strong></div>`];
    const isEvm = typeof options.isEvmChain === 'function'
      ? options.isEvmChain(quote.chain)
      : options.isEvmChain === true;
    if (isEvm) {
      lines.push(`<div>偏好：${quote.preferredSource || 'Kyber'}</div>`);
    }
    return {
      html: lines.join(''),
      className: ''
    };
  }

  function buildQuoteTrendArrowState(currentPrice, oldPrice, currentSource, oldSource) {
    if (currentSource && oldSource && currentSource !== oldSource) {
      return { action: 'hide' };
    }
    if (typeof oldPrice !== 'number' || currentPrice === oldPrice) return null;

    const changeRatio = Math.abs((currentPrice - oldPrice) / oldPrice);
    if (changeRatio < 0.0001) return null;

    if (currentPrice > oldPrice) {
      return {
        action: 'show',
        html: '&#8593;&#8593;&#8593;',
        className: 'trend-arrow trend-up visible'
      };
    }
    return {
      action: 'show',
      html: '&#8595;&#8595;&#8595;',
      className: 'trend-arrow trend-down visible'
    };
  }

  function createQuoteHoverRuntime(options = {}) {
    const setTimer = typeof options.setTimeout === 'function'
      ? options.setTimeout
      : (typeof setTimeout === 'function' ? setTimeout : null);
    const clearTimerImpl = typeof options.clearTimeout === 'function'
      ? options.clearTimeout
      : (typeof clearTimeout === 'function' ? clearTimeout : null);
    const defaultDelayMs = Number.isFinite(Number(options.delayMs)) && Number(options.delayMs) >= 0
      ? Number(options.delayMs)
      : 100;
    let timer = null;
    let currentQuoteId = null;

    function clearTimer() {
      if (timer === null) return false;
      if (clearTimerImpl) {
        clearTimerImpl(timer);
      }
      timer = null;
      return true;
    }

    function schedule(quoteId, onShow, delayMs = defaultDelayMs) {
      clearTimer();
      currentQuoteId = quoteId;
      const safeDelayMs = Number.isFinite(Number(delayMs)) && Number(delayMs) >= 0
        ? Number(delayMs)
        : defaultDelayMs;
      function showIfCurrent() {
        if (currentQuoteId !== quoteId) return false;
        if (typeof onShow === 'function') {
          onShow(quoteId);
        }
        return true;
      }
      if (!setTimer) {
        return showIfCurrent();
      }
      let scheduledTimer = null;
      scheduledTimer = setTimer(() => {
        if (timer !== scheduledTimer) return false;
        timer = null;
        return showIfCurrent();
      }, safeDelayMs);
      timer = scheduledTimer;
      return true;
    }

    function hide(quoteId, onHide) {
      clearTimer();
      if (currentQuoteId !== quoteId) return false;
      currentQuoteId = null;
      if (typeof onHide === 'function') {
        onHide(quoteId);
      }
      return true;
    }

    function reset() {
      const cleared = clearTimer();
      const hadCurrent = currentQuoteId !== null;
      currentQuoteId = null;
      return cleared || hadCurrent;
    }

    return {
      getCurrentQuoteId: () => currentQuoteId,
      hasTimer: () => timer !== null,
      hide,
      reset,
      schedule
    };
  }

  return {
    buildCexOrderbookSummary,
    buildCexOrderbookTooltipHtml,
    createQuoteHoverRuntime,
    buildInverseQuoteDisplayTextForState,
    buildQuoteAlertDisplayLabel,
    buildQuotePairLabelHtml,
    buildQuoteDisplayTextForState,
    buildQuoteDisplayToggleState,
    buildQuoteHoverTooltipState,
    buildQuoteRequestChannelTagHtml,
    buildQuoteTrendArrowState,
    extractPriceFromText,
    formatCexBookValue,
    getNextQuoteDisplayMode
  };
});
