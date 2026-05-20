const assert = require('assert');

const {
  createDashboardArbWorkspaceRuntime
} = require('../src/app/dashboard-arb-workspace-runtime');

const calls = [];
let detailOptions = null;
let viewModeOptions = null;
let arbAlertOptions = null;
let refValue = null;

const runtime = createDashboardArbWorkspaceRuntime({
  arbAlertRuntimeRef: {
    set(value) {
      calls.push(['setArbRef']);
      refValue = value;
      return value;
    }
  },
  dashboardArbAlertRuntimeUtils: {
    createDashboardArbAlertRuntime(options = {}) {
      calls.push(['createArbAlert']);
      arbAlertOptions = options;
      return {
        alertRuntimeController: {
          muteArbDetailLeg: (row, hours, nowMs) => {
            calls.push(['muteLeg', row.id, hours, nowMs]);
            return 'muted';
          },
          openAlertLogSettingsPanel: () => calls.push(['openSettings']),
          toggleAlertLogPanel: () => calls.push(['toggleAlert'])
        },
        arbPanelController: { id: 'panel' },
        applyFloatingPanelDisplay: () => 'display',
        buildArbPathLegLineOptions: () => ({ id: 'line-options' }),
        buildLiveQuoteLabel: () => 'live-label',
        clearTopologyCache: () => calls.push(['clearTopology']),
        findQuoteById: (quoteId) => ({ id: quoteId }),
        formatArbPathLegLine: () => 'leg-line',
        formatChainLabel: (chain) => `chain:${chain}`,
        formatDetailNumber: (value) => String(value),
        getAliasRules: () => ({ usdt: 'usdt0' }),
        getOpportunity: (opportunityId) => ({ id: opportunityId }),
        getSharedArbRuleSnapshot: () => ({ id: 'snapshot' }),
        handleQuoteMarketStateChanged: (quote, state, context) => calls.push(['handleMarketChanged', quote.id, state && state.lastRawPrice, context && context.fetchMode]),
        handleQuoteMainFetchSuccess: (quote, context) => calls.push(['handleMainSuccess', quote.id, context && context.successSource]),
        invalidateArbRuleSnapshotCache: (optionsArg) => {
          calls.push(['invalidate', optionsArg]);
          return true;
        },
        isRuleLeg: () => false,
        scheduleArbPanelUpdate: () => calls.push(['scheduleArb']),
        setArbPanelMaxHeight: () => {
          calls.push(['setMaxHeight']);
        },
        updateArbPanel: () => {
          calls.push(['updateArb']);
          return true;
        }
      };
    }
  },
  dashboardViewModeControllerUtils: {
    createDashboardViewModeController(options = {}) {
      calls.push(['createViewMode']);
      viewModeOptions = options;
      return {
        getMode: () => 'arb',
        toggleArbView: () => calls.push(['toggleArbView'])
      };
    }
  },
  arbDetailControllerUtils: {
    createArbDetailController(options = {}) {
      calls.push(['createDetail']);
      detailOptions = options;
      return {
        close: () => calls.push(['closeDetail']),
        open: (opportunityId) => calls.push(['openDetail', opportunityId]),
        render: () => calls.push(['renderDetail']),
        isVisible: () => true,
        isDashboardPaused: () => false,
        getState: () => ({ id: 'detail-state' }),
        recordSourceAttempt: (source) => calls.push(['recordSource', source])
      };
    }
  },
  arbAlertOptions: {
    backendUrl: 'http://127.0.0.1:3000'
  },
  viewModeOptions: {
    bodyEl: { id: 'body' },
    onShowDashboard: () => calls.push(['showDashboard']),
    refs: { dashboardEl: {}, arbPathWindow: {} }
  },
  detailOptions: {
    refs: { modal: {} },
    logRefreshError: () => {}
  }
});

assert.strictEqual(refValue, runtime.arbAlertRuntime);
assert.strictEqual(runtime.alertRuntimeController, runtime.arbAlertRuntime.alertRuntimeController);
assert.strictEqual(runtime.arbPanelController.id, 'panel');
assert.strictEqual(runtime.dashboardViewModeController.getMode(), 'arb');
assert.strictEqual(runtime.arbDetailController.isVisible(), true);

assert.strictEqual(arbAlertOptions.backendUrl, 'http://127.0.0.1:3000');
assert.strictEqual(arbAlertOptions.getArbDetailController(), runtime.arbDetailController);
assert.strictEqual(viewModeOptions.setArbPanelMaxHeight(), undefined);
assert.strictEqual(viewModeOptions.updateArbPanel(), true);
assert.deepStrictEqual(detailOptions.getOpportunity('opp-1'), { id: 'opp-1' });
assert.strictEqual(detailOptions.muteLeg({ id: 'row-1' }, 2, 123), 'muted');
assert.strictEqual(detailOptions.refreshOpportunities(), true);

assert.strictEqual(runtime.updateArbPanel(), true);
assert.strictEqual(runtime.invalidateArbRuleSnapshotCache({ bumpRevision: false }), true);
runtime.openArbDetailModal('opp-2');
runtime.closeArbDetailModal();
runtime.renderArbDetailModal();
runtime.dashboardViewModeController.toggleArbView();
runtime.arbDetailController.recordSourceAttempt('kyber');
runtime.handleQuoteMarketStateChanged({ id: 11 }, { lastRawPrice: 1.1 }, { fetchMode: 'inverse' });
runtime.handleQuoteMainFetchSuccess({ id: 12 }, { successSource: '0x' });

assert.deepStrictEqual(calls.slice(0, 4), [
  ['createArbAlert'],
  ['setArbRef'],
  ['createViewMode'],
  ['createDetail']
]);
assert.ok(calls.some((call) => call[0] === 'updateArb'));
assert.ok(calls.some((call) => call[0] === 'muteLeg'));
assert.ok(calls.some((call) => call[0] === 'handleMarketChanged' && call[1] === 11 && call[3] === 'inverse'));
assert.ok(calls.some((call) => call[0] === 'handleMainSuccess' && call[1] === 12 && call[2] === '0x'));
