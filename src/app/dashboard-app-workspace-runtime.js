(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardAppWorkspaceRuntime = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardAppWorkspaceRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function setRuntimeRef(runtimeRef, runtime) {
    return runtimeRef && typeof runtimeRef.set === 'function'
      ? runtimeRef.set(runtime)
      : runtime;
  }

  function createLoggerMethod(logger, method) {
    return (...args) => {
      if (logger && typeof logger[method] === 'function') {
        return logger[method](...args);
      }
      return undefined;
    };
  }

  function createDashboardAppWorkspaceRuntime(options = {}) {
    const modules = options.modules || {};
    const constants = options.constants || {};
    const deps = options.deps || {};
    const refs = options.refs || {};
    const timers = options.timers || {};
    const logger = deps.logger || {};

    const quoteWorkspaceRuntime = modules.getDashboardQuoteWorkspaceRuntime().createDashboardQuoteWorkspaceRuntime({
      modules,
      constants: {
        defaultIntervals: constants.defaultIntervals,
        initialQuoteDisplayMode: constants.initialQuoteDisplayMode
      },
      deps: {
        AbortController: deps.AbortController,
        backendUrl: deps.backendUrl,
        copyToastRuntime: deps.copyToastRuntime,
        dashboardRuntimeUtils: deps.dashboardRuntimeUtils,
        documentImpl: deps.documentImpl,
        domRenderUtils: deps.domRenderUtils,
        fetchImpl: deps.fetchImpl,
        getApiIntervals: deps.getApiIntervals,
        getDashboardState: deps.getDashboardState,
        getEffectiveRequestChannelIdForQuote: deps.getEffectiveRequestChannelIdForQuote,
        getQuoteMarketState: deps.getQuoteMarketState,
        isDashboardUiActive: deps.isDashboardUiActive,
        isSchedulerPaused: deps.isSchedulerPaused,
        logger,
        markDashboardUiDirty: deps.markDashboardUiDirty,
        onQuoteMainFetchSuccess: deps.onQuoteMainFetchSuccess,
        onQuoteMarketStateChanged: deps.onQuoteMarketStateChanged,
        onQuoteMarketStateChangedSideEffect: deps.onQuoteMarketStateChangedSideEffect,
        quoteRuntimeRef: deps.quoteRuntimeRef,
        quoteStateRuntime: deps.quoteStateRuntime,
        recordSourceAttempt: deps.recordSourceAttempt,
        resetQuoteUiRuntimeState: deps.resetQuoteUiRuntimeState,
        requestChannelRuntime: deps.requestChannelRuntime,
        setQuoteMarketState: deps.setQuoteMarketState,
        setTimeout: timers.setTimeout,
        clearTimeout: timers.clearTimeout
      },
      refs: {
        copyToast: refs.copyToast,
        globalTooltip: refs.globalTooltip,
        toggleQuoteDisplayBtn: refs.toggleQuoteDisplayBtn
      }
    });

    const createdArbWorkspaceRuntime = modules.getDashboardArbWorkspaceRuntime().createDashboardArbWorkspaceRuntime({
      arbAlertRuntimeRef: deps.arbAlertRuntimeRef,
      modules,
      constants: {
        arbDetailRefreshIntervalMs: constants.arbDetailRefreshIntervalMs,
        arbPanelUpdateDelayMs: constants.arbPanelUpdateDelayMs,
        chartAutoRefreshIntervalMs: constants.chartAutoRefreshIntervalMs,
        globalPathSourceSelectors: constants.globalPathSourceSelectors,
        highlightDurationMs: constants.highlightDurationMs,
        mutedStateHiddenMaxRefreshMs: constants.mutedStateHiddenMaxRefreshMs,
        mutedStateVisibleRefreshMs: constants.mutedStateVisibleRefreshMs
      },
      deps: {
        AudioCtor: deps.AudioCtor,
        abortActiveFetchControllers: deps.abortActiveFetchControllers,
        backendUrl: deps.backendUrl,
        bodyEl: deps.bodyEl,
        closestEventTarget: deps.closestEventTarget,
        copyDexLinkFromElement: quoteWorkspaceRuntime.copyDexLinkFromElement,
        copyTextToClipboard: quoteWorkspaceRuntime.copyTextToClipboard,
        dashboardRuntimeUtils: deps.dashboardRuntimeUtils,
        documentImpl: deps.documentImpl,
        domRenderUtils: deps.domRenderUtils,
        fetchImpl: deps.fetchImpl,
        fetchQuoteByStrategy: deps.fetchQuoteByStrategy,
        getActiveQuotes: quoteWorkspaceRuntime.getActiveQuotes,
        getApiIntervals: deps.getApiIntervals,
        getArbCycleStartPriority: deps.getArbCycleStartPriority,
        getDashboardLocalStorage: deps.getDashboardLocalStorage,
        getDashboardState: deps.getDashboardState,
        interactionRuntime: deps.interactionRuntime,
        getQuoteChainDisplayName: quoteWorkspaceRuntime.getQuoteChainDisplayName,
        getQuoteMarketState: deps.getQuoteMarketState,
        getQuoteMarketStateMap: deps.getQuoteMarketStateMap,
        isCrossChainQuote: quoteWorkspaceRuntime.isCrossChainQuote,
        isQuotePaused: quoteWorkspaceRuntime.isQuotePaused,
        logError: createLoggerMethod(logger, 'error'),
        logInfo: createLoggerMethod(logger, 'info'),
        logWarning: createLoggerMethod(logger, 'warn'),
        onShowDashboard: deps.onShowDashboard,
        quoteStateRuntime: deps.quoteStateRuntime,
        setQuoteMarketState: deps.setQuoteMarketState,
        showCopyToast: quoteWorkspaceRuntime.showCopyToast,
        updateSchedulers: deps.updateSchedulers,
        windowImpl: deps.windowImpl,
        zIndexRuntime: deps.zIndexRuntime
      },
      refs: {
        arbPanel: refs.arbPanel,
        alert: refs.alert,
        detail: refs.detail,
        viewMode: refs.viewMode
      },
      timers: {
        setInterval: timers.setInterval,
        clearInterval: timers.clearInterval,
        setTimeout: timers.setTimeout,
        clearTimeout: timers.clearTimeout
      }
    });
    const arbWorkspaceRuntime = setRuntimeRef(deps.arbWorkspaceRuntimeRef, createdArbWorkspaceRuntime);

    const auxPanelsRuntime = modules.getDashboardAuxPanelsRuntime().createDashboardAuxPanelsRuntime({
      modules,
      constants: {
        dataTerminalUpdateDelayMs: constants.dataTerminalUpdateDelayMs
      },
      deps: {
        applyFloatingPanelDisplay: arbWorkspaceRuntime.applyFloatingPanelDisplay,
        clearTimeout: timers.clearTimeout,
        closestEventTarget: deps.closestEventTarget,
        copyDexLinkFromElement: quoteWorkspaceRuntime.copyDexLinkFromElement,
        dashboardRuntimeUtils: deps.dashboardRuntimeUtils,
        dataTerminalRuntimeRef: deps.dataTerminalRuntimeRef,
        documentImpl: deps.documentImpl,
        domRenderUtils: deps.domRenderUtils,
        formatChainLabel: arbWorkspaceRuntime.formatChainLabel,
        formatDetailNumber: arbWorkspaceRuntime.formatDetailNumber,
        getAliasRules: arbWorkspaceRuntime.getAliasRules,
        getAnchorPanel: () => refs.arbPanel && refs.arbPanel.arbPathWindow,
        getDashboardState: deps.getDashboardState,
        getQuoteMarketStateMap: deps.getQuoteMarketStateMap,
        interactionRuntime: deps.interactionRuntime,
        isQuotePaused: quoteWorkspaceRuntime.isQuotePaused,
        quoteStateRuntime: deps.quoteStateRuntime,
        setTimeout: timers.setTimeout,
        windowImpl: deps.windowImpl,
        zIndexRuntime: deps.zIndexRuntime
      },
      refs: {
        quoteSpread: refs.quoteSpread
      },
      timers: {
        setInterval: timers.setInterval,
        clearInterval: timers.clearInterval
      }
    });

    return {
      ...quoteWorkspaceRuntime,
      ...arbWorkspaceRuntime,
      ...auxPanelsRuntime,
      quoteWorkspaceRuntime,
      arbWorkspaceRuntime,
      auxPanelsRuntime
    };
  }

  return {
    createDashboardAppWorkspaceRuntime
  };
});
