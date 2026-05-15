const assert = require('assert');

const {
  sanitizePathAlertDraft,
  buildDismissedTargetCardTitle,
  buildDismissedTargetMetaText,
  buildPathAlertCardMetaText,
  buildPathAlertCardTitle,
  buildPathAlertEditorDraftFromAlert,
  buildPathAlertEditorDraftFromPrefill,
  buildPathAlertEditorTarget,
  buildPathAlertEditorTargetSummaryLines,
  buildPathAlertFromEditorDraft,
  buildPathAlertDefaultQuoteAlertName,
  buildPathAlertQuoteDisplayLabel,
  buildPathAlertQuoteLabel,
  buildPathAlertPageSummaryLines,
  buildPathAlertQuotePairText,
  buildPathAlertSectionConfigs,
  buildPathAlertMetaText,
  buildPathAlertsPageHref,
  clonePathAlertEditorDraft,
  createPathAlertEditorDraft,
  buildDismissedPathAlertPageSummaryLines,
  escapeHtml,
  filterAlertsByQuoteId,
  filterDismissedTargetsByQuoteId,
  groupAlertsBySection,
  parsePathAlertsPagePrefill,
  pruneSelectionSet,
  renderPathAlertItemHtml,
  renderPathAlertPanelHtml,
  renderPathAlertRouteLinesHtml,
  renderPathAlertSummaryLinesHtml,
  renderPathAlertToolbarHtml,
  shortenTokenText,
  validatePathAlertEditorDraft
} = require('../path-alert-page-utils');

assert.strictEqual(escapeHtml('<tag a="1">'), '&lt;tag a=&quot;1&quot;&gt;');
assert.strictEqual(shortenTokenText(''), '--');
assert.strictEqual(shortenTokenText('0x1234567890abcdef123456'), '0x123456...123456');
assert.strictEqual(
  buildPathAlertQuoteLabel({
    chain: 'ethereum',
    fromSymbol: 'cbBTC',
    toSymbol: 'WBTC',
    suffix: ' [bid1]',
    formatChainLabel: (chain) => chain.toUpperCase()
  }),
  '(ETHEREUM) cbBTC -> WBTC [bid1]'
);
assert.strictEqual(
  buildPathAlertQuoteDisplayLabel(
    { type: 'quote', quoteId: 1, direction: 'inverse' },
    { id: 1, chain: 'Bybit', symbol: 'WBTCBTC' },
    {
      isCexOrderbookChain: (chain) => chain === 'Bybit',
      parseCexTradingPairSymbol: () => ({ fromSymbol: 'WBTC', toSymbol: 'BTC' }),
      buildQuoteLabel: (chain, fromSymbol, toSymbol, suffix = '') => `(${chain}) ${fromSymbol}->${toSymbol}${suffix}`
    }
  ),
  '反向 (Bybit) BTC->WBTC'
);
const quotePairOptions = {
  formatChainLabel: (chain) => chain === 'avalanche' ? 'Avalanche' : chain,
  shortenToken: (value) => String(value || '').slice(0, 6)
};
assert.strictEqual(
  buildPathAlertQuotePairText(
    { type: 'quote', quoteId: 301, direction: 'forward' },
    { id: 301, chain: 'avalanche', fromToken: '0x50b7545627a5162f82a992c33b87adc75187b218', toToken: '0x0555e30da8f98308edb960aa94c0db47230d2b9c' },
    [{ quoteId: 301, direction: 'forward', fromSymbol: 'WBTC', toSymbol: 'cbBTC' }],
    quotePairOptions
  ),
  'Avalanche WBTC/cbBTC'
);
assert.strictEqual(
  buildPathAlertDefaultQuoteAlertName(
    { type: 'quote', quoteId: 301, direction: 'forward', ruleKind: 'percentUp' },
    { id: 301, chain: 'avalanche', fromToken: 'AAA', toToken: 'BBB' },
    [],
    quotePairOptions
  ),
  'Avalanche AAA/BBB 上涨提醒'
);
assert.deepStrictEqual(
  buildPathAlertPageSummaryLines({
    name: 'BSC BTCB/syBTC 价格高于',
    target: { type: 'quote', quoteId: 101, ruleKind: 'targetAbove', value: 0.100113 }
  }, {
    getDisplayTitle: (alert) => String(alert.name || '').trim(),
    buildQuoteAlertThresholdLine: (target) => `阈值 ${target.value}`,
    buildQuoteAlertQuoteLabel: (target) => `报价 #${target.quoteId}`,
    buildQuoteAlertRuleLine: (target) => `规则 ${target.ruleKind}`
  }),
  ['BSC BTCB/syBTC 价格高于', '阈值 0.100113']
);
assert.deepStrictEqual(
  buildPathAlertPageSummaryLines({
    target: { type: 'rule', ruleKind: 'fixed', ruleId: 'fixed:btc' }
  }, {
    findRule: () => ({ title: '固定 BTC 规则' })
  }),
  ['固定 BTC 规则']
);
assert.deepStrictEqual(
  buildPathAlertPageSummaryLines({
    target: {
      type: 'path',
      legs: [{ chain: 'ethereum', fromSymbol: 'WETH', toSymbol: 'USDC' }]
    }
  }, {
    formatLeg: (leg) => `${leg.chain}:${leg.fromSymbol}->${leg.toSymbol}`
  }),
  ['ethereum:WETH->USDC']
);
assert.deepStrictEqual(
  buildDismissedPathAlertPageSummaryLines({
    summaryLinesSnapshot: ['', 'snapshot line'],
    target: { type: 'rule', ruleKind: 'fixed', ruleId: 'fixed:btc' }
  }),
  ['snapshot line']
);

const scopedAlerts = [
  { id: 'q1', target: { type: 'quote', quoteId: 101 } },
  { id: 'q2', target: { type: 'quote', quoteId: 102 } },
  { id: 'path1', target: { type: 'path', legs: [] } }
];
assert.deepStrictEqual(filterAlertsByQuoteId(scopedAlerts, '').map((item) => item.id), ['q1', 'q2', 'path1']);
assert.deepStrictEqual(filterAlertsByQuoteId(scopedAlerts, '101').map((item) => item.id), ['q1']);
assert.deepStrictEqual(
  filterDismissedTargetsByQuoteId([
    { target: { type: 'quote', quoteId: 101 } },
    { target: { type: 'path', legs: [] } }
  ], 101).map((item) => item.target.type),
  ['quote']
);
assert.deepStrictEqual(
  Array.from(pruneSelectionSet(new Set(['a', 'b', 'c']), ['b', 'c', 'd'])),
  ['b', 'c']
);
const groupedAlerts = groupAlertsBySection([
  { id: 'q1', target: { type: 'quote' } },
  { id: 'r1', target: { type: 'rule', ruleKind: 'fixed' } },
  { id: 's1', target: { type: 'rule', ruleKind: 'special' } },
  { id: 'p1', target: { type: 'path' } }
]);
assert.deepStrictEqual(Object.fromEntries(Object.entries(groupedAlerts).map(([key, items]) => [key, items.map((item) => item.id)])), {
  quote: ['q1'],
  rule: ['r1'],
  path: ['p1'],
  special: ['s1']
});
assert.deepStrictEqual(
  buildPathAlertSectionConfigs(groupedAlerts, { filterQuoteId: 101 }).map((section) => ({
    key: section.key,
    note: section.note,
    count: section.items.length
  })),
  [
    { key: 'quote', note: '当前交易对上下文', count: 1 },
    { key: 'rule', note: '直接展示实际路径腿', count: 1 },
    { key: 'path', note: '保留完整 legs', count: 1 },
    { key: 'special', note: '特殊聚合逻辑', count: 1 }
  ]
);

assert.strictEqual(
  buildPathAlertCardTitle(
    { name: '', target: { type: 'quote', quoteId: 101 } },
    { buildQuoteLabel: (target) => `Quote #${target.quoteId}` }
  ),
  'Quote #101'
);
assert.strictEqual(
  buildPathAlertCardTitle({ target: { type: 'path', legs: [{}, {}] } }),
  '路径规则 (2腿)'
);
assert.strictEqual(
  buildDismissedTargetCardTitle({ target: { type: 'rule', ruleKind: 'special' } }),
  '已忽略特殊规则'
);
assert.strictEqual(
  buildDismissedTargetCardTitle({ target: { type: 'path', legs: [{}] } }),
  '已忽略手工路径 (1腿)'
);
assert.strictEqual(
  buildPathAlertCardMetaText({
    enabled: false,
    triggerMode: 'delayed',
    confirmDelaySec: 3,
    cooldownSec: 60,
    target: { type: 'rule', ruleKind: 'special' },
    specialRuleConfig: { minNetProfit: 1.25, minNetProfitBp: 12 }
  }, {
    resolveSpecialRuleConfig: (config) => config
  }),
  '🏷️特殊 · 🎯>1.25 / >12bp · ⏱3s · ❄️60s · ⛔'
);
assert.strictEqual(
  buildDismissedTargetMetaText({ dismissedAt: 1710000000000 }, { formatDate: () => '2024/3/9 12:00:00' }),
  '🗃️已忽略 · 🕒2024/3/9 12:00:00'
);

const emptyEditorDraft = createPathAlertEditorDraft({
  defaultThresholdBp: 2.5,
  defaultCooldownSec: 240
});
assert.deepStrictEqual(emptyEditorDraft, {
  id: '',
  name: '',
  enabled: true,
  thresholdBp: 2.5,
  triggerMode: 'delayed',
  confirmDelaySec: 13,
  cooldownSec: 240,
  sourceType: 'path',
  selectedRuleId: '',
  selectedQuoteId: '',
  quoteDirection: 'forward',
  quoteRuleKind: 'targetAbove',
  quoteValue: '',
  quoteBasePrice: '',
  specialRuleConfig: null,
  searchQuery: '',
  legs: []
});
assert.deepStrictEqual(
  clonePathAlertEditorDraft({
    id: 123,
    name: 'Draft',
    enabled: false,
    thresholdBp: '1.5',
    triggerMode: 'delayed',
    confirmDelaySec: '8',
    sourceType: 'bad',
    quoteDirection: 'inverse',
    quoteRuleKind: 'bad',
    quoteValue: '1.001',
    quoteBasePrice: '',
    specialRuleConfig: { minNetProfit: 1 },
    searchQuery: 99,
    legs: [{ quoteId: 1 }]
  }, { defaultCooldownSec: 360 }),
  {
    id: '123',
    name: 'Draft',
    enabled: false,
    thresholdBp: 1.5,
    triggerMode: 'delayed',
    confirmDelaySec: 8,
    cooldownSec: 360,
    sourceType: 'path',
    selectedRuleId: '',
    selectedQuoteId: '',
    quoteDirection: 'inverse',
    quoteRuleKind: 'targetAbove',
    quoteValue: 1.001,
    quoteBasePrice: '',
    specialRuleConfig: { minNetProfit: 1 },
    searchQuery: '99',
    legs: [{ quoteId: 1 }]
  }
);
assert.deepStrictEqual(
  buildPathAlertEditorDraftFromAlert({
    id: 'quote-alert',
    name: 'Quote alert',
    enabled: true,
    triggerMode: 'immediate',
    confirmDelaySec: 0,
    cooldownSec: 90,
    target: {
      type: 'quote',
      quoteId: 101,
      direction: 'inverse',
      ruleKind: 'targetAbove',
      value: 1.002,
      basePrice: 1
    }
  }, {
    normalizePathAlert: (alert) => alert
  }),
  {
    id: 'quote-alert',
    name: 'Quote alert',
    enabled: true,
    thresholdBp: '',
    triggerMode: 'immediate',
    confirmDelaySec: 0,
    cooldownSec: 90,
    sourceType: 'quote',
    selectedRuleId: '',
    selectedQuoteId: '101',
    quoteDirection: 'inverse',
    quoteRuleKind: 'targetAbove',
    quoteValue: 1.002,
    quoteBasePrice: 1,
    searchQuery: '',
    legs: []
  }
);
assert.deepStrictEqual(
  buildPathAlertEditorDraftFromAlert({
    id: 'special-alert',
    name: 'Special alert',
    enabled: true,
    thresholdBp: 0,
    triggerMode: 'delayed',
    confirmDelaySec: 13,
    cooldownSec: 180,
    specialRuleConfig: { minNetProfit: '2', minNetProfitBp: '5' },
    target: {
      type: 'rule',
      ruleKind: 'special',
      ruleId: 'special:btc'
    }
  }, {
    normalizePathAlert: (alert) => alert,
    resolveSpecialRuleConfig: (config) => ({
      minNetProfit: Number(config.minNetProfit),
      minNetProfitBp: Number(config.minNetProfitBp)
    })
  }).specialRuleConfig,
  { minNetProfit: 2, minNetProfitBp: 5 }
);
assert.deepStrictEqual(
  buildPathAlertEditorDraftFromPrefill({
    name: 'Prefill quote',
    target: {
      type: 'quote',
      quoteId: 202,
      direction: 'inverse',
      ruleKind: 'percentDown',
      value: '0.3',
      basePrice: '1.001'
    }
  }, { defaultThresholdBp: 2.5, defaultCooldownSec: 240 }),
  {
    ...emptyEditorDraft,
    name: 'Prefill quote',
    sourceType: 'quote',
    selectedQuoteId: '202',
    quoteDirection: 'inverse',
    quoteRuleKind: 'percentDown',
    quoteValue: 0.3,
    quoteBasePrice: 1.001
  }
);
assert.deepStrictEqual(
  buildPathAlertEditorTarget({
    sourceType: 'quote',
    selectedQuoteId: '202',
    quoteDirection: 'inverse',
    quoteRuleKind: 'percentDown',
    quoteValue: '0.3',
    quoteBasePrice: '1.001'
  }),
  {
    type: 'quote',
    quoteId: 202,
    direction: 'inverse',
    ruleKind: 'percentDown',
    value: 0.3,
    basePrice: 1.001
  }
);
assert.deepStrictEqual(
  buildPathAlertEditorTarget({
    sourceType: 'special',
    selectedRuleId: 'special:btc'
  }),
  {
    type: 'rule',
    ruleKind: 'special',
    ruleId: 'special:btc'
  }
);
assert.deepStrictEqual(
  buildPathAlertEditorTarget({
    sourceType: 'path',
    legs: [
      {
        quoteId: '1',
        direction: 'inverse',
        pricingMode: 'unknown',
        chain: 'ethereum',
        fromSymbol: 'WETH',
        toSymbol: 'USDC'
      }
    ]
  }),
  {
    type: 'path',
    legs: [
      {
        quoteId: 1,
        direction: 'inverse',
        pricingMode: 'raw',
        chain: 'ethereum',
        fromSymbol: 'WETH',
        toSymbol: 'USDC'
      }
    ]
  }
);
assert.deepStrictEqual(
  buildPathAlertEditorTargetSummaryLines({
    sourceType: 'path',
    legs: [
      { chain: 'ethereum', fromSymbol: 'WETH', toSymbol: 'USDC' },
      { chain: '', fromSymbol: '', toSymbol: '' }
    ]
  }, {
    formatLeg: (leg) => leg.chain ? `${leg.chain}:${leg.fromSymbol}->${leg.toSymbol}` : ''
  }),
  ['ethereum:WETH->USDC']
);
assert.deepStrictEqual(
  buildPathAlertEditorTargetSummaryLines({
    sourceType: 'quote',
    selectedQuoteId: '202',
    quoteDirection: 'forward',
    quoteRuleKind: 'targetAbove',
    quoteValue: '1.001'
  }, {
    buildQuoteAlertQuoteLabel: (target) => `报价 #${target.quoteId}`,
    buildQuoteAlertRuleLine: (target) => `规则 ${target.ruleKind}`
  }),
  ['报价 #202', '规则 targetAbove']
);
assert.deepStrictEqual(
  buildPathAlertEditorTargetSummaryLines({
    sourceType: 'fixed',
    selectedRuleId: 'fixed:btc'
  }, {
    findRule: () => ({ title: '固定 BTC 规则' })
  }),
  ['固定 BTC 规则']
);
assert.strictEqual(
  validatePathAlertEditorDraft({
    sourceType: 'quote',
    selectedQuoteId: 202,
    quoteDirection: 'forward',
    quoteRuleKind: 'targetAbove',
    quoteValue: 1,
    confirmDelaySec: -1,
    cooldownSec: 60
  }, {
    quoteExists: () => true
  }),
  '延迟确认必须是大于等于 0 的数字'
);
assert.strictEqual(
  validatePathAlertEditorDraft({
    sourceType: 'quote',
    selectedQuoteId: 202,
    quoteDirection: 'inverse',
    quoteRuleKind: 'percentDown',
    quoteValue: 0.3,
    quoteBasePrice: '',
    confirmDelaySec: 0,
    cooldownSec: 60
  }, {
    quoteExists: () => true
  }),
  '百分比规则必须填写有效基准汇率'
);
assert.strictEqual(
  validatePathAlertEditorDraft({
    sourceType: 'special',
    selectedRuleId: 'special:btc',
    thresholdBp: '',
    specialRuleConfig: { minNetProfit: -1, minNetProfitBp: 5 },
    confirmDelaySec: 0,
    cooldownSec: 60
  }, {
    findRule: () => ({ id: 'special:btc' }),
    resolveSpecialRuleConfig: (config) => config
  }),
  '净收益阈值必须是大于等于 0 的数字'
);
assert.strictEqual(
  validatePathAlertEditorDraft({
    sourceType: 'path',
    thresholdBp: 1,
    confirmDelaySec: 0,
    cooldownSec: 60,
    legs: [{ quoteId: 999 }]
  }, {
    quoteExists: () => false
  }),
  '路径腿引用的 live quote 不存在：999'
);
assert.strictEqual(
  validatePathAlertEditorDraft({
    sourceType: 'fixed',
    selectedRuleId: 'fixed:btc',
    thresholdBp: 1,
    confirmDelaySec: 0,
    cooldownSec: 60
  }, {
    findRule: () => ({ id: 'fixed:btc' }),
    findDismissedTarget: () => ({ id: 'dismissed' })
  }),
  '该规则已被标记为忽略，请先在“已忽略规则”列表取消标记。'
);
assert.strictEqual(
  validatePathAlertEditorDraft({
    sourceType: 'quote',
    selectedQuoteId: 202,
    quoteDirection: 'forward',
    quoteRuleKind: 'targetAbove',
    quoteValue: 1,
    confirmDelaySec: 0,
    cooldownSec: 60
  }, {
    quoteExists: () => true,
    findDuplicateAlert: () => ({ id: 'existing-alert' })
  }),
  '该报警已存在：existing-alert'
);
assert.strictEqual(
  validatePathAlertEditorDraft({
    sourceType: 'path',
    thresholdBp: 1,
    confirmDelaySec: 0,
    cooldownSec: 60,
    legs: [{ quoteId: 1 }]
  }, {
    quoteExists: () => true
  }),
  ''
);
assert.deepStrictEqual(
  buildPathAlertFromEditorDraft({
    id: '',
    name: '',
    enabled: true,
    sourceType: 'special',
    selectedRuleId: 'special:btc',
    thresholdBp: 9,
    triggerMode: 'delayed',
    confirmDelaySec: '13',
    cooldownSec: '',
    specialRuleConfig: { minNetProfit: '2', minNetProfitBp: '5' }
  }, {
    defaultCooldownSec: 240,
    buildAlertId: () => 'generated-alert',
    buildDefaultAlertName: () => 'Default name',
    resolveSpecialRuleConfig: (config) => ({
      minNetProfit: Number(config.minNetProfit),
      minNetProfitBp: Number(config.minNetProfitBp)
    }),
    normalizePathAlert: (alert) => ({ ...alert, normalized: true })
  }),
  {
    id: 'generated-alert',
    name: 'Default name',
    enabled: true,
    thresholdBp: 0,
    triggerMode: 'delayed',
    confirmDelaySec: 13,
    cooldownSec: 240,
    target: {
      type: 'rule',
      ruleKind: 'special',
      ruleId: 'special:btc'
    },
    specialRuleConfig: {
      minNetProfit: 2,
      minNetProfitBp: 5
    },
    normalized: true
  }
);

const pathDraft = sanitizePathAlertDraft({
  name: 'WBTC 路径',
  enabled: true,
  target: {
    type: 'path',
    legs: [
      {
        quoteId: '12',
        direction: 'forward',
        pricingMode: 'raw',
        chain: 'arbitrum',
        fromSymbol: 'cbBTC',
        toSymbol: 'WBTC'
      },
      {
        quoteId: 88,
        direction: 'forward',
        pricingMode: 'cex-bid1',
        chain: 'Bybit',
        fromSymbol: 'WBTC',
        toSymbol: 'BTC'
      }
    ]
  }
});
assert.deepStrictEqual(pathDraft, {
  name: 'WBTC 路径',
  target: {
    type: 'path',
    legs: [
      {
        quoteId: 12,
        direction: 'forward',
        pricingMode: 'raw',
        chain: 'arbitrum',
        fromSymbol: 'cbBTC',
        toSymbol: 'WBTC'
      },
      {
        quoteId: 88,
        direction: 'forward',
        pricingMode: 'cex-bid1',
        chain: 'Bybit',
        fromSymbol: 'WBTC',
        toSymbol: 'BTC'
      }
    ]
  }
});

const quoteDraft = sanitizePathAlertDraft({
  name: 'ETH cbBTC/BTC.b 反向',
  target: {
    type: 'quote',
    quoteId: '101',
    direction: 'inverse',
    ruleKind: 'targetAbove',
    value: '0.998'
  }
});
assert.deepStrictEqual(quoteDraft, {
  name: 'ETH cbBTC/BTC.b 反向',
  target: {
    type: 'quote',
    quoteId: 101,
    direction: 'inverse',
    ruleKind: 'targetAbove',
    value: 0.998
  }
});

assert.strictEqual(sanitizePathAlertDraft({ target: { type: 'path', legs: [] } }), null);
assert.strictEqual(sanitizePathAlertDraft({ target: { type: 'rule', ruleKind: 'fixed' } }), null);

const ruleHref = buildPathAlertsPageHref({
  mode: 'create',
  draft: {
    name: '固定规则',
    target: {
      type: 'rule',
      ruleKind: 'fixed',
      ruleId: 'fixed:gho-usdc'
    }
  }
});
assert.ok(ruleHref.startsWith('/path-alerts?mode=create&draft='));
const parsedRule = parsePathAlertsPagePrefill(ruleHref);
assert.deepStrictEqual(parsedRule, {
  mode: 'create',
  alertId: '',
  filterQuoteId: '',
  draft: {
    name: '固定规则',
    target: {
      type: 'rule',
      ruleKind: 'fixed',
      ruleId: 'fixed:gho-usdc'
    }
  }
});

const editHref = buildPathAlertsPageHref({ mode: 'edit', alertId: 'path-alert-1' });
assert.strictEqual(editHref, '/path-alerts?mode=edit&alertId=path-alert-1');
assert.deepStrictEqual(parsePathAlertsPagePrefill(editHref), {
  mode: 'edit',
  alertId: 'path-alert-1',
  filterQuoteId: '',
  draft: null
});

const quoteHref = buildPathAlertsPageHref({
  mode: 'create',
  filterQuoteId: 101,
  draft: {
    name: 'ETH cbBTC/BTC.b 正向',
    target: {
      type: 'quote',
      quoteId: 101,
      direction: 'forward',
      ruleKind: 'targetAbove',
      value: 1.00025
    }
  }
});
assert.ok(quoteHref.startsWith('/path-alerts?mode=create&filterQuoteId=101&draft='));
assert.deepStrictEqual(parsePathAlertsPagePrefill(quoteHref), {
  mode: 'create',
  alertId: '',
  filterQuoteId: '101',
  draft: {
    name: 'ETH cbBTC/BTC.b 正向',
    target: {
      type: 'quote',
      quoteId: 101,
      direction: 'forward',
      ruleKind: 'targetAbove',
      value: 1.00025
    }
  }
});

assert.deepStrictEqual(parsePathAlertsPagePrefill('/path-alerts'), {
  mode: 'manage',
  alertId: '',
  filterQuoteId: '',
  draft: null
});
assert.deepStrictEqual(parsePathAlertsPagePrefill('/path-alerts?mode=create&draft=%7Bbad-json'), {
  mode: 'create',
  alertId: '',
  filterQuoteId: '',
  draft: null
});

const toolbarHtml = renderPathAlertToolbarHtml({
  settings: {
    localSoundEnabled: true,
    webhookEnabled: false,
    pathAlertEvalIntervalMs: 500
  },
  dismissedCount: 2,
  forceImmediateAlerts: true
});
assert.ok(toolbarHtml.includes('data-path-alert-global-toggle="localSoundEnabled" checked'));
assert.ok(toolbarHtml.includes('data-path-alert-global-toggle="webhookEnabled" '));
assert.ok(toolbarHtml.includes('data-path-alert-force-immediate checked'));
assert.ok(toolbarHtml.includes('周期 500ms'));
assert.ok(toolbarHtml.includes('已忽略 2 条'));

const itemHtml = renderPathAlertItemHtml({
  alertId: 'alert-1',
  title: '路径 <A>',
  routeHtml: '<div class="path-alert-item-route-line">ETH/USDC</div>',
  metaText: '阈值 <1>',
  editHref: '/path-alerts?mode=edit&alertId=alert-1',
  statusText: '触发',
  statusClassName: 'path-alert-status-triggered',
  evaluationText: '利润 > 1',
  lastTriggeredText: '12:00:00'
});
assert.ok(itemHtml.includes('路径 &lt;A&gt;'));
assert.ok(itemHtml.includes('<div class="path-alert-item-route-line">ETH/USDC</div>'));
assert.ok(itemHtml.includes('阈值 &lt;1&gt;'));
assert.ok(itemHtml.includes('data-path-alert-edit-link="alert-1"'));
assert.ok(itemHtml.includes('data-path-alert-delete="alert-1"'));
assert.ok(itemHtml.includes('data-path-alert-dismiss-delete="alert-1"'));
assert.ok(itemHtml.includes('path-alert-status-triggered'));
assert.ok(itemHtml.includes('利润 &gt; 1'));

assert.strictEqual(
  renderPathAlertSummaryLinesHtml(['路径 <A>', 'ETH/USDC']),
  '<div class="path-alert-item-route-line">路径 &lt;A&gt;</div><div class="path-alert-item-route-line">ETH/USDC</div>'
);

assert.strictEqual(
  renderPathAlertRouteLinesHtml(['', 'ETH/USDC'], 'alert-card-route-line'),
  '<div class="alert-card-route-line">ETH/USDC</div>'
);

assert.strictEqual(
  renderPathAlertSummaryLinesHtml([]),
  '<div class="path-alert-item-route-line">--</div>'
);

const panelHtml = renderPathAlertPanelHtml({
  settings: { pathAlertEvalIntervalMs: 500 },
  items: [{ alertId: 'alert-2', title: '报警', evaluationText: '等待', lastTriggeredText: '--' }]
});
assert.ok(panelHtml.includes('class="path-alert-toolbar"'));
assert.ok(panelHtml.includes('class="path-alert-list"'));
assert.ok(panelHtml.includes('data-path-alert-delete="alert-2"'));

const emptyPanelHtml = renderPathAlertPanelHtml({
  settings: { pathAlertEvalIntervalMs: 500 },
  emptyText: '暂无需要关注的路径报警'
});
assert.ok(emptyPanelHtml.includes('暂无需要关注的路径报警'));

assert.strictEqual(
  buildPathAlertMetaText({
    target: { type: 'quote', value: 1.0001 },
    triggerMode: 'delayed',
    confirmDelaySec: 13,
    cooldownSec: 180
  }),
  '报价 | 1.0001 | 延迟 13s | 冷却 180s'
);

assert.strictEqual(
  buildPathAlertMetaText({
    target: { type: 'rule', ruleKind: 'special' },
    triggerMode: 'immediate',
    cooldownSec: 300
  }, {
    resolveSpecialRuleConfig: () => ({ minNetProfit: 0.01, minNetProfitBp: 1.5 })
  }),
  '净收益 > 0.01 | 净收益率 > 1.5bp | 立即 | 冷却 300s'
);

assert.strictEqual(
  buildPathAlertMetaText({
    target: { type: 'path' },
    thresholdBp: 2,
    triggerMode: 'immediate',
    cooldownSec: 120
  }),
  '阈值 2bp | 立即 | 冷却 120s'
);
