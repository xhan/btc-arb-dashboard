(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.DashboardQuoteRuntime = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function flattenDashboardQuotes(dashboardState) {
    return Array.isArray(dashboardState)
      ? dashboardState.flatMap((category) => Array.isArray(category && category.quotes) ? category.quotes : [])
      : [];
  }

  function createDashboardQuoteRuntime(options = {}) {
    const activeFetchControllerRuntime = options.quoteQueueRuntimeUtils.createActiveFetchControllerRuntime({
      AbortController: options.AbortController
    });
    const requestChannelRuntime = options.requestChannelRuntime;

    const quoteFetchController = options.quoteFetchControllerUtils.createQuoteFetchController({
      activeFetchControllerRuntime,
      backendUrl: options.backendUrl,
      chainDefaults: options.chainDefaults,
      dashboardRuntimeUtils: options.dashboardRuntimeUtils,
      documentImpl: options.documentImpl,
      domRenderUtils: options.domRenderUtils,
      fetchImpl: options.fetchImpl,
      getEffectiveRequestChannelIdForQuote: options.getEffectiveRequestChannelIdForQuote,
      getInverseQuoteDisplayText: options.getInverseQuoteDisplayText,
      getQuoteDisplayMode: options.getQuoteDisplayMode,
      getQuoteDisplayText: options.getQuoteDisplayText,
      getQuoteMarketState: options.getQuoteMarketState,
      isDashboardUiActive: options.isDashboardUiActive,
      isQuotePaused: options.isQuotePaused,
      logWarning: options.logWarning,
      markDashboardUiDirty: options.markDashboardUiDirty,
      onQuoteMainFetchSuccess: options.onQuoteMainFetchSuccess,
      onQuoteMarketStateChanged: options.onQuoteMarketStateChanged,
      quoteDisplayUtils: options.quoteDisplayUtils,
      quoteRequestUtils: options.quoteRequestUtils,
      recordSourceAttempt: options.recordSourceAttempt,
      resetQuoteUiRuntimeState: options.resetQuoteUiRuntimeState,
      setQuoteMarketState: options.setQuoteMarketState,
      shouldQueueInverseFetch: options.shouldQueueInverseFetch,
      updateQuotePairLabel: options.updateQuotePairLabel,
      updateTrendArrow: options.updateTrendArrow
    });

    const quoteQueueRuntime = options.quoteQueueRuntimeUtils.createQuoteQueueRuntime({
      getDashboardState: options.getDashboardState,
      getQueueTypeForQuote: (quote) => options.queueStatsUtils.getQueueTypeForQuote(quote, requestChannelRuntime.getOptions(), {
        multiChannelEnabled: requestChannelRuntime.isMultiChannelEnabled()
      }),
      getQueueIntervalMs: (type) => options.requestChannelUtils.getEffectiveIntervalForQueue(type, options.getApiIntervals(), requestChannelRuntime.getOptions()),
      getManagedQueueKeys: () => options.queueStatsUtils.buildManagedQueueKeys({
        defaultIntervals: options.defaultIntervals,
        requestChannels: requestChannelRuntime.getOptions(),
        multiChannelEnabled: requestChannelRuntime.isMultiChannelEnabled(),
        quotes: flattenDashboardQuotes(options.getDashboardState())
      }),
      appendQuoteQueueTasks: (queue, quote) => options.queueStatsUtils.appendQuoteQueueTasks(queue, quote),
      removeQuoteTasksFromQueues: (queueState, quoteId) => options.queueStatsUtils.removeQuoteTasksFromQueues(queueState, quoteId),
      deferQueueTask: (queue, index) => options.queueStatsUtils.deferQueueTask(queue, index),
      getQueueTaskStatus: (task, type, quote) => options.queueStatsUtils.getQueueTaskStatus(
        task,
        type,
        quote,
        requestChannelRuntime.getOptions(),
        { multiChannelEnabled: requestChannelRuntime.isMultiChannelEnabled() }
      ),
      isSchedulerPaused: options.isSchedulerPaused,
      hasActiveFetchController: (quoteId) => activeFetchControllerRuntime.has(quoteId),
      fetchQuote: (quote, mode) => quoteFetchController.fetchSingle(quote, mode)
    });

    const quoteRefreshRuntime = options.quoteQueueRuntimeUtils.createQuoteRefreshRuntime({
      activeFetchControllerRuntime,
      applyActiveQuoteUiState: options.applyActiveQuoteUiState,
      isQuotePaused: options.isQuotePaused,
      quoteQueueRuntime
    });

    function toggleMultiChannel() {
      return requestChannelRuntime.toggleMultiChannel(
        options.getDashboardState(),
        quoteRefreshRuntime.getQueueMutationCallbacks()
      );
    }

    return {
      abortActiveFetchControllers: () => activeFetchControllerRuntime.abortAll(),
      activeFetchControllerRuntime,
      addToQueue: quoteRefreshRuntime.addToQueue,
      fetchQuoteByStrategy: quoteFetchController.fetchByStrategy,
      fetchSingleQuote: quoteFetchController.fetchSingle,
      quoteFetchController,
      quoteQueueRuntime,
      quoteRefreshRuntime,
      queueQuoteRefresh: quoteRefreshRuntime.queueQuoteRefresh,
      removeFromQueue: quoteRefreshRuntime.removeFromQueue,
      toggleMultiChannel,
      updateSchedulers: quoteRefreshRuntime.updateSchedulers
    };
  }

  return {
    createDashboardQuoteRuntime,
    flattenDashboardQuotes
  };
}));
