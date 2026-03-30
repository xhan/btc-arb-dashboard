const assert = require('assert');

const {
  advanceSpecialRuleAlertRuntime,
  pruneSpecialRuleAlertRuntimeState
} = require('../special-rule-alert-utils');

const alertOpportunity = {
  ruleId: 'special:wbtc-bybit',
  label: 'WBTC <-> BYBIT',
  alert: true,
  alert_message: 'hello',
  alert_confirm_delay_sec: 9,
  alert_cooldown_sec: 120,
  alert_key: 'special:wbtc-bybit'
};

let runtime = advanceSpecialRuleAlertRuntime(null, alertOpportunity, 1_000);
assert.strictEqual(runtime.shouldTrigger, false);
assert.strictEqual(runtime.state.eligibleSince, 1_000);

runtime = advanceSpecialRuleAlertRuntime(runtime.state, alertOpportunity, 5_000);
assert.strictEqual(runtime.shouldTrigger, false);
assert.strictEqual(runtime.state.eligibleSince, 1_000);

const runtimeMap = new Map([
  ['special:special:wbtc-bybit', { ...runtime.state }]
]);

pruneSpecialRuleAlertRuntimeState(runtimeMap, new Set(), 6_000, 30 * 60 * 1000);
assert.strictEqual(runtimeMap.get('special:special:wbtc-bybit').eligibleSince, null);

runtime = advanceSpecialRuleAlertRuntime(runtimeMap.get('special:special:wbtc-bybit'), alertOpportunity, 7_000);
assert.strictEqual(runtime.shouldTrigger, false);
assert.strictEqual(runtime.state.eligibleSince, 7_000);

runtime = advanceSpecialRuleAlertRuntime(runtime.state, alertOpportunity, 15_500);
assert.strictEqual(runtime.shouldTrigger, false);

runtime = advanceSpecialRuleAlertRuntime(runtime.state, alertOpportunity, 16_100);
assert.strictEqual(runtime.shouldTrigger, true);
assert.strictEqual(runtime.state.lastTriggeredAt, 16_100);

const cooldownPreservedMap = new Map([
  ['special:special:wbtc-bybit', { ...runtime.state }]
]);
pruneSpecialRuleAlertRuntimeState(cooldownPreservedMap, new Set(), 20_000, 30 * 60 * 1000);
assert.strictEqual(cooldownPreservedMap.get('special:special:wbtc-bybit').lastTriggeredAt, 16_100);
