(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardCoreRuntime = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardCoreRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardCoreRuntime(options = {}) {
    const modules = options.modules || {};
    const constants = options.constants || {};
    const deps = options.deps || {};
    const timers = options.timers || {};
    const dashboardRuntimeUtils = modules.getDashboardRuntimeUtils();
    const domRenderUtils = modules.getDomRenderUtils();
    const closestEventTarget = domRenderUtils.closestEventTarget;
    const dashboardInputInteractionRuntime = domRenderUtils.createRenderInteractionHoldRuntime({
      clearTimeout: timers.clearTimeout,
      eventListenerOptions: { capture: true },
      idleDelayMs: 80,
      setTimeout: timers.setTimeout,
      trackFocus: false
    });
    dashboardInputInteractionRuntime.bind(deps.documentImpl);

    const defaultIntervals = { ...modules.getQueueStatsUtils().DEFAULT_INTERVALS };
    const defaultArbCycleStartPriority = modules.getArbCyclePriorityUtils().DEFAULT_ARB_CYCLE_START_PRIORITY;
    const appStateRuntime = modules.getDashboardAppStateRuntime().createDashboardAppStateRuntime({
      defaultIntervals,
      defaultArbCycleStartPriority,
      defaultPriceSnapshotConfig: { enabled: false, intervalSec: 10 }
    });
    const getDashboardState = appStateRuntime.getDashboardState;
    const setDashboardState = appStateRuntime.setDashboardState;
    const getApiIntervals = appStateRuntime.getApiIntervals;
    const setApiIntervals = appStateRuntime.setApiIntervals;
    const getArbCycleStartPriority = appStateRuntime.getArbCycleStartPriority;
    const setArbCycleStartPriority = appStateRuntime.setArbCycleStartPriority;
    const getPriceSnapshotConfig = appStateRuntime.getPriceSnapshotConfig;
    const setPriceSnapshotConfig = appStateRuntime.setPriceSnapshotConfig;
    const dashboardApiClient = modules.getDashboardApiUtils().createDashboardApiClient({
      backendUrl: deps.backendUrl,
      fetchImpl: deps.fetchImpl,
      logger: deps.logger
    });
    function getDashboardLocalStorage() {
      return dashboardRuntimeUtils.getBrowserLocalStorage({ window: deps.windowImpl }, {
        onError: (error) => {
          if (deps.logger && typeof deps.logger.warn === 'function') {
            deps.logger.warn('访问浏览器本地缓存失败:', error);
          }
        }
      });
    }

    const dashboardRuntimeBridge = modules.getDashboardRuntimeRefUtils().createDashboardRuntimeBridge();
    const floatingPanelZIndexRuntime = domRenderUtils.createFloatingPanelZIndexRuntime({
      baseZIndex: constants.floatingPanelBaseZIndex
    });
    const quoteStateRuntime = modules.getQuoteStateRuntimeUtils().createQuoteStateRuntime({
      dashboardRuntimeUtils,
      clearTimeout: timers.clearTimeout,
      onMarketStateChanged: () => dashboardRuntimeBridge.invalidateArbRuleSnapshotCache({ bumpRevision: false })
    });
    const getQuoteMarketState = quoteStateRuntime.getMarketState;
    const getQuoteMarketStateMap = quoteStateRuntime.getMarketStateMap;
    const setQuoteMarketState = quoteStateRuntime.setMarketState;
    const deleteQuoteMarketState = quoteStateRuntime.deleteMarketState;
    const resetQuoteUiRuntimeState = quoteStateRuntime.resetUiRuntimeState;
    const deleteQuoteUiRuntimeState = quoteStateRuntime.deleteUiRuntimeState;

    const priceSnapshotPayloadUtils = modules.getPriceSnapshotPayloadUtils();
    const priceSnapshotTimerRuntime = priceSnapshotPayloadUtils.createPriceSnapshotTimerRuntime({
      setInterval: timers.setInterval,
      clearInterval: timers.clearInterval
    });
    const priceSnapshotSaveRuntime = priceSnapshotPayloadUtils.createPriceSnapshotSaveRuntime({
      getConfig: getPriceSnapshotConfig,
      buildPayload: () => priceSnapshotPayloadUtils.buildPriceSnapshotPayload({
        dashboardState: getDashboardState(),
        quoteStateById: getQuoteMarketStateMap(),
        clientCapturedAt: new Date().toISOString()
      }),
      savePayload: (payload) => dashboardApiClient.savePriceSnapshot(payload),
      logWarning: (...args) => {
        if (deps.logger && typeof deps.logger.warn === 'function') {
          deps.logger.warn(...args);
        }
      }
    });
    const amountInputDebounceRuntime = dashboardRuntimeUtils.createInputDebounceRuntime({
      setTimeout: timers.setTimeout,
      clearTimeout: timers.clearTimeout,
      delayMs: constants.amountInputDebounceMs
    });

    return {
      dashboardRuntimeUtils,
      domRenderUtils,
      closestEventTarget,
      dashboardInputInteractionRuntime,
      defaultIntervals,
      defaultArbCycleStartPriority,
      appStateRuntime,
      getDashboardState,
      setDashboardState,
      getApiIntervals,
      setApiIntervals,
      getArbCycleStartPriority,
      setArbCycleStartPriority,
      getPriceSnapshotConfig,
      setPriceSnapshotConfig,
      dashboardApiClient,
      getDashboardLocalStorage,
      dashboardRuntimeBridge,
      floatingPanelZIndexRuntime,
      quoteStateRuntime,
      getQuoteMarketState,
      getQuoteMarketStateMap,
      setQuoteMarketState,
      deleteQuoteMarketState,
      resetQuoteUiRuntimeState,
      deleteQuoteUiRuntimeState,
      priceSnapshotTimerRuntime,
      priceSnapshotSaveRuntime,
      amountInputDebounceRuntime
    };
  }

  return {
    createDashboardCoreRuntime
  };
});
