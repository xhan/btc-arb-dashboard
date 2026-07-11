const assert = require('assert');

const {
  createDashboardQuoteSpreadRuntime
} = require('../src/app/dashboard-quote-spread-runtime');

const quoteSpreadController = { id: 'quote-spread-controller' };
let capturedOptions = null;
const quoteSpreadUtils = { id: 'quote-spread-utils' };
const interactionSafeRenderer = { id: 'interaction-safe-renderer' };
const modules = {
  getQuoteSpreadController: () => ({
    createQuoteSpreadController(options) {
      capturedOptions = options;
      return quoteSpreadController;
    }
  }),
  getQuoteSpreadUtils: () => quoteSpreadUtils,
  getInteractionSafeRenderer: () => interactionSafeRenderer
};
const refs = {
  window: { id: 'spread-window' },
  header: { id: 'spread-header' },
  minButton: { id: 'spread-min' },
  toggleButton: { id: 'spread-toggle' },
  content: { id: 'spread-content' }
};
const deps = {
  applyFloatingPanelDisplay: () => {},
  documentImpl: { id: 'document' },
  domRenderUtils: { id: 'dom-render' },
  formatChainLabel: (chain) => `chain:${chain}`,
  getDashboardState: () => [{ id: 'category' }],
  getQuoteMarketStateMap: () => new Map(),
  zIndexRuntime: { id: 'z-index' }
};
const timers = {
  clearInterval: () => {},
  setInterval: () => {}
};

const runtime = createDashboardQuoteSpreadRuntime({
  modules,
  deps,
  refs,
  timers
});

assert.strictEqual(runtime.quoteSpreadController, quoteSpreadController);
assert.strictEqual(capturedOptions.applyFloatingPanelDisplay, deps.applyFloatingPanelDisplay);
assert.strictEqual(capturedOptions.documentImpl, deps.documentImpl);
assert.strictEqual(capturedOptions.domRenderUtils, deps.domRenderUtils);
assert.strictEqual(capturedOptions.formatChainLabel('arbitrum'), 'chain:arbitrum');
assert.strictEqual(capturedOptions.getDashboardState, deps.getDashboardState);
assert.strictEqual(capturedOptions.getQuoteMarketStateMap, deps.getQuoteMarketStateMap);
assert.strictEqual(capturedOptions.quoteSpreadUtils, quoteSpreadUtils);
assert.strictEqual(capturedOptions.interactionSafeRenderer, interactionSafeRenderer);
assert.strictEqual(capturedOptions.refs, refs);
assert.strictEqual(capturedOptions.setInterval, timers.setInterval);
assert.strictEqual(capturedOptions.clearInterval, timers.clearInterval);
assert.strictEqual(capturedOptions.zIndexRuntime, deps.zIndexRuntime);
