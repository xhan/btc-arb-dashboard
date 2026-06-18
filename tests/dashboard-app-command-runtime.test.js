const assert = require('assert');

const {
  createDashboardAppCommandRuntime
} = require('../src/app/dashboard-app-command-runtime');

const calls = [];
let capturedOptions = null;
const commandRuntime = {
  dashboardCommandController: { id: 'command-controller' },
  keyboardShortcutController: { id: 'keyboard-controller' }
};
const dashboardCommandControllerUtils = { id: 'command-controller-utils' };
const keyboardShortcutControllerUtils = { id: 'keyboard-controller-utils' };
const keyboardShortcutUtils = { id: 'keyboard-utils' };
const modules = {
  getDashboardCommandController: () => dashboardCommandControllerUtils,
  getDashboardCommandRuntime: () => ({
    createDashboardCommandRuntime(options) {
      capturedOptions = options;
      return commandRuntime;
    }
  }),
  getKeyboardShortcutController: () => keyboardShortcutControllerUtils,
  getKeyboardShortcutUtils: () => keyboardShortcutUtils
};
const deps = {
  alertRuntimeController: {
    openAlertLogSettingsPanel: () => calls.push(['openAlertLogSettings']),
    toggleAlertLogPanel: () => calls.push(['toggleAlertLog'])
  },
  arbDetailController: {
    isVisible: () => true
  },
  closeArbDetailModal: () => calls.push(['closeArbDetail']),
  dashboardViewModeController: {
    toggleArbView: () => calls.push(['toggleArb'])
  },
  documentImpl: { id: 'document' },
  requestChannelTagVisibilityRuntime: {
    toggle: () => calls.push(['toggleRequestChannelTags'])
  },
  toggleDataTerminalPanel: () => calls.push(['toggleDataTerminal']),
  toggleMultiChannel: () => calls.push(['toggleMultiChannel']),
  toggleQuoteDisplayMode: () => calls.push(['toggleQuoteDisplay'])
};

const runtime = createDashboardAppCommandRuntime({
  modules,
  deps
});

assert.strictEqual(runtime.dashboardCommandController, commandRuntime.dashboardCommandController);
assert.strictEqual(runtime.keyboardShortcutController, commandRuntime.keyboardShortcutController);
assert.strictEqual(capturedOptions.dashboardCommandControllerUtils, dashboardCommandControllerUtils);
assert.strictEqual(capturedOptions.keyboardShortcutControllerUtils, keyboardShortcutControllerUtils);
assert.strictEqual(capturedOptions.keyboardShortcutUtils, keyboardShortcutUtils);
assert.strictEqual(capturedOptions.documentImpl, deps.documentImpl);
assert.strictEqual(capturedOptions.isArbDetailVisible(), true);
assert.strictEqual(capturedOptions.actions['close-arb-detail'], deps.closeArbDetailModal);
capturedOptions.actions['toggle-arb-panel']();
capturedOptions.actions['toggle-data-terminal']();
capturedOptions.actions['toggle-quote-display']();
capturedOptions.actions['open-alert-log-settings']();
capturedOptions.actions['toggle-alert-log']();
capturedOptions.actions['toggle-multi-channel']();
capturedOptions.actions['toggle-request-channel-tags']();
assert.deepStrictEqual(calls, [
  ['toggleArb'],
  ['toggleDataTerminal'],
  ['toggleQuoteDisplay'],
  ['openAlertLogSettings'],
  ['toggleAlertLog'],
  ['toggleMultiChannel'],
  ['toggleRequestChannelTags']
]);
