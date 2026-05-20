(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.DashboardCommandRuntime = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DASHBOARD_COMMAND_IDS = Object.freeze([
    'close-arb-detail',
    'toggle-arb-panel',
    'toggle-data-terminal',
    'toggle-quote-display',
    'open-alert-log-settings',
    'toggle-alert-log',
    'toggle-request-channel-tags'
  ]);

  function createDashboardCommandRuntime(options = {}) {
    const commandControllerUtils = options.dashboardCommandControllerUtils;
    const keyboardShortcutControllerUtils = options.keyboardShortcutControllerUtils;

    const dashboardCommandController = commandControllerUtils.createDashboardCommandController({
      actions: options.actions
    });
    const keyboardShortcutController = keyboardShortcutControllerUtils.createKeyboardShortcutController({
      documentImpl: options.documentImpl,
      keyboardShortcutUtils: options.keyboardShortcutUtils,
      isArbDetailVisible: options.isArbDetailVisible,
      actions: dashboardCommandController.buildActionMap(DASHBOARD_COMMAND_IDS)
    });

    return {
      dashboardCommandController,
      keyboardShortcutController
    };
  }

  return {
    DASHBOARD_COMMAND_IDS,
    createDashboardCommandRuntime
  };
}));
