const assert = require('assert');
const {
  resolveItemsBySelectors,
  normalizeDisplayMinProfitBp,
  resolveDefaultDisplayMinProfitBp,
  buildGlobalArbFilterState,
  buildGlobalArbFilterControlState,
  buildGlobalArbFilterEventPatch,
  buildGlobalArbFilterWritePlan,
  updateGlobalArbFilterState,
  clearGlobalArbFilterState,
  buildArbPathLegLine,
  buildArbPathLegLines,
  buildArbPanelColumns,
  buildArbOpportunityDisplayEntry,
  buildArbOpportunityStoreEntry,
  buildFixedArbSections,
  buildGlobalArbSection,
  buildSpecialArbSections,
  buildQuotePriceWatchSection,
  parseFilterInput,
  registerArbOpportunityHighlightTarget,
  selectFirstUnmutedDisplayedCycle
} = require('../src/arb/arb-panel-layout-utils');

const sections = [
  { title: '固定路径', opportunities: Array.from({ length: 8 }, (_, index) => ({ label: `F${index + 1}` })) },
  { title: '特殊规则', opportunities: Array.from({ length: 3 }, (_, index) => ({ label: `S${index + 1}` })) }
];
const fixedColumns = buildArbPanelColumns({
  fixedSections: sections,
  fixedSectionLimit: 1,
  fixedMaxColumns: 2
});

assert.strictEqual(fixedColumns.length, 5);
assert.deepStrictEqual(fixedColumns[0].map((item) => [item.title, item.opportunities.length]), [['固定路径', 8]]);
assert.deepStrictEqual(fixedColumns[1].map((item) => [item.title, item.opportunities.length]), [['特殊规则', 3]]);

assert.deepStrictEqual(
  buildArbPanelColumns({
    fixedSections: [
      { title: '固定 1', opportunities: [] },
      { title: '固定 2', opportunities: [] },
      { title: '固定 3', opportunities: [] }
    ],
    fixedSectionLimit: 2,
    specialSections: [{ title: '特殊', opportunities: [] }],
    quoteSection: { title: '关注列表', opportunities: [] },
    globalSection: { title: '全局路径', opportunities: [] }
  }).map((column) => column.map((section) => section.title)),
  [
    ['固定 1', '固定 2'],
    ['固定 3'],
    ['特殊'],
    ['关注列表'],
    ['全局路径']
  ]
);

const emptySections = Array.from({ length: 8 }, (_, index) => ({ title: `固定路径 ${index + 1}`, opportunities: [] }));
const emptyColumns = buildArbPanelColumns({
  fixedSections: emptySections,
  fixedSectionLimit: 6,
  fixedMaxColumns: 2
});
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
const fixedRuleColumns = buildArbPanelColumns({
  fixedSections: fixedRuleSections,
  fixedSectionLimit: 6,
  fixedMaxColumns: 2
});
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

const legFormatOptions = {
  formatLegLine: (line) => `${line.chainLabel}:${line.from}->${line.to}@${line.rate}`,
  formatChainLabel: (chain) => `Chain:${chain}`,
  formatCexBookValue: (value, maxDecimals) => `${Number(value).toFixed(1)}/${maxDecimals}`
};

assert.strictEqual(
  buildArbPathLegLine(
    {
      chain: 'binance',
      from: 'WBTC',
      to: 'BTC',
      rawFrom: 'rawWBTC',
      rawTo: 'rawBTC',
      rate: 1.01,
      cexLevelLabel: 'ask1',
      cexLevelSize: 2.345
    },
    legFormatOptions
  ),
  'Chain:binance:rawWBTC->rawBTC@1.01 ask1×2.3/6'
);

assert.strictEqual(
  buildArbPathLegLine(
    { chain: 'ethereum', from: 'cbBTC', to: 'WBTC', rate: 0.99 },
    legFormatOptions
  ),
  'Chain:ethereum:cbBTC->WBTC@0.99'
);

assert.deepStrictEqual(
  buildArbPathLegLines(
    [
      { chain: 'ethereum', from: 'cbBTC', to: 'WBTC', rate: 0.99 },
      { chain: 'arbitrum', from: 'WBTC', to: 'cbBTC', rate: 1.01 }
    ],
    legFormatOptions
  ),
  [
    'Chain:ethereum:cbBTC->WBTC@0.99',
    'Chain:arbitrum:WBTC->cbBTC@1.01'
  ]
);

assert.strictEqual(
  selectFirstUnmutedDisplayedCycle([
    { id: 'neg-2', profitRate: -0.002 },
    { id: 'pos-1', profitRate: 0.001 },
    { id: 'pos-2', profitRate: 0.003 }
  ], (cycle) => cycle.id === 'pos-1').id,
  'pos-2'
);

assert.strictEqual(
  selectFirstUnmutedDisplayedCycle([
    { id: 'neg-2', profitRate: -0.002 },
    { id: 'neg-1', profitRate: -0.001 }
  ], () => false).id,
  'neg-1'
);

assert.strictEqual(selectFirstUnmutedDisplayedCycle([], () => false), null);

assert.strictEqual(normalizeDisplayMinProfitBp('1.25'), 1.25);
assert.strictEqual(normalizeDisplayMinProfitBp(-1), 0);
assert.strictEqual(normalizeDisplayMinProfitBp('bad', 2), 2);
assert.strictEqual(normalizeDisplayMinProfitBp('bad', 'bad fallback'), 0.5);
assert.strictEqual(
  resolveDefaultDisplayMinProfitBp({ DEFAULT_FIXED_PATH_DISPLAY_MIN_PROFIT_BP: 1 }),
  1
);
assert.strictEqual(
  resolveDefaultDisplayMinProfitBp({ DEFAULT_FIXED_PATH_DISPLAY_MIN_PROFIT_BP: -2 }),
  0
);
assert.strictEqual(
  resolveDefaultDisplayMinProfitBp({ DEFAULT_FIXED_PATH_DISPLAY_MIN_PROFIT_BP: 'bad' }, 1.5),
  1.5
);

assert.deepStrictEqual(
  buildFixedArbSections({
    fixedResults: [{
      rule: { title: '阈值路径' },
      cycles: [
        { id: 'low-positive', profitRate: 0.00004 },
        { id: 'at-threshold', profitRate: 0.00005 },
        { id: 'above-threshold', profitRate: 0.000051 }
      ]
    }],
    buildEntry: (cycle) => cycle.id
  })[0].opportunities,
  ['above-threshold']
);

assert.deepStrictEqual(
  buildFixedArbSections({
    fixedResults: [{
      rule: { title: '零阈值路径' },
      cycles: [
        { id: 'low-positive', profitRate: 0.00004 },
        { id: 'above-zero', profitRate: 0.000001 }
      ]
    }],
    getDisplayMinProfitBp: () => 0,
    buildEntry: (cycle) => cycle.id
  })[0].opportunities,
  ['low-positive', 'above-zero']
);

const displaySourceCycles = [
  { id: 'neg-1', profitRate: -0.001 },
  { id: 'low-positive', profitRate: 0.00004 },
  { id: 'pos-1', profitRate: 0.002 },
  { id: 'pos-2', profitRate: 0.003 },
  { id: 'pos-3', profitRate: 0.004 }
];
let capturedDisplayState = null;
let callbackCount = 0;
const displaySection = buildGlobalArbSection({
  sectionKey: 'global:display-test',
  cycles: displaySourceCycles,
  maxPositiveCount: 2,
  buildEntry: (cycle, index) => {
    callbackCount += 1;
    return `机会 ${index + 1}:${cycle.id}`;
  },
  buildFooterHtml: (displayState, sectionKey) => {
    capturedDisplayState = {
      sectionKey,
      displayCycleIds: displayState.displayCycles.map((item) => item.id),
      positiveCount: displayState.positiveCount,
      hiddenPositiveCount: displayState.hiddenPositiveCount,
      canToggleExpand: displayState.canToggleExpand,
      expanded: displayState.expanded
    };
    return displayState.canToggleExpand ? 'toggle' : '';
  }
});

assert.strictEqual(callbackCount, 2);
assert.deepStrictEqual(displaySection.opportunities, ['机会 3:pos-1', '机会 4:pos-2']);
assert.strictEqual(displaySection.footerHtml, 'toggle');
assert.deepStrictEqual(capturedDisplayState, {
  sectionKey: 'global:display-test',
  displayCycleIds: ['pos-1', 'pos-2'],
  positiveCount: 3,
  hiddenPositiveCount: 1,
  canToggleExpand: true,
  expanded: false
});

let lowProfitDisplayState = null;
const lowProfitSection = buildGlobalArbSection({
  cycles: [
    { id: 'neg-1', profitRate: -0.001 },
    { id: 'low-positive', profitRate: 0.00004 }
  ],
  maxPositiveCount: 2,
  buildEntry: (cycle) => cycle.id,
  buildFooterHtml: (displayState) => {
    lowProfitDisplayState = displayState;
    return '';
  }
});

assert.deepStrictEqual(lowProfitSection.opportunities, []);
assert.deepStrictEqual(lowProfitDisplayState.displayCycles, []);
assert.strictEqual(lowProfitDisplayState.positiveCount, 0);

assert.deepStrictEqual(parseFilterInput('  cbBTC  WBTC cbBTC  USDe '), ['cbBTC', 'WBTC', 'USDe']);

assert.deepStrictEqual(
  buildGlobalArbFilterState({
    excludedSymbolsInput: ' cbBTC ',
    excludedChainsInput: 123,
    includedSymbolsInput: null,
    twoLegOnly: 1
  }),
  {
    excludedSymbolsInput: ' cbBTC ',
    excludedChainsInput: '',
    includedSymbolsInput: '',
    twoLegOnly: true
  }
);

assert.deepStrictEqual(
  buildGlobalArbFilterControlState({
    excludedSymbolsInput: '  ',
    excludedChainsInput: '',
    includedSymbolsInput: '',
    twoLegOnly: false
  }),
  {
    excludedSymbolsInput: '  ',
    excludedChainsInput: '',
    includedSymbolsInput: '',
    twoLegOnly: false,
    clearDisabled: true
  }
);

assert.deepStrictEqual(
  buildGlobalArbFilterControlState({
    excludedSymbolsInput: 'cbBTC',
    excludedChainsInput: '',
    includedSymbolsInput: '',
    twoLegOnly: false
  }).clearDisabled,
  false
);

assert.deepStrictEqual(
  buildGlobalArbFilterControlState({
    excludedSymbolsInput: '',
    excludedChainsInput: '',
    includedSymbolsInput: '',
    twoLegOnly: true
  }).clearDisabled,
  false
);

assert.deepStrictEqual(
  buildGlobalArbFilterWritePlan({
    excludedSymbolsInput: 'cbBTC',
    excludedChainsInput: 'base',
    includedSymbolsInput: 'WBTC',
    twoLegOnly: true
  }),
  {
    value: [
      { id: 'arb-global-filter-input', value: 'cbBTC' },
      { id: 'arb-global-chain-filter-input', value: 'base' },
      { id: 'arb-global-include-filter-input', value: 'WBTC' }
    ],
    checked: [
      { id: 'arb-global-two-leg-only', checked: true }
    ],
    disabled: [
      { id: 'arb-global-filter-clear-btn', disabled: false }
    ]
  }
);
assert.deepStrictEqual(
  buildGlobalArbFilterEventPatch('excludedSymbolsInput', { target: { value: ' cbBTC ' } }),
  { excludedSymbolsInput: ' cbBTC ' }
);
assert.deepStrictEqual(
  buildGlobalArbFilterEventPatch('twoLegOnly', { target: { checked: true } }),
  { twoLegOnly: true }
);
assert.deepStrictEqual(buildGlobalArbFilterEventPatch('unknown', { target: { value: 'x' } }), {});

assert.deepStrictEqual(
  updateGlobalArbFilterState(
    {
      excludedSymbolsInput: 'old',
      excludedChainsInput: '',
      includedSymbolsInput: '',
      twoLegOnly: false
    },
    { excludedSymbolsInput: 'new' }
  ),
  {
    changed: true,
    state: {
      excludedSymbolsInput: 'new',
      excludedChainsInput: '',
      includedSymbolsInput: '',
      twoLegOnly: false
    }
  }
);

assert.strictEqual(
  updateGlobalArbFilterState(
    {
      excludedSymbolsInput: 'same',
      excludedChainsInput: '',
      includedSymbolsInput: '',
      twoLegOnly: false
    },
    { excludedSymbolsInput: 'same' }
  ).changed,
  false
);

assert.deepStrictEqual(
  clearGlobalArbFilterState({
    excludedSymbolsInput: 'cbBTC',
    excludedChainsInput: 'ethereum',
    includedSymbolsInput: 'WBTC',
    twoLegOnly: true
  }),
  {
    changed: true,
    state: {
      excludedSymbolsInput: '',
      excludedChainsInput: '',
      includedSymbolsInput: '',
      twoLegOnly: false
    }
  }
);

assert.strictEqual(
  clearGlobalArbFilterState({
    excludedSymbolsInput: '',
    excludedChainsInput: '',
    includedSymbolsInput: '',
    twoLegOnly: false
  }).changed,
  false
);

const globalFilterCycles = [
  {
    id: 'keep',
    profitRate: 0.0002,
    legs: [
      { from: 'A', to: 'B', chain: 'ethereum' },
      { from: 'B', to: 'C', chain: 'arbitrum' }
    ]
  },
  {
    id: 'excluded-symbol',
    profitRate: 0.0002,
    legs: [
      { from: 'A', to: 'D', chain: 'ethereum' },
      { from: 'D', to: 'C', chain: 'arbitrum' }
    ]
  },
  {
    id: 'excluded-chain',
    profitRate: 0.0002,
    legs: [
      { from: 'A', to: 'B', chain: 'optimism' },
      { from: 'B', to: 'C', chain: 'arbitrum' }
    ]
  },
  {
    id: 'one-real-leg',
    profitRate: 0.0002,
    legs: [
      { from: 'A', to: 'B', chain: 'ethereum' },
      { from: 'B', to: 'C', chain: '规则', rule: true }
    ]
  }
];

assert.deepStrictEqual(
  buildGlobalArbSection({
    cycles: globalFilterCycles,
    includedSymbols: ['A'],
    excludedSymbols: ['D'],
    excludedChains: ['optimism'],
    twoLegOnly: true,
    isRuleLeg: (leg) => leg && leg.rule === true,
    maxPositiveCount: 10,
    buildEntry: (cycle) => cycle.id
  }).opportunities,
  ['keep']
);

const twoLegOnlySection = buildGlobalArbSection({
  cycles: globalFilterCycles,
  twoLegOnly: true,
  isRuleLeg: (leg) => leg && leg.rule === true,
  maxPositiveCount: 10,
  buildEntry: (cycle) => cycle.id
});
assert.deepStrictEqual(twoLegOnlySection.opportunities, ['keep', 'excluded-symbol', 'excluded-chain']);
assert.strictEqual(twoLegOnlySection.emptyText, '等待数据...');

const globalSectionCycles = [
  {
    id: 'eth-cycle',
    profitRate: 0.0003,
    legs: [{ from: 'ETH', to: 'USDC', chain: 'ethereum' }]
  },
  {
    id: 'wbtc-cycle',
    profitRate: 0.00025,
    legs: [{ from: 'WBTC', to: 'cbBTC', chain: 'ethereum' }]
  }
];
assert.deepStrictEqual(
  buildGlobalArbSection({
    sectionKey: 'global:all',
    cycles: globalSectionCycles,
    includedSymbols: ['WBTC'],
    maxPositiveCount: 1,
    buildEntry: (cycle, index) => ({ label: `机会 ${index + 1}`, cycleId: cycle.id }),
    buildFooterHtml: (cycleDisplayState) => cycleDisplayState.canToggleExpand ? 'toggle' : ''
  }),
  {
    title: '全局路径',
    opportunities: [{ label: '机会 2', cycleId: 'wbtc-cycle' }],
    footerHtml: '',
    emptyText: '过滤后暂无路径'
  }
);

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
  buildQuotePriceWatchSection({
    watchItems: [
      { title: '等待报价测试', quoteId: 21 },
      { title: '暂停测试', quoteId: 22 }
    ],
    findQuote: (item) => ({ id: item.quoteId, chain: 'ethereum', pairLabel: item.quoteId === 21 ? 'cbBTC/syBTC' : 'USDT/USDe' }),
    getQuoteState: () => ({}),
    resolveValue: (item) => (item.quoteId === 21 ? null : 1),
    isQuotePaused: (quote) => quote.id === 22,
    buildPairLabel: (quote) => quote.pairLabel,
    formatChainLabel: () => 'Ethereum',
    formatPrice: (value) => String(value)
  }).opportunities,
  [
    {
      entryType: 'quote-price',
      title: '等待报价测试',
      priceText: '--',
      metaText: 'Ethereum · cbBTC/syBTC',
      statusText: '等待报价',
      muted: true
    },
    {
      entryType: 'quote-price',
      title: '暂停测试',
      priceText: '1',
      metaText: 'Ethereum · USDT/USDe',
      statusText: '报价暂停',
      muted: true
    }
  ]
);

assert.deepStrictEqual(
  buildQuotePriceWatchSection({
    watchItems: [
      { title: '正向关注', quoteId: 11, direction: 'forward' },
      { title: '缺失关注', quoteId: 404, direction: 'inverse' }
    ],
    findQuote: (item) => (item.quoteId === 11 ? { id: 11, chain: 'ethereum' } : null),
    getQuoteState: () => ({ lastRawPrice: 1.23456 }),
    resolveValue: (item, state) => Number(state.lastRawPrice),
    isQuotePaused: () => false,
    buildPairLabel: () => 'USDT/USDe',
    formatChainLabel: (chain) => chain.toUpperCase(),
    formatPrice: (value) => value.toFixed(4)
  }),
  {
    title: '关注列表',
    opportunities: [
      {
        entryType: 'quote-price',
        title: '正向关注',
        priceText: '1.2346',
        metaText: 'ETHEREUM · USDT/USDe',
        statusText: '',
        muted: false
      },
      {
        entryType: 'quote-price',
        title: '缺失关注',
        priceText: '--',
        metaText: '未知链 · 报价 #404',
        statusText: '等待报价',
        muted: true
      }
    ],
    emptyText: '暂无关注价格'
  }
);

assert.deepStrictEqual(
  buildQuotePriceWatchSection({ watchItems: null }),
  {
    title: '关注列表',
    opportunities: [],
    emptyText: '暂无关注价格'
  }
);

const fixedCycleA = { id: 'cycle-a', profitRate: 0.0002 };
const fixedCycleB = { id: 'cycle-b', profitRate: 0.00015 };
const fixedCycleLow = { id: 'cycle-low', profitRate: 0.00005 };
assert.deepStrictEqual(
  buildFixedArbSections({
    fixedResults: [
      { rule: { id: 'wbtc-route', title: 'WBTC 固定路径' }, cycles: [fixedCycleA, fixedCycleLow, fixedCycleB] },
      { rule: {}, cycles: [] }
    ],
    getDisplayMinProfitBp: () => 1,
    buildEntry: (cycle, index, items, rule) => ({
      label: items.length > 1 ? `机会 ${index + 1}` : '',
      cycleId: cycle.id,
      section: `fixed:${rule.id || ''}`
    })
  }),
  [
    {
      title: 'WBTC 固定路径',
      opportunities: [
        { label: '机会 1', cycleId: 'cycle-a', section: 'fixed:wbtc-route' },
        { label: '机会 2', cycleId: 'cycle-b', section: 'fixed:wbtc-route' }
      ],
      emptyText: '无收益率 > 1bp'
    },
    {
      title: '固定路径',
      opportunities: [],
      emptyText: '无收益率 > 1bp'
    }
  ]
);

const specialCyclePositive = { id: 'special-positive', profitRate: 0.0003 };
const specialCycleNegative = { id: 'special-negative', profitRate: -0.0001 };
assert.deepStrictEqual(
  buildSpecialArbSections({
    specialResults: [
      {
        opportunities: [
          { label: 'USDTB 规则', ruleId: 'usdtb', cycle: specialCyclePositive, display_message: 'positive' },
          { label: '负收益规则', ruleId: 'loss', cycle: specialCycleNegative, display_message: 'negative' }
        ]
      }
    ],
    specialRules: [
      { title: 'USDTB 规则' },
      { title: '负收益规则' },
      { title: '空规则' },
      { title: '' }
    ],
    buildEntry: (opportunity) => ({
      label: opportunity.label,
      cycle: opportunity.cycle,
      ruleId: opportunity.ruleId,
      message: opportunity.display_message
    })
  }),
  [
    {
      title: 'USDTB 规则',
      sectionType: 'special-rule',
      titleProfitRate: 0.0003,
      opportunities: [
        { label: '', cycle: specialCyclePositive, ruleId: 'usdtb', message: 'positive' }
      ],
      emptyText: '无收益率'
    },
    {
      title: '负收益规则',
      sectionType: 'special-rule',
      titleProfitRate: null,
      opportunities: [],
      emptyText: '无收益率'
    },
    {
      title: '空规则',
      sectionType: 'special-rule',
      titleProfitRate: null,
      opportunities: [],
      emptyText: '无收益率'
    }
  ]
);
