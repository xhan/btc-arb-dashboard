const assert = require('assert');

const {
  CEX_QUOTE_ROUTES,
  MARKET_QUOTE_ROUTES,
  buildDefaultQuoteErrorContext,
  registerQuoteRoutes
} = require('../src/server/quote-route-utils');

function createFakeApp() {
  const handlers = new Map();
  return {
    handlers,
    post(routePath, handler) {
      handlers.set(routePath, handler);
    }
  };
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    json(payload) {
      this.body = payload;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    }
  };
}

assert.deepStrictEqual(
  buildDefaultQuoteErrorContext({ chain: 'base', fromToken: '0xaaa', toToken: '0xbbb' }),
  { chain: 'base', fromToken: '0xaaa', toToken: '0xbbb', amount: 1 }
);

assert.deepStrictEqual(
  MARKET_QUOTE_ROUTES.map((route) => route.routePath),
  [
    '/api/get-0x-quote',
    '/api/get-lifi-quote',
    '/api/get-ekubo-quote',
    '/api/get-jupiter-quote',
    '/api/get-kyber-quote',
    '/api/get-velora-quote',
    '/api/get-cetus-quote'
  ]
);
assert.deepStrictEqual(
  CEX_QUOTE_ROUTES.map((route) => route.routePath),
  ['/api/get-bybit-quote', '/api/get-binance-quote']
);

async function runSuccessPathTest() {
  const app = createFakeApp();
  const providerCalls = [];
  registerQuoteRoutes({
    app,
    marketClients: {
      providers: {
        kyber: {
          getQuote: async (input) => {
            providerCalls.push(input);
            return { price: 1.23 };
          }
        }
      }
    },
    buildQuoteRequestInput: async (body, sourceKey) => ({ ...body, sourceKey }),
    logQuoteError: () => {
      throw new Error('should not log on success');
    },
    withQuoteLogRequestChannel: (context) => context,
    marketRoutes: [MARKET_QUOTE_ROUTES.find((route) => route.routePath === '/api/get-kyber-quote')],
    cexRoutes: []
  });

  const response = createResponse();
  await app.handlers.get('/api/get-kyber-quote')({
    body: { chain: 'base', fromToken: '0xaaa', toToken: '0xbbb', amount: 2 }
  }, response);

  assert.deepStrictEqual(providerCalls, [
    { chain: 'base', fromToken: '0xaaa', toToken: '0xbbb', amount: 2, sourceKey: 'kyber' }
  ]);
  assert.strictEqual(response.statusCode, 200);
  assert.deepStrictEqual(response.body, { price: 1.23 });
}

async function runMarketErrorPathTest() {
  const app = createFakeApp();
  const errors = [];
  registerQuoteRoutes({
    app,
    marketClients: {
      providers: {
        lifi: {
          getQuote: async () => {
            throw new Error('route failed');
          }
        }
      }
    },
    buildQuoteRequestInput: async (body, sourceKey) => ({ ...body, requestContext: { channelId: 'HK-1' }, sourceKey }),
    logQuoteError: (source, context, error) => errors.push({ source, context, error: error.message }),
    withQuoteLogRequestChannel: (context, input) => ({ ...context, channelId: input.requestContext.channelId }),
    marketRoutes: [MARKET_QUOTE_ROUTES.find((route) => route.routePath === '/api/get-lifi-quote')],
    cexRoutes: []
  });

  const response = createResponse();
  await app.handlers.get('/api/get-lifi-quote')({
    body: { chain: 'base', toChain: 'arbitrum', fromToken: '0xaaa', toToken: '0xbbb' }
  }, response);

  assert.strictEqual(response.statusCode, 500);
  assert.deepStrictEqual(response.body, { error: 'route failed' });
  assert.deepStrictEqual(errors, [{
    source: 'LIFI',
    context: { chain: 'base->arbitrum', fromToken: '0xaaa', toToken: '0xbbb', amount: 1, channelId: 'HK-1' },
    error: 'route failed'
  }]);
}

async function runCexErrorPathTest() {
  const app = createFakeApp();
  const errors = [];
  registerQuoteRoutes({
    app,
    marketClients: {
      providers: {
        bybit: {
          getQuote: async () => {
            throw new Error('cex failed');
          }
        }
      }
    },
    buildQuoteRequestInput: async () => {
      throw new Error('should not build DEX input for CEX routes');
    },
    logQuoteError: (source, context, error) => errors.push({ source, context, error: error.message }),
    withQuoteLogRequestChannel: (context) => context,
    marketRoutes: [],
    cexRoutes: [CEX_QUOTE_ROUTES.find((route) => route.routePath === '/api/get-bybit-quote')]
  });

  const response = createResponse();
  await app.handlers.get('/api/get-bybit-quote')({
    body: { symbol: 'BTCUSDT' }
  }, response);

  assert.strictEqual(response.statusCode, 500);
  assert.deepStrictEqual(response.body, { error: 'cex failed' });
  assert.deepStrictEqual(errors, [{
    source: 'BYBIT',
    context: { chain: 'Bybit', fromSymbol: 'BTCUSDT', amount: 1 },
    error: 'cex failed'
  }]);
}

Promise.resolve()
  .then(runSuccessPathTest)
  .then(runMarketErrorPathTest)
  .then(runCexErrorPathTest)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
