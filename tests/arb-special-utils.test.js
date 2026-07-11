const assert = require('assert');

const { buildSpecialArbOpportunities } = require('../src/arb/arb-special-utils');
const mutedPathLegUtils = require('../src/path-alerts/muted-path-leg-utils');

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
    displayTargets: [1, 2, 3],
    depthSizeDecimals: 5,
    targetAmountDecimals: 5,
    profitDecimals: 5,
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
assert.ok(opportunity.display_message.includes('（eth）WBTC -> cbBTC 1.0011'));
assert.ok(opportunity.display_message.includes('（bybit）BTC -> WBTC 0.9998 ask1'));
assert.ok(opportunity.display_message.includes('\n\n1) 0.50000   0.9998   💹13.0‱'));
assert.ok(opportunity.display_message.includes('\n2) 1.00000   0.9999   💹12.0‱'));
assert.ok(opportunity.display_message.includes('\n3) 0.80000   1.0002   💹9.0‱'));
assert.ok(!opportunity.display_message.includes('\n4) '));
assert.ok(opportunity.display_message.includes('\n\n1.00000   💰0.00125   💹12.5‱'));
assert.ok(opportunity.display_message.includes('\n2.00000   💰0.00230   💹11.5‱'));
assert.ok(!opportunity.display_message.includes('\n3     '));
assert.ok(opportunity.display_message.includes('\n2.30000   💰0.00247   💹10.7‱(MAX)'));
assert.ok(!opportunity.display_message.includes('@'));
assert.ok(opportunity.alert_message.includes('（eth）WBTC -> cbBTC'));
assert.ok(opportunity.alert_message.includes('（bybit）BTC -> WBTC 0.9998 ask1'));
assert.ok(opportunity.alert_message.includes('\n\n1) 0.50000   0.9998   💹13.0‱'));
assert.ok(opportunity.alert_message.includes('\n\n1.00000   💰0.00125   💹12.5‱'));
assert.ok(opportunity.alert_message.includes('\n2.00000   💰0.00230   💹11.5‱'));
assert.ok(!opportunity.alert_message.includes('\n3     '));
assert.ok(opportunity.alert_message.includes('\n2.30000   💰0.00247   💹10.7‱(MAX)'));
assert.ok(!opportunity.alert_message.includes('@'));
assert.ok(opportunity.alert_message.includes('另一方向:'));

assert.strictEqual(opportunity.cycle.legs.length, 2);
assert.strictEqual(opportunity.cycle.legs[0].from, 'BTC');
assert.strictEqual(opportunity.cycle.legs[0].to, 'WBTC');
assert.strictEqual(opportunity.cycle.legs[0].cexLevelLabel, 'ask');
assert.strictEqual(opportunity.cycle.legs[1].from, 'WBTC');
assert.strictEqual(opportunity.cycle.legs[1].to, 'cbBTC');
assert.ok(opportunity.cycle.profitRate > 0);

assert.strictEqual(opportunity.stats.primary.direction, 'bybit-ask-to-eth');
assert.strictEqual(opportunity.stats.primary.directionLabel, 'bybit ASK -> eth WBTC->cbBTC');
assert.ok(opportunity.stats.primary.netProfit > opportunity.stats.secondary.netProfit);
assert.strictEqual(opportunity.stats.secondary.direction, 'eth-to-bybit-bid');
assert.strictEqual(opportunity.stats.secondary.directionLabel, 'eth xBTC->WBTC + bybit BID');
assert.strictEqual(opportunity.stats.secondary.usedLevels.length, 2);
assert.strictEqual(opportunity.stats.targetResults.length, 2);
assert.strictEqual(opportunity.stats.targetResults[0].targetAmount, 1);
assert.ok(opportunity.stats.targetResults[0].profitBp > opportunity.stats.primary.netProfitBp);

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

const mutedReverseDexLeg = buildSpecialArbOpportunities({
  rules,
  quotes: categoryQuotes,
  quoteStateById,
  aliasRules: { xBTC: 'cbBTC' },
  mutedPathLegs: [{
    quoteId: 2,
    direction: 'forward',
    pricingMode: 'raw',
    mutedAt: 1000,
    expiresAt: 3000
  }],
  mutedPathLegUtils,
  nowMs: 2000
});
assert.strictEqual(mutedReverseDexLeg.length, 1);
assert.strictEqual(mutedReverseDexLeg[0].direction, 'eth-to-bybit-bid');
assert.strictEqual(mutedReverseDexLeg[0].cycle.legs[0].quoteId, 1);

const mutedAskBookLeg = buildSpecialArbOpportunities({
  rules,
  quotes: categoryQuotes,
  quoteStateById,
  aliasRules: { xBTC: 'cbBTC' },
  mutedPathLegs: [{
    quoteId: 3,
    direction: 'inverse',
    pricingMode: 'cex-ask1-inverse',
    mutedAt: 1000,
    expiresAt: 3000
  }],
  mutedPathLegUtils,
  nowMs: 2000
});
assert.strictEqual(mutedAskBookLeg.length, 1);
assert.strictEqual(mutedAskBookLeg[0].direction, 'eth-to-bybit-bid');

const aliasChainOpportunities = buildSpecialArbOpportunities({
  rules,
  quotes: [
    { id: 5, chain: 'eth', showInverse: false },
    { id: 6, chain: 'bybit', showInverse: true }
  ],
  quoteStateById: new Map([
    [5, { fromSymbol: 'WBTC', toSymbol: 'cbBTC', lastRawPrice: 1.0011, inverseRawPrice: 0.9989 }],
    [6, {
      fromSymbol: 'WBTC',
      toSymbol: 'BTC',
      cexOrderbook: {
        bestBidPrice: 0.9982,
        bestBidSize: 0.5,
        bestAskPrice: 0.9998,
        bestAskSize: 0.5,
        bidsTopDepth: [{ price: 0.9982, size: 0.5 }],
        asksTopDepth: [{ price: 0.9998, size: 0.5 }]
      }
    }]
  ]),
  aliasRules: { xBTC: 'cbBTC' }
});
assert.strictEqual(aliasChainOpportunities.length, 1);

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
assert.ok(lowBpOpportunities[0].stats.primary.netProfit > 0);
assert.ok(lowBpOpportunities[0].stats.primary.netProfitBp > 0);

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
    displayTargets: [100000, 200000],
    depthSizeDecimals: 1,
    targetAmountDecimals: 1,
    profitDecimals: 1,
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
assert.ok(usdeOpportunities[0].stats.primary.netProfit > 0);
assert.strictEqual(usdeOpportunities[0].stats.targetResults.length, 1);
assert.strictEqual(usdeOpportunities[0].stats.targetResults[0].targetAmount, 100000);
assert.ok(usdeOpportunities[0].stats.targetResults[0].profitBp > usdeOpportunities[0].stats.primary.netProfitBp);
assert.ok(usdeOpportunities[0].display_message.includes('（eth）USDT -> USDe 1.002'));
assert.ok(usdeOpportunities[0].display_message.includes('（bybit）USDe -> USDT 0.9998 bid1'));
assert.ok(usdeOpportunities[0].display_message.includes('\n\n1) 120000.0   0.9998   💹18.0‱'));
assert.ok(usdeOpportunities[0].display_message.includes('\n2) 30000.0    0.9996   💹16.0‱'));
assert.ok(usdeOpportunities[0].display_message.includes('\n\n100000.0   💰180.0   💹18.0‱'));
assert.ok(!usdeOpportunities[0].display_message.includes('200000.0'));
assert.ok(usdeOpportunities[0].display_message.includes('\n150000.0   💰263.9   💹17.6‱(MAX)'));
assert.ok(usdeOpportunities[0].alert_message.includes('（bybit）USDe -> USDT 0.9998 bid1'));
assert.ok(usdeOpportunities[0].alert_message.includes('\n\n100000.0   💰180.0   💹18.0‱'));
assert.ok(usdeOpportunities[0].alert_message.includes('\n150000.0   💰263.9   💹17.6‱(MAX)'));
assert.ok(!usdeOpportunities[0].display_message.includes('@'));

const usdtbRules = [
  {
    id: 'special:usdtb-bybit',
    title: 'USDtb <-> BYBIT',
    type: 'pair-bybit',
    dexBase: 'USDT',
    dexQuote: 'USDtb',
    cexQuote: 'USDT',
    cexChain: 'Bybit',
    withdrawFee: 0,
    displayTargets: [100000, 200000],
    depthSizeDecimals: 1,
    targetAmountDecimals: 1,
    profitDecimals: 1,
    maxBookLevels: 10
  }
];

const usdtbQuotes = [
  { id: 301, chain: 'ethereum', showInverse: true },
  { id: 302, chain: 'Bybit', showInverse: true }
];

const usdtbQuoteStateById = new Map([
  [301, {
    fromSymbol: 'USDT',
    toSymbol: 'USDtb',
    lastRawPrice: 1.0015,
    inverseRawPrice: 0.9985022466
  }],
  [302, {
    fromSymbol: 'USDTB',
    toSymbol: 'USDT',
    cexOrderbook: {
      bestBidPrice: 0.9997,
      bestBidSize: 130000,
      bestAskPrice: 1.0001,
      bestAskSize: 130000,
      bidsTopDepth: [
        { price: 0.9997, size: 130000 },
        { price: 0.9995, size: 30000 }
      ],
      asksTopDepth: [
        { price: 1.0001, size: 130000 },
        { price: 1.0003, size: 30000 }
      ]
    }
  }]
]);

const usdtbOpportunities = buildSpecialArbOpportunities({
  rules: usdtbRules,
  quotes: usdtbQuotes,
  quoteStateById: usdtbQuoteStateById,
  aliasRules: { USDTB: 'USDtb' }
});

assert.strictEqual(usdtbOpportunities.length, 1);
assert.strictEqual(usdtbOpportunities[0].ruleId, 'special:usdtb-bybit');
assert.strictEqual(usdtbOpportunities[0].label, 'USDtb <-> BYBIT');
assert.strictEqual(usdtbOpportunities[0].direction, 'eth-to-bybit-bid');
assert.ok(usdtbOpportunities[0].stats.primary.netProfit > 0);
assert.ok(usdtbOpportunities[0].display_message.includes('（eth）USDT -> USDtb 1.0015'));
assert.ok(usdtbOpportunities[0].display_message.includes('（bybit）USDtb -> USDT 0.9997 bid1'));
assert.ok(usdtbOpportunities[0].display_message.includes('\n\n1) 130000.0   0.9997   💹12.0‱'));
assert.ok(usdtbOpportunities[0].display_message.includes('\n2) 30000.0    0.9995   💹10.0‱'));
assert.ok(usdtbOpportunities[0].display_message.includes('\n\n100000.0   💰120.0   💹12.0‱'));
assert.ok(usdtbOpportunities[0].display_message.includes('160000.0   💰185.9   💹11.6‱(MAX)'));
assert.ok(usdtbOpportunities[0].alert_message.includes('（bybit）USDtb -> USDT 0.9997 bid1'));
