const assert = require('assert');

const dashboardRuntimeUtils = require('../dashboard-runtime-utils');
const { createQuoteStateRuntime } = require('../quote-state-runtime-utils');

const runtime = createQuoteStateRuntime({ dashboardRuntimeUtils });

assert.deepStrictEqual(runtime.getMarketState('101'), {});
assert.strictEqual(runtime.getMarketRevision(), 0);
assert.strictEqual(
  runtime.setMarketState('101', {
    lastRawPrice: 1.23,
    lastResultText: 'A',
    hasUnreadAlert: true,
    trendTimer: 'timer-1'
  }),
  true
);
assert.strictEqual(runtime.getMarketRevision(), 1);
assert.deepStrictEqual(runtime.getMarketState(101), {
  lastRawPrice: 1.23,
  lastResultText: 'A'
});
assert.strictEqual(runtime.getMarketStateMap().get(101).hasUnreadAlert, undefined);

assert.strictEqual(
  runtime.setMarketState(101, {
    lastRawPrice: 1.23,
    lastResultText: 'A',
    hasUnreadAlert: false
  }),
  false
);
assert.strictEqual(runtime.getMarketRevision(), 1);

assert.strictEqual(
  runtime.setMarketState(101, {
    lastRawPrice: 1.24,
    lastResultText: 'A'
  }),
  true
);
assert.strictEqual(runtime.getMarketRevision(), 2);
assert.strictEqual(runtime.bumpMarketRevision(), 3);
assert.strictEqual(runtime.deleteMarketState('101'), true);
assert.deepStrictEqual(runtime.getMarketState(101), {});

assert.deepStrictEqual(runtime.getUiState('202'), {
  hasUnreadAlert: false,
  trendTimer: null
});
assert.deepStrictEqual(runtime.setUiState('202', {
  hasUnreadAlert: true,
  trendTimer: 'timer-2'
}), {
  hasUnreadAlert: true,
  trendTimer: 'timer-2'
});
assert.deepStrictEqual(runtime.getUiState(202), {
  hasUnreadAlert: true,
  trendTimer: 'timer-2'
});

const clearedTimers = [];
assert.strictEqual(runtime.clearTrendTimer(202, (timer) => clearedTimers.push(timer)), true);
assert.deepStrictEqual(clearedTimers, ['timer-2']);
assert.deepStrictEqual(runtime.getUiState('202'), {
  hasUnreadAlert: true,
  trendTimer: null
});

let scheduledTrendTimer = null;
let trendElapsedCount = 0;
runtime.setUiState(202, {
  hasUnreadAlert: true,
  trendTimer: 'timer-old'
});
assert.strictEqual(
  runtime.scheduleTrendTimer(202, () => {
    trendElapsedCount += 1;
  }, {
    delayMs: 30000,
    setTimeout(callback, delayMs) {
      scheduledTrendTimer = { callback, delayMs };
      return 'timer-new';
    },
    clearTimeout(timer) {
      clearedTimers.push(timer);
    }
  }),
  'timer-new'
);
assert.deepStrictEqual(clearedTimers, ['timer-2', 'timer-old']);
assert.strictEqual(runtime.getUiState(202).trendTimer, 'timer-new');
assert.strictEqual(scheduledTrendTimer.delayMs, 30000);
scheduledTrendTimer.callback();
assert.strictEqual(trendElapsedCount, 1);
assert.strictEqual(runtime.getUiState(202).trendTimer, null);

runtime.setUiState(202, {
  hasUnreadAlert: true,
  trendTimer: 'timer-3'
});
assert.deepStrictEqual(runtime.resetUiRuntimeState('202', (timer) => clearedTimers.push(timer)), {
  hasUnreadAlert: false,
  trendTimer: null
});
assert.deepStrictEqual(clearedTimers, ['timer-2', 'timer-old', 'timer-3']);

runtime.setUiState(202, {
  trendTimer: 'timer-4'
});
assert.strictEqual(runtime.deleteUiRuntimeState(202, (timer) => clearedTimers.push(timer)), true);
assert.deepStrictEqual(runtime.getUiStateMap().has(202), false);
assert.deepStrictEqual(clearedTimers, ['timer-2', 'timer-old', 'timer-3', 'timer-4']);
