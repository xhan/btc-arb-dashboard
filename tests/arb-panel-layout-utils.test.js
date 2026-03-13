const assert = require('assert');
const { splitSectionsIntoColumns, resolveItemsBySelectors } = require('../arb-panel-layout-utils');

const sections = [
  { title: '固定路径', opportunities: Array.from({ length: 8 }, (_, index) => ({ label: `F${index + 1}` })) },
  { title: '特殊规则', opportunities: Array.from({ length: 3 }, (_, index) => ({ label: `S${index + 1}` })) }
];
const columns = splitSectionsIntoColumns(sections, 6, 2);

assert.strictEqual(columns.length, 2);
assert.deepStrictEqual(columns[0].map((item) => [item.title, item.opportunities.length]), [['固定路径', 6]]);
assert.deepStrictEqual(columns[1].map((item) => [item.title, item.opportunities.length]), [['固定路径', 2], ['特殊规则', 3]]);

const items = [
  { id: 11, name: 'WBTC监控' },
  { id: 12, name: 'LBTC监控' },
  { id: 13, name: 'TBTC监控' },
  { id: 14, name: '没太多流动性的BTC' },
  { id: 15, name: 'USD监控' }
];

assert.deepStrictEqual(
  resolveItemsBySelectors(items, [0, 2, '没太多流动性的BTC']).map((item) => item.name),
  ['WBTC监控', 'TBTC监控', '没太多流动性的BTC']
);

assert.deepStrictEqual(
  resolveItemsBySelectors(items, [12, 'USD监控']).map((item) => item.name),
  ['LBTC监控', 'USD监控']
);

assert.deepStrictEqual(resolveItemsBySelectors(items, [99, '不存在']), []);
