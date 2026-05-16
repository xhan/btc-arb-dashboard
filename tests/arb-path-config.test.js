const assert = require('assert');

const config = require('../src/arb/arb-path-config');

assert.deepStrictEqual(Object.keys(config), ['watchItems']);
assert.ok(Array.isArray(config.watchItems));
assert.ok(config.watchItems.length > 0);

for (const item of config.watchItems) {
  assert.strictEqual(item.type, 'quote-price');
  assert.strictEqual(typeof item.title, 'string');
  assert.ok(item.title.trim());
  assert.strictEqual(Number.isFinite(Number(item.quoteId)), true);
  assert.ok(item.direction === 'forward' || item.direction === 'inverse');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(item, 'alert'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(item, 'target'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(item, 'display'), false);
}

assert.strictEqual(typeof config.getWatchItems, 'undefined');
assert.strictEqual(typeof config.normalizeWatchItem, 'undefined');
