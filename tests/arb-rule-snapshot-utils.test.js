const assert = require('assert');

const { buildArbRuleSnapshot } = require('../src/arb/arb-rule-snapshot-utils');
const ArbPaths = require('../src/arb/arb-paths');

const fixedEdges = [
  { from: 'cbBTC', to: 'WBTC', rate: 1.01, chain: 'ethereum', quoteId: 1 },
  { from: 'WBTC', to: 'cbBTC', rate: 0.99, chain: 'arbitrum', quoteId: 2 },
  { from: 'cbBTC', to: 'WBTC', rate: 1.03, chain: 'arbitrum', quoteId: 3 },
  { from: 'WBTC', to: 'cbBTC', rate: 0.98, chain: 'ethereum', quoteId: 4 }
];

const snapshot = buildArbRuleSnapshot({
  fixedRules: [
    {
      id: 'fixed:wbtc-eth-arb',
      title: 'WBTC ETH <-> ARB',
      base: 'cbBTC',
      quote: 'WBTC',
      chains: ['ethereum', 'arbitrum'],
      steps: 2,
      resultLimit: 2,
      categoryNames: ['WBTC监控']
    }
  ],
  specialRules: [
    {
      id: 'special:wbtc-bybit',
      title: 'WBTC <-> BYBIT',
      type: 'pair-bybit',
      categoryName: 'WBTC监控'
    },
    {
      id: 'special:usde-bybit',
      title: 'USDe <-> BYBIT',
      type: 'pair-bybit',
      categoryName: 'USD监控'
    }
  ],
  allEdgesWithRules: fixedEdges,
  aliasRules: null,
  quoteMetaById: new Map([
    [1, { categoryName: 'WBTC监控' }],
    [2, { categoryName: 'WBTC监控' }],
    [3, { categoryName: 'WBTC监控' }],
    [4, { categoryName: 'WBTC监控' }]
  ]),
  quotesByCategoryName: new Map([
    ['WBTC监控', [{ id: 101, chain: 'Bybit' }]],
    ['USD监控', [{ id: 202, chain: 'Bybit' }]]
  ]),
  quoteStateById: new Map([
    [101, {
      fromSymbol: 'WBTC',
      toSymbol: 'BTC',
      cexOrderbook: {
        bestBidPrice: 0.9997,
        bestAskPrice: 1.0003
      }
    }],
    [202, {
      fromSymbol: 'USDe',
      toSymbol: 'USDT',
      cexOrderbook: {
        bestBidPrice: 0.9999,
        bestAskPrice: 1.0002
      }
    }]
  ]),
  arbPathsApi: ArbPaths,
  arbFixedUtils: {
    filterEdgesForFixedRule(rule, edges) {
      assert.strictEqual(rule.id, 'fixed:wbtc-eth-arb');
      return edges;
    }
  },
  arbSpecialUtils: {
    buildSpecialArbOpportunities(options) {
      const rule = options.rules[0];
      assert.deepStrictEqual(options.mutedPathLegs, []);
      assert.strictEqual(options.mutedPathLegUtils, null);
      if (rule.id === 'special:wbtc-bybit') {
        return [{
          ruleId: 'special:wbtc-bybit',
          label: 'WBTC <-> BYBIT',
          cycle: {
            legs: [
              { from: 'cbBTC', to: 'WBTC', chain: 'arbitrum', rate: 1.002 },
              { from: 'WBTC', to: 'BTC', chain: 'Bybit', rate: 0.9997 }
            ],
            profitRate: 0.0016994
          }
        }];
      }
      return [{
        ruleId: 'special:usde-bybit',
        label: 'USDe <-> BYBIT',
        cycle: {
          legs: [
            { from: 'USDT', to: 'USDe', chain: 'ethereum', rate: 1.0015 },
            { from: 'USDe', to: 'USDT', chain: 'Bybit', rate: 0.9999 }
          ],
          profitRate: 0.00139985
        }
      }];
    }
  }
});

assert.strictEqual(snapshot.fixedResults.length, 1);
assert.strictEqual(snapshot.fixedResults[0].cycles.length, 2);
assert.strictEqual(snapshot.fixedByRuleId['fixed:wbtc-eth-arb'][0].legs[0].chain, 'arbitrum');
assert.strictEqual(snapshot.specialResults.length, 2);
assert.strictEqual(snapshot.specialByRuleId['special:wbtc-bybit'][0].ruleId, 'special:wbtc-bybit');
assert.strictEqual(snapshot.specialByRuleId['special:usde-bybit'][0].ruleId, 'special:usde-bybit');

const snapshotDefaultLimit = buildArbRuleSnapshot({
  fixedRules: [
    {
      id: 'fixed:wbtc-default-limit',
      title: 'WBTC default limit',
      base: 'cbBTC',
      quote: 'WBTC',
      chains: ['ethereum', 'arbitrum'],
      steps: 2
    }
  ],
  specialRules: [],
  allEdgesWithRules: fixedEdges,
  aliasRules: null,
  quoteMetaById: new Map(),
  quotesByCategoryName: new Map(),
  quoteStateById: new Map(),
  arbPathsApi: ArbPaths,
  arbFixedUtils: {
    filterEdgesForFixedRule(rule, edges) {
      assert.strictEqual(rule.id, 'fixed:wbtc-default-limit');
      return edges;
    }
  }
});

assert.strictEqual(snapshotDefaultLimit.fixedResults.length, 1);
assert.strictEqual(snapshotDefaultLimit.fixedResults[0].cycles.length, 1);

const snapshotFromTemplates = buildArbRuleSnapshot({
  fixedRules: [
    {
      id: 'fixed:tbtc-btc',
      title: 'tBTC - BTC',
      base: 'tBTC',
      quote: 'cbBTC',
      steps: 2,
      crossChain: true,
      resultLimit: 2
    }
  ],
  specialRules: [],
  fixedTemplatesByRuleId: {
    'fixed:tbtc-btc': [
      {
        legs: [
          { chain: 'ethereum', from: 'tBTC', to: 'cbBTC' },
          { chain: 'sui', from: 'cbBTC', to: 'tBTC' }
        ]
      },
      {
        legs: [
          { chain: 'ethereum', from: 'tBTC', to: 'cbBTC' },
          { chain: 'base', from: 'cbBTC', to: 'tBTC' }
        ]
      }
    ]
  },
  allEdgesWithRules: [
    { quoteId: 11, chain: 'ethereum', from: 'tBTC', to: 'cbBTC', rate: 0.999 },
    { quoteId: 12, chain: 'sui', from: 'xBTC', to: 'tBTC', rate: 1.002 },
    { quoteId: 14, chain: 'sui', from: 'cbBTC', to: 'tBTC', rate: 1.0011 },
    { quoteId: 13, chain: 'base', from: 'cbBTC', to: 'tBTC', rate: 1.0005 }
  ],
  quoteStateById: new Map(),
  aliasRules: {
    xBTC: 'cbBTC'
  },
  arbPathsApi: {
    findFixedPaths() {
      throw new Error('should not recompute fixed paths when templates are provided');
    }
  }
});

assert.strictEqual(snapshotFromTemplates.fixedResults.length, 1);
assert.strictEqual(snapshotFromTemplates.fixedResults[0].cycles.length, 2);
assert.strictEqual(snapshotFromTemplates.fixedByRuleId['fixed:tbtc-btc'][0].legs[1].chain, 'sui');
assert.strictEqual(snapshotFromTemplates.fixedByRuleId['fixed:tbtc-btc'][0].legs[1].quoteId, 12);
assert.ok(snapshotFromTemplates.fixedByRuleId['fixed:tbtc-btc'][0].profitRate > snapshotFromTemplates.fixedByRuleId['fixed:tbtc-btc'][1].profitRate);

const snapshotKeepsCategoryScopedEdges = buildArbRuleSnapshot({
  fixedRules: [
    {
      id: 'fixed:wbtc-eth-arb',
      title: 'WBTC ETH <-> ARB',
      base: 'cbBTC',
      quote: 'WBTC',
      chains: ['ethereum', 'arbitrum'],
      steps: 2,
      categoryNames: ['WBTC监控']
    }
  ],
  specialRules: [],
  fixedTemplatesByRuleId: {
    'fixed:wbtc-eth-arb': [
      {
        legs: [
          { chain: 'ethereum', from: 'cbBTC', to: 'WBTC' },
          { chain: 'arbitrum', from: 'WBTC', to: 'cbBTC' }
        ]
      }
    ]
  },
  allEdgesWithRules: [
    { quoteId: 201, chain: 'ethereum', from: 'cbBTC', to: 'WBTC', rate: 1.001 },
    { quoteId: 202, chain: 'arbitrum', from: 'WBTC', to: 'cbBTC', rate: 0.9995 },
    { quoteId: 301, chain: 'ethereum', from: 'cbBTC', to: 'WBTC', rate: 1.02 },
    { quoteId: 302, chain: 'arbitrum', from: 'WBTC', to: 'cbBTC', rate: 1.01 }
  ],
  quoteMetaById: new Map([
    [201, { categoryName: 'WBTC监控' }],
    [202, { categoryName: 'WBTC监控' }],
    [301, { categoryName: 'TBTC监控' }],
    [302, { categoryName: 'TBTC监控' }]
  ]),
  quoteStateById: new Map(),
  aliasRules: null,
  arbPathsApi: ArbPaths,
  arbFixedUtils: require('../src/arb/arb-fixed-utils')
});

assert.strictEqual(snapshotKeepsCategoryScopedEdges.fixedResults.length, 1);
assert.strictEqual(snapshotKeepsCategoryScopedEdges.fixedResults[0].cycles.length, 1);
assert.deepStrictEqual(
  snapshotKeepsCategoryScopedEdges.fixedByRuleId['fixed:wbtc-eth-arb'][0].legs.map((leg) => leg.quoteId),
  [201, 202]
);

const snapshotSkipsMutedLegs = buildArbRuleSnapshot({
  fixedRules: [
    {
      id: 'fixed:wbtc-eth-arb',
      title: 'WBTC ETH <-> ARB',
      base: 'cbBTC',
      quote: 'WBTC',
      chains: ['ethereum', 'arbitrum'],
      steps: 2,
      resultLimit: 2,
      categoryNames: ['WBTC监控']
    }
  ],
  specialRules: [],
  allEdgesWithRules: [
    { quoteId: 201, chain: 'ethereum', from: 'cbBTC', to: 'WBTC', rate: 1.001, direction: 'forward', pricingMode: 'raw' },
    { quoteId: 202, chain: 'arbitrum', from: 'WBTC', to: 'cbBTC', rate: 0.9995, direction: 'forward', pricingMode: 'raw' }
  ],
  quoteMetaById: new Map([
    [201, { categoryName: 'WBTC监控' }],
    [202, { categoryName: 'WBTC监控' }]
  ]),
  mutedPathLegs: [
    {
      quoteId: 201,
      direction: 'forward',
      pricingMode: 'raw',
      mutedAt: 1000,
      expiresAt: 2000
    }
  ],
  mutedPathLegUtils: {
    filterMutedPathLegs(edges, mutedLegs, nowMs) {
      assert.strictEqual(nowMs, 1500);
      return edges.filter((edge) => !mutedLegs.some((item) => item.quoteId === edge.quoteId));
    }
  },
  nowMs: 1500,
  quoteStateById: new Map(),
  aliasRules: null,
  arbPathsApi: ArbPaths,
  arbFixedUtils: require('../src/arb/arb-fixed-utils')
});

assert.strictEqual(snapshotSkipsMutedLegs.fixedResults.length, 1);
assert.deepStrictEqual(snapshotSkipsMutedLegs.fixedResults[0].cycles, []);

let specialMutedOptions = null;
const snapshotSkipsMutedSpecialCycle = buildArbRuleSnapshot({
  fixedRules: [],
  specialRules: [{ id: 'special:test', categoryName: 'TEST' }],
  quotesByCategoryName: new Map([['TEST', [{ id: 501, chain: 'ethereum' }]]]),
  quoteStateById: new Map(),
  mutedPathLegs: [{
    quoteId: 501,
    direction: 'forward',
    pricingMode: 'raw',
    mutedAt: 1000,
    expiresAt: 3000
  }],
  mutedPathLegUtils: {
    filterMutedPathLegs: (edges) => edges,
    filterMutedCycles: (cycles, mutedLegs, nowMs) => {
      assert.strictEqual(nowMs, 2000);
      return cycles.filter((cycle) => !cycle.legs.some((leg) => (
        mutedLegs.some((entry) => entry.quoteId === leg.quoteId)
      )));
    }
  },
  nowMs: 2000,
  arbSpecialUtils: {
    buildSpecialArbOpportunities(options) {
      specialMutedOptions = options;
      return [{
        ruleId: 'special:test',
        cycle: {
          legs: [{ quoteId: 501, direction: 'forward', pricingMode: 'raw', rate: 1.01 }],
          profitRate: 0.01
        }
      }];
    }
  }
});
assert.deepStrictEqual(specialMutedOptions.mutedPathLegs.map((entry) => entry.quoteId), [501]);
assert.strictEqual(specialMutedOptions.nowMs, 2000);
assert.deepStrictEqual(snapshotSkipsMutedSpecialCycle.specialByRuleId['special:test'], []);
