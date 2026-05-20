(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.KeyboardShortcutController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createKeyboardShortcutController(deps = {}) {
    const keyboardShortcutUtils = deps.keyboardShortcutUtils || (root && root.KeyboardShortcutUtils);
    const documentImpl = deps.documentImpl || (typeof document !== 'undefined' ? document : null);
    const actions = deps.actions && typeof deps.actions === 'object' ? deps.actions : {};
    let bound = false;

    function isArbDetailVisible() {
      return typeof deps.isArbDetailVisible === 'function' ? deps.isArbDetailVisible() : false;
    }

    function dispatch(action) {
      const handler = actions[action];
      if (typeof handler !== 'function') return false;
      handler();
      return true;
    }

    function handleKeydown(event) {
      if (!keyboardShortcutUtils || typeof keyboardShortcutUtils.resolveGlobalShortcutAction !== 'function') {
        return false;
      }
      const action = keyboardShortcutUtils.resolveGlobalShortcutAction(event, {
        arbDetailVisible: isArbDetailVisible()
      });
      if (!action) return false;
      if (!dispatch(action)) return false;
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      return true;
    }

    function bind() {
      if (!documentImpl || typeof documentImpl.addEventListener !== 'function') return false;
      if (bound) return false;
      documentImpl.addEventListener('keydown', handleKeydown);
      bound = true;
      return true;
    }

    return {
      bind,
      dispatch,
      handleKeydown
    };
  }

  return {
    createKeyboardShortcutController
  };
});
