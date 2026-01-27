const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  buildEdges,
  findBestTwoStepCycle,
  formatLegLine,
  buildRuleEdges,
  findBestCycle
} = require('../arb-paths');

const quotes = [
  { id: 1, chain: 'ethereum', showInverse: true },
  { id: 2, chain: 'arbitrum', showInverse: true }
];

const state = new Map([
  [1, { fromSymbol: 'cbBTC', toSymbol: 'WBTC', lastRawPrice: 1.0002, inverseRawPrice: 0.9998 }],
  [2, { fromSymbol: 'WBTC', toSymbol: 'cbBTC', lastRawPrice: 1.0005, inverseRawPrice: 0.9995 }]
]);

const edges = buildEdges(quotes, state, ['CBBTC', 'WBTC']);
const bestTwo = findBestTwoStepCycle(edges);

assert.ok(bestTwo, 'expected a best path');
assert.strictEqual(bestTwo.legs.length, 2);
assert.ok(bestTwo.profitRate > 0);

const formatted = formatLegLine({
  from: 'cbBTC',
  to: 'WBTC',
  rate: 1.002324,
  chainLabel: 'ETH'
});
assert.strictEqual(formatted, '（ETH）cbBTC -> WBTC @1.002324');

const multiQuotes = [
  { id: 11, chain: 'ethereum', showInverse: true },
  { id: 12, chain: 'base', showInverse: true },
  { id: 13, chain: 'arbitrum', showInverse: true }
];

const multiState = new Map([
  [11, { fromSymbol: 'cbBTC', toSymbol: 'tBTC', lastRawPrice: 1.001 }],
  [12, { fromSymbol: 'tBTC', toSymbol: 'WBTC', lastRawPrice: 1.002 }],
  [13, { fromSymbol: 'WBTC', toSymbol: 'xBTC', lastRawPrice: 0.998 }]
]);

const multiEdges = buildEdges(multiQuotes, multiState, null);
const ruleEdges = buildRuleEdges({ xBTC: 'cbBTC' });
const bestCycle = findBestCycle(multiEdges.concat(ruleEdges), { maxDepth: 4 });

assert.ok(bestCycle, 'expected a cycle');
assert.ok(bestCycle.legs.length >= 3 && bestCycle.legs.length <= 4);

const browserCode = fs.readFileSync(path.join(__dirname, '..', 'arb-paths.js'), 'utf8');
const browserSandbox = { window: {} };
vm.createContext(browserSandbox);
assert.doesNotThrow(() => vm.runInContext(browserCode, browserSandbox));
assert.ok(browserSandbox.window.ArbPaths, 'expected ArbPaths to attach to window');
