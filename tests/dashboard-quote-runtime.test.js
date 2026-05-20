const assert = require('assert');

const {
  createDashboardQuoteRuntime,
  flattenDashboardQuotes
} = require('../src/app/dashboard-quote-runtime');

assert.deepStrictEqual(
  flattenDashboardQuotes([{ quotes: [{ id: 1 }] }, { quotes: null }, { quotes: [{ id: 2 }] }]),
  [{ id: 1 }, { id: 2 }]
);
assert.deepStrictEqual(flattenDashboardQuotes(null), []);

const calls = [];
const activeFetchControllerRuntime = {
  abortAll: () => {
    calls.push(['abortAll']);
    return 2;
  },
  has: (quoteId) => {
    calls.push(['hasActive', quoteId]);
    return quoteId === 1;
  }
};
let queueOptions = null;
let refreshOptions = null;
const quoteQueueRuntimeUtils = {
  createActiveFetchControllerRuntime(options = {}) {
    calls.push(['createActive', options.AbortController && options.AbortController.name]);
    return activeFetchControllerRuntime;
  },
  createQuoteQueueRuntime(options = {}) {
    calls.push(['createQueue']);
    queueOptions = options;
    return {
      addToQueue: (quote) => calls.push(['queueAdd', quote.id]),
      removeFromQueue: (quoteId) => {
        calls.push(['queueRemove', quoteId]);
        return 1;
      },
      updateSchedulers: () => calls.push(['queueUpdate'])
    };
  },
  createQuoteRefreshRuntime(options = {}) {
    calls.push(['createRefresh', options.activeFetchControllerRuntime === activeFetchControllerRuntime]);
    refreshOptions = options;
    return {
      addToQueue: (quote) => {
        calls.push(['refreshAdd', quote.id]);
        return true;
      },
      queueQuoteRefresh: (quote, refreshOptionsArg) => {
        calls.push(['refreshQueue', quote.id, refreshOptionsArg || null]);
        return true;
      },
      removeFromQueue: (quoteId) => {
        calls.push(['refreshRemove', quoteId]);
        return 1;
      },
      updateSchedulers: () => {
        calls.push(['refreshUpdate']);
        return true;
      },
      getQueueMutationCallbacks: () => {
        calls.push(['getCallbacks']);
        return { id: 'callbacks' };
      }
    };
  }
};

let fetchOptions = null;
const quoteFetchControllerUtils = {
  createQuoteFetchController(options = {}) {
    calls.push(['createFetch', options.activeFetchControllerRuntime === activeFetchControllerRuntime]);
    fetchOptions = options;
    return {
      fetchByStrategy: (quote, fetchOptionsArg) => ({ quote, fetchOptions: fetchOptionsArg }),
      fetchSingle: (quote, mode) => ({ quote, mode })
    };
  }
};

const dashboardState = [{ quotes: [{ id: 1 }, { id: 2 }] }];
const requestChannelRuntime = {
  getOptions: () => ({ channels: ['default'] }),
  isMultiChannelEnabled: () => true,
  toggleMultiChannel: (state, callbacks) => {
    calls.push(['toggleMulti', state, callbacks]);
    return true;
  }
};
const queueStatsUtils = {
  getQueueTypeForQuote: (quote, requestChannels, options) => {
    calls.push(['queueType', quote.id, requestChannels, options]);
    return 'main';
  },
  buildManagedQueueKeys: (config) => {
    calls.push(['managedKeys', config.quotes.map((quote) => quote.id)]);
    return new Set(['main']);
  },
  appendQuoteQueueTasks: (queue, quote) => {
    calls.push(['appendTasks', quote.id]);
    return 1;
  },
  removeQuoteTasksFromQueues: (queueState, quoteId) => {
    calls.push(['removeTasks', quoteId]);
    return 1;
  },
  deferQueueTask: (queue, index) => {
    calls.push(['deferTask', index]);
    return index;
  },
  getQueueTaskStatus: (task, type, quote, requestChannels, options) => {
    calls.push(['taskStatus', task.quoteId, type, quote.id, requestChannels, options]);
    return { action: 'fetch' };
  }
};

function AbortController() {}

const runtime = createDashboardQuoteRuntime({
  AbortController,
  backendUrl: 'http://127.0.0.1:3000',
  chainDefaults: { id: 'chainDefaults' },
  checkPriceForAlerts: () => {},
  dashboardRuntimeUtils: { id: 'dashboardRuntime' },
  defaultIntervals: { main: 1000 },
  documentImpl: { id: 'document' },
  domRenderUtils: { id: 'domRender' },
  fetchImpl: () => {},
  getApiIntervals: () => ({ main: 1500 }),
  getDashboardState: () => dashboardState,
  getEffectiveRequestChannelIdForQuote: () => 'default',
  getInverseQuoteDisplayText: () => '',
  getQuoteDisplayMode: () => 'rate',
  getQuoteDisplayText: () => '',
  getQuoteMarketState: () => ({}),
  isQuotePaused: () => false,
  isSchedulerPaused: () => false,
  logWarning: () => {},
  applyActiveQuoteUiState: () => {},
  queueStatsUtils,
  quoteDisplayUtils: { id: 'quoteDisplay' },
  quoteFetchControllerUtils,
  quoteQueueRuntimeUtils,
  quoteRequestUtils: { id: 'quoteRequest' },
  recordSourceAttempt: () => {},
  resetQuoteUiRuntimeState: () => {},
  requestChannelRuntime,
  requestChannelUtils: {
    getEffectiveIntervalForQueue: (type, intervals, requestChannels) => {
      calls.push(['interval', type, intervals, requestChannels]);
      return intervals[type];
    }
  },
  scheduleArbPanelUpdate: () => {},
  scheduleDataTerminalUpdate: () => {},
  setQuoteMarketState: () => {},
  shouldQueueInverseFetch: () => true,
  updateQuotePairLabel: () => {},
  updateTrendArrow: () => {}
});

assert.strictEqual(runtime.activeFetchControllerRuntime, activeFetchControllerRuntime);
assert.strictEqual(runtime.quoteFetchController, fetchOptions && runtime.quoteFetchController);
assert.strictEqual(fetchOptions.backendUrl, 'http://127.0.0.1:3000');
assert.strictEqual(fetchOptions.chainDefaults.id, 'chainDefaults');
refreshOptions.quoteQueueRuntime.addToQueue({ id: 9 });
assert.deepStrictEqual(runtime.fetchQuoteByStrategy({ id: 3 }, { mode: 'main' }), {
  quote: { id: 3 },
  fetchOptions: { mode: 'main' }
});
assert.deepStrictEqual(runtime.fetchSingleQuote({ id: 4 }, 'inverse'), {
  quote: { id: 4 },
  mode: 'inverse'
});
assert.strictEqual(runtime.addToQueue({ id: 5 }), true);
assert.strictEqual(runtime.queueQuoteRefresh({ id: 6 }, { clearInverse: true }), true);
assert.strictEqual(runtime.removeFromQueue(7), 1);
assert.strictEqual(runtime.updateSchedulers(), true);
assert.strictEqual(runtime.abortActiveFetchControllers(), 2);
assert.strictEqual(runtime.toggleMultiChannel(), true);

assert.strictEqual(queueOptions.getQueueTypeForQuote({ id: 1 }), 'main');
assert.strictEqual(queueOptions.getQueueIntervalMs('main'), 1500);
assert.deepStrictEqual(Array.from(queueOptions.getManagedQueueKeys()), ['main']);
assert.strictEqual(queueOptions.appendQuoteQueueTasks([], { id: 8 }), 1);
assert.strictEqual(queueOptions.removeQuoteTasksFromQueues({}, 8), 1);
assert.strictEqual(queueOptions.deferQueueTask([], 2), 2);
assert.deepStrictEqual(queueOptions.getQueueTaskStatus({ quoteId: 1 }, 'main', { id: 1 }), { action: 'fetch' });
assert.strictEqual(queueOptions.isSchedulerPaused(), false);
assert.strictEqual(queueOptions.hasActiveFetchController(1), true);
assert.deepStrictEqual(queueOptions.fetchQuote({ id: 9 }, 'main'), {
  quote: { id: 9 },
  mode: 'main'
});

assert.deepStrictEqual(calls.slice(0, 4), [
  ['createActive', 'AbortController'],
  ['createFetch', true],
  ['createQueue'],
  ['createRefresh', true]
]);
