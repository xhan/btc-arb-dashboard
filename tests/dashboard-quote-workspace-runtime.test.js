const assert = require('assert');

const {
  createDashboardQuoteWorkspaceRuntime
} = require('../src/app/dashboard-quote-workspace-runtime');

const calls = [];
let domainOptions = null;
let uiOptions = null;
let quoteRuntimeOptions = null;
let refValue = null;

const quoteDomainAdapter = {
  getActiveQuotes: () => [{ id: 1 }],
  getCategoryPauseAction: () => 'category-pause',
  getDefaultSourceForChain: (chain) => `default:${chain}`,
  getQuoteChainDisplayName: (quote) => `chain:${quote.chain}`,
  isCexOrderbookChain: (chain) => chain === 'binance',
  isCrossChainQuote: (quote) => Boolean(quote.toChain),
  isEvmChain: (chain) => chain === 'ethereum',
  isQuotePaused: (quote) => Boolean(quote.paused),
  normalizeChainKey: (chain) => String(chain || '').toLowerCase(),
  shouldQueueInverseFetch: () => true
};

const quoteUiController = {
  applyActiveQuoteUiState: () => calls.push(['activeUi']),
  applyPausedQuoteUiState: () => calls.push(['pausedUi']),
  applyQuoteDisplayToggleButtonState: () => calls.push(['displayToggleState']),
  copyDexLinkFromElement: () => 'copy-dex',
  copyPriceText: () => 'copy-price',
  copyTextToClipboard: () => 'copy-text',
  getInverseQuoteDisplayText: () => 'inverse-text',
  getQuoteDisplayMode: () => 'rate',
  getQuoteDisplayText: () => 'quote-text',
  handleQuoteHover: () => 'hover',
  showCopyToast: () => 'toast',
  toggleQuoteDisplayMode: () => 'toggle-display',
  updateQuotePairLabel: () => 'pair-label',
  updateTrendArrow: () => 'trend-arrow'
};

const quoteRuntime = {
  activeFetchControllerRuntime: { id: 'active-fetch' },
  addToQueue: () => 'add',
  queueQuoteRefresh: () => 'refresh',
  removeFromQueue: () => 'remove',
  toggleMultiChannel: () => 'toggle-multi'
};

const modules = {
  getChainDefaults: () => ({ id: 'chain-defaults' }),
  getCopyUtils: () => ({ id: 'copy-utils' }),
  getDashboardQuoteDomainAdapter: () => ({
    createDashboardQuoteDomainAdapter(options = {}) {
      calls.push(['createDomain']);
      domainOptions = options;
      return quoteDomainAdapter;
    }
  }),
  getDashboardQuoteRuntime: () => ({
    createDashboardQuoteRuntime(options = {}) {
      calls.push(['createQuoteRuntime']);
      quoteRuntimeOptions = options;
      return quoteRuntime;
    }
  }),
  getDexLinkUtils: () => ({ id: 'dex-link-utils' }),
  getQueueStatsUtils: () => ({ id: 'queue-stats-utils' }),
  getQuoteDisplayUtils: () => ({ id: 'quote-display-utils' }),
  getQuoteFetchController: () => ({ id: 'quote-fetch-controller' }),
  getQuotePauseUtils: () => ({ id: 'quote-pause-utils' }),
  getQuoteQueueRuntimeUtils: () => ({ id: 'quote-queue-runtime-utils' }),
  getQuoteRequestUtils: () => ({ id: 'quote-request-utils' }),
  getQuoteUiController: () => ({
    createQuoteUiController(options = {}) {
      calls.push(['createQuoteUi']);
      uiOptions = options;
      return quoteUiController;
    }
  }),
  getRequestChannelUtils: () => ({ id: 'request-channel-utils' })
};

function AbortController() {}

const runtime = createDashboardQuoteWorkspaceRuntime({
  modules,
  constants: {
    defaultIntervals: { main: 1000 },
    initialQuoteDisplayMode: 'rate'
  },
  deps: {
    AbortController,
    backendUrl: 'http://127.0.0.1:3000',
    dashboardRuntimeUtils: { id: 'dashboard-runtime-utils' },
    documentImpl: { id: 'document' },
    domRenderUtils: { id: 'dom-render-utils' },
    fetchImpl: () => {},
    getApiIntervals: () => ({ main: 1500 }),
    getDashboardState: () => [{ quotes: [{ id: 1 }] }],
    getEffectiveRequestChannelIdForQuote: () => 'default',
    getQuoteMarketState: () => ({ lastRawPrice: 1 }),
    isDashboardUiActive: () => true,
    logger: { warn: (...args) => calls.push(['warn', args]) },
    markDashboardUiDirty: () => calls.push(['markDirty']),
    onQuoteMainFetchSuccess: (quote, context) => calls.push(['mainSuccess', quote.id, context && context.source]),
    onQuoteMarketStateChanged: (quote, state, context) => calls.push(['marketChanged', quote.id, state && state.lastRawPrice, context && context.mode]),
    onQuoteMarketStateChangedSideEffect: (quote, state, context) => calls.push(['marketSideEffect', quote.id, state && state.lastRawPrice, context && context.mode]),
    quoteRuntimeRef: {
      set(value) {
        calls.push(['setQuoteRuntimeRef']);
        refValue = value;
        return value;
      }
    },
    quoteStateRuntime: { id: 'quote-state-runtime' },
    requestChannelRuntime: { id: 'request-channel-runtime' },
    setQuoteMarketState: () => calls.push(['setMarketState']),
    setTimeout,
    clearTimeout
  },
  refs: {
    copyToast: { id: 'copy-toast' },
    globalTooltip: { id: 'global-tooltip' },
    toggleQuoteDisplayBtn: { id: 'toggle-quote-display' }
  }
});

assert.deepStrictEqual(calls.slice(0, 4), [
  ['createDomain'],
  ['createQuoteUi'],
  ['createQuoteRuntime'],
  ['setQuoteRuntimeRef']
]);
assert.strictEqual(refValue, quoteRuntime);
assert.strictEqual(runtime.quoteDomainAdapter, quoteDomainAdapter);
assert.strictEqual(runtime.quoteUiController, quoteUiController);
assert.strictEqual(runtime.quoteRuntime, quoteRuntime);
assert.strictEqual(runtime.activeFetchControllerRuntime.id, 'active-fetch');

assert.strictEqual(domainOptions.chainDefaults.id, 'chain-defaults');
assert.strictEqual(domainOptions.queueStatsUtils.id, 'queue-stats-utils');
assert.strictEqual(domainOptions.quotePauseUtils.id, 'quote-pause-utils');
assert.strictEqual(domainOptions.quoteRequestUtils.id, 'quote-request-utils');

assert.strictEqual(uiOptions.copyToast.id, 'copy-toast');
assert.strictEqual(uiOptions.globalTooltip.id, 'global-tooltip');
assert.strictEqual(uiOptions.toggleQuoteDisplayBtn.id, 'toggle-quote-display');
assert.strictEqual(uiOptions.initialQuoteDisplayMode, 'rate');
assert.strictEqual(uiOptions.quoteStateRuntime.id, 'quote-state-runtime');
assert.strictEqual(uiOptions.quoteDisplayUtils.id, 'quote-display-utils');
assert.strictEqual(uiOptions.copyUtils.id, 'copy-utils');

assert.strictEqual(quoteRuntimeOptions.backendUrl, 'http://127.0.0.1:3000');
assert.strictEqual(quoteRuntimeOptions.defaultIntervals.main, 1000);
assert.strictEqual(quoteRuntimeOptions.quoteFetchControllerUtils.id, 'quote-fetch-controller');
assert.strictEqual(quoteRuntimeOptions.quoteQueueRuntimeUtils.id, 'quote-queue-runtime-utils');
assert.strictEqual(quoteRuntimeOptions.requestChannelRuntime.id, 'request-channel-runtime');
assert.strictEqual(quoteRuntimeOptions.shouldQueueInverseFetch({ id: 1 }), true);
assert.strictEqual(quoteRuntimeOptions.getQuoteDisplayMode(), 'rate');
assert.strictEqual(quoteRuntimeOptions.getQuoteDisplayText(), 'quote-text');
assert.strictEqual(quoteRuntimeOptions.getInverseQuoteDisplayText(), 'inverse-text');
assert.strictEqual(quoteRuntimeOptions.isQuotePaused({ paused: true }), true);
assert.strictEqual(quoteRuntimeOptions.isSchedulerPaused(), false);
quoteRuntimeOptions.onQuoteMarketStateChanged({ id: 9 }, { lastRawPrice: 2 }, { mode: 'main' });
quoteRuntimeOptions.onQuoteMainFetchSuccess({ id: 10 }, { source: 'kyber' });

assert.strictEqual(runtime.defaultSourceResolver('Ethereum'), 'default:Ethereum');
assert.strictEqual(runtime.getQuoteDisplayMode(), 'rate');
assert.strictEqual(runtime.toggleQuoteDisplayMode(), 'toggle-display');
assert.strictEqual(runtime.copyDexLinkFromElement(), 'copy-dex');
assert.strictEqual(runtime.addToQueue(), 'add');
assert.strictEqual(runtime.queueQuoteRefresh(), 'refresh');
assert.strictEqual(runtime.removeFromQueue(), 'remove');
assert.strictEqual(runtime.toggleMultiChannel(), 'toggle-multi');
assert.ok(calls.some((call) => call[0] === 'marketChanged' && call[1] === 9 && call[2] === 2));
assert.ok(calls.some((call) => call[0] === 'marketSideEffect' && call[1] === 9 && call[3] === 'main'));
assert.ok(calls.some((call) => call[0] === 'mainSuccess' && call[1] === 10 && call[2] === 'kyber'));
