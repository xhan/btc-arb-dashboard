(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardAppLifecycleRuntime = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardAppLifecycleRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardAppLifecycleRuntime(options = {}) {
    const modules = options.modules || {};
    const deps = options.deps || {};
    const refs = options.refs || {};
    const shellRuntime = deps.dashboardShellRuntime || {};
    const commandRuntime = deps.dashboardCommandRuntime || {};
    const boardRuntime = deps.dashboardAppBoardRuntime || {};
    const workspaceRuntime = deps.dashboardAppWorkspaceRuntime || {};

    function getWorkspaceDep(name) {
      return workspaceRuntime[name] || deps[name];
    }

    const dashboardLifecycleController = modules.getDashboardLifecycleController().createDashboardLifecycleController({
      addToQueue: getWorkspaceDep('addToQueue'),
      alertRuntimeController: getWorkspaceDep('alertRuntimeController'),
      applyQuoteDisplayToggleButtonState: getWorkspaceDep('applyQuoteDisplayToggleButtonState'),
      arbDetailController: getWorkspaceDep('arbDetailController'),
      arbPanelController: getWorkspaceDep('arbPanelController'),
      clearTopologyCache: getWorkspaceDep('clearTopologyCache'),
      confirmActionRuntime: shellRuntime.confirmActionRuntime || deps.confirmActionRuntime,
      dashboardApiClient: deps.dashboardApiClient,
      dashboardCommandController: commandRuntime.dashboardCommandController || deps.dashboardCommandController,
      dashboardFormController: boardRuntime.dashboardFormController || deps.dashboardFormController,
      dashboardRenderer: modules.getDashboardRenderer(),
      dashboardViewModeController: getWorkspaceDep('dashboardViewModeController'),
      defaultArbCycleStartPriority: deps.defaultArbCycleStartPriority,
      defaultIntervals: deps.defaultIntervals,
      documentImpl: deps.documentImpl,
      domRenderUtils: deps.domRenderUtils,
      floatingPanelZIndexRuntime: deps.floatingPanelZIndexRuntime,
      getDashboardState: deps.getDashboardState,
      getPriceSnapshotConfig: deps.getPriceSnapshotConfig,
      handleDashboardClick: boardRuntime.handleDashboardClick || deps.handleDashboardClick,
      handleDashboardInput: boardRuntime.handleDashboardInput || deps.handleDashboardInput,
      invalidateArbRuleSnapshotCache: deps.invalidateArbRuleSnapshotCache,
      keyboardShortcutController: commandRuntime.keyboardShortcutController || deps.keyboardShortcutController,
      normalizeArbCycleStartPriority: modules.getArbCyclePriorityUtils().normalizeArbCycleStartPriority,
      openAddCategoryModal: boardRuntime.openAddCategoryModal || deps.openAddCategoryModal,
      performSave: shellRuntime.performSave || deps.performSave,
      priceSnapshotSaveRuntime: deps.priceSnapshotSaveRuntime,
      priceSnapshotTimerRuntime: deps.priceSnapshotTimerRuntime,
      quoteSpreadController: getWorkspaceDep('quoteSpreadController'),
      renderDashboard: deps.renderDashboardForCurrentState,
      requestChannelRuntime: shellRuntime.requestChannelRuntime || deps.requestChannelRuntime,
      requestChannelTagVisibilityRuntime: shellRuntime.requestChannelTagVisibilityRuntime || deps.requestChannelTagVisibilityRuntime,
      refs,
      saveData: shellRuntime.saveData || deps.saveData,
      setApiIntervals: deps.setApiIntervals,
      setArbCycleStartPriority: deps.setArbCycleStartPriority,
      setArbPanelMaxHeight: getWorkspaceDep('setArbPanelMaxHeight'),
      setDashboardState: deps.setDashboardState,
      setPriceSnapshotConfig: deps.setPriceSnapshotConfig,
      settingsModalRuntime: shellRuntime.settingsModalRuntime || deps.settingsModalRuntime,
      themeRuntime: shellRuntime.themeRuntime || deps.themeRuntime,
      updateArbPanel: deps.updateArbPanel,
      updateSchedulers: deps.updateSchedulers,
      windowImpl: deps.windowImpl
    });

    return {
      dashboardLifecycleController,
      bindStaticEvents: dashboardLifecycleController.bindStaticEvents,
      init: dashboardLifecycleController.init
    };
  }

  return {
    createDashboardAppLifecycleRuntime
  };
});
