const quoteSourceRegistry = require('../quote/quote-source-registry');

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

const ERROR_CONTEXT_BUILDERS = {
  'cross-chain': buildLifiQuoteErrorContext,
  solana: buildSolanaQuoteErrorContext
};

const MARKET_QUOTE_ROUTES = quoteSourceRegistry.getRouteSources('market').map((source) => ({
  routePath: source.endpoint,
  providerKey: source.providerKey,
  sourceKey: source.sourceKey,
  logSource: source.logSource,
  buildErrorContext: ERROR_CONTEXT_BUILDERS[source.errorContextKind]
}));

const CEX_QUOTE_ROUTES = quoteSourceRegistry.getRouteSources('cex').map((source) => ({
  routePath: source.endpoint,
  providerKey: source.providerKey,
  logSource: source.logSource,
  chainLabel: source.chainLabel
}));

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
