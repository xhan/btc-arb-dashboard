(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbDetailRefreshUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function toDelayMs(value) {
    const delayMs = Number(value);
    return Number.isFinite(delayMs) && delayMs > 0 ? delayMs : 0;
  }

  function createArbDetailRefreshScheduler(options = {}) {
    const setTimeoutImpl = typeof options.setTimeoutImpl === 'function'
      ? options.setTimeoutImpl
      : setTimeout;
    const clearTimeoutImpl = typeof options.clearTimeoutImpl === 'function'
      ? options.clearTimeoutImpl
      : clearTimeout;
    const isActive = typeof options.isActive === 'function'
      ? options.isActive
      : () => false;
    const isRefreshing = typeof options.isRefreshing === 'function'
      ? options.isRefreshing
      : () => false;
    const setRefreshing = typeof options.setRefreshing === 'function'
      ? options.setRefreshing
      : () => {};
    const refresh = typeof options.refresh === 'function'
      ? options.refresh
      : async () => false;
    const logError = typeof options.logError === 'function'
      ? options.logError
      : () => {};

    let timer = null;

    function clear() {
      if (!timer) return;
      clearTimeoutImpl(timer);
      timer = null;
    }

    function hasTimer() {
      return Boolean(timer);
    }

    function schedule(refreshToken, delayMs = 0) {
      clear();
      if (!isActive(refreshToken)) return false;
      timer = setTimeoutImpl(() => {
        timer = null;
        void runTick(refreshToken);
      }, toDelayMs(delayMs));
      return true;
    }

    async function runTick(refreshToken) {
      if (!isActive(refreshToken) || isRefreshing()) return false;
      setRefreshing(true, refreshToken);

      let shouldScheduleNext = false;
      try {
        const didRefresh = await refresh(refreshToken);
        shouldScheduleNext = Boolean(didRefresh) && isActive(refreshToken);
      } catch (error) {
        if (isActive(refreshToken)) {
          logError(error, refreshToken);
        }
      } finally {
        setRefreshing(false, refreshToken);
      }

      if (shouldScheduleNext) {
        schedule(refreshToken, options.intervalMs);
      }

      return shouldScheduleNext;
    }

    function start(refreshToken) {
      return schedule(refreshToken, 0);
    }

    return {
      clear,
      hasTimer,
      runTick,
      schedule,
      start
    };
  }

  return {
    createArbDetailRefreshScheduler
  };
}));
