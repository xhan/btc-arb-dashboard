const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  buildEdges,
  findBestTwoStepCycle,
  formatLegLine,
  buildRuleEdges,
  findBestCycle,
  findTopCycles,
  findBestFixedPath,
  formatProfitWanfen,
  selectBestDirectEdge,
  isMeaningfulPath
} = require('../arb-paths');

const quotes = [
  { id: 1, chain: 'ethereum', showInverse: true },
  { id: 2, chain: 'arbitrum', showInverse: true }
];

const state = new Map([
  [1, { fromSymbol: 'cbBTC', toSymbol: 'WBTC', lastRawPrice: 1.0002, inverseRawPrice: 0.9998 }],
  [2, { fromSymbol: 'WBTC', toSymbol: 'cbBTC', lastRawPrice: 1.0005, inverseRawPrice: 0.9995 }]
]);

const edges = buildEdges(quotes, state, ['cbBTC', 'WBTC']);
const bestTwo = findBestTwoStepCycle(edges);

assert.ok(bestTwo, 'expected a best path');
assert.strictEqual(bestTwo.legs.length, 2);
assert.ok(bestTwo.profitRate > 0);

const exactFilteredEdges = buildEdges(quotes, state, ['CBBTC', 'WBTC']);
assert.strictEqual(exactFilteredEdges.length, 0);

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

const fullRuleEdges = buildRuleEdges({ xBTC: 'cbBTC', 'BTC.b': 'cbBTC' });
assert.ok(fullRuleEdges.some((edge) => edge.from === 'BTC.b' && edge.to === 'xBTC' && edge.rate === 1));
assert.ok(fullRuleEdges.some((edge) => edge.from === 'xBTC' && edge.to === 'BTC.b' && edge.rate === 1));

const caseDistinctRuleEdges = buildRuleEdges({ TBTC: 'tBTC' });
assert.ok(caseDistinctRuleEdges.some((edge) => edge.from === 'TBTC' && edge.to === 'tBTC' && edge.rate === 1));
assert.ok(caseDistinctRuleEdges.some((edge) => edge.from === 'tBTC' && edge.to === 'TBTC' && edge.rate === 1));

const caseDistinctCycles = findTopCycles([
  { from: 'WBTC', to: 'TBTC', rate: 0.9987258, chain: 'sui' },
  { from: 'tBTC', to: 'WBTC', rate: 1.00153977, chain: 'ethereum' },
  ...caseDistinctRuleEdges
], { maxDepth: 4, limit: 10 });
assert.ok(caseDistinctCycles.some((cycle) =>
  cycle.profitRate > 0 &&
  cycle.legs.some((leg) => leg.chain === 'sui' && leg.from === 'WBTC' && leg.to === 'TBTC') &&
  cycle.legs.some((leg) => leg.chain === 'ethereum' && leg.from === 'tBTC' && leg.to === 'WBTC') &&
  cycle.legs.some((leg) => leg.rule && leg.from === 'TBTC' && leg.to === 'tBTC')
));

const directEdges = [
  { from: 'xBTC', to: 'WBTC', rate: 1.01, chain: 'arbitrum' },
  { from: 'cbBTC', to: 'WBTC', rate: 1.005, chain: 'ethereum' }
];

const bestDirect = selectBestDirectEdge(directEdges, 'cbBTC', 'WBTC', { xBTC: 'cbBTC' });

assert.ok(bestDirect);
assert.strictEqual(bestDirect.from, 'cbBTC');
assert.strictEqual(bestDirect.to, 'WBTC');
assert.strictEqual(bestDirect.rate, 1.01);

const aliasEdges = [
  { from: 'BTC.b', to: 'WBTC', rate: 1.002, chain: 'avalanche' },
  { from: 'cbBTC', to: 'WBTC', rate: 1.001, chain: 'ethereum' }
];
const aliasBest = selectBestDirectEdge(aliasEdges, 'BTCB', 'WBTC', { 'BTC.b': 'cbBTC', xBTC: 'cbBTC', BTCB: 'cbBTC' });
assert.ok(aliasBest);
assert.strictEqual(aliasBest.from, 'cbBTC');
assert.strictEqual(aliasBest.to, 'WBTC');
assert.strictEqual(aliasBest.rate, 1.002);

const exactAliasMiss = selectBestDirectEdge(aliasEdges, 'btcb', 'wbtc', { 'BTC.b': 'cbBTC', xBTC: 'cbBTC', BTCB: 'cbBTC' });
assert.strictEqual(exactAliasMiss, null);

const ruleOnly = [
  { from: 'cbBTC', to: 'xBTC', rate: 1, chain: '规则', rule: true },
  { from: 'xBTC', to: 'cbBTC', rate: 1, chain: '规则', rule: true }
];
const mixedPath = [
  { from: 'cbBTC', to: 'WBTC', rate: 1.01, chain: 'ethereum' },
  { from: 'WBTC', to: 'cbBTC', rate: 0.99, chain: '规则', rule: true }
];

assert.strictEqual(isMeaningfulPath(ruleOnly), false);
assert.strictEqual(isMeaningfulPath(mixedPath), true);
assert.strictEqual(findBestCycle(ruleOnly, { maxDepth: 2, acceptCycle: isMeaningfulPath }), null);

const cycleEdges = [
  { from: 'A', to: 'B', rate: 1.02, chain: 'ethereum' },
  { from: 'B', to: 'A', rate: 0.99, chain: 'ethereum' },
  { from: 'A', to: 'C', rate: 1.01, chain: 'base' },
  { from: 'C', to: 'A', rate: 0.995, chain: 'base' },
  { from: 'B', to: 'C', rate: 1.0, chain: 'arbitrum' },
  { from: 'C', to: 'B', rate: 1.0, chain: 'arbitrum' }
];

const symmetricLoopEdges = [
  { from: 'cbBTC', to: 'WBTC', rate: 1.002944, chain: 'Arbitrum' },
  { from: 'WBTC', to: 'BTC.b', rate: 0.997321, chain: 'Monad' },
  { from: 'BTC.b', to: 'cbBTC', rate: 1, chain: '规则', rule: true }
];

const symmetricLoopCycles = findTopCycles(symmetricLoopEdges, { maxDepth: 4, limit: 5 });
assert.strictEqual(symmetricLoopCycles.length, 1);

const preferredStartCycles = findTopCycles(symmetricLoopEdges, {
  maxDepth: 4,
  limit: 5,
  preferredStartSymbols: ['cbBTC']
});
assert.strictEqual(preferredStartCycles[0].legs[0].from, 'cbBTC');

const noConsecutiveRuleCycles = findTopCycles([
  { from: 'xBTC', to: 'WBTC', rate: 1.002912, chain: 'SUI' },
  { from: 'WBTC', to: 'BTC.b', rate: 0.99743, chain: 'Monad' },
  ...buildRuleEdges({ xBTC: 'cbBTC', 'BTC.b': 'cbBTC' })
], { maxDepth: 4, limit: 10 });
assert.ok(noConsecutiveRuleCycles.length > 0);
for (const cycle of noConsecutiveRuleCycles) {
  for (let i = 1; i < cycle.legs.length; i += 1) {
    const prev = cycle.legs[i - 1];
    const curr = cycle.legs[i];
    assert.ok(!(prev.rule && curr.rule), 'should not contain consecutive rule legs');
  }
}

const topCycles = findTopCycles(cycleEdges, { maxDepth: 3, limit: 2 });
assert.strictEqual(topCycles.length, 2);
assert.ok(topCycles[0].profitRate >= topCycles[1].profitRate);

const caseDistinctCycleSet = findTopCycles([
  { from: 'A', to: 'B', rate: 1.01, chain: 'ethereum' },
  { from: 'B', to: 'A', rate: 0.99, chain: 'ethereum' },
  { from: 'A', to: 'b', rate: 1.01, chain: 'ethereum' },
  { from: 'b', to: 'A', rate: 0.99, chain: 'ethereum' }
], { maxDepth: 2, limit: 10 });
assert.strictEqual(caseDistinctCycleSet.length, 2);

assert.strictEqual(formatProfitWanfen(0.0002), '+2.00‱');
assert.strictEqual(formatProfitWanfen(-0.0002), '-2.00‱');

const fixedEdges = [
  { from: 'cbBTC', to: 'WBTC', rate: 1.01, chain: 'ethereum' },
  { from: 'WBTC', to: 'cbBTC', rate: 0.99, chain: 'arbitrum' },
  { from: 'cbBTC', to: 'WBTC', rate: 1.03, chain: 'arbitrum' },
  { from: 'WBTC', to: 'cbBTC', rate: 0.98, chain: 'ethereum' }
];

const fixedRule = { base: 'cbBTC', quote: 'WBTC', chains: ['ethereum', 'arbitrum'], steps: 2 };
const fixedBest = findBestFixedPath(fixedEdges, fixedRule, null);

assert.ok(fixedBest);
assert.strictEqual(fixedBest.legs[0].chain, 'arbitrum');
assert.strictEqual(fixedBest.legs[1].chain, 'ethereum');

const fixedAnyChainEdges = [
  { from: 'GHO', to: 'USDC', rate: 1.001, chain: 'ethereum' },
  { from: 'USDC', to: 'GHO', rate: 1.003, chain: 'base' },
  { from: 'USDC', to: 'GHO', rate: 1.0015, chain: 'arbitrum' },
  { from: 'GHO', to: 'USDC', rate: 1.0002, chain: 'base' }
];
const fixedAnyChainRule = { title: 'GHO <-> USDC', base: 'GHO', quote: 'USDC', steps: 2, crossChain: true };
const fixedAnyChainBest = findBestFixedPath(fixedAnyChainEdges, fixedAnyChainRule, null);

assert.ok(fixedAnyChainBest);
assert.notStrictEqual(fixedAnyChainBest.legs[0].chain, fixedAnyChainBest.legs[1].chain);
assert.strictEqual(fixedAnyChainBest.legs[0].chain, 'ethereum');
assert.strictEqual(fixedAnyChainBest.legs[1].chain, 'base');

const browserCode = fs.readFileSync(path.join(__dirname, '..', 'arb-paths.js'), 'utf8');
const browserSandbox = { window: {} };
vm.createContext(browserSandbox);
assert.doesNotThrow(() => vm.runInContext(browserCode, browserSandbox));
assert.ok(browserSandbox.window.ArbPaths, 'expected ArbPaths to attach to window');
