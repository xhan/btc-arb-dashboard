(function () {
function resolveTokenAliasConfig(root) {
  if (typeof module === 'object' && module.exports) {
    return require('../shared/token-alias-config');
  }
  return root.TokenAliasConfig || {};
}

function buildApi(tokenAliasConfig) {
  tokenAliasConfig = tokenAliasConfig || {};
  const DEFAULT_ASSET_EQUIVALENCE_GROUPS = tokenAliasConfig.DEFAULT_TOKEN_ALIAS_GROUPS || {};

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

  function normalizeAssetLookupKey(symbol) {
    return String(symbol || '').trim().toUpperCase();
  }

  function buildAliasLookup(aliasRules) {
    const lookup = new Map();
    for (const [alias, canonical] of Object.entries(aliasRules || {})) {
      const aliasKey = normalizeAssetLookupKey(alias);
      const canonicalKey = normalizeAssetLookupKey(canonical);
      if (!aliasKey || !canonicalKey) continue;
      lookup.set(aliasKey, canonicalKey);
      if (!lookup.has(canonicalKey)) {
        lookup.set(canonicalKey, canonicalKey);
      }
    }
    return lookup;
  }

  function buildAliasTargetLookup(aliasRules) {
    const lookup = new Map();
    for (const [alias, canonical] of Object.entries(aliasRules || {})) {
      const aliasKey = normalizeAssetLookupKey(alias);
      const canonicalKey = normalizeAssetLookupKey(canonical);
      const canonicalSymbol = String(canonical || '').trim();
      if (!aliasKey || !canonicalKey || !canonicalSymbol) continue;
      lookup.set(aliasKey, canonicalSymbol);
      if (!lookup.has(canonicalKey)) {
        lookup.set(canonicalKey, canonicalSymbol);
      }
    }
    return lookup;
  }

  function buildAliasGroups(aliasRules) {
    const groups = new Map();
    const targetLookup = buildAliasTargetLookup(aliasRules);

    function addSymbol(canonicalSymbol, symbol) {
      const canonicalKey = normalizeAssetLookupKey(canonicalSymbol);
      const normalizedSymbol = String(symbol || '').trim();
      if (!canonicalKey || !normalizedSymbol) return;
      const group = groups.get(canonicalKey) || { canonical: canonicalSymbol, symbols: [] };
      if (!group.symbols.includes(group.canonical)) {
        group.symbols.push(group.canonical);
      }
      if (!group.symbols.includes(normalizedSymbol)) {
        group.symbols.push(normalizedSymbol);
      }
      groups.set(canonicalKey, group);
    }

    for (const [alias, canonical] of Object.entries(aliasRules || {})) {
      const canonicalSymbol = targetLookup.get(normalizeAssetLookupKey(canonical)) || String(canonical || '').trim();
      addSymbol(canonicalSymbol, canonicalSymbol);
      addSymbol(canonicalSymbol, alias);
    }

    return Array.from(groups.values());
  }

  function resolveAliasSymbol(symbol, aliasRulesOrLookup, options = {}) {
    const normalized = normalizeAssetLookupKey(symbol);
    if (!normalized) return '';
    if (options.allowAliases === false) return normalized;

    const lookup = aliasRulesOrLookup instanceof Map
      ? aliasRulesOrLookup
      : buildAliasLookup(aliasRulesOrLookup);
    return lookup.get(normalized) || normalized;
  }

  function resolveAliasTarget(symbol, aliasRulesOrLookup, options = {}) {
    const normalized = normalizeAssetLookupKey(symbol);
    const rawSymbol = String(symbol || '').trim();
    if (!normalized) return '';
    if (options.allowAliases === false) return rawSymbol;

    const lookup = aliasRulesOrLookup instanceof Map
      ? aliasRulesOrLookup
      : buildAliasTargetLookup(aliasRulesOrLookup);
    return lookup.get(normalized) || rawSymbol;
  }

  function symbolsMatch(left, right, aliasRulesOrLookup, options = {}) {
    return resolveAliasSymbol(left, aliasRulesOrLookup, options) === resolveAliasSymbol(right, aliasRulesOrLookup, options);
  }

  function expandAliasSymbols(aliasRules, canonicalSymbols) {
    const symbols = [];
    const seen = new Set();

    function pushSymbol(symbol) {
      const normalized = String(symbol || '').trim();
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      symbols.push(normalized);
    }

    for (const canonicalSymbol of canonicalSymbols || []) {
      pushSymbol(canonicalSymbol);
      for (const [alias, mapped] of Object.entries(aliasRules || {})) {
        if (String(mapped || '').trim() === canonicalSymbol) {
          pushSymbol(alias);
          pushSymbol(mapped);
        }
      }
    }

    return symbols;
  }

  return {
    DEFAULT_ASSET_EQUIVALENCE_GROUPS,
    buildAliasGroups,
    buildAliasLookup,
    buildAliasRulesFromGroups,
    buildAliasTargetLookup,
    expandAliasSymbols,
    normalizeAssetLookupKey,
    resolveAliasSymbol,
    resolveAliasTarget,
    symbolsMatch
  };
}

(function attachApi(root, factory) {
  const tokenAliasConfig = resolveTokenAliasConfig(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(tokenAliasConfig);
  } else {
    root.ArbEquivalenceUtils = factory(tokenAliasConfig);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), buildApi);
}());
