const assert = require('assert');

const { createArbPanelController } = require('../src/arb/arb-panel-controller');

let ruleSnapshotCleared = 0;
let topologyCleared = 0;
let marketRevisionBumps = 0;
let resetCount = 0;
let renderedHtml = '';
let broughtToFrontPanel = null;
let aliasRulesBuildCount = 0;
let arbPanelDeferralOptions = null;
let stableRendererOptions = null;
let contentInteractionHolding = false;
let sharedInteractionHolding = false;
const contentListeners = {};
const openedOpportunities = [];
const openResultByOpportunityId = new Map();
const sharedInteractionRuntime = {
  addIdleListener: () => true,
  shouldDeferRender: () => sharedInteractionHolding
};

const arbPanelCache = {
  getRuleSnapshot() {
    return null;
  },
  getTopology() {
    return null;
  },
  setRuleSnapshot(_key, value) {
    return value;
  },
  setTopology(_key, value) {
    return value;
  },
  clearRuleSnapshot() {
    ruleSnapshotCleared += 1;
  },
  clearTopology() {
    topologyCleared += 1;
  }
};

const panelContent = {
  textContent: '',
  contains: () => true,
  addEventListener: (type, handler) => {
    contentListeners[type] = handler;
  }
};
const panel = { style: { display: 'none' } };
const documentImpl = { activeElement: null };
const dashboardState = [{
  name: 'USD监控',
  quotes: [{ id: 42, chain: 'ethereum', fromToken: 'USDC', toToken: 'USDT' }]
}];

const controller = createArbPanelController({
  arbCyclePriorityUtils: {
    buildPreferredCycleStartSymbols: (_aliasRules, priority) => priority
  },
  arbDetailUtils: {
    formatDetailNumber: (value, precision) => Number(value).toFixed(precision),
    isArbRuleLeg: (leg) => Boolean(leg && leg.ruleLeg)
  },
  arbEquivalenceUtils: {
    DEFAULT_ASSET_EQUIVALENCE_GROUPS: [['USDT', 'USDT0']],
    buildAliasRulesFromGroups: (groups) => {
      aliasRulesBuildCount += 1;
      return { groups };
    }
  },
  arbFixedUtils: {},
  arbOpportunityHighlightRuntime: {
    isHighlighted: () => false
  },
  arbOpportunityRuntime: {
    getOpportunity: () => null,
    setPanelOpportunities: () => {}
  },
  arbPanelLayoutUtils: {
    buildArbPathLegLine: (leg, options) => options.formatLegLine({
      chainLabel: options.formatChainLabel(leg.chain),
      from: leg.from,
      to: leg.to,
      rate: leg.rate
    }),
    buildArbPanelColumns: ({ quoteSection, globalSection }) => [
      quoteSection ? [quoteSection] : [],
      [],
      [],
      globalSection ? [globalSection] : []
    ],
    buildFixedArbSections: () => [],
    buildGlobalArbFilterCriteria: () => ({}),
    buildGlobalArbFilterWritePlan: () => ({}),
    buildGlobalArbSection: () => ({ title: '全局路径', opportunities: [] }),
    buildQuotePriceWatchSection: (options) => ({
      title: '关注列表',
      opportunities: options.watchItems.map((item) => ({ title: item.title }))
    }),
    buildSpecialArbSections: () => [],
    applyGlobalArbFilterWritePlan: () => {},
    resolveItemsBySelectors: () => [],
    createGlobalArbFilterStateRuntime: () => ({
      get: () => ({}),
      update: () => ({ changed: false }),
      clear: () => ({ changed: false })
    })
  },
  arbPanelRenderer: {
    applyArbPanelErrorText: (contentEl, errorText) => {
      contentEl.textContent = errorText;
    },
    renderArbGrid: ({ columns }) => columns.flat().map((section) => section.title).join('|'),
    resolveArbPathContentClickAction: (event) => event.action || { type: 'none' },
    resolveArbPathContentKeydownAction: (event) => event.action || { type: 'none' },
    resolveArbPathContentPointerDownAction: (event) => event.action || { type: 'none' }
  },
  arbPathConfig: {
    watchItems: [
      { title: 'USD 关注', type: 'quote-price', quoteId: 42, direction: 'forward' }
    ]
  },
  arbPathConfigUtils: {
    getFixedRuleWatchItems: () => [],
    getQuotePriceWatchItems: (config) => config.watchItems,
    getSpecialRuleWatchItems: () => [],
    resolveQuotePriceValue: () => 1
  },
  arbPaths: {
    buildEdges: () => [],
    buildRuleEdges: () => [],
    formatLegLine: (line) => `${line.chainLabel}:${line.from}->${line.to}@${line.rate}`,
    isMeaningfulPath: () => true,
    formatProfitWanfen: (profitRate) => String(profitRate)
  },
  arbPathTemplateCacheUtils: {
    buildArbPathTopologyCacheKey: () => 'topology',
    buildCycleTemplates: () => [],
    buildFixedPathTemplates: () => [],
    buildTopologyEdges: () => [],
    createArbPanelCache: () => arbPanelCache
  },
  arbRuleSnapshotUtils: {
    buildArbRuleSnapshot: () => ({
      fixedResults: [],
      specialResults: []
    })
  },
  arbRuntimeMemoryUtils: {
    createArbPanelUpdateRuntime: (options) => ({
      clearDirty: () => true,
      isDirty: () => true,
      markDirty: () => true,
      schedule: () => {
        options.update();
        return true;
      }
    })
  },
  arbSpecialUtils: {},
  chainDefaults: {
    getChainDisplayName: (chain) => `Chain:${chain}`,
    normalizeChainFilterToken: (chain) => String(chain || '').toLowerCase()
  },
  dashboardRuntimeUtils: {
    buildArbRuleSnapshotCacheKey: () => 'snapshot',
    buildQuoteMetaById: () => new Map(),
    buildQuotesByCategoryName: () => new Map(),
    findDashboardQuoteMatchById: (categories, quoteId) => categories.flatMap((category) => category.quotes || []).find((quote) => quote.id === quoteId) || null,
    isPanelVisible: () => true
  },
  documentImpl,
  domRenderUtils: {
    applyFloatingPanelDisplayState: (targetPanel, action) => ({
      action,
      panelFound: Boolean(targetPanel),
      shouldBringToFront: true,
      shouldRender: true
    }),
    applyFloatingPanelViewportHeight: (targetPanel, height, options) => {
      targetPanel.maxHeight = `${height - options.minHeight}px`;
    },
    createRenderInteractionDeferralRuntime: (options) => {
      arbPanelDeferralOptions = options;
      return {
        bind: () => true,
        shouldDeferRender: () => (
          contentInteractionHolding
          || Boolean(options.interactionRuntime && options.interactionRuntime.shouldDeferRender())
        )
      };
    },
    createStableHtmlRenderer: (options) => {
      stableRendererOptions = options;
      return {
        reset: () => { resetCount += 1; },
        render: (_contentEl, html) => { renderedHtml = html; }
      };
    },
    shouldDeferRenderWhileFocused: (element, options) => Boolean(
      element && typeof element.contains === 'function' && element.contains(options && options.documentImpl && options.documentImpl.activeElement)
    )
  },
  fixedPathRules: [],
  getActiveQuotes: (quotes) => quotes,
  arbAlertBridgeRuntime: {},
  getArbCycleStartPriority: () => ['cbBTC'],
  getArbDetailController: () => null,
  getDashboardState: () => dashboardState,
  getQuoteMarketState: () => ({}),
  getQuoteMarketStateMap: () => ({}),
  globalPathSourceSelectors: [],
  interactionRuntime: sharedInteractionRuntime,
  isQuotePaused: () => false,
  mutedPathLegUtils: {
    filterMutedCycles: (cycles) => cycles,
    filterMutedPathLegs: (legs) => legs
  },
  openArbDetailModal: (opportunityId) => {
    openedOpportunities.push(opportunityId);
    return openResultByOpportunityId.has(opportunityId)
      ? openResultByOpportunityId.get(opportunityId)
      : true;
  },
  pathAlertPageUtils: {
    buildPathAlertQuoteLabel: ({ chain, fromSymbol, toSymbol, suffix, formatChainLabel }) => (
      `${formatChainLabel(chain)}:${fromSymbol}->${toSymbol}${suffix}`
    )
  },
  pathAlertRuleDefinitions: {},
  quoteDisplayUtils: {
    formatCexBookValue: (value) => String(value)
  },
  quoteStateRuntime: {
    bumpMarketRevision: () => { marketRevisionBumps += 1; },
    getMarketRevision: () => 1
  },
  refs: {
    arbPathWindow: panel,
    arbPathContent: panelContent,
    arbGlobalFilterElements: {}
  },
  setTimeout,
  clearTimeout,
  specialArbRules: [],
  updateDelayMs: 0,
  windowImpl: { innerHeight: 900, getComputedStyle: () => ({ display: 'none' }) },
  zIndexRuntime: {
    bringToFront: (targetPanel) => { broughtToFrontPanel = targetPanel; }
  },
  buildQuoteAlertDisplayLabel: () => 'quote label'
});

assert.strictEqual(controller.formatChainLabel('ethereum'), 'Chain:ethereum');
assert.strictEqual(
  controller.formatArbPathLegLine({ chain: 'ethereum', from: 'USDC', to: 'USDT', rate: 1 }),
  'Chain:ethereum:USDC->USDT@1'
);
assert.strictEqual(controller.formatDetailNumber(1.23456, 2), '1.23');
assert.strictEqual(controller.findQuoteById(42), dashboardState[0].quotes[0]);
assert.deepStrictEqual(controller.getAliasRules(), { groups: [['USDT', 'USDT0']] });
assert.strictEqual(controller.getAliasRules(), controller.getAliasRules());
assert.strictEqual(aliasRulesBuildCount, 1);
assert.strictEqual(controller.buildLiveQuoteLabel('ethereum', 'USDC', 'USDT', ' spot'), 'Chain:ethereum:USDC->USDT spot');

assert.strictEqual(arbPanelDeferralOptions.trackFocus, false);
documentImpl.activeElement = { id: 'focused-opportunity' };
contentInteractionHolding = false;
sharedInteractionHolding = true;
assert.strictEqual(stableRendererOptions.shouldDeferRender(panelContent, '<next>'), false);
sharedInteractionHolding = false;
assert.strictEqual(stableRendererOptions.shouldDeferRender(panelContent, '<next>'), false);
contentInteractionHolding = true;
assert.strictEqual(stableRendererOptions.shouldDeferRender(panelContent, '<next>'), true);
contentInteractionHolding = false;
documentImpl.activeElement = null;

controller.invalidateRuleSnapshotCache();
assert.strictEqual(marketRevisionBumps, 1);
assert.strictEqual(ruleSnapshotCleared, 1);
controller.invalidateRuleSnapshotCache({ bumpRevision: false });
assert.strictEqual(marketRevisionBumps, 1);
assert.strictEqual(ruleSnapshotCleared, 2);
controller.clearTopologyCache();
assert.strictEqual(topologyCleared, 1);

controller.update({ force: true });
assert.strictEqual(resetCount, 0);
assert.strictEqual(panelContent.textContent, '');
assert.strictEqual(renderedHtml, '关注列表|全局路径');

controller.bindContentEvents();
openResultByOpportunityId.set('stale-opportunity', false);
openedOpportunities.length = 0;
contentListeners.pointerdown({ action: { type: 'open-opportunity', opportunityId: 'stale-opportunity' } });
contentListeners.click({ action: { type: 'open-opportunity', opportunityId: 'stale-opportunity' } });
assert.deepStrictEqual(openedOpportunities, ['stale-opportunity', 'stale-opportunity']);

openResultByOpportunityId.set('live-opportunity', true);
openedOpportunities.length = 0;
contentListeners.pointerdown({ action: { type: 'open-opportunity', opportunityId: 'live-opportunity' } });
contentListeners.click({ action: { type: 'open-opportunity', opportunityId: 'live-opportunity' } });
assert.deepStrictEqual(openedOpportunities, ['live-opportunity']);

const displayResult = controller.applyFloatingPanelDisplay(panel, 'toggle', {
  render: () => { renderedHtml = 'rendered'; }
});
assert.strictEqual(displayResult.panelFound, true);
assert.strictEqual(broughtToFrontPanel, panel);
assert.strictEqual(renderedHtml, 'rendered');

controller.setMaxHeight();
assert.strictEqual(panel.maxHeight, '700px');
