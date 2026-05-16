function buildDefaultQuoteErrorContext(body = {}) {
  const { chain, fromToken, toToken, amount } = body;
  return { chain, fromToken, toToken, amount: amount || 1 };
}

function buildLifiQuoteErrorContext(body = {}) {
  const { chain, toChain, fromToken, toToken, amount } = body;
  const logChain = toChain && toChain !== chain ? `${chain}->${toChain}` : chain;
  return { chain: logChain, fromToken, toToken, amount: amount || 1 };
}

function buildSolanaQuoteErrorContext(body = {}) {
  const { fromToken, toToken, amount } = body;
  return { chain: 'solana', fromToken, toToken, amount: amount || 1 };
}

const MARKET_QUOTE_ROUTES = [
  {
    routePath: '/api/get-0x-quote',
    providerKey: 'zerox',
    sourceKey: 'zerox',
    logSource: 'ZEROX'
  },
  {
    routePath: '/api/get-lifi-quote',
    providerKey: 'lifi',
    sourceKey: 'lifi',
    logSource: 'LIFI',
    buildErrorContext: buildLifiQuoteErrorContext
  },
  {
    routePath: '/api/get-ekubo-quote',
    providerKey: 'ekubo',
    sourceKey: 'starknet',
    logSource: 'EKUBO'
  },
  {
    routePath: '/api/get-jupiter-quote',
    providerKey: 'jupiter',
    sourceKey: 'solana',
    logSource: 'JUPITER',
    buildErrorContext: buildSolanaQuoteErrorContext
  },
  {
    routePath: '/api/get-kyber-quote',
    providerKey: 'kyber',
    sourceKey: 'kyber',
    logSource: 'KYBER'
  },
  {
    routePath: '/api/get-velora-quote',
    providerKey: 'velora',
    sourceKey: 'velora',
    logSource: 'VELORA'
  },
  {
    routePath: '/api/get-cetus-quote',
    providerKey: 'cetus',
    sourceKey: 'sui',
    logSource: 'CETUS'
  }
];

const CEX_QUOTE_ROUTES = [
  {
    routePath: '/api/get-bybit-quote',
    providerKey: 'bybit',
    logSource: 'BYBIT',
    chainLabel: 'Bybit'
  },
  {
    routePath: '/api/get-binance-quote',
    providerKey: 'binance',
    logSource: 'BINANCE',
    chainLabel: 'Binance'
  }
];

function registerMarketQuoteRoute({
  app,
  marketClients,
  buildQuoteRequestInput,
  logQuoteError,
  withQuoteLogRequestChannel
}, { routePath, providerKey, sourceKey, logSource, buildErrorContext = buildDefaultQuoteErrorContext }) {
  app.post(routePath, async (req, res) => {
    let input = null;
    try {
      input = await buildQuoteRequestInput(req.body, sourceKey);
      const result = await marketClients.providers[providerKey].getQuote(input);
      res.json(result);
    } catch (error) {
      logQuoteError(logSource, withQuoteLogRequestChannel(buildErrorContext(req.body), input), error);
      res.status(500).json({ error: error.message });
    }
  });
}

function registerCexQuoteRoute({
  app,
  marketClients,
  logQuoteError
}, { routePath, providerKey, logSource, chainLabel }) {
  app.post(routePath, async (req, res) => {
    try {
      const result = await marketClients.providers[providerKey].getQuote(req.body);
      res.json(result);
    } catch (error) {
      const { amount, symbol } = req.body;
      logQuoteError(logSource, { chain: chainLabel, fromSymbol: symbol, amount: amount || 1 }, error);
      res.status(500).json({ error: error.message });
    }
  });
}

function registerQuoteRoutes(options = {}) {
  const marketRoutes = options.marketRoutes || MARKET_QUOTE_ROUTES;
  const cexRoutes = options.cexRoutes || CEX_QUOTE_ROUTES;
  for (const routeConfig of marketRoutes) {
    registerMarketQuoteRoute(options, routeConfig);
  }
  for (const routeConfig of cexRoutes) {
    registerCexQuoteRoute(options, routeConfig);
  }
}

module.exports = {
  CEX_QUOTE_ROUTES,
  MARKET_QUOTE_ROUTES,
  buildDefaultQuoteErrorContext,
  buildLifiQuoteErrorContext,
  buildSolanaQuoteErrorContext,
  registerCexQuoteRoute,
  registerMarketQuoteRoute,
  registerQuoteRoutes
};
