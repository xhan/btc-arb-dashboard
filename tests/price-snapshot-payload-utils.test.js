const assert = require('assert');

const { buildPriceSnapshotPayload } = require('../price-snapshot-payload-utils');

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
