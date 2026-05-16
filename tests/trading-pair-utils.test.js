const assert = require('assert');

const {
  parseCexTradingPairSymbol,
  splitCompactTradingPairSymbol
} = require('../src/shared/trading-pair-utils');

assert.deepStrictEqual(splitCompactTradingPairSymbol('BTCUSDT'), {
  fromSymbol: 'BTC',
  toSymbol: 'USDT'
});

assert.deepStrictEqual(splitCompactTradingPairSymbol('eth/usdc'), {
  fromSymbol: 'ETH',
  toSymbol: 'USDC'
});

assert.deepStrictEqual(splitCompactTradingPairSymbol('WBTC-USDE'), {
  fromSymbol: 'WBTC',
  toSymbol: 'USDE'
});

assert.strictEqual(splitCompactTradingPairSymbol('UNKNOWNPAIR'), null);
assert.strictEqual(splitCompactTradingPairSymbol(null), null);

assert.deepStrictEqual(parseCexTradingPairSymbol('BTCUSDT'), {
  fromSymbol: 'BTC',
  toSymbol: 'USDT'
});

assert.deepStrictEqual(parseCexTradingPairSymbol('eth/usdc'), {
  fromSymbol: 'ETH',
  toSymbol: 'USDC'
});

assert.strictEqual(parseCexTradingPairSymbol(null), null);
