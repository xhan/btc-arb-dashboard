const assert = require('assert');

const { buildArbRuleSnapshot } = require('../arb-rule-snapshot-utils');
const ArbPaths = require('../arb-paths');

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
      type: 'wbtc-bybit',
      categoryName: 'WBTC监控'
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
    ['WBTC监控', [{ id: 101, chain: 'Bybit' }]]
  ]),
  quoteStateById: new Map([
    [101, {
      fromSymbol: 'WBTC',
      toSymbol: 'BTC',
      cexOrderbook: {
        bestBidPrice: 0.9997,
        bestAskPrice: 1.0003
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
    buildSpecialArbOpportunities() {
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
  }
});

assert.strictEqual(snapshot.fixedResults.length, 1);
assert.strictEqual(snapshot.fixedResults[0].cycles.length, 2);
assert.strictEqual(snapshot.fixedByRuleId['fixed:wbtc-eth-arb'][0].legs[0].chain, 'arbitrum');
assert.strictEqual(snapshot.specialResults.length, 1);
assert.strictEqual(snapshot.specialByRuleId['special:wbtc-bybit'][0].ruleId, 'special:wbtc-bybit');

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
