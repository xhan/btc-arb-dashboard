(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardModuleRegistry = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardModuleRegistry = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MODULES = Object.freeze({
    getAlertDebugUtils: ['AlertDebugUtils', 'AlertDebugUtils is not loaded'],
    getAlertLogUiUtils: ['AlertLogUiUtils', 'AlertLogUiUtils is not loaded'],
    getAlertRuntimeController: ['AlertRuntimeController', 'AlertRuntimeController is not loaded'],
    getArbAlertBridgeUtils: ['ArbAlertBridgeUtils', 'ArbAlertBridgeUtils is not loaded'],
    getArbCyclePriorityUtils: ['ArbCyclePriorityUtils', 'ArbCyclePriorityUtils is not loaded'],
    getArbDetailController: ['ArbDetailController', 'ArbDetailController is not loaded'],
    getArbDetailRefreshUtils: ['ArbDetailRefreshUtils', 'ArbDetailRefreshUtils is not loaded'],
    getArbDetailUtils: ['ArbDetailUtils', 'ArbDetailUtils is not loaded'],
    getArbEquivalenceUtils: ['ArbEquivalenceUtils', 'ArbEquivalenceUtils is not loaded'],
    getArbFixedUtils: ['ArbFixedUtils', 'ArbFixedUtils is not loaded'],
    getArbPanelLayoutUtils: ['ArbPanelLayoutUtils', 'ArbPanelLayoutUtils is not loaded'],
    getArbPanelController: ['ArbPanelController', 'ArbPanelController is not loaded'],
    getArbPanelRenderer: ['ArbPanelRenderer', 'ArbPanelRenderer is not loaded'],
    getArbPathConfig: ['ArbPathConfig', 'ArbPathConfig is not loaded'],
    getArbPathConfigUtils: ['ArbPathConfigUtils', 'ArbPathConfigUtils is not loaded'],
    getArbPathTemplateCacheUtils: ['ArbPathTemplateCacheUtils', 'ArbPathTemplateCacheUtils is not loaded'],
    getArbPaths: ['ArbPaths', 'ArbPaths is not loaded'],
    getArbRuleSnapshotUtils: ['ArbRuleSnapshotUtils', 'ArbRuleSnapshotUtils is not loaded'],
    getArbRuntimeMemoryUtils: ['ArbRuntimeMemoryUtils', 'ArbRuntimeMemoryUtils is not loaded'],
    getArbSpecialUtils: ['ArbSpecialUtils', 'ArbSpecialUtils is not loaded'],
    getAudioUtils: ['AudioUtils', 'AudioUtils is not loaded'],
    getChainDefaults: ['ChainDefaults', 'ChainDefaults is not loaded'],
    getChartsUtils: ['ChartsUtils', 'ChartsUtils is not loaded'],
    getCopyUtils: ['CopyUtils', 'CopyUtils is not loaded'],
    getDashboardActionController: ['DashboardActionController', 'DashboardActionController is not loaded'],
    getDashboardApiUtils: ['DashboardApiUtils', 'DashboardApiUtils is not loaded'],
    getDashboardCommandController: ['DashboardCommandController', 'DashboardCommandController is not loaded'],
    getDashboardDomRefs: ['DashboardDomRefs', 'DashboardDomRefs is not loaded'],
    getDashboardFormController: ['DashboardFormController', 'DashboardFormController is not loaded'],
    getDashboardLifecycleController: ['DashboardLifecycleController', 'DashboardLifecycleController is not loaded'],
    getDashboardModalUtils: ['DashboardModalUtils', 'DashboardModalUtils is not loaded'],
    getDashboardRenderer: ['DashboardRenderer', 'DashboardRenderer is not loaded'],
    getDashboardRuntimeUtils: ['DashboardRuntimeUtils', 'DashboardRuntimeUtils is not loaded'],
    getDashboardViewModeController: ['DashboardViewModeController', 'DashboardViewModeController is not loaded'],
    getDashboardViewController: ['DashboardViewController', 'DashboardViewController is not loaded'],
    getDataTerminalController: ['DataTerminalController', 'DataTerminalController is not loaded'],
    getDataTerminalUtils: ['DataTerminalUtils', 'DataTerminalUtils is not loaded'],
    getDexLinkUtils: ['DexLinkUtils', 'DexLinkUtils is not loaded'],
    getDomRenderUtils: ['DomRenderUtils', 'DomRenderUtils is not loaded'],
    getKeyboardShortcutController: ['KeyboardShortcutController', 'KeyboardShortcutController is not loaded'],
    getKeyboardShortcutUtils: ['KeyboardShortcutUtils', 'KeyboardShortcutUtils is not loaded'],
    getMutedPathLegUtils: ['MutedPathLegUtils', 'MutedPathLegUtils is not loaded'],
    getMutedPathRuntimeUtils: ['MutedPathRuntimeUtils', 'MutedPathRuntimeUtils is not loaded'],
    getMutedPathStorageUtils: ['MutedPathStorageUtils', 'MutedPathStorageUtils is not loaded'],
    getPathAlertNotificationUtils: ['PathAlertNotificationUtils', 'PathAlertNotificationUtils is not loaded'],
    getPathAlertPageUtils: ['PathAlertPageUtils', 'PathAlertPageUtils is not loaded'],
    getPathAlertRuleDefinitionsUtils: ['PathAlertRuleDefinitions', 'PathAlertRuleDefinitions is not loaded'],
    getPathAlertUtils: ['PathAlertUtils', 'PathAlertUtils is not loaded'],
    getPriceSnapshotPayloadUtils: ['PriceSnapshotPayloadUtils', 'PriceSnapshotPayloadUtils is not loaded'],
    getQueueStatsUtils: ['QueueStatsUtils', 'QueueStatsUtils is not loaded'],
    getQuoteDisplayUtils: ['QuoteDisplayUtils', 'QuoteDisplayUtils is not loaded'],
    getQuoteFetchController: ['QuoteFetchController', 'QuoteFetchController is not loaded'],
    getQuotePauseUtils: ['QuotePauseUtils', 'QuotePauseUtils is not loaded'],
    getQuoteQueueRuntimeUtils: ['QuoteQueueRuntimeUtils', 'QuoteQueueRuntimeUtils is not loaded'],
    getQuoteRequestUtils: ['QuoteRequestUtils', 'QuoteRequestUtils is not loaded'],
    getQuoteSpreadController: ['QuoteSpreadController', 'QuoteSpreadController is not loaded'],
    getQuoteSpreadUtils: ['QuoteSpreadUtils', 'QuoteSpreadUtils is not loaded'],
    getQuoteStateRuntimeUtils: ['QuoteStateRuntimeUtils', 'QuoteStateRuntimeUtils is not loaded'],
    getQuoteUiController: ['QuoteUiController', 'QuoteUiController is not loaded'],
    getRequestChannelUtils: ['RequestChannelUtils', 'RequestChannelUtils is not loaded'],
    getSpecialRuleAlertConfigUtils: ['SpecialRuleAlertConfigUtils', 'SpecialRuleAlertConfigUtils is not loaded'],
    getThemeUtils: ['ThemeUtils', 'ThemeUtils is not loaded']
  });

  function getWindowModule(windowImpl, globalName, missingMessage) {
    const loadedModule = windowImpl && windowImpl[globalName];
    if (!loadedModule) {
      throw new Error(missingMessage);
    }
    return loadedModule;
  }

  function createDashboardModuleRegistry(windowImpl) {
    const registry = {};
    for (const [getterName, definition] of Object.entries(MODULES)) {
      const [globalName, missingMessage] = definition;
      registry[getterName] = () => getWindowModule(windowImpl, globalName, missingMessage);
    }
    return registry;
  }

  return {
    MODULES,
    createDashboardModuleRegistry,
    getWindowModule
  };
});
