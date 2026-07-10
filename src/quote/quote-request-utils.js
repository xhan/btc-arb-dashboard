(function (root, factory) {
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('../shared/chain-defaults')
    : root.ChainDefaults;
  const quoteSourceRegistry = typeof module !== 'undefined' && module.exports
    ? require('./quote-source-registry')
    : root.QuoteSourceRegistry;
  const api = factory(chainDefaults, quoteSourceRegistry);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.QuoteRequestUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.QuoteRequestUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (chainDefaults, quoteSourceRegistry) {
  function buildBrowserRequestMap(requestType) {
    return Object.freeze(Object.fromEntries(
      quoteSourceRegistry.getBrowserRequestSources(requestType).map((source) => {
        const config = {
          endpoint: source.endpoint,
          source: source.displayName
        };
        if (source.errorMessage) config.errorMessage = source.errorMessage;
        if (source.includeRouteMeta === true) config.includeRouteMeta = true;
        return [source.displayName, Object.freeze(config)];
      })
    ));
  }

  const MARKET_QUOTE_REQUESTS = buildBrowserRequestMap('market');
  const CEX_ORDERBOOK_REQUESTS = buildBrowserRequestMap('cex');

  function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizeChainKey(chain) {
    if (chainDefaults && typeof chainDefaults.normalizeChain === 'function') {
      return chainDefaults.normalizeChain(chain);
    }
    return normalizeString(chain).toLowerCase();
  }

  function normalizePositiveAmount(value, fallback = 1) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) return amount;
    const fallbackAmount = Number(fallback);
    return Number.isFinite(fallbackAmount) && fallbackAmount > 0 ? fallbackAmount : 1;
  }

  function normalizeRequestChannelId(value, fallback = '') {
    return normalizeString(value) || normalizeString(fallback);
  }

  function resolveMarketQuoteRequestConfig(source) {
    return MARKET_QUOTE_REQUESTS[source] || null;
  }

  function resolveQuoteRequestConfig(source, quote) {
    const marketConfig = resolveMarketQuoteRequestConfig(source);
    if (marketConfig) {
      return { type: 'market', config: marketConfig };
    }
    if (CEX_ORDERBOOK_REQUESTS[source]) {
      return { type: 'cex', config: CEX_ORDERBOOK_REQUESTS[source] };
    }

    const quoteChain = normalizeChainKey(quote && quote.chain);
    const isSuiQuote = quoteChain === 'sui';
    return {
      type: 'market',
      config: {
        endpoint: `/api/${isSuiQuote ? 'get-cetus-quote' : 'get-kyber-quote'}`,
        errorMessage: 'API Request Failed',
        requestQuote: { ...(quote || {}), amount: quote && quote.amount || 1 },
        resolveUsedSource: (data) => data.source || (isSuiQuote ? 'Cetus' : 'Unknown')
      }
    };
  }

  function buildQuoteRequestInput(quote, options = {}) {
    const baseQuote = quote && typeof quote === 'object' ? quote : {};
    const requestedAmount = normalizePositiveAmount(
      options.amount,
      normalizePositiveAmount(baseQuote.amount, 1)
    );
    const requestChannelId = normalizeRequestChannelId(options.requestChannelId, options.defaultRequestChannelId);
    const isInverseFetch = options.isInverseFetch === true;
    const requestQuote = isInverseFetch
      ? {
          ...baseQuote,
          fromToken: baseQuote.toToken,
          toToken: baseQuote.fromToken,
          amount: requestedAmount,
          requestChannelId
        }
      : { ...baseQuote, amount: requestedAmount, requestChannelId };

    return {
      requestQuote,
      requestedAmount,
      requestChannelId,
      isInverseFetch
    };
  }

  function isKyberSupportedChain(chain) {
    return quoteSourceRegistry.supportsChain('kyber', chain);
  }

  function isZeroxSupportedChain(chain) {
    return quoteSourceRegistry.supportsChain('zerox', chain);
  }

  function shouldSkipQuoteSource(source, quote, options = {}) {
    if (source === 'Kyber') {
      const isSupported = typeof options.isKyberSupported === 'function'
        ? options.isKyberSupported
        : isKyberSupportedChain;
      return !isSupported(quote && quote.chain);
    }
    if (source === '0x') {
      const isSupported = typeof options.is0xSupported === 'function'
        ? options.is0xSupported
        : isZeroxSupportedChain;
      return !isSupported(quote && quote.chain);
    }
    return false;
  }

  function shouldDelayQuoteSource(source, strategy, options = {}) {
    return options.skipDelay !== true
      && source === '0x'
      && Array.isArray(strategy)
      && strategy[0] !== '0x';
  }

  function applyAutoFallbackSourceLabel(data, quote, source, options = {}) {
    if (
      !data
      || options.isInverseFetch === true
      || !quote
      || quote.preferredSource !== 'Auto'
      || source === 'Kyber'
    ) {
      return data;
    }
    return {
      ...data,
      usedSource: `${source} (Auto Fallback)`
    };
  }

  function getQuoteErrorMessage(error) {
    if (error && typeof error.message === 'string') return error.message;
    const message = String(error == null ? '' : error);
    return message || 'Unknown error';
  }

  function formatQuoteErrorMessage(error, options = {}) {
    return options.displayText || '报价失败';
  }

  function buildQuoteErrorTitle(error) {
    return `详细错误: ${getQuoteErrorMessage(error)}`;
  }

  function buildMarketQuoteResult(data, usedSource, options = {}) {
    const result = {
      symbols: { from: data.fromSymbol, to: data.toSymbol },
      finalAmountOut: data.amountOut,
      rawPrice: data.raw_price,
      usedSource,
      resultText: `${data.fromSymbol} ≈ ${data.amountOut.toFixed(6)} ${data.toSymbol}`
    };
    if (options.includeRouteMeta) {
      result.fromChain = data.fromChain;
      result.toChain = data.toChain;
      result.isCrossChain = data.isCrossChain === true;
    }
    return result;
  }

  function buildCexOrderbook(data) {
    return {
      bestBidPrice: data.bestBidPrice,
      bestBidSize: data.bestBidSize,
      bestAskPrice: data.bestAskPrice,
      bestAskSize: data.bestAskSize,
      bidsTop5: data.bidsTop5,
      asksTop5: data.asksTop5,
      bidsTopDepth: data.bidsTopDepth,
      asksTopDepth: data.asksTopDepth,
      feeRate: data.feeRate
    };
  }

  function buildCexOrderbookQuoteResult(data, quote, options = {}) {
    const cexOrderbook = buildCexOrderbook(data);
    const buildSummary = typeof options.buildSummary === 'function'
      ? options.buildSummary
      : null;
    return {
      symbols: { from: data.fromSymbol, to: data.toSymbol },
      finalAmountOut: data.amountOut,
      rawPrice: data.raw_price,
      usedSource: options.source,
      resultText: buildSummary
        ? buildSummary(quote && quote.symbol, cexOrderbook)
        : '',
      cexOrderbook
    };
  }

  function resolveFetchImpl(fetchImpl) {
    if (typeof fetchImpl === 'function') return fetchImpl;
    if (typeof fetch === 'function') return fetch;
    throw new Error('fetch is not available');
  }

  async function postQuoteJson(options = {}) {
    const fetchImpl = resolveFetchImpl(options.fetchImpl);
    const endpoint = normalizeString(options.endpoint);
    if (!endpoint) {
      throw new Error('Quote request endpoint is missing');
    }

    const response = await fetchImpl(`${normalizeString(options.backendUrl)}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(options.payload || {}) }),
      signal: options.signal
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || options.errorMessage || 'API Request Failed');
    }
    return data;
  }

  async function requestMarketQuote(options = {}) {
    const requestConfig = options.requestConfig || {};
    const quote = options.quote || {};
    const requestQuote = requestConfig.requestQuote || quote;
    const data = await postQuoteJson({
      backendUrl: options.backendUrl,
      endpoint: requestConfig.endpoint,
      payload: requestQuote,
      signal: options.signal,
      fetchImpl: options.fetchImpl,
      errorMessage: requestConfig.errorMessage || 'API Request Failed'
    });
    const usedSource = typeof requestConfig.resolveUsedSource === 'function'
      ? requestConfig.resolveUsedSource(data, quote)
      : requestConfig.source;
    return buildMarketQuoteResult(data, usedSource, requestConfig);
  }

  async function requestCexOrderbookQuote(options = {}) {
    const requestConfig = options.requestConfig || {};
    const quote = options.quote || {};
    const data = await postQuoteJson({
      backendUrl: options.backendUrl,
      endpoint: requestConfig.endpoint,
      payload: quote,
      signal: options.signal,
      fetchImpl: options.fetchImpl,
      errorMessage: `${requestConfig.source || 'CEX'} API Request Failed`
    });
    return buildCexOrderbookQuoteResult(data, quote, {
      source: requestConfig.source,
      buildSummary: options.buildCexSummary
    });
  }

  async function requestResolvedQuote(options = {}) {
    const resolvedConfig = options.resolvedConfig || {};
    if (resolvedConfig.type === 'cex') {
      return requestCexOrderbookQuote({
        ...options,
        requestConfig: resolvedConfig.config
      });
    }
    return requestMarketQuote({
      ...options,
      requestConfig: resolvedConfig.config
    });
  }

  return {
    CEX_ORDERBOOK_REQUESTS,
    MARKET_QUOTE_REQUESTS,
    applyAutoFallbackSourceLabel,
    buildCexOrderbook,
    buildCexOrderbookQuoteResult,
    buildMarketQuoteResult,
    buildQuoteRequestInput,
    buildQuoteErrorTitle,
    formatQuoteErrorMessage,
    isKyberSupportedChain,
    isZeroxSupportedChain,
    normalizeChainKey,
    requestCexOrderbookQuote,
    requestMarketQuote,
    requestResolvedQuote,
    resolveMarketQuoteRequestConfig,
    resolveQuoteRequestConfig,
    shouldDelayQuoteSource,
    shouldSkipQuoteSource
  };
});
