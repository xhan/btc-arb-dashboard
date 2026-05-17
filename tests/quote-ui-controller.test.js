const assert = require('assert');

const { createQuoteUiController } = require('../src/quote/quote-ui-controller');

function createElement(id) {
  return {
    id,
    textContent: '',
    title: '',
    dataset: {},
    classList: {
      add() {},
      remove() {}
    },
    addEventListener() {}
  };
}

function createBaseDeps(overrides = {}) {
  const calls = [];
  const quote = { id: 101, chain: 'ethereum', amount: 2 };
  const state = {
    fromSymbol: 'USDC',
    toSymbol: 'USDT',
    lastRawPrice: 1.01,
    inverseFromSymbol: 'USDT',
    inverseToSymbol: 'USDC',
    inverseRawPrice: 0.99
  };
  const elements = {
    'quote-pair-label-101': createElement('quote-pair-label-101'),
    'quote-text-101': createElement('quote-text-101'),
    'inverse-quote-101': createElement('inverse-quote-101'),
    'trend-arrow-101': createElement('trend-arrow-101'),
    'quote-item-101': createElement('quote-item-101')
  };
  elements['inverse-quote-101'].textContent = 'old-inverse';
  const pauseButton = createElement('pause-101');
  const toggleQuoteDisplayBtn = createElement('toggle-quote-display-btn');
  const globalTooltip = createElement('global-tooltip');
  const copyToast = createElement('copy-toast');

  const deps = {
    copyToast,
    copyToastRuntime: {
      show: (toastEl, message) => calls.push(['toast', toastEl.id, message])
    },
    copyUtils: {
      bindCopyPriceHandler: (element, options) => {
        calls.push(['bindCopy', element.id, options.extractPrice('1 TOKEN ≈ 1.230000 USDC')]);
        options.copyText('1.23');
        options.showToast('copied');
      },
      copyDexLinkFromElement: async (element, options) => {
        const link = options.buildDexLink({ chain: element.dataset.dexLinkChain });
        await options.copyText(link.url);
        options.showToast(`copied ${link.label}`);
        return true;
      },
      copyTextToClipboard: async (text) => calls.push(['copyText', text])
    },
    dexLinkUtils: {
      buildDexLink: (config) => ({ url: `https://dex/${config.chain}`, label: 'DexLink' })
    },
    documentImpl: {
      getElementById: (id) => elements[id] || null,
      querySelector: () => pauseButton
    },
    domRenderUtils: {
      applyActiveQuoteDomState: (refs, options) => calls.push(['activeDom', refs.quoteId, options.text, options.clearInverse === true]),
      applyPausedQuoteDomState: (refs) => calls.push(['pausedDom', refs.quoteId]),
      applyQuoteDisplayTextDomState: (refs, options) => calls.push(['displayText', refs.quoteTextEl.id, refs.inverseEl.id, options.text, options.inverseText]),
      applyQuotePairLabelDomState: (element, html) => calls.push(['pairLabel', element.id, html]),
      clearQuoteHighlightUi: (element) => calls.push(['clearHighlight', element.id]),
      getQuoteDomRefs: (documentImpl, quoteId) => ({ quoteId, documentImpl }),
      hideTooltip: (tooltipEl) => calls.push(['hideTooltip', tooltipEl.id]),
      removeQuoteInverseElement: (element) => calls.push(['removeInverse', element.id]),
      resetTrendArrow: (element) => calls.push(['resetTrend', element.id]),
      showTooltip: (tooltipEl, targetEl, html, options) => calls.push(['showTooltip', tooltipEl.id, targetEl.id, html, options.className]),
      applyTrendArrowState: (element, trendState) => calls.push(['trend', element.id, trendState.action])
    },
    getDashboardState: () => [{ id: 1, quotes: [quote] }],
    getQuoteMarketState: () => state,
    globalTooltip,
    initialQuoteDisplayMode: 'rate',
    isEvmChain: () => true,
    isQuotePaused: () => false,
    logger: {
      warn: (...args) => calls.push(['warn', ...args])
    },
    quoteDisplayUtils: {
      applyQuoteDisplayToggleButtonState: (buttonEl, mode) => {
        calls.push(['toggleState', buttonEl.id, mode]);
        buttonEl.textContent = mode;
        return true;
      },
      buildInverseQuoteDisplayTextForState: (nextQuote, nextState, options) => `inverse-${options.mode}-${options.fallbackText}`,
      buildQuoteDisplayTextForState: (nextQuote, nextState, options) => `quote-${options.mode}-${options.paused}`,
      buildQuoteHoverTooltipState: () => ({ html: '<b>tooltip</b>', className: 'quote-tip' }),
      buildQuotePairLabelHtml: () => 'USDC/USDT',
      buildQuoteTrendArrowState: () => ({ action: 'show-up' }),
      createQuoteHoverRuntime: () => ({
        hide: (quoteId, onHide) => {
          calls.push(['hoverHide', quoteId]);
          onHide();
        },
        schedule: (quoteId, onShow) => {
          calls.push(['hoverSchedule', quoteId]);
          onShow();
        }
      }),
      extractPriceFromText: () => 1.23,
      getNextQuoteDisplayMode: () => 'amount'
    },
    quotePauseUtils: {
      applyQuotePauseButtonState: (buttonEl, nextQuote) => calls.push(['pauseButton', buttonEl.id, nextQuote.id])
    },
    quoteStateRuntime: {
      clearTrendTimer: (quoteId) => calls.push(['clearTrendTimer', quoteId]),
      scheduleTrendTimer: (quoteId, callback, options) => {
        calls.push(['scheduleTrendTimer', quoteId, options.delayMs]);
        callback();
      }
    },
    toggleQuoteDisplayBtn,
    clearTimeout() {},
    setTimeout() {},
    ...overrides
  };

  return {
    calls,
    controller: createQuoteUiController(deps),
    copyToast,
    deps,
    elements,
    globalTooltip,
    quote,
    state,
    toggleQuoteDisplayBtn
  };
}

(async () => {
  {
    const { calls, controller, quote } = createBaseDeps();
    assert.strictEqual(controller.getQuoteDisplayMode(), 'rate');
    assert.strictEqual(controller.getQuoteDisplayText(quote, {}), 'quote-rate-false');
    controller.toggleQuoteDisplayMode();
    assert.strictEqual(controller.getQuoteDisplayMode(), 'amount');
    assert.deepStrictEqual(
      calls.filter((call) => ['toggleState', 'displayText'].includes(call[0])),
      [
        ['toggleState', 'toggle-quote-display-btn', 'amount'],
        ['displayText', 'quote-text-101', 'inverse-quote-101', 'quote-amount-false', 'inverse-amount-old-inverse']
      ]
    );
  }

  {
    const { calls, controller, quote, state } = createBaseDeps();
    controller.applyPausedQuoteUiState(quote, state);
    controller.applyActiveQuoteUiState(quote, { text: '排队中...', clearInverse: true });
    assert.deepStrictEqual(
      calls.filter((call) => ['pausedDom', 'activeDom', 'pairLabel', 'pauseButton', 'removeInverse', 'clearHighlight', 'resetTrend', 'clearTrendTimer'].includes(call[0])),
      [
        ['pausedDom', 101],
        ['pairLabel', 'quote-pair-label-101', 'USDC/USDT'],
        ['pauseButton', 'pause-101', 101],
        ['removeInverse', 'inverse-quote-101'],
        ['clearHighlight', 'quote-item-101'],
        ['resetTrend', 'trend-arrow-101'],
        ['clearTrendTimer', 101],
        ['activeDom', 101, '排队中...', true],
        ['pairLabel', 'quote-pair-label-101', 'USDC/USDT'],
        ['pauseButton', 'pause-101', 101],
        ['clearHighlight', 'quote-item-101'],
        ['resetTrend', 'trend-arrow-101'],
        ['clearTrendTimer', 101],
        ['removeInverse', 'inverse-quote-101']
      ]
    );
  }

  {
    const { calls, controller } = createBaseDeps();
    const textWrapper = createElement('text-wrapper-101');
    controller.bindCopyHandler(textWrapper, () => '1 TOKEN ≈ 1.230000 USDC');
    const dexTarget = createElement('dex-target');
    dexTarget.dataset.dexLinkChain = 'ethereum';
    assert.strictEqual(await controller.copyDexLinkFromElement(dexTarget), true);
    assert.deepStrictEqual(
      calls.filter((call) => ['bindCopy', 'copyText', 'toast'].includes(call[0])),
      [
        ['bindCopy', 'text-wrapper-101', 1.23],
        ['copyText', '1.23'],
        ['toast', 'copy-toast', 'copied'],
        ['copyText', 'https://dex/ethereum'],
        ['toast', 'copy-toast', 'copied DexLink']
      ]
    );
  }

  {
    const { calls, controller } = createBaseDeps();
    const textWrapper = createElement('text-wrapper-101');
    controller.handleQuoteHover({ currentTarget: textWrapper }, 101);
    textWrapper.onmouseleave();
    controller.updateTrendArrow(101, 2, 1, 'Kyber', '0x');
    assert.deepStrictEqual(
      calls.filter((call) => ['hoverSchedule', 'showTooltip', 'hoverHide', 'hideTooltip', 'trend', 'scheduleTrendTimer'].includes(call[0])),
      [
        ['hoverSchedule', 101],
        ['showTooltip', 'global-tooltip', 'text-wrapper-101', '<b>tooltip</b>', 'quote-tip'],
        ['hoverHide', 101],
        ['hideTooltip', 'global-tooltip'],
        ['trend', 'trend-arrow-101', 'show-up'],
        ['scheduleTrendTimer', 101, 30000],
        ['trend', 'trend-arrow-101', 'hide']
      ]
    );
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
