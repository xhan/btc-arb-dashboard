const assert = require('assert');

const {
  createDashboardAppLifecycleRuntime
} = require('../src/app/dashboard-app-lifecycle-runtime');

let capturedOptions = null;
const lifecycleController = {
  bindStaticEvents: () => 'bind',
  init: () => 'init'
};
const dashboardLifecycleControllerUtils = {
  createDashboardLifecycleController(options) {
    capturedOptions = options;
    return lifecycleController;
  }
};
const normalizeArbCycleStartPriority = () => ['normalized'];
const modules = {
  getArbCyclePriorityUtils: () => ({ normalizeArbCycleStartPriority }),
  getDashboardLifecycleController: () => dashboardLifecycleControllerUtils,
  getDashboardRenderer: () => ({ id: 'renderer' })
};
const deps = {
  addToQueue: () => {},
  alertRuntimeController: { id: 'alert-runtime' },
  applyQuoteDisplayToggleButtonState: () => {},
  arbDetailController: { id: 'arb-detail' },
  arbPanelController: { id: 'arb-panel' },
  clearTopologyCache: () => {},
  confirmActionRuntime: { id: 'confirm-runtime' },
  dashboardApiClient: { id: 'api-client' },
  dashboardCommandController: { id: 'command-controller' },
  dashboardFormController: { id: 'form-controller' },
  dashboardViewModeController: { id: 'view-mode' },
  defaultArbCycleStartPriority: ['polygon'],
  defaultIntervals: { kyber: 3000 },
  documentImpl: { id: 'document' },
  domRenderUtils: { id: 'dom-render' },
  floatingPanelZIndexRuntime: { id: 'z-index' },
  getDashboardState: () => [{ id: 'category' }],
  getPriceSnapshotConfig: () => ({ enabled: false }),
  handleDashboardClick: () => {},
  handleDashboardInput: () => {},
  invalidateArbRuleSnapshotCache: () => {},
  keyboardShortcutController: { id: 'keyboard-controller' },
  openAddCategoryModal: () => {},
  performSave: () => {},
  priceSnapshotSaveRuntime: { id: 'price-save' },
  priceSnapshotTimerRuntime: { id: 'price-timer' },
  quoteSpreadController: { id: 'quote-spread' },
  renderDashboardForCurrentState: () => {},
  requestChannelRuntime: { id: 'request-channel' },
  requestChannelTagVisibilityRuntime: { id: 'request-tag-visibility' },
  saveData: () => {},
  setApiIntervals: () => {},
  setArbCycleStartPriority: () => {},
  setArbPanelMaxHeight: () => {},
  setDashboardState: () => {},
  setPriceSnapshotConfig: () => {},
  settingsModalRuntime: { id: 'settings-modal' },
  themeRuntime: { id: 'theme-runtime' },
  updateArbPanel: () => {},
  updateSchedulers: () => {},
  windowImpl: { id: 'window' }
};
const refs = {
  dashboardEl: { id: 'dashboard' },
  addCategoryBtn: { id: 'add-category' },
  audioNoticeEl: { id: 'audio' },
  manualSaveBtn: { id: 'manual-save' },
  themeToggleBtn: { id: 'theme-toggle' },
  confirmOkBtn: { id: 'confirm-ok' },
  confirmCancelBtn: { id: 'confirm-cancel' },
  confirmModal: { id: 'confirm-modal' },
  confirmModalRefs: { id: 'confirm-refs' },
  alertLogWindow: { id: 'alert-window' },
  alertLogHeader: { id: 'alert-header' },
  alertLogMinBtn: { id: 'alert-min' },
  alertLogMutedLogContent: { id: 'muted-log-content' },
  arbPathWindow: { id: 'arb-window' },
  arbPathHeader: { id: 'arb-header' },
  arbPathMinBtn: { id: 'arb-min' },
  toggleArbBtn: { id: 'toggle-arb' },
  toggleQuoteDisplayBtn: { id: 'toggle-display' },
  toggleDataTerminalBtn: { id: 'toggle-data-terminal' },
  toggleAlertLogBtn: { id: 'toggle-alert-log' },
  toggleMultiChannelBtn: { id: 'toggle-multi-channel' }
};

const runtime = createDashboardAppLifecycleRuntime({
  modules,
  deps,
  refs
});

assert.strictEqual(runtime.dashboardLifecycleController, lifecycleController);
assert.strictEqual(runtime.bindStaticEvents(), 'bind');
assert.strictEqual(runtime.init(), 'init');
assert.strictEqual(capturedOptions.addToQueue, deps.addToQueue);
assert.strictEqual(capturedOptions.alertRuntimeController, deps.alertRuntimeController);
assert.strictEqual(capturedOptions.dashboardRenderer.id, 'renderer');
assert.strictEqual(capturedOptions.defaultArbCycleStartPriority, deps.defaultArbCycleStartPriority);
assert.strictEqual(capturedOptions.defaultIntervals, deps.defaultIntervals);
assert.strictEqual(capturedOptions.documentImpl, deps.documentImpl);
assert.strictEqual(capturedOptions.normalizeArbCycleStartPriority, normalizeArbCycleStartPriority);
assert.strictEqual(capturedOptions.renderDashboard, deps.renderDashboardForCurrentState);
assert.strictEqual(capturedOptions.refs, refs);
assert.strictEqual(capturedOptions.windowImpl, deps.windowImpl);
assert.deepStrictEqual(capturedOptions.getDashboardState(), [{ id: 'category' }]);
assert.deepStrictEqual(capturedOptions.getPriceSnapshotConfig(), { enabled: false });
