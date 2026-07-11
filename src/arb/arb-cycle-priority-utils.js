(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./arb-equivalence-utils'));
    return;
  }
  root.ArbCyclePriorityUtils = factory(root.ArbEquivalenceUtils);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (arbEquivalenceUtils) {
  const DEFAULT_ARB_CYCLE_START_PRIORITY = Object.freeze(['cbBTC', 'WBTC', 'ETH', 'USDT']);

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
    return arbEquivalenceUtils.expandAliasSymbols(aliasRules, normalizedPriority);
  }

  return {
    DEFAULT_ARB_CYCLE_START_PRIORITY,
    normalizeArbCycleStartPriority,
    buildPreferredCycleStartSymbols
  };
}));
