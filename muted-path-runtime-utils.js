(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MutedPathRuntimeUtils = api;
    if (root.window) {
      root.window.MutedPathRuntimeUtils = api;
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeList(value) {
    return Array.isArray(value) ? value : [];
  }

  function createMutedPathRuntime(options = {}) {
    let mutedPathTargets = [];
    let mutedPathLegs = [];
    let timer = null;
    const setTimeoutImpl = typeof options.setTimeout === 'function'
      ? options.setTimeout
      : (typeof setTimeout === 'function' ? setTimeout : () => null);
    const clearTimeoutImpl = typeof options.clearTimeout === 'function'
      ? options.clearTimeout
      : (typeof clearTimeout === 'function' ? clearTimeout : () => {});
    const nowImpl = typeof options.now === 'function' ? options.now : () => Date.now();

    function getTargets() {
      return mutedPathTargets;
    }

    function setTargets(entries) {
      mutedPathTargets = normalizeList(entries);
      return mutedPathTargets;
    }

    function getLegs() {
      return mutedPathLegs;
    }

    function setLegs(entries) {
      mutedPathLegs = normalizeList(entries);
      return mutedPathLegs;
    }

    function getTimer() {
      return timer;
    }

    function pruneTargets(nowMs = nowImpl()) {
      if (typeof options.pruneTargets === 'function') {
        mutedPathTargets = normalizeList(options.pruneTargets(mutedPathTargets, nowMs));
      }
      return mutedPathTargets;
    }

    function pruneLegs(nowMs = nowImpl()) {
      if (typeof options.pruneLegs === 'function') {
        mutedPathLegs = normalizeList(options.pruneLegs(mutedPathLegs, nowMs));
      }
      return mutedPathLegs;
    }

    function getLegKeySnapshot(buildLegKey) {
      const buildKey = typeof buildLegKey === 'function' ? buildLegKey : () => '';
      return mutedPathLegs.map((entry) => buildKey(entry)).join('|');
    }

    function hasEntries() {
      return Boolean(mutedPathTargets.length || mutedPathLegs.length);
    }

    function clearTimer() {
      if (!timer) return false;
      clearTimeoutImpl(timer);
      timer = null;
      return true;
    }

    function resolveRefreshDelay(nowMs) {
      if (typeof options.resolveRefreshDelay !== 'function') return null;
      return options.resolveRefreshDelay({
        mutedPathTargets,
        mutedPathLegs,
        nowMs
      });
    }

    function scheduleRefresh(nowMs, refreshRuntime) {
      clearTimer();
      const delayMs = resolveRefreshDelay(nowMs);
      if (delayMs === null) return null;
      timer = setTimeoutImpl(() => {
        timer = null;
        const nextNow = nowImpl();
        if (typeof refreshRuntime === 'function' && refreshRuntime(nextNow)) {
          scheduleRefresh(nextNow, refreshRuntime);
        }
      }, delayMs);
      return timer;
    }

    function syncRefresh(refreshRuntime) {
      const nowMs = nowImpl();
      if (typeof refreshRuntime !== 'function' || !refreshRuntime(nowMs)) {
        clearTimer();
        return null;
      }
      return scheduleRefresh(nowMs, refreshRuntime);
    }

    return {
      clearTimer,
      getLegKeySnapshot,
      getLegs,
      getTargets,
      getTimer,
      hasEntries,
      pruneLegs,
      pruneTargets,
      scheduleRefresh,
      setLegs,
      setTargets,
      syncRefresh
    };
  }

  return {
    createMutedPathRuntime
  };
});
