const assert = require('assert');

const {
  sanitizePathAlertDraft,
  buildDismissedTargetCardTitle,
  buildDismissedTargetMetaText,
  buildPathAlertCardMetaText,
  buildPathAlertCardSubtitle,
  buildPathAlertCardTitle,
  buildPathAlertContextQuoteLabel,
  buildPathAlertDefaultQuoteAlertName,
  buildQuoteAlertSummaryLabel,
  buildPathAlertQuoteDisplayLabel,
  buildPathAlertQuoteLabel,
  buildPathAlertPageSummaryLines,
  buildPathAlertLegDisplayLine,
  buildPathAlertSummaryLegLine,
  buildPathAlertQuotePairText,
  buildPathAlertSectionConfigs,
  buildPathAlertsPageHref,
  buildDismissedPathAlertPageSummaryLines,
  filterAlertsByQuoteId,
  filterDismissedTargetsByQuoteId,
  groupAlertsBySection,
  parsePathAlertsPagePrefill,
  pruneSelectionSet,
  renderDismissedTargetCardHtml,
  renderPathAlertCardHtml,
  renderPathAlertContextBarHtml,
  renderPathAlertRouteLinesHtml,
  renderPathAlertSectionHtml,
  getPathAlertSectionTypeClass,
  getPathAlertSectionTypeLabel,
  shortenTokenText
} = require('../src/path-alerts/path-alert-page-utils');

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
  buildPathAlertQuoteLabel({
    chain: 'ethereum',
    fromSymbol: 'cbBTC',
    toSymbol: 'WBTC'
  }),
  '(eth) cbBTC -> WBTC'
);
assert.strictEqual(
  buildPathAlertQuotePairText(
    { type: 'quote', quoteId: 302, direction: 'forward' },
    { id: 302, chain: 'arbitrum', fromToken: 'WBTC', toToken: 'cbBTC' },
    []
  ),
  'arb WBTC/cbBTC'
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
assert.strictEqual(
  buildQuoteAlertSummaryLabel(
    { quoteId: 1, direction: 'inverse' },
    { id: 1, chain: 'ethereum' },
    { fromSymbol: 'WBTC', toSymbol: 'cbBTC' },
    {
      getQuoteAlertDirection: (target) => target.direction,
      buildQuoteAlertDisplayLabel: (quote, state, direction) => `${quote.chain}:${direction}:${state.toSymbol}/${state.fromSymbol}`
    }
  ),
  'ethereum:inverse:cbBTC/WBTC'
);
assert.strictEqual(
  buildQuoteAlertSummaryLabel(
    { quoteId: 42 },
    null,
    {},
    {
      buildQuoteAlertDisplayLabel: () => 'unused'
    }
  ),
  '报价 #42'
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
assert.strictEqual(
  buildPathAlertLegDisplayLine(
    { chain: 'Bybit', fromSymbol: 'WBTC', toSymbol: 'BTC', pricingMode: 'cex-bid1' },
    { buildQuoteLabel: (chain, fromSymbol, toSymbol, suffix) => `(${chain}) ${fromSymbol}->${toSymbol}${suffix}` }
  ),
  '(Bybit) WBTC->BTC [bid1]'
);
assert.strictEqual(
  buildPathAlertLegDisplayLine(
    { chain: 'Bybit', fromSymbol: 'BTC', toSymbol: 'WBTC', pricingMode: 'cex-ask1-inverse' },
    { buildQuoteLabel: (chain, fromSymbol, toSymbol, suffix) => `(${chain}) ${fromSymbol}->${toSymbol}${suffix}` }
  ),
  '(Bybit) BTC->WBTC [ask1]'
);
function buildSummaryLegLabel(chain, fromSymbol, toSymbol, suffix) {
  return `(${chain}) ${fromSymbol}->${toSymbol}${suffix}`;
}
assert.strictEqual(
  buildPathAlertSummaryLegLine(
    { chain: 'Bybit', fromSymbol: 'WBTC', toSymbol: 'BTC', pricingMode: 'cex-ask1-inverse' },
    { fromSymbol: 'WBTC', toSymbol: 'BTC' },
    { buildQuoteLabel: buildSummaryLegLabel }
  ),
  '(Bybit) BTC->WBTC [ask1]'
);
assert.strictEqual(
  buildPathAlertSummaryLegLine(
    { chain: 'Bybit', fromSymbol: 'WBTC', toSymbol: 'BTC', pricingMode: 'cex-bid1' },
    { fromSymbol: 'WBTC', toSymbol: 'BTC' },
    { buildQuoteLabel: buildSummaryLegLabel }
  ),
  '(Bybit) WBTC->BTC [bid1]'
);
assert.strictEqual(
  buildPathAlertSummaryLegLine(
    { chain: 'ethereum', fromSymbol: 'WETH', toSymbol: 'USDC', direction: 'inverse' },
    { fromSymbol: 'WETH', toSymbol: 'USDC' },
    { buildQuoteLabel: buildSummaryLegLabel }
  ),
  '(ethereum) USDC->WETH'
);
assert.strictEqual(
  buildPathAlertSummaryLegLine(
    { chain: 'ethereum', fromSymbol: 'WETH', toSymbol: 'USDC' },
    null,
    { buildQuoteLabel: buildSummaryLegLabel }
  ),
  '(ethereum) WETH->USDC'
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
assert.strictEqual(
  buildPathAlertContextQuoteLabel({
    quote: { chain: 'Bybit', symbol: 'BTCUSDT' },
    isCexOrderbookChain: (chain) => chain === 'Bybit',
    formatChainLabel: (chain) => chain
  }),
  'Bybit BTCUSDT'
);
assert.strictEqual(
  buildPathAlertContextQuoteLabel({
    filterQuoteId: 101,
    quote: {
      chain: 'ethereum',
      fromToken: '0x50b7545627a5162f82a992c33b87adc75187b218',
      toToken: '0x0555e30da8f98308edb960aa94c0db47230d2b9c'
    },
    formatChainLabel: (chain) => chain.toUpperCase(),
    shortenToken: (token) => token.slice(0, 6),
    buildQuoteLabel: (chain, fromSymbol, toSymbol) => `(${chain}) ${fromSymbol} -> ${toSymbol}`
  }),
  'ethereum 0x50b7 -> 0x0555'
);
assert.strictEqual(
  buildPathAlertContextQuoteLabel({ filterQuoteId: 999 }),
  '交易对 #999'
);
const contextBarHtml = renderPathAlertContextBarHtml({
  quoteLabel: 'ETH <USDC>',
  filteredCount: 3
});
assert.ok(contextBarHtml.includes('当前交易对 · ETH &lt;USDC&gt;'));
assert.ok(contextBarHtml.includes('data-context-create="forward"'));
assert.ok(contextBarHtml.includes('当前 3 条'));
assert.strictEqual(
  buildPathAlertCardSubtitle({ target: { type: 'rule', ruleKind: 'fixed' } }),
  '固定规则路径'
);
assert.strictEqual(
  buildPathAlertCardSubtitle({ target: { type: 'path', legs: [{}, {}] } }),
  '2 腿路径'
);
assert.strictEqual(getPathAlertSectionTypeClass('special'), 'special');
assert.strictEqual(getPathAlertSectionTypeClass('unknown'), 'path');
assert.strictEqual(getPathAlertSectionTypeLabel('quote'), '交易对');
assert.strictEqual(getPathAlertSectionTypeLabel('unknown'), '路径');

const alertCardHtml = renderPathAlertCardHtml({
  alertId: 'alert-1',
  selected: true,
  title: '路径 <A>',
  subtitle: '2 腿路径',
  typeClass: 'path',
  typeLabel: '路径',
  enabled: false,
  summaryLines: ['ETH <USDC>'],
  metaText: '阈值 <1>'
});
assert.ok(alertCardHtml.includes('data-alert-open="alert-1"'));
assert.ok(alertCardHtml.includes('data-alert-select="alert-1" checked'));
assert.ok(alertCardHtml.includes('路径 &lt;A&gt;'));
assert.ok(alertCardHtml.includes('ETH &lt;USDC&gt;'));
assert.ok(alertCardHtml.includes('阈值 &lt;1&gt;'));
assert.ok(alertCardHtml.includes('data-alert-toggle="alert-1">启用</button>'));

const dismissedCardHtml = renderDismissedTargetCardHtml({
  targetKey: 'target-1',
  selected: true,
  title: '已忽略 <A>',
  summaryLines: ['ETH/USDC'],
  metaText: '已忽略'
});
assert.ok(dismissedCardHtml.includes('data-dismissed-select="target-1" checked'));
assert.ok(dismissedCardHtml.includes('已忽略 &lt;A&gt;'));
assert.ok(dismissedCardHtml.includes('data-dismissed-restore="target-1"'));
assert.ok(dismissedCardHtml.includes('data-dismissed-delete="target-1"'));

const sectionHtml = renderPathAlertSectionHtml({
  id: 'path-section',
  tagClass: 'path',
  title: '手工路径',
  note: '保留完整 legs',
  count: 2
}, '<article></article>');
assert.ok(sectionHtml.includes('id="path-section"'));
assert.ok(sectionHtml.includes('手工路径'));
assert.ok(sectionHtml.includes('2 条'));
assert.ok(sectionHtml.includes('<article></article>'));

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

assert.strictEqual(
  renderPathAlertRouteLinesHtml(['', 'ETH/USDC'], 'alert-card-route-line'),
  '<div class="alert-card-route-line">ETH/USDC</div>'
);
