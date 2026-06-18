(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardAppBoardRuntime = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardAppBoardRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardAppBoardRuntime(options = {}) {
    const modules = options.modules || {};
    const deps = options.deps || {};
    const refs = options.refs || {};
    const shellRuntime = deps.dashboardShellRuntime || {};
    const workspaceRuntime = deps.dashboardAppWorkspaceRuntime || {};
    const saveData = shellRuntime.saveData || deps.saveData;
    const updateRequestChannelTagForQuote = shellRuntime.updateRequestChannelTagForQuote || deps.updateRequestChannelTagForQuote;

    function getWorkspaceDep(name) {
      return workspaceRuntime[name] || deps[name];
    }

    function getArbDetailState() {
      const arbDetailController = workspaceRuntime.arbDetailController;
      if (arbDetailController && typeof arbDetailController.getState === 'function') {
        return arbDetailController.getState();
      }
      return typeof deps.getArbDetailState === 'function' ? deps.getArbDetailState() : null;
    }

    function getRequestChannelOptions() {
      const requestChannelRuntime = shellRuntime.requestChannelRuntime || deps.requestChannelRuntime;
      if (requestChannelRuntime && typeof requestChannelRuntime.getOptions === 'function') {
        return requestChannelRuntime.getOptions();
      }
      if (typeof deps.getRequestChannelOptions === 'function') {
        return deps.getRequestChannelOptions();
      }
      return [];
    }

    const dashboardBoardRuntime = modules.getDashboardBoardRuntime().createDashboardBoardRuntime({
      addQuoteModalSelectionRuntime: shellRuntime.addQuoteModalSelectionRuntime || deps.addQuoteModalSelectionRuntime,
      confirmActionRuntime: shellRuntime.confirmActionRuntime || deps.confirmActionRuntime,
      interactionRuntime: deps.interactionRuntime,
      dashboardActionControllerUtils: modules.getDashboardActionController(),
      dashboardFormControllerUtils: modules.getDashboardFormController(),
      dashboardViewControllerUtils: modules.getDashboardViewController(),
      dashboardViewModeController: deps.dashboardViewModeController,
      dashboardViewModeControllerUtils: modules.getDashboardViewModeController(),
      dashboardViewRenderRuntimeRef: deps.dashboardViewRenderRuntimeRef,
      getRequestChannelOptions,
      quoteSettingsSelectionRuntime: shellRuntime.quoteSettingsSelectionRuntime || deps.quoteSettingsSelectionRuntime,
      refs,
      shared: {
        dashboardModalUtils: modules.getDashboardModalUtils(),
        dashboardRenderer: modules.getDashboardRenderer(),
        dashboardRuntimeUtils: deps.dashboardRuntimeUtils,
        documentImpl: deps.documentImpl,
        getDashboardState: deps.getDashboardState
      },
      actionOptions: {
        activeFetchControllerRuntime: getWorkspaceDep('activeFetchControllerRuntime'),
        amountInputDebounceRuntime: deps.amountInputDebounceRuntime,
        arbDetailUtils: modules.getArbDetailUtils(),
        closestEventTarget: deps.closestEventTarget,
        closeArbDetailModal: getWorkspaceDep('closeArbDetailModal'),
        copyDexLinkFromElement: getWorkspaceDep('copyDexLinkFromElement'),
        copyPriceText: getWorkspaceDep('copyPriceText'),
        deleteQuoteMarketState: deps.deleteQuoteMarketState,
        deleteQuoteUiRuntimeState: deps.deleteQuoteUiRuntimeState,
        domRenderUtils: deps.domRenderUtils,
        evaluatePathAlertsOnce: deps.evaluatePathAlertsOnce,
        formatChainLabel: getWorkspaceDep('formatChainLabel'),
        getArbDetailState,
        getCategoryPauseAction: getWorkspaceDep('getCategoryPauseAction'),
        getQuoteChainDisplayName: getWorkspaceDep('getQuoteChainDisplayName'),
        getQuoteMarketState: deps.getQuoteMarketState,
        isCexOrderbookChain: getWorkspaceDep('isCexOrderbookChain'),
        isCrossChainQuote: getWorkspaceDep('isCrossChainQuote'),
        isEvmChain: getWorkspaceDep('isEvmChain'),
        isQuotePaused: getWorkspaceDep('isQuotePaused'),
        normalizeChainKey: getWorkspaceDep('normalizeChainKey'),
        quotePauseUtils: modules.getQuotePauseUtils(),
        quoteStateRuntime: deps.quoteStateRuntime,
        queueQuoteRefresh: getWorkspaceDep('queueQuoteRefresh'),
        removeFromQueue: getWorkspaceDep('removeFromQueue'),
        renderDataTerminalPanel: getWorkspaceDep('renderDataTerminalPanel'),
        requestChannelUtils: modules.getRequestChannelUtils(),
        resetQuoteUiRuntimeState: deps.resetQuoteUiRuntimeState,
        saveData,
        setQuoteMarketState: deps.setQuoteMarketState,
        updateAlertSoundState: deps.updateAlertSoundState,
        updateArbPanel: deps.updateArbPanel,
        updateRequestChannelTagForQuote,
        updateSchedulers: deps.updateSchedulers
      },
      viewOptions: {
        dexLinkUtils: modules.getDexLinkUtils(),
        getCategoryPauseAction: getWorkspaceDep('getCategoryPauseAction'),
        getInverseQuoteDisplayText: getWorkspaceDep('getInverseQuoteDisplayText'),
        getQuoteChainDisplayName: getWorkspaceDep('getQuoteChainDisplayName'),
        getQuoteDisplayText: getWorkspaceDep('getQuoteDisplayText'),
        getQuoteMarketState: deps.getQuoteMarketState,
        handleQuoteHover: getWorkspaceDep('handleQuoteHover'),
        isCexOrderbookChain: getWorkspaceDep('isCexOrderbookChain'),
        isCrossChainQuote: getWorkspaceDep('isCrossChainQuote'),
        isQuotePaused: getWorkspaceDep('isQuotePaused'),
        logger: deps.logger,
        quoteDisplayUtils: modules.getQuoteDisplayUtils(),
        requestChannelUtils: modules.getRequestChannelUtils(),
        saveData,
        shouldQueueInverseFetch: getWorkspaceDep('shouldQueueInverseFetch')
      },
      formOptions: {
        defaultSourceResolver: getWorkspaceDep('defaultSourceResolver'),
        formatChainLabel: getWorkspaceDep('formatChainLabel'),
        isCexOrderbookChain: getWorkspaceDep('isCexOrderbookChain'),
        isCrossChainQuote: getWorkspaceDep('isCrossChainQuote'),
        isEvmChain: getWorkspaceDep('isEvmChain'),
        normalizeChainKey: getWorkspaceDep('normalizeChainKey'),
        pathAlertPageUtils: modules.getPathAlertPageUtils(),
        queueQuoteRefresh: getWorkspaceDep('queueQuoteRefresh'),
        removeFromQueue: getWorkspaceDep('removeFromQueue'),
        requestChannelUtils: modules.getRequestChannelUtils(),
        saveData,
        updateRequestChannelTagForQuote,
        windowImpl: deps.windowImpl
      }
    });

    return {
      dashboardBoardRuntime,
      dashboardFormController: dashboardBoardRuntime.dashboardFormController,
      handleDashboardClick: dashboardBoardRuntime.handleDashboardClick,
      handleDashboardInput: dashboardBoardRuntime.handleDashboardInput,
      openAddCategoryModal: dashboardBoardRuntime.openAddCategoryModal
    };
  }

  return {
    createDashboardAppBoardRuntime
  };
});
