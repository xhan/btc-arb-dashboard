const assert = require('assert');

const {
  getQuotePriceWatchItems,
  normalizeQuotePriceWatchItem,
  resolveQuotePriceValue
} = require('../arb-path-config-utils');

const config = {
  watchItems: [
    { title: 'ETH USDT/USDe', type: 'quote-price', quoteId: '101', direction: 'forward' },
    { title: 'Inverse item', type: 'quote-price', quoteId: 102, direction: 'inverse' },
    { title: 'Ignored fixed', type: 'fixed-rule', quoteId: 103 },
    { title: '', type: 'quote-price', quoteId: 104 },
    { title: 'Bad id', type: 'quote-price', quoteId: 'x' }
  ]
};

assert.deepStrictEqual(getQuotePriceWatchItems(config), [
  { title: 'ETH USDT/USDe', type: 'quote-price', quoteId: 101, direction: 'forward' },
  { title: 'Inverse item', type: 'quote-price', quoteId: 102, direction: 'inverse' }
]);

assert.strictEqual(normalizeQuotePriceWatchItem({ title: 'No type', quoteId: 1 }), null);
assert.strictEqual(resolveQuotePriceValue({ direction: 'forward' }, { lastRawPrice: 1.23, inverseRawPrice: 0.81 }), 1.23);
assert.strictEqual(resolveQuotePriceValue({ direction: 'inverse' }, { lastRawPrice: 1.23, inverseRawPrice: 0.81 }), 0.81);
assert.strictEqual(resolveQuotePriceValue({ direction: 'forward' }, { lastRawPrice: 'x' }), null);
