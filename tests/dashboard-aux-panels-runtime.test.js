const assert = require('assert');

const {
  createDashboardAuxPanelsRuntime
} = require('../src/app/dashboard-aux-panels-runtime');

const calls = [];
let capturedQuoteSpreadOptions = null;
let capturedDataTerminalOptions = null;
const quoteSpreadRuntime = {
  quoteSpreadController: { id: 'quote-spread-controller' }
};
const dataTerminalRuntime = {
  renderDataTerminalPanel: () => calls.push(['renderDataTerminalPanel']),
  toggleDataTerminalPanel: () => calls.push(['toggleDataTerminalPanel']),
  scheduleDataTerminalUpdate: () => calls.push(['scheduleDataTerminalUpdate'])
};
const dataTerminalRuntimeRef = {
  set(runtime) {
    calls.push(['setDataTerminalRuntime', runtime]);
    return runtime;
  }
};
const anchorPanel = { id: 'anchor-panel' };
const modules = {
  getDashboardQuoteSpreadRuntime: () => ({
    createDashboardQuoteSpreadRuntime(options) {
      capturedQuoteSpreadOptions = options;
      return quoteSpreadRuntime;
    }
  }),
  getDashboardDataTerminalRuntime: () => ({
    createDashboardDataTerminalRuntime(options) {
      capturedDataTerminalOptions = options;
      return dataTerminalRuntime;
    }
  })
};
const constants = {
  dataTerminalUpdateDelayMs: 88
};
const deps = {
  applyFloatingPanelDisplay: () => {},
  clearTimeout: () => {},
  closestEventTarget: () => {},
  copyDexLinkFromElement: () => {},
  dashboardRuntimeUtils: { id: 'dashboard-runtime-utils' },
  dataTerminalRuntimeRef,
  documentImpl: { id: 'document' },
  domRenderUtils: { id: 'dom-render-utils' },
  formatChainLabel: (chain) => `chain:${chain}`,
  formatDetailNumber: (amount, precision) => `amount:${amount}:${precision}`,
  getAliasRules: () => ({ USDT0: 'USDT' }),
  getAnchorPanel: () => anchorPanel,
  getDashboardState: () => [{ id: 'category' }],
  getQuoteMarketStateMap: () => new Map(),
  interactionRuntime: { id: 'interaction-runtime' },
  isQuotePaused: (quote) => quote.paused === true,
  quoteStateRuntime: { getMarketRevision: () => 13 },
  setTimeout: () => {},
  windowImpl: { id: 'window' },
  zIndexRuntime: { id: 'z-index' }
};
const refs = {
  quoteSpread: {
    window: { id: 'spread-window' },
    header: { id: 'spread-header' },
    minButton: { id: 'spread-min' },
    toggleButton: { id: 'spread-toggle' },
    content: { id: 'spread-content' }
  }
};
const timers = {
  clearInterval: () => {},
  setInterval: () => {}
};

const runtime = createDashboardAuxPanelsRuntime({
  modules,
  constants,
  deps,
  refs,
  timers
});

assert.strictEqual(runtime.quoteSpreadController, quoteSpreadRuntime.quoteSpreadController);
assert.strictEqual(runtime.dataTerminalRuntime, dataTerminalRuntime);
assert.strictEqual(runtime.renderDataTerminalPanel, dataTerminalRuntime.renderDataTerminalPanel);
assert.strictEqual(runtime.toggleDataTerminalPanel, dataTerminalRuntime.toggleDataTerminalPanel);
assert.deepStrictEqual(calls, [['setDataTerminalRuntime', dataTerminalRuntime]]);
assert.strictEqual(capturedQuoteSpreadOptions.modules, modules);
assert.strictEqual(capturedQuoteSpreadOptions.deps.applyFloatingPanelDisplay, deps.applyFloatingPanelDisplay);
assert.strictEqual(capturedQuoteSpreadOptions.deps.formatChainLabel('arbitrum'), 'chain:arbitrum');
assert.strictEqual(capturedQuoteSpreadOptions.refs, refs.quoteSpread);
assert.strictEqual(capturedQuoteSpreadOptions.timers, timers);
assert.strictEqual(capturedDataTerminalOptions.modules, modules);
assert.strictEqual(capturedDataTerminalOptions.constants, constants);
assert.strictEqual(capturedDataTerminalOptions.deps.getAnchorPanel(), anchorPanel);
assert.strictEqual(capturedDataTerminalOptions.deps.formatDetailNumber('1.234', 6), 'amount:1.234:6');
assert.strictEqual(capturedDataTerminalOptions.deps.quoteStateRuntime, deps.quoteStateRuntime);
