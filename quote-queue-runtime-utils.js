(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.QuoteQueueRuntimeUtils = api;
    if (root.window) {
      root.window.QuoteQueueRuntimeUtils = api;
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeSet(value) {
    if (value instanceof Set) return value;
    if (Array.isArray(value)) return new Set(value);
    return new Set();
  }

  function createQuoteQueueRuntime(options = {}) {
    const queues = {};
    const indices = {};
    const timers = {};
    const setIntervalImpl = typeof options.setInterval === 'function'
      ? options.setInterval
      : (typeof setInterval === 'function' ? setInterval : () => null);
    const clearIntervalImpl = typeof options.clearInterval === 'function'
      ? options.clearInterval
      : (typeof clearInterval === 'function' ? clearInterval : () => {});

    function ensureQueueState(type) {
      if (!Array.isArray(queues[type])) {
        queues[type] = [];
      }
      if (!Number.isInteger(indices[type])) {
        indices[type] = 0;
      }
      if (!(type in timers)) {
        timers[type] = null;
      }
      return queues[type];
    }

    function getDashboardState() {
      return typeof options.getDashboardState === 'function' ? options.getDashboardState() : [];
    }

    function findQuoteById(quoteId) {
      const dashboardState = getDashboardState();
      for (const category of Array.isArray(dashboardState) ? dashboardState : []) {
        const quotes = Array.isArray(category && category.quotes) ? category.quotes : [];
        const quote = quotes.find((item) => item && item.id === quoteId);
        if (quote) return quote;
      }
      return null;
    }

    function addToQueue(quote) {
      if (!quote || typeof options.getQueueTypeForQuote !== 'function') return 0;
      const type = options.getQueueTypeForQuote(quote);
      const queue = ensureQueueState(type);
      if (typeof options.appendQuoteQueueTasks !== 'function') return 0;
      return options.appendQuoteQueueTasks(queue, quote);
    }

    function removeFromQueue(quoteId) {
      if (typeof options.removeQuoteTasksFromQueues !== 'function') return 0;
      return options.removeQuoteTasksFromQueues(queues, quoteId);
    }

    function deferCurrentQueueTask(type) {
      const queue = ensureQueueState(type);
      if (typeof options.deferQueueTask !== 'function') return;
      indices[type] = options.deferQueueTask(queue, indices[type]);
    }

    function getQueueTaskStatus(task, type, quote) {
      if (typeof options.getQueueTaskStatus === 'function') {
        return options.getQueueTaskStatus(task, type, quote);
      }
      return quote ? { action: 'fetch' } : { action: 'remove' };
    }

    function processQueue(type) {
      const queue = ensureQueueState(type);
      if (queue.length === 0) return;

      indices[type] = (indices[type] + 1) % queue.length;
      const taskFromQueue = queue[indices[type]];
      const quoteToFetch = findQuoteById(taskFromQueue && taskFromQueue.quoteId);
      const taskStatus = getQueueTaskStatus(taskFromQueue, type, quoteToFetch);

      if (taskStatus.action === 'remove') {
        removeFromQueue(taskFromQueue && taskFromQueue.quoteId);
        return;
      }
      if (taskStatus.action === 'requeue') {
        removeFromQueue(taskFromQueue && taskFromQueue.quoteId);
        addToQueue(quoteToFetch);
        return;
      }
      if (!quoteToFetch) return;

      const hasActiveFetch = typeof options.hasActiveFetchController === 'function'
        ? options.hasActiveFetchController(quoteToFetch.id)
        : false;
      if (!hasActiveFetch) {
        if (typeof options.fetchQuote === 'function') {
          options.fetchQuote(quoteToFetch, taskFromQueue && taskFromQueue.mode);
        }
      } else {
        deferCurrentQueueTask(type);
      }
    }

    function getManagedQueueKeys() {
      if (typeof options.getManagedQueueKeys !== 'function') return new Set();
      return normalizeSet(options.getManagedQueueKeys());
    }

    function updateSchedulers() {
      const managedKeys = getManagedQueueKeys();
      const allKeys = new Set([...Object.keys(timers), ...managedKeys]);

      allKeys.forEach((type) => {
        if (timers[type]) clearIntervalImpl(timers[type]);
        timers[type] = null;

        if (!managedKeys.has(type) && (!queues[type] || queues[type].length === 0)) {
          delete queues[type];
          delete indices[type];
          delete timers[type];
          return;
        }

        ensureQueueState(type);

        const paused = typeof options.isSchedulerPaused === 'function'
          ? options.isSchedulerPaused()
          : false;
        if (paused) {
          return;
        }

        const intervalMs = typeof options.getQueueIntervalMs === 'function'
          ? options.getQueueIntervalMs(type)
          : 0;
        if (intervalMs > 0) {
          timers[type] = setIntervalImpl(() => processQueue(type), intervalMs);
        }
      });
    }

    function getQueueState() {
      return {
        queues,
        indices,
        timers
      };
    }

    return {
      addToQueue,
      getQueueState,
      processQueue,
      removeFromQueue,
      updateSchedulers
    };
  }

  return {
    createQuoteQueueRuntime
  };
});
