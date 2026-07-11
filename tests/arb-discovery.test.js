const assert = require('assert');

const { buildMutedPathLegsSignature, createArbDiscovery } = require('../src/arb/arb-discovery');

const buildMutedKey = (entry) => [entry.quoteId, entry.direction, entry.pricingMode].join(':');
assert.notStrictEqual(
  buildMutedPathLegsSignature([
    { quoteId: 1, direction: 'forward', pricingMode: 'raw', expiresAt: 2000 }
  ], buildMutedKey),
  buildMutedPathLegsSignature([
    { quoteId: 1, direction: 'inverse', pricingMode: 'raw', expiresAt: 2000 }
  ], buildMutedKey)
);

let marketRevision = 1;
let marketRevisionBumps = 0;
let topologyBuildCount = 0;
let snapshotBuildCount = 0;
let globalEvaluationCount = 0;
let mutedPathLegs = [];

const dashboardState = [{
  id: 'usd',
  name: 'USD监控',
  quotes: [{ id: 1, chain: 'ethereum', showInverse: true }]
}];
const quoteStateById = new Map([[
  1,
  { fromSymbol: 'USDC', toSymbol: 'USDT', lastRawPrice: 1.001, inverseRawPrice: 0.999 }
]]);

const discovery = createArbDiscovery({
  arbCyclePriorityUtils: {
    buildPreferredCycleStartSymbols: (_aliases, priority) => priority
  },
  arbEquivalenceUtils: {
    DEFAULT_ASSET_EQUIVALENCE_GROUPS: [['USDT', 'USDT0']],
    buildAliasRulesFromGroups: (groups) => ({ groups })
  },
  arbFixedUtils: {
    filterEdgesForFixedRule: (_rule, edges) => edges
  },
  arbPathConfig: {
    watchItems: [
      { type: 'fixed-rule', ruleId: 'fixed:usd', title: 'USD' },
      { type: 'special-rule', ruleId: 'special:usd', title: 'USD special' }
    ]
  },
  arbPathConfigUtils: {
    resolveItemsBySelectors: require('../src/arb/arb-path-config-utils').resolveItemsBySelectors,
    getFixedRuleWatchItems: (config) => config.watchItems.filter((item) => item.type === 'fixed-rule'),
    getSpecialRuleWatchItems: (config) => config.watchItems.filter((item) => item.type === 'special-rule'),
    applySpecialRuleWatchItemsToRules: (rules) => rules
  },
  arbPaths: {
    buildEdges: () => [{ quoteId: 1, from: 'USDC', to: 'USDT', chain: 'ethereum', rate: 1.001 }],
    buildRuleEdges: () => [{ from: 'USDT0', to: 'USDT', chain: '规则', rate: 1, rule: true }],
    isMeaningfulPath: () => true
  },
  arbPathTemplateCacheUtils: {
    buildArbPathTopologyCacheKey: () => 'topology-key',
    buildTopologyEdges: () => [{ quoteId: 1, from: 'USDC', to: 'USDT', chain: 'ethereum', rate: 1 }],
    buildCycleTemplates: () => {
      topologyBuildCount += 1;
      return [{ id: 'global-template' }];
    },
    buildFixedPathTemplates: () => [{ id: 'fixed-template' }],
    evaluateCycleTemplate: () => {
      globalEvaluationCount += 1;
      return {
        legs: [{ quoteId: 1, from: 'USDC', to: 'USDT', chain: 'ethereum', rate: 1.001 }],
        profitRate: 0.001
      };
    },
    createArbPanelCache: require('../src/arb/arb-path-template-cache-utils').createArbPanelCache
  },
  arbRuleSnapshotUtils: {
    buildArbRuleSnapshot: ({ fixedRules, specialRules }) => {
      snapshotBuildCount += 1;
      return {
        fixedResults: fixedRules.map((rule) => ({ rule, cycles: [] })),
        fixedByRuleId: {},
        specialResults: specialRules.map((rule) => ({ rule, opportunities: [] })),
        specialByRuleId: {}
      };
    }
  },
  arbSpecialUtils: {},
  dashboardRuntimeUtils: {
    buildArbRuleSnapshotCacheKey: (_dashboard, revision) => `snapshot:${revision}`,
    buildQuoteMetaById: () => new Map([[1, { categoryName: 'USD监控' }]]),
    buildQuotesByCategoryName: () => new Map([['USD监控', dashboardState[0].quotes]])
  },
  fixedPathRules: [{ id: 'fixed:usd', title: 'USD', base: 'USDC', quote: 'USDT', steps: 2 }],
  getActiveMutedPathLegs: () => mutedPathLegs,
  getActiveQuotes: (quotes) => quotes,
  getArbCycleStartPriority: () => ['USDC'],
  getDashboardState: () => dashboardState,
  getQuoteMarketStateMap: () => quoteStateById,
  globalPathSourceSelectors: [0],
  mutedPathLegUtils: {
    buildMutedPathLegKey: buildMutedKey,
    filterMutedCycles: (cycles, muted) => muted.length ? [] : cycles,
    filterMutedPathLegs: (edges, muted) => muted.length ? [] : edges
  },
  now: () => 1000,
  quoteStateRuntime: {
    bumpMarketRevision: () => {
      marketRevision += 1;
      marketRevisionBumps += 1;
    },
    getMarketRevision: () => marketRevision
  },
  specialArbRules: [{ id: 'special:usd', title: 'USD special', categoryName: 'USD监控' }]
});

const first = discovery.getSnapshot();
assert.strictEqual(first.globalCycles, undefined);
assert.strictEqual(first.configuredSpecialRules.length, 1);
assert.strictEqual(discovery.getSnapshot(), first);
assert.strictEqual(topologyBuildCount, 1);
assert.strictEqual(snapshotBuildCount, 1);
assert.strictEqual(globalEvaluationCount, 0, '规则报警快照不应计算仅面板使用的全局路径');
const firstPanelSnapshot = discovery.getPanelSnapshot(first);
assert.strictEqual(firstPanelSnapshot.globalCycles.length, 1);
assert.strictEqual(discovery.getPanelSnapshot(first), firstPanelSnapshot);
assert.strictEqual(globalEvaluationCount, 1);
assert.deepStrictEqual(discovery.getAliasRules(), { groups: [['USDT', 'USDT0']] });

mutedPathLegs = [{
  quoteId: 1,
  direction: 'forward',
  pricingMode: 'raw',
  fromSymbol: 'USDC',
  toSymbol: 'USDT',
  expiresAt: 2000
}];
const muted = discovery.getSnapshot();
assert.notStrictEqual(muted, first);
assert.strictEqual(muted.globalCycles, undefined);
assert.strictEqual(discovery.getPanelSnapshot(muted).globalCycles.length, 0);
assert.strictEqual(topologyBuildCount, 1, 'muted 投影变化不应重建 topology');
assert.strictEqual(snapshotBuildCount, 2);

discovery.invalidate({ bumpRevision: false });
assert.strictEqual(marketRevisionBumps, 0);
assert.notStrictEqual(discovery.getSnapshot(), muted);

discovery.invalidate();
assert.strictEqual(marketRevisionBumps, 1);
discovery.getSnapshot();

discovery.clearTopology();
discovery.getSnapshot();
assert.strictEqual(topologyBuildCount, 2);
