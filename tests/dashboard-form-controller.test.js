const assert = require('assert');

const { createDashboardFormController } = require('../src/dashboard/dashboard-form-controller');
const dashboardRuntimeUtils = require('../src/dashboard/dashboard-runtime-utils');

function createElement(name, calls) {
  return {
    name,
    listeners: [],
    appended: [],
    addEventListener(type, handler) {
      this.listeners.push([type, handler]);
      calls.push(['bind', name, type]);
    },
    appendChild(child) {
      this.appended.push(child);
      calls.push(['appendChild', name, child && child.name]);
    }
  };
}

function createDashboardRenderer(overrides = {}) {
  return {
    resolveQuoteSettingsModalClickAction: () => ({ type: 'none' }),
    resolveAddCategoryModalClickAction: () => ({ type: 'none' }),
    resolveAddQuoteModalClickAction: () => ({ type: 'none' }),
    buildQuoteSettingsUpdatePlan: () => ({
      updates: { preferredSource: 'Auto', showInverse: false },
      deletes: ['kyberOnlyDirectPools', 'kyberExcludedSources'],
      requestChannelChanged: true,
      shouldQueueRefreshQuote: true
    }),
    readAddCategoryFormValues: (values) => values,
    buildAddCategoryDraft: (values) => ({ id: values.categoryId, name: values.name, quotes: [] }),
    buildAddQuoteFormViewState: () => ({}),
    buildAddQuoteDraft: (values) => ({ id: values.quoteId, chain: values.chain, fromToken: values.fromToken, toToken: values.toToken }),
    ...overrides
  };
}

function createBaseDeps(overrides = {}) {
  const calls = [];
  const dashboardState = overrides.dashboardState || [{ id: 'cat-1', quotes: [] }];
  const quoteSettingsModal = createElement('quoteSettingsModal', calls);
  const addCategoryModal = createElement('addCategoryModal', calls);
  const addQuoteModal = createElement('addQuoteModal', calls);
  const dashboardEl = createElement('dashboard', calls);
  const quoteListEl = createElement('quoteList', calls);

  const deps = {
    addCategoryModal,
    addCategoryModalRefs: {},
    addQuoteChainSelect: createElement('addQuoteChainSelect', calls),
    addQuoteInputs: [createElement('fromInput', calls), createElement('toInput', calls)],
    addQuoteModal,
    addQuoteModalRefs: {},
    addQuoteModalSelectionRuntime: {
      get: () => 'cat-1',
      clear: () => calls.push(['clearAddQuoteSelection'])
    },
    addQuoteToChainSelect: createElement('addQuoteToChainSelect', calls),
    closeAddCategoryModal: () => calls.push(['closeAddCategoryModal']),
    closeQuoteSettingsModal: () => calls.push(['closeQuoteSettingsModal']),
    createCategoryModule: (category) => ({ name: `category-${category.id}` }),
    createQuoteItem: (quote, categoryId) => ({ name: `quote-${categoryId}-${quote.id}` }),
    dashboardEl,
    dashboardModalUtils: {
      readQuoteSettingsFormValues: () => ({
        sourceValue: 'Auto',
        kyberExcludedSourcesInput: 'curve uniswap-v3',
        showInverse: false,
        requestChannelId: 'fast'
      }),
      readAddCategoryFormValues: () => ({ name: '新增分区' }),
      readAddQuoteFormValues: () => ({ chain: 'ethereum', fromToken: 'USDC', toToken: 'USDT' }),
      resetAddQuoteModal: (refs, options) => {
        calls.push(['resetAddQuoteModal']);
        options.syncControls();
      },
      applyChainSelectDisplayLabels: (refs, options) => {
        calls.push(['applyChainSelectDisplayLabels', refs === deps.addQuoteModalRefs, options.formatChainLabel('arbitrum')]);
      },
      syncAddQuoteFormControls: () => calls.push(['syncAddQuoteFormControls'])
    },
    dashboardRenderer: createDashboardRenderer(),
    dashboardRuntimeUtils,
    defaultSourceResolver: () => 'Kyber',
    deleteQuoteFromCategory: (categoryId, quoteId) => calls.push(['deleteQuoteFromCategory', categoryId, quoteId]),
    documentImpl: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        return quoteListEl;
      }
    },
    getDashboardState: () => dashboardState,
    isCexOrderbookChain: () => false,
    isCrossChainQuote: () => false,
    isEvmChain: () => true,
    formatChainLabel: (chain) => (chain === 'arbitrum' ? 'arb' : chain),
    normalizeChainKey: (chain) => chain,
    nowMs: () => 2000,
    pathAlertPageUtils: {
      buildPathAlertsPageHref: ({ filterQuoteId }) => `/path-alerts?quote=${filterQuoteId}`
    },
    queueQuoteRefresh: (quote, options) => calls.push(['queueQuoteRefresh', quote.id, options || null]),
    quoteRequestChannelSelect: {},
    quoteSettingsModal,
    quoteSettingsModalElements: {},
    quoteSettingsSelectionRuntime: {
      get: () => null
    },
    quoteSourceSelect: { value: 'Kyber', addEventListener: (type, handler) => calls.push(['bind', 'quoteSourceSelect', type, handler]) },
    removeFromQueue: (quoteId) => calls.push(['removeFromQueue', quoteId]),
    requestChannelUtils: {
      supportsRequestChannelForQuote: () => true
    },
    saveData: () => calls.push(['saveData']),
    showConfirmation: (message, callback) => {
      calls.push(['confirm', message]);
      callback();
    },
    swapQuoteTokens: (categoryId, quoteId) => calls.push(['swapQuoteTokens', categoryId, quoteId]),
    syncKyberExcludedSourcesControl: (quote, source) => calls.push(['syncKyberExcludedSourcesControl', quote && quote.id, source]),
    updateCategoryPauseButtonState: (categoryId) => calls.push(['updateCategoryPauseButtonState', categoryId]),
    updateRequestChannelTagForQuote: (quote) => calls.push(['updateRequestChannelTagForQuote', quote.id]),
    windowImpl: {
      open: (href, target, rel) => calls.push(['open', href, target, rel])
    },
    ...overrides.deps
  };

  return { calls, dashboardState, deps, quoteListEl };
}

{
  const quote = { id: 101, preferredSource: 'Kyber', showInverse: true, kyberOnlyDirectPools: true, kyberExcludedSources: ['curve'] };
  const { calls, deps } = createBaseDeps({
    deps: {
      dashboardRenderer: {
        ...createDashboardRenderer(),
        resolveQuoteSettingsModalClickAction: () => ({ type: 'save' })
      },
      quoteSettingsSelectionRuntime: {
        get: () => ({ categoryId: 'cat-1', quote })
      }
    }
  });
  const controller = createDashboardFormController(deps);
  controller.handleQuoteSettingsModalClick({});
  assert.deepStrictEqual(quote, { id: 101, preferredSource: 'Auto', showInverse: false });
  assert.deepStrictEqual(
    calls.filter((call) => ['updateRequestChannelTagForQuote', 'removeFromQueue', 'queueQuoteRefresh', 'saveData', 'closeQuoteSettingsModal'].includes(call[0])),
    [
      ['updateRequestChannelTagForQuote', 101],
      ['removeFromQueue', 101],
      ['queueQuoteRefresh', 101, { clearInverse: true }],
      ['saveData'],
      ['closeQuoteSettingsModal']
    ]
  );
}

{
  const quote = { id: 102, chain: 'ethereum', preferredSource: 'Kyber' };
  const normalizeChainKey = (chain) => String(chain || '').trim().toLowerCase();
  let updatePlanOptions = null;
  const { deps } = createBaseDeps({
    deps: {
      normalizeChainKey,
      dashboardRenderer: {
        ...createDashboardRenderer(),
        resolveQuoteSettingsModalClickAction: () => ({ type: 'save' }),
        buildQuoteSettingsUpdatePlan: (options) => {
          updatePlanOptions = options;
          return {
            updates: {},
            deletes: [],
            requestChannelChanged: false,
            shouldQueueRefreshQuote: false
          };
        }
      },
      quoteSettingsSelectionRuntime: {
        get: () => ({ categoryId: 'cat-1', quote })
      }
    }
  });
  const controller = createDashboardFormController(deps);
  controller.handleQuoteSettingsModalClick({});
  assert.strictEqual(updatePlanOptions.normalizeChainKey, normalizeChainKey);
}

{
  const { calls, dashboardState, deps } = createBaseDeps({
    deps: {
      dashboardRenderer: {
        ...createDashboardRenderer(),
        resolveAddCategoryModalClickAction: () => ({ type: 'save' })
      }
    }
  });
  const controller = createDashboardFormController(deps);
  controller.handleAddCategoryModalClick({});
  assert.deepStrictEqual(dashboardState.map((category) => category.id), ['cat-1', 2000]);
  assert.deepStrictEqual(
    calls.filter((call) => ['appendChild', 'saveData', 'closeAddCategoryModal'].includes(call[0])),
    [
      ['appendChild', 'dashboard', 'category-2000'],
      ['saveData'],
      ['closeAddCategoryModal']
    ]
  );
}

{
  const { calls, dashboardState, deps, quoteListEl } = createBaseDeps({
    deps: {
      dashboardRenderer: {
        ...createDashboardRenderer(),
        resolveAddQuoteModalClickAction: () => ({ type: 'save' })
      }
    }
  });
  const controller = createDashboardFormController(deps);
  controller.handleAddQuoteModalClick({});
  assert.deepStrictEqual(dashboardState[0].quotes.map((quote) => quote.id), [2000]);
  assert.deepStrictEqual(quoteListEl.appended.map((node) => node.name), ['quote-cat-1-2000']);
  assert.deepStrictEqual(
    calls.filter((call) => ['updateCategoryPauseButtonState', 'saveData', 'queueQuoteRefresh', 'clearAddQuoteSelection', 'resetAddQuoteModal', 'syncAddQuoteFormControls'].includes(call[0])),
    [
      ['updateCategoryPauseButtonState', 'cat-1'],
      ['saveData'],
      ['queueQuoteRefresh', 2000, null],
      ['clearAddQuoteSelection'],
      ['resetAddQuoteModal'],
      ['syncAddQuoteFormControls']
    ]
  );
}

{
  const { calls, deps } = createBaseDeps();
  const controller = createDashboardFormController(deps);
  controller.bind();
  assert.ok(calls.some((call) => call[0] === 'bind' && call[1] === 'quoteSettingsModal' && call[2] === 'click'));
  assert.ok(calls.some((call) => call[0] === 'applyChainSelectDisplayLabels' && call[1] === true && call[2] === 'arb'));
  assert.ok(calls.some((call) => call[0] === 'bind' && call[1] === 'addQuoteChainSelect' && call[2] === 'change'));
  assert.ok(calls.some((call) => call[0] === 'bind' && call[1] === 'fromInput' && call[2] === 'input'));
}
