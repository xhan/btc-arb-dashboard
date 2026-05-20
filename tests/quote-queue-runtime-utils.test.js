const assert = require('assert');

const {
  createActiveFetchControllerRuntime,
  createQuoteQueueRuntime,
  createQuoteRefreshRuntime
} = require('../src/quote/quote-queue-runtime-utils');

class FakeAbortController {
  constructor() {
    this.signal = { id: `signal-${FakeAbortController.instances.length + 1}` };
    this.aborted = false;
    FakeAbortController.instances.push(this);
  }

  abort() {
    this.aborted = true;
  }
}
FakeAbortController.instances = [];

{
  const fetchRuntime = createActiveFetchControllerRuntime({ AbortController: FakeAbortController });
  const first = fetchRuntime.create(101);
  assert.strictEqual(fetchRuntime.has(101), true);
  assert.strictEqual(fetchRuntime.get(101), first);
  const second = fetchRuntime.create(101);
  assert.strictEqual(first.aborted, true, 'creating a new controller should abort the previous one for the same quote');
  assert.strictEqual(fetchRuntime.get(101), second);
  assert.strictEqual(fetchRuntime.deleteIfCurrent(101, first), false);
  assert.strictEqual(fetchRuntime.deleteIfCurrent(101, second), true);
  assert.strictEqual(fetchRuntime.has(101), false);
  fetchRuntime.create(201);
  fetchRuntime.create(202);
  assert.strictEqual(fetchRuntime.abortAll(), 2);
  assert.strictEqual(fetchRuntime.getControllers().size, 0);
}

{
  const calls = [];
  const quoteQueueRuntime = {
    addToQueue: (quote) => calls.push(['add', quote.id]),
    removeFromQueue: (quoteId) => {
      calls.push(['remove', quoteId]);
      return 1;
    },
    updateSchedulers: () => calls.push(['updateSchedulers'])
  };
  const refreshRuntime = createQuoteRefreshRuntime({
    activeFetchControllerRuntime: {
      abort: (quoteId) => calls.push(['abort', quoteId])
    },
    applyActiveQuoteUiState: (quote, state) => calls.push(['activeUi', quote.id, state]),
    isQuotePaused: (quote) => quote.paused === true,
    quoteQueueRuntime
  });

  assert.strictEqual(refreshRuntime.addToQueue({ id: 101, paused: true }), false);
  assert.strictEqual(refreshRuntime.queueQuoteRefresh({ id: 102 }), true);
  assert.deepStrictEqual(calls, [
    ['abort', 102],
    ['activeUi', 102, { text: '排队中...', loading: true, clearInverse: false }],
    ['add', 102],
    ['updateSchedulers']
  ]);

  calls.length = 0;
  assert.strictEqual(refreshRuntime.queueQuoteRefresh({ id: 103 }, {
    abortActive: false,
    clearInverse: true,
    loading: false,
    text: '等待下一轮',
    updateSchedulers: false
  }), true);
  assert.deepStrictEqual(calls, [
    ['activeUi', 103, { text: '等待下一轮', loading: false, clearInverse: true }],
    ['add', 103]
  ]);
  assert.strictEqual(refreshRuntime.removeFromQueue(103), 1);
  assert.strictEqual(refreshRuntime.updateSchedulers(), true);
  assert.deepStrictEqual(refreshRuntime.getQueueMutationCallbacks(), {
    removeFromQueue: refreshRuntime.removeFromQueue,
    queueQuoteRefresh: refreshRuntime.queueQuoteRefresh,
    updateSchedulers: refreshRuntime.updateSchedulers
  });
}

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
      const tasks = Array.isArray(quote.tasks) && quote.tasks.length
        ? quote.tasks.map((mode) => ({ quoteId: quote.id, mode }))
        : [{ quoteId: quote.id, mode: quote.mode || 'main' }];
      let addedCount = 0;
      for (const task of tasks) {
        if (!queue.some((item) => item.quoteId === task.quoteId && item.mode === task.mode)) {
          queue.push(task);
          addedCount += 1;
        }
      }
      return addedCount;
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
  const quote = { id: 151, queueKey: 'kyber', tasks: ['main', 'inverse'] };
  const harness = createRuntimeHarness({
    dashboardState: [{ id: 1, quotes: [quote] }]
  });

  assert.strictEqual(harness.runtime.addToQueue(quote), 2);
  harness.runtime.processQueue('kyber');
  harness.runtime.processQueue('kyber');

  assert.deepStrictEqual(harness.fetched, [
    { quoteId: 151, mode: 'main' },
    { quoteId: 151, mode: 'inverse' }
  ]);
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
