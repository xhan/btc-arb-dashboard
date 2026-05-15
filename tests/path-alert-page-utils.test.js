const assert = require('assert');

const {
  sanitizePathAlertDraft,
  buildPathAlertQuoteLabel,
  buildPathAlertMetaText,
  buildPathAlertsPageHref,
  parsePathAlertsPagePrefill,
  renderPathAlertItemHtml,
  renderPathAlertPanelHtml,
  renderPathAlertSummaryLinesHtml,
  renderPathAlertToolbarHtml,
  shortenTokenText
} = require('../path-alert-page-utils');

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
