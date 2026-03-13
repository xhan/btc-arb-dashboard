(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbRuleSnapshotUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildArbRuleSnapshot(options = {}) {
    const fixedRules = Array.isArray(options.fixedRules) ? options.fixedRules : [];
    const specialRules = Array.isArray(options.specialRules) ? options.specialRules : [];
    const arbPathsApi = options.arbPathsApi;
    const arbFixedUtils = options.arbFixedUtils || null;
    const arbSpecialUtils = options.arbSpecialUtils || null;
    const allEdgesWithRules = Array.isArray(options.allEdgesWithRules) ? options.allEdgesWithRules : [];
    const quoteMetaById = options.quoteMetaById instanceof Map ? options.quoteMetaById : new Map();
    const quotesByCategoryName = options.quotesByCategoryName instanceof Map ? options.quotesByCategoryName : new Map();
    const quoteStateById = options.quoteStateById instanceof Map ? options.quoteStateById : new Map();
    const aliasRules = options.aliasRules || null;

    const fixedResults = [];
    const fixedByRuleId = {};
    for (const rule of fixedRules) {
      if (!rule || !arbPathsApi || typeof arbPathsApi.findFixedPaths !== 'function') continue;
      const filteredEdges = arbFixedUtils && typeof arbFixedUtils.filterEdgesForFixedRule === 'function'
        ? arbFixedUtils.filterEdgesForFixedRule(rule, allEdgesWithRules, quoteMetaById)
        : allEdgesWithRules;
      const cycles = arbPathsApi.findFixedPaths(filteredEdges, rule, aliasRules, {
        limit: Number(rule.resultLimit) || 1
      });
      const normalizedCycles = Array.isArray(cycles) ? cycles : [];
      fixedResults.push({ rule, cycles: normalizedCycles });
      fixedByRuleId[rule.id] = normalizedCycles;
    }

    const specialResults = [];
    const specialByRuleId = {};
    for (const rule of specialRules) {
      if (!rule || !arbSpecialUtils || typeof arbSpecialUtils.buildSpecialArbOpportunities !== 'function') continue;
      const quotes = quotesByCategoryName.get(rule.categoryName) || [];
      const opportunities = arbSpecialUtils.buildSpecialArbOpportunities({
        rules: [rule],
        quotes,
        quoteStateById,
        aliasRules
      });
      const normalizedOpportunities = Array.isArray(opportunities) ? opportunities : [];
      specialResults.push({ rule, opportunities: normalizedOpportunities });
      specialByRuleId[rule.id] = normalizedOpportunities;
    }

    return {
      fixedResults,
      fixedByRuleId,
      specialResults,
      specialByRuleId
    };
  }

  return {
    buildArbRuleSnapshot
  };
}));
