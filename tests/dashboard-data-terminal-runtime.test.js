const assert = require('assert');

const {
  createDashboardDataTerminalRuntime
} = require('../src/app/dashboard-data-terminal-runtime');

const calls = [];
const controller = {
  renderPanel: () => calls.push(['renderPanel']),
  togglePanel: () => calls.push(['togglePanel']),
  scheduleUpdate: () => calls.push(['scheduleUpdate'])
};
let capturedOptions = null;
const dataTerminalUtils = { id: 'data-terminal-utils' };
const interactionSafeRenderer = { id: 'interaction-safe-renderer' };
const dexLinkUtils = {
  buildDexLinkCopyButtonHtml(config, className, label) {
    calls.push(['buildDexLink', config, className, label]);
    return `link:${label}`;
  }
};
const modules = {
  getDataTerminalController: () => ({
    createDataTerminalController(options) {
      capturedOptions = options;
      return controller;
    }
  }),
  getDataTerminalUtils: () => dataTerminalUtils,
  getDexLinkUtils: () => dexLinkUtils,
  getInteractionSafeRenderer: () => interactionSafeRenderer
};
const deps = {
  clearTimeout: () => {},
  closestEventTarget: () => null,
  copyDexLinkFromElement: () => calls.push(['copyDexLink']),
  dashboardRuntimeUtils: { id: 'dashboard-runtime' },
  documentImpl: { id: 'document' },
  domRenderUtils: { id: 'dom-render' },
  formatChainLabel: (chain) => `chain:${chain}`,
  formatDetailNumber: (amount, precision) => `amount:${amount}:${precision}`,
  getAliasRules: () => ({ USDT0: 'USDT' }),
  getAnchorPanel: () => ({ id: 'anchor' }),
  getDashboardState: () => [{ id: 'cat' }],
  getQuoteMarketStateMap: () => new Map(),
  interactionRuntime: { id: 'interaction' },
  isQuotePaused: (quote) => quote && quote.paused === true,
  quoteStateRuntime: {
    getMarketRevision: () => 17
  },
  setTimeout: () => {},
  windowImpl: { id: 'window' },
  zIndexRuntime: { id: 'z-index' }
};

const runtime = createDashboardDataTerminalRuntime({
  modules,
  constants: {
    dataTerminalUpdateDelayMs: 88
  },
  deps
});

assert.strictEqual(runtime.dataTerminalController, controller);
assert.strictEqual(runtime.renderDataTerminalPanel, controller.renderPanel);
assert.strictEqual(runtime.toggleDataTerminalPanel, controller.togglePanel);
assert.strictEqual(runtime.scheduleDataTerminalUpdate, controller.scheduleUpdate);
assert.strictEqual(capturedOptions.dataTerminalUtils, dataTerminalUtils);
assert.strictEqual(capturedOptions.dashboardRuntimeUtils, deps.dashboardRuntimeUtils);
assert.strictEqual(capturedOptions.interactionSafeRenderer, interactionSafeRenderer);
assert.strictEqual(capturedOptions.updateDelayMs, 88);
assert.strictEqual(capturedOptions.getMarketRevision(), 17);
assert.deepStrictEqual(capturedOptions.getAliasRules(), { USDT0: 'USDT' });
assert.strictEqual(capturedOptions.isQuoteActive({ paused: true }), false);
assert.strictEqual(capturedOptions.isQuoteActive({ paused: false }), true);
assert.strictEqual(capturedOptions.formatChainLabel('arbitrum'), 'chain:arbitrum');
assert.strictEqual(capturedOptions.formatAmount('1.23456'), 'amount:1.23456:6');
assert.strictEqual(
  capturedOptions.buildPairLinkHtml({
    chain: 'arbitrum',
    fromTokenAddress: '0xaaa',
    toTokenAddress: '0xbbb',
    amount: 2
  }, 'copy-link', 'swap'),
  'link:swap'
);
assert.deepStrictEqual(calls.pop(), [
  'buildDexLink',
  {
    chain: 'arbitrum',
    fromTokenAddress: '0xaaa',
    toTokenAddress: '0xbbb',
    inputAmount: 2
  },
  'copy-link',
  'swap'
]);
