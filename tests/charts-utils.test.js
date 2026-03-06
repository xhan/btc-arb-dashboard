const assert = require('assert');

const {
  buildChartPairKey,
  buildChartPairLabel,
  buildChartsPageHref,
  parseChartsPagePrefill,
  tokenizeChartSearch,
  matchesChartSearch,
  getChartChainLabel,
  shiftChartPointsToUtc8,
  formatUtc8ChartTime,
  formatChartPrice,
  buildProfitChartPoints
} = require('../charts-utils');

assert.strictEqual(buildChartPairKey(12, 'forward'), '12:forward');
assert.strictEqual(buildChartPairKey(12, 'inverse'), '12:inverse');
assert.strictEqual(buildChartPairLabel({
  chain: 'ethereum',
  fromSymbol: 'GHO',
  toSymbol: 'USDC'
}), '(ETH) GHO -> USDC');
const prefillHref = buildChartsPageHref([
  { quoteId: 1, direction: 'forward' },
  { quoteId: 2, direction: 'inverse' }
]);
assert.ok(prefillHref.startsWith('/charts?pairs='));
assert.deepStrictEqual(parseChartsPagePrefill(prefillHref), [
  { quoteId: 1, direction: 'forward' },
  { quoteId: 2, direction: 'inverse' }
]);
assert.deepStrictEqual(parseChartsPagePrefill('/charts?pairs=%5B%7B%22quoteId%22%3A1%2C%22direction%22%3A%22forward%22%7D%2C%7B%22quoteId%22%3A0%2C%22direction%22%3A%22oops%22%7D%5D'), [
  { quoteId: 1, direction: 'forward' }
]);
assert.strictEqual(getChartChainLabel('arbitrum'), 'Arbitrum');
assert.deepStrictEqual(tokenizeChartSearch(' eth  gho  us '), ['eth', 'gho', 'us']);
assert.deepStrictEqual(shiftChartPointsToUtc8([
  { time: Math.floor(new Date('2026-02-28T16:05:10.000Z').getTime() / 1000), value: 0.9991 }
]), [
  { time: Math.floor(new Date('2026-03-01T00:05:10.000Z').getTime() / 1000), value: 0.9991 }
]);
assert.strictEqual(formatUtc8ChartTime(Math.floor(new Date('2026-03-01T00:05:10.000Z').getTime() / 1000)), '00:05:10');
assert.strictEqual(formatChartPrice(0.999123456), '0.99912');

const pair = {
  chain: 'ethereum',
  fromSymbol: 'GHO',
  toSymbol: 'USDC',
  label: '(ETH) GHO -> USDC'
};

assert.strictEqual(matchesChartSearch(pair, 'eth gho us'), true);
assert.strictEqual(matchesChartSearch(pair, 'gho eth'), true);
assert.strictEqual(matchesChartSearch(pair, 'arb gho'), false);

assert.deepStrictEqual(buildProfitChartPoints([
  [
    { time: 10, value: 1.02 },
    { time: 20, value: 0.98 }
  ],
  [
    { time: 10, value: 1.03 },
    { time: 20, value: 1.04 }
  ],
  [
    { time: 10, value: 0.995 }
  ]
]), [
  { time: 10, value: 1.045347 }
]);
