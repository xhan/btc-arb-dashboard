(function (root, factory) {
  const quotePauseUtils = typeof module !== 'undefined' && module.exports
    ? require('../quote/quote-pause-utils')
    : root.QuotePauseUtils;
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('../shared/chain-defaults')
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

  function shortenTokenText(value) {
    const text = String(value || '').trim();
    if (!text) return '--';
    if (text.length <= 18) return text;
    return `${text.slice(0, 8)}...${text.slice(-6)}`;
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

  function buildPathAlertCandidateRecordsFromDashboard(dashboard, options = {}) {
    const parseCexTradingPairSymbol = typeof options.parseCexTradingPairSymbol === 'function'
      ? options.parseCexTradingPairSymbol
      : () => null;
    const shortenToken = typeof options.shortenToken === 'function'
      ? options.shortenToken
      : shortenTokenText;
    const records = [];

    for (const category of (Array.isArray(dashboard) ? dashboard : [])) {
      for (const quote of (Array.isArray(category && category.quotes) ? category.quotes : [])) {
        if (!quote) continue;
        if (isCexOrderbookChain(quote.chain)) {
          const parsed = parseCexTradingPairSymbol(quote.symbol);
          if (!parsed) continue;
          records.push({
            categoryName: category.name,
            quote,
            fromSymbol: parsed.fromSymbol,
            toSymbol: parsed.toSymbol,
            searchText: `${category.name} ${quote.chain} ${quote.symbol} ${parsed.fromSymbol} ${parsed.toSymbol}`
          });
          continue;
        }

        const forwardFrom = shortenToken(quote.fromToken);
        const forwardTo = shortenToken(quote.toToken);
        records.push({
          categoryName: category.name,
          quote,
          fromSymbol: forwardFrom,
          toSymbol: forwardTo,
          searchText: `${category.name} ${quote.chain} ${quote.fromToken || ''} ${quote.toToken || ''} ${forwardFrom} ${forwardTo}`
        });
      }
    }

    return records;
  }

  function buildPathAlertCandidatesFromDashboard(dashboard, options = {}) {
    return buildPathAlertCandidates(
      buildPathAlertCandidateRecordsFromDashboard(dashboard, options),
      options
    );
  }

  function matchesPathAlertCandidate(candidate, query) {
    const tokens = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    const haystack = String(candidate && (candidate.searchText || candidate.label) || '').toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  }

  function filterPathAlertCandidates(candidates, query, limit = 12) {
    const max = Number.isFinite(Number(limit)) && Number(limit) > 0
      ? Math.floor(Number(limit))
      : 12;
    return (Array.isArray(candidates) ? candidates : [])
      .filter((candidate) => matchesPathAlertCandidate(candidate, query))
      .slice(0, max);
  }

  return {
    buildPathAlertCandidates,
    buildPathAlertCandidatesFromDashboard,
    filterPathAlertCandidates
  };
});
