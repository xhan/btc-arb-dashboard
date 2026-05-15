const assert = require('assert');

const {
  CEX_ORDERBOOK_REQUESTS,
  MARKET_QUOTE_REQUESTS,
  applyAutoFallbackSourceLabel,
  buildCexOrderbook,
  buildCexOrderbookQuoteResult,
  buildMarketQuoteResult,
  buildQuoteRequestInput,
  buildQuoteErrorTitle,
  formatQuoteErrorMessage,
  resolveMarketQuoteRequestConfig,
  resolveQuoteRequestConfig,
  shouldDelayQuoteSource,
  shouldSkipQuoteSource
} = require('../quote-request-utils');

assert.strictEqual(resolveMarketQuoteRequestConfig('Velora'), MARKET_QUOTE_REQUESTS.Velora);
assert.strictEqual(resolveMarketQuoteRequestConfig('Unknown'), null);
assert.deepStrictEqual(resolveMarketQuoteRequestConfig('LI.FI'), {
  endpoint: '/api/get-lifi-quote',
  source: 'LI.FI',
  errorMessage: 'LI.FI API Request Failed',
  includeRouteMeta: true
});

assert.deepStrictEqual(resolveQuoteRequestConfig('Velora', { chain: 'ethereum' }), {
  type: 'market',
  config: MARKET_QUOTE_REQUESTS.Velora
});

assert.deepStrictEqual(resolveQuoteRequestConfig('Bybit', { chain: 'bybit' }), {
  type: 'cex',
  config: CEX_ORDERBOOK_REQUESTS.Bybit
});

const suiFallbackRequest = resolveQuoteRequestConfig('Cetus', {
  chain: ' Sui ',
  amount: 0,
  fromToken: '0xfrom',
  toToken: '0xto'
});
assert.strictEqual(suiFallbackRequest.type, 'market');
assert.strictEqual(suiFallbackRequest.config.endpoint, '/api/get-cetus-quote');
assert.deepStrictEqual(suiFallbackRequest.config.requestQuote, {
  chain: ' Sui ',
  amount: 1,
  fromToken: '0xfrom',
  toToken: '0xto'
});
assert.strictEqual(
  suiFallbackRequest.config.resolveUsedSource({ amountOut: 10 }),
  'Cetus'
);

const kyberFallbackRequest = resolveQuoteRequestConfig('Kyber', {
  chain: 'ethereum',
  amount: 2
});
assert.strictEqual(kyberFallbackRequest.config.endpoint, '/api/get-kyber-quote');
assert.strictEqual(
  kyberFallbackRequest.config.resolveUsedSource({ source: 'Kyber' }),
  'Kyber'
);

assert.deepStrictEqual(
  buildQuoteRequestInput(
    {
      id: 1,
      amount: 3,
      requestChannelId: 'stored',
      fromToken: 'A',
      toToken: 'B'
    },
    { amount: '5', requestChannelId: ' hk-1 ', defaultRequestChannelId: 'default' }
  ),
  {
    requestQuote: {
      id: 1,
      amount: 5,
      requestChannelId: 'hk-1',
      fromToken: 'A',
      toToken: 'B'
    },
    requestedAmount: 5,
    requestChannelId: 'hk-1',
    isInverseFetch: false
  }
);

assert.deepStrictEqual(
  buildQuoteRequestInput(
    {
      id: 2,
      amount: 4,
      requestChannelId: 'stored',
      fromToken: 'A',
      toToken: 'B'
    },
    { amount: -1, defaultRequestChannelId: 'default', isInverseFetch: true }
  ),
  {
    requestQuote: {
      id: 2,
      amount: 4,
      requestChannelId: 'default',
      fromToken: 'B',
      toToken: 'A'
    },
    requestedAmount: 4,
    requestChannelId: 'default',
    isInverseFetch: true
  }
);

assert.strictEqual(
  shouldSkipQuoteSource('Kyber', { chain: 'unsupported' }, { isKyberSupported: () => false }),
  true
);
assert.strictEqual(
  shouldSkipQuoteSource('0x', { chain: 'solana' }, { is0xSupported: () => false }),
  true
);
assert.strictEqual(
  shouldSkipQuoteSource('Velora', { chain: 'ethereum' }, {}),
  false
);

assert.strictEqual(shouldDelayQuoteSource('0x', ['Kyber', '0x'], {}), true);
assert.strictEqual(shouldDelayQuoteSource('0x', ['0x'], {}), false);
assert.strictEqual(shouldDelayQuoteSource('0x', ['Kyber', '0x'], { skipDelay: true }), false);

const directData = { amountOut: 10, usedSource: 'Kyber' };
assert.strictEqual(
  applyAutoFallbackSourceLabel(directData, { preferredSource: 'Kyber' }, '0x'),
  directData
);
assert.deepStrictEqual(
  applyAutoFallbackSourceLabel({ amountOut: 10, usedSource: '0x' }, { preferredSource: 'Auto' }, '0x'),
  { amountOut: 10, usedSource: '0x (Auto Fallback)' }
);
assert.deepStrictEqual(
  applyAutoFallbackSourceLabel({ amountOut: 10, usedSource: '0x' }, { preferredSource: 'Auto' }, '0x', { isInverseFetch: true }),
  { amountOut: 10, usedSource: '0x' }
);

assert.strictEqual(formatQuoteErrorMessage(new Error('connect ENOTFOUND api.example.com')), '网络连接失败');
assert.strictEqual(
  formatQuoteErrorMessage(new Error('ESTIMATED_LOSS_GREATER_THAN_MAX_IMPACT')),
  '流动性不足 (滑点过高)'
);
assert.strictEqual(formatQuoteErrorMessage(new Error('Liquidity Unavailable')), '流动性不足 (0x)');
assert.strictEqual(
  formatQuoteErrorMessage(new Error('INSUFFICIENT_ASSET_LIQUIDITY')),
  '资产流动性不足 (0x)'
);
assert.strictEqual(formatQuoteErrorMessage(new Error('HTTP 429 Too Many Requests')), '请求过快 (Rate Limit)');
assert.strictEqual(
  formatQuoteErrorMessage(new Error('abcdefghijklmnopqrstuvwxyz'), { maxLength: 10 }),
  'abcdefghij...'
);
assert.strictEqual(buildQuoteErrorTitle(new Error('boom')), '详细错误: boom');

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
