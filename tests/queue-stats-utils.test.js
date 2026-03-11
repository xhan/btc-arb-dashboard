const assert = require('assert');

const {
  DEFAULT_INTERVALS,
  buildQueueSummary,
  formatDurationMs
} = require('../queue-stats-utils');

const summary = buildQueueSummary({
  dashboard: [
    {
      id: 1,
      quotes: [
        { id: 101, chain: 'ethereum', preferredSource: 'Kyber', showInverse: true },
        { id: 102, chain: 'ethereum', preferredSource: 'Velora', showInverse: false },
        { id: 103, chain: 'Bybit', preferredSource: 'Bybit', showInverse: true },
        { id: 105, chain: 'Binance', preferredSource: 'Binance', showInverse: true },
        { id: 104, chain: 'solana', preferredSource: 'Jupiter', showInverse: true }
      ]
    }
  ],
  settings: {
    kyber: 200,
    velora: 300
  }
});

assert.strictEqual(DEFAULT_INTERVALS.velora, 700);
assert.strictEqual(DEFAULT_INTERVALS.binance, 1000);
assert.strictEqual(summary.totalQuoteCount, 5);
assert.strictEqual(summary.totalTaskCount, 7);

const kyber = summary.queues.find((item) => item.key === 'kyber');
const velora = summary.queues.find((item) => item.key === 'velora');
const bybit = summary.queues.find((item) => item.key === 'bybit');
const binance = summary.queues.find((item) => item.key === 'binance');
const solana = summary.queues.find((item) => item.key === 'solana');

assert.deepStrictEqual(
  {
    intervalMs: kyber.intervalMs,
    quoteCount: kyber.quoteCount,
    inverseTasks: kyber.inverseTasks,
    taskCount: kyber.taskCount,
    nominalLapMs: kyber.nominalLapMs
  },
  {
    intervalMs: 200,
    quoteCount: 1,
    inverseTasks: 1,
    taskCount: 2,
    nominalLapMs: 400
  }
);
assert.strictEqual(velora.intervalMs, 300);
assert.strictEqual(velora.taskCount, 1);
assert.strictEqual(bybit.taskCount, 1);
assert.strictEqual(bybit.inverseTasks, 0);
assert.strictEqual(binance.taskCount, 1);
assert.strictEqual(binance.inverseTasks, 0);
assert.strictEqual(solana.taskCount, 2);
assert.strictEqual(formatDurationMs(650), '650ms');
assert.strictEqual(formatDurationMs(24000), '24.00s');
