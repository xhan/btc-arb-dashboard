const assert = require('assert');

const {
  buildArbPathTopologyCacheKey,
  buildTopologyEdges,
  buildCycleTemplates,
  buildFixedPathTemplates,
  evaluateCycleTemplate,
  evaluateFixedPathTemplate
} = require('../arb-path-template-cache-utils');

const dashboardState = [
  {
    id: 'cat-1',
    name: 'WBTC监控',
    quotes: [
      { id: 1, chain: 'ethereum', showInverse: true, paused: false },
      { id: 2, chain: 'arbitrum', showInverse: true, paused: false }
    ]
  }
];

const quoteStateA = new Map([
  [1, { fromSymbol: 'cbBTC', toSymbol: 'WBTC', lastRawPrice: 1.001, inverseRawPrice: 0.999 }],
  [2, { fromSymbol: 'WBTC', toSymbol: 'cbBTC', lastRawPrice: 1.002, inverseRawPrice: 0.998 }]
]);

const quoteStateB = new Map([
  [1, { fromSymbol: 'cbBTC', toSymbol: 'WBTC', lastRawPrice: 1.123, inverseRawPrice: 0.888 }],
  [2, { fromSymbol: 'WBTC', toSymbol: 'cbBTC', lastRawPrice: 1.456, inverseRawPrice: 0.777 }]
]);

assert.strictEqual(
  buildArbPathTopologyCacheKey(dashboardState, quoteStateA),
  buildArbPathTopologyCacheKey(dashboardState, quoteStateB),
  'price-only changes should not invalidate topology cache'
);

const quoteStateC = new Map([
  [1, { fromSymbol: 'xBTC', toSymbol: 'WBTC', lastRawPrice: 1.001, inverseRawPrice: 0.999 }],
  [2, { fromSymbol: 'WBTC', toSymbol: 'cbBTC', lastRawPrice: 1.002, inverseRawPrice: 0.998 }]
]);

assert.notStrictEqual(
  buildArbPathTopologyCacheKey(dashboardState, quoteStateA),
  buildArbPathTopologyCacheKey(dashboardState, quoteStateC),
  'symbol changes must invalidate topology cache'
);

const topologyEdges = buildTopologyEdges(dashboardState[0].quotes, quoteStateA);
assert.deepStrictEqual(
  topologyEdges.map((edge) => ({ from: edge.from, to: edge.to, rate: edge.rate, inverse: Boolean(edge.inverse) })),
  [
    { from: 'cbBTC', to: 'WBTC', rate: 1, inverse: false },
    { from: 'WBTC', to: 'cbBTC', rate: 1, inverse: true },
    { from: 'WBTC', to: 'cbBTC', rate: 1, inverse: false },
    { from: 'cbBTC', to: 'WBTC', rate: 1, inverse: true }
  ]
);

const crossChainTopologyEdges = buildTopologyEdges([
  { id: 9, chain: 'arbitrum', toChain: 'ethereum', showInverse: true, paused: false }
], new Map([
  [9, { fromSymbol: 'USDC', toSymbol: 'USDC', lastRawPrice: 0.999, inverseRawPrice: 0.998 }]
]));
assert.deepStrictEqual(crossChainTopologyEdges, [], 'cross-chain quotes should not enter cached arb topology');

const templates = buildCycleTemplates(topologyEdges, {
  maxDepth: 3,
  limit: 10,
  acceptCycle: () => true,
  preferredStartSymbols: ['cbBTC']
});
assert.ok(Array.isArray(templates) && templates.length > 0, 'should build cycle templates from topology edges');

const evaluated = evaluateCycleTemplate(templates[0], quoteStateA);
assert.ok(evaluated, 'template should be evaluable with current prices');
assert.ok(typeof evaluated.profitRate === 'number');
assert.ok(evaluated.legs.every((leg) => typeof leg.rate === 'number'));

const unavailable = evaluateCycleTemplate(templates[0], new Map([
  [1, { fromSymbol: 'cbBTC', toSymbol: 'WBTC', lastRawPrice: null, inverseRawPrice: null }]
]));
assert.strictEqual(unavailable, null, 'missing live leg price should invalidate evaluated template');

const fixedRule = {
  id: 'fixed:wbtc-eth-arb',
  title: 'WBTC ETH <-> ARB',
  base: 'cbBTC',
  quote: 'WBTC',
  chains: ['ethereum', 'arbitrum'],
  steps: 2
};

const fixedTopologyEdges = [
  { quoteId: 101, chain: 'ethereum', from: 'cbBTC', to: 'WBTC', rate: 1 },
  { quoteId: 102, chain: 'ethereum', from: 'cbBTC', to: 'WBTC', rate: 1 },
  { quoteId: 201, chain: 'arbitrum', from: 'WBTC', to: 'cbBTC', rate: 1 }
];

const fixedTemplates = buildFixedPathTemplates(fixedTopologyEdges, fixedRule, null, { limit: 5 });
assert.ok(Array.isArray(fixedTemplates) && fixedTemplates.length > 0, 'should build fixed templates');
assert.strictEqual(fixedTemplates[0].legs[0].quoteId, undefined, 'fixed templates should only keep route shape');

const fixedAliasTemplates = buildFixedPathTemplates([
  { quoteId: 301, chain: 'ethereum', from: 'tBTC', to: 'cbBTC', rate: 1 },
  { quoteId: 302, chain: 'sui', from: 'xBTC', to: 'tBTC', rate: 1 }
], {
  id: 'fixed:tbtc-btc',
  title: 'tBTC - BTC',
  base: 'tBTC',
  quote: 'cbBTC',
  steps: 2,
  crossChain: true
}, { xBTC: 'cbBTC' }, {
  limit: 5,
  preferredStartSymbols: ['cbBTC', 'WBTC', 'ETH']
});
assert.ok(Array.isArray(fixedAliasTemplates) && fixedAliasTemplates.length > 0);
assert.strictEqual(fixedAliasTemplates[0].legs[0].from, 'cbBTC');
assert.strictEqual(fixedAliasTemplates[0].legs[0].chain, 'sui');

const evaluatedFixed = evaluateFixedPathTemplate(fixedTemplates[0], [
  { quoteId: 101, chain: 'ethereum', from: 'cbBTC', to: 'WBTC', rate: 1.001 },
  { quoteId: 102, chain: 'ethereum', from: 'cbBTC', to: 'WBTC', rate: 1.003 },
  { quoteId: 201, chain: 'arbitrum', from: 'WBTC', to: 'cbBTC', rate: 0.999 }
]);
assert.ok(evaluatedFixed, 'fixed template should be evaluable from live edges');
assert.strictEqual(evaluatedFixed.legs[0].quoteId, 102, 'fixed template should pick best live quote on the same chain');
