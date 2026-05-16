const assert = require('assert');

const {
  buildPathAlertEditorDraftFromAlert,
  buildPathAlertEditorDraftFromPrefill,
  buildPathAlertEditorTarget,
  buildPathAlertEditorTargetSummaryLines,
  buildPathAlertFromEditorDraft,
  clonePathAlertEditorDraft,
  createPathAlertEditorDraft,
  renderPathAlertEditorCandidateSearchHtml,
  renderPathAlertEditorCandidateSuggestionsHtml,
  renderPathAlertEditorQuoteTargetHtml,
  renderPathAlertEditorRuleChoicesHtml,
  renderPathAlertEditorSelectedLegsHtml,
  validatePathAlertEditorDraft
} = require('../path-alert-editor-utils');

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
assert.ok(renderPathAlertEditorRuleChoicesHtml(
  [{ id: 'fixed:btc', title: '固定 <BTC>' }],
  'fixed:btc'
).includes('固定 &lt;BTC&gt;'));
assert.ok(renderPathAlertEditorCandidateSearchHtml(
  { searchQuery: 'ETH <USDC>' },
  { hasQuoteCandidates: false }
).includes('暂无可选报价腿'));
const candidateSuggestionsHtml = renderPathAlertEditorCandidateSuggestionsHtml([
  { key: 'quote:1', label: 'ETH <USDC>', categoryName: 'Base <main>' },
  { key: 'quote:2', label: 'WBTC/cbBTC', categoryName: '' }
], 1);
assert.ok(candidateSuggestionsHtml.includes('data-path-alert-candidate-key="quote:1"'));
assert.ok(candidateSuggestionsHtml.includes('ETH &lt;USDC&gt;'));
assert.ok(candidateSuggestionsHtml.includes('Base &lt;main&gt;'));
assert.ok(candidateSuggestionsHtml.includes('path-alert-suggestion active'));
const quoteTargetHtml = renderPathAlertEditorQuoteTargetHtml(
  {
    selectedQuoteId: '202',
    quoteDirection: 'inverse',
    quoteRuleKind: 'percentDown',
    quoteValue: 0.3,
    quoteBasePrice: 1.001
  },
  [{ id: 202, label: 'ETH <USDC>' }],
  { quoteSelectDisabled: true }
);
assert.ok(quoteTargetHtml.includes('<select id="editor-quote-id" disabled>'));
assert.ok(quoteTargetHtml.includes('ETH &lt;USDC&gt;'));
assert.ok(quoteTargetHtml.includes('id="editor-quote-base-price"'));
const selectedLegsHtml = renderPathAlertEditorSelectedLegsHtml(
  {
    sourceType: 'path',
    legs: [{ chain: 'ethereum', fromSymbol: 'WETH', toSymbol: 'USDC' }]
  },
  {
    formatLeg: (leg) => `${leg.chain}:${leg.fromSymbol}->${leg.toSymbol}`
  }
);
assert.ok(selectedLegsHtml.includes('ethereum:WETH-&gt;USDC'));
assert.ok(selectedLegsHtml.includes('data-editor-remove-leg="0"'));
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
