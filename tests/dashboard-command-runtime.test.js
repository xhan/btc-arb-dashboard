const assert = require('assert');

const {
  DASHBOARD_COMMAND_IDS,
  createDashboardCommandRuntime
} = require('../src/app/dashboard-command-runtime');

assert.deepStrictEqual(DASHBOARD_COMMAND_IDS, [
  'close-arb-detail',
  'toggle-arb-panel',
  'toggle-data-terminal',
  'toggle-quote-display',
  'open-alert-log-settings',
  'toggle-alert-log',
  'toggle-request-channel-tags'
]);
assert.strictEqual(Object.isFrozen(DASHBOARD_COMMAND_IDS), true);

const calls = [];
const documentImpl = { id: 'document' };
const keyboardShortcutUtils = { id: 'keyboard-utils' };
const commandRuntime = createDashboardCommandRuntime({
  dashboardCommandControllerUtils: {
    createDashboardCommandController(options = {}) {
      calls.push(['createCommand', Object.keys(options.actions)]);
      return {
        dispatch(commandId) {
          calls.push(['dispatch', commandId]);
          const action = options.actions[commandId];
          if (typeof action !== 'function') return false;
          action();
          return true;
        },
        buildActionMap(commandIds = []) {
          calls.push(['buildActionMap', commandIds]);
          return commandIds.reduce((result, commandId) => {
            result[commandId] = () => this.dispatch(commandId);
            return result;
          }, {});
        }
      };
    }
  },
  keyboardShortcutControllerUtils: {
    createKeyboardShortcutController(options = {}) {
      calls.push([
        'createKeyboard',
        options.documentImpl,
        options.keyboardShortcutUtils,
        Object.keys(options.actions)
      ]);
      return {
        trigger(commandId) {
          return options.actions[commandId]();
        },
        isArbDetailVisible: options.isArbDetailVisible
      };
    }
  },
  documentImpl,
  keyboardShortcutUtils,
  isArbDetailVisible: () => true,
  actions: {
    'close-arb-detail': () => calls.push(['closeArbDetail']),
    'toggle-arb-panel': () => calls.push(['toggleArbPanel'])
  }
});

assert.ok(commandRuntime.dashboardCommandController);
assert.ok(commandRuntime.keyboardShortcutController);
assert.strictEqual(commandRuntime.keyboardShortcutController.isArbDetailVisible(), true);
assert.strictEqual(commandRuntime.dashboardCommandController.dispatch('toggle-arb-panel'), true);
assert.strictEqual(commandRuntime.keyboardShortcutController.trigger('close-arb-detail'), true);
assert.strictEqual(commandRuntime.keyboardShortcutController.trigger('toggle-alert-log'), false);

assert.deepStrictEqual(calls, [
  ['createCommand', ['close-arb-detail', 'toggle-arb-panel']],
  ['buildActionMap', DASHBOARD_COMMAND_IDS],
  ['createKeyboard', documentImpl, keyboardShortcutUtils, DASHBOARD_COMMAND_IDS],
  ['dispatch', 'toggle-arb-panel'],
  ['toggleArbPanel'],
  ['dispatch', 'close-arb-detail'],
  ['closeArbDetail'],
  ['dispatch', 'toggle-alert-log']
]);
