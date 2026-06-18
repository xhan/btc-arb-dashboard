const assert = require('assert');

const {
  MODULES,
  createDashboardModuleRegistry,
  getWindowModule
} = require('../src/app/dashboard-module-registry');

assert.ok(MODULES.getDashboardRuntimeUtils, 'expected dashboard runtime module definition');
assert.ok(MODULES.getDashboardAppCommandRuntime, 'expected dashboard app command runtime definition');
assert.ok(MODULES.getDashboardAppBoardRuntime, 'expected dashboard app board runtime definition');
assert.ok(MODULES.getDashboardAppShellRuntime, 'expected dashboard app shell runtime definition');
assert.ok(MODULES.getDashboardDomRefs, 'expected dashboard DOM refs module definition');
assert.ok(MODULES.getDashboardAppLifecycleRuntime, 'expected dashboard app lifecycle runtime definition');
assert.ok(MODULES.getDashboardArbAlertRuntime, 'expected dashboard arb alert runtime definition');
assert.ok(MODULES.getDashboardQuoteDomainAdapter, 'expected dashboard quote domain adapter definition');
assert.ok(MODULES.getDashboardQuoteRuntime, 'expected dashboard quote runtime definition');
assert.ok(MODULES.getDashboardAuxPanelsRuntime, 'expected dashboard aux panels runtime definition');
assert.ok(MODULES.getDashboardCommandController, 'expected dashboard command controller definition');
assert.ok(MODULES.getDashboardCommandRuntime, 'expected dashboard command runtime definition');
assert.ok(MODULES.getDashboardCoreRuntime, 'expected dashboard core runtime definition');
assert.ok(MODULES.getDashboardLifecycleController, 'expected dashboard lifecycle controller definition');
assert.ok(MODULES.getDashboardViewModeController, 'expected dashboard view mode controller definition');
assert.ok(MODULES.getDashboardDataTerminalRuntime, 'expected dashboard data terminal runtime definition');
assert.ok(MODULES.getDashboardQuoteSpreadRuntime, 'expected dashboard quote spread runtime definition');
assert.ok(MODULES.getArbAlertBridgeUtils, 'expected arb alert bridge utils definition');
assert.ok(MODULES.getArbPanelController, 'expected arb panel controller module definition');
assert.ok(MODULES.getAlertRuntimeController, 'expected alert runtime controller definition');
assert.ok(MODULES.getKeyboardShortcutController, 'expected keyboard shortcut controller definition');
assert.ok(MODULES.getQuoteSpreadController, 'expected quote spread controller definition');
assert.ok(MODULES.getQuoteSpreadUtils, 'expected quote spread utils definition');

const windowImpl = {
  ChainDefaults: { id: 'chain-defaults' },
  ArbAlertBridgeUtils: { id: 'arb-alert-bridge' },
  DashboardAppBoardRuntime: { id: 'dashboard-app-board-runtime' },
  DashboardAppCommandRuntime: { id: 'dashboard-app-command-runtime' },
  DashboardAppShellRuntime: { id: 'dashboard-app-shell-runtime' },
  DashboardAppLifecycleRuntime: { id: 'dashboard-app-lifecycle-runtime' },
  DashboardArbAlertRuntime: { id: 'dashboard-arb-alert-runtime' },
  DashboardAuxPanelsRuntime: { id: 'dashboard-aux-panels-runtime' },
  DashboardCommandController: { id: 'dashboard-command' },
  DashboardCommandRuntime: { id: 'dashboard-command-runtime' },
  DashboardCoreRuntime: { id: 'dashboard-core-runtime' },
  DashboardDataTerminalRuntime: { id: 'dashboard-data-terminal-runtime' },
  DashboardQuoteSpreadRuntime: { id: 'dashboard-quote-spread-runtime' },
  DashboardQuoteDomainAdapter: { id: 'dashboard-quote-domain' },
  DashboardQuoteRuntime: { id: 'dashboard-quote-runtime' },
  DashboardViewModeController: { id: 'dashboard-view-mode' },
  DashboardRuntimeUtils: { id: 'dashboard-runtime' }
};
const registry = createDashboardModuleRegistry(windowImpl);

assert.strictEqual(registry.getChainDefaults(), windowImpl.ChainDefaults);
assert.strictEqual(registry.getArbAlertBridgeUtils(), windowImpl.ArbAlertBridgeUtils);
assert.strictEqual(registry.getDashboardAppBoardRuntime(), windowImpl.DashboardAppBoardRuntime);
assert.strictEqual(registry.getDashboardAppCommandRuntime(), windowImpl.DashboardAppCommandRuntime);
assert.strictEqual(registry.getDashboardAppShellRuntime(), windowImpl.DashboardAppShellRuntime);
assert.strictEqual(registry.getDashboardAppLifecycleRuntime(), windowImpl.DashboardAppLifecycleRuntime);
assert.strictEqual(registry.getDashboardArbAlertRuntime(), windowImpl.DashboardArbAlertRuntime);
assert.strictEqual(registry.getDashboardAuxPanelsRuntime(), windowImpl.DashboardAuxPanelsRuntime);
assert.strictEqual(registry.getDashboardCommandController(), windowImpl.DashboardCommandController);
assert.strictEqual(registry.getDashboardCommandRuntime(), windowImpl.DashboardCommandRuntime);
assert.strictEqual(registry.getDashboardCoreRuntime(), windowImpl.DashboardCoreRuntime);
assert.strictEqual(registry.getDashboardDataTerminalRuntime(), windowImpl.DashboardDataTerminalRuntime);
assert.strictEqual(registry.getDashboardQuoteSpreadRuntime(), windowImpl.DashboardQuoteSpreadRuntime);
assert.strictEqual(registry.getDashboardQuoteDomainAdapter(), windowImpl.DashboardQuoteDomainAdapter);
assert.strictEqual(registry.getDashboardQuoteRuntime(), windowImpl.DashboardQuoteRuntime);
assert.strictEqual(registry.getDashboardRuntimeUtils(), windowImpl.DashboardRuntimeUtils);
assert.strictEqual(registry.getDashboardViewModeController(), windowImpl.DashboardViewModeController);
assert.strictEqual(getWindowModule(windowImpl, 'ChainDefaults', 'missing'), windowImpl.ChainDefaults);
assert.throws(
  () => registry.getAlertRuntimeController(),
  /AlertRuntimeController is not loaded/
);
