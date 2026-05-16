const assert = require('assert');

const {
  createArbDetailChartAutoRefreshRuntime,
  createArbDetailRefreshScheduler
} = require('../src/arb/arb-detail-refresh-utils');

let activeToken = 1;
let refreshing = false;
let timerId = 0;
const scheduled = [];
const cleared = [];
const refreshCalls = [];
const refreshingEvents = [];
const loggedErrors = [];

function createScheduler(refreshImpl, options = {}) {
  return createArbDetailRefreshScheduler({
    intervalMs: 2500,
    isActive: (token) => token === activeToken,
    isRefreshing: () => refreshing,
    setRefreshing: (value, token) => {
      refreshing = value;
      refreshingEvents.push({ value, token });
    },
    refresh: async (token) => {
      refreshCalls.push(token);
      return refreshImpl(token);
    },
    logError: (error, token) => loggedErrors.push({ message: error.message, token }),
    setTimeoutImpl: (callback, delayMs) => {
      const id = `timer-${timerId += 1}`;
      scheduled.push({ id, callback, delayMs });
      return id;
    },
    clearTimeoutImpl: (id) => cleared.push(id),
    ...options
  });
}

(async () => {
  const scheduler = createScheduler(async () => true);
  assert.strictEqual(scheduler.start(1), true);
  assert.deepStrictEqual(scheduled.map((entry) => entry.delayMs), [0]);

  await scheduler.runTick(1);
  assert.deepStrictEqual(refreshCalls, [1]);
  assert.deepStrictEqual(refreshingEvents, [
    { value: true, token: 1 },
    { value: false, token: 1 }
  ]);
  assert.strictEqual(scheduled.at(-1).delayMs, 2500);
  assert.strictEqual(scheduler.hasTimer(), true);

  scheduler.clear();
  assert.deepStrictEqual(cleared, [scheduled[0].id, scheduled.at(-1).id]);
  assert.strictEqual(scheduler.hasTimer(), false);

  refreshing = true;
  assert.strictEqual(await scheduler.runTick(1), false);
  assert.deepStrictEqual(refreshCalls, [1]);
  refreshing = false;

  activeToken = 2;
  assert.strictEqual(scheduler.start(1), false);
  assert.strictEqual(await scheduler.runTick(1), false);
  assert.deepStrictEqual(refreshCalls, [1]);

  activeToken = 3;
  const failingScheduler = createScheduler(async () => {
    throw new Error('refresh exploded');
  });
  assert.strictEqual(await failingScheduler.runTick(3), false);
  assert.deepStrictEqual(loggedErrors.at(-1), { message: 'refresh exploded', token: 3 });

  let chartVisible = true;
  let chartEnabled = true;
  let chartRefreshCalls = 0;
  let intervalId = 0;
  const chartIntervals = [];
  const chartClearedIntervals = [];
  const chartAutoRefreshRuntime = createArbDetailChartAutoRefreshRuntime({
    intervalMs: 5000,
    isVisible: () => chartVisible,
    isEnabled: () => chartEnabled,
    refresh: () => {
      chartRefreshCalls += 1;
    },
    setIntervalImpl(callback, delayMs) {
      const id = `interval-${intervalId += 1}`;
      chartIntervals.push({ id, callback, delayMs });
      return id;
    },
    clearIntervalImpl(id) {
      chartClearedIntervals.push(id);
    }
  });

  assert.strictEqual(chartAutoRefreshRuntime.sync(), true);
  assert.strictEqual(chartAutoRefreshRuntime.hasTimer(), true);
  assert.deepStrictEqual(chartIntervals.map((entry) => entry.delayMs), [5000]);

  chartAutoRefreshRuntime.sync();
  assert.deepStrictEqual(chartClearedIntervals, ['interval-1']);
  assert.strictEqual(chartIntervals.length, 2);

  chartVisible = false;
  chartIntervals.at(-1).callback();
  assert.strictEqual(chartRefreshCalls, 0);

  chartVisible = true;
  chartIntervals.at(-1).callback();
  assert.strictEqual(chartRefreshCalls, 1);

  assert.strictEqual(chartAutoRefreshRuntime.clear(), true);
  assert.deepStrictEqual(chartClearedIntervals, ['interval-1', 'interval-2']);
  assert.strictEqual(chartAutoRefreshRuntime.hasTimer(), false);

  chartEnabled = false;
  assert.strictEqual(chartAutoRefreshRuntime.sync(), false);
  assert.strictEqual(chartIntervals.length, 2);
})();
