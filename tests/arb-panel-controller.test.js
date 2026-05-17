const assert = require('assert');

const { createArbPanelController } = require('../src/arb/arb-panel-controller');

let ruleSnapshotCleared = 0;
let topologyCleared = 0;
let marketRevisionBumps = 0;
let resetCount = 0;
let renderedHtml = '';
let broughtToFrontPanel = null;

const arbPanelCache = {
  clearRuleSnapshot() {
    ruleSnapshotCleared += 1;
  },
  clearTopology() {
    topologyCleared += 1;
  }
};

const panelContent = { textContent: '' };
const panel = { style: { display: 'none' } };
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
    buildAliasRulesFromGroups: (groups) => ({ groups })
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
    renderArbGrid: () => '<div>grid</div>'
  },
  arbPathConfig: {},
  arbPathConfigUtils: {},
  arbPaths: {
    formatLegLine: (line) => `${line.chainLabel}:${line.from}->${line.to}@${line.rate}`,
    isMeaningfulPath: () => true,
    formatProfitWanfen: (profitRate) => String(profitRate)
  },
  arbPathTemplateCacheUtils: {
    createArbPanelCache: () => arbPanelCache
  },
  arbRuleSnapshotUtils: {},
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
    buildQuoteMetaById: () => new Map(),
    findDashboardQuoteMatchById: (categories, quoteId) => categories.flatMap((category) => category.quotes || []).find((quote) => quote.id === quoteId) || null,
    isPanelVisible: () => true
  },
  documentImpl: { activeElement: null },
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
    createStableHtmlRenderer: () => ({
      reset: () => { resetCount += 1; },
      render: (_contentEl, html) => { renderedHtml = html; }
    })
  },
  fixedPathRules: [],
  getActiveQuotes: (quotes) => quotes,
  getAlertRuntimeController: () => null,
  getArbCycleStartPriority: () => ['cbBTC'],
  getArbDetailController: () => null,
  getDashboardState: () => dashboardState,
  getQuoteMarketState: () => ({}),
  getQuoteMarketStateMap: () => ({}),
  globalPathSourceSelectors: [],
  isQuotePaused: () => false,
  mutedPathLegUtils: {},
  openArbDetailModal: () => {},
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
assert.strictEqual(controller.buildLiveQuoteLabel('ethereum', 'USDC', 'USDT', ' spot'), 'Chain:ethereum:USDC->USDT spot');

controller.invalidateRuleSnapshotCache();
assert.strictEqual(marketRevisionBumps, 1);
assert.strictEqual(ruleSnapshotCleared, 1);
controller.invalidateRuleSnapshotCache({ bumpRevision: false });
assert.strictEqual(marketRevisionBumps, 1);
assert.strictEqual(ruleSnapshotCleared, 2);
controller.clearTopologyCache();
assert.strictEqual(topologyCleared, 1);

controller.update({ force: true });
assert.strictEqual(resetCount, 1);
assert.strictEqual(panelContent.textContent, '暂无可用路径');
assert.strictEqual(renderedHtml, '');

const displayResult = controller.applyFloatingPanelDisplay(panel, 'toggle', {
  render: () => { renderedHtml = 'rendered'; }
});
assert.strictEqual(displayResult.panelFound, true);
assert.strictEqual(broughtToFrontPanel, panel);
assert.strictEqual(renderedHtml, 'rendered');

controller.setMaxHeight();
assert.strictEqual(panel.maxHeight, '700px');
