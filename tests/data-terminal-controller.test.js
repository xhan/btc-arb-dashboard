const assert = require('assert');

const dataTerminalUtils = require('../src/data-terminal/data-terminal-utils');
const domRenderUtils = require('../src/ui/dom-render-utils');
const { createDataTerminalController, createInitialState } = require('../src/data-terminal/data-terminal-controller');
const dashboardRuntimeUtils = require('../src/dashboard/dashboard-runtime-utils');

function createElement(name, calls, documentRef) {
  const element = {
    name,
    value: '',
    checked: false,
    textContent: '',
    listeners: {},
    classList: {
      toggled: {},
      toggle(className, enabled) {
        this.toggled[className] = enabled;
        calls.push(['toggleClass', name, className, enabled]);
      }
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
      calls.push(['bind', name, type]);
    },
    contains(target) {
      return target === element || Boolean(target && target.inside === name);
    },
    focus() {
      documentRef.activeElement = element;
      calls.push(['focus', name]);
    },
    blur() {
      if (documentRef.activeElement === element) {
        documentRef.activeElement = null;
      }
      calls.push(['blur', name]);
    }
  };
  return element;
}

function createDomFixture(calls) {
  const documentImpl = {
    activeElement: null,
    body: {
      children: [],
      appendChild(element) {
        element.parentNode = this;
        this.children.push(element);
        calls.push(['appendChild', element.id]);
      },
      removeChild(element) {
        this.children = this.children.filter((child) => child !== element);
        element.parentNode = null;
        calls.push(['removeChild', element.id]);
      }
    },
    createElement() {
      const refs = {
        '#data-terminal-header': createElement('header', calls, documentImpl),
        '#data-terminal-min-btn': createElement('minBtn', calls, documentImpl),
        '#data-terminal-search-input': createElement('searchInput', calls, documentImpl),
        '#data-terminal-alias-toggle': createElement('aliasToggle', calls, documentImpl),
        '#data-terminal-diff-toggle': createElement('diffToggle', calls, documentImpl),
        '#data-terminal-profit-bp': createElement('profitBp', calls, documentImpl),
        '#data-terminal-content': createElement('content', calls, documentImpl)
      };
      return {
        id: '',
        style: {},
        parentNode: null,
        innerHTML: '',
        refs,
        querySelector(selector) {
          return refs[selector] || null;
        }
      };
    }
  };
  return documentImpl;
}

function createBaseDeps(overrides = {}) {
  const calls = [];
  const documentImpl = createDomFixture(calls);
  const timers = [];
  const dashboardState = [{
    id: 'cat-1',
    name: '主区',
    quotes: [{
      id: 'q1',
      chain: 'ethereum',
      fromToken: '0xfrom',
      toToken: '0xto',
      amount: 5
    }]
  }];
  const quoteStateById = new Map([
    ['q1', {
      fromSymbol: 'USDC',
      toSymbol: 'USDT',
      lastRawPrice: 1.001,
      inverseRawPrice: 0.999
    }]
  ]);

  const deps = {
    dataTerminalUtils,
    dashboardRuntimeUtils,
    documentImpl,
    windowImpl: {
      getComputedStyle: () => ({ display: 'block', width: '1000px', height: '600px' })
    },
    setTimeout(callback, delayMs) {
      const timer = { id: `timer-${timers.length + 1}`, callback, delayMs };
      timers.push(timer);
      return timer.id;
    },
    clearTimeout(id) {
      calls.push(['clearTimeout', id]);
    },
    updateDelayMs: 50,
    getAnchorPanel: () => ({
      getBoundingClientRect: () => ({ left: 100, top: 120 })
    }),
    zIndexRuntime: {
      bringToFront(element) {
        calls.push(['bringToFront', element && element.id]);
      }
    },
    domRenderUtils: {
      createStableHtmlRenderer: () => ({
        render(target, html) {
          target.innerHTML = html;
          calls.push(['render', target.name]);
        },
        reset() {
          calls.push(['resetRenderer']);
        }
      }),
      bindFloatingPanelChrome(panel, header) {
        calls.push(['bindChrome', panel.id, header.name]);
      }
    },
    getDashboardState: () => dashboardState,
    getQuoteMarketStateMap: () => quoteStateById,
    getMarketRevision: () => 1,
    isQuoteActive: (quote) => quote.paused !== true,
    getAliasRules: () => ({ USDT0: 'USDT' }),
    closestEventTarget: (event, selector) => event.closestMap && event.closestMap[selector],
    formatChainLabel: (chain) => `链:${chain}`,
    formatAmount: (amount) => `${Number(amount).toFixed(2)}`,
    buildPairLinkHtml: (row, className, label) => `<button class="${className}" data-row="${row.key}">${label}</button>`,
    copyDexLinkFromElement: (element) => calls.push(['copyDexLink', element.name || 'el']),
    ...overrides
  };

  return { calls, deps, documentImpl, timers };
}

{
  const state = createInitialState();
  assert.deepStrictEqual(
    {
      visible: state.visible,
      query: state.query,
      allowAliases: state.allowAliases,
      showDiff: state.showDiff,
      selectedLeftKey: state.selectedLeftKey,
      selectedRightKey: state.selectedRightKey,
      domRefs: state.domRefs
    },
    {
      visible: false,
      query: '',
      allowAliases: true,
      showDiff: false,
      selectedLeftKey: '',
      selectedRightKey: '',
      domRefs: null
    }
  );
}

{
  let marketRevision = 1;
  const { calls, deps, timers } = createBaseDeps({
    domRenderUtils: {
      ...domRenderUtils,
      bindFloatingPanelChrome(panel, header) {
        calls.push(['bindChrome', panel.id, header.name]);
      }
    },
    getMarketRevision: () => marketRevision
  });
  const controller = createDataTerminalController(deps);
  const panel = controller.mountPanel();
  const refs = panel.refs;
  const content = refs['#data-terminal-content'];

  refs['#data-terminal-search-input'].listeners.input({ target: { value: 'USDC' } });
  assert.ok(content.innerHTML.includes('USDC -> USDT'));

  content.listeners.pointerdown({});
  deps.getQuoteMarketStateMap().set('q1', {
    fromSymbol: 'USDC',
    toSymbol: 'USDT0',
    lastRawPrice: 1.002,
    inverseRawPrice: 0.998
  });
  marketRevision = 2;

  assert.strictEqual(controller.scheduleUpdate(), true);
  timers[0].callback();
  assert.ok(content.innerHTML.includes('USDC -> USDT'));
  assert.ok(!content.innerHTML.includes('USDC -> USDT0'));

  content.listeners.pointerup({});
  timers[1].callback();
  assert.ok(content.innerHTML.includes('USDC -> USDT0'));
}

{
  const { calls, deps, documentImpl, timers } = createBaseDeps();
  const controller = createDataTerminalController(deps);
  const panel = controller.mountPanel();
  const refs = panel.refs;

  assert.strictEqual(panel.id, 'data-terminal-window');
  assert.strictEqual(panel.style.width, '650px');
  assert.strictEqual(panel.style.height, '600px');
  assert.strictEqual(panel.style.left, '124px');
  assert.strictEqual(panel.style.top, '144px');
  assert.strictEqual(refs['#data-terminal-alias-toggle'].checked, true);
  assert.ok(calls.some((call) => call[0] === 'bindChrome'));
  assert.ok(calls.some((call) => call[0] === 'focus' && call[1] === 'searchInput'));

  refs['#data-terminal-search-input'].listeners.input({ target: { value: 'USDC' } });
  assert.strictEqual(controller.getState().query, 'USDC');
  assert.ok(refs['#data-terminal-content'].innerHTML.includes('USDC -> USDT'));
  assert.ok(refs['#data-terminal-content'].innerHTML.includes('data-row="q1:forward"'));

  assert.strictEqual(controller.scheduleUpdate(), true);
  assert.deepStrictEqual(timers.map((timer) => timer.delayMs), [50]);
  assert.strictEqual(controller.scheduleUpdate(), false);
  timers[0].callback();
  assert.strictEqual(controller.scheduleUpdate(), true);

  refs['#data-terminal-content'].listeners.click({
    closestMap: {
      '[data-data-terminal-row-key]': {
        dataset: {
          dataTerminalSide: 'right',
          dataTerminalRowKey: 'q1:forward'
        }
      }
    }
  });
  assert.strictEqual(controller.getState().selectedRightKey, 'q1:forward');

  let prevented = false;
  let stopped = false;
  refs['#data-terminal-content'].listeners.click({
    closestMap: {
      '[data-dex-link-copy]': { name: 'dexLinkButton' }
    },
    preventDefault() {
      prevented = true;
    },
    stopPropagation() {
      stopped = true;
    }
  });
  assert.strictEqual(prevented, true);
  assert.strictEqual(stopped, true);
  assert.ok(calls.some((call) => call[0] === 'copyDexLink' && call[1] === 'dexLinkButton'));

  documentImpl.activeElement = refs['#data-terminal-search-input'];
  refs['#data-terminal-header'].listeners.click({ closestMap: {} });
  assert.strictEqual(documentImpl.activeElement, null);
  assert.ok(calls.some((call) => call[0] === 'blur' && call[1] === 'searchInput'));

  controller.unmountPanel();
  assert.ok(calls.some((call) => call[0] === 'clearTimeout' && call[1] === 'timer-2'));
  assert.ok(calls.some((call) => call[0] === 'removeChild' && call[1] === 'data-terminal-window'));
  assert.strictEqual(controller.getState().visible, false);
  assert.strictEqual(controller.scheduleUpdate(), false);
}
