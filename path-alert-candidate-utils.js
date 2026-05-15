(function (root, factory) {
  const quotePauseUtils = typeof module !== 'undefined' && module.exports
    ? require('./quote-pause-utils')
    : root.QuotePauseUtils;
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('./chain-defaults')
    : root.ChainDefaults;
  const api = factory(quotePauseUtils, chainDefaults);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.PathAlertCandidateUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.PathAlertCandidateUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (quotePauseUtils, chainDefaults) {
  const isQuotePaused = quotePauseUtils && typeof quotePauseUtils.isQuotePaused === 'function'
    ? quotePauseUtils.isQuotePaused
    : (quote) => !!quote && quote.paused === true;

  function isCexOrderbookChain(chain) {
    if (chainDefaults && typeof chainDefaults.isCexOrderbookChain === 'function') {
      return chainDefaults.isCexOrderbookChain(chain);
    }
    const normalized = String(chain || '').trim().toLowerCase();
    return normalized === 'bybit' || normalized === 'binance';
  }

  function buildDefaultLabel(chain, fromSymbol, toSymbol, suffix = '') {
    return `(${String(chain || '').trim()}) ${fromSymbol || '--'} -> ${toSymbol || '--'}${suffix}`;
  }

  function buildPathAlertCandidates(records, options = {}) {
    const buildLabel = typeof options.buildLabel === 'function'
      ? options.buildLabel
      : buildDefaultLabel;
    const candidates = [];

    for (const record of (records || [])) {
      const quote = record && record.quote;
      if (!quote || isQuotePaused(quote)) continue;

      const fromSymbol = String(record.fromSymbol || '').trim();
      const toSymbol = String(record.toSymbol || '').trim();
      if (!fromSymbol || !toSymbol) continue;

      const categoryName = String(record.categoryName || '').trim();
      const searchText = String(
        record.searchText
          || `${categoryName} ${quote.chain || ''} ${quote.symbol || ''} ${quote.fromToken || ''} ${quote.toToken || ''} ${fromSymbol} ${toSymbol}`
      );

      if (isCexOrderbookChain(quote.chain)) {
        candidates.push({
          key: `${quote.id}:cex-bid1`,
          quoteId: quote.id,
          direction: 'forward',
          pricingMode: 'cex-bid1',
          chain: quote.chain,
          fromSymbol,
          toSymbol,
          categoryName,
          label: buildLabel(quote.chain, fromSymbol, toSymbol, ' [bid1]'),
          searchText
        });
        candidates.push({
          key: `${quote.id}:cex-ask1-inverse`,
          quoteId: quote.id,
          direction: 'forward',
          pricingMode: 'cex-ask1-inverse',
          chain: quote.chain,
          fromSymbol: toSymbol,
          toSymbol: fromSymbol,
          categoryName,
          label: buildLabel(quote.chain, toSymbol, fromSymbol, ' [ask1]'),
          searchText
        });
        continue;
      }

      candidates.push({
        key: `${quote.id}:forward`,
        quoteId: quote.id,
        direction: 'forward',
        pricingMode: 'raw',
        chain: quote.chain,
        fromSymbol,
        toSymbol,
        categoryName,
        label: buildLabel(quote.chain, fromSymbol, toSymbol),
        searchText
      });

      if (quote.showInverse) {
        candidates.push({
          key: `${quote.id}:inverse`,
          quoteId: quote.id,
          direction: 'inverse',
          pricingMode: 'raw',
          chain: quote.chain,
          fromSymbol: toSymbol,
          toSymbol: fromSymbol,
          categoryName,
          label: buildLabel(quote.chain, toSymbol, fromSymbol),
          searchText
        });
      }
    }

    return candidates;
  }

  return {
    buildPathAlertCandidates
  };
});
