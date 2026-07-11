const assert = require('assert');

const { createArbPanelController } = require('../src/arb/arb-panel-controller');

let resetCount = 0;
let renderedHtml = '';
let broughtToFrontPanel = null;
let interactionSafeRendererOptions = null;
const contentListeners = {};
const openedOpportunities = [];
const openResultByOpportunityId = new Map();

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
  arbDiscovery: {
    getPanelSnapshot: () => ({
      configuredSpecialRules: [],
      fixedResults: [],
      globalCycles: [],
      specialResults: []
    })
  },
  arbDetailUtils: {
    formatDetailNumber: (value, precision) => Number(value).toFixed(precision),
    isArbRuleLeg: (leg) => Boolean(leg && leg.ruleLeg)
  },
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
  },
  interactionSafeRenderer: {
    createInteractionSafeHtmlRenderer(options) {
      interactionSafeRendererOptions = options;
      return {
        reset: () => { resetCount += 1; },
        update: (html) => { renderedHtml = html; }
      };
    }
  },
  arbAlertBridgeRuntime: {},
  getArbDetailController: () => null,
  getDashboardState: () => dashboardState,
  getQuoteMarketState: () => ({}),
  getQuoteMarketStateMap: () => ({}),
  isQuotePaused: () => false,
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
  refs: {
    arbPathWindow: panel,
    arbPathContent: panelContent,
    arbGlobalFilterElements: {}
  },
  setTimeout,
  clearTimeout,
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
assert.strictEqual(controller.buildLiveQuoteLabel('ethereum', 'USDC', 'USDT', ' spot'), 'Chain:ethereum:USDC->USDT spot');

assert.strictEqual(interactionSafeRendererOptions.trackFocus, false);
assert.strictEqual(interactionSafeRendererOptions.releaseTarget, documentImpl);
assert.deepStrictEqual(interactionSafeRendererOptions.releaseEventListenerOptions, { capture: true });

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
