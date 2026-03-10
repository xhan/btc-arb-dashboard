const assert = require('assert');

const { createBybitClient } = require('../market-clients/providers/bybit');
const { createBinanceClient } = require('../market-clients/providers/binance');
const { createJupiterClient } = require('../market-clients/providers/jupiter');
const { createKyberClient } = require('../market-clients/providers/kyber');
const { createVeloraClient } = require('../market-clients/providers/velora');
const { createZeroXClient } = require('../market-clients/providers/zerox');

(async () => {
  const kyberRequests = [];
  const kyber = createKyberClient({
    fetchWithRetry: async (url, options) => {
      kyberRequests.push({ url, options });
      return {
        json: async () => ({
          code: 0,
          data: {
            routeSummary: {
              amountOut: '678900000'
            }
          }
        })
      };
    },
    getConfigMore: async () => ({ kyberClientId: 'kyber-client' }),
    getEvmProvider: (chain) => (chain === 'ethereum' ? {} : null),
    getEvmTokenMeta: async (chain, tokenAddress) => {
      if (tokenAddress === '0xfrom') return { symbol: 'WBTC', decimals: 8 };
      return { symbol: 'USDC', decimals: 6 };
    },
    toRawAmount: (amount, decimals) => {
      if (amount === 1 && decimals === 8) return '100000000';
      throw new Error('unexpected toRawAmount input');
    },
    fromRawAmount: (raw, decimals) => {
      if (raw === '678900000' && decimals === 6) return 678.9;
      throw new Error('unexpected fromRawAmount input');
    },
    logQuoteRequest: () => {},
    logQuoteResult: () => {}
  });

  const kyberResult = await kyber.getQuote({
    chain: 'ethereum',
    fromToken: '0xfrom',
    toToken: '0xto',
    amount: 1
  });

  assert.deepStrictEqual(kyberResult, {
    fromSymbol: 'WBTC',
    toSymbol: 'USDC',
    amountOut: 678.9,
    raw_price: 678.9,
    source: 'Kyber'
  });
  assert.strictEqual(
    kyberRequests[0].url,
    'https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?tokenIn=0xfrom&tokenOut=0xto&amountIn=100000000'
  );
  assert.deepStrictEqual(kyberRequests[0].options, {
    headers: { 'X-Client-Id': 'kyber-client' }
  });

  const zeroXRequests = [];
  const zeroX = createZeroXClient({
    fetchWithRetry: async (url, options) => {
      zeroXRequests.push({ url, options });
      return {
        json: async () => ({
          buyAmount: '494000000000000000',
          fees: {}
        })
      };
    },
    getEvmProvider: (chain) => (chain === 'ethereum' ? {} : null),
    getEvmTokenMeta: async (chain, tokenAddress) => {
      if (tokenAddress === '0xusdt') return { symbol: 'USDT', decimals: 6 };
      return { symbol: 'ETH', decimals: 18 };
    },
    toRawAmount: (amount, decimals) => {
      if (amount === 1000 && decimals === 6) return '1000000000';
      throw new Error('unexpected toRawAmount input');
    },
    fromRawAmount: (raw, decimals) => {
      if (raw === '494000000000000000' && decimals === 18) return 0.494;
      throw new Error('unexpected fromRawAmount input');
    },
    logQuoteRequest: () => {},
    logQuoteResult: () => {}
  });

  const zeroXResult = await zeroX.getQuote({
    chain: 'ethereum',
    fromToken: '0xusdt',
    toToken: '0xeth',
    amount: 1000
  });

  assert.deepStrictEqual(zeroXResult, {
    fromSymbol: 'USDT',
    toSymbol: 'ETH',
    amountOut: 0.494,
    raw_price: 0.000494,
    source: '0x'
  });
  assert.strictEqual(
    zeroXRequests[0].url,
    'https://api.0x.org/swap/permit2/price?chainId=1&sellToken=0xusdt&buyToken=0xeth&sellAmount=1000000000'
  );
  assert.deepStrictEqual(zeroXRequests[0].options, {
    headers: {
      '0x-api-key': '7e3d32e8-2cf8-413a-9cbe-24b8b0779588',
      '0x-version': 'v2',
      'Content-Type': 'application/json'
    }
  });

  const jupiterRequests = [];
  const jupiter = createJupiterClient({
    fetchWithRetry: async (url) => {
      jupiterRequests.push(url);
      return {
        json: async () => ({
          outAmount: '495000000'
        })
      };
    },
    getSolanaTokenMeta: async (mint) => {
      if (mint === 'mint-in') return { symbol: 'SOL', decimals: 9 };
      return { symbol: 'USDC', decimals: 6 };
    },
    toRawAmount: (amount, decimals) => {
      if (amount === 1.5 && decimals === 9) return '1500000000';
      throw new Error('unexpected jupiter toRawAmount input');
    },
    fromRawAmount: (raw, decimals) => {
      if (raw === '495000000' && decimals === 6) return 495;
      throw new Error('unexpected jupiter fromRawAmount input');
    },
    logQuoteRequest: () => {},
    logQuoteResult: () => {}
  });

  const jupiterResult = await jupiter.getQuote({
    chain: 'solana',
    fromToken: 'mint-in',
    toToken: 'mint-out',
    amount: 1.5
  });

  assert.deepStrictEqual(jupiterResult, {
    fromSymbol: 'SOL',
    toSymbol: 'USDC',
    amountOut: 495,
    raw_price: 330,
    source: 'Jupiter'
  });
  assert.strictEqual(
    jupiterRequests[0],
    'https://lite-api.jup.ag/swap/v1/quote?inputMint=mint-in&outputMint=mint-out&amount=1500000000'
  );

  const bybitRequests = [];
  const bybit = createBybitClient({
    fetchWithRetry: async (url) => {
      bybitRequests.push(url);
      return {
        json: async () => ({
          retCode: 0,
          result: {
            b: [
              ['0.9986', '1.25'],
              ['0.9985', '2.5']
            ],
            a: [
              ['0.9988', '1.1'],
              ['0.9989', '3.2']
            ]
          }
        })
      };
    },
    splitTradingPairSymbol: (symbol) => {
      if (symbol === 'WBTCBTC') {
        return { fromSymbol: 'WBTC', toSymbol: 'BTC' };
      }
      return null;
    }
  });

  const bybitResult = await bybit.getQuote({
    chain: 'Bybit',
    symbol: 'WBTCBTC'
  });

  assert.deepStrictEqual(bybitResult, {
    fromSymbol: 'WBTC',
    toSymbol: 'BTC',
    amountOut: 0.9987,
    raw_price: 0.9987,
    bestBidPrice: 0.9986,
    bestBidSize: 1.25,
    bestAskPrice: 0.9988,
    bestAskSize: 1.1,
    bidsTop5: [
      { price: 0.9986, size: 1.25 },
      { price: 0.9985, size: 2.5 }
    ],
    asksTop5: [
      { price: 0.9988, size: 1.1 },
      { price: 0.9989, size: 3.2 }
    ],
    feeRate: 0,
    source: 'Bybit'
  });
  assert.strictEqual(
    bybitRequests[0],
    'https://api.bybit.com/v5/market/orderbook?category=spot&symbol=WBTCBTC&limit=5'
  );

  const binanceRequests = [];
  const binance = createBinanceClient({
    fetchWithRetry: async (url) => {
      binanceRequests.push(url);
      return {
        json: async () => ({
          bids: [
            ['99900', '0.8'],
            ['99850', '1.4']
          ],
          asks: [
            ['100100', '0.6'],
            ['100150', '1.1']
          ]
        })
      };
    },
    splitTradingPairSymbol: (symbol) => {
      if (symbol === 'BTCUSDT') {
        return { fromSymbol: 'BTC', toSymbol: 'USDT' };
      }
      return null;
    }
  });

  const binanceResult = await binance.getQuote({
    chain: 'Binance',
    symbol: 'BTCUSDT'
  });

  assert.strictEqual(binanceResult.fromSymbol, 'BTC');
  assert.strictEqual(binanceResult.toSymbol, 'USDT');
  assert.strictEqual(binanceResult.source, 'Binance');
  assert.strictEqual(binanceResult.feeRate, 0.001);
  assert.ok(Math.abs(binanceResult.bestBidPrice - 99800.1) < 1e-9);
  assert.ok(Math.abs(binanceResult.bestAskPrice - 100200.1) < 1e-9);
  assert.ok(Math.abs(binanceResult.amountOut - 100000.1) < 1e-9);
  assert.ok(Math.abs(binanceResult.raw_price - 100000.1) < 1e-9);
  assert.deepStrictEqual(binanceResult.bidsTop5, [
    { price: 99800.1, size: 0.8 },
    { price: 99750.15, size: 1.4 }
  ]);
  assert.strictEqual(binanceResult.asksTop5.length, 2);
  assert.ok(Math.abs(binanceResult.asksTop5[0].price - 100200.1) < 1e-9);
  assert.strictEqual(binanceResult.asksTop5[0].size, 0.6);
  assert.deepStrictEqual(binanceResult.asksTop5[1], { price: 100250.15, size: 1.1 });
  assert.strictEqual(
    binanceRequests[0],
    'https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=5'
  );

  const veloraRequests = [];
  const velora = createVeloraClient({
    fetchWithRetry: async (url) => {
      veloraRequests.push(url);
      return {
        json: async () => ({
          priceRoute: {
            destAmount: '1995000000'
          }
        })
      };
    },
    getConfigMore: async () => ({
      veloraPartner: 'xh-dashboard',
      veloraIncludeDEXS: ['UniswapV3', 'SushiSwap'],
      veloraOtherExchangePrices: true
    }),
    getEvmProvider: (chain) => (chain === 'ethereum' ? {} : null),
    getEvmTokenMeta: async (chain, tokenAddress) => {
      if (tokenAddress === '0xeth') return { symbol: 'ETH', decimals: 18 };
      return { symbol: 'USDC', decimals: 6 };
    },
    toRawAmount: (amount, decimals) => {
      if (amount === 1 && decimals === 18) return '1000000000000000000';
      throw new Error('unexpected velora toRawAmount input');
    },
    fromRawAmount: (raw, decimals) => {
      if (raw === '1995000000' && decimals === 6) return 1995;
      throw new Error('unexpected velora fromRawAmount input');
    },
    logQuoteRequest: () => {},
    logQuoteResult: () => {}
  });

  const veloraResult = await velora.getQuote({
    chain: 'ethereum',
    fromToken: '0xeth',
    toToken: '0xusdc',
    amount: 1
  });

  assert.deepStrictEqual(veloraResult, {
    fromSymbol: 'ETH',
    toSymbol: 'USDC',
    amountOut: 1995,
    raw_price: 1995,
    source: 'Velora'
  });
  const veloraUrl = new URL(veloraRequests[0]);
  assert.strictEqual(veloraUrl.origin, 'https://api.paraswap.io');
  assert.strictEqual(veloraUrl.pathname, '/prices/');
  assert.strictEqual(veloraUrl.searchParams.get('srcToken'), '0xeth');
  assert.strictEqual(veloraUrl.searchParams.get('destToken'), '0xusdc');
  assert.strictEqual(veloraUrl.searchParams.get('amount'), '1000000000000000000');
  assert.strictEqual(veloraUrl.searchParams.get('srcDecimals'), '18');
  assert.strictEqual(veloraUrl.searchParams.get('destDecimals'), '6');
  assert.strictEqual(veloraUrl.searchParams.get('side'), 'SELL');
  assert.strictEqual(veloraUrl.searchParams.get('network'), '1');
  assert.strictEqual(veloraUrl.searchParams.get('version'), '6.2');
  assert.strictEqual(veloraUrl.searchParams.get('partner'), 'xh-dashboard');
  assert.strictEqual(veloraUrl.searchParams.get('includeDEXS'), 'UniswapV3,SushiSwap');
  assert.strictEqual(veloraUrl.searchParams.get('otherExchangePrices'), 'true');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
