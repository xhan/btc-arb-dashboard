const assert = require('assert');

const {
  DEFAULT_INTERVALS,
  appendQuoteQueueTasks,
  buildManagedQueueKeys,
  buildQueueTasksForQuote,
  buildQueueSummary,
  deferQueueTask,
  formatDurationMs,
  getQueueTaskKey,
  getQueueTaskStatus,
  removeQuoteTasksFromQueues
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
        { id: 104, chain: 'solana', preferredSource: 'Jupiter', showInverse: true },
        { id: 107, chain: 'arbitrum', toChain: 'ethereum', preferredSource: 'Kyber', showInverse: true },
        { id: 106, chain: 'ethereum', preferredSource: 'Kyber', showInverse: true, paused: true }
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
assert.strictEqual(summary.totalQuoteCount, 6);
assert.strictEqual(summary.totalTaskCount, 8);

const kyber = summary.queues.find((item) => item.key === 'kyber');
const velora = summary.queues.find((item) => item.key === 'velora');
const lifi = summary.queues.find((item) => item.key === 'lifi');
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
assert.strictEqual(lifi.quoteCount, 1);
assert.strictEqual(lifi.taskCount, 1);
assert.strictEqual(lifi.inverseTasks, 0);
assert.strictEqual(bybit.taskCount, 1);
assert.strictEqual(bybit.inverseTasks, 0);
assert.strictEqual(binance.taskCount, 1);
assert.strictEqual(binance.inverseTasks, 0);
assert.strictEqual(solana.taskCount, 2);
assert.strictEqual(formatDurationMs(650), '650ms');
assert.strictEqual(formatDurationMs(24000), '24.00s');

assert.deepStrictEqual(buildQueueTasksForQuote({ id: 301, chain: 'ethereum', showInverse: true }), [
  { quoteId: 301, mode: 'main' },
  { quoteId: 301, mode: 'inverse' }
]);
assert.deepStrictEqual(buildQueueTasksForQuote({ id: 302, chain: 'bybit', showInverse: true }), [
  { quoteId: 302, mode: 'main' }
]);
assert.deepStrictEqual(buildQueueTasksForQuote(null), []);
assert.strictEqual(getQueueTaskKey({ quoteId: 301, mode: 'inverse' }), '301:inverse');

const queue = [{ quoteId: 301, mode: 'main' }];
assert.strictEqual(appendQuoteQueueTasks(queue, { id: 301, chain: 'ethereum', showInverse: true }), 1);
assert.deepStrictEqual(queue, [
  { quoteId: 301, mode: 'main' },
  { quoteId: 301, mode: 'inverse' }
]);
assert.strictEqual(appendQuoteQueueTasks(queue, { id: 301, chain: 'ethereum', showInverse: true }), 0);

const queues = {
  kyber: [
    { quoteId: 301, mode: 'main' },
    { quoteId: 302, mode: 'main' }
  ],
  solana: [{ quoteId: 301, mode: 'inverse' }]
};
assert.strictEqual(removeQuoteTasksFromQueues(queues, 301), 2);
assert.deepStrictEqual(queues, {
  kyber: [{ quoteId: 302, mode: 'main' }],
  solana: []
});

const deferQueue = [
  { quoteId: 1, mode: 'main' },
  { quoteId: 2, mode: 'main' },
  { quoteId: 3, mode: 'main' }
];
assert.strictEqual(deferQueueTask(deferQueue, 1), 0);
assert.deepStrictEqual(deferQueue, [
  { quoteId: 1, mode: 'main' },
  { quoteId: 3, mode: 'main' },
  { quoteId: 2, mode: 'main' }
]);

const managedQueueKeys = buildManagedQueueKeys({
  defaultIntervals: { kyber: 170, bybit: 1000 },
  quotes: [
    { id: 401, chain: 'ethereum', preferredSource: 'Kyber' },
    { id: 402, chain: 'bybit', preferredSource: 'Bybit' },
    { id: 403, chain: 'ethereum', preferredSource: 'Velora', paused: true }
  ]
});
assert.deepStrictEqual(Array.from(managedQueueKeys).sort(), ['bybit', 'kyber']);

const channelSummary = buildQueueSummary(
  {
    dashboard: [
      {
        id: 2,
        quotes: [
          { id: 201, chain: 'ethereum', preferredSource: 'Kyber', showInverse: true, requestChannelId: 'hk-1' },
          { id: 202, chain: 'ethereum', preferredSource: 'Kyber', showInverse: false },
          { id: 203, chain: 'solana', preferredSource: 'Jupiter', showInverse: false, requestChannelId: 'sg-1' },
          { id: 204, chain: 'sui', preferredSource: 'Cetus', showInverse: false, requestChannelId: 'ignored' }
        ]
      }
    ],
    settings: {
      kyber: 170,
      solana: 3500,
      sui: 500
    }
  },
  {
    channels: [
      {
        id: 'hk-1',
        name: 'HK-1',
        intervals: {
          kyber: 90
        }
      },
      {
        id: 'sg-1',
        name: 'SG-1',
        intervals: {
          solana: 1800
        }
      }
    ]
  }
);

const kyberDefault = channelSummary.queues.find((item) => item.key === 'kyber:default');
const kyberHk = channelSummary.queues.find((item) => item.key === 'kyber:hk-1');
const solanaSg = channelSummary.queues.find((item) => item.key === 'solana:sg-1');
const suiDefault = channelSummary.queues.find((item) => item.key === 'sui');

assert.ok(kyberDefault, '应保留 kyber 默认通道队列');
assert.ok(kyberHk, '应为绑定通道的 kyber quote 生成独立队列');
assert.ok(solanaSg, '应为绑定通道的 solana quote 生成独立队列');
assert.ok(suiDefault, 'sui 仍应使用默认单队列');
assert.strictEqual(kyberDefault.quoteCount, 1);
assert.strictEqual(kyberDefault.taskCount, 1);
assert.strictEqual(kyberHk.quoteCount, 1);
assert.strictEqual(kyberHk.taskCount, 2);
assert.strictEqual(kyberHk.intervalMs, 90);
assert.strictEqual(kyberHk.nominalLapMs, 180);
assert.strictEqual(solanaSg.intervalMs, 1800);
assert.strictEqual(suiDefault.quoteCount, 1);
assert.strictEqual(suiDefault.intervalMs, 500);

const managedChannelQueueKeys = buildManagedQueueKeys({
  defaultIntervals: { kyber: 170, solana: 3500, bybit: 1000 },
  requestChannels: channelSummary.requestChannels,
  multiChannelEnabled: true,
  quotes: [
    { id: 404, chain: 'ethereum', preferredSource: 'Kyber', requestChannelId: 'hk-1' },
    { id: 405, chain: 'solana', preferredSource: 'Jupiter', requestChannelId: 'sg-1' },
    { id: 406, chain: 'bybit', preferredSource: 'Bybit', requestChannelId: 'hk-1' }
  ]
});
assert.deepStrictEqual(
  Array.from(managedChannelQueueKeys).sort(),
  ['bybit', 'kyber:default', 'kyber:hk-1', 'solana:default', 'solana:sg-1']
);

assert.deepStrictEqual(
  getQueueTaskStatus(
    { quoteId: 501, mode: 'main' },
    'kyber:hk-1',
    { id: 501, chain: 'ethereum', preferredSource: 'Kyber', requestChannelId: 'hk-1' },
    channelSummary.requestChannels,
    { multiChannelEnabled: true }
  ),
  { action: 'fetch', reason: 'ready', queueKey: 'kyber:hk-1' }
);

assert.deepStrictEqual(
  getQueueTaskStatus(
    { quoteId: 502, mode: 'inverse' },
    'kyber:hk-1',
    { id: 502, chain: 'ethereum', preferredSource: 'Kyber', requestChannelId: 'hk-1', showInverse: false },
    channelSummary.requestChannels,
    { multiChannelEnabled: true }
  ),
  { action: 'requeue', reason: 'inverse_disabled', queueKey: 'kyber:hk-1' }
);

assert.deepStrictEqual(
  getQueueTaskStatus(
    { quoteId: 503, mode: 'main' },
    'kyber:hk-1',
    { id: 503, chain: 'ethereum', preferredSource: 'Velora', requestChannelId: 'hk-1' },
    channelSummary.requestChannels,
    { multiChannelEnabled: true }
  ),
  { action: 'requeue', reason: 'queue_changed', queueKey: 'velora:hk-1' }
);

assert.deepStrictEqual(
  getQueueTaskStatus({ quoteId: 504, mode: 'main' }, 'kyber', null, null),
  { action: 'remove', reason: 'missing_quote' }
);

assert.deepStrictEqual(
  getQueueTaskStatus(
    { quoteId: 505, mode: 'main' },
    'kyber',
    { id: 505, chain: 'ethereum', preferredSource: 'Kyber', paused: true },
    null
  ),
  { action: 'remove', reason: 'paused_quote' }
);
