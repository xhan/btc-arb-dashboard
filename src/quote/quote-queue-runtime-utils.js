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

  function createActiveFetchControllerRuntime(options = {}) {
    const controllers = new Map();
    const Controller = typeof options.AbortController === 'function'
      ? options.AbortController
      : (typeof AbortController === 'function' ? AbortController : null);

    function abort(quoteId) {
      const controller = controllers.get(quoteId);
      if (!controller) return false;
      if (typeof controller.abort === 'function') {
        controller.abort();
      }
      controllers.delete(quoteId);
      return true;
    }

    function create(quoteId) {
      abort(quoteId);
      if (!Controller) return null;
      const controller = new Controller();
      controllers.set(quoteId, controller);
      return controller;
    }

    function abortAll() {
      let abortedCount = 0;
      for (const controller of controllers.values()) {
        if (controller && typeof controller.abort === 'function') {
          controller.abort();
          abortedCount += 1;
        }
      }
      controllers.clear();
      return abortedCount;
    }

    function deleteIfCurrent(quoteId, controller) {
      if (controllers.get(quoteId) !== controller) return false;
      controllers.delete(quoteId);
      return true;
    }

    return {
      abort,
      abortAll,
      create,
      deleteIfCurrent,
      get: (quoteId) => controllers.get(quoteId) || null,
      getControllers: () => controllers,
      has: (quoteId) => controllers.has(quoteId)
    };
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
        indices[type] = -1;
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

  function createQuoteRefreshRuntime(options = {}) {
    const quoteQueueRuntime = options.quoteQueueRuntime || {};
    const activeFetchControllerRuntime = options.activeFetchControllerRuntime || {};

    function isQuotePaused(quote) {
      return typeof options.isQuotePaused === 'function' && options.isQuotePaused(quote);
    }

    function addToQueue(quote) {
      if (!quote || isQuotePaused(quote)) return false;
      if (typeof quoteQueueRuntime.addToQueue !== 'function') return false;
      quoteQueueRuntime.addToQueue(quote);
      return true;
    }

    function removeFromQueue(quoteId) {
      if (typeof quoteQueueRuntime.removeFromQueue !== 'function') return 0;
      return quoteQueueRuntime.removeFromQueue(quoteId);
    }

    function updateSchedulers() {
      if (typeof quoteQueueRuntime.updateSchedulers !== 'function') return false;
      quoteQueueRuntime.updateSchedulers();
      return true;
    }

    function queueQuoteRefresh(quote, refreshOptions = {}) {
      if (!quote || isQuotePaused(quote)) return false;
      if (refreshOptions.abortActive !== false && typeof activeFetchControllerRuntime.abort === 'function') {
        activeFetchControllerRuntime.abort(quote.id);
      }
      if (typeof options.applyActiveQuoteUiState === 'function') {
        options.applyActiveQuoteUiState(quote, {
          text: refreshOptions.text || '排队中...',
          loading: refreshOptions.loading !== false,
          clearInverse: refreshOptions.clearInverse === true
        });
      }
      addToQueue(quote);
      if (refreshOptions.updateSchedulers !== false) {
        updateSchedulers();
      }
      return true;
    }

    function getQueueMutationCallbacks() {
      return {
        removeFromQueue,
        queueQuoteRefresh,
        updateSchedulers
      };
    }

    return {
      addToQueue,
      getQueueMutationCallbacks,
      queueQuoteRefresh,
      removeFromQueue,
      updateSchedulers
    };
  }

  return {
    createActiveFetchControllerRuntime,
    createQuoteQueueRuntime,
    createQuoteRefreshRuntime
  };
});
