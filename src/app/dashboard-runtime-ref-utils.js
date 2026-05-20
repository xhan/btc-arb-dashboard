(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardRuntimeRefUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardRuntimeRefUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardRuntimeRef(options = {}) {
    const name = options.name || 'Dashboard runtime';
    let runtime = null;

    function get() {
      if (!runtime) {
        throw new Error(`${name} is not initialized`);
      }
      return runtime;
    }

    function set(nextRuntime) {
      runtime = nextRuntime;
      return runtime;
    }

    function call(methodName, ...args) {
      const target = get();
      if (typeof target[methodName] !== 'function') {
        throw new Error(`${name}.${methodName} is not available`);
      }
      return target[methodName](...args);
    }

    function callOr(defaultValue, methodName, ...args) {
      const target = runtime;
      if (!target || typeof target[methodName] !== 'function') {
        return defaultValue;
      }
      return target[methodName](...args);
    }

    return {
      call,
      callOr,
      get,
      peek: () => runtime,
      set
    };
  }

  function createDashboardRuntimeBridge() {
    const quoteRuntimeRef = createDashboardRuntimeRef({ name: 'Dashboard quote runtime' });
    const arbAlertRuntimeRef = createDashboardRuntimeRef({ name: 'Dashboard arb alert runtime' });
    const dashboardViewRenderRuntimeRef = createDashboardRuntimeRef({ name: 'Dashboard view render runtime' });

    return {
      quoteRuntimeRef,
      arbAlertRuntimeRef,
      dashboardViewRenderRuntimeRef,
      abortActiveFetchControllers: () => quoteRuntimeRef.call('abortActiveFetchControllers'),
      fetchQuoteByStrategy: (quote, options) => quoteRuntimeRef.call('fetchQuoteByStrategy', quote, options),
      updateSchedulers: () => quoteRuntimeRef.call('updateSchedulers'),
      invalidateArbRuleSnapshotCache: (options) => arbAlertRuntimeRef.call('invalidateArbRuleSnapshotCache', options),
      updateArbPanel: (options) => arbAlertRuntimeRef.call('updateArbPanel', options),
      isDashboardViewActive: () => Boolean(dashboardViewRenderRuntimeRef.callOr(false, 'isActive')),
      markDashboardViewDirty: () => dashboardViewRenderRuntimeRef.callOr(false, 'markDirty'),
      renderDashboardForCurrentState: () => dashboardViewRenderRuntimeRef.callOr(false, 'renderNow'),
      ensureDashboardRendered: () => dashboardViewRenderRuntimeRef.callOr(false, 'ensureRendered')
    };
  }

  return {
    createDashboardRuntimeBridge,
    createDashboardRuntimeRef
  };
});
