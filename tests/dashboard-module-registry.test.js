const assert = require('assert');

const {
  MODULES,
  createDashboardModuleRegistry,
  getWindowModule
} = require('../src/app/dashboard-module-registry');

assert.ok(MODULES.getDashboardRuntimeUtils, 'expected dashboard runtime module definition');
assert.ok(MODULES.getDashboardDomRefs, 'expected dashboard DOM refs module definition');
assert.ok(MODULES.getAlertRuntimeController, 'expected alert runtime controller definition');

const windowImpl = {
  ChainDefaults: { id: 'chain-defaults' },
  DashboardRuntimeUtils: { id: 'dashboard-runtime' }
};
const registry = createDashboardModuleRegistry(windowImpl);

assert.strictEqual(registry.getChainDefaults(), windowImpl.ChainDefaults);
assert.strictEqual(registry.getDashboardRuntimeUtils(), windowImpl.DashboardRuntimeUtils);
assert.strictEqual(getWindowModule(windowImpl, 'ChainDefaults', 'missing'), windowImpl.ChainDefaults);
assert.throws(
  () => registry.getAlertRuntimeController(),
  /AlertRuntimeController is not loaded/
);
