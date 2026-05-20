(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardAppStateRuntime = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardAppStateRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardAppStateRuntime(options = {}) {
    let dashboardState = [];
    let apiIntervals = { ...(options.defaultIntervals || {}) };
    let arbCycleStartPriority = Array.from(options.defaultArbCycleStartPriority || []);
    let priceSnapshotConfig = { ...(options.defaultPriceSnapshotConfig || {}) };

    function setDashboardState(nextState) {
      dashboardState = nextState;
      return dashboardState;
    }

    function setApiIntervals(nextIntervals) {
      apiIntervals = nextIntervals;
      return apiIntervals;
    }

    function setArbCycleStartPriority(nextPriority) {
      arbCycleStartPriority = nextPriority;
      return arbCycleStartPriority;
    }

    function setPriceSnapshotConfig(nextConfig) {
      priceSnapshotConfig = nextConfig;
      return priceSnapshotConfig;
    }

    return {
      getDashboardState: () => dashboardState,
      setDashboardState,
      getApiIntervals: () => apiIntervals,
      setApiIntervals,
      getArbCycleStartPriority: () => arbCycleStartPriority,
      setArbCycleStartPriority,
      getPriceSnapshotConfig: () => priceSnapshotConfig,
      setPriceSnapshotConfig
    };
  }

  return {
    createDashboardAppStateRuntime
  };
});
