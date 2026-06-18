(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardAppShellRuntime = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardAppShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardAppShellRuntime(options = {}) {
    const modules = options.modules || {};
    const constants = options.constants || {};
    const deps = options.deps || {};
    const refs = options.refs || {};
    const timers = options.timers || {};

    return modules.getDashboardShellRuntime().createDashboardShellRuntime({
      clearTimeout: timers.clearTimeout,
      copyUtils: modules.getCopyUtils(),
      dashboardModalUtils: modules.getDashboardModalUtils(),
      dashboardRenderer: modules.getDashboardRenderer(),
      dashboardRuntimeUtils: deps.dashboardRuntimeUtils,
      dashboardSaveDebounceMs: constants.dashboardSaveDebounceMs,
      defaultIntervals: constants.defaultIntervals,
      documentImpl: deps.documentImpl,
      getApiIntervals: deps.getApiIntervals,
      getDashboardLocalStorage: deps.getDashboardLocalStorage,
      getDashboardState: deps.getDashboardState,
      logger: deps.logger,
      refs,
      requestChannelUtils: modules.getRequestChannelUtils(),
      saveDashboardConfig: (payload) => deps.dashboardApiClient.saveDashboardConfig(payload),
      setApiIntervals: deps.setApiIntervals,
      setTimeout: timers.setTimeout,
      themeUtils: modules.getThemeUtils(),
      updateSchedulers: deps.updateSchedulers
    });
  }

  return {
    createDashboardAppShellRuntime
  };
});
