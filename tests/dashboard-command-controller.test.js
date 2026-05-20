const assert = require('assert');

const {
  createDashboardCommandController,
  normalizeCommandId
} = require('../src/app/dashboard-command-controller');

assert.strictEqual(normalizeCommandId('  toggle-arb-panel  '), 'toggle-arb-panel');
assert.strictEqual(normalizeCommandId(null), '');

const calls = [];
const controller = createDashboardCommandController({
  actions: {
    'toggle-arb-panel': (source) => calls.push(['toggleArbPanel', source]),
    'toggle-alert-log': () => calls.push(['toggleAlertLog'])
  }
});

assert.strictEqual(controller.dispatch(' toggle-arb-panel ', 'keyboard'), true);
assert.strictEqual(controller.dispatch('missing'), false);
assert.strictEqual(controller.dispatch(''), false);

const actionMap = controller.buildActionMap([
  'toggle-arb-panel',
  '',
  'toggle-alert-log'
]);
assert.deepStrictEqual(Object.keys(actionMap), ['toggle-arb-panel', 'toggle-alert-log']);
assert.strictEqual(actionMap['toggle-arb-panel']('toolbar'), true);
assert.strictEqual(actionMap['toggle-alert-log'](), true);
assert.deepStrictEqual(calls, [
  ['toggleArbPanel', 'keyboard'],
  ['toggleArbPanel', 'toolbar'],
  ['toggleAlertLog']
]);

const emptyController = createDashboardCommandController();
assert.strictEqual(emptyController.dispatch('toggle-arb-panel'), false);
assert.deepStrictEqual(emptyController.buildActionMap(['toggle-arb-panel']).hasOwnProperty('toggle-arb-panel'), true);
assert.strictEqual(emptyController.buildActionMap(['toggle-arb-panel'])['toggle-arb-panel'](), false);
