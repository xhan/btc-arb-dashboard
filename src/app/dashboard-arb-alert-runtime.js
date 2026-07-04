(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.DashboardArbAlertRuntime = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardArbAlertRuntime(options = {}) {
    let alertRuntimeController = null;
    let arbPanelController = null;

    const pathAlertRuleDefinitions = options.pathAlertRuleDefinitions || {};
    const fixedPathRules = pathAlertRuleDefinitions.FIXED_PATH_RULES || [];
    const specialArbRules = pathAlertRuleDefinitions.SPECIAL_ARB_RULES || [];
    const arbOpportunityRuntime = options.arbRuntimeMemoryUtils.createArbOpportunityRuntime();
    const arbOpportunityHighlightRuntime = options.arbRuntimeMemoryUtils.createArbOpportunityHighlightRuntime({
      durationMs: options.highlightDurationMs,
      setTimer: options.setTimeout,
      clearTimer: options.clearTimeout,
      onExpired: () => {
        if (arbPanelController && typeof arbPanelController.update === 'function') {
          arbPanelController.update();
        }
      }
    });

    function getArbDetailController() {
      return typeof options.getArbDetailController === 'function'
        ? options.getArbDetailController()
        : null;
    }

    function closeArbDetailModal() {
      const controller = getArbDetailController();
      if (controller && typeof controller.close === 'function') {
        controller.close();
      }
    }

    function renderArbDetailModal() {
      const controller = getArbDetailController();
      if (controller && typeof controller.render === 'function') {
        controller.render();
      }
    }

    function isArbDetailVisible() {
      const controller = getArbDetailController();
      return Boolean(controller && typeof controller.isVisible === 'function' && controller.isVisible());
    }

    function updateArbPanel() {
      return arbPanelController && typeof arbPanelController.update === 'function'
        ? arbPanelController.update()
        : false;
    }

    function invalidateArbRuleSnapshotCache() {
      return arbPanelController && typeof arbPanelController.invalidateRuleSnapshotCache === 'function'
        ? arbPanelController.invalidateRuleSnapshotCache()
        : false;
    }

    function openArbDetailModal(opportunityId) {
      const controller = getArbDetailController();
      if (controller && typeof controller.open === 'function') {
        controller.open(opportunityId);
      }
    }

    function buildQuoteAlertDisplayLabel(quote, monitorState, direction) {
      return alertRuntimeController && typeof alertRuntimeController.buildQuoteAlertDisplayLabel === 'function'
        ? alertRuntimeController.buildQuoteAlertDisplayLabel(quote, monitorState, direction)
        : '';
    }

    function handleQuoteMarketStateChanged(quote, state, context = {}) {
      if (alertRuntimeController && typeof alertRuntimeController.schedulePathAlertEvaluation === 'function') {
        alertRuntimeController.schedulePathAlertEvaluation({
          fetchMode: context.fetchMode,
          quoteId: quote && quote.id,
          reason: 'quote-market-state-changed'
        });
      }
      if (
        (context.isInverseFetch === true || context.fetchMode === 'inverse')
        && alertRuntimeController
        && typeof alertRuntimeController.checkPriceForAlerts === 'function'
      ) {
        alertRuntimeController.checkPriceForAlerts(quote, context);
      }
      return arbPanelController && typeof arbPanelController.scheduleUpdate === 'function'
        ? arbPanelController.scheduleUpdate()
        : false;
    }

    function handleQuoteMainFetchSuccess(quote, context = {}) {
      return alertRuntimeController && typeof alertRuntimeController.checkPriceForAlerts === 'function'
        ? alertRuntimeController.checkPriceForAlerts(quote, context)
        : false;
    }

    const arbAlertBridgeRuntime = options.arbAlertBridgeUtils.createArbAlertBridgeRuntime({
      arbOpportunityRuntime,
      arbOpportunityHighlightRuntime,
      arbPanelLayoutUtils: options.arbPanelLayoutUtils,
      closeArbDetailModal,
      fixedPathRules,
      getAlertRuntimeController: () => alertRuntimeController,
      invalidateArbRuleSnapshotCache,
      isArbDetailVisible,
      renderArbDetailModal,
      specialArbRules,
      specialRuleAlertConfigUtils: options.specialRuleAlertConfigUtils,
      updateArbPanel
    });

    arbPanelController = options.arbPanelControllerUtils.createArbPanelController({
      arbAlertBridgeRuntime,
      arbCyclePriorityUtils: options.arbCyclePriorityUtils,
      arbDetailUtils: options.arbDetailUtils,
      arbEquivalenceUtils: options.arbEquivalenceUtils,
      arbFixedUtils: options.arbFixedUtils,
      arbOpportunityHighlightRuntime,
      arbOpportunityRuntime,
      arbPanelLayoutUtils: options.arbPanelLayoutUtils,
      arbPanelRenderer: options.arbPanelRenderer,
      arbPathConfig: options.arbPathConfig,
      arbPathConfigUtils: options.arbPathConfigUtils,
      arbPaths: options.arbPaths,
      arbPathTemplateCacheUtils: options.arbPathTemplateCacheUtils,
      arbRuleSnapshotUtils: options.arbRuleSnapshotUtils,
      arbRuntimeMemoryUtils: options.arbRuntimeMemoryUtils,
      arbSpecialUtils: options.arbSpecialUtils,
      chainDefaults: options.chainDefaults,
      closestEventTarget: options.closestEventTarget,
      dashboardRuntimeUtils: options.dashboardRuntimeUtils,
      documentImpl: options.documentImpl,
      domRenderUtils: options.domRenderUtils,
      fixedPathRules,
      getActiveQuotes: options.getActiveQuotes,
      getArbCycleStartPriority: options.getArbCycleStartPriority,
      getArbDetailController,
      getAlertConfig: () => (
        alertRuntimeController && typeof alertRuntimeController.getConfig === 'function'
          ? alertRuntimeController.getConfig()
          : null
      ),
      getDashboardState: options.getDashboardState,
      getQuoteMarketState: options.getQuoteMarketState,
      getQuoteMarketStateMap: options.getQuoteMarketStateMap,
      globalPathSourceSelectors: options.globalPathSourceSelectors,
      interactionRuntime: options.interactionRuntime,
      isQuotePaused: options.isQuotePaused,
      mutedPathLegUtils: options.mutedPathLegUtils,
      openArbDetailModal,
      pathAlertPageUtils: options.pathAlertPageUtils,
      pathAlertRuleDefinitions,
      quoteDisplayUtils: options.quoteDisplayUtils,
      quoteStateRuntime: options.quoteStateRuntime,
      refs: options.arbPanelRefs,
      setTimeout: options.setTimeout,
      clearTimeout: options.clearTimeout,
      specialArbRules,
      updateDelayMs: options.updateDelayMs,
      windowImpl: options.windowImpl,
      zIndexRuntime: options.zIndexRuntime,
      buildQuoteAlertDisplayLabel
    });

    alertRuntimeController = options.alertRuntimeControllerUtils.createAlertRuntimeController({
      alertDebugUtils: options.alertDebugUtils,
      alertLogUiUtils: options.alertLogUiUtils,
      arbAlertBridgeRuntime,
      arbPathConfig: options.arbPathConfig,
      arbPathConfigUtils: options.arbPathConfigUtils,
      applyFloatingPanelDisplay: arbPanelController.applyFloatingPanelDisplay,
      arbDetailUtils: options.arbDetailUtils,
      arbRuntimeMemoryUtils: options.arbRuntimeMemoryUtils,
      audioUtils: options.audioUtils,
      backendUrl: options.backendUrl,
      bodyEl: options.bodyEl,
      AudioCtor: options.AudioCtor,
      buildLiveQuoteLabel: arbPanelController.buildLiveQuoteLabel,
      closestEventTarget: options.closestEventTarget,
      copyDexLinkFromElement: options.copyDexLinkFromElement,
      dashboardRuntimeUtils: options.dashboardRuntimeUtils,
      documentImpl: options.documentImpl,
      domRenderUtils: options.domRenderUtils,
      fetchImpl: options.fetchImpl,
      findQuoteById: arbPanelController.findQuoteById,
      formatArbPathLegLine: arbPanelController.formatArbPathLegLine,
      formatDetailNumber: arbPanelController.formatDetailNumber,
      getDashboardLocalStorage: options.getDashboardLocalStorage,
      getDashboardState: options.getDashboardState,
      getQuoteChainDisplayName: options.getQuoteChainDisplayName,
      getQuoteMarketState: options.getQuoteMarketState,
      getQuoteMarketStateMap: options.getQuoteMarketStateMap,
      getSharedArbRuleSnapshot: arbPanelController.getSharedRuleSnapshot,
      isCrossChainQuote: options.isCrossChainQuote,
      isQuotePaused: options.isQuotePaused,
      isRuleLeg: arbPanelController.isRuleLeg,
      interactionRuntime: options.interactionRuntime,
      logError: options.logError,
      logInfo: options.logInfo,
      logWarning: options.logWarning,
      mutedPathLegUtils: options.mutedPathLegUtils,
      mutedPathRuntimeUtils: options.mutedPathRuntimeUtils,
      mutedPathStorageUtils: options.mutedPathStorageUtils,
      mutedStateHiddenMaxRefreshMs: options.mutedStateHiddenMaxRefreshMs,
      mutedStateVisibleRefreshMs: options.mutedStateVisibleRefreshMs,
      pathAlertNotificationUtils: options.pathAlertNotificationUtils,
      pathAlertPageUtils: options.pathAlertPageUtils,
      pathAlertRuleDefinitions,
      pathAlertUtils: options.pathAlertUtils,
      quoteDisplayUtils: options.quoteDisplayUtils,
      quoteStateRuntime: options.quoteStateRuntime,
      refs: options.alertRefs,
      setInterval: options.setInterval,
      clearInterval: options.clearInterval,
      setTimeout: options.setTimeout,
      clearTimeout: options.clearTimeout,
      windowImpl: options.windowImpl
    });

    if (options.bindAudioUnlockEvents !== false && typeof alertRuntimeController.bindAudioUnlockEvents === 'function') {
      alertRuntimeController.bindAudioUnlockEvents();
    }

    return {
      alertRuntimeController,
      arbAlertBridgeRuntime,
      arbOpportunityHighlightRuntime,
      arbOpportunityRuntime,
      arbPanelController,
      applyFloatingPanelDisplay: arbPanelController.applyFloatingPanelDisplay,
      buildArbPathLegLineOptions: arbPanelController.buildArbPathLegLineOptions,
      buildLiveQuoteLabel: arbPanelController.buildLiveQuoteLabel,
      clearTopologyCache: arbPanelController.clearTopologyCache,
      findQuoteById: arbPanelController.findQuoteById,
      formatArbPathLegLine: arbPanelController.formatArbPathLegLine,
      formatChainLabel: arbPanelController.formatChainLabel,
      formatDetailNumber: arbPanelController.formatDetailNumber,
      getAliasRules: arbPanelController.getAliasRules,
      getOpportunity: arbOpportunityRuntime.getOpportunity,
      getSharedArbRuleSnapshot: arbPanelController.getSharedRuleSnapshot,
      handleQuoteMarketStateChanged,
      handleQuoteMainFetchSuccess,
      invalidateArbRuleSnapshotCache: arbPanelController.invalidateRuleSnapshotCache,
      isRuleLeg: arbPanelController.isRuleLeg,
      scheduleArbPanelUpdate: arbPanelController.scheduleUpdate,
      setArbPanelMaxHeight: arbPanelController.setMaxHeight,
      updateArbPanel: arbPanelController.update
    };
  }

  return {
    createDashboardArbAlertRuntime
  };
}));
