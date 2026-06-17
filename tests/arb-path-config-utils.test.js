const assert = require('assert');

const {
  applyFixedRuleWatchItemsToResults,
  getFixedRuleWatchItems,
  getQuotePriceWatchItems,
  normalizeFixedRuleWatchItem,
  normalizeQuotePriceWatchItem,
  resolveQuotePriceValue
} = require('../src/arb/arb-path-config-utils');

const config = {
  watchItems: [
    { title: 'ETH USDT/USDe', type: 'quote-price', quoteId: '101', direction: 'forward' },
    { title: 'Inverse item', type: 'quote-price', quoteId: 102, direction: 'inverse' },
    { title: 'WBTC 关注', type: 'fixed-rule', ruleId: 'fixed:wbtc', displayMinProfitBp: '1.5' },
    { title: 'Bad fixed', type: 'fixed-rule' },
    { title: '', type: 'quote-price', quoteId: 104 },
    { title: 'Bad id', type: 'quote-price', quoteId: 'x' }
  ]
};

assert.deepStrictEqual(getQuotePriceWatchItems(config), [
  { title: 'ETH USDT/USDe', type: 'quote-price', quoteId: 101, direction: 'forward' },
  { title: 'Inverse item', type: 'quote-price', quoteId: 102, direction: 'inverse' }
]);

assert.deepStrictEqual(
  getQuotePriceWatchItems(config, {
    alertConfig: {
      alerts: [
        {
          id: 'alert-forward',
          name: 'Forward alert',
          enabled: true,
          triggerMode: 'delayed',
          confirmDelaySec: 13,
          cooldownSec: 180,
          target: {
            type: 'quote',
            quoteId: 101,
            direction: 'forward',
            ruleKind: 'targetAbove',
            value: 1.0008
          }
        },
        {
          id: 'alert-inverse-wrong-direction',
          enabled: true,
          target: {
            type: 'quote',
            quoteId: 101,
            direction: 'inverse',
            ruleKind: 'targetBelow',
            value: 0.999
          }
        },
        {
          id: 'alert-only-item',
          enabled: true,
          target: {
            type: 'quote',
            quoteId: 999,
            direction: 'forward',
            ruleKind: 'targetAbove',
            value: 2
          }
        }
      ]
    }
  }),
  [
    {
      title: 'ETH USDT/USDe',
      type: 'quote-price',
      quoteId: 101,
      direction: 'forward',
      alert: {
        id: 'alert-forward',
        name: 'Forward alert',
        enabled: true,
        triggerMode: 'delayed',
        confirmDelaySec: 13,
        cooldownSec: 180,
        ruleKind: 'targetAbove',
        value: 1.0008
      }
    },
    { title: 'Inverse item', type: 'quote-price', quoteId: 102, direction: 'inverse' }
  ]
);

assert.deepStrictEqual(getFixedRuleWatchItems(config), [
  { title: 'WBTC 关注', type: 'fixed-rule', ruleId: 'fixed:wbtc', displayMinProfitBp: 1.5 }
]);

assert.strictEqual(normalizeFixedRuleWatchItem({ title: 'No rule', type: 'fixed-rule' }), null);
assert.deepStrictEqual(
  normalizeFixedRuleWatchItem({ type: 'fixed-rule', ruleId: 'fixed:usde-usdt' }),
  { title: '', type: 'fixed-rule', ruleId: 'fixed:usde-usdt' }
);

assert.deepStrictEqual(
  applyFixedRuleWatchItemsToResults(
    [
      { rule: { id: 'fixed:a', title: 'A' }, cycles: ['a'] },
      { rule: { id: 'fixed:b', title: 'B' }, cycles: ['b'] },
      { rule: { id: 'fixed:c', title: 'C' }, cycles: ['c'] }
    ],
    [
      { title: 'B 自定义', type: 'fixed-rule', ruleId: 'fixed:b', displayMinProfitBp: 2 },
      { title: '', type: 'fixed-rule', ruleId: 'fixed:a' },
      { title: 'missing', type: 'fixed-rule', ruleId: 'fixed:missing' }
    ]
  ),
  [
    { rule: { id: 'fixed:b', title: 'B 自定义', displayMinProfitBp: 2 }, cycles: ['b'] },
    { rule: { id: 'fixed:a', title: 'A' }, cycles: ['a'] }
  ]
);

const originalFixedResults = [
  { rule: { id: 'fixed:a', title: 'A' }, cycles: [] }
];
assert.strictEqual(applyFixedRuleWatchItemsToResults(originalFixedResults, []), originalFixedResults);

assert.strictEqual(normalizeQuotePriceWatchItem({ title: 'No type', quoteId: 1 }), null);
assert.strictEqual(resolveQuotePriceValue({ direction: 'forward' }, { lastRawPrice: 1.23, inverseRawPrice: 0.81 }), 1.23);
assert.strictEqual(resolveQuotePriceValue({ direction: 'inverse' }, { lastRawPrice: 1.23, inverseRawPrice: 0.81 }), 0.81);
assert.strictEqual(resolveQuotePriceValue({ direction: 'forward' }, { lastRawPrice: 'x' }), null);
