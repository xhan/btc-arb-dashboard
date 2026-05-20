const assert = require('assert');

const quoteSpreadUtils = require('../src/quote/quote-spread-utils');
const { createQuoteSpreadController, DEFAULT_UPDATE_INTERVAL_MS } = require('../src/quote/quote-spread-controller');

function createButton(name, calls) {
  return {
    name,
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
      calls.push(['bind', name, type]);
    }
  };
}

const calls = [];
const timers = [];
const clearedTimers = [];
let visible = false;
const refs = {
  window: { id: 'quote-spread-window', style: { display: 'none' } },
  header: { id: 'quote-spread-header' },
  toggleButton: createButton('toggleButton', calls),
  minButton: createButton('minButton', calls),
  content: { innerHTML: '' }
};
const dashboardState = [{
  name: 'Main',
  quotes: [
    { id: 1, chain: 'ethereum' },
    { id: 2, chain: 'base' }
  ]
}];
const quoteStateById = new Map([
  [1, {
    fromSymbol: 'WBTC',
    toSymbol: 'cbBTC',
    lastRawPrice: 1.01,
    inverseRawPrice: 0.995
  }],
  [2, {
    fromSymbol: 'USDC',
    toSymbol: 'USDT',
    lastRawPrice: 1.001,
    inverseRawPrice: 1.0005
  }]
]);
const controller = createQuoteSpreadController({
  quoteSpreadUtils,
  refs,
  getDashboardState: () => dashboardState,
  getQuoteMarketStateMap: () => quoteStateById,
  formatChainLabel: (chain) => chain.toUpperCase(),
  setInterval(callback, delayMs) {
    const timer = { callback, delayMs };
    timers.push(timer);
    return timer;
  },
  clearInterval(timer) {
    clearedTimers.push(timer);
  },
  domRenderUtils: {
    bindFloatingPanelChrome(panel, header) {
      calls.push(['bindChrome', panel.id, header.id]);
      return { focusBound: true };
    },
    createStableHtmlRenderer() {
      let renderedHtml = '';
      return {
        render(target, html) {
          if (html === renderedHtml) return false;
          target.innerHTML = html;
          renderedHtml = html;
          calls.push(['render']);
          return true;
        },
        reset() {
          renderedHtml = '';
          calls.push(['resetRenderer']);
        }
      };
    }
  },
  applyFloatingPanelDisplay(panel, action, config) {
    visible = !visible;
    panel.style.display = visible ? 'flex' : 'none';
    const result = { panelFound: true, visible, shouldRender: visible };
    if (result.shouldRender && typeof config.render === 'function') {
      config.render(result);
    }
    if (typeof config.afterApply === 'function') {
      config.afterApply(result);
    }
    return result;
  }
});

assert.strictEqual(DEFAULT_UPDATE_INTERVAL_MS, 1000);
assert.strictEqual(controller.bindPanelChrome(), true);
assert.strictEqual(controller.bindEvents(), true);
assert.deepStrictEqual(calls.slice(0, 3), [
  ['bindChrome', 'quote-spread-window', 'quote-spread-header'],
  ['bind', 'toggleButton', 'click'],
  ['bind', 'minButton', 'click']
]);

const opened = refs.toggleButton.listeners.click();
assert.strictEqual(opened.panelFound, true);
assert.strictEqual(opened.visible, true);
assert.strictEqual(refs.content.innerHTML.includes('WBTC/cbBTC'), true);
assert.strictEqual(refs.content.innerHTML.includes('ETHEREUM'), true);
assert.strictEqual(timers.length, 1);
assert.strictEqual(timers[0].delayMs, DEFAULT_UPDATE_INTERVAL_MS);

timers[0].callback();
assert.strictEqual(refs.content.innerHTML.includes('+49.50bp'), true);

const stopEvent = { stopped: false, stopPropagation() { this.stopped = true; } };
const closed = refs.minButton.listeners.click(stopEvent);
assert.strictEqual(closed.panelFound, true);
assert.strictEqual(closed.visible, false);
assert.strictEqual(stopEvent.stopped, true);
assert.strictEqual(clearedTimers.length, 1);
assert.strictEqual(refs.content.innerHTML, '');
assert.ok(calls.some((call) => call[0] === 'resetRenderer'));

const missingApplyController = createQuoteSpreadController({
  quoteSpreadUtils,
  refs: { content: { innerHTML: 'stale' } }
});
assert.deepStrictEqual(missingApplyController.toggle(), {
  panelFound: false,
  visible: false
});
