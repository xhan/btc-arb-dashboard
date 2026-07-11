const assert = require('assert');
const {
  normalizeDisplayMinProfitBp,
  resolveDefaultDisplayMinProfitBp,
  buildGlobalArbFilterState,
  buildGlobalArbFilterControlState,
  buildGlobalArbFilterEventPatch,
  buildGlobalArbFilterCriteria,
  bindGlobalArbFilterEvents,
  applyGlobalArbFilterWritePlan,
  buildGlobalArbFilterWritePlan,
  updateGlobalArbFilterState,
  clearGlobalArbFilterState,
  createGlobalArbFilterStateRuntime,
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
  buildArbOpportunityHighlightTargetKeyFromCycle,
  buildTriggeredArbOpportunityHighlightTargetKey,
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

assert.strictEqual(
  buildArbPathLegLine({
    chain: 'arbitrum',
    from: 'WBTC',
    to: 'cbBTC',
    rate: 1.01
  }),
  'arb: WBTC -> cbBTC'
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
      rule: { id: 'low-route', title: '低收益路径' },
      cycles: [
        { id: 'low-1', profitRate: 0.00002 },
        { id: 'low-best', profitRate: 0.00004 },
        { id: 'negative', profitRate: -0.00001 }
      ]
    }],
    getDisplayMinProfitBp: () => 1,
    buildEntry: (cycle, index, items, rule) => ({
      label: items.length > 1 ? `机会 ${index + 1}` : '',
      cycleId: cycle.id,
      section: `fixed:${rule.id || ''}`
    })
  })[0],
  {
    renderKey: 'fixed:low-route',
    title: '低收益路径',
    opportunities: [
      {
        label: '',
        cycleId: 'low-best',
        section: 'fixed:low-route',
        displayMessage: '收益率 +0.40bp < 1bp',
        hideLegs: true,
        entryType: 'fixed-under-threshold'
      }
    ],
    emptyText: '无收益率 > 1bp'
  }
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
  buildGlobalArbFilterCriteria({
    excludedSymbolsInput: ' cbBTC WBTC cbBTC ',
    excludedChainsInput: ' base eth unknown base ',
    includedSymbolsInput: ' LBTC ',
    twoLegOnly: true
  }, {
    normalizeChainFilterToken: (token) => ({ base: 'base', eth: 'ethereum' }[token] || '')
  }),
  {
    excludedSymbols: ['cbBTC', 'WBTC'],
    excludedChains: ['base', 'ethereum'],
    includedSymbols: ['LBTC'],
    twoLegOnly: true
  }
);

const chainAliasFilterSection = buildGlobalArbSection({
  cycles: [
    { id: 'arb-cycle', profitRate: 0.001, legs: [{ chain: 'arb', from: 'A', to: 'B' }] },
    { id: 'base-cycle', profitRate: 0.001, legs: [{ chain: 'base', from: 'B', to: 'A' }] }
  ],
  excludedChains: ['arbitrum'],
  normalizeChain: (chain) => ({ arb: 'arbitrum' }[String(chain || '').toLowerCase()] || String(chain || '').toLowerCase()),
  buildEntry: (cycle) => cycle.id
});

assert.deepStrictEqual(chainAliasFilterSection.opportunities, ['base-cycle']);

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

{
  const elements = {
    'arb-global-filter-input': { value: '' },
    'arb-global-chain-filter-input': { value: 'base' },
    'arb-global-include-filter-input': { value: '' },
    'arb-global-two-leg-only': { checked: false },
    'arb-global-filter-clear-btn': { disabled: true }
  };
  const writePlan = buildGlobalArbFilterWritePlan({
    excludedSymbolsInput: 'cbBTC',
    excludedChainsInput: 'base',
    includedSymbolsInput: 'WBTC',
    twoLegOnly: true
  });

  assert.strictEqual(applyGlobalArbFilterWritePlan(elements, writePlan), 4);
  assert.strictEqual(elements['arb-global-filter-input'].value, 'cbBTC');
  assert.strictEqual(elements['arb-global-chain-filter-input'].value, 'base');
  assert.strictEqual(elements['arb-global-include-filter-input'].value, 'WBTC');
  assert.strictEqual(elements['arb-global-two-leg-only'].checked, true);
  assert.strictEqual(elements['arb-global-filter-clear-btn'].disabled, false);
  assert.strictEqual(applyGlobalArbFilterWritePlan(elements, writePlan), 0);
}

assert.deepStrictEqual(
  buildGlobalArbFilterEventPatch('excludedSymbolsInput', { target: { value: ' cbBTC ' } }),
  { excludedSymbolsInput: ' cbBTC ' }
);
assert.deepStrictEqual(
  buildGlobalArbFilterEventPatch('twoLegOnly', { target: { checked: true } }),
  { twoLegOnly: true }
);
assert.deepStrictEqual(buildGlobalArbFilterEventPatch('unknown', { target: { value: 'x' } }), {});

function createListenerTarget() {
  const listeners = {};
  return {
    listeners,
    addEventListener(type, handler) {
      listeners[type] = handler;
    }
  };
}

{
  const excludedSymbolsInput = createListenerTarget();
  const excludedChainsInput = createListenerTarget();
  const includedSymbolsInput = createListenerTarget();
  const twoLegOnlyInput = createListenerTarget();
  const clearButton = createListenerTarget();
  const patches = [];
  const keyEvents = [];
  const clearEvents = [];

  assert.strictEqual(bindGlobalArbFilterEvents({
    excludedSymbolsInput,
    excludedChainsInput,
    includedSymbolsInput,
    twoLegOnlyInput,
    clearButton
  }, {
    onPatch: (patch) => patches.push(patch),
    onKeydown: (event) => keyEvents.push(event.key),
    onClear: (event) => clearEvents.push(event.type)
  }), 8);

  excludedSymbolsInput.listeners.input({ target: { value: 'cbBTC' } });
  excludedChainsInput.listeners.input({ target: { value: 'base' } });
  includedSymbolsInput.listeners.input({ target: { value: 'WBTC' } });
  twoLegOnlyInput.listeners.change({ target: { checked: true } });
  excludedSymbolsInput.listeners.keydown({ key: 'Enter' });
  excludedChainsInput.listeners.keydown({ key: 'Escape' });
  includedSymbolsInput.listeners.keydown({ key: 'Enter' });
  clearButton.listeners.click({ type: 'click' });

  assert.deepStrictEqual(patches, [
    { excludedSymbolsInput: 'cbBTC' },
    { excludedChainsInput: 'base' },
    { includedSymbolsInput: 'WBTC' },
    { twoLegOnly: true }
  ]);
  assert.deepStrictEqual(keyEvents, ['Enter', 'Escape', 'Enter']);
  assert.deepStrictEqual(clearEvents, ['click']);
  assert.strictEqual(bindGlobalArbFilterEvents({}, {}), 0);
}

{
  const excludedSymbolsInput = createListenerTarget();
  const excludedChainsInput = createListenerTarget();
  const includedSymbolsInput = createListenerTarget();
  const header = createListenerTarget();
  const blurEvents = [];
  const interactiveEvent = { closest: () => ({ tagName: 'BUTTON' }) };
  const emptyHeaderEvent = { closest: () => null };

  [excludedSymbolsInput, excludedChainsInput, includedSymbolsInput].forEach((input, index) => {
    input.blur = () => blurEvents.push(index);
  });

  let activeElement = excludedSymbolsInput;
  assert.strictEqual(bindGlobalArbFilterEvents({
    excludedSymbolsInput,
    excludedChainsInput,
    includedSymbolsInput,
    header
  }, {
    onPatch: () => {},
    getActiveElement: () => activeElement,
    closestEventTarget: (event, selector) => event.closest(selector)
  }), 7);

  let prevented = false;
  excludedSymbolsInput.listeners.keydown({
    key: 'Enter',
    preventDefault: () => { prevented = true; }
  });
  assert.strictEqual(prevented, true);
  assert.deepStrictEqual(blurEvents, [0]);

  activeElement = excludedChainsInput;
  excludedChainsInput.listeners.keydown({ key: 'Escape' });
  assert.deepStrictEqual(blurEvents, [0]);

  header.listeners.click(interactiveEvent);
  assert.deepStrictEqual(blurEvents, [0]);

  activeElement = includedSymbolsInput;
  header.listeners.click(emptyHeaderEvent);
  assert.deepStrictEqual(blurEvents, [0, 2]);
}

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

{
  const runtime = createGlobalArbFilterStateRuntime({
    excludedSymbolsInput: 'cbBTC',
    excludedChainsInput: 'base',
    includedSymbolsInput: '',
    twoLegOnly: false
  });
  assert.deepStrictEqual(runtime.get(), {
    excludedSymbolsInput: 'cbBTC',
    excludedChainsInput: 'base',
    includedSymbolsInput: '',
    twoLegOnly: false
  });

  const updateResult = runtime.update({ includedSymbolsInput: 'WBTC', twoLegOnly: true });
  assert.strictEqual(updateResult.changed, true);
  assert.deepStrictEqual(runtime.get(), {
    excludedSymbolsInput: 'cbBTC',
    excludedChainsInput: 'base',
    includedSymbolsInput: 'WBTC',
    twoLegOnly: true
  });

  updateResult.state.excludedSymbolsInput = 'mutated';
  assert.strictEqual(runtime.get().excludedSymbolsInput, 'cbBTC');
  assert.strictEqual(runtime.update({ includedSymbolsInput: 'WBTC', twoLegOnly: true }).changed, false);
  assert.strictEqual(runtime.clear().changed, true);
  assert.deepStrictEqual(runtime.get(), {
    excludedSymbolsInput: '',
    excludedChainsInput: '',
    includedSymbolsInput: '',
    twoLegOnly: false
  });
  assert.strictEqual(runtime.clear().changed, false);
}

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
    renderKey: 'global:all',
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
    renderKey: '',
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

{
  const highlightOptions = {
    buildMutedPathTargetFromCycleLegs: (legs) => {
      const realLegs = legs.filter((leg) => !leg.rule);
      return realLegs.length ? { target: { legs: realLegs } } : null;
    },
    buildTargetKey: (target) => {
      const legs = target && target.target && target.target.legs;
      return `key:${Array.isArray(legs) ? legs.map((leg) => leg.quoteId).join('-') : target.id}`;
    }
  };
  const cycle = { legs: [{ quoteId: 1 }, { quoteId: 2 }, { quoteId: 3, rule: true }] };

  assert.strictEqual(buildArbOpportunityHighlightTargetKeyFromCycle(cycle, highlightOptions), 'key:1-2');
  assert.strictEqual(buildArbOpportunityHighlightTargetKeyFromCycle(null, highlightOptions), '');
  assert.strictEqual(
    buildTriggeredArbOpportunityHighlightTargetKey(
      { target: { type: 'path' }, id: 'path-alert' },
      { cycle },
      highlightOptions
    ),
    'key:path-alert'
  );
  assert.strictEqual(
    buildTriggeredArbOpportunityHighlightTargetKey(
      { target: { type: 'rule' } },
      { cycle },
      highlightOptions
    ),
    'key:1-2'
  );
  assert.strictEqual(
    buildTriggeredArbOpportunityHighlightTargetKey(
      { target: { type: 'quote' } },
      { cycle },
      highlightOptions
    ),
    ''
  );
}

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
      renderKey: 'quote-price:21:forward',
      title: '等待报价测试',
      priceText: '--',
      statusText: '等待报价',
      muted: true,
      triggered: false
    },
    {
      entryType: 'quote-price',
      renderKey: 'quote-price:22:forward',
      title: '暂停测试',
      priceText: '1',
      statusText: '报价暂停',
      muted: true,
      triggered: false
    }
  ]
);

assert.strictEqual(
  buildQuotePriceWatchSection({
    watchItems: [{ title: '默认链名', quoteId: 23 }],
    findQuote: () => ({ id: 23, chain: 'arbitrum' }),
    getQuoteState: () => ({ lastRawPrice: 1 }),
    resolveValue: (_item, state) => Number(state.lastRawPrice),
    buildPairLabel: () => 'WBTC/cbBTC'
  }).opportunities[0].metaText,
  undefined
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
    renderKey: 'quote-watch',
    title: '关注列表',
    opportunities: [
      {
        entryType: 'quote-price',
        renderKey: 'quote-price:11:forward',
        title: '正向关注',
        priceText: '1.2346',
        statusText: '',
        muted: false,
        triggered: false
      },
      {
        entryType: 'quote-price',
        renderKey: 'quote-price:404:inverse',
        title: '缺失关注',
        priceText: '--',
        statusText: '等待报价',
        muted: true,
        triggered: false
      }
    ],
    emptyText: '暂无关注价格'
  }
);

assert.deepStrictEqual(
  buildQuotePriceWatchSection({
    watchItems: [
      {
        title: '已触发高于',
        quoteId: 41,
        direction: 'forward',
        alert: { enabled: true, ruleKind: 'targetAbove', value: 1.2 }
      },
      {
        title: '未触发高于',
        quoteId: 42,
        direction: 'forward',
        alert: { enabled: true, ruleKind: 'targetAbove', value: 1.2 }
      },
      {
        title: '关闭报警',
        quoteId: 43,
        direction: 'forward',
        alert: { enabled: false, ruleKind: 'targetBelow', value: 1.2 }
      },
      {
        title: '上涨触发',
        quoteId: 44,
        direction: 'forward',
        alert: { enabled: true, ruleKind: 'percentUp', value: 1, basePrice: 1 }
      }
    ],
    findQuote: (item) => ({ id: item.quoteId, chain: 'ethereum' }),
    getQuoteState: (quote) => ({
      lastRawPrice: quote.id === 41 ? 1.3 : quote.id === 42 ? 1.1 : quote.id === 43 ? 1 : 1.02
    }),
    resolveValue: (_item, state) => Number(state.lastRawPrice),
    isQuotePaused: () => false,
    buildPairLabel: () => 'USDT/USDe',
    formatPrice: (value) => String(value)
  }).opportunities.map((entry) => ({
    title: entry.title,
    triggered: entry.triggered
  })),
  [
    { title: '已触发高于', triggered: true },
    { title: '未触发高于', triggered: false },
    { title: '关闭报警', triggered: false },
    { title: '上涨触发', triggered: true }
  ]
);

assert.deepStrictEqual(
  buildQuotePriceWatchSection({
    watchItems: [
      {
        title: '报警关注',
        quoteId: 31,
        direction: 'forward',
        alert: {
          enabled: true,
          triggerMode: 'delayed',
          confirmDelaySec: 13,
          ruleKind: 'targetAbove',
          value: 1.0008
        }
      },
      {
        title: '关闭报警',
        quoteId: 32,
        direction: 'forward',
        alert: {
          enabled: false,
          triggerMode: 'immediate',
          ruleKind: 'targetBelow',
          value: 0.998
        }
      }
    ],
    findQuote: (item) => ({ id: item.quoteId, chain: 'ethereum' }),
    getQuoteState: () => ({ lastRawPrice: 1 }),
    resolveValue: (_item, state) => Number(state.lastRawPrice),
    isQuotePaused: () => false,
    buildPairLabel: () => 'USDT/USDe',
    formatChainLabel: () => 'eth',
    formatPrice: (value) => String(value)
  }).opportunities.map((entry) => ({
    title: entry.title,
    alertText: entry.alertText
  })),
  [
    { title: '报警关注', alertText: '报警 延迟13s >= 1.0008' },
    { title: '关闭报警', alertText: '报警关闭 <= 0.998' }
  ]
);

assert.deepStrictEqual(
  buildQuotePriceWatchSection({ watchItems: null }),
  {
    renderKey: 'quote-watch',
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
      renderKey: 'fixed:wbtc-route',
      title: 'WBTC 固定路径',
      opportunities: [
        { label: '机会 1', cycleId: 'cycle-a', section: 'fixed:wbtc-route' },
        { label: '机会 2', cycleId: 'cycle-b', section: 'fixed:wbtc-route' }
      ],
      emptyText: '无收益率 > 1bp'
    },
    {
      renderKey: 'fixed:unknown',
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
      renderKey: 'special:USDTB 规则',
      title: 'USDTB 规则',
      sectionType: 'special-rule',
      titleProfitRate: 0.0003,
      opportunities: [
        { label: '', cycle: specialCyclePositive, ruleId: 'usdtb', message: 'positive' }
      ],
      emptyText: '无收益率'
    },
    {
      renderKey: 'special:负收益规则',
      title: '负收益规则',
      sectionType: 'special-rule',
      titleProfitRate: null,
      opportunities: [],
      emptyText: '无收益率'
    },
    {
      renderKey: 'special:空规则',
      title: '空规则',
      sectionType: 'special-rule',
      titleProfitRate: null,
      opportunities: [],
      emptyText: '无收益率'
    }
  ]
);
