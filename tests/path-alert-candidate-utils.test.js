const assert = require('assert');

const { buildPathAlertCandidates } = require('../path-alert-candidate-utils');

const candidates = buildPathAlertCandidates([
  {
    categoryName: '测试监控',
    quote: {
      id: 101,
      chain: 'ethereum',
      showInverse: true
    },
    fromSymbol: 'GHO',
    toSymbol: 'USDC'
  },
  {
    categoryName: '测试监控',
    quote: {
      id: 102,
      chain: 'ethereum',
      paused: true,
      showInverse: true
    },
    fromSymbol: 'PAUSED',
    toSymbol: 'USDT'
  },
  {
    categoryName: '测试监控',
    quote: {
      id: 103,
      chain: 'Bybit',
      symbol: 'WBTCBTC'
    },
    fromSymbol: 'WBTC',
    toSymbol: 'BTC'
  }
]);

assert.ok(candidates.some((item) => item.key === '101:forward'));
assert.ok(candidates.some((item) => item.key === '101:inverse'));
assert.ok(!candidates.some((item) => item.key.startsWith('102:')));
assert.ok(candidates.some((item) => item.key === '103:cex-bid1'));
assert.ok(candidates.some((item) => item.key === '103:cex-ask1-inverse'));
