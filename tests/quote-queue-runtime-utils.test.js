const assert = require('assert');

const { createQuoteQueueRuntime } = require('../quote-queue-runtime-utils');

function createRuntimeHarness(overrides = {}) {
  let dashboardState = overrides.dashboardState || [];
  const activeQuoteIds = new Set(overrides.activeQuoteIds || []);
  const fetched = [];
  const deferred = [];
  const intervalCalls = [];
  const clearedTimers = [];
  const intervals = overrides.intervals || { kyber: 25, velora: 50 };

  const runtime = createQuoteQueueRuntime({
    getDashboardState: () => dashboardState,
    getQueueTypeForQuote: (quote) => quote.queueKey || 'kyber',
    getQueueIntervalMs: (type) => intervals[type] || 0,
    getManagedQueueKeys: () => new Set(Object.keys(intervals)),
    appendQuoteQueueTasks: (queue, quote) => {
      const task = { quoteId: quote.id, mode: quote.mode || 'main' };
      if (!queue.some((item) => item.quoteId === task.quoteId && item.mode === task.mode)) {
        queue.push(task);
        return 1;
      }
      return 0;
    },
    removeQuoteTasksFromQueues: (queues, quoteId) => {
      let removedCount = 0;
      Object.keys(queues).forEach((type) => {
        const queue = Array.isArray(queues[type]) ? queues[type] : [];
        queues[type] = queue.filter((task) => task && task.quoteId !== quoteId);
        removedCount += queue.length - queues[type].length;
      });
      return removedCount;
    },
    deferQueueTask: (queue, currentIndex) => {
      deferred.push({ queue: queue.slice(), currentIndex });
      if (!Array.isArray(queue) || queue.length <= 1) return currentIndex;
      const [task] = queue.splice(currentIndex, 1);
      queue.push(task);
      return (currentIndex - 1 + queue.length) % queue.length;
    },
    getQueueTaskStatus: (task, type, quote) => {
      if (!quote) return { action: 'remove' };
      const currentType = quote.queueKey || 'kyber';
      if (currentType !== type) return { action: 'requeue' };
      return { action: 'fetch' };
    },
    isSchedulerPaused: () => overrides.paused === true,
    hasActiveFetchController: (quoteId) => activeQuoteIds.has(quoteId),
    fetchQuote: (quote, mode) => fetched.push({ quoteId: quote.id, mode }),
    setInterval: (handler, intervalMs) => {
      const timerId = `timer-${intervalCalls.length + 1}`;
      intervalCalls.push({ handler, intervalMs, timerId });
      return timerId;
    },
    clearInterval: (timerId) => clearedTimers.push(timerId)
  });

  return {
    activeQuoteIds,
    clearedTimers,
    deferred,
    fetched,
    intervalCalls,
    runtime,
    setDashboardState: (nextState) => {
      dashboardState = nextState;
    }
  };
}

{
  const quote = { id: 101, queueKey: 'kyber' };
  const harness = createRuntimeHarness({
    dashboardState: [{ id: 1, quotes: [quote] }]
  });

  assert.strictEqual(harness.runtime.addToQueue(quote), 1);
  assert.strictEqual(harness.runtime.addToQueue(quote), 0);
  harness.runtime.updateSchedulers();

  assert.strictEqual(harness.intervalCalls.length, 2);
  assert.strictEqual(harness.intervalCalls[0].intervalMs, 25);
  harness.intervalCalls[0].handler();
  assert.deepStrictEqual(harness.fetched, [{ quoteId: 101, mode: 'main' }]);
}

{
  const quote = { id: 201, queueKey: 'kyber' };
  const harness = createRuntimeHarness({
    dashboardState: [{ id: 1, quotes: [quote] }]
  });

  harness.runtime.addToQueue(quote);
  harness.setDashboardState([]);
  harness.runtime.processQueue('kyber');

  assert.deepStrictEqual(harness.runtime.getQueueState().queues.kyber, []);
  assert.deepStrictEqual(harness.fetched, []);
}

{
  const quote = { id: 301, queueKey: 'velora' };
  const harness = createRuntimeHarness({
    dashboardState: [{ id: 1, quotes: [quote] }]
  });
  const state = harness.runtime.getQueueState();
  state.queues.kyber = [{ quoteId: 301, mode: 'main' }];
  state.indices.kyber = 0;
  state.timers.kyber = null;

  harness.runtime.processQueue('kyber');

  assert.deepStrictEqual(state.queues.kyber, []);
  assert.deepStrictEqual(state.queues.velora, [{ quoteId: 301, mode: 'main' }]);
  assert.deepStrictEqual(harness.fetched, []);
}

{
  const quote = { id: 401, queueKey: 'kyber' };
  const harness = createRuntimeHarness({
    dashboardState: [{ id: 1, quotes: [quote] }],
    activeQuoteIds: [401]
  });

  harness.runtime.addToQueue(quote);
  harness.runtime.processQueue('kyber');

  assert.deepStrictEqual(harness.fetched, []);
  assert.strictEqual(harness.deferred.length, 1);
}

{
  const harness = createRuntimeHarness({ paused: true });

  harness.runtime.updateSchedulers();

  assert.deepStrictEqual(harness.intervalCalls, []);
  assert.deepStrictEqual(harness.runtime.getQueueState().timers, {
    kyber: null,
    velora: null
  });
}
