const assert = require('assert');

const {
  MARKET_QUOTE_REQUESTS,
  buildMarketQuoteResult,
  resolveMarketQuoteRequestConfig
} = require('../quote-request-utils');

assert.strictEqual(resolveMarketQuoteRequestConfig('Velora'), MARKET_QUOTE_REQUESTS.Velora);
assert.strictEqual(resolveMarketQuoteRequestConfig('Unknown'), null);
assert.deepStrictEqual(resolveMarketQuoteRequestConfig('LI.FI'), {
  endpoint: '/api/get-lifi-quote',
  source: 'LI.FI',
  errorMessage: 'LI.FI API Request Failed',
  includeRouteMeta: true
});

assert.deepStrictEqual(
  buildMarketQuoteResult({
    fromSymbol: 'ETH',
    toSymbol: 'USDC',
    amountOut: 3456.789123,
    raw_price: 3456.789123
  }, 'Velora'),
  {
    symbols: { from: 'ETH', to: 'USDC' },
    finalAmountOut: 3456.789123,
    rawPrice: 3456.789123,
    usedSource: 'Velora',
    resultText: 'ETH ≈ 3456.789123 USDC'
  }
);

assert.deepStrictEqual(
  buildMarketQuoteResult({
    fromSymbol: 'WBTC',
    toSymbol: 'USDT',
    amountOut: 100001.2345678,
    raw_price: 100001.2345678,
    fromChain: 'ethereum',
    toChain: 'arbitrum',
    isCrossChain: true
  }, 'LI.FI', { includeRouteMeta: true }),
  {
    symbols: { from: 'WBTC', to: 'USDT' },
    finalAmountOut: 100001.2345678,
    rawPrice: 100001.2345678,
    usedSource: 'LI.FI',
    resultText: 'WBTC ≈ 100001.234568 USDT',
    fromChain: 'ethereum',
    toChain: 'arbitrum',
    isCrossChain: true
  }
);
