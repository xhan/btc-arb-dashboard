const assert = require('assert');

const {
  buildSpecialRuleAlertId,
  normalizeSpecialRuleAlertConfig,
  mergeSpecialRuleAlerts
} = require('../special-rule-alert-config-utils');

assert.strictEqual(buildSpecialRuleAlertId('special:usde-bybit'), 'rule-alert-special-usde-bybit');

assert.deepStrictEqual(
  normalizeSpecialRuleAlertConfig({ minNetProfit: 8, minNetProfitBp: 0.5 }),
  { minNetProfit: 8, minNetProfitBp: 0.5 }
);

assert.deepStrictEqual(
  normalizeSpecialRuleAlertConfig({}, { minNetProfit: 10, minNetProfitBp: 1.5 }),
  { minNetProfit: 10, minNetProfitBp: 1.5 }
);

const merged = mergeSpecialRuleAlerts(
  {
    version: 1,
    settings: { defaultCooldownSec: 180 },
    alerts: [
      {
        id: 'custom-usde',
        name: 'USDe custom',
        enabled: false,
        thresholdBp: 0,
        triggerMode: 'immediate',
        confirmDelaySec: 0,
        cooldownSec: 300,
        target: {
          type: 'rule',
          ruleKind: 'special',
          ruleId: 'special:usde-bybit'
        },
        specialRuleConfig: {
          minNetProfit: 9,
          minNetProfitBp: 0.8
        }
      }
    ],
    dismissedTargets: []
  },
  [
    {
      id: 'special:wbtc-bybit',
      title: 'WBTC <-> BYBIT',
      minNetProfit: 0.0001,
      minNetProfitBp: 1.5,
      alertConfirmDelaySec: 10,
      alertCooldownSec: 120
    },
    {
      id: 'special:usde-bybit',
      title: 'USDe <-> BYBIT',
      minNetProfit: 8,
      minNetProfitBp: 0.5,
      alertConfirmDelaySec: 10,
      alertCooldownSec: 120
    }
  ]
);

assert.strictEqual(merged.alerts.length, 2);

const existingUsde = merged.alerts.find((item) => item.target && item.target.ruleId === 'special:usde-bybit');
assert.ok(existingUsde);
assert.strictEqual(existingUsde.id, 'custom-usde');
assert.strictEqual(existingUsde.enabled, false);
assert.deepStrictEqual(existingUsde.specialRuleConfig, {
  minNetProfit: 9,
  minNetProfitBp: 0.8
});

const newWbtc = merged.alerts.find((item) => item.target && item.target.ruleId === 'special:wbtc-bybit');
assert.ok(newWbtc);
assert.strictEqual(newWbtc.id, 'rule-alert-special-wbtc-bybit');
assert.strictEqual(newWbtc.name, 'WBTC <-> BYBIT');
assert.strictEqual(newWbtc.triggerMode, 'delayed');
assert.strictEqual(newWbtc.confirmDelaySec, 10);
assert.strictEqual(newWbtc.cooldownSec, 120);
assert.deepStrictEqual(newWbtc.specialRuleConfig, {
  minNetProfit: 0.0001,
  minNetProfitBp: 1.5
});
