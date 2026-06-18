const assert = require('assert');

const {
  createDashboardAppShellRuntime
} = require('../src/app/dashboard-app-shell-runtime');

let capturedOptions = null;
const savedPayloads = [];
const shellRuntime = {
  themeRuntime: { id: 'theme-runtime' },
  performSave: () => 'save',
  saveData: () => 'schedule-save'
};
const dashboardShellRuntimeUtils = {
  createDashboardShellRuntime(options) {
    capturedOptions = options;
    return shellRuntime;
  }
};
const modules = {
  getCopyUtils: () => ({ id: 'copy-utils' }),
  getDashboardModalUtils: () => ({ id: 'modal-utils' }),
  getDashboardRenderer: () => ({ id: 'renderer' }),
  getDashboardShellRuntime: () => dashboardShellRuntimeUtils,
  getRequestChannelUtils: () => ({ id: 'request-channel-utils' }),
  getThemeUtils: () => ({ id: 'theme-utils' })
};
const constants = {
  dashboardSaveDebounceMs: 1200,
  defaultIntervals: { kyber: 1000 }
};
const deps = {
  dashboardApiClient: {
    saveDashboardConfig(payload) {
      savedPayloads.push(payload);
      return { ok: true };
    }
  },
  dashboardRuntimeUtils: { id: 'dashboard-runtime-utils' },
  documentImpl: { id: 'document' },
  getApiIntervals: () => ({ kyber: 500 }),
  getDashboardLocalStorage: () => ({ id: 'storage' }),
  getDashboardState: () => [{ id: 'category' }],
  logger: { id: 'logger' },
  setApiIntervals: () => {},
  updateSchedulers: () => {}
};
const refs = {
  bodyEl: { id: 'body' },
  themeToggleBtn: { id: 'theme-toggle' },
  manualSaveBtn: { id: 'manual-save' },
  manualSaveText: { id: 'manual-save-text' },
  settingsBtn: { id: 'settings' },
  settingsCancelBtn: { id: 'settings-cancel' },
  settingsSaveBtn: { id: 'settings-save' },
  settingsModal: { id: 'settings-modal' },
  settingsIntervalInputRefs: { kyber: { value: '1000' } },
  toggleMultiChannelBtn: { id: 'toggle-multi-channel' },
  copyToast: { id: 'copy-toast' }
};
const timers = {
  clearTimeout: () => 'clear-timeout',
  setTimeout: () => 'set-timeout'
};

const runtime = createDashboardAppShellRuntime({
  modules,
  constants,
  deps,
  refs,
  timers
});

assert.strictEqual(runtime, shellRuntime);
assert.strictEqual(capturedOptions.clearTimeout, timers.clearTimeout);
assert.strictEqual(capturedOptions.setTimeout, timers.setTimeout);
assert.strictEqual(capturedOptions.copyUtils.id, 'copy-utils');
assert.strictEqual(capturedOptions.dashboardModalUtils.id, 'modal-utils');
assert.strictEqual(capturedOptions.dashboardRenderer.id, 'renderer');
assert.strictEqual(capturedOptions.requestChannelUtils.id, 'request-channel-utils');
assert.strictEqual(capturedOptions.themeUtils.id, 'theme-utils');
assert.strictEqual(capturedOptions.dashboardRuntimeUtils, deps.dashboardRuntimeUtils);
assert.strictEqual(capturedOptions.dashboardSaveDebounceMs, constants.dashboardSaveDebounceMs);
assert.strictEqual(capturedOptions.defaultIntervals, constants.defaultIntervals);
assert.strictEqual(capturedOptions.documentImpl, deps.documentImpl);
assert.strictEqual(capturedOptions.getApiIntervals, deps.getApiIntervals);
assert.strictEqual(capturedOptions.getDashboardLocalStorage, deps.getDashboardLocalStorage);
assert.strictEqual(capturedOptions.getDashboardState, deps.getDashboardState);
assert.strictEqual(capturedOptions.logger, deps.logger);
assert.strictEqual(capturedOptions.refs.bodyEl, refs.bodyEl);
assert.strictEqual(capturedOptions.refs.settingsIntervalInputRefs, refs.settingsIntervalInputRefs);
assert.strictEqual(capturedOptions.setApiIntervals, deps.setApiIntervals);
assert.strictEqual(capturedOptions.updateSchedulers, deps.updateSchedulers);
assert.deepStrictEqual(capturedOptions.saveDashboardConfig({ id: 'payload' }), { ok: true });
assert.deepStrictEqual(savedPayloads, [{ id: 'payload' }]);
