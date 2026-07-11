(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.DashboardArbWorkspaceRuntime = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildArbAlertOptions(options = {}) {
    const modules = options.modules || {};
    const deps = options.deps || {};
    const refs = options.refs || {};
    const constants = options.constants || {};
    const timers = options.timers || {};
    return {
      AudioCtor: deps.AudioCtor,
      alertDebugUtils: modules.getAlertDebugUtils(),
      alertLogUiUtils: modules.getAlertLogUiUtils(),
      alertRuntimeControllerUtils: modules.getAlertRuntimeController(),
      arbAlertBridgeUtils: modules.getArbAlertBridgeUtils(),
      arbPanelControllerUtils: modules.getArbPanelController(),
      arbCyclePriorityUtils: modules.getArbCyclePriorityUtils(),
      arbDetailUtils: modules.getArbDetailUtils(),
      arbDiscoveryUtils: modules.getArbDiscovery(),
      arbEquivalenceUtils: modules.getArbEquivalenceUtils(),
      arbFixedUtils: modules.getArbFixedUtils(),
      arbPanelLayoutUtils: modules.getArbPanelLayoutUtils(),
      arbPanelRenderer: modules.getArbPanelRenderer(),
      arbPathConfig: modules.getArbPathConfig(),
      arbPathConfigUtils: modules.getArbPathConfigUtils(),
      arbPaths: modules.getArbPaths(),
      arbPathTemplateCacheUtils: modules.getArbPathTemplateCacheUtils(),
      arbRuleSnapshotUtils: modules.getArbRuleSnapshotUtils(),
      arbRuntimeMemoryUtils: modules.getArbRuntimeMemoryUtils(),
      arbSpecialUtils: modules.getArbSpecialUtils(),
      audioUtils: modules.getAudioUtils(),
      backendUrl: deps.backendUrl,
      bodyEl: deps.bodyEl,
      chainDefaults: modules.getChainDefaults(),
      closestEventTarget: deps.closestEventTarget,
      copyDexLinkFromElement: deps.copyDexLinkFromElement,
      dashboardRuntimeUtils: deps.dashboardRuntimeUtils,
      documentImpl: deps.documentImpl,
      domRenderUtils: deps.domRenderUtils,
      fetchImpl: deps.fetchImpl,
      getActiveQuotes: deps.getActiveQuotes,
      getArbCycleStartPriority: deps.getArbCycleStartPriority,
      getDashboardLocalStorage: deps.getDashboardLocalStorage,
      getDashboardState: deps.getDashboardState,
      interactionRuntime: deps.interactionRuntime,
      getQuoteChainDisplayName: deps.getQuoteChainDisplayName,
      getQuoteMarketState: deps.getQuoteMarketState,
      getQuoteMarketStateMap: deps.getQuoteMarketStateMap,
      globalPathSourceSelectors: constants.globalPathSourceSelectors,
      highlightDurationMs: constants.highlightDurationMs,
      isCrossChainQuote: deps.isCrossChainQuote,
      isQuotePaused: deps.isQuotePaused,
      logError: deps.logError,
      logInfo: deps.logInfo,
      logWarning: deps.logWarning,
      mutedPathLegUtils: modules.getMutedPathLegUtils(),
      mutedPathRuntimeUtils: modules.getMutedPathRuntimeUtils(),
      mutedPathStorageUtils: modules.getMutedPathStorageUtils(),
      mutedStateHiddenMaxRefreshMs: constants.mutedStateHiddenMaxRefreshMs,
      mutedStateVisibleRefreshMs: constants.mutedStateVisibleRefreshMs,
      pathAlertNotificationUtils: modules.getPathAlertNotificationUtils(),
      pathAlertPageUtils: modules.getPathAlertPageUtils(),
      pathAlertRuleDefinitions: modules.getPathAlertRuleDefinitionsUtils(),
      pathAlertUtils: modules.getPathAlertUtils(),
      quoteDisplayUtils: modules.getQuoteDisplayUtils(),
      quoteStateRuntime: deps.quoteStateRuntime,
      specialRuleAlertConfigUtils: modules.getSpecialRuleAlertConfigUtils(),
      arbPanelRefs: refs.arbPanel,
      alertRefs: refs.alert,
      setTimeout: timers.setTimeout,
      clearTimeout: timers.clearTimeout,
      updateDelayMs: constants.arbPanelUpdateDelayMs,
      windowImpl: deps.windowImpl,
      zIndexRuntime: deps.zIndexRuntime
    };
  }

  function buildViewModeOptions(options = {}) {
    const deps = options.deps || {};
    const refs = options.refs || {};
    return {
      bodyEl: deps.bodyEl,
      onShowDashboard: deps.onShowDashboard,
      refs: refs.viewMode
    };
  }

  function buildDetailOptions(options = {}) {
    const modules = options.modules || {};
    const deps = options.deps || {};
    const refs = options.refs || {};
    const constants = options.constants || {};
    const timers = options.timers || {};
    const windowImpl = deps.windowImpl || {};
    function notifyQuoteMarketStateChanged(quote, state, context) {
      if (typeof deps.onQuoteMarketStateChanged === 'function') {
        deps.onQuoteMarketStateChanged(quote, state, context);
      }
      if (typeof deps.onQuoteMarketStateChangedSideEffect === 'function') {
        deps.onQuoteMarketStateChangedSideEffect(quote, state, context);
      }
    }
    return {
      arbDetailRefreshUtils: modules.getArbDetailRefreshUtils(),
      arbDetailUtils: modules.getArbDetailUtils(),
      arbPanelLayoutUtils: modules.getArbPanelLayoutUtils(),
      abortActiveFetchControllers: deps.abortActiveFetchControllers,
      chartAutoRefreshIntervalMs: constants.chartAutoRefreshIntervalMs,
      closestEventTarget: deps.closestEventTarget,
      copyDexLinkFromElement: deps.copyDexLinkFromElement,
      copyTextToClipboard: deps.copyTextToClipboard,
      detailRefreshIntervalMs: constants.arbDetailRefreshIntervalMs,
      documentImpl: deps.documentImpl,
      domRenderUtils: deps.domRenderUtils,
      fetchImpl: deps.fetchImpl,
      fetchQuoteByStrategy: deps.fetchQuoteByStrategy,
      getApiIntervals: deps.getApiIntervals,
      getChartsRenderer: () => windowImpl.ChartsRenderer || null,
      getChartsUtils: modules.getChartsUtils,
      getQuoteMarketState: deps.getQuoteMarketState,
      logRefreshError: (error) => deps.logError('[arb-detail] refresh failed', error),
      onQuoteMarketStateChanged: notifyQuoteMarketStateChanged,
      promptImpl: windowImpl.prompt ? windowImpl.prompt.bind(windowImpl) : null,
      promptMutedPathLegDurationHours: (promptImpl) => modules.getMutedPathLegUtils().promptMutedPathLegDurationHours(promptImpl),
      refs: refs.detail,
      setQuoteMarketState: deps.setQuoteMarketState,
      showCopyToast: deps.showCopyToast,
      updateSchedulers: deps.updateSchedulers,
      windowImpl,
      setTimeout: timers.setTimeout,
      clearTimeout: timers.clearTimeout
    };
  }

  function createDashboardArbWorkspaceRuntime(options = {}) {
    let arbDetailController = null;
    const modules = options.modules || {};
    const arbAlertRuntimeOptions = options.arbAlertOptions || buildArbAlertOptions(options);
    const viewModeOptions = options.viewModeOptions || buildViewModeOptions(options);
    const detailOptions = options.detailOptions || buildDetailOptions(options);
    const dashboardArbAlertRuntimeUtils = options.dashboardArbAlertRuntimeUtils || modules.getDashboardArbAlertRuntime();
    const dashboardViewModeControllerUtils = options.dashboardViewModeControllerUtils || modules.getDashboardViewModeController();
    const arbDetailControllerUtils = options.arbDetailControllerUtils || modules.getArbDetailController();

    const createdArbAlertRuntime = dashboardArbAlertRuntimeUtils.createDashboardArbAlertRuntime({
      ...arbAlertRuntimeOptions,
      getArbDetailController: () => arbDetailController
    });
    const arbAlertRuntime = options.arbAlertRuntimeRef && typeof options.arbAlertRuntimeRef.set === 'function'
      ? options.arbAlertRuntimeRef.set(createdArbAlertRuntime)
      : createdArbAlertRuntime;
    const alertRuntimeController = arbAlertRuntime.alertRuntimeController;

    const dashboardViewModeController = dashboardViewModeControllerUtils.createDashboardViewModeController({
      ...viewModeOptions,
      setArbPanelMaxHeight: arbAlertRuntime.setArbPanelMaxHeight,
      updateArbPanel: arbAlertRuntime.updateArbPanel
    });

    arbDetailController = arbDetailControllerUtils.createArbDetailController({
      ...detailOptions,
      buildArbPathLegLineOptions: arbAlertRuntime.buildArbPathLegLineOptions,
      findQuoteById: arbAlertRuntime.findQuoteById,
      formatChainLabel: arbAlertRuntime.formatChainLabel,
      formatDetailNumber: arbAlertRuntime.formatDetailNumber,
      getOpportunity: (opportunityId) => arbAlertRuntime.getOpportunity(opportunityId),
      isRuleLeg: arbAlertRuntime.isRuleLeg,
      muteLeg: (row, durationHours, nowMs) => alertRuntimeController.muteArbDetailLeg(row, durationHours, nowMs),
      refreshOpportunities: () => arbAlertRuntime.updateArbPanel()
    });

    function closeArbDetailModal(...args) {
      return arbDetailController.close(...args);
    }

    function openArbDetailModal(...args) {
      return arbDetailController.open(...args);
    }

    function renderArbDetailModal(...args) {
      return arbDetailController.render(...args);
    }

    return {
      alertRuntimeController,
      arbAlertRuntime,
      arbDetailController,
      arbPanelController: arbAlertRuntime.arbPanelController,
      dashboardViewModeController,
      closeArbDetailModal,
      openArbDetailModal,
      renderArbDetailModal,
      applyFloatingPanelDisplay: arbAlertRuntime.applyFloatingPanelDisplay,
      buildArbPathLegLineOptions: arbAlertRuntime.buildArbPathLegLineOptions,
      buildLiveQuoteLabel: arbAlertRuntime.buildLiveQuoteLabel,
      clearTopologyCache: arbAlertRuntime.clearTopologyCache,
      findQuoteById: arbAlertRuntime.findQuoteById,
      formatArbPathLegLine: arbAlertRuntime.formatArbPathLegLine,
      formatChainLabel: arbAlertRuntime.formatChainLabel,
      formatDetailNumber: arbAlertRuntime.formatDetailNumber,
      getAliasRules: arbAlertRuntime.getAliasRules,
      getSharedArbRuleSnapshot: arbAlertRuntime.getSharedArbRuleSnapshot,
      handleQuoteMarketStateChanged: arbAlertRuntime.handleQuoteMarketStateChanged,
      handleQuoteMainFetchSuccess: arbAlertRuntime.handleQuoteMainFetchSuccess,
      invalidateArbRuleSnapshotCache: arbAlertRuntime.invalidateArbRuleSnapshotCache,
      isRuleLeg: arbAlertRuntime.isRuleLeg,
      scheduleArbPanelUpdate: arbAlertRuntime.scheduleArbPanelUpdate,
      setArbPanelMaxHeight: arbAlertRuntime.setArbPanelMaxHeight,
      updateArbPanel: arbAlertRuntime.updateArbPanel
    };
  }

  return {
    buildArbAlertOptions,
    buildDetailOptions,
    buildViewModeOptions,
    createDashboardArbWorkspaceRuntime
  };
}));
