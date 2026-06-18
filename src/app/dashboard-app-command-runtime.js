(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardAppCommandRuntime = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardAppCommandRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardAppCommandRuntime(options = {}) {
    const modules = options.modules || {};
    const deps = options.deps || {};
    const shellRuntime = deps.dashboardShellRuntime || {};
    const requestChannelTagVisibilityRuntime = shellRuntime.requestChannelTagVisibilityRuntime
      || deps.requestChannelTagVisibilityRuntime;
    return modules.getDashboardCommandRuntime().createDashboardCommandRuntime({
      dashboardCommandControllerUtils: modules.getDashboardCommandController(),
      documentImpl: deps.documentImpl,
      keyboardShortcutControllerUtils: modules.getKeyboardShortcutController(),
      keyboardShortcutUtils: modules.getKeyboardShortcutUtils(),
      isArbDetailVisible: () => deps.arbDetailController.isVisible(),
      actions: {
        'close-arb-detail': deps.closeArbDetailModal,
        'toggle-arb-panel': deps.dashboardViewModeController.toggleArbView,
        'toggle-data-terminal': deps.toggleDataTerminalPanel,
        'toggle-quote-display': deps.toggleQuoteDisplayMode,
        'open-alert-log-settings': deps.alertRuntimeController.openAlertLogSettingsPanel,
        'toggle-alert-log': deps.alertRuntimeController.toggleAlertLogPanel,
        'toggle-multi-channel': deps.toggleMultiChannel,
        'toggle-request-channel-tags': requestChannelTagVisibilityRuntime.toggle
      }
    });
  }

  return {
    createDashboardAppCommandRuntime
  };
});
