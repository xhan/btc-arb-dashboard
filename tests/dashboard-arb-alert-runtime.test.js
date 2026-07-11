const assert = require('assert');

const {
  createDashboardArbAlertRuntime
} = require('../src/app/dashboard-arb-alert-runtime');

const calls = [];
let bridgeOptions = null;
let discoveryOptions = null;
let panelOptions = null;
let alertOptions = null;
let detailController = null;
let panelVisible = true;
let activeRuleAlert = true;
const alertConfig = { alerts: [{ id: 'quote-alert' }] };

const runtime = createDashboardArbAlertRuntime({
  AudioCtor: function AudioCtor() {},
  alertDebugUtils: { id: 'alert-debug' },
  alertLogUiUtils: { id: 'alert-log-ui' },
  alertRuntimeControllerUtils: {
    createAlertRuntimeController(options = {}) {
      calls.push(['createAlert']);
      alertOptions = options;
      return {
        bindAudioUnlockEvents: () => calls.push(['bindAudio']),
        buildQuoteAlertDisplayLabel: (quote, state, direction) => `alert:${quote.id}:${direction}`,
        checkPriceForAlerts: (quote, context = {}) => calls.push(['checkAlerts', quote.id, context.successSource || null]),
        evaluateRuleAlerts: (snapshot, optionsArg) => calls.push(['evaluateRuleAlerts', snapshot, optionsArg]),
        getConfig: () => alertConfig,
        hasActiveRuleAlertTarget: () => activeRuleAlert,
        scheduleManualPathAlertEvaluation: (options = {}) => calls.push(['scheduleManualPathAlertEvaluation', options.reason || null]),
        toggleAlertLogPanel: () => calls.push(['toggleAlertLog'])
      };
    }
  },
  arbAlertBridgeUtils: {
    createArbAlertBridgeRuntime(options = {}) {
      calls.push(['createBridge']);
      bridgeOptions = options;
      return { id: 'bridge', getActiveMutedPathLegs: () => [] };
    }
  },
  arbDiscoveryUtils: {
    createArbDiscovery(options = {}) {
      calls.push(['createDiscovery']);
      discoveryOptions = options;
      return {
        clearTopology: () => calls.push(['clearTopology']),
        getAliasRules: () => ({ USDT: 'USDT0' }),
        getPanelSnapshot: (snapshot) => {
          calls.push(['getPanelSnapshot', snapshot]);
          return { ...snapshot, globalCycles: [], panel: true };
        },
        getSnapshot: () => {
          calls.push(['getSnapshot']);
          return { id: 'snapshot' };
        },
        invalidate: (optionsArg) => {
          calls.push(['invalidate', optionsArg || null]);
          return true;
        }
      };
    }
  },
  arbPanelControllerUtils: {
    createArbPanelController(options = {}) {
      calls.push(['createPanel']);
      panelOptions = options;
      return {
        applyFloatingPanelDisplay: () => 'display',
        buildArbPathLegLineOptions: () => ({ id: 'line-options' }),
        buildLiveQuoteLabel: () => 'live-label',
        findQuoteById: (quoteId) => ({ id: quoteId }),
        formatArbPathLegLine: () => 'leg-line',
        formatChainLabel: (chain) => `chain:${chain}`,
        formatDetailNumber: (value) => String(value),
        isRuleLeg: () => false,
        isVisible: () => panelVisible,
        markDirty: () => calls.push(['markDirty']),
        scheduleUpdate: () => calls.push(['scheduleUpdate']),
        setMaxHeight: () => calls.push(['setMaxHeight']),
        update: (optionsArg) => {
          calls.push(['updatePanel', optionsArg]);
          return true;
        }
      };
    }
  },
  arbCyclePriorityUtils: { id: 'cycle-priority' },
  arbDetailUtils: { id: 'detail' },
  arbEquivalenceUtils: { id: 'equivalence' },
  arbFixedUtils: { id: 'fixed' },
  arbPanelLayoutUtils: { id: 'layout' },
  arbPanelRenderer: { id: 'renderer' },
  arbPathConfig: { id: 'config' },
  arbPathConfigUtils: { id: 'config-utils' },
  arbPaths: { id: 'paths' },
  arbPathTemplateCacheUtils: { id: 'cache' },
  arbRuleSnapshotUtils: { id: 'snapshot-utils' },
  arbRuntimeMemoryUtils: {
    createArbOpportunityRuntime() {
      calls.push(['createOpportunity']);
      return {
        getOpportunity: (opportunityId) => ({ id: opportunityId }),
        getOpportunityIdsForTarget: () => [],
        setPanelOpportunities: () => {}
      };
    },
    createArbOpportunityHighlightRuntime(options = {}) {
      calls.push(['createHighlight', options.durationMs]);
      return {
        isHighlighted: () => false,
        mark: () => false,
        onExpired: options.onExpired
      };
    },
    createArbRefreshRuntime(options = {}) {
      calls.push(['createRefresh']);
      return {
        hasDemand: options.hasDemand,
        schedule: () => calls.push(['scheduleRefresh']),
        refresh: options.refresh
      };
    }
  },
  arbSpecialUtils: { id: 'special' },
  audioUtils: { id: 'audio' },
  backendUrl: 'http://127.0.0.1:3000',
  bodyEl: { id: 'body' },
  chainDefaults: { id: 'chain' },
  closestEventTarget: () => null,
  copyDexLinkFromElement: () => {},
  dashboardRuntimeUtils: { id: 'dashboard-runtime' },
  documentImpl: { id: 'document' },
  domRenderUtils: { id: 'dom-render' },
  fetchImpl: () => {},
  getActiveQuotes: (quotes) => quotes,
  getArbCycleStartPriority: () => ['USDC'],
  getArbDetailController: () => detailController,
  getDashboardLocalStorage: () => null,
  getDashboardState: () => [],
  getQuoteChainDisplayName: () => '',
  getQuoteMarketState: () => ({}),
  getQuoteMarketStateMap: () => ({}),
  globalPathSourceSelectors: [0],
  highlightDurationMs: 8000,
  isCrossChainQuote: () => false,
  isQuotePaused: () => false,
  logError: () => {},
  logInfo: () => {},
  logWarning: () => {},
  mutedPathLegUtils: { id: 'muted-leg' },
  mutedPathRuntimeUtils: { id: 'muted-runtime' },
  mutedPathStorageUtils: { id: 'muted-storage' },
  mutedStateHiddenMaxRefreshMs: 60000,
  mutedStateVisibleRefreshMs: 1000,
  pathAlertNotificationUtils: { id: 'notification' },
  pathAlertPageUtils: { id: 'page' },
  pathAlertRuleDefinitions: {
    FIXED_PATH_RULES: [{ id: 'fixed' }],
    SPECIAL_ARB_RULES: [{ id: 'special' }]
  },
  pathAlertUtils: { id: 'path-alert' },
  quoteDisplayUtils: { id: 'quote-display' },
  quoteStateRuntime: { id: 'quote-state' },
  specialRuleAlertConfigUtils: { id: 'special-config' },
  arbPanelRefs: { arbPathWindow: {} },
  alertRefs: { alertLogWindow: {} },
  setTimeout: () => {},
  clearTimeout: () => {},
  updateDelayMs: 1000,
  windowImpl: { id: 'window' },
  zIndexRuntime: { id: 'z-index' }
});

assert.ok(runtime.alertRuntimeController);
assert.ok(runtime.arbPanelController);
assert.strictEqual(runtime.arbAlertBridgeRuntime.id, 'bridge');
assert.ok(runtime.arbDiscovery);
assert.deepStrictEqual(runtime.getOpportunity('opp-1'), { id: 'opp-1' });
assert.strictEqual(runtime.updateArbPanel(), true);
assert.strictEqual(runtime.invalidateArbRuleSnapshotCache({ bumpRevision: false }), true);
assert.deepStrictEqual(runtime.getSharedArbRuleSnapshot(), { id: 'snapshot' });
assert.strictEqual(runtime.formatChainLabel('ethereum'), 'chain:ethereum');

assert.strictEqual(bridgeOptions.fixedPathRules[0].id, 'fixed');
assert.strictEqual(bridgeOptions.specialArbRules[0].id, 'special');
assert.strictEqual(bridgeOptions.getAlertRuntimeController(), runtime.alertRuntimeController);
assert.strictEqual(bridgeOptions.invalidateArbRuleSnapshotCache(), true);
assert.strictEqual(bridgeOptions.updateArbPanel(), true);
assert.deepStrictEqual(discoveryOptions.getActiveMutedPathLegs(), []);
assert.strictEqual(panelOptions.arbDiscovery, runtime.arbDiscovery);

detailController = {
  closed: false,
  rendered: false,
  visible: true,
  close() { this.closed = true; },
  render() { this.rendered = true; },
  isVisible() { return this.visible; },
  open(opportunityId) { calls.push(['openDetail', opportunityId]); }
};
bridgeOptions.closeArbDetailModal();
bridgeOptions.renderArbDetailModal();
assert.strictEqual(bridgeOptions.isArbDetailVisible(), true);
assert.strictEqual(detailController.closed, true);
assert.strictEqual(detailController.rendered, true);
panelOptions.openArbDetailModal('opp-2');
assert.strictEqual(panelOptions.buildQuoteAlertDisplayLabel({ id: 9 }, {}, 'reverse'), 'alert:9:reverse');

assert.strictEqual(panelOptions.arbAlertBridgeRuntime.id, 'bridge');
assert.strictEqual(panelOptions.arbPathConfig.id, 'config');
assert.strictEqual(panelOptions.getAlertConfig(), alertConfig);
assert.strictEqual(alertOptions.arbAlertBridgeRuntime.id, 'bridge');
assert.strictEqual(alertOptions.arbPathConfig.id, 'config');
assert.strictEqual(alertOptions.arbPathConfigUtils.id, 'config-utils');
assert.strictEqual(alertOptions.pathAlertMarketChangeDelayMs, 1000);
assert.strictEqual(alertOptions.applyFloatingPanelDisplay(), 'display');
assert.strictEqual(alertOptions.buildLiveQuoteLabel(), 'live-label');
assert.deepStrictEqual(alertOptions.findQuoteById(42), { id: 42 });
runtime.handleQuoteMarketStateChanged({ id: 6 }, {}, { fetchMode: 'inverse', successSource: 'Jupiter' });
runtime.handleQuoteMainFetchSuccess({ id: 7 }, { successSource: 'Kyber' });

assert.deepStrictEqual(calls.slice(0, 7), [
  ['createOpportunity'],
  ['createHighlight', 8000],
  ['createBridge'],
  ['createDiscovery'],
  ['createPanel'],
  ['createAlert'],
  ['createRefresh']
]);
assert.ok(calls.some((call) => call[0] === 'bindAudio'));
assert.ok(calls.some((call) => call[0] === 'scheduleRefresh'));
assert.ok(calls.some((call) => call[0] === 'scheduleManualPathAlertEvaluation' && call[1] === 'quote-market-state-changed'));
assert.ok(calls.some((call) => call[0] === 'checkAlerts' && call[1] === 6 && call[2] === 'Jupiter'));
assert.ok(calls.some((call) => call[0] === 'checkAlerts' && call[1] === 7 && call[2] === 'Kyber'));

let refreshCallsStart = calls.length;
runtime.arbRefreshRuntime.refresh();
assert.deepStrictEqual(calls.slice(refreshCallsStart).map((call) => call[0]), [
  'getSnapshot',
  'evaluateRuleAlerts',
  'getPanelSnapshot',
  'updatePanel'
]);
assert.strictEqual(calls.at(-1)[1].snapshot.panel, true);

panelVisible = false;
refreshCallsStart = calls.length;
runtime.arbRefreshRuntime.refresh();
assert.deepStrictEqual(calls.slice(refreshCallsStart).map((call) => call[0]), [
  'getSnapshot',
  'evaluateRuleAlerts',
  'markDirty'
]);
activeRuleAlert = false;
assert.strictEqual(runtime.arbRefreshRuntime.hasDemand(), false);
