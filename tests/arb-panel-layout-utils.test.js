const assert = require('assert');
const {
  splitSectionsIntoColumns,
  splitSectionsBySectionCount,
  resolveItemsBySelectors,
  DEFAULT_DISPLAY_MIN_PROFIT_BP,
  selectCyclesAboveDisplayThreshold,
  selectPositiveCyclesOrBest,
  buildArbOpportunityDisplayEntry,
  buildArbOpportunityStoreEntry,
  buildQuotePriceWatchDisplayEntry,
  getCycleDisplayState,
  mapEntriesForDisplayCycles,
  registerArbOpportunityHighlightTarget,
  selectFirstUnmutedDisplayedCycle
} = require('../arb-panel-layout-utils');

const sections = [
  { title: '固定路径', opportunities: Array.from({ length: 8 }, (_, index) => ({ label: `F${index + 1}` })) },
  { title: '特殊规则', opportunities: Array.from({ length: 3 }, (_, index) => ({ label: `S${index + 1}` })) }
];
const columns = splitSectionsIntoColumns(sections, 6, 2);

assert.strictEqual(columns.length, 2);
assert.deepStrictEqual(columns[0].map((item) => [item.title, item.opportunities.length]), [['固定路径', 6]]);
assert.deepStrictEqual(columns[1].map((item) => [item.title, item.opportunities.length]), [['固定路径', 2], ['特殊规则', 3]]);

const emptySections = Array.from({ length: 8 }, (_, index) => ({ title: `固定路径 ${index + 1}`, opportunities: [] }));
const emptyColumns = splitSectionsIntoColumns(emptySections, 6, 2);
assert.deepStrictEqual(emptyColumns[0].map((item) => item.title), [
  '固定路径 1',
  '固定路径 2',
  '固定路径 3',
  '固定路径 4',
  '固定路径 5',
  '固定路径 6'
]);
assert.deepStrictEqual(emptyColumns[1].map((item) => item.title), ['固定路径 7', '固定路径 8']);

const fixedRuleSections = Array.from({ length: 8 }, (_, index) => ({
  title: `固定规则 ${index + 1}`,
  opportunities: Array.from({ length: index % 2 ? 2 : 1 }, (_, opportunityIndex) => ({ label: `机会 ${opportunityIndex + 1}` }))
}));
const fixedRuleColumns = splitSectionsBySectionCount(fixedRuleSections, 6, 2);
assert.deepStrictEqual(fixedRuleColumns[0].map((item) => item.title), [
  '固定规则 1',
  '固定规则 2',
  '固定规则 3',
  '固定规则 4',
  '固定规则 5',
  '固定规则 6'
]);
assert.deepStrictEqual(fixedRuleColumns[1].map((item) => item.title), ['固定规则 7', '固定规则 8']);
assert.deepStrictEqual(fixedRuleColumns[1][1].opportunities.map((item) => item.label), ['机会 1', '机会 2']);

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

assert.strictEqual(DEFAULT_DISPLAY_MIN_PROFIT_BP, 0.5);

assert.deepStrictEqual(
  selectCyclesAboveDisplayThreshold([
    { id: 'low-positive', profitRate: 0.00004 },
    { id: 'at-threshold', profitRate: 0.00005 },
    { id: 'above-threshold', profitRate: 0.000051 }
  ]).map((item) => item.id),
  ['above-threshold']
);

assert.deepStrictEqual(
  selectCyclesAboveDisplayThreshold([
    { id: 'low-positive', profitRate: 0.00004 },
    { id: 'above-zero', profitRate: 0.000001 }
  ], 0).map((item) => item.id),
  ['low-positive', 'above-zero']
);

const cycleDisplayState = getCycleDisplayState([
  { id: 'neg-1', profitRate: -0.001 },
  { id: 'low-positive', profitRate: 0.00004 },
  { id: 'pos-1', profitRate: 0.002 },
  { id: 'pos-2', profitRate: 0.003 },
  { id: 'pos-3', profitRate: 0.004 }
], 2, false);

assert.deepStrictEqual(cycleDisplayState.displayCycles.map((item) => item.id), ['pos-1', 'pos-2']);
assert.strictEqual(cycleDisplayState.positiveCount, 3);
assert.strictEqual(cycleDisplayState.hiddenPositiveCount, 1);
assert.strictEqual(cycleDisplayState.canToggleExpand, true);
assert.strictEqual(cycleDisplayState.expanded, false);

const lowProfitCycleDisplayState = getCycleDisplayState([
  { id: 'neg-1', profitRate: -0.001 },
  { id: 'low-positive', profitRate: 0.00004 }
], 2, false);

assert.deepStrictEqual(lowProfitCycleDisplayState.displayCycles, []);
assert.strictEqual(lowProfitCycleDisplayState.positiveCount, 0);

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

const fixedDisplayCycles = [
  { id: 'pos-1', profitRate: 0.002 },
  { id: 'pos-2', profitRate: 0.003 },
  { id: 'neg-1', profitRate: -0.001 }
];

assert.strictEqual(
  selectFirstUnmutedDisplayedCycle(fixedDisplayCycles, () => false).id,
  'pos-1'
);

assert.strictEqual(
  selectFirstUnmutedDisplayedCycle(fixedDisplayCycles, (cycle) => cycle.id === 'pos-1').id,
  'pos-2'
);

assert.strictEqual(
  selectFirstUnmutedDisplayedCycle(fixedDisplayCycles, (cycle) => cycle.id === 'pos-1' || cycle.id === 'pos-2').id,
  'pos-1'
);

const opportunityCycle = { id: 'cycle-1', profitRate: 0.001, legs: [] };
assert.deepStrictEqual(
  buildArbOpportunityStoreEntry('op-1', opportunityCycle, '机会 1', { section: '全局路径' }),
  {
    id: 'op-1',
    cycle: opportunityCycle,
    label: '机会 1',
    section: '全局路径'
  }
);

assert.deepStrictEqual(
  buildArbOpportunityDisplayEntry(
    'op-1',
    opportunityCycle,
    '机会 1',
    { clickable: false, displayMessage: 'line 1', hideLegs: true, entryType: 'special-rule' },
    { isAlertHighlighted: true }
  ),
  {
    label: '机会 1',
    cycle: opportunityCycle,
    opportunityId: 'op-1',
    isAlertHighlighted: true,
    clickable: false,
    displayMessage: 'line 1',
    hideLegs: true,
    entryType: 'special-rule'
  }
);

const highlightTargetMap = new Map();
registerArbOpportunityHighlightTarget(highlightTargetMap, 'target-1', 'op-1');
registerArbOpportunityHighlightTarget(highlightTargetMap, 'target-1', 'op-2');
registerArbOpportunityHighlightTarget(highlightTargetMap, '', 'op-3');
assert.deepStrictEqual(highlightTargetMap.get('target-1'), ['op-1', 'op-2']);
assert.strictEqual(highlightTargetMap.has(''), false);

assert.deepStrictEqual(
  buildQuotePriceWatchDisplayEntry({
    title: 'ETH USDT/USDe',
    hasQuote: true,
    value: 1.00042,
    priceText: '1.00042',
    isPaused: false,
    chainLabel: 'Ethereum',
    pairLabel: 'USDT/USDe'
  }),
  {
    entryType: 'quote-price',
    title: 'ETH USDT/USDe',
    priceText: '1.00042',
    metaText: 'Ethereum · USDT/USDe',
    statusText: '',
    muted: false
  }
);

assert.deepStrictEqual(
  buildQuotePriceWatchDisplayEntry({
    title: '等待报价测试',
    hasQuote: true,
    value: null,
    chainLabel: 'Ethereum',
    pairLabel: 'cbBTC/syBTC'
  }),
  {
    entryType: 'quote-price',
    title: '等待报价测试',
    priceText: '--',
    metaText: 'Ethereum · cbBTC/syBTC',
    statusText: '等待报价',
    muted: true
  }
);

assert.strictEqual(
  buildQuotePriceWatchDisplayEntry({
    title: '暂停测试',
    hasQuote: true,
    value: 1,
    priceText: '1',
    isPaused: true
  }).statusText,
  '报价暂停'
);
