const assert = require('assert');

const {
  buildDataTerminalRecordsCacheKey,
  hasActivePathAlertEvaluationTarget,
  isPanelVisible
} = require('../dashboard-runtime-utils');

assert.strictEqual(isPanelVisible(null), false);
assert.strictEqual(isPanelVisible({}), true);
assert.strictEqual(
  isPanelVisible({}, () => ({ display: 'none' })),
  false
);
assert.strictEqual(
  isPanelVisible({}, () => ({ display: 'flex' })),
  true
);
assert.strictEqual(
  isPanelVisible({}, () => {
    throw new Error('style unavailable');
  }),
  true
);

assert.strictEqual(hasActivePathAlertEvaluationTarget(null), false);
assert.strictEqual(
  hasActivePathAlertEvaluationTarget({
    alerts: [
      { id: 'quote-1', enabled: true, target: { type: 'quote', quoteId: 1 } },
      { id: 'disabled-path', enabled: false, target: { type: 'path', legs: [] } }
    ]
  }),
  false
);
assert.strictEqual(
  hasActivePathAlertEvaluationTarget({
    alerts: [
      { id: 'path-1', enabled: true, target: { type: 'path', legs: [{ quoteId: 1 }] } }
    ]
  }),
  true
);
assert.strictEqual(
  hasActivePathAlertEvaluationTarget({
    alerts: [
      { id: 'rule-1', target: { type: 'rule', ruleKind: 'fixed', ruleId: 'fixed:wbtc-eth-arb' } }
    ]
  }),
  true
);

const dashboard = [
  {
    id: 10,
    name: 'WBTC监控',
    quotes: [
      {
        id: 101,
        chain: 'ethereum',
        toChain: '',
        fromToken: '0xaaa',
        toToken: '0xbbb',
        symbol: '',
        amount: 1,
        showInverse: true,
        paused: false
      }
    ]
  }
];

const firstKey = buildDataTerminalRecordsCacheKey(dashboard, 1);
assert.strictEqual(firstKey, buildDataTerminalRecordsCacheKey(dashboard, 1));
assert.notStrictEqual(firstKey, buildDataTerminalRecordsCacheKey(dashboard, 2));

const pausedDashboard = JSON.parse(JSON.stringify(dashboard));
pausedDashboard[0].quotes[0].paused = true;
assert.notStrictEqual(firstKey, buildDataTerminalRecordsCacheKey(pausedDashboard, 1));

const retokenizedDashboard = JSON.parse(JSON.stringify(dashboard));
retokenizedDashboard[0].quotes[0].toToken = '0xccc';
assert.notStrictEqual(firstKey, buildDataTerminalRecordsCacheKey(retokenizedDashboard, 1));
