const assert = require('assert');

const { buildSpecialArbOpportunities } = require('../arb-special-utils');

const rules = [
  {
    id: 'special:dex-cex-wbtc',
    title: 'DEX <-> CEX',
    type: 'dex-cex',
    dexBase: 'cbBTC',
    dexQuote: 'WBTC',
    cexQuote: 'BTC',
    cexChains: ['Bybit', 'Binance']
  }
];

const categoryQuotes = [
  { id: 1, chain: 'arbitrum', showInverse: true },
  { id: 2, chain: 'ethereum', showInverse: true },
  { id: 3, chain: 'Bybit', showInverse: true },
  { id: 4, chain: 'Binance', showInverse: true }
];

const quoteStateById = new Map([
  [1, { fromSymbol: 'xBTC', toSymbol: 'WBTC', lastRawPrice: 1.0024, inverseRawPrice: 0.9976 }],
  [2, { fromSymbol: 'WBTC', toSymbol: 'cbBTC', lastRawPrice: 1.0013, inverseRawPrice: 0.9987 }],
  [3, {
    fromSymbol: 'WBTC',
    toSymbol: 'BTC',
    lastRawPrice: 0.9992,
    inverseRawPrice: 1.0008,
    cexOrderbook: {
      bestBidPrice: 0.9995,
      bestBidSize: 1.25,
      bestAskPrice: 0.9998,
      bestAskSize: 0.9
    }
  }],
  [4, {
    fromSymbol: 'WBTC',
    toSymbol: 'BTC',
    lastRawPrice: 0.9991,
    inverseRawPrice: 1.0009,
    cexOrderbook: {
      bestBidPrice: 0.9993,
      bestBidSize: 2.2,
      bestAskPrice: 0.9996,
      bestAskSize: 0.7
    }
  }]
]);

const opportunities = buildSpecialArbOpportunities({
  rules,
  quotes: categoryQuotes,
  quoteStateById,
  aliasRules: { xBTC: 'cbBTC' }
});

assert.strictEqual(opportunities.length, 2);

const dexToCex = opportunities.find((item) => item.direction === 'dex-to-cex');
assert.ok(dexToCex);
assert.strictEqual(dexToCex.ruleId, 'special:dex-cex-wbtc');
assert.strictEqual(dexToCex.label, 'DEX <-> CEX');
assert.strictEqual(dexToCex.cycle.legs.length, 2);
assert.strictEqual(dexToCex.cycle.legs[0].from, 'xBTC');
assert.strictEqual(dexToCex.cycle.legs[0].to, 'WBTC');
assert.strictEqual(dexToCex.cycle.legs[0].quoteId, 1);
assert.strictEqual(dexToCex.cycle.legs[1].chain, 'Bybit');
assert.strictEqual(dexToCex.cycle.legs[1].from, 'WBTC');
assert.strictEqual(dexToCex.cycle.legs[1].to, 'BTC');
assert.strictEqual(dexToCex.cycle.legs[1].rate, 0.9995);
assert.strictEqual(dexToCex.cycle.legs[1].cexLevelLabel, 'bid1');
assert.strictEqual(dexToCex.cycle.legs[1].cexLevelSize, 1.25);

const cexToDex = opportunities.find((item) => item.direction === 'cex-to-dex');
assert.ok(cexToDex);
assert.strictEqual(cexToDex.ruleId, 'special:dex-cex-wbtc');
assert.strictEqual(cexToDex.label, 'DEX <-> CEX');
assert.strictEqual(cexToDex.cycle.legs.length, 2);
assert.strictEqual(cexToDex.cycle.legs[0].chain, 'Binance');
assert.strictEqual(cexToDex.cycle.legs[0].from, 'BTC');
assert.strictEqual(cexToDex.cycle.legs[0].to, 'WBTC');
assert.strictEqual(cexToDex.cycle.legs[0].inverse, true);
assert.ok(Math.abs(cexToDex.cycle.legs[0].rate - (1 / 0.9996)) < 1e-12);
assert.strictEqual(cexToDex.cycle.legs[0].cexLevelLabel, 'ask1');
assert.strictEqual(cexToDex.cycle.legs[0].cexLevelSize, 0.7);
assert.strictEqual(cexToDex.cycle.legs[1].from, 'WBTC');
assert.strictEqual(cexToDex.cycle.legs[1].to, 'cbBTC');
assert.strictEqual(cexToDex.cycle.legs[1].quoteId, 2);
assert.ok(cexToDex.cycle.profitRate > 0);
