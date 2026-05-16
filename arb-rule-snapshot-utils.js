(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./src/arb/arb-path-template-cache-utils'));
    return;
  }
  root.ArbRuleSnapshotUtils = factory(root.ArbPathTemplateCacheUtils);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (arbPathTemplateCacheUtils) {
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
    const preferredStartSymbols = Array.isArray(options.preferredStartSymbols) ? options.preferredStartSymbols : null;
    const mutedPathLegs = Array.isArray(options.mutedPathLegs) ? options.mutedPathLegs : [];
    const mutedPathLegUtils = options.mutedPathLegUtils || null;
    const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
    const fixedTemplatesByRuleId = options.fixedTemplatesByRuleId && typeof options.fixedTemplatesByRuleId === 'object'
      ? options.fixedTemplatesByRuleId
      : null;
    const visibleEdges = mutedPathLegUtils && typeof mutedPathLegUtils.filterMutedPathLegs === 'function'
      ? mutedPathLegUtils.filterMutedPathLegs(allEdgesWithRules, mutedPathLegs, nowMs)
      : allEdgesWithRules;
    const fixedRuleEdgeIndex = arbFixedUtils && typeof arbFixedUtils.buildFixedRuleEdgeIndex === 'function'
      ? arbFixedUtils.buildFixedRuleEdgeIndex(visibleEdges, quoteMetaById)
      : null;

    const fixedResults = [];
    const fixedByRuleId = {};
    for (const rule of fixedRules) {
      if (!rule) continue;
      let cycles = [];
      const filteredEdges = fixedRuleEdgeIndex && arbFixedUtils && typeof arbFixedUtils.resolveEdgesForFixedRule === 'function'
        ? arbFixedUtils.resolveEdgesForFixedRule(rule, fixedRuleEdgeIndex)
        : arbFixedUtils && typeof arbFixedUtils.filterEdgesForFixedRule === 'function'
        ? arbFixedUtils.filterEdgesForFixedRule(rule, visibleEdges, quoteMetaById)
        : visibleEdges;
      const fixedTemplates = fixedTemplatesByRuleId && Array.isArray(fixedTemplatesByRuleId[rule.id])
        ? fixedTemplatesByRuleId[rule.id]
        : null;

      if (fixedTemplates && arbPathTemplateCacheUtils && typeof arbPathTemplateCacheUtils.evaluateFixedPathTemplate === 'function') {
        cycles = fixedTemplates
          .map((template) => arbPathTemplateCacheUtils.evaluateFixedPathTemplate(template, filteredEdges, aliasRules))
          .filter(Boolean)
          .sort((left, right) => Number(right && right.profitRate) - Number(left && left.profitRate))
          .slice(0, Math.max(1, Number(rule.resultLimit) || 1));
      } else {
        if (!arbPathsApi || typeof arbPathsApi.findFixedPaths !== 'function') continue;
        cycles = arbPathsApi.findFixedPaths(filteredEdges, rule, aliasRules, {
          limit: Number(rule.resultLimit) || 1,
          preferredStartSymbols
        });
      }
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
