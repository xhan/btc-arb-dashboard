const assert = require('assert');

const config = require('../src/arb/arb-path-config');
const { FIXED_PATH_RULES, SPECIAL_ARB_RULES } = require('../src/path-alerts/path-alert-rule-definitions');

assert.deepStrictEqual(Object.keys(config), ['watchItems']);
assert.ok(Array.isArray(config.watchItems));
assert.ok(config.watchItems.length > 0);

const fixedWatchItems = config.watchItems.filter((item) => item.type === 'fixed-rule');
const specialWatchItems = config.watchItems.filter((item) => item.type === 'special-rule');
const quoteWatchItems = config.watchItems.filter((item) => item.type === 'quote-price');
assert.deepStrictEqual(fixedWatchItems.map((item) => item.ruleId), FIXED_PATH_RULES.map((rule) => rule.id));
assert.strictEqual(fixedWatchItems.find((item) => item.ruleId === 'fixed:wbtc-eth-arb').title, 'WBTC eth <-> arb');
assert.deepStrictEqual(specialWatchItems.map((item) => item.ruleId), SPECIAL_ARB_RULES.map((rule) => rule.id));
assert.ok(quoteWatchItems.length > 0);

for (const item of quoteWatchItems) {
  assert.strictEqual(typeof item.title, 'string');
  assert.ok(item.title.trim());
  assert.strictEqual(Number.isFinite(Number(item.quoteId)), true);
  assert.ok(item.direction === 'forward' || item.direction === 'inverse');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(item, 'alert'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(item, 'target'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(item, 'display'), false);
}

for (const item of fixedWatchItems) {
  assert.strictEqual(typeof item.title, 'string');
  assert.ok(item.title.trim());
  assert.strictEqual(typeof item.ruleId, 'string');
  assert.ok(item.ruleId.trim());
  assert.strictEqual(Object.prototype.hasOwnProperty.call(item, 'alert'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(item, 'target'), false);
}

for (const item of specialWatchItems) {
  assert.strictEqual(typeof item.title, 'string');
  assert.ok(item.title.trim());
  assert.strictEqual(typeof item.ruleId, 'string');
  assert.ok(item.ruleId.trim());
  assert.strictEqual(Object.prototype.hasOwnProperty.call(item, 'alert'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(item, 'target'), false);
}

assert.strictEqual(typeof config.getWatchItems, 'undefined');
assert.strictEqual(typeof config.normalizeWatchItem, 'undefined');
