const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const candidateUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/path-alerts/path-alert-candidate-utils.js'), 'utf8');
const chainLabelConfigCode = fs.readFileSync(path.join(__dirname, '..', 'src/shared/chain-label-config.js'), 'utf8');
const chainDefaultsCode = fs.readFileSync(path.join(__dirname, '..', 'src/shared/chain-defaults.js'), 'utf8');
const tradingPairUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/shared/trading-pair-utils.js'), 'utf8');
const notificationUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/path-alerts/path-alert-notification-utils.js'), 'utf8');
const pageUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/path-alerts/path-alert-page-utils.js'), 'utf8');
const editorUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/path-alerts/path-alert-editor-utils.js'), 'utf8');
const domRefsCode = fs.readFileSync(path.join(__dirname, '..', 'src/path-alerts/path-alert-dom-refs.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, '..', 'src/path-alerts/path-alerts-app.js'), 'utf8');

function createElement() {
  return {
    innerHTML: '',
    textContent: '',
    className: '',
    value: '',
    checked: false,
    disabled: false,
    style: {},
    dataset: {},
    classList: {
      add() {},
      remove() {}
    },
    addEventListener() {},
    removeEventListener() {},
    focus() {},
    closest() { return null; }
  };
}

const documentStub = {
  getElementById() {
    return createElement();
  },
  addEventListener() {},
  activeElement: null
};

const sandbox = {
  console,
  window: {
    __PATH_ALERTS_APP_DISABLE_AUTO_INIT__: true,
    PathAlertUtils: {
      normalizeAlertConfig() {
        return { settings: { defaultCooldownSec: 300 }, alerts: [] };
      },
      DEFAULT_PATH_ALERT_THRESHOLD_BP: 1.1
    }
  },
  document: documentStub,
  location: {
    protocol: 'http:',
    hostname: '127.0.0.1',
    href: 'http://127.0.0.1/path-alerts'
  },
  history: { replaceState() {} },
  fetch: async () => {
    throw new Error('unexpected fetch');
  },
  setTimeout,
  clearTimeout,
  URL,
  URLSearchParams,
  Map,
  Date
};
sandbox.window.window = sandbox.window;
sandbox.window.document = documentStub;
sandbox.window.history = sandbox.history;
sandbox.window.location = sandbox.location;
sandbox.window.fetch = sandbox.fetch;
sandbox.window.console = console;
sandbox.window.setTimeout = setTimeout;
sandbox.window.clearTimeout = clearTimeout;

vm.createContext(sandbox);
vm.runInContext(chainLabelConfigCode, sandbox);
sandbox.window.ChainLabelConfig = sandbox.ChainLabelConfig;
vm.runInContext(chainDefaultsCode, sandbox);
sandbox.window.ChainDefaults = sandbox.ChainDefaults;
vm.runInContext(candidateUtilsCode, sandbox);
vm.runInContext(tradingPairUtilsCode, sandbox);
vm.runInContext(notificationUtilsCode, sandbox);
vm.runInContext(pageUtilsCode, sandbox);
sandbox.window.PathAlertPageUtils = sandbox.PathAlertPageUtils;
vm.runInContext(editorUtilsCode, sandbox);
sandbox.window.PathAlertEditorUtils = sandbox.PathAlertEditorUtils;
vm.runInContext(domRefsCode, sandbox);
sandbox.window.PathAlertDomRefs = sandbox.PathAlertDomRefs;
vm.runInContext(appCode, sandbox);

const candidates = sandbox.window.PathAlertsAppTestHooks.buildFallbackQuoteCandidatesFromDashboard([
  {
    id: 1,
    name: '测试监控',
    quotes: [
      { id: 101, chain: 'ethereum', fromToken: '0xaaa', toToken: '0xbbb', showInverse: true },
      { id: 102, chain: 'ethereum', fromToken: '0xccc', toToken: '0xddd', showInverse: true, paused: true },
      { id: 103, chain: 'Bybit', symbol: 'BTCUSDT' }
    ]
  }
]);

assert.ok(candidates.some((item) => item.key === '101:forward'));
assert.ok(candidates.some((item) => item.key === '101:inverse'));
assert.ok(!candidates.some((item) => item.key.startsWith('102:')));
assert.ok(candidates.some((item) => item.key === '103:cex-bid1'));
assert.ok(candidates.some((item) => item.key === '103:cex-ask1-inverse'));

const routeHtml = sandbox.window.PathAlertsAppTestHooks.buildAlertRouteHtml([
  '(Base) cbBTC -> LBTC',
  '(ETH) LBTC -> cbBTC'
]);
assert.ok(routeHtml.includes('alert-item-route-line'));
assert.ok(routeHtml.includes('(Base) cbBTC -&gt; LBTC'));
assert.ok(routeHtml.includes('(ETH) LBTC -&gt; cbBTC'));

const quoteRouteHtml = sandbox.window.PathAlertsAppTestHooks.buildAlertRouteHtml(
  sandbox.window.PathAlertsAppTestHooks.buildAlertSummaryLines({
    name: 'BSC BTCB/syBTC 价格高于',
    target: {
      type: 'quote',
      quoteId: 101,
      ruleKind: 'targetAbove',
      value: 0.100113
    }
  })
);
assert.ok(quoteRouteHtml.includes('BSC BTCB/syBTC 价格高于'));
assert.ok(quoteRouteHtml.includes('阈值 0.100113'));

assert.strictEqual(
  sandbox.window.PathAlertsAppTestHooks.getAlertPrimaryTitle({
    target: {
      type: 'path',
      legs: [{}, {}]
    }
  }),
  '路径规则 (2腿)'
);

assert.strictEqual(
  sandbox.window.PathAlertsAppTestHooks.getAlertPrimaryTitle({
    name: 'LBTC 回环',
    target: {
      type: 'path',
      legs: [{}, {}]
    }
  }),
  'LBTC 回环'
);

assert.strictEqual(
  sandbox.window.PathAlertsAppTestHooks.getAlertPrimaryTitle({
    target: {
      type: 'quote',
      quoteId: 101,
      ruleKind: 'targetAbove',
      value: 0.100113
    }
  }),
  '报价 #101'
);

const alertMeta = sandbox.window.PathAlertsAppTestHooks.formatAlertMetaLine({
  target: { type: 'path' },
  thresholdBp: 1.2,
  triggerMode: 'delayed',
  confirmDelaySec: 13,
  cooldownSec: 180,
  enabled: false
});
assert.strictEqual(alertMeta, '🏷️路径 · 🎯1.2bp · ⏱13s · ❄️180s · ⛔');

const quoteAlertMeta = sandbox.window.PathAlertsAppTestHooks.formatAlertMetaLine({
  target: { type: 'quote', ruleKind: 'targetAbove', value: 0.100113 },
  triggerMode: 'immediate',
  cooldownSec: 180,
  enabled: true
});
assert.strictEqual(quoteAlertMeta, '🏷️交易对 · 🎯0.100113 · ⚡立即 · ❄️180s · ✅');

const grouped = sandbox.window.PathAlertsAppTestHooks.groupAlertsBySection([
  { id: 'q1', target: { type: 'quote', quoteId: 101, ruleKind: 'targetAbove', value: 1.01 } },
  { id: 'r1', target: { type: 'rule', ruleKind: 'fixed', ruleId: 'fixed:x' } },
  { id: 'p1', target: { type: 'path', legs: [{}, {}] } },
  { id: 's1', target: { type: 'rule', ruleKind: 'special', ruleId: 'special:x' } }
]);
assert.strictEqual(grouped.quote.map((item) => item.id).join(','), 'q1');
assert.strictEqual(grouped.rule.map((item) => item.id).join(','), 'r1');
assert.strictEqual(grouped.path.map((item) => item.id).join(','), 'p1');
assert.strictEqual(grouped.special.map((item) => item.id).join(','), 's1');

const defaultQuoteAlertName = sandbox.window.PathAlertsAppTestHooks.buildDefaultAlertName({
  sourceType: 'quote',
  selectedQuoteId: '101',
  quoteDirection: 'forward',
  quoteRuleKind: 'targetAbove'
});
assert.ok(defaultQuoteAlertName);
assert.ok(defaultQuoteAlertName.includes('汇率高于'));

const resolvedQuoteAlertName = sandbox.window.PathAlertsAppTestHooks.buildDefaultQuoteAlertNameForTarget(
  {
    type: 'quote',
    quoteId: 301,
    direction: 'forward',
    ruleKind: 'targetAbove',
    value: 1.0001
  },
  {
    id: 301,
    chain: 'avalanche',
    fromToken: '0x50b7545627a5162f82a992c33b87adc75187b218',
    toToken: '0x0555e30da8f98308edb960aa94c0db47230d2b9c',
    showInverse: true
  },
  [
    {
      quoteId: 301,
      direction: 'forward',
      fromSymbol: 'WBTC',
      toSymbol: 'cbBTC'
    },
    {
      quoteId: 301,
      direction: 'inverse',
      fromSymbol: 'cbBTC',
      toSymbol: 'WBTC'
    }
  ]
);
assert.strictEqual(resolvedQuoteAlertName, 'avax WBTC/cbBTC 汇率高于');
