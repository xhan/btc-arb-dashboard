(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardCommandController = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardCommandController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeCommandId(commandId) {
    return String(commandId || '').trim();
  }

  function createDashboardCommandController(options = {}) {
    const actions = options.actions && typeof options.actions === 'object'
      ? options.actions
      : {};

    function dispatch(commandId, ...args) {
      const id = normalizeCommandId(commandId);
      if (!id || typeof actions[id] !== 'function') return false;
      actions[id](...args);
      return true;
    }

    function bindAction(commandId) {
      return (...args) => dispatch(commandId, ...args);
    }

    function buildActionMap(commandIds = []) {
      return commandIds.reduce((result, commandId) => {
        const id = normalizeCommandId(commandId);
        if (id) result[id] = bindAction(id);
        return result;
      }, {});
    }

    return {
      bindAction,
      buildActionMap,
      dispatch
    };
  }

  return {
    createDashboardCommandController,
    normalizeCommandId
  };
});
