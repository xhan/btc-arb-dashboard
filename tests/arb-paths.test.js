const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  buildEdges,
  formatLegLine,
  buildRuleEdges,
  findTopCycles,
  findFixedPaths,
  findBestFixedPath,
  formatProfitWanfen,
  isMeaningfulPath
} = require('../src/arb/arb-paths');

const quotes = [
  { id: 1, chain: 'ethereum', showInverse: true },
  { id: 2, chain: 'arbitrum', showInverse: true }
];

const state = new Map([
  [1, { fromSymbol: 'cbBTC', toSymbol: 'WBTC', lastRawPrice: 1.0002, inverseRawPrice: 0.9998 }],
  [2, { fromSymbol: 'WBTC', toSymbol: 'cbBTC', lastRawPrice: 1.0005, inverseRawPrice: 0.9995 }]
]);

const edges = buildEdges(quotes, state, ['cbBTC', 'WBTC']);
const bestTwo = findTopCycles(edges, { maxDepth: 2, limit: 1 })[0];

assert.ok(bestTwo, 'expected a best path');
assert.strictEqual(bestTwo.legs.length, 2);
assert.ok(bestTwo.profitRate > 0);

const exactFilteredEdges = buildEdges(quotes, state, ['CBBTC', 'WBTC']);
assert.strictEqual(exactFilteredEdges.length, 0);

const crossChainEdges = buildEdges([
  { id: 21, chain: 'arbitrum', toChain: 'ethereum', showInverse: true }
], new Map([
  [21, { fromSymbol: 'USDC', toSymbol: 'USDC', lastRawPrice: 0.999, inverseRawPrice: 0.998 }]
]));
assert.deepStrictEqual(crossChainEdges, [], 'cross-chain quotes should not enter same-chain arb paths');

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
const bestCycle = findTopCycles(multiEdges.concat(ruleEdges), { maxDepth: 4, limit: 1 })[0];

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

const aliasEdges = [
  { from: 'BTC.b', to: 'WBTC', rate: 1.002, chain: 'avalanche' },
  { from: 'cbBTC', to: 'WBTC', rate: 1.001, chain: 'ethereum' },
  { from: 'WBTC', to: 'BTC.b', rate: 0.999, chain: 'ethereum' },
  { from: 'WBTC', to: 'cbBTC', rate: 0.998, chain: 'avalanche' }
];
const aliasFixedPath = findBestFixedPath(aliasEdges, {
  base: 'BTCB',
  quote: 'WBTC',
  chains: ['avalanche', 'ethereum'],
  steps: 2
}, { 'BTC.b': 'cbBTC', xBTC: 'cbBTC', BTCB: 'cbBTC' });
assert.ok(aliasFixedPath);
assert.strictEqual(aliasFixedPath.legs[0].rawFrom, 'BTC.b');
assert.strictEqual(aliasFixedPath.legs[0].from, 'cbBTC');
assert.strictEqual(aliasFixedPath.legs[0].to, 'WBTC');
assert.strictEqual(aliasFixedPath.legs[0].rate, 1.002);

const exactAliasMiss = findBestFixedPath(aliasEdges, {
  base: 'btcb',
  quote: 'wbtc',
  chains: ['avalanche', 'ethereum'],
  steps: 2
}, { 'BTC.b': 'cbBTC', xBTC: 'cbBTC', BTCB: 'cbBTC' });
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
assert.strictEqual(findTopCycles(ruleOnly, { maxDepth: 2, limit: 1, acceptCycle: isMeaningfulPath }).length, 0);

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

const orderedPriorityCycles = findTopCycles([
  { from: 'ETH', to: 'USDC', rate: 1.002, chain: 'ethereum' },
  { from: 'USDC', to: 'WBTC', rate: 1.001, chain: 'base' },
  { from: 'WBTC', to: 'ETH', rate: 0.9985, chain: 'arbitrum' }
], {
  maxDepth: 3,
  limit: 5,
  preferredStartSymbols: ['cbBTC', 'WBTC', 'ETH']
});
assert.strictEqual(orderedPriorityCycles[0].legs[0].from, 'WBTC');

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

const ruleDoesNotConsumeDepthCycles = findTopCycles([
  { from: 'WBTC', to: 'TBTC', rate: 0.9987258, chain: 'sui' },
  { from: 'tBTC', to: 'WBTC', rate: 1.00153977, chain: 'ethereum' },
  ...buildRuleEdges({ TBTC: 'tBTC' })
], { maxDepth: 2, limit: 10 });
assert.ok(
  ruleDoesNotConsumeDepthCycles.some((cycle) =>
    cycle.profitRate > 0 &&
    cycle.legs.some((leg) => leg.chain === 'sui' && leg.from === 'WBTC' && leg.to === 'TBTC') &&
    cycle.legs.some((leg) => leg.chain === 'ethereum' && leg.from === 'tBTC' && leg.to === 'WBTC') &&
    cycle.legs.some((leg) => leg.rule && leg.from === 'TBTC' && leg.to === 'tBTC')
  ),
  'rule legs should not consume maxDepth when counting path length'
);

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
const fixedAll = findFixedPaths(fixedEdges, { ...fixedRule, resultLimit: 2 }, null);

assert.ok(fixedBest);
assert.strictEqual(fixedBest.legs[0].chain, 'arbitrum');
assert.strictEqual(fixedBest.legs[1].chain, 'ethereum');
assert.strictEqual(fixedAll.length, 2);
assert.strictEqual(fixedAll[0].legs[0].chain, 'arbitrum');

const usdeUsdFixedPaths = findFixedPaths([
  { from: 'USDe', to: 'USD₮0', rate: 1.0003, chain: 'avalanche', quoteId: 901 },
  { from: 'USD₮0', to: 'USDE', rate: 0.9999, chain: 'base', quoteId: 902 }
], {
  base: 'USDe',
  quote: 'USDT',
  steps: 2,
  crossChain: true,
  resultLimit: 2
}, {
  USDE: 'USDe',
  'USD₮0': 'USDT'
});
assert.strictEqual(usdeUsdFixedPaths.length, 1);
assert.deepStrictEqual(usdeUsdFixedPaths[0].legs.map((leg) => leg.quoteId), [901, 902]);
assert.strictEqual(fixedAll[1].legs[0].chain, 'ethereum');

const fixedAnyChainEdges = [
  { from: 'GHO', to: 'USDC', rate: 1.001, chain: 'ethereum' },
  { from: 'USDC', to: 'GHO', rate: 1.003, chain: 'base' },
  { from: 'USDC', to: 'GHO', rate: 1.0015, chain: 'arbitrum' },
  { from: 'GHO', to: 'USDC', rate: 1.0002, chain: 'base' }
];
const fixedAnyChainRule = { title: 'GHO <-> USDC', base: 'GHO', quote: 'USDC', steps: 2, crossChain: true };
const fixedAnyChainBest = findBestFixedPath(fixedAnyChainEdges, fixedAnyChainRule, null);
const fixedAnyChainWithoutBase = findFixedPaths(fixedAnyChainEdges, {
  ...fixedAnyChainRule,
  excludeChains: ['base']
}, null);

assert.ok(fixedAnyChainBest);
assert.notStrictEqual(fixedAnyChainBest.legs[0].chain, fixedAnyChainBest.legs[1].chain);
assert.strictEqual(fixedAnyChainBest.legs[0].chain, 'ethereum');
assert.strictEqual(fixedAnyChainBest.legs[1].chain, 'base');
assert.strictEqual(fixedAnyChainWithoutBase.length, 1);
assert.strictEqual(fixedAnyChainWithoutBase[0].legs[0].chain, 'ethereum');
assert.strictEqual(fixedAnyChainWithoutBase[0].legs[1].chain, 'arbitrum');

const fixedAliasDisplayEdges = [
  { from: 'tBTC', to: 'cbBTC', rate: 0.999598, chain: 'ethereum' },
  { from: 'xBTC', to: 'tBTC', rate: 1.00053, chain: 'sui' }
];
const fixedAliasDisplayRule = { title: 'tBTC - BTC', base: 'tBTC', quote: 'cbBTC', steps: 2, crossChain: true };
const fixedAliasDisplayBest = findBestFixedPath(fixedAliasDisplayEdges, fixedAliasDisplayRule, { xBTC: 'cbBTC' });
assert.ok(fixedAliasDisplayBest);
const suiLegForAliasDisplay = fixedAliasDisplayBest.legs.find((leg) => leg.chain === 'sui');
assert.ok(suiLegForAliasDisplay);
assert.strictEqual(suiLegForAliasDisplay.rawFrom, 'xBTC');
assert.strictEqual(suiLegForAliasDisplay.rawTo, 'tBTC');
assert.strictEqual(suiLegForAliasDisplay.from, 'cbBTC');
assert.strictEqual(suiLegForAliasDisplay.to, 'tBTC');

const fixedAliasDisplayPreferred = findBestFixedPath(
  fixedAliasDisplayEdges,
  fixedAliasDisplayRule,
  { xBTC: 'cbBTC' },
  { preferredStartSymbols: ['cbBTC', 'WBTC', 'ETH'] }
);
assert.ok(fixedAliasDisplayPreferred);
assert.strictEqual(fixedAliasDisplayPreferred.legs[0].from, 'cbBTC');
assert.strictEqual(fixedAliasDisplayPreferred.legs[0].chain, 'sui');

const fixedExcludeSymbolEdges = [
  { from: 'GHO', to: 'USDC.e', rate: 1.005, chain: 'base' },
  { from: 'USDC.e', to: 'GHO', rate: 1.002, chain: 'ethereum' },
  { from: 'GHO', to: 'USDC', rate: 1.001, chain: 'base' },
  { from: 'USDC', to: 'GHO', rate: 1.001, chain: 'ethereum' }
];
const fixedExcludeSymbolCycles = findFixedPaths(fixedExcludeSymbolEdges, {
  title: 'GHO <-> USDC',
  base: 'GHO',
  quote: 'USDC',
  steps: 2,
  crossChain: true,
  excludeSymbols: ['USDC.e']
}, null);

assert.strictEqual(fixedExcludeSymbolCycles.length, 1);
assert.ok(fixedExcludeSymbolCycles.every((cycle) => cycle.legs.every((leg) => leg.rawFrom !== 'USDC.e' && leg.rawTo !== 'USDC.e')));

const browserCode = fs.readFileSync(path.join(__dirname, '..', 'src/arb/arb-paths.js'), 'utf8');
const browserSandbox = { window: {} };
vm.createContext(browserSandbox);
assert.doesNotThrow(() => vm.runInContext(browserCode, browserSandbox));
assert.ok(browserSandbox.window.ArbPaths, 'expected ArbPaths to attach to window');
assert.strictEqual(browserSandbox.buildEdges, undefined, 'arb-path helpers should not leak to global scope');
assert.strictEqual(browserSandbox.isCrossChainQuote, undefined, 'arb-path helpers should not leak to global scope');
