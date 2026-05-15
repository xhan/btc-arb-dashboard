(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.QuoteRequestUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.QuoteRequestUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MARKET_QUOTE_REQUESTS = Object.freeze({
    '0x': Object.freeze({ endpoint: '/api/get-0x-quote', source: '0x', errorMessage: '0x API Request Failed' }),
    Velora: Object.freeze({ endpoint: '/api/get-velora-quote', source: 'Velora', errorMessage: 'Velora API Request Failed' }),
    'LI.FI': Object.freeze({ endpoint: '/api/get-lifi-quote', source: 'LI.FI', errorMessage: 'LI.FI API Request Failed', includeRouteMeta: true }),
    Ekubo: Object.freeze({ endpoint: '/api/get-ekubo-quote', source: 'Ekubo', errorMessage: 'Ekubo API Request Failed' }),
    Jupiter: Object.freeze({ endpoint: '/api/get-jupiter-quote', source: 'Jupiter', errorMessage: 'Jupiter API Request Failed' })
  });

  function resolveMarketQuoteRequestConfig(source) {
    return MARKET_QUOTE_REQUESTS[source] || null;
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

  return {
    MARKET_QUOTE_REQUESTS,
    buildMarketQuoteResult,
    resolveMarketQuoteRequestConfig
  };
});
