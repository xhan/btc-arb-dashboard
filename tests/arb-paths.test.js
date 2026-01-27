const assert = require('assert');

const { buildEdges, findBestTwoStepCycle } = require('../arb-paths');

const quotes = [
  { id: 1, chain: 'ethereum', showInverse: true },
  { id: 2, chain: 'arbitrum', showInverse: true }
];

const state = new Map([
  [1, { fromSymbol: 'cbBTC', toSymbol: 'WBTC', lastRawPrice: 1.0002, inverseRawPrice: 0.9998 }],
  [2, { fromSymbol: 'WBTC', toSymbol: 'cbBTC', lastRawPrice: 1.0005, inverseRawPrice: 0.9995 }]
]);

const edges = buildEdges(quotes, state, ['CBBTC', 'WBTC']);
const best = findBestTwoStepCycle(edges);

assert.ok(best, 'expected a best path');
assert.strictEqual(best.legs.length, 2);
assert.ok(best.profitRate > 0);
