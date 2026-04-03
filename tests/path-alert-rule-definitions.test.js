const assert = require('assert');

const { SPECIAL_ARB_RULES } = require('../path-alert-rule-definitions');

const specialRuleIds = ['special:wbtc-bybit', 'special:usde-bybit', 'special:usdtb-bybit'];

for (const ruleId of specialRuleIds) {
  const rule = SPECIAL_ARB_RULES.find((entry) => entry.id === ruleId);
  assert.ok(rule, `missing special rule: ${ruleId}`);
  assert.strictEqual(rule.alertConfirmDelaySec, 10, `${ruleId} should default to 10s confirm delay`);
}
