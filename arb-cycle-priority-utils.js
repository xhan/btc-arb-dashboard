(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbCyclePriorityUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_ARB_CYCLE_START_PRIORITY = Object.freeze(['cbBTC', 'WBTC', 'ETH']);

  function normalizeArbCycleStartPriority(priorityList, fallback = DEFAULT_ARB_CYCLE_START_PRIORITY) {
    const source = Array.isArray(priorityList) && priorityList.length ? priorityList : fallback;
    const seen = new Set();
    const normalized = [];
    for (const item of source) {
      const symbol = String(item || '').trim();
      if (!symbol || seen.has(symbol)) continue;
      seen.add(symbol);
      normalized.push(symbol);
    }
    return normalized.length ? normalized : Array.from(DEFAULT_ARB_CYCLE_START_PRIORITY);
  }

  function buildPreferredCycleStartSymbols(aliasRules, priorityList = DEFAULT_ARB_CYCLE_START_PRIORITY) {
    const normalizedPriority = normalizeArbCycleStartPriority(priorityList);
    const symbols = [];
    const seen = new Set();

    function pushSymbol(symbol) {
      const normalized = String(symbol || '').trim();
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      symbols.push(normalized);
    }

    for (const canonicalSymbol of normalizedPriority) {
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
    DEFAULT_ARB_CYCLE_START_PRIORITY,
    normalizeArbCycleStartPriority,
    buildPreferredCycleStartSymbols
  };
}));
