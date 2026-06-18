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
    const saveData = shellRuntime.saveData || deps.saveData;
    const updateRequestChannelTagForQuote = shellRuntime.updateRequestChannelTagForQuote || deps.updateRequestChannelTagForQuote;

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
        activeFetchControllerRuntime: deps.activeFetchControllerRuntime,
        amountInputDebounceRuntime: deps.amountInputDebounceRuntime,
        arbDetailUtils: modules.getArbDetailUtils(),
        closestEventTarget: deps.closestEventTarget,
        closeArbDetailModal: deps.closeArbDetailModal,
        copyDexLinkFromElement: deps.copyDexLinkFromElement,
        copyPriceText: deps.copyPriceText,
        deleteQuoteMarketState: deps.deleteQuoteMarketState,
        deleteQuoteUiRuntimeState: deps.deleteQuoteUiRuntimeState,
        domRenderUtils: deps.domRenderUtils,
        evaluatePathAlertsOnce: deps.evaluatePathAlertsOnce,
        formatChainLabel: deps.formatChainLabel,
        getArbDetailState: deps.getArbDetailState,
        getCategoryPauseAction: deps.getCategoryPauseAction,
        getQuoteChainDisplayName: deps.getQuoteChainDisplayName,
        getQuoteMarketState: deps.getQuoteMarketState,
        isCexOrderbookChain: deps.isCexOrderbookChain,
        isCrossChainQuote: deps.isCrossChainQuote,
        isEvmChain: deps.isEvmChain,
        isQuotePaused: deps.isQuotePaused,
        normalizeChainKey: deps.normalizeChainKey,
        quotePauseUtils: modules.getQuotePauseUtils(),
        quoteStateRuntime: deps.quoteStateRuntime,
        queueQuoteRefresh: deps.queueQuoteRefresh,
        removeFromQueue: deps.removeFromQueue,
        renderDataTerminalPanel: deps.renderDataTerminalPanel,
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
        getCategoryPauseAction: deps.getCategoryPauseAction,
        getInverseQuoteDisplayText: deps.getInverseQuoteDisplayText,
        getQuoteChainDisplayName: deps.getQuoteChainDisplayName,
        getQuoteDisplayText: deps.getQuoteDisplayText,
        getQuoteMarketState: deps.getQuoteMarketState,
        handleQuoteHover: deps.handleQuoteHover,
        isCexOrderbookChain: deps.isCexOrderbookChain,
        isCrossChainQuote: deps.isCrossChainQuote,
        isQuotePaused: deps.isQuotePaused,
        logger: deps.logger,
        quoteDisplayUtils: modules.getQuoteDisplayUtils(),
        requestChannelUtils: modules.getRequestChannelUtils(),
        saveData,
        shouldQueueInverseFetch: deps.shouldQueueInverseFetch
      },
      formOptions: {
        defaultSourceResolver: deps.defaultSourceResolver,
        formatChainLabel: deps.formatChainLabel,
        isCexOrderbookChain: deps.isCexOrderbookChain,
        isCrossChainQuote: deps.isCrossChainQuote,
        isEvmChain: deps.isEvmChain,
        normalizeChainKey: deps.normalizeChainKey,
        pathAlertPageUtils: modules.getPathAlertPageUtils(),
        queueQuoteRefresh: deps.queueQuoteRefresh,
        removeFromQueue: deps.removeFromQueue,
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
