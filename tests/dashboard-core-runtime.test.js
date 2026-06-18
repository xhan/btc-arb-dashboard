const assert = require('assert');

const {
  createDashboardCoreRuntime
} = require('../src/app/dashboard-core-runtime');

const calls = [];
let capturedAppStateOptions = null;
let capturedApiOptions = null;
let capturedInteractionOptions = null;
let capturedQuoteStateOptions = null;
let capturedSnapshotSaveOptions = null;
let capturedDebounceOptions = null;
let capturedStorageEnv = null;
let capturedStorageOptions = null;
const dashboardStorage = { id: 'storage' };
const dashboardRuntimeUtils = {
  createInputDebounceRuntime(options) {
    capturedDebounceOptions = options;
    return { id: 'amount-debounce' };
  },
  getBrowserLocalStorage(env, options) {
    capturedStorageEnv = env;
    capturedStorageOptions = options;
    return env.window.localStorage;
  }
};
const domRenderUtils = {
  closestEventTarget: { id: 'closest-event-target' },
  createRenderInteractionHoldRuntime(options) {
    capturedInteractionOptions = options;
    return {
      id: 'interaction',
      bind(target) {
        calls.push(['bindInteraction', target]);
      }
    };
  },
  createFloatingPanelZIndexRuntime(options) {
    calls.push(['createZIndex', options]);
    return { id: 'z-index' };
  }
};
const dashboardRuntimeBridge = {
  invalidateArbRuleSnapshotCache(options) {
    calls.push(['invalidateArbRuleSnapshotCache', options]);
  }
};
const dashboardApiClient = {
  saveDashboardConfig: () => {},
  savePriceSnapshot: (payload) => {
    calls.push(['savePriceSnapshot', payload]);
    return Promise.resolve();
  }
};
const quoteStateRuntime = {
  getMarketState: () => 'market-state',
  getMarketStateMap: () => new Map([['quote-1', { price: 1 }]]),
  setMarketState: () => {},
  deleteMarketState: () => {},
  resetUiRuntimeState: () => {},
  deleteUiRuntimeState: () => {}
};
const modules = {
  getArbCyclePriorityUtils: () => ({
    DEFAULT_ARB_CYCLE_START_PRIORITY: ['polygon', 'arbitrum']
  }),
  getDashboardApiUtils: () => ({
    createDashboardApiClient(options) {
      capturedApiOptions = options;
      return dashboardApiClient;
    }
  }),
  getDashboardAppStateRuntime: () => ({
    createDashboardAppStateRuntime(options) {
      capturedAppStateOptions = options;
      let dashboardState = [];
      let priceSnapshotConfig = options.defaultPriceSnapshotConfig;
      return {
        getDashboardState: () => dashboardState,
        setDashboardState: (nextState) => {
          dashboardState = nextState;
          return dashboardState;
        },
        getApiIntervals: () => options.defaultIntervals,
        setApiIntervals: () => {},
        getArbCycleStartPriority: () => options.defaultArbCycleStartPriority,
        setArbCycleStartPriority: () => {},
        getPriceSnapshotConfig: () => priceSnapshotConfig,
        setPriceSnapshotConfig: (nextConfig) => {
          priceSnapshotConfig = nextConfig;
          return priceSnapshotConfig;
        }
      };
    }
  }),
  getDashboardRuntimeRefUtils: () => ({
    createDashboardRuntimeBridge: () => dashboardRuntimeBridge
  }),
  getDashboardRuntimeUtils: () => dashboardRuntimeUtils,
  getDomRenderUtils: () => domRenderUtils,
  getPriceSnapshotPayloadUtils: () => ({
    createPriceSnapshotTimerRuntime: (options) => ({ id: 'snapshot-timer', options }),
    createPriceSnapshotSaveRuntime(options) {
      capturedSnapshotSaveOptions = options;
      return { id: 'snapshot-save' };
    },
    buildPriceSnapshotPayload(options) {
      calls.push(['buildPriceSnapshotPayload', options]);
      return { payload: options };
    }
  }),
  getQueueStatsUtils: () => ({
    DEFAULT_INTERVALS: { dex: 3, cex: 5 }
  }),
  getQuoteStateRuntimeUtils: () => ({
    createQuoteStateRuntime(options) {
      capturedQuoteStateOptions = options;
      return quoteStateRuntime;
    }
  })
};
const deps = {
  backendUrl: 'http://127.0.0.1:3000',
  documentImpl: { id: 'document' },
  fetchImpl: () => {},
  logger: { warn: (...args) => calls.push(['warn', args]) },
  windowImpl: { localStorage: dashboardStorage }
};
const timers = {
  clearInterval: () => {},
  clearTimeout: () => {},
  setInterval: () => {},
  setTimeout: () => {}
};

const runtime = createDashboardCoreRuntime({
  modules,
  constants: {
    amountInputDebounceMs: 120,
    floatingPanelBaseZIndex: 2000
  },
  deps,
  timers
});

assert.deepStrictEqual(runtime.defaultIntervals, { dex: 3, cex: 5 });
assert.deepStrictEqual(runtime.defaultArbCycleStartPriority, ['polygon', 'arbitrum']);
assert.strictEqual(runtime.dashboardRuntimeUtils, dashboardRuntimeUtils);
assert.strictEqual(runtime.domRenderUtils, domRenderUtils);
assert.strictEqual(runtime.closestEventTarget, domRenderUtils.closestEventTarget);
assert.strictEqual(runtime.dashboardApiClient, dashboardApiClient);
assert.strictEqual(runtime.dashboardRuntimeBridge, dashboardRuntimeBridge);
assert.strictEqual(runtime.floatingPanelZIndexRuntime.id, 'z-index');
assert.strictEqual(runtime.getDashboardLocalStorage(), dashboardStorage);
assert.strictEqual(capturedStorageEnv.window, deps.windowImpl);
capturedStorageOptions.onError(new Error('storage denied'));
const warnCallIndex = calls.findIndex((call) => call[0] === 'warn');
assert.ok(warnCallIndex >= 0);
calls.splice(warnCallIndex, 1);
assert.strictEqual(runtime.quoteStateRuntime, quoteStateRuntime);
assert.strictEqual(runtime.getQuoteMarketState(), 'market-state');
assert.strictEqual(runtime.priceSnapshotTimerRuntime.id, 'snapshot-timer');
assert.strictEqual(runtime.priceSnapshotSaveRuntime.id, 'snapshot-save');
assert.strictEqual(runtime.amountInputDebounceRuntime.id, 'amount-debounce');
assert.deepStrictEqual(calls.shift(), ['bindInteraction', deps.documentImpl]);
assert.deepStrictEqual(calls.shift(), ['createZIndex', { baseZIndex: 2000 }]);
assert.deepStrictEqual(capturedAppStateOptions, {
  defaultIntervals: { dex: 3, cex: 5 },
  defaultArbCycleStartPriority: ['polygon', 'arbitrum'],
  defaultPriceSnapshotConfig: { enabled: false, intervalSec: 10 }
});
assert.strictEqual(capturedApiOptions.backendUrl, deps.backendUrl);
assert.strictEqual(capturedApiOptions.fetchImpl, deps.fetchImpl);
assert.strictEqual(capturedApiOptions.logger, deps.logger);
assert.strictEqual(capturedInteractionOptions.idleDelayMs, 80);
assert.strictEqual(capturedInteractionOptions.trackFocus, false);
capturedQuoteStateOptions.onMarketStateChanged();
assert.deepStrictEqual(calls.shift(), ['invalidateArbRuleSnapshotCache', { bumpRevision: false }]);
runtime.setDashboardState([{ id: 'cat' }]);
const payload = capturedSnapshotSaveOptions.buildPayload();
assert.strictEqual(payload.payload.dashboardState[0].id, 'cat');
assert.ok(payload.payload.quoteStateById instanceof Map);
assert.match(payload.payload.clientCapturedAt, /^\d{4}-\d{2}-\d{2}T/);
assert.strictEqual(calls.shift()[0], 'buildPriceSnapshotPayload');
assert.strictEqual(capturedSnapshotSaveOptions.getConfig().enabled, false);
const snapshotPayload = { quotes: [{ id: 'quote-1' }] };
assert.ok(capturedSnapshotSaveOptions.savePayload(snapshotPayload) instanceof Promise);
assert.deepStrictEqual(calls.shift(), ['savePriceSnapshot', snapshotPayload]);
assert.strictEqual(capturedDebounceOptions.delayMs, 120);
