const assert = require('assert');

const {
  buildReplayFromSnapshot,
  renderReplayText
} = require('../price-snapshot-replay');

const snapshot = {
  capturedAt: '2026-03-01T00:00:10.000Z',
  capturedAtMs: Date.parse('2026-03-01T00:00:10.000Z'),
  clientCapturedAt: '2026-03-01T00:00:09.500Z',
  quotes: [
    {
      quoteId: 1,
      chain: 'ethereum',
      fromSymbol: 'cbBTC',
      toSymbol: 'WBTC',
      price: 0.9999,
      inversePrice: 1.0001
    },
    {
      quoteId: 2,
      chain: 'arbitrum',
      fromSymbol: 'WBTC',
      toSymbol: 'cbBTC',
      price: 1.0003,
      inversePrice: 0.9997
    }
  ]
};

const replay = buildReplayFromSnapshot({
  requestedAt: '2026-03-01T00:00:12.000Z',
  requestedAtMs: Date.parse('2026-03-01T00:00:12.000Z'),
  matchType: 'floor',
  deltaMs: 2000,
  snapshot
});

assert.strictEqual(replay.snapshot.capturedAt, snapshot.capturedAt);
assert.strictEqual(replay.match.matchType, 'floor');
assert.ok(Array.isArray(replay.fixedPaths));
assert.ok(Array.isArray(replay.globalTopCycles));
assert.ok(replay.globalTopCycles.length >= 1);

const text = renderReplayText(replay);
assert.ok(text.includes('请求时间'));
assert.ok(text.includes('命中快照'));
assert.ok(text.includes('全局路径'));
assert.ok(text.includes('+08:00'));
