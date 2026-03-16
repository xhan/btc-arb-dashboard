const assert = require('assert');

const { buildSpecialArbOpportunities } = require('../arb-special-utils');

const rules = [
  {
    id: 'special:wbtc-bybit',
    title: 'WBTC <-> BYBIT',
    type: 'wbtc-bybit',
    dexBase: 'cbBTC',
    dexQuote: 'WBTC',
    cexQuote: 'BTC',
    cexChain: 'Bybit',
    withdrawFee: 0.0001,
    minNetProfit: 0.0001,
    alertConfirmDelaySec: 13,
    maxBookLevels: 10
  }
];

const categoryQuotes = [
  { id: 1, chain: 'ethereum', showInverse: true },
  { id: 2, chain: 'ethereum', showInverse: false },
  { id: 3, chain: 'Bybit', showInverse: true },
  { id: 4, chain: 'Binance', showInverse: true }
];

const quoteStateById = new Map([
  [1, { fromSymbol: 'xBTC', toSymbol: 'WBTC', lastRawPrice: 1.002, inverseRawPrice: 0.998 }],
  [2, { fromSymbol: 'WBTC', toSymbol: 'cbBTC', lastRawPrice: 1.0011, inverseRawPrice: 0.9989 }],
  [3, {
    fromSymbol: 'WBTC',
    toSymbol: 'BTC',
    cexOrderbook: {
      bestBidPrice: 0.9982,
      bestBidSize: 0.5,
      bestAskPrice: 0.9998,
      bestAskSize: 0.5,
      bidsTopDepth: [
        { price: 0.9982, size: 0.5 },
        { price: 0.9981, size: 2.0 },
        { price: 0.9980, size: 0.1 }
      ],
      asksTopDepth: [
        { price: 0.9998, size: 0.5 },
        { price: 0.9999, size: 1.0 },
        { price: 1.0002, size: 0.8 }
      ]
    }
  }],
  [4, {
    fromSymbol: 'WBTC',
    toSymbol: 'BTC',
    cexOrderbook: {
      bestBidPrice: 0.5,
      bestBidSize: 9,
      bestAskPrice: 2,
      bestAskSize: 9,
      bidsTopDepth: [{ price: 0.5, size: 9 }],
      asksTopDepth: [{ price: 2, size: 9 }]
    }
  }]
]);

const opportunities = buildSpecialArbOpportunities({
  rules,
  quotes: categoryQuotes,
  quoteStateById,
  aliasRules: { xBTC: 'cbBTC' }
});

assert.strictEqual(opportunities.length, 1);

const opportunity = opportunities[0];
assert.strictEqual(opportunity.ruleId, 'special:wbtc-bybit');
assert.strictEqual(opportunity.label, 'WBTC <-> BYBIT');
assert.strictEqual(opportunity.direction, 'bybit-ask-to-eth');
assert.strictEqual(opportunity.alert, true);
assert.strictEqual(opportunity.alert_confirm_delay_sec, 13);
assert.strictEqual(opportunity.alert_cooldown_sec, 120);
assert.ok(opportunity.display_message.includes('（Bybit）BTC -> WBTC'));
assert.ok(opportunity.display_message.includes('（ETH）WBTC -> cbBTC'));
assert.ok(opportunity.display_message.includes('净收益:'));
assert.ok(!opportunity.display_message.includes('另一方向:'));
assert.ok(opportunity.alert_message.includes('📥 (Bybit) BUY'));
assert.ok(opportunity.alert_message.includes('扣除 提现手续费 0.0001 后'));
assert.ok(opportunity.alert_message.includes('CUM:'));
assert.ok(opportunity.alert_message.includes('另一方向:'));

assert.strictEqual(opportunity.cycle.legs.length, 2);
assert.strictEqual(opportunity.cycle.legs[0].from, 'BTC');
assert.strictEqual(opportunity.cycle.legs[0].to, 'WBTC');
assert.strictEqual(opportunity.cycle.legs[0].cexLevelLabel, 'ask');
assert.strictEqual(opportunity.cycle.legs[1].from, 'WBTC');
assert.strictEqual(opportunity.cycle.legs[1].to, 'cbBTC');
assert.ok(opportunity.cycle.profitRate > 0);

assert.strictEqual(opportunity.stats.primary.direction, 'bybit-ask-to-eth');
assert.ok(opportunity.stats.primary.netProfit > opportunity.stats.secondary.netProfit);
assert.strictEqual(opportunity.stats.secondary.direction, 'eth-to-bybit-bid');
assert.strictEqual(opportunity.stats.secondary.usedLevels.length, 2);
