(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.DashboardQuoteDomainAdapter = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardQuoteDomainAdapter(options = {}) {
    const chainDefaults = options.chainDefaults;
    const queueStatsUtils = options.queueStatsUtils;
    const quotePauseUtils = options.quotePauseUtils;
    const quoteRequestUtils = options.quoteRequestUtils;

    function isCrossChainQuote(quote) {
      return chainDefaults.isCrossChainQuote(quote);
    }

    function getQuoteChainDisplayName(quote) {
      return chainDefaults.buildQuoteChainDisplayName(quote);
    }

    function isCexOrderbookChain(chain) {
      return chainDefaults.isCexOrderbookChain(chain);
    }

    function getDefaultSourceForChain(chain) {
      return chainDefaults.getDefaultSourceForChain(chain);
    }

    function isEvmChain(chain) {
      return chainDefaults.isEvmChain(chain);
    }

    function shouldQueueInverseFetch(quote) {
      return queueStatsUtils.shouldQueueInverseFetch(quote);
    }

    function isQuotePaused(quote) {
      return quotePauseUtils.isQuotePaused(quote);
    }

    function getActiveQuotes(quotes) {
      return quotePauseUtils.getActiveQuotes(quotes);
    }

    function getCategoryPauseAction(quotes) {
      return quotePauseUtils.getCategoryPauseAction(quotes);
    }

    function normalizeChainKey(chain) {
      return quoteRequestUtils.normalizeChainKey(chain);
    }

    return {
      getActiveQuotes,
      getCategoryPauseAction,
      getDefaultSourceForChain,
      getQuoteChainDisplayName,
      isCexOrderbookChain,
      isCrossChainQuote,
      isEvmChain,
      isQuotePaused,
      normalizeChainKey,
      shouldQueueInverseFetch
    };
  }

  return {
    createDashboardQuoteDomainAdapter
  };
}));
