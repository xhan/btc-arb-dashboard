const assert = require('assert');

const {
  splitCompactTradingPairSymbol
} = require('../shared/trading-pair-utils');

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
