const assert = require('assert');

const {
  buildQuoteAlertId,
  isQuoteAlertId,
  buildQuoteAlertsFromLegacyConfig,
  buildLegacyQuoteAlertFields
} = require('../quote-alert-config-utils');

assert.strictEqual(buildQuoteAlertId(101, 'targetAbove'), 'quote-alert-101-forward-target-above');
assert.strictEqual(buildQuoteAlertId(101, 'targetAbove', 'inverse'), 'quote-alert-101-inverse-target-above');
assert.strictEqual(buildQuoteAlertId(101, 'percentUp'), 'quote-alert-101-forward-percent-up');
assert.strictEqual(isQuoteAlertId('quote-alert-101-inverse-target-above'), true);
assert.strictEqual(isQuoteAlertId('quote-alert-101-forward-target-above'), true);
assert.strictEqual(isQuoteAlertId('path-alert-1'), false);

const alerts = buildQuoteAlertsFromLegacyConfig({
  quoteId: 101,
  quoteLabel: 'BSC BTCB/syBTC',
  triggerMode: 'delayed',
  confirmDelaySec: 13,
  cooldownSec: 180,
  oldAlerts: {
    percentUp: 0.1,
    targetAbove: 0.100113,
    basePrice: 0.1
  }
});

assert.strictEqual(alerts.length, 2);
assert.deepStrictEqual(
  alerts.map((item) => item.id).sort(),
  ['quote-alert-101-forward-percent-up', 'quote-alert-101-forward-target-above']
);

const percentUpAlert = alerts.find((item) => item.id === 'quote-alert-101-forward-percent-up');
assert.strictEqual(percentUpAlert.target.type, 'quote');
assert.strictEqual(percentUpAlert.target.direction, 'forward');
assert.strictEqual(percentUpAlert.target.ruleKind, 'percentUp');
assert.strictEqual(percentUpAlert.target.value, 0.1);
assert.strictEqual(percentUpAlert.target.basePrice, 0.1);
assert.strictEqual(percentUpAlert.triggerMode, 'delayed');
assert.strictEqual(percentUpAlert.confirmDelaySec, 13);
assert.strictEqual(percentUpAlert.cooldownSec, 180);

const targetAboveAlert = alerts.find((item) => item.id === 'quote-alert-101-forward-target-above');
assert.strictEqual(targetAboveAlert.target.direction, 'forward');
assert.strictEqual(targetAboveAlert.target.ruleKind, 'targetAbove');
assert.strictEqual(targetAboveAlert.target.value, 0.100113);

assert.deepStrictEqual(
  buildLegacyQuoteAlertFields([
    {
      id: 'quote-alert-101-forward-percent-up',
      target: { type: 'quote', quoteId: 101, direction: 'forward', ruleKind: 'percentUp', value: 0.1, basePrice: 0.1 }
    },
    {
      id: 'quote-alert-101-forward-percent-down',
      target: { type: 'quote', quoteId: 101, direction: 'forward', ruleKind: 'percentDown', value: 0.2, basePrice: 0.1 }
    },
    {
      id: 'quote-alert-101-forward-target-above',
      target: { type: 'quote', quoteId: 101, direction: 'forward', ruleKind: 'targetAbove', value: 0.100113 }
    },
    {
      id: 'quote-alert-101-forward-target-below',
      target: { type: 'quote', quoteId: 101, direction: 'forward', ruleKind: 'targetBelow', value: 0.0999 }
    },
    {
      id: 'quote-alert-101-inverse-target-above',
      target: { type: 'quote', quoteId: 101, direction: 'inverse', ruleKind: 'targetAbove', value: 0.998 }
    }
  ]),
  {
    forward: {
      percentUp: 0.1,
      percentDown: 0.2,
      targetAbove: 0.100113,
      targetBelow: 0.0999,
      basePrice: 0.1
    },
    inverse: {
      targetAbove: 0.998
    }
  }
);
