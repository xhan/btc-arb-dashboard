const assert = require('assert');

const fs = require('fs');
const path = require('path');

const { FIXED_PATH_RULES, SPECIAL_ARB_RULES } = require('../path-alert-rule-definitions');

const specialRuleIds = ['special:wbtc-bybit', 'special:usde-bybit', 'special:usdtb-bybit'];
const fixedRule = FIXED_PATH_RULES.find((entry) => entry.id === 'fixed:usde-usdt');

assert.ok(fixedRule, 'missing fixed rule: fixed:usde-usdt');
assert.strictEqual(fixedRule.title, 'USDE - USDT');
assert.deepStrictEqual(fixedRule.categoryNames, ['USD监控']);
assert.strictEqual(fixedRule.base, 'USDe');
assert.strictEqual(fixedRule.quote, 'USDT');
assert.strictEqual(fixedRule.resultLimit, 1);
assert.deepStrictEqual(fixedRule.excludeChains, ['Bybit', 'Binance']);

for (const ruleId of specialRuleIds) {
  const rule = SPECIAL_ARB_RULES.find((entry) => entry.id === ruleId);
  assert.ok(rule, `missing special rule: ${ruleId}`);
  assert.strictEqual(typeof rule.displayTargets !== 'undefined', true, `${ruleId} should keep displayTargets`);
}

const alertConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'alert.json'), 'utf8'));
const usdeUsdAlert = alertConfig.alerts.find((entry) => entry && entry.target && entry.target.ruleId === 'fixed:usde-usdt');

assert.ok(usdeUsdAlert, 'missing alert for fixed:usde-usdt');
assert.strictEqual(usdeUsdAlert.enabled, true);
assert.strictEqual(usdeUsdAlert.thresholdBp, 1);
