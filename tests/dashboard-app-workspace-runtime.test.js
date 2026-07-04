const assert = require('assert');

const {
  createDashboardAppWorkspaceRuntime
} = require('../src/app/dashboard-app-workspace-runtime');

let quoteOptions = null;
let arbOptions = null;
let auxOptions = null;
let arbWorkspaceRefValue = null;
const calls = [];

function AbortController() {}
function AudioCtor() {}

const quoteWorkspaceRuntime = {
  activeFetchControllerRuntime: { id: 'active-fetch' },
  addToQueue: () => 'add-to-queue',
  applyActiveQuoteUiState: () => 'active-ui',
  applyPausedQuoteUiState: () => 'paused-ui',
  applyQuoteDisplayToggleButtonState: () => 'display-toggle',
  copyDexLinkFromElement: () => 'copy-dex',
  copyPriceText: () => 'copy-price',
  copyTextToClipboard: () => 'copy-text',
  defaultSourceResolver: () => 'default-source',
  getActiveQuotes: () => [{ id: 1 }],
  getCategoryPauseAction: () => 'pause-action',
  getInverseQuoteDisplayText: () => 'inverse-display',
  getQuoteChainDisplayName: () => 'chain-label',
  getQuoteDisplayMode: () => 'rate',
  getQuoteDisplayText: () => 'display-text',
  handleQuoteHover: () => 'hover',
  isCexOrderbookChain: () => false,
  isCrossChainQuote: () => true,
  isEvmChain: () => true,
  isQuotePaused: () => false,
  normalizeChainKey: (chain) => String(chain || '').toLowerCase(),
  queueQuoteRefresh: () => 'queue-refresh',
  removeFromQueue: () => 'remove',
  shouldQueueInverseFetch: () => true,
  showCopyToast: () => 'toast',
  toggleMultiChannel: () => 'toggle-multi',
  toggleQuoteDisplayMode: () => 'toggle-display',
  updateQuotePairLabel: () => 'pair-label',
  updateTrendArrow: () => 'trend-arrow'
};

const createdArbWorkspaceRuntime = {
  alertRuntimeController: { id: 'alert-runtime' },
  arbDetailController: { id: 'arb-detail' },
  arbPanelController: { id: 'arb-panel' },
  dashboardViewModeController: { id: 'view-mode' },
  applyFloatingPanelDisplay: () => 'floating-display',
  buildLiveQuoteLabel: () => 'live-label',
  clearTopologyCache: () => 'clear-topology',
  formatArbPathLegLine: () => 'leg-line',
  formatChainLabel: (chain) => `chain:${chain}`,
  formatDetailNumber: (value) => `number:${value}`,
  getAliasRules: () => ({ USDT0: 'USDT' }),
  getSharedArbRuleSnapshot: () => ({ id: 'snapshot' }),
  isRuleLeg: () => false,
  scheduleArbPanelUpdate: () => 'schedule-arb',
  setArbPanelMaxHeight: () => 'set-height',
  closeArbDetailModal: () => 'close-detail',
  openArbDetailModal: () => 'open-detail',
  renderArbDetailModal: () => 'render-detail'
};
const storedArbWorkspaceRuntime = {
  ...createdArbWorkspaceRuntime,
  id: 'stored-arb-workspace'
};

const auxPanelsRuntime = {
  quoteSpreadController: { id: 'quote-spread' },
  renderDataTerminalPanel: () => 'render-data-terminal',
  toggleDataTerminalPanel: () => 'toggle-data-terminal'
};

const modules = {
  getDashboardQuoteWorkspaceRuntime: () => ({
    createDashboardQuoteWorkspaceRuntime(options) {
      quoteOptions = options;
      return quoteWorkspaceRuntime;
    }
  }),
  getDashboardArbWorkspaceRuntime: () => ({
    createDashboardArbWorkspaceRuntime(options) {
      arbOptions = options;
      return createdArbWorkspaceRuntime;
    }
  }),
  getDashboardAuxPanelsRuntime: () => ({
    createDashboardAuxPanelsRuntime(options) {
      auxOptions = options;
      return auxPanelsRuntime;
    }
  })
};

const constants = {
  defaultIntervals: { kyber: 1000 },
  initialQuoteDisplayMode: 'rate',
  arbDetailRefreshIntervalMs: 3000,
  arbPanelUpdateDelayMs: 120,
  chartAutoRefreshIntervalMs: 5000,
  dataTerminalUpdateDelayMs: 80,
  globalPathSourceSelectors: ['kyber'],
  highlightDurationMs: 8000,
  mutedStateHiddenMaxRefreshMs: 60000,
  mutedStateVisibleRefreshMs: 3000
};
const deps = {
  AbortController,
  AudioCtor,
  abortActiveFetchControllers: () => 'abort',
  arbAlertRuntimeRef: { id: 'arb-alert-ref' },
  arbWorkspaceRuntimeRef: {
    set(value) {
      calls.push(['setArbWorkspaceRef']);
      arbWorkspaceRefValue = value;
      return storedArbWorkspaceRuntime;
    }
  },
  backendUrl: 'http://127.0.0.1:3000',
  bodyEl: { id: 'body' },
  clearTimeout: () => {},
  closestEventTarget: () => {},
  copyToastRuntime: { id: 'copy-toast-runtime' },
  dashboardRuntimeUtils: { id: 'dashboard-runtime-utils' },
  dashboardShellRuntime: {
    copyToastRuntime: { id: 'shell-copy-toast-runtime' },
    getEffectiveRequestChannelIdForQuote: () => 'shell-default',
    requestChannelRuntime: { id: 'shell-request-channel' }
  },
  dataTerminalRuntimeRef: { id: 'data-terminal-ref' },
  documentImpl: { id: 'document' },
  domRenderUtils: { id: 'dom-render-utils' },
  fetchImpl: () => {},
  fetchQuoteByStrategy: () => 'fetch-quote',
  getApiIntervals: () => ({ kyber: 900 }),
  getArbCycleStartPriority: () => ['ethereum'],
  getDashboardLocalStorage: () => ({ id: 'storage' }),
  getDashboardState: () => [{ id: 'category' }],
  getQuoteMarketState: () => ({ lastRawPrice: 1 }),
  getQuoteMarketStateMap: () => new Map(),
  getEffectiveRequestChannelIdForQuote: () => 'default',
  interactionRuntime: { id: 'interaction' },
  isDashboardUiActive: () => true,
  isSchedulerPaused: () => false,
  logger: {
    error: (...args) => calls.push(['error', args]),
    info: (...args) => calls.push(['info', args]),
    warn: (...args) => calls.push(['warn', args])
  },
  markDashboardUiDirty: () => 'dirty',
  onQuoteMainFetchSuccess: () => 'main-success',
  onQuoteMarketStateChanged: () => 'market-changed',
  onQuoteMarketStateChangedSideEffect: () => 'market-side-effect',
  onShowDashboard: () => 'show-dashboard',
  quoteRuntimeRef: { id: 'quote-ref' },
  quoteStateRuntime: { id: 'quote-state' },
  recordSourceAttempt: () => 'record-source',
  requestChannelRuntime: { id: 'request-channel' },
  resetQuoteUiRuntimeState: () => 'reset-ui',
  setQuoteMarketState: () => 'set-market',
  updateSchedulers: () => 'update-schedulers',
  windowImpl: { id: 'window' },
  zIndexRuntime: { id: 'z-index' }
};
const refs = {
  copyToast: { id: 'copy-toast' },
  globalTooltip: { id: 'tooltip' },
  toggleQuoteDisplayBtn: { id: 'toggle-display' },
  arbPanel: {
    arbPathWindow: { id: 'arb-window' },
    arbPathContent: { id: 'arb-content' }
  },
  alert: {
    alertLogWindow: { id: 'alert-window' }
  },
  detail: {
    modal: { id: 'detail-modal' }
  },
  viewMode: {
    dashboardEl: { id: 'dashboard' },
    arbPathWindow: { id: 'arb-window' }
  },
  quoteSpread: {
    window: { id: 'spread-window' }
  }
};
const timers = {
  setInterval: () => {},
  clearInterval: () => {},
  setTimeout: () => {},
  clearTimeout: () => {}
};

const runtime = createDashboardAppWorkspaceRuntime({
  modules,
  constants,
  deps,
  refs,
  timers
});

assert.strictEqual(runtime.quoteWorkspaceRuntime, quoteWorkspaceRuntime);
assert.strictEqual(runtime.arbWorkspaceRuntime, storedArbWorkspaceRuntime);
assert.strictEqual(runtime.auxPanelsRuntime, auxPanelsRuntime);
assert.strictEqual(arbWorkspaceRefValue, createdArbWorkspaceRuntime);
assert.deepStrictEqual(calls, [['setArbWorkspaceRef']]);
assert.strictEqual(runtime.toggleMultiChannel(), 'toggle-multi');
assert.strictEqual(runtime.copyDexLinkFromElement(), 'copy-dex');
assert.strictEqual(runtime.alertRuntimeController, createdArbWorkspaceRuntime.alertRuntimeController);
assert.strictEqual(runtime.quoteSpreadController, auxPanelsRuntime.quoteSpreadController);
assert.strictEqual(runtime.renderDataTerminalPanel(), 'render-data-terminal');

assert.strictEqual(quoteOptions.modules, modules);
assert.deepStrictEqual(quoteOptions.constants, {
  defaultIntervals: constants.defaultIntervals,
  initialQuoteDisplayMode: constants.initialQuoteDisplayMode
});
assert.strictEqual(quoteOptions.deps.AbortController, AbortController);
assert.strictEqual(quoteOptions.deps.copyToastRuntime, deps.dashboardShellRuntime.copyToastRuntime);
assert.strictEqual(quoteOptions.deps.getEffectiveRequestChannelIdForQuote(), 'shell-default');
assert.strictEqual(quoteOptions.deps.isSchedulerPaused, deps.isSchedulerPaused);
assert.strictEqual(quoteOptions.deps.quoteRuntimeRef, deps.quoteRuntimeRef);
assert.strictEqual(quoteOptions.deps.requestChannelRuntime, deps.dashboardShellRuntime.requestChannelRuntime);
assert.strictEqual(quoteOptions.deps.setTimeout, timers.setTimeout);
assert.strictEqual(quoteOptions.deps.clearTimeout, timers.clearTimeout);
assert.strictEqual(quoteOptions.refs.copyToast, refs.copyToast);

assert.strictEqual(arbOptions.arbAlertRuntimeRef, deps.arbAlertRuntimeRef);
assert.strictEqual(arbOptions.modules, modules);
assert.strictEqual(arbOptions.constants.highlightDurationMs, constants.highlightDurationMs);
assert.strictEqual(arbOptions.deps.AudioCtor, AudioCtor);
assert.strictEqual(arbOptions.deps.copyDexLinkFromElement, quoteWorkspaceRuntime.copyDexLinkFromElement);
assert.strictEqual(arbOptions.deps.copyTextToClipboard, quoteWorkspaceRuntime.copyTextToClipboard);
assert.strictEqual(arbOptions.deps.getActiveQuotes, quoteWorkspaceRuntime.getActiveQuotes);
assert.strictEqual(arbOptions.deps.getQuoteChainDisplayName, quoteWorkspaceRuntime.getQuoteChainDisplayName);
assert.strictEqual(arbOptions.deps.isCrossChainQuote, quoteWorkspaceRuntime.isCrossChainQuote);
assert.strictEqual(arbOptions.deps.isQuotePaused, quoteWorkspaceRuntime.isQuotePaused);
assert.strictEqual(arbOptions.deps.onQuoteMarketStateChanged, deps.onQuoteMarketStateChanged);
assert.strictEqual(arbOptions.deps.onQuoteMarketStateChangedSideEffect, deps.onQuoteMarketStateChangedSideEffect);
assert.strictEqual(arbOptions.deps.showCopyToast, quoteWorkspaceRuntime.showCopyToast);
assert.strictEqual(arbOptions.refs.arbPanel, refs.arbPanel);
assert.strictEqual(arbOptions.timers.setInterval, timers.setInterval);

assert.strictEqual(auxOptions.modules, modules);
assert.deepStrictEqual(auxOptions.constants, {
  dataTerminalUpdateDelayMs: constants.dataTerminalUpdateDelayMs
});
assert.strictEqual(auxOptions.deps.applyFloatingPanelDisplay, storedArbWorkspaceRuntime.applyFloatingPanelDisplay);
assert.strictEqual(auxOptions.deps.copyDexLinkFromElement, quoteWorkspaceRuntime.copyDexLinkFromElement);
assert.strictEqual(auxOptions.deps.formatChainLabel('arbitrum'), 'chain:arbitrum');
assert.strictEqual(auxOptions.deps.formatDetailNumber(12), 'number:12');
assert.strictEqual(auxOptions.deps.getAliasRules, storedArbWorkspaceRuntime.getAliasRules);
assert.strictEqual(auxOptions.deps.getAnchorPanel(), refs.arbPanel.arbPathWindow);
assert.strictEqual(auxOptions.deps.isQuotePaused, quoteWorkspaceRuntime.isQuotePaused);
assert.strictEqual(auxOptions.refs.quoteSpread, refs.quoteSpread);
assert.strictEqual(auxOptions.timers.clearInterval, timers.clearInterval);
