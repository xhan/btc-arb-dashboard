const assert = require('assert');

const { filterEdgesForFixedRule } = require('../arb-fixed-utils');

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
