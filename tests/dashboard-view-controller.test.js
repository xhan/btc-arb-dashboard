const assert = require('assert');

const { createDashboardViewController } = require('../src/dashboard/dashboard-view-controller');
const dashboardRuntimeUtils = require('../src/dashboard/dashboard-runtime-utils');

function createClassList() {
  const values = new Set();
  return {
    add(value) {
      values.add(value);
    },
    remove(value) {
      values.delete(value);
    },
    contains(value) {
      return values.has(value);
    },
    has(value) {
      return values.has(value);
    }
  };
}

function createElement(name) {
  return {
    name,
    id: '',
    draggable: false,
    textContent: '',
    title: '',
    dataset: {},
    listeners: {},
    children: [],
    classList: createClassList(),
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    appendChild(child) {
      this.children.push(child);
    },
    insertBefore(child, before) {
      this.inserted = { child, before };
    },
    setAttribute(key, value) {
      this[key] = value;
    },
    querySelector(selector) {
      return this.refs ? this.refs[selector] || null : null;
    }
  };
}

function createQuoteItemShell(quoteId) {
  const itemEl = createElement(`quote-${quoteId}`);
  itemEl.id = `quote-item-${quoteId}`;
  const labelStackEl = createElement(`label-${quoteId}`);
  const textWrapperEl = createElement(`text-wrapper-${quoteId}`);
  const quoteTextEl = createElement(`quote-text-${quoteId}`);
  quoteTextEl.textContent = `price-${quoteId}`;
  itemEl.refs = {
    '.quote-label-stack': labelStackEl,
    '.quote-text-wrapper': textWrapperEl,
    [`#quote-text-${quoteId}`]: quoteTextEl
  };
  return itemEl;
}

function createBaseDeps(overrides = {}) {
  const calls = [];
  const dashboardState = Object.prototype.hasOwnProperty.call(overrides, 'dashboardState')
    ? overrides.dashboardState
    : [{
    id: 1,
    name: '主区',
    quotes: [
      { id: 101, chain: 'ethereum', fromToken: '0xfrom', toToken: '0xto', amount: 2 },
      { id: 102, chain: 'ethereum', fromToken: '0xfrom2', toToken: '0xto2', amount: 3 }
    ]
  }];
  const dashboardEl = createElement('dashboard');
  const draggedNode = createElement('draggedNode');
  const targetNode = createElement('targetNode');
  targetNode.nextSibling = createElement('afterTarget');
  const listEl = createElement('quoteList');
  const docById = {
    'quote-list-1': listEl,
    'quote-item-101': draggedNode,
    'quote-item-102': targetNode
  };

  const deps = {
    dashboardEl,
    dashboardRenderer: {
      createQuoteItemShellElement: (config) => {
        calls.push(['createQuoteShell', config.quoteId, config.amountInputHtml, config.quoteTextClassName, config.lastResultText]);
        return createQuoteItemShell(config.quoteId);
      },
      createCategoryModuleShellElement: (config) => {
        calls.push(['createCategoryShell', config.categoryId, config.categoryPauseAction]);
        const moduleEl = createElement(`module-${config.categoryId}`);
        moduleEl.refs = { '.quote-list': createElement(`quote-list-${config.categoryId}`) };
        return moduleEl;
      }
    },
    dashboardRuntimeUtils,
    dexLinkUtils: {
      getDexLinkLabel: () => 'DexLink'
    },
    documentImpl: {
      getElementById: (id) => docById[id] || null,
      querySelectorAll: () => [draggedNode, targetNode]
    },
    getCategoryPauseAction: () => 'pause',
    getDashboardState: () => dashboardState,
    getQuoteChainDisplayName: (quote) => `链-${quote.chain}`,
    getQuoteDisplayText: (quote) => `显示-${quote.id}`,
    getQuoteMarketState: () => ({ fromSymbol: 'USDC', toSymbol: 'USDT' }),
    getRequestChannelOptions: () => ({ channels: [] }),
    handleQuoteHover: (event, quoteId) => calls.push(['hover', quoteId]),
    isCexOrderbookChain: (chain) => chain === 'bybit',
    isCrossChainQuote: () => false,
    isQuotePaused: () => false,
    logger: {
      error: (...args) => calls.push(['error', ...args])
    },
    quoteDisplayUtils: {
      buildQuotePairLabelHtml: () => 'USDC/USDT'
    },
    requestChannelUtils: {
      getRequestChannelDisplayForQuote: () => ({ id: 'default' }),
      buildRequestChannelTagHtml: () => '<span>default</span>'
    },
    saveData: () => calls.push(['saveData']),
    ...overrides.deps
  };

  return { calls, dashboardEl, dashboardState, deps, draggedNode, listEl, targetNode };
}

{
  const { calls, deps } = createBaseDeps();
  const controller = createDashboardViewController(deps);
  const itemEl = controller.createQuoteItem(deps.getDashboardState()[0].quotes[0], 1);
  const labelStackEl = itemEl.refs['.quote-label-stack'];
  const textWrapperEl = itemEl.refs['.quote-text-wrapper'];

  assert.strictEqual(itemEl.draggable, true);
  assert.strictEqual(labelStackEl.dataset.dexLinkCopy, '1');
  assert.strictEqual(labelStackEl.dataset.dexLinkInputAmount, '2');
  assert.strictEqual(labelStackEl.draggable, 'false');
  assert.ok(labelStackEl.classList.has('quote-dex-link-target'));
  assert.deepStrictEqual(calls[0], ['createQuoteShell', 101, '<input type="number" class="amount-input" value="2" step="any" min="0" data-category-id="1" data-quote-id="101">', 'quote-text', '显示-101']);
  assert.strictEqual(labelStackEl.listeners.click, undefined);
  assert.strictEqual(textWrapperEl.listeners.click, undefined);

  let labelMouseDownStopped = false;
  labelStackEl.listeners.mousedown({
    stopPropagation: () => { labelMouseDownStopped = true; }
  });
  assert.strictEqual(labelMouseDownStopped, true);

  textWrapperEl.listeners.mouseenter({});
  assert.ok(calls.some((call) => call[0] === 'hover' && call[1] === 101));
}

{
  const { calls, dashboardEl, deps } = createBaseDeps();
  const controller = createDashboardViewController(deps);
  const moduleEl = controller.createCategoryModule(deps.getDashboardState()[0]);
  assert.strictEqual(moduleEl.refs['.quote-list'].children.length, 2);

  controller.renderDashboard();
  assert.strictEqual(dashboardEl.children.length, 1);
  assert.ok(calls.some((call) => call[0] === 'createCategoryShell' && call[1] === 1));
}

{
  const { calls, dashboardState, deps, listEl, targetNode, draggedNode } = createBaseDeps();
  const controller = createDashboardViewController(deps);
  const itemEl = controller.createQuoteItem(dashboardState[0].quotes[1], 1);

  itemEl.listeners.drop({
    dataTransfer: {
      getData: () => JSON.stringify({ quoteId: '101', categoryId: '1' })
    },
    preventDefault() {},
    stopPropagation() {}
  });

  assert.deepStrictEqual(dashboardState[0].quotes.map((quote) => quote.id), [102, 101]);
  assert.deepStrictEqual(listEl.inserted, { child: draggedNode, before: targetNode.nextSibling });
  assert.ok(calls.some((call) => call[0] === 'saveData'));
}

{
  const { calls, deps } = createBaseDeps({ dashboardState: null });
  const controller = createDashboardViewController(deps);
  controller.renderDashboard();
  assert.strictEqual(calls[0][0], 'error');
}
