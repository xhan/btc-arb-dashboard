const assert = require('assert');

const {
  buildFixedRuleEdgeIndex,
  resolveEdgesForFixedRule,
  filterEdgesForFixedRule
} = require('../src/arb/arb-fixed-utils');

const rule = {
  title: 'WBTC ETH <-> ARB',
  categoryNames: ['WBTC监控']
};

const edges = [
  { from: 'cbBTC', to: 'WBTC', rate: 1.002187, quoteId: 1, chain: 'ethereum' },
  { from: 'cbBTC', to: 'WBTC', rate: 1.002216, quoteId: 2, chain: 'ethereum' },
  { from: 'WBTC', to: 'cbBTC', rate: 0.997872, quoteId: 3, chain: 'arbitrum' },
  { from: 'cbBTC', to: 'xBTC', rate: 1, rule: true, chain: '规则' }
];

const quoteMetaById = new Map([
  [1, { categoryName: 'WBTC监控' }],
  [2, { categoryName: 'TBTC监控' }],
  [3, { categoryName: 'WBTC监控' }]
]);

const filtered = filterEdgesForFixedRule(rule, edges, quoteMetaById);

assert.strictEqual(filtered.length, 3);
assert.ok(filtered.some((edge) => edge.quoteId === 1));
assert.ok(!filtered.some((edge) => edge.quoteId === 2));
assert.ok(filtered.some((edge) => edge.quoteId === 3));
assert.ok(filtered.some((edge) => edge.rule === true));

const edgeIndex = buildFixedRuleEdgeIndex(edges, quoteMetaById);

assert.ok(edgeIndex);
assert.strictEqual(edgeIndex.ruleEdges.length, 1);
assert.strictEqual(edgeIndex.edgesByCategoryName.get('WBTC监控').length, 2);
assert.strictEqual(edgeIndex.edgesByCategoryName.get('TBTC监控').length, 1);

const resolvedSingleCategory = resolveEdgesForFixedRule(rule, edgeIndex);
assert.deepStrictEqual(
  resolvedSingleCategory.map((edge) => edge.quoteId ?? 'rule'),
  [1, 3, 'rule']
);

const resolvedMultiCategory = resolveEdgesForFixedRule({
  title: 'BTC buckets',
  categoryNames: ['TBTC监控', 'WBTC监控']
}, edgeIndex);
assert.deepStrictEqual(
  resolvedMultiCategory.map((edge) => edge.quoteId ?? 'rule'),
  [1, 2, 3, 'rule']
);

assert.strictEqual(
  resolveEdgesForFixedRule({ title: 'All edges', categoryNames: [] }, edgeIndex),
  edgeIndex.allEdges
);

const usdRule = {
  title: 'USDE - USDT',
  categoryNames: ['USD监控']
};

const usdEdges = [
  { from: 'USDe', to: 'USDT', rate: 1.0002, quoteId: 11, chain: 'ethereum' },
  { from: 'USDT', to: 'USDe', rate: 0.9999, quoteId: 12, chain: 'base' },
  { from: 'USDe', to: 'USDT', rate: 1.0004, quoteId: 13, chain: 'Bybit' }
];

const usdQuoteMetaById = new Map([
  [11, { categoryName: 'USD监控' }],
  [12, { categoryName: 'USD监控' }],
  [13, { categoryName: 'USD监控' }]
]);

const usdFiltered = filterEdgesForFixedRule(usdRule, usdEdges, usdQuoteMetaById);

assert.deepStrictEqual(
  usdFiltered.map((edge) => edge.quoteId),
  [11, 12, 13]
);
