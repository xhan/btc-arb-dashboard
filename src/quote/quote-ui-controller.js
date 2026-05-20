(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.QuoteUiController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createQuoteUiController(deps = {}) {
    const logger = deps.logger || console;
    const documentImpl = deps.documentImpl;
    const quoteDisplayUtils = deps.quoteDisplayUtils;
    const domRenderUtils = deps.domRenderUtils;
    const quotePauseUtils = deps.quotePauseUtils;
    const quoteStateRuntime = deps.quoteStateRuntime;
    const copyUtils = deps.copyUtils;
    const dexLinkUtils = deps.dexLinkUtils;
    const copyToastRuntime = deps.copyToastRuntime;
    const quoteHoverRuntime = deps.quoteHoverRuntime || quoteDisplayUtils.createQuoteHoverRuntime({
      setTimeout: deps.setTimeout,
      clearTimeout: deps.clearTimeout,
      delayMs: Number.isFinite(Number(deps.hoverDelayMs)) ? Number(deps.hoverDelayMs) : 100
    });
    let quoteDisplayMode = deps.initialQuoteDisplayMode || 'rate';

    function getDashboardState() {
      return typeof deps.getDashboardState === 'function' ? deps.getDashboardState() : [];
    }

    function getQuoteMarketState(quoteId) {
      return typeof deps.getQuoteMarketState === 'function' ? deps.getQuoteMarketState(quoteId) : {};
    }

    function isQuotePaused(quote) {
      return typeof deps.isQuotePaused === 'function' ? deps.isQuotePaused(quote) : false;
    }

    function isEvmChain(chain) {
      return typeof deps.isEvmChain === 'function' ? deps.isEvmChain(chain) : false;
    }

    function isDashboardUiActive() {
      return typeof deps.isDashboardUiActive === 'function' ? deps.isDashboardUiActive() : true;
    }

    function markDashboardUiDirty() {
      if (typeof deps.markDashboardUiDirty === 'function') {
        deps.markDashboardUiDirty();
      }
      return false;
    }

    function runDashboardUiPatch(callback) {
      if (!isDashboardUiActive()) {
        return markDashboardUiDirty();
      }
      if (typeof callback !== 'function') return true;
      return callback();
    }

    function getQuoteDisplayMode() {
      return quoteDisplayMode;
    }

    function getQuoteDisplayText(quote, state) {
      return quoteDisplayUtils.buildQuoteDisplayTextForState(quote, state, {
        mode: quoteDisplayMode,
        paused: isQuotePaused(quote)
      });
    }

    function getInverseQuoteDisplayText(quote, state, fallbackText = '反向报价排队中...') {
      return quoteDisplayUtils.buildInverseQuoteDisplayTextForState(quote, state, {
        mode: quoteDisplayMode,
        fallbackText
      });
    }

    function updateQuotePairLabel(quote, state) {
      return runDashboardUiPatch(() => {
        const pairLabelEl = documentImpl.getElementById(`quote-pair-label-${quote.id}`);
        return domRenderUtils.applyQuotePairLabelDomState(
          pairLabelEl,
          quoteDisplayUtils.buildQuotePairLabelHtml(quote, state)
        );
      });
    }

    function rerenderQuoteDisplayTexts() {
      return runDashboardUiPatch(() => {
        for (const category of getDashboardState()) {
          const quotes = Array.isArray(category && category.quotes) ? category.quotes : [];
          for (const quote of quotes) {
            const state = getQuoteMarketState(quote.id) || {};
            const quoteTextEl = documentImpl.getElementById(`quote-text-${quote.id}`);
            const inverseEl = documentImpl.getElementById(`inverse-quote-${quote.id}`);
            const inverseText = inverseEl && Number.isFinite(Number(state.inverseRawPrice))
              ? getInverseQuoteDisplayText(quote, state, inverseEl.textContent || '...')
              : null;
            domRenderUtils.applyQuoteDisplayTextDomState({
              quoteTextEl,
              inverseEl
            }, {
              text: getQuoteDisplayText(quote, state),
              inverseText
            });
          }
        }
        return true;
      });
    }

    function applyQuoteDisplayToggleButtonState() {
      return quoteDisplayUtils.applyQuoteDisplayToggleButtonState(deps.toggleQuoteDisplayBtn, quoteDisplayMode);
    }

    function toggleQuoteDisplayMode() {
      quoteDisplayMode = quoteDisplayUtils.getNextQuoteDisplayMode(quoteDisplayMode);
      applyQuoteDisplayToggleButtonState();
      rerenderQuoteDisplayTexts();
    }

    function updatePauseButtonState(quote) {
      const pauseBtn = documentImpl.querySelector(`[data-toggle-pause-id="${quote.id}"]`);
      quotePauseUtils.applyQuotePauseButtonState(pauseBtn, quote);
    }

    function clearQuoteTrendArrow(quoteId) {
      const arrowEl = documentImpl.getElementById(`trend-arrow-${quoteId}`);
      domRenderUtils.resetTrendArrow(arrowEl);
      quoteStateRuntime.clearTrendTimer(quoteId, deps.clearTimeout);
    }

    function clearQuoteAlertUi(quoteId) {
      const itemEl = documentImpl.getElementById(`quote-item-${quoteId}`);
      domRenderUtils.clearQuoteHighlightUi(itemEl);
    }

    function removeInverseQuoteElement(quoteId) {
      const inverseEl = documentImpl.getElementById(`inverse-quote-${quoteId}`);
      domRenderUtils.removeQuoteInverseElement(inverseEl);
    }

    function applyPausedQuoteUiState(quote, state) {
      if (!isDashboardUiActive()) {
        return markDashboardUiDirty();
      }
      domRenderUtils.applyPausedQuoteDomState(
        domRenderUtils.getQuoteDomRefs(documentImpl, quote.id)
      );
      updateQuotePairLabel(quote, state);
      updatePauseButtonState(quote);
      removeInverseQuoteElement(quote.id);
      clearQuoteAlertUi(quote.id);
      clearQuoteTrendArrow(quote.id);
      return true;
    }

    function applyActiveQuoteUiState(quote, options = {}) {
      if (!isDashboardUiActive()) {
        return markDashboardUiDirty();
      }
      const state = getQuoteMarketState(quote.id) || {};
      domRenderUtils.applyActiveQuoteDomState(
        domRenderUtils.getQuoteDomRefs(documentImpl, quote.id),
        options
      );
      updateQuotePairLabel(quote, state);
      updatePauseButtonState(quote);
      clearQuoteAlertUi(quote.id);
      clearQuoteTrendArrow(quote.id);
      if (options.clearInverse) {
        removeInverseQuoteElement(quote.id);
      }
      return true;
    }

    async function copyTextToClipboard(text) {
      try {
        await copyUtils.copyTextToClipboard(text);
      } catch (error) {
        logger.warn('Clipboard write failed', error);
        throw error;
      }
    }

    async function copyDexLinkFromElement(targetEl) {
      return copyUtils.copyDexLinkFromElement(targetEl, {
        buildDexLink: (config) => dexLinkUtils.buildDexLink(config),
        copyText: (text) => copyTextToClipboard(text),
        showToast: (message) => showCopyToast(message)
      });
    }

    function copyPriceText(text) {
      return copyUtils.copyPriceFromText(text, {
        extractPrice: (value) => quoteDisplayUtils.extractPriceFromText(value),
        copyText: (value) => copyTextToClipboard(value),
        showToast: (message) => showCopyToast(message)
      });
    }

    function bindCopyHandler(targetEl, getText) {
      copyUtils.bindCopyPriceHandler(targetEl, {
        getText,
        extractPrice: (text) => quoteDisplayUtils.extractPriceFromText(text),
        copyText: (text) => copyTextToClipboard(text),
        showToast: (message) => showCopyToast(message)
      });
    }

    function showCopyToast(message) {
      copyToastRuntime.show(deps.copyToast, message);
    }

    function handleQuoteHover(event, quoteId) {
      const textWrapper = event.currentTarget;
      const state = getQuoteMarketState(quoteId);
      const category = getDashboardState().find((c) => c.quotes && c.quotes.some((q) => q.id === quoteId));
      const quote = category ? category.quotes.find((q) => q.id === quoteId) : null;

      if (!quote) return;

      textWrapper.onmouseleave = () => {
        quoteHoverRuntime.hide(quoteId, () => {
          domRenderUtils.hideTooltip(deps.globalTooltip);
        });
      };

      quoteHoverRuntime.schedule(quoteId, () => {
        const tooltipState = quoteDisplayUtils.buildQuoteHoverTooltipState(quote, state, { isEvmChain });
        if (!tooltipState) return;
        domRenderUtils.showTooltip(deps.globalTooltip, textWrapper, tooltipState.html, {
          className: tooltipState.className
        });
      });
    }

    function updateTrendArrow(quoteId, currentPrice, oldPrice, currentSource, oldSource) {
      if (!isDashboardUiActive()) {
        return markDashboardUiDirty();
      }
      const arrowEl = documentImpl.getElementById(`trend-arrow-${quoteId}`);
      if (!arrowEl) return false;

      const trendState = quoteDisplayUtils.buildQuoteTrendArrowState(currentPrice, oldPrice, currentSource, oldSource);
      if (!trendState) return false;

      domRenderUtils.applyTrendArrowState(arrowEl, trendState);
      if (trendState.action === 'hide') return true;

      quoteStateRuntime.scheduleTrendTimer(quoteId, () => {
        domRenderUtils.applyTrendArrowState(arrowEl, { action: 'hide' });
      }, {
        setTimeout: deps.setTimeout,
        clearTimeout: deps.clearTimeout,
        delayMs: 30000
      });
      return true;
    }

    return {
      applyActiveQuoteUiState,
      applyPausedQuoteUiState,
      applyQuoteDisplayToggleButtonState,
      bindCopyHandler,
      clearQuoteAlertUi,
      clearQuoteTrendArrow,
      copyDexLinkFromElement,
      copyPriceText,
      copyTextToClipboard,
      getInverseQuoteDisplayText,
      getQuoteDisplayMode,
      getQuoteDisplayText,
      handleQuoteHover,
      removeInverseQuoteElement,
      rerenderQuoteDisplayTexts,
      showCopyToast,
      toggleQuoteDisplayMode,
      updatePauseButtonState,
      updateQuotePairLabel,
      updateTrendArrow
    };
  }

  return {
    createQuoteUiController
  };
});
