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
    minNetProfitBp: 1.5,
    displayTargets: [1, 2, 3],
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
assert.strictEqual(opportunity.alert_key, 'special:wbtc-bybit');
assert.ok(opportunity.display_message.includes('（ETH）WBTC -> cbBTC'));
assert.ok(opportunity.display_message.includes('（Bybit）BTC -> WBTC @0.9998 ask1'));
assert.ok(opportunity.display_message.includes('1 BTC: 0.00125019 BTC / 12.5 bp'));
assert.ok(opportunity.display_message.includes('2 BTC: 0.00230016 BTC / 11.5 bp'));
assert.ok(!opportunity.display_message.includes('正收益档位:'));
assert.ok(!opportunity.display_message.includes('3 BTC:'));
assert.ok(opportunity.display_message.includes('深度: 1)'));
assert.ok(opportunity.display_message.includes('bp)'));
assert.ok(opportunity.alert_message.includes('（ETH）WBTC -> cbBTC'));
assert.ok(opportunity.alert_message.includes('（Bybit）BTC -> WBTC @0.9998 ask1'));
assert.ok(opportunity.alert_message.includes('\n\n1) 0.5 @0.9998 (+13 bp)'));
assert.ok(opportunity.alert_message.includes('\n\n1 : 0.00125019'));
assert.ok(opportunity.alert_message.includes('\n2 : 0.00230016'));
assert.ok(!opportunity.alert_message.includes('\n3 :'));
assert.ok(opportunity.alert_message.includes('最大正收益量:'));
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

const bidDominantQuoteStateById = new Map(quoteStateById);
bidDominantQuoteStateById.set(2, {
  fromSymbol: 'WBTC',
  toSymbol: 'cbBTC',
  lastRawPrice: 0.997,
  inverseRawPrice: 1.003
});
const bidDominant = buildSpecialArbOpportunities({
  rules,
  quotes: categoryQuotes,
  quoteStateById: bidDominantQuoteStateById,
  aliasRules: { xBTC: 'cbBTC' }
});
assert.strictEqual(bidDominant.length, 1);
assert.strictEqual(bidDominant[0].direction, 'eth-to-bybit-bid');
assert.strictEqual(bidDominant[0].alert_key, 'special:wbtc-bybit');

const lowBpRules = [
  {
    ...rules[0],
    id: 'special:wbtc-bybit-low-bp'
  }
];
const lowBpQuotes = [
  { id: 11, chain: 'ethereum', showInverse: false },
  { id: 12, chain: 'ethereum', showInverse: false },
  { id: 13, chain: 'Bybit', showInverse: true }
];
const lowBpQuoteStateById = new Map([
  [11, { fromSymbol: 'cbBTC', toSymbol: 'WBTC', lastRawPrice: 1.0002, inverseRawPrice: 0.9998 }],
  [12, { fromSymbol: 'WBTC', toSymbol: 'cbBTC', lastRawPrice: 0.999, inverseRawPrice: 1.001001001 }],
  [13, {
    fromSymbol: 'WBTC',
    toSymbol: 'BTC',
    cexOrderbook: {
      bestBidPrice: 0.9999,
      bestBidSize: 3,
      bestAskPrice: 1.001,
      bestAskSize: 3,
      bidsTopDepth: [{ price: 0.9999, size: 3 }],
      asksTopDepth: [{ price: 1.001, size: 3 }]
    }
  }]
]);
const lowBpOpportunities = buildSpecialArbOpportunities({
  rules: lowBpRules,
  quotes: lowBpQuotes,
  quoteStateById: lowBpQuoteStateById,
  aliasRules: null
});
assert.strictEqual(lowBpOpportunities.length, 1);
assert.ok(lowBpOpportunities[0].stats.primary.netProfit > 0.0001);
assert.ok(lowBpOpportunities[0].stats.primary.netProfitBp < 1.5);
assert.strictEqual(lowBpOpportunities[0].alert, false);

const usdeRules = [
  {
    id: 'special:usde-bybit',
    title: 'USDe <-> BYBIT',
    type: 'pair-bybit',
    dexBase: 'USDT',
    dexQuote: 'USDe',
    cexQuote: 'USDT',
    cexChain: 'Bybit',
    withdrawFee: 0,
    minNetProfit: 8,
    minNetProfitBp: 0,
    displayTargets: [100000, 200000],
    alertConfirmDelaySec: 13,
    maxBookLevels: 10
  }
];

const usdeQuotes = [
  { id: 201, chain: 'ethereum', showInverse: true },
  { id: 202, chain: 'Bybit', showInverse: true }
];

const usdeQuoteStateById = new Map([
  [201, {
    fromSymbol: 'USDT',
    toSymbol: 'USDe',
    lastRawPrice: 1.002,
    inverseRawPrice: 0.998003992
  }],
  [202, {
    fromSymbol: 'USDe',
    toSymbol: 'USDT',
    cexOrderbook: {
      bestBidPrice: 0.9998,
      bestBidSize: 120000,
      bestAskPrice: 1.0002,
      bestAskSize: 120000,
      bidsTopDepth: [
        { price: 0.9998, size: 120000 },
        { price: 0.9996, size: 30000 }
      ],
      asksTopDepth: [
        { price: 1.0002, size: 120000 },
        { price: 1.0004, size: 30000 }
      ]
    }
  }]
]);

const usdeOpportunities = buildSpecialArbOpportunities({
  rules: usdeRules,
  quotes: usdeQuotes,
  quoteStateById: usdeQuoteStateById,
  aliasRules: null
});

assert.strictEqual(usdeOpportunities.length, 1);
assert.strictEqual(usdeOpportunities[0].ruleId, 'special:usde-bybit');
assert.strictEqual(usdeOpportunities[0].label, 'USDe <-> BYBIT');
assert.strictEqual(usdeOpportunities[0].direction, 'eth-to-bybit-bid');
assert.strictEqual(usdeOpportunities[0].alert, true);
assert.ok(usdeOpportunities[0].stats.primary.netProfit > 8);
assert.ok(usdeOpportunities[0].display_message.includes('（ETH）USDT -> USDe'));
assert.ok(usdeOpportunities[0].display_message.includes('（Bybit）USDe -> USDT @0.9998 bid1'));
assert.ok(usdeOpportunities[0].display_message.includes('100000 USDe: 179.96 USDT / 18 bp'));
assert.ok(!usdeOpportunities[0].display_message.includes('200000 USDe:'));
assert.ok(usdeOpportunities[0].display_message.includes('深度: 1) 120000 @0.9998'));
assert.ok(usdeOpportunities[0].alert_message.includes('（Bybit）USDe -> USDT @0.9998 bid1'));
assert.ok(usdeOpportunities[0].alert_message.includes('\n\n100000 : 179.96'));
assert.ok(usdeOpportunities[0].alert_message.includes('最大正收益量:'));
