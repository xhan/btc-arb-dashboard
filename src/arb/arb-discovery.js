(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbDiscovery = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildMutedPathLegsSignature(entries, buildLegKey) {
    const resolveKey = typeof buildLegKey === 'function'
      ? buildLegKey
      : (entry) => [entry && entry.quoteId, entry && entry.direction, entry && entry.pricingMode].join(':');
    return (Array.isArray(entries) ? entries : [])
      .map((entry) => {
        const key = String(resolveKey(entry) || '');
        return `${key}:${Number(entry && entry.expiresAt) || 0}`;
      })
      .sort()
      .join('|');
  }

  function createArbDiscovery(options = {}) {
    const templateUtils = options.arbPathTemplateCacheUtils;
    const cache = templateUtils.createArbPanelCache();
    const fixedPathRules = Array.isArray(options.fixedPathRules) ? options.fixedPathRules : [];
    const specialArbRules = Array.isArray(options.specialArbRules) ? options.specialArbRules : [];
    const arbPathConfig = options.arbPathConfig || {};
    const globalPathSourceSelectors = Array.isArray(options.globalPathSourceSelectors)
      ? options.globalPathSourceSelectors
      : [];
    const getDashboardState = typeof options.getDashboardState === 'function'
      ? options.getDashboardState
      : () => [];
    const getQuoteMarketStateMap = typeof options.getQuoteMarketStateMap === 'function'
      ? options.getQuoteMarketStateMap
      : () => new Map();
    const getActiveQuotes = typeof options.getActiveQuotes === 'function'
      ? options.getActiveQuotes
      : (quotes) => (Array.isArray(quotes) ? quotes : []);
    const getArbCycleStartPriority = typeof options.getArbCycleStartPriority === 'function'
      ? options.getArbCycleStartPriority
      : () => [];
    const getActiveMutedPathLegs = typeof options.getActiveMutedPathLegs === 'function'
      ? options.getActiveMutedPathLegs
      : () => [];
    const nowProvider = typeof options.now === 'function' ? options.now : Date.now;
    let cachedAliasRules = null;
    let cachedPanelSourceSnapshot = null;
    let cachedPanelSnapshot = null;

    function getDashboardCategories() {
      const dashboardState = getDashboardState();
      return Array.isArray(dashboardState) ? dashboardState : [];
    }

    function getAllDashboardQuotes() {
      return getDashboardCategories().flatMap((category) => (
        Array.isArray(category && category.quotes) ? category.quotes : []
      ));
    }

    function getCycleStartPriorityList() {
      const priority = getArbCycleStartPriority();
      return Array.isArray(priority) ? priority : [];
    }

    function getAliasRules() {
      if (!cachedAliasRules) {
        cachedAliasRules = options.arbEquivalenceUtils.buildAliasRulesFromGroups(
          options.arbEquivalenceUtils.DEFAULT_ASSET_EQUIVALENCE_GROUPS
        );
      }
      return cachedAliasRules;
    }

    function buildPreferredCycleStartSymbols(aliasRules, canonicalSymbol = 'cbBTC') {
      const priority = getCycleStartPriorityList();
      return options.arbCyclePriorityUtils.buildPreferredCycleStartSymbols(
        aliasRules,
        priority.length ? priority : [canonicalSymbol]
      );
    }

    function getFixedRuleWatchItems() {
      return options.arbPathConfigUtils.getFixedRuleWatchItems(arbPathConfig);
    }

    function getConfiguredFixedPathRules() {
      const watchItems = getFixedRuleWatchItems();
      if (!watchItems.length) return fixedPathRules;
      const rulesById = new Map(
        fixedPathRules.filter((rule) => rule && rule.id).map((rule) => [rule.id, rule])
      );
      return watchItems.map((item) => rulesById.get(item.ruleId)).filter(Boolean);
    }

    function getConfiguredSpecialArbRules() {
      return options.arbPathConfigUtils.applySpecialRuleWatchItemsToRules(
        specialArbRules,
        options.arbPathConfigUtils.getSpecialRuleWatchItems(arbPathConfig)
      );
    }

    function buildQuoteMetaById() {
      return options.dashboardRuntimeUtils.buildQuoteMetaById(getDashboardCategories());
    }

    function getTopology() {
      const dashboardState = getDashboardCategories();
      const quoteStateById = getQuoteMarketStateMap();
      const cacheKey = `${templateUtils.buildArbPathTopologyCacheKey(dashboardState, quoteStateById)}|${getCycleStartPriorityList().join(',')}`;
      const cachedTopology = cache.getTopology(cacheKey);
      if (cachedTopology) return cachedTopology;

      const aliasRules = getAliasRules();
      const preferredCycleStartSymbols = buildPreferredCycleStartSymbols(aliasRules);
      const ruleEdges = options.arbPaths.buildRuleEdges(aliasRules);
      const quoteMetaById = buildQuoteMetaById();
      const allQuotes = getActiveQuotes(getAllDashboardQuotes());
      const allTopologyEdges = templateUtils.buildTopologyEdges(allQuotes, quoteStateById, null);
      const allTopologyEdgesWithRules = allTopologyEdges.concat(ruleEdges);
      const fixedTemplatesByRuleId = {};
      const globalSourceCategories = options.arbPathConfigUtils.resolveItemsBySelectors(
        dashboardState,
        globalPathSourceSelectors
      );
      const globalSourceQuotes = getActiveQuotes(globalSourceCategories.flatMap((category) => (
        Array.isArray(category && category.quotes) ? category.quotes : []
      )));
      const globalEdges = templateUtils.buildTopologyEdges(globalSourceQuotes, quoteStateById, null);
      const globalTemplates = templateUtils.buildCycleTemplates(globalEdges.concat(ruleEdges), {
        maxDepth: 3,
        limit: Number.MAX_SAFE_INTEGER,
        acceptCycle: options.arbPaths.isMeaningfulPath,
        preferredStartSymbols: preferredCycleStartSymbols
      });

      for (const rule of getConfiguredFixedPathRules()) {
        if (!rule) continue;
        const filteredEdges = options.arbFixedUtils.filterEdgesForFixedRule(
          rule,
          allTopologyEdgesWithRules,
          quoteMetaById
        );
        fixedTemplatesByRuleId[rule.id] = templateUtils.buildFixedPathTemplates(
          filteredEdges,
          rule,
          aliasRules,
          {
            limit: Number(rule.resultLimit) || 1,
            preferredStartSymbols: preferredCycleStartSymbols
          }
        );
      }

      return cache.setTopology(cacheKey, { fixedTemplatesByRuleId, globalTemplates });
    }

    function getSnapshot() {
      const topology = getTopology();
      const dashboardState = getDashboardCategories();
      const quoteStateById = getQuoteMarketStateMap();
      const nowMs = Number(nowProvider());
      const mutedPathLegs = getActiveMutedPathLegs(nowMs);
      const cacheKey = [
        options.dashboardRuntimeUtils.buildArbRuleSnapshotCacheKey(
          dashboardState,
          options.quoteStateRuntime.getMarketRevision()
        ),
        buildMutedPathLegsSignature(
          mutedPathLegs,
          options.mutedPathLegUtils.buildMutedPathLegKey
        )
      ].join('|muted:');
      const cachedSnapshot = cache.getRuleSnapshot(cacheKey);
      if (cachedSnapshot) return cachedSnapshot;

      const aliasRules = getAliasRules();
      const allQuotes = getActiveQuotes(getAllDashboardQuotes());
      const allEdges = options.mutedPathLegUtils.filterMutedPathLegs(
        options.arbPaths.buildEdges(allQuotes, quoteStateById, null),
        mutedPathLegs,
        nowMs
      );
      const ruleEdges = options.arbPaths.buildRuleEdges(aliasRules);
      const allEdgesWithRules = allEdges.concat(ruleEdges);
      const quoteMetaById = buildQuoteMetaById();
      const quotesByCategoryName = options.dashboardRuntimeUtils.buildQuotesByCategoryName(
        dashboardState,
        getActiveQuotes
      );
      const configuredSpecialRules = getConfiguredSpecialArbRules();
      const baseSnapshot = options.arbRuleSnapshotUtils.buildArbRuleSnapshot({
        fixedRules: getConfiguredFixedPathRules(),
        specialRules: configuredSpecialRules,
        allEdgesWithRules,
        fixedTemplatesByRuleId: topology.fixedTemplatesByRuleId,
        quoteMetaById,
        quotesByCategoryName,
        quoteStateById,
        aliasRules,
        mutedPathLegs,
        mutedPathLegUtils: options.mutedPathLegUtils,
        preferredStartSymbols: buildPreferredCycleStartSymbols(aliasRules),
        arbPathsApi: options.arbPaths,
        arbFixedUtils: options.arbFixedUtils,
        arbSpecialUtils: options.arbSpecialUtils,
        nowMs
      });
      return cache.setRuleSnapshot(cacheKey, {
        ...baseSnapshot,
        aliasRules,
        allQuotes,
        allEdges,
        allEdgesWithRules,
        configuredSpecialRules,
        mutedPathLegs,
        quoteMetaById,
        quotesByCategoryName,
        ruleEdges
      });
    }

    function getPanelSnapshot(sharedSnapshot = getSnapshot()) {
      if (sharedSnapshot === cachedPanelSourceSnapshot && cachedPanelSnapshot) {
        return cachedPanelSnapshot;
      }
      const quoteStateById = getQuoteMarketStateMap();
      const nowMs = Number(nowProvider());
      const globalCycles = options.mutedPathLegUtils.filterMutedCycles(
        getTopology().globalTemplates
          .map((template) => templateUtils.evaluateCycleTemplate(template, quoteStateById))
          .filter(Boolean)
          .sort((left, right) => Number(right.profitRate) - Number(left.profitRate)),
        sharedSnapshot.mutedPathLegs,
        nowMs
      );
      cachedPanelSourceSnapshot = sharedSnapshot;
      cachedPanelSnapshot = { ...sharedSnapshot, globalCycles };
      return cachedPanelSnapshot;
    }

    function invalidate(config = {}) {
      if (config.bumpRevision !== false && options.quoteStateRuntime) {
        options.quoteStateRuntime.bumpMarketRevision();
      }
      cache.clearRuleSnapshot();
      cachedPanelSourceSnapshot = null;
      cachedPanelSnapshot = null;
    }

    function clearTopology() {
      cachedPanelSourceSnapshot = null;
      cachedPanelSnapshot = null;
      if (typeof cache.clearAll === 'function') {
        cache.clearAll();
        return;
      }
      cache.clearTopology();
      cache.clearRuleSnapshot();
    }

    return {
      clearTopology,
      getAliasRules,
      getPanelSnapshot,
      getSnapshot,
      invalidate
    };
  }

  return {
    buildMutedPathLegsSignature,
    createArbDiscovery
  };
}));
