const assert = require('assert');

const {
  buildPriceSnapshotPayload,
  createPriceSnapshotSaveRuntime,
  createPriceSnapshotTimerRuntime
} = require('../src/price-snapshots/price-snapshot-payload-utils');

const payload = buildPriceSnapshotPayload({
  dashboardState: [
    {
      id: 1,
      name: '测试监控',
      quotes: [
        { id: 101, chain: 'ethereum', amount: 1, preferredSource: 'Kyber', fromToken: '0xaaa', toToken: '0xbbb' },
        { id: 102, chain: 'ethereum', amount: 2, preferredSource: 'Kyber', fromToken: '0xccc', toToken: '0xddd', paused: true }
      ]
    }
  ],
  quoteStateById: new Map([
    [101, { fromSymbol: 'GHO', toSymbol: 'USDC', lastRawPrice: 1.001, lastResultText: 'GHO ≈ 1.001 USDC' }],
    [102, { fromSymbol: 'PAUSED', toSymbol: 'USDt', lastRawPrice: 0.99, lastResultText: 'PAUSED ≈ 0.99 USDt' }]
  ]),
  clientCapturedAt: '2026-03-12T00:00:00.000Z'
});

assert.strictEqual(payload.clientCapturedAt, '2026-03-12T00:00:00.000Z');
assert.strictEqual(payload.quotes.length, 1);
assert.deepStrictEqual(payload.quotes[0], {
  quoteId: 101,
  categoryId: 1,
  categoryName: '测试监控',
  chain: 'ethereum',
  pair: 'GHO/USDC',
  size: 1,
  preferredSource: 'Kyber',
  usedSource: '',
  fromToken: '0xaaa',
  toToken: '0xbbb',
  fromSymbol: 'GHO',
  toSymbol: 'USDC',
  price: 1.001,
  inversePrice: null,
  resultText: 'GHO ≈ 1.001 USDC',
  inversePair: '',
  inverseResultText: ''
});

let timerId = 0;
const timers = [];
const clearedTimers = [];
const timerRuntime = createPriceSnapshotTimerRuntime({
  setInterval(callback, intervalMs) {
    const timer = { id: ++timerId, callback, intervalMs };
    timers.push(timer);
    return timer;
  },
  clearInterval(timer) {
    clearedTimers.push(timer.id);
  }
});

let snapshotSaveCount = 0;
assert.strictEqual(timerRuntime.start({ enabled: false, intervalSec: 10 }, () => { snapshotSaveCount += 1; }), false);
assert.strictEqual(timerRuntime.start({ enabled: true, intervalSec: 5 }, () => { snapshotSaveCount += 1; }), true);
assert.strictEqual(timers[0].intervalMs, 5000);
assert.strictEqual(timerRuntime.start({ enabled: true, intervalSec: 10 }, () => { snapshotSaveCount += 10; }), true);
assert.deepStrictEqual(clearedTimers, [1]);
timers[1].callback();
assert.strictEqual(snapshotSaveCount, 10);
assert.strictEqual(timerRuntime.clear(), true);
assert.strictEqual(timerRuntime.clear(), false);

const savedPayloads = [];
const snapshotWarnings = [];
let snapshotEnabled = false;
let nextSnapshotPayload = { quotes: [{ quoteId: 1 }] };
const saveRuntime = createPriceSnapshotSaveRuntime({
  getConfig: () => ({ enabled: snapshotEnabled }),
  buildPayload: () => nextSnapshotPayload,
  savePayload: async (nextPayload) => {
    savedPayloads.push(nextPayload);
  },
  logWarning: (...args) => {
    snapshotWarnings.push(args);
  }
});

(async () => {
  assert.deepStrictEqual(await saveRuntime.saveIfNeeded(), { saved: false, reason: 'disabled' });
  snapshotEnabled = true;
  nextSnapshotPayload = { quotes: [] };
  assert.deepStrictEqual(await saveRuntime.saveIfNeeded(), { saved: false, reason: 'empty' });
  nextSnapshotPayload = { quotes: [{ quoteId: 101 }] };
  assert.deepStrictEqual(await saveRuntime.saveIfNeeded(), {
    saved: true,
    reason: 'saved',
    payload: nextSnapshotPayload
  });
  assert.deepStrictEqual(savedPayloads, [nextSnapshotPayload]);

  const saveError = new Error('save failed');
  const failingRuntime = createPriceSnapshotSaveRuntime({
    config: { enabled: true },
    buildPayload: () => ({ quotes: [{ quoteId: 102 }] }),
    savePayload: async () => {
      throw saveError;
    },
    logWarning: (...args) => {
      snapshotWarnings.push(args);
    }
  });
  assert.deepStrictEqual(await failingRuntime.saveIfNeeded(), {
    saved: false,
    reason: 'error',
    error: saveError
  });
  assert.deepStrictEqual(snapshotWarnings[0], ['保存价格快照失败:', saveError]);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
