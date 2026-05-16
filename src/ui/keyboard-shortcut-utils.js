(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.KeyboardShortcutUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.KeyboardShortcutUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SHORTCUT_ACTIONS = {
    t: 'toggle-arb-panel',
    s: 'toggle-data-terminal',
    p: 'toggle-quote-display',
    a: 'toggle-path-alert',
    l: 'toggle-alert-log',
    c: 'toggle-request-channel-tags'
  };

  function isTypingShortcutTarget(target) {
    if (!target || typeof target.closest !== 'function') return false;
    if (target.isContentEditable) return true;
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function resolveGlobalShortcutAction(event, state = {}) {
    if (!event) return null;
    if (event.defaultPrevented) return null;
    if (event.metaKey || event.ctrlKey || event.altKey) return null;
    if (isTypingShortcutTarget(event.target)) return null;

    const key = String(event.key || '').toLowerCase();
    if (!key) return null;
    if (key === 'escape') {
      return state.arbDetailVisible ? 'close-arb-detail' : null;
    }
    return SHORTCUT_ACTIONS[key] || null;
  }

  return {
    isTypingShortcutTarget,
    resolveGlobalShortcutAction
  };
});
