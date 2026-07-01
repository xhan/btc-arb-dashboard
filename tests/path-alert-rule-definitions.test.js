const assert = require('assert');

const path = require('path');

const { readJsonFileSync } = require('../src/server/json-file-utils');
const { DEFAULT_FIXED_PATH_DISPLAY_MIN_PROFIT_BP, FIXED_PATH_RULES, SPECIAL_ARB_RULES } = require('../src/path-alerts/path-alert-rule-definitions');

const specialRuleIds = ['special:wbtc-bybit', 'special:usde-bybit', 'special:usdtb-bybit'];
const wbtcEthArbRule = FIXED_PATH_RULES.find((entry) => entry.id === 'fixed:wbtc-eth-arb');
const fixedGhoUsdtRule = FIXED_PATH_RULES.find((entry) => entry.id === 'fixed:gho-usdt');
const fixedPyusdRule = FIXED_PATH_RULES.find((entry) => entry.id === 'fixed:pyusd-usdc');
const fixedRule = FIXED_PATH_RULES.find((entry) => entry.id === 'fixed:usde-usdt');
const fixedSusdeRule = FIXED_PATH_RULES.find((entry) => entry.id === 'fixed:susde-usdt');
const fixedSusdaiRule = FIXED_PATH_RULES.find((entry) => entry.id === 'fixed:susdai-usdt');
const fixedDaiRule = FIXED_PATH_RULES.find((entry) => entry.id === 'fixed:dai-usdt');

assert.ok(wbtcEthArbRule, 'missing fixed rule: fixed:wbtc-eth-arb');
assert.strictEqual(wbtcEthArbRule.title, 'WBTC eth <-> arb');
assert.ok(fixedGhoUsdtRule, 'missing fixed rule: fixed:gho-usdt');
assert.strictEqual(fixedGhoUsdtRule.title, 'GHO - USDT');
assert.deepStrictEqual(fixedGhoUsdtRule.categoryNames, ['USD监控']);
assert.strictEqual(fixedGhoUsdtRule.base, 'GHO');
assert.strictEqual(fixedGhoUsdtRule.quote, 'USDT');
assert.strictEqual(fixedGhoUsdtRule.resultLimit, 2);
assert.ok(fixedPyusdRule, 'missing fixed rule: fixed:pyusd-usdc');
assert.strictEqual(fixedPyusdRule.title, 'PYUSD - USDC');
assert.deepStrictEqual(fixedPyusdRule.categoryNames, ['USD监控']);
assert.strictEqual(fixedPyusdRule.base, 'PYUSD');
assert.strictEqual(fixedPyusdRule.quote, 'USDC');
assert.strictEqual(fixedPyusdRule.resultLimit, 2);
assert.ok(fixedRule, 'missing fixed rule: fixed:usde-usdt');
assert.strictEqual(DEFAULT_FIXED_PATH_DISPLAY_MIN_PROFIT_BP, 0.5);
assert.strictEqual(fixedRule.title, 'USDE - USDT');
assert.deepStrictEqual(fixedRule.categoryNames, ['USD监控']);
assert.strictEqual(fixedRule.base, 'USDe');
assert.strictEqual(fixedRule.quote, 'USDT');
assert.strictEqual(fixedRule.resultLimit, 3);
assert.deepStrictEqual(fixedRule.excludeChains, ['Bybit', 'Binance']);

assert.ok(fixedSusdeRule, 'missing fixed rule: fixed:susde-usdt');
assert.strictEqual(fixedSusdeRule.title, 'sUSDE - USDT');
assert.deepStrictEqual(fixedSusdeRule.categoryNames, ['USD监控']);
assert.strictEqual(fixedSusdeRule.base, 'sUSDe');
assert.strictEqual(fixedSusdeRule.quote, 'USDT');
assert.deepStrictEqual(fixedSusdeRule.chains, ['ethereum', 'plasma']);
assert.strictEqual(fixedSusdeRule.resultLimit, 2);
assert.ok(fixedSusdaiRule, 'missing fixed rule: fixed:susdai-usdt');
assert.strictEqual(fixedSusdaiRule.title, 'sUSDai - USDT');
assert.deepStrictEqual(fixedSusdaiRule.categoryNames, ['USD监控']);
assert.strictEqual(fixedSusdaiRule.base, 'sUSDai');
assert.strictEqual(fixedSusdaiRule.quote, 'USDT');
assert.strictEqual(fixedSusdaiRule.resultLimit, 2);
assert.ok(fixedDaiRule, 'missing fixed rule: fixed:dai-usdt');
assert.strictEqual(fixedDaiRule.title, 'DAI - USDT');
assert.deepStrictEqual(fixedDaiRule.categoryNames, ['USD监控']);
assert.strictEqual(fixedDaiRule.base, 'DAI');
assert.strictEqual(fixedDaiRule.quote, 'USDT');
assert.strictEqual(fixedDaiRule.resultLimit, 2);

for (const ruleId of specialRuleIds) {
  const rule = SPECIAL_ARB_RULES.find((entry) => entry.id === ruleId);
  assert.ok(rule, `missing special rule: ${ruleId}`);
  assert.strictEqual(typeof rule.displayTargets !== 'undefined', true, `${ruleId} should keep displayTargets`);
}

const alertConfig = readJsonFileSync(path.join(__dirname, '..', 'config', 'alert.js'));
const ghoUsdtAlert = alertConfig.alerts.find((entry) => entry && entry.target && entry.target.ruleId === 'fixed:gho-usdt');
const pyusdUsdcAlert = alertConfig.alerts.find((entry) => entry && entry.target && entry.target.ruleId === 'fixed:pyusd-usdc');
const usdeUsdAlert = alertConfig.alerts.find((entry) => entry && entry.target && entry.target.ruleId === 'fixed:usde-usdt');
const susdeUsdAlert = alertConfig.alerts.find((entry) => entry && entry.target && entry.target.ruleId === 'fixed:susde-usdt');
const susdaiUsdtAlert = alertConfig.alerts.find((entry) => entry && entry.target && entry.target.ruleId === 'fixed:susdai-usdt');
const daiUsdtAlert = alertConfig.alerts.find((entry) => entry && entry.target && entry.target.ruleId === 'fixed:dai-usdt');

assert.ok(ghoUsdtAlert, 'missing alert for fixed:gho-usdt');
assert.strictEqual(ghoUsdtAlert.enabled, true);
assert.strictEqual(ghoUsdtAlert.thresholdBp, 1);
assert.ok(pyusdUsdcAlert, 'missing alert for fixed:pyusd-usdc');
assert.strictEqual(pyusdUsdcAlert.enabled, true);
assert.strictEqual(pyusdUsdcAlert.thresholdBp, 1);
assert.ok(usdeUsdAlert, 'missing alert for fixed:usde-usdt');
assert.strictEqual(usdeUsdAlert.enabled, true);
assert.strictEqual(usdeUsdAlert.thresholdBp, 1);
assert.ok(susdeUsdAlert, 'missing alert for fixed:susde-usdt');
assert.strictEqual(susdeUsdAlert.enabled, true);
assert.strictEqual(susdeUsdAlert.thresholdBp, 1);
assert.ok(susdaiUsdtAlert, 'missing alert for fixed:susdai-usdt');
assert.strictEqual(susdaiUsdtAlert.enabled, true);
assert.strictEqual(susdaiUsdtAlert.thresholdBp, 1);
assert.ok(daiUsdtAlert, 'missing alert for fixed:dai-usdt');
assert.strictEqual(daiUsdtAlert.enabled, true);
assert.strictEqual(daiUsdtAlert.thresholdBp, 1);
