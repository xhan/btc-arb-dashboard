(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.DashboardQuoteWorkspaceRuntime = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getLoggerWarning(logger) {
    return logger && typeof logger.warn === 'function'
      ? (...args) => logger.warn(...args)
      : () => {};
  }

  function callIfFunction(handler, ...args) {
    if (typeof handler === 'function') {
      return handler(...args);
    }
    return undefined;
  }

  function buildQuoteDomainAdapterOptions(options = {}) {
    const modules = options.modules || {};
    return {
      chainDefaults: modules.getChainDefaults(),
      queueStatsUtils: modules.getQueueStatsUtils(),
      quotePauseUtils: modules.getQuotePauseUtils(),
      quoteRequestUtils: modules.getQuoteRequestUtils()
    };
  }

  function buildQuoteUiOptions(options = {}, quoteDomainAdapter) {
    const modules = options.modules || {};
    const deps = options.deps || {};
    const refs = options.refs || {};
    const constants = options.constants || {};
    return {
      copyToast: refs.copyToast,
      copyToastRuntime: deps.copyToastRuntime,
      copyUtils: modules.getCopyUtils(),
      dexLinkUtils: modules.getDexLinkUtils(),
      documentImpl: deps.documentImpl,
      domRenderUtils: deps.domRenderUtils,
      getDashboardState: deps.getDashboardState,
      getQuoteMarketState: deps.getQuoteMarketState,
      globalTooltip: refs.globalTooltip,
      initialQuoteDisplayMode: constants.initialQuoteDisplayMode,
      isEvmChain: quoteDomainAdapter.isEvmChain,
      isDashboardUiActive: deps.isDashboardUiActive,
      isQuotePaused: quoteDomainAdapter.isQuotePaused,
      logger: deps.logger,
      markDashboardUiDirty: deps.markDashboardUiDirty,
      quoteDisplayUtils: modules.getQuoteDisplayUtils(),
      quotePauseUtils: modules.getQuotePauseUtils(),
      quoteStateRuntime: deps.quoteStateRuntime,
      toggleQuoteDisplayBtn: refs.toggleQuoteDisplayBtn,
      setTimeout: deps.setTimeout,
      clearTimeout: deps.clearTimeout
    };
  }

  function buildQuoteRuntimeOptions(options = {}, quoteDomainAdapter, quoteUiController, callbacks = {}) {
    const modules = options.modules || {};
    const deps = options.deps || {};
    const constants = options.constants || {};
    return {
      AbortController: deps.AbortController,
      backendUrl: deps.backendUrl,
      chainDefaults: modules.getChainDefaults(),
      dashboardRuntimeUtils: deps.dashboardRuntimeUtils,
      defaultIntervals: constants.defaultIntervals,
      documentImpl: deps.documentImpl,
      domRenderUtils: deps.domRenderUtils,
      fetchImpl: deps.fetchImpl,
      getApiIntervals: deps.getApiIntervals,
      getDashboardState: deps.getDashboardState,
      getEffectiveRequestChannelIdForQuote: deps.getEffectiveRequestChannelIdForQuote,
      getInverseQuoteDisplayText: quoteUiController.getInverseQuoteDisplayText,
      getQuoteDisplayMode: quoteUiController.getQuoteDisplayMode,
      getQuoteDisplayText: quoteUiController.getQuoteDisplayText,
      getQuoteMarketState: deps.getQuoteMarketState,
      isDashboardUiActive: deps.isDashboardUiActive,
      isQuotePaused: quoteDomainAdapter.isQuotePaused,
      isSchedulerPaused: typeof deps.isSchedulerPaused === 'function'
        ? deps.isSchedulerPaused
        : () => false,
      logWarning: deps.logWarning || getLoggerWarning(deps.logger),
      markDashboardUiDirty: deps.markDashboardUiDirty,
      onQuoteMainFetchSuccess: deps.onQuoteMainFetchSuccess,
      onQuoteMarketStateChanged: callbacks.onQuoteMarketStateChanged,
      applyActiveQuoteUiState: quoteUiController.applyActiveQuoteUiState,
      queueStatsUtils: modules.getQueueStatsUtils(),
      quoteDisplayUtils: modules.getQuoteDisplayUtils(),
      quoteFetchControllerUtils: modules.getQuoteFetchController(),
      quoteQueueRuntimeUtils: modules.getQuoteQueueRuntimeUtils(),
      quoteRequestUtils: modules.getQuoteRequestUtils(),
      recordSourceAttempt: deps.recordSourceAttempt,
      resetQuoteUiRuntimeState: deps.resetQuoteUiRuntimeState,
      requestChannelRuntime: deps.requestChannelRuntime,
      requestChannelUtils: modules.getRequestChannelUtils(),
      setQuoteMarketState: deps.setQuoteMarketState,
      shouldQueueInverseFetch: quoteDomainAdapter.shouldQueueInverseFetch,
      updateQuotePairLabel: quoteUiController.updateQuotePairLabel,
      updateTrendArrow: quoteUiController.updateTrendArrow
    };
  }

  function setRuntimeRef(ref, value) {
    if (ref && typeof ref.set === 'function') {
      return ref.set(value);
    }
    return value;
  }

  function createDashboardQuoteWorkspaceRuntime(options = {}) {
    const modules = options.modules || {};
    const deps = options.deps || {};
    const quoteDomainAdapterUtils = options.quoteDomainAdapterUtils || modules.getDashboardQuoteDomainAdapter();
    const quoteUiControllerUtils = options.quoteUiControllerUtils || modules.getQuoteUiController();
    const quoteRuntimeUtils = options.quoteRuntimeUtils || modules.getDashboardQuoteRuntime();

    const quoteDomainAdapter = quoteDomainAdapterUtils.createDashboardQuoteDomainAdapter(
      options.quoteDomainAdapterOptions || buildQuoteDomainAdapterOptions(options)
    );
    const quoteUiController = quoteUiControllerUtils.createQuoteUiController(
      options.quoteUiOptions || buildQuoteUiOptions(options, quoteDomainAdapter)
    );

    function handleQuoteMarketStateChanged(quote, state, context) {
      callIfFunction(deps.onQuoteMarketStateChanged, quote, state, context);
      callIfFunction(deps.onQuoteMarketStateChangedSideEffect, quote, state, context);
    }

    const createdQuoteRuntime = quoteRuntimeUtils.createDashboardQuoteRuntime(
      options.quoteRuntimeOptions || buildQuoteRuntimeOptions(options, quoteDomainAdapter, quoteUiController, {
        onQuoteMarketStateChanged: handleQuoteMarketStateChanged
      })
    );
    const quoteRuntime = setRuntimeRef(deps.quoteRuntimeRef, createdQuoteRuntime);

    return {
      quoteDomainAdapter,
      quoteUiController,
      quoteRuntime,
      activeFetchControllerRuntime: quoteRuntime.activeFetchControllerRuntime,
      addToQueue: quoteRuntime.addToQueue,
      applyActiveQuoteUiState: quoteUiController.applyActiveQuoteUiState,
      applyPausedQuoteUiState: quoteUiController.applyPausedQuoteUiState,
      applyQuoteDisplayToggleButtonState: quoteUiController.applyQuoteDisplayToggleButtonState,
      copyDexLinkFromElement: quoteUiController.copyDexLinkFromElement,
      copyPriceText: quoteUiController.copyPriceText,
      copyTextToClipboard: quoteUiController.copyTextToClipboard,
      defaultSourceResolver: quoteDomainAdapter.getDefaultSourceForChain,
      getActiveQuotes: quoteDomainAdapter.getActiveQuotes,
      getCategoryPauseAction: quoteDomainAdapter.getCategoryPauseAction,
      getDefaultSourceForChain: quoteDomainAdapter.getDefaultSourceForChain,
      getInverseQuoteDisplayText: quoteUiController.getInverseQuoteDisplayText,
      getQuoteChainDisplayName: quoteDomainAdapter.getQuoteChainDisplayName,
      getQuoteDisplayMode: quoteUiController.getQuoteDisplayMode,
      getQuoteDisplayText: quoteUiController.getQuoteDisplayText,
      handleQuoteHover: quoteUiController.handleQuoteHover,
      isCexOrderbookChain: quoteDomainAdapter.isCexOrderbookChain,
      isCrossChainQuote: quoteDomainAdapter.isCrossChainQuote,
      isEvmChain: quoteDomainAdapter.isEvmChain,
      isQuotePaused: quoteDomainAdapter.isQuotePaused,
      normalizeChainKey: quoteDomainAdapter.normalizeChainKey,
      queueQuoteRefresh: quoteRuntime.queueQuoteRefresh,
      removeFromQueue: quoteRuntime.removeFromQueue,
      shouldQueueInverseFetch: quoteDomainAdapter.shouldQueueInverseFetch,
      showCopyToast: quoteUiController.showCopyToast,
      toggleMultiChannel: quoteRuntime.toggleMultiChannel,
      toggleQuoteDisplayMode: quoteUiController.toggleQuoteDisplayMode,
      updateQuotePairLabel: quoteUiController.updateQuotePairLabel,
      updateTrendArrow: quoteUiController.updateTrendArrow
    };
  }

  return {
    buildQuoteDomainAdapterOptions,
    buildQuoteRuntimeOptions,
    buildQuoteUiOptions,
    createDashboardQuoteWorkspaceRuntime
  };
}));
