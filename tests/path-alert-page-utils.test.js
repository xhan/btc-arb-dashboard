const assert = require('assert');

const {
  sanitizePathAlertDraft,
  buildPathAlertsPageHref,
  parsePathAlertsPagePrefill
} = require('../path-alert-page-utils');

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
