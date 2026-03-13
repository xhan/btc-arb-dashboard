const assert = require('assert');
const { splitSectionsIntoColumns } = require('../arb-panel-layout-utils');

const sections = [
  { title: '固定路径', opportunities: Array.from({ length: 8 }, (_, index) => ({ label: `F${index + 1}` })) },
  { title: '特殊规则', opportunities: Array.from({ length: 3 }, (_, index) => ({ label: `S${index + 1}` })) }
];
const columns = splitSectionsIntoColumns(sections, 6, 2);

assert.strictEqual(columns.length, 2);
assert.deepStrictEqual(columns[0].map((item) => [item.title, item.opportunities.length]), [['固定路径', 6]]);
assert.deepStrictEqual(columns[1].map((item) => [item.title, item.opportunities.length]), [['固定路径', 2], ['特殊规则', 3]]);
