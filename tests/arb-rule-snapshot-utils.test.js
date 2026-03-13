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
      id: 'special:dex-cex-wbtc',
      title: 'DEX <-> CEX',
      type: 'dex-cex',
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
        ruleId: 'special:dex-cex-wbtc',
        label: 'DEX <-> CEX',
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
assert.strictEqual(snapshot.specialByRuleId['special:dex-cex-wbtc'][0].ruleId, 'special:dex-cex-wbtc');
