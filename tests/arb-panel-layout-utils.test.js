const assert = require('assert');
const {
  splitSectionsIntoColumns,
  resolveItemsBySelectors,
  selectPositiveCyclesOrBest,
  getCycleDisplayState,
  mapEntriesForDisplayCycles
} = require('../arb-panel-layout-utils');

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

assert.deepStrictEqual(
  selectPositiveCyclesOrBest([
    { id: 'neg-2', profitRate: -0.002 },
    { id: 'pos-1', profitRate: 0.001 },
    { id: 'pos-2', profitRate: 0.003 }
  ]).map((item) => item.id),
  ['pos-1', 'pos-2']
);

assert.deepStrictEqual(
  selectPositiveCyclesOrBest([
    { id: 'neg-2', profitRate: -0.002 },
    { id: 'neg-1', profitRate: -0.001 }
  ]).map((item) => item.id),
  ['neg-1']
);

assert.deepStrictEqual(selectPositiveCyclesOrBest([]), []);

const cycleDisplayState = getCycleDisplayState([
  { id: 'neg-1', profitRate: -0.001 },
  { id: 'pos-1', profitRate: 0.002 },
  { id: 'pos-2', profitRate: 0.003 },
  { id: 'pos-3', profitRate: 0.004 }
], 2, false);

assert.deepStrictEqual(cycleDisplayState.displayCycles.map((item) => item.id), ['pos-1', 'pos-2']);
assert.strictEqual(cycleDisplayState.positiveCount, 3);
assert.strictEqual(cycleDisplayState.hiddenPositiveCount, 1);
assert.strictEqual(cycleDisplayState.canToggleExpand, true);
assert.strictEqual(cycleDisplayState.expanded, false);

const displaySourceCycles = [
  { id: 'neg-1', profitRate: -0.001 },
  { id: 'pos-1', profitRate: 0.002 },
  { id: 'pos-2', profitRate: 0.003 },
  { id: 'pos-3', profitRate: 0.004 }
];
const displayStateForEntries = getCycleDisplayState(displaySourceCycles, 2, false);
let callbackCount = 0;
const mappedEntries = mapEntriesForDisplayCycles(
  displaySourceCycles,
  displayStateForEntries.displayCycles,
  (cycle, index) => {
    callbackCount += 1;
    return `机会 ${index + 1}:${cycle.id}`;
  }
);

assert.strictEqual(callbackCount, 2);
assert.deepStrictEqual(mappedEntries, ['机会 2:pos-1', '机会 3:pos-2']);
