const assert = require('assert');

const {
  MARKET_QUOTE_REQUESTS,
  buildCexOrderbook,
  buildCexOrderbookQuoteResult,
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

const orderbookData = {
  fromSymbol: 'BTC',
  toSymbol: 'USDT',
  amountOut: 100200.123456,
  raw_price: 100200.123456,
  bestBidPrice: 100100,
  bestBidSize: 0.4,
  bestAskPrice: 100200,
  bestAskSize: 0.3,
  bidsTop5: [{ price: 100100, size: 0.4 }],
  asksTop5: [{ price: 100200, size: 0.3 }],
  bidsTopDepth: 1.2,
  asksTopDepth: 1.1,
  feeRate: 0.001
};

assert.deepStrictEqual(buildCexOrderbook(orderbookData), {
  bestBidPrice: 100100,
  bestBidSize: 0.4,
  bestAskPrice: 100200,
  bestAskSize: 0.3,
  bidsTop5: [{ price: 100100, size: 0.4 }],
  asksTop5: [{ price: 100200, size: 0.3 }],
  bidsTopDepth: 1.2,
  asksTopDepth: 1.1,
  feeRate: 0.001
});

assert.deepStrictEqual(
  buildCexOrderbookQuoteResult(orderbookData, { symbol: 'BTCUSDT' }, {
    source: 'Binance',
    buildSummary: (symbol, orderbook) => `${symbol}:${orderbook.bestBidPrice}/${orderbook.bestAskPrice}`
  }),
  {
    symbols: { from: 'BTC', to: 'USDT' },
    finalAmountOut: 100200.123456,
    rawPrice: 100200.123456,
    usedSource: 'Binance',
    resultText: 'BTCUSDT:100100/100200',
    cexOrderbook: {
      bestBidPrice: 100100,
      bestBidSize: 0.4,
      bestAskPrice: 100200,
      bestAskSize: 0.3,
      bidsTop5: [{ price: 100100, size: 0.4 }],
      asksTop5: [{ price: 100200, size: 0.3 }],
      bidsTopDepth: 1.2,
      asksTopDepth: 1.1,
      feeRate: 0.001
    }
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
