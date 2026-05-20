const assert = require('assert');

const {
  createDashboardAppStateRuntime
} = require('../src/app/dashboard-app-state-runtime');

const defaultIntervals = { kyber: 1000, solana: 3500 };
const defaultPriority = ['USDC', 'WBTC'];
const defaultPriceSnapshotConfig = { enabled: false, intervalSec: 10 };

const runtime = createDashboardAppStateRuntime({
  defaultIntervals,
  defaultArbCycleStartPriority: defaultPriority,
  defaultPriceSnapshotConfig
});

const initialDashboardState = runtime.getDashboardState();
assert.deepStrictEqual(initialDashboardState, []);
assert.deepStrictEqual(runtime.getApiIntervals(), defaultIntervals);
assert.notStrictEqual(runtime.getApiIntervals(), defaultIntervals);
assert.deepStrictEqual(runtime.getArbCycleStartPriority(), defaultPriority);
assert.notStrictEqual(runtime.getArbCycleStartPriority(), defaultPriority);
assert.deepStrictEqual(runtime.getPriceSnapshotConfig(), defaultPriceSnapshotConfig);
assert.notStrictEqual(runtime.getPriceSnapshotConfig(), defaultPriceSnapshotConfig);

defaultIntervals.kyber = 9999;
defaultPriority.push('ETH');
defaultPriceSnapshotConfig.intervalSec = 99;
assert.deepStrictEqual(runtime.getApiIntervals(), { kyber: 1000, solana: 3500 });
assert.deepStrictEqual(runtime.getArbCycleStartPriority(), ['USDC', 'WBTC']);
assert.deepStrictEqual(runtime.getPriceSnapshotConfig(), { enabled: false, intervalSec: 10 });

const nextDashboardState = [{ id: 'category-a' }];
const nextIntervals = { kyber: 2000 };
const nextPriority = ['cbBTC'];
const nextPriceSnapshotConfig = { enabled: true, intervalSec: 5 };

assert.strictEqual(runtime.setDashboardState(nextDashboardState), nextDashboardState);
assert.strictEqual(runtime.getDashboardState(), nextDashboardState);
assert.strictEqual(runtime.setApiIntervals(nextIntervals), nextIntervals);
assert.strictEqual(runtime.getApiIntervals(), nextIntervals);
assert.strictEqual(runtime.setArbCycleStartPriority(nextPriority), nextPriority);
assert.strictEqual(runtime.getArbCycleStartPriority(), nextPriority);
assert.strictEqual(runtime.setPriceSnapshotConfig(nextPriceSnapshotConfig), nextPriceSnapshotConfig);
assert.strictEqual(runtime.getPriceSnapshotConfig(), nextPriceSnapshotConfig);
