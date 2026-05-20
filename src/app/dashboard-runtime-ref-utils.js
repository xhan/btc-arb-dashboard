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

  return {
    createDashboardRuntimeRef
  };
});
