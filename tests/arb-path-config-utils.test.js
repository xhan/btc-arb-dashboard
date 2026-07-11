const assert = require('assert');

const {
  applyFixedRuleWatchItemsToResults,
  applySpecialRuleWatchItemsToRules,
  filterWatchedQuoteAlerts,
  filterWatchedRuleAlerts,
  getFixedRuleWatchItems,
  getQuotePriceWatchItems,
  getSpecialRuleWatchItems,
  isWatchedQuoteTarget,
  isWatchedRuleTarget,
  normalizeFixedRuleWatchItem,
  normalizeQuotePriceWatchItem,
  normalizeSpecialRuleWatchItem,
  resolveItemsBySelectors,
  resolveQuotePriceValue
} = require('../src/arb/arb-path-config-utils');

const selectorItems = [
  { id: 11, name: 'WBTC监控' },
  { id: 12, name: 'LBTC监控' },
  { id: 13, name: 'TBTC监控' },
  { id: 14, name: '没太多流动性的BTC' },
  { id: 15, name: 'USD监控' }
];

assert.deepStrictEqual(
  resolveItemsBySelectors(selectorItems, [0, 2, '没太多流动性的BTC']).map((item) => item.name),
  ['WBTC监控', 'TBTC监控', '没太多流动性的BTC']
);
assert.deepStrictEqual(
  resolveItemsBySelectors(selectorItems, [12, 'USD监控']).map((item) => item.name),
  ['LBTC监控', 'USD监控']
);
assert.deepStrictEqual(resolveItemsBySelectors(selectorItems, [99, '不存在']), []);

const config = {
  watchItems: [
    { title: 'ETH USDT/USDe', type: 'quote-price', quoteId: '101', direction: 'forward' },
    { title: 'Inverse item', type: 'quote-price', quoteId: 102, direction: 'inverse' },
    { title: 'WBTC 关注', type: 'fixed-rule', ruleId: 'fixed:wbtc', displayMinProfitBp: '1.5' },
    { title: 'Bad fixed', type: 'fixed-rule' },
    { title: 'Bybit 关注', type: 'special-rule', ruleId: 'special:wbtc-bybit' },
    { title: 'Bad special', type: 'special-rule' },
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

assert.deepStrictEqual(getSpecialRuleWatchItems(config), [
  { title: 'Bybit 关注', type: 'special-rule', ruleId: 'special:wbtc-bybit' }
]);

assert.strictEqual(normalizeSpecialRuleWatchItem({ title: 'No rule', type: 'special-rule' }), null);
assert.deepStrictEqual(
  normalizeSpecialRuleWatchItem({ type: 'special-rule', ruleId: 'special:usde-bybit' }),
  { title: '', type: 'special-rule', ruleId: 'special:usde-bybit' }
);

const originalSpecialRules = [
  { id: 'special:a', title: 'A' },
  { id: 'special:b', title: 'B' },
  { id: 'special:c', title: 'C' }
];
assert.deepStrictEqual(
  applySpecialRuleWatchItemsToRules(originalSpecialRules, [
    { title: 'B 关注', type: 'special-rule', ruleId: 'special:b' },
    { title: '', type: 'special-rule', ruleId: 'special:a' },
    { title: 'missing', type: 'special-rule', ruleId: 'special:missing' }
  ]),
  [
    { id: 'special:b', title: 'B' },
    { id: 'special:a', title: 'A' }
  ]
);
assert.strictEqual(applySpecialRuleWatchItemsToRules(originalSpecialRules, []), originalSpecialRules);

assert.strictEqual(isWatchedRuleTarget(config, {
  type: 'rule',
  ruleKind: 'fixed',
  ruleId: 'fixed:wbtc'
}), true);
assert.strictEqual(isWatchedRuleTarget(config, {
  type: 'rule',
  ruleKind: 'special',
  ruleId: 'special:wbtc-bybit'
}), true);
assert.strictEqual(isWatchedRuleTarget(config, {
  type: 'rule',
  ruleKind: 'fixed',
  ruleId: 'fixed:missing'
}), false);
assert.strictEqual(isWatchedRuleTarget(config, {
  type: 'rule',
  ruleKind: 'special',
  ruleId: 'special:missing'
}), false);

const watchedRuleAlert = {
  id: 'watched-fixed',
  target: { type: 'rule', ruleKind: 'fixed', ruleId: 'fixed:wbtc' }
};
const unwatchedRuleAlert = {
  id: 'unwatched-fixed',
  target: { type: 'rule', ruleKind: 'fixed', ruleId: 'fixed:missing' }
};
const customPathAlert = {
  id: 'custom-path',
  target: { type: 'path', legs: [] }
};
assert.deepStrictEqual(
  filterWatchedRuleAlerts([watchedRuleAlert, unwatchedRuleAlert, customPathAlert], config),
  [watchedRuleAlert, customPathAlert]
);

assert.strictEqual(isWatchedQuoteTarget(config, {
  type: 'quote',
  quoteId: 101,
  direction: 'forward'
}), true);
assert.strictEqual(isWatchedQuoteTarget(config, {
  type: 'quote',
  quoteId: 101,
  direction: 'inverse'
}), false);
assert.strictEqual(isWatchedQuoteTarget(config, {
  type: 'quote',
  quoteId: 102,
  direction: 'inverse'
}), true);

const watchedQuoteAlert = {
  id: 'watched-quote',
  target: { type: 'quote', quoteId: 101, direction: 'forward' }
};
const unwatchedQuoteAlert = {
  id: 'unwatched-quote',
  target: { type: 'quote', quoteId: 101, direction: 'inverse' }
};
assert.deepStrictEqual(
  filterWatchedQuoteAlerts([watchedQuoteAlert, unwatchedQuoteAlert, customPathAlert], config),
  [watchedQuoteAlert, customPathAlert]
);

assert.strictEqual(normalizeQuotePriceWatchItem({ title: 'No type', quoteId: 1 }), null);
assert.strictEqual(resolveQuotePriceValue({ direction: 'forward' }, { lastRawPrice: 1.23, inverseRawPrice: 0.81 }), 1.23);
assert.strictEqual(resolveQuotePriceValue({ direction: 'inverse' }, { lastRawPrice: 1.23, inverseRawPrice: 0.81 }), 0.81);
assert.strictEqual(resolveQuotePriceValue({ direction: 'forward' }, { lastRawPrice: 'x' }), null);
