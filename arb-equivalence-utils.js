function buildApi() {
  const DEFAULT_ASSET_EQUIVALENCE_GROUPS = {
    cbBTC: ['cbBTC', 'xBTC', 'BTCB', 'BTC.b', 'BTC.B'],
    tBTC: ['tBTC', 'TBTC']
  };

  function buildAliasRulesFromGroups(groups) {
    const aliasRules = {};

    for (const [canonicalSymbol, members] of Object.entries(groups || {})) {
      if (!canonicalSymbol) continue;

      const symbols = new Set([canonicalSymbol]);
      for (const member of members || []) {
        if (member) {
          symbols.add(member);
        }
      }

      for (const symbol of symbols) {
        if (symbol !== canonicalSymbol) {
          aliasRules[symbol] = canonicalSymbol;
        }
      }
    }

    return aliasRules;
  }

  return {
    DEFAULT_ASSET_EQUIVALENCE_GROUPS,
    buildAliasRulesFromGroups
  };
}

(function attachApi(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ArbEquivalenceUtils = factory();
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), buildApi);
