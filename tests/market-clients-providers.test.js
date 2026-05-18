const assert = require('assert');

const { createBybitClient } = require('../src/market-clients/providers/bybit');
const { createBinanceClient } = require('../src/market-clients/providers/binance');
const { createJupiterClient } = require('../src/market-clients/providers/jupiter');
const { createEkuboClient } = require('../src/market-clients/providers/ekubo');
const { createKyberClient } = require('../src/market-clients/providers/kyber');
const { createLifiClient } = require('../src/market-clients/providers/lifi');
const { createVeloraClient } = require('../src/market-clients/providers/velora');
const { createZeroXClient } = require('../src/market-clients/providers/zerox');
const { createCetusClient } = require('../src/market-clients/providers/cetus');

(async () => {
  const kyberRequests = [];
  const kyber = createKyberClient({
    fetchOnce: async (url, options, requestContext) => {
      kyberRequests.push({ url, options, requestContext });
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

  const kyberChannelRequests = [];
  const kyberChannelResult = await kyber.getQuote({
    chain: 'ethereum',
    fromToken: '0xfrom',
    toToken: '0xto',
    amount: 1,
    kyberExcludedSources: ['uniswap-v3', ' balancer-v3 ', 'uniswap-v3'],
    requestContext: {
      channelId: 'hk-1',
      httpProxy: 'http://127.0.0.1:18001',
      configMore: {
        kyberClientId: 'hk-client'
      }
    }
  });
  kyberChannelRequests.push(kyberRequests[1]);
  assert.strictEqual(kyberChannelResult.source, 'Kyber');
  assert.strictEqual(
    kyberChannelRequests[0].url,
    'https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?tokenIn=0xfrom&tokenOut=0xto&amountIn=100000000&excludedSources=uniswap-v3%2Cbalancer-v3'
  );
  assert.deepStrictEqual(kyberChannelRequests[0].options, {
    headers: { 'X-Client-Id': 'hk-client' }
  });
  assert.deepStrictEqual(kyberChannelRequests[0].requestContext, {
    channelId: 'hk-1',
    httpProxy: 'http://127.0.0.1:18001',
    configMore: {
      kyberClientId: 'hk-client'
    }
  });

  const zeroXRequests = [];
  const zeroX = createZeroXClient({
    fetchOnce: async (url, options, requestContext) => {
      zeroXRequests.push({ url, options, requestContext });
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
  assert.strictEqual(zeroXRequests[0].requestContext, undefined);

  const jupiterRequests = [];
  const jupiter = createJupiterClient({
    fetchOnce: async (url, options, requestContext) => {
      jupiterRequests.push({ url, options, requestContext });
      return {
        json: async () => ({
          outAmount: '495000000'
        })
      };
    },
    getConfigMore: async () => ({ jupiterApiKey: 'jupiter-api-key' }),
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
    jupiterRequests[0].url,
    'https://api.jup.ag/swap/v1/quote?inputMint=mint-in&outputMint=mint-out&amount=1500000000'
  );
  assert.deepStrictEqual(jupiterRequests[0].options, {
    headers: { 'x-api-key': 'jupiter-api-key' }
  });

  const jupiterChannelRequests = [];
  const jupiterChannel = createJupiterClient({
    fetchOnce: async (url, options, requestContext) => {
      jupiterChannelRequests.push({ url, options, requestContext });
      return {
        json: async () => ({
          outAmount: '495000000'
        })
      };
    },
    getConfigMore: async () => ({ jupiterApiKey: 'default-jupiter-api-key' }),
    getSolanaTokenMeta: async (mint, requestContext) => {
      assert.strictEqual(requestContext.channelId, 'sg-1');
      if (mint === 'mint-in') return { symbol: 'SOL', decimals: 9 };
      return { symbol: 'USDC', decimals: 6 };
    },
    toRawAmount: () => '1500000000',
    fromRawAmount: () => 495,
    logQuoteRequest: () => {},
    logQuoteResult: () => {}
  });
  await jupiterChannel.getQuote({
    chain: 'solana',
    fromToken: 'mint-in',
    toToken: 'mint-out',
    amount: 1.5,
    requestContext: {
      channelId: 'sg-1',
      httpProxy: 'http://127.0.0.1:18002',
      configMore: {
        jupiterApiKey: 'sg-jupiter-api-key'
      }
    }
  });
  assert.deepStrictEqual(jupiterChannelRequests[0].options, {
    headers: { 'x-api-key': 'sg-jupiter-api-key' }
  });
  assert.strictEqual(jupiterChannelRequests[0].requestContext.channelId, 'sg-1');

  const jupiterMissingKey = createJupiterClient({
    fetchOnce: async () => {
      throw new Error('should not request without api key');
    },
    getConfigMore: async () => ({}),
    getSolanaTokenMeta: async (mint) => {
      if (mint === 'mint-in') return { symbol: 'SOL', decimals: 9 };
      return { symbol: 'USDC', decimals: 6 };
    },
    toRawAmount: () => '1500000000',
    fromRawAmount: () => 495,
    logQuoteRequest: () => {},
    logQuoteResult: () => {}
  });

  await assert.rejects(
    () =>
      jupiterMissingKey.getQuote({
        chain: 'solana',
        fromToken: 'mint-in',
        toToken: 'mint-out',
        amount: 1.5
      }),
    /未配置 Jupiter API Key/
  );

  const cetus = createCetusClient({
    BNLib: function FakeBN(value) {
      this.value = value;
      this.toString = () => String(value);
    },
    cetusAggregator: {
      findRouters: async () => ({
        amountOut: {
          toString: () => '10005000'
        }
      })
    },
    getSuiTokenMeta: async (token) => {
      if (token === 'coin-xbtc') return { symbol: 'xBTC', decimals: 8 };
      return { symbol: 'TBTC', decimals: 8 };
    },
    toRawAmount: (amount, decimals) => {
      if (amount === 0.1 && decimals === 8) return '10000000';
      throw new Error('unexpected cetus toRawAmount input');
    },
    fromRawAmount: (raw, decimals) => {
      if (raw === '10005000' && decimals === 8) return 0.10005;
      throw new Error('unexpected cetus fromRawAmount input');
    }
  });

  const cetusResult = await cetus.getQuote({
    chain: 'sui',
    fromToken: 'coin-xbtc',
    toToken: 'coin-tbtc',
    amount: 0.1
  });

  assert.deepStrictEqual(cetusResult, {
    fromSymbol: 'xBTC',
    toSymbol: 'TBTC',
    amountOut: 0.10005,
    raw_price: 1.0005,
    source: 'Cetus'
  });

  const cetusInsufficientLiquidity = createCetusClient({
    BNLib: function FakeBN(value) {
      this.value = value;
      this.toString = () => String(value);
    },
    cetusAggregator: {
      findRouters: async () => ({
        error: {
          code: 1002,
          msg: 'Insufficient liquidity: calculate result error'
        }
      })
    },
    getSuiTokenMeta: async (token) => {
      if (token === 'coin-xbtc') return { symbol: 'xBTC', decimals: 8 };
      return { symbol: 'TBTC', decimals: 8 };
    },
    toRawAmount: () => '100000000',
    fromRawAmount: () => {
      throw new Error('fromRawAmount should not be called for insufficient liquidity fallback');
    }
  });

  const cetusInsufficientResult = await cetusInsufficientLiquidity.getQuote({
    chain: 'sui',
    fromToken: 'coin-xbtc',
    toToken: 'coin-tbtc',
    amount: 1
  });

  assert.deepStrictEqual(cetusInsufficientResult, {
    fromSymbol: 'xBTC',
    toSymbol: 'TBTC',
    amountOut: 0,
    raw_price: 0,
    source: 'Cetus'
  });

  const cetusBestRouteNotFound = createCetusClient({
    BNLib: function FakeBN(value) {
      this.value = value;
      this.toString = () => String(value);
    },
    cetusAggregator: {
      findRouters: async () => ({
        error: {
          code: 1002,
          msg: 'Insufficient liquidity: liquidity is not enough, the best result was not found.'
        }
      })
    },
    getSuiTokenMeta: async (token) => {
      if (token === 'coin-xbtc') return { symbol: 'xBTC', decimals: 8 };
      return { symbol: 'TBTC', decimals: 8 };
    },
    toRawAmount: () => '100000000',
    fromRawAmount: () => {
      throw new Error('fromRawAmount should not be called for best route not found fallback');
    }
  });

  const cetusBestRouteNotFoundResult = await cetusBestRouteNotFound.getQuote({
    chain: 'sui',
    fromToken: 'coin-xbtc',
    toToken: 'coin-tbtc',
    amount: 1
  });

  assert.deepStrictEqual(cetusBestRouteNotFoundResult, {
    fromSymbol: 'xBTC',
    toSymbol: 'TBTC',
    amountOut: 0,
    raw_price: 0,
    source: 'Cetus'
  });

  const cetusOtherError = createCetusClient({
    BNLib: function FakeBN(value) {
      this.value = value;
      this.toString = () => String(value);
    },
    cetusAggregator: {
      findRouters: async () => ({
        error: {
          code: 1001,
          msg: 'route search failed'
        }
      })
    },
    getSuiTokenMeta: async (token) => {
      if (token === 'coin-xbtc') return { symbol: 'xBTC', decimals: 8 };
      return { symbol: 'TBTC', decimals: 8 };
    },
    toRawAmount: () => '100000000',
    fromRawAmount: () => 0
  });

  await assert.rejects(
    () =>
      cetusOtherError.getQuote({
        chain: 'sui',
        fromToken: 'coin-xbtc',
        toToken: 'coin-tbtc',
        amount: 1
      }),
    /route search failed/
  );

  const bybitRequests = [];
  const bybit = createBybitClient({
    fetchOnce: async (url) => {
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
    bidsTopDepth: [
      { price: 0.9986, size: 1.25 },
      { price: 0.9985, size: 2.5 }
    ],
    asksTopDepth: [
      { price: 0.9988, size: 1.1 },
      { price: 0.9989, size: 3.2 }
    ],
    feeRate: 0,
    source: 'Bybit'
  });
  assert.strictEqual(
    bybitRequests[0],
    'https://api.bybit.com/v5/market/orderbook?category=spot&symbol=WBTCBTC&limit=10'
  );

  const binanceRequests = [];
  const binance = createBinanceClient({
    fetchOnce: async (url) => {
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
  assert.deepStrictEqual(binanceResult.bidsTopDepth, [
    { price: 99800.1, size: 0.8 },
    { price: 99750.15, size: 1.4 }
  ]);
  assert.strictEqual(binanceResult.asksTop5.length, 2);
  assert.strictEqual(binanceResult.asksTopDepth.length, 2);
  assert.ok(Math.abs(binanceResult.asksTop5[0].price - 100200.1) < 1e-9);
  assert.strictEqual(binanceResult.asksTop5[0].size, 0.6);
  assert.deepStrictEqual(binanceResult.asksTop5[1], { price: 100250.15, size: 1.1 });
  assert.strictEqual(
    binanceRequests[0],
    'https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=5'
  );

  const veloraRequests = [];
  const velora = createVeloraClient({
    fetchOnce: async (url, options, requestContext) => {
      veloraRequests.push({ url, options, requestContext });
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
  const veloraUrl = new URL(veloraRequests[0].url);
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

  const veloraChannelRequests = [];
  const veloraChannel = createVeloraClient({
    fetchOnce: async (url, options, requestContext) => {
      veloraChannelRequests.push({ url, options, requestContext });
      return {
        json: async () => ({
          priceRoute: {
            destAmount: '1995000000'
          }
        })
      };
    },
    getConfigMore: async () => ({
      veloraPartner: 'default-partner',
      veloraIncludeDEXS: [],
      veloraOtherExchangePrices: false
    }),
    getEvmProvider: () => ({}),
    getEvmTokenMeta: async (chain, tokenAddress) => {
      if (tokenAddress === '0xeth') return { symbol: 'ETH', decimals: 18 };
      return { symbol: 'USDC', decimals: 6 };
    },
    toRawAmount: () => '1000000000000000000',
    fromRawAmount: () => 1995,
    logQuoteRequest: () => {},
    logQuoteResult: () => {}
  });
  await veloraChannel.getQuote({
    chain: 'ethereum',
    fromToken: '0xeth',
    toToken: '0xusdc',
    amount: 1,
    requestContext: {
      channelId: 'hk-1',
      httpProxy: 'http://127.0.0.1:18001',
      configMore: {
        veloraPartner: 'hk-partner',
        veloraIncludeDEXS: ['UniswapV3'],
        veloraOtherExchangePrices: true
      }
    }
  });
  const veloraChannelUrl = new URL(veloraChannelRequests[0].url);
  assert.strictEqual(veloraChannelUrl.searchParams.get('partner'), 'hk-partner');
  assert.strictEqual(veloraChannelUrl.searchParams.get('includeDEXS'), 'UniswapV3');
  assert.strictEqual(veloraChannelUrl.searchParams.get('otherExchangePrices'), 'true');
  assert.strictEqual(veloraChannelRequests[0].requestContext.channelId, 'hk-1');

  const lifiRequests = [];
  const lifi = createLifiClient({
    apiBaseUrl: 'https://li.quest/v1',
    defaultFromAddress: '0x1111111111111111111111111111111111111111',
    defaultSlippage: '0.005',
    fetchOnce: async (url, options, requestContext) => {
      lifiRequests.push({ url, options, requestContext });
      return {
        json: async () => ({
          estimate: {
            toAmount: '1234000000'
          }
        })
      };
    },
    fromRawAmount: (raw) => {
      if (raw === '1234000000') return 1234;
      throw new Error('unexpected lifi fromRawAmount input');
    },
    getConfigMore: async () => ({
      lifiApiKey: 'default-lifi-key',
      lifiIntegrator: 'default-integrator'
    }),
    getDisplayedToAmountRaw: (quoteData) => quoteData.estimate.toAmount,
    getLifiChainIdMap: async (configMore, requestContext) => {
      assert.strictEqual(requestContext.channelId, 'us-1');
      assert.strictEqual(configMore.lifiApiKey, 'us-lifi-key');
      return { ethereum: 1 };
    },
    getLifiHeaders: (configMore) => ({
      'Content-Type': 'application/json',
      'x-lifi-api-key': configMore.lifiApiKey
    }),
    getLifiTokenMeta: async (chain, chainId, tokenAddress, configMore, requestContext) => {
      assert.strictEqual(requestContext.channelId, 'us-1');
      assert.strictEqual(configMore.lifiIntegrator, 'us-integrator');
      if (tokenAddress === '0xfrom') return { symbol: 'USDT', decimals: 6 };
      return { symbol: 'ETH', decimals: 18 };
    },
    logQuoteRequest: () => {},
    logQuoteResult: () => {},
    resolveLifiChainId: (chain, map) => map[chain],
    toRawAmount: (amount, decimals) => {
      if (amount === 1000 && decimals === 6) return '1000000000';
      throw new Error('unexpected lifi toRawAmount input');
    }
  });
  const lifiResult = await lifi.getQuote({
    chain: 'ethereum',
    fromToken: '0xfrom',
    toToken: '0xto',
    amount: 1000,
    requestContext: {
      channelId: 'us-1',
      httpProxy: 'http://127.0.0.1:18003',
      configMore: {
        lifiApiKey: 'us-lifi-key',
        lifiIntegrator: 'us-integrator',
        lifiSlippage: '0.0001'
      }
    }
  });
  assert.strictEqual(lifiResult.source, 'LI.FI');
  const lifiUrl = new URL(lifiRequests[0].url);
  assert.strictEqual(lifiUrl.searchParams.get('slippage'), '0.0001');
  assert.strictEqual(lifiRequests[0].options.headers['x-lifi-api-key'], 'us-lifi-key');
  assert.strictEqual(lifiRequests[0].requestContext.channelId, 'us-1');

  const lifiCrossChainRequests = [];
  const lifiCrossChainMetaCalls = [];
  const lifiCrossChain = createLifiClient({
    apiBaseUrl: 'https://li.quest/v1',
    defaultFromAddress: '0x1111111111111111111111111111111111111111',
    defaultSlippage: '0.005',
    fetchOnce: async (url) => {
      lifiCrossChainRequests.push(url);
      return {
        json: async () => ({
          estimate: {
            toAmount: '99000000'
          }
        })
      };
    },
    fromRawAmount: (raw, decimals) => {
      if (raw === '99000000' && decimals === 6) return 99;
      throw new Error('unexpected cross-chain lifi fromRawAmount input');
    },
    getConfigMore: async () => ({ lifiApiKey: 'lifi-key' }),
    getDisplayedToAmountRaw: (quoteData) => quoteData.estimate.toAmount,
    getLifiChainIdMap: async () => ({ arbitrum: 42161, ethereum: 1 }),
    getLifiHeaders: () => ({}),
    getLifiTokenMeta: async (chain, chainId, tokenAddress) => {
      lifiCrossChainMetaCalls.push({ chain, chainId, tokenAddress });
      return { symbol: tokenAddress === '0xarb-usdc' ? 'USDC.e' : 'USDC', decimals: 6 };
    },
    logQuoteRequest: () => {},
    logQuoteResult: () => {},
    resolveLifiChainId: (chain, map) => map[chain],
    toRawAmount: (amount, decimals) => {
      if (amount === 100 && decimals === 6) return '100000000';
      throw new Error('unexpected cross-chain lifi toRawAmount input');
    }
  });

  const lifiCrossChainResult = await lifiCrossChain.getQuote({
    chain: 'arbitrum',
    toChain: 'ethereum',
    fromToken: '0xarb-usdc',
    toToken: '0xeth-usdc',
    amount: 100
  });
  const lifiCrossChainUrl = new URL(lifiCrossChainRequests[0]);
  assert.strictEqual(lifiCrossChainUrl.searchParams.get('fromChain'), '42161');
  assert.strictEqual(lifiCrossChainUrl.searchParams.get('toChain'), '1');
  assert.deepStrictEqual(lifiCrossChainMetaCalls, [
    { chain: 'arbitrum', chainId: 42161, tokenAddress: '0xarb-usdc' },
    { chain: 'ethereum', chainId: 1, tokenAddress: '0xeth-usdc' }
  ]);
  assert.deepStrictEqual(lifiCrossChainResult, {
    fromSymbol: 'USDC.e',
    toSymbol: 'USDC',
    fromChain: 'arbitrum',
    toChain: 'ethereum',
    isCrossChain: true,
    amountOut: 99,
    raw_price: 0.99,
    source: 'LI.FI'
  });

  const ekuboRequests = [];
  const ekubo = createEkuboClient({
    buildEkuboQuoteResult: ({ amount }) => ({
      fromSymbol: 'ETH',
      toSymbol: 'USDC',
      amountOut: 2000,
      raw_price: 2000 / amount,
      source: 'Ekubo'
    }),
    buildEkuboQuoteUrl: () => 'https://prod-api.ekubo.org/quote',
    extractEkuboAmountOutRaw: () => '2000000000',
    fetchOnce: async (url, options, requestContext) => {
      ekuboRequests.push({ url, options, requestContext });
      return {
        json: async () => ({ amountOut: '2000000000' })
      };
    },
    getEkuboTokenMeta: async (tokenAddress, requestContext) => {
      assert.strictEqual(requestContext.channelId, 'stark-1');
      if (tokenAddress === '0xeth') return { symbol: 'ETH', decimals: 18 };
      return { symbol: 'USDC', decimals: 6 };
    },
    logQuoteRequest: () => {},
    logQuoteResult: () => {},
    toRawAmount: () => '1000000000000000000'
  });
  const ekuboResult = await ekubo.getQuote({
    chain: 'starknet',
    fromToken: '0xeth',
    toToken: '0xusdc',
    amount: 1,
    requestContext: {
      channelId: 'stark-1',
      httpProxy: 'http://127.0.0.1:18004',
      configMore: {}
    }
  });
  assert.strictEqual(ekuboResult.source, 'Ekubo');
  assert.strictEqual(ekuboRequests[0].requestContext.channelId, 'stark-1');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
