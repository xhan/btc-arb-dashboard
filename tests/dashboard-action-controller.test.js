const assert = require('assert');

const { createDashboardActionController } = require('../src/dashboard/dashboard-action-controller');
const dashboardRuntimeUtils = require('../src/dashboard/dashboard-runtime-utils');

function createBaseDeps(overrides = {}) {
  const dashboardState = overrides.dashboardState || [
    {
      id: 1,
      quotes: [
        { id: 101, amount: 1, paused: false },
        { id: 102, amount: 2, paused: false }
      ]
    }
  ];
  const calls = [];
  const removedNodes = [];
  const documentImpl = {
    querySelector(selector) {
      calls.push(['querySelector', selector]);
      return { selector };
    },
    getElementById(id) {
      calls.push(['getElementById', id]);
      return {
        id,
        remove() {
          removedNodes.push(id);
        }
      };
    }
  };

  return {
    calls,
    dashboardState,
    removedNodes,
    deps: {
      documentImpl,
      dashboardRuntimeUtils,
      dashboardRenderer: {
        resolveDashboardAmountInputAction: () => ({ type: 'none' }),
        resolveDashboardClickAction: () => ({ type: 'none' })
      },
      quotePauseUtils: {
        applyCategoryPauseButtonState: (button, quotes) => calls.push(['categoryPauseButton', button && button.selector, quotes.length]),
        buildPausedQuoteState: (state) => ({ ...state, paused: true })
      },
      amountInputDebounceRuntime: {
        schedule: (quoteId, callback) => {
          calls.push(['scheduleAmount', quoteId]);
          callback();
        },
        clear: (quoteId) => calls.push(['clearAmount', quoteId])
      },
      activeFetchControllerRuntime: {
        abort: (quoteId) => calls.push(['abort', quoteId])
      },
      arbDetailUtils: {
        doesArbDetailUseQuote: () => false
      },
      dashboardModalUtils: {},
      domRenderUtils: {},
      requestChannelUtils: {},
      confirmActionRuntime: {},
      quoteSettingsSelectionRuntime: {},
      quoteStateRuntime: {},
      addQuoteModalSelectionRuntime: {},
      getDashboardState: () => dashboardState,
      getArbDetailState: () => ({}),
      getRequestChannelOptions: () => ({}),
      getCategoryPauseAction: () => 'pause',
      getQuoteMarketState: () => ({}),
      isQuotePaused: (quote) => quote && quote.paused === true,
      removeFromQueue: (quoteId) => calls.push(['removeFromQueue', quoteId]),
      deleteQuoteMarketState: (quoteId) => calls.push(['deleteMarket', quoteId]),
      deleteQuoteUiRuntimeState: (quoteId) => calls.push(['deleteUi', quoteId]),
      renderDataTerminalPanel: () => calls.push(['renderDataTerminal']),
      updateAlertSoundState: () => calls.push(['updateAlertSound']),
      updateArbPanel: () => calls.push(['updateArbPanel']),
      evaluatePathAlertsOnce: () => calls.push(['evaluatePathAlerts']),
      saveData: () => calls.push(['saveData']),
      queueQuoteRefresh: (quote) => calls.push(['queueQuoteRefresh', quote.id]),
      setQuoteMarketState: (quoteId, state) => calls.push(['setMarketState', quoteId, state]),
      resetQuoteUiRuntimeState: (quoteId) => calls.push(['resetUi', quoteId]),
      applyPausedQuoteUiState: (quote) => calls.push(['applyPausedUi', quote.id]),
      updateSchedulers: () => calls.push(['updateSchedulers']),
      closeArbDetailModal: () => calls.push(['closeArbDetail']),
      isCexOrderbookChain: () => false,
      isCrossChainQuote: () => false,
      isEvmChain: () => true,
      getQuoteChainDisplayName: () => '',
      formatChainLabel: () => '',
      closestEventTarget: () => null,
      copyDexLinkFromElement: (element) => calls.push(['copyDexLink', element && element.name]),
      copyPriceText: (text) => calls.push(['copyPrice', text]),
      ...overrides.deps
    }
  };
}

{
  const { calls, dashboardState, deps } = createBaseDeps({
    deps: {
      dashboardRenderer: {
        resolveDashboardAmountInputAction: () => ({
          type: 'update-amount',
          categoryId: '1',
          quoteId: '101',
          amount: 3
        }),
        resolveDashboardClickAction: () => ({ type: 'none' })
      }
    }
  });
  const controller = createDashboardActionController(deps);
  controller.handleDashboardInput({});
  assert.strictEqual(dashboardState[0].quotes[0].amount, 3);
  assert.deepStrictEqual(
    calls.filter((call) => ['scheduleAmount', 'renderDataTerminal', 'queueQuoteRefresh', 'saveData'].includes(call[0])),
    [
      ['scheduleAmount', '101'],
      ['renderDataTerminal'],
      ['queueQuoteRefresh', 101],
      ['saveData']
    ]
  );
}

{
  const { calls, deps } = createBaseDeps({
    deps: {
      dashboardRenderer: {
        resolveDashboardAmountInputAction: () => ({ type: 'none' }),
        resolveDashboardClickAction: () => ({
          type: 'copy-dex-link',
          element: { name: 'dex-target' }
        })
      }
    }
  });
  const controller = createDashboardActionController(deps);
  controller.handleDashboardClick({
    preventDefault: () => calls.push(['preventDefault']),
    stopPropagation: () => calls.push(['stopPropagation'])
  });
  assert.deepStrictEqual(
    calls.filter((call) => ['preventDefault', 'stopPropagation', 'copyDexLink'].includes(call[0])),
    [
      ['preventDefault'],
      ['stopPropagation'],
      ['copyDexLink', 'dex-target']
    ]
  );
}

{
  const { calls, deps } = createBaseDeps({
    deps: {
      dashboardRenderer: {
        resolveDashboardAmountInputAction: () => ({ type: 'none' }),
        resolveDashboardClickAction: () => ({
          type: 'copy-price',
          element: { textContent: '1 TOKEN ≈ 1.23 USDC' }
        })
      }
    }
  });
  const controller = createDashboardActionController(deps);
  controller.handleDashboardClick({
    preventDefault: () => calls.push(['preventDefault']),
    stopPropagation: () => calls.push(['stopPropagation'])
  });
  assert.deepStrictEqual(
    calls.filter((call) => ['preventDefault', 'stopPropagation', 'copyPrice'].includes(call[0])),
    [
      ['preventDefault'],
      ['stopPropagation'],
      ['copyPrice', '1 TOKEN ≈ 1.23 USDC']
    ]
  );
}

{
  const { calls, dashboardState, deps, removedNodes } = createBaseDeps();
  const controller = createDashboardActionController(deps);
  assert.strictEqual(controller.deleteQuoteFromCategory('1', '102'), true);
  assert.deepStrictEqual(dashboardState[0].quotes.map((quote) => quote.id), [101]);
  assert.deepStrictEqual(removedNodes, ['quote-item-102']);
  assert.deepStrictEqual(
    calls.filter((call) => ['removeFromQueue', 'deleteMarket', 'deleteUi', 'updateAlertSound', 'renderDataTerminal', 'saveData'].includes(call[0])),
    [
      ['removeFromQueue', 102],
      ['deleteMarket', '102'],
      ['deleteUi', '102'],
      ['updateAlertSound'],
      ['renderDataTerminal'],
      ['saveData']
    ]
  );
  assert.strictEqual(controller.deleteQuoteFromCategory('missing', '102'), false);
}

{
  const { calls, dashboardState, deps } = createBaseDeps();
  const controller = createDashboardActionController(deps);
  assert.strictEqual(controller.toggleQuotePause('1', '101'), true);
  assert.strictEqual(dashboardState[0].quotes[0].paused, true);
  assert.deepStrictEqual(
    calls.filter((call) => ['clearAmount', 'removeFromQueue', 'abort', 'setMarketState', 'resetUi', 'applyPausedUi', 'updateSchedulers', 'updateAlertSound', 'updateArbPanel', 'renderDataTerminal', 'evaluatePathAlerts', 'saveData'].includes(call[0])),
    [
      ['clearAmount', 101],
      ['removeFromQueue', 101],
      ['abort', 101],
      ['setMarketState', 101, { paused: true }],
      ['resetUi', 101],
      ['applyPausedUi', 101],
      ['updateSchedulers'],
      ['updateAlertSound'],
      ['updateArbPanel'],
      ['renderDataTerminal'],
      ['evaluatePathAlerts'],
      ['saveData']
    ]
  );
}

{
  const normalizeChainKey = (chain) => chain === 'plasma-alias' ? 'plasma' : String(chain || '').trim().toLowerCase();
  const { calls, deps } = createBaseDeps({
    deps: {
      normalizeChainKey,
      dashboardModalUtils: {
        applyKyberExcludedSourcesControlState: (refs, state) => calls.push(['kyberControl', state])
      }
    }
  });
  const controller = createDashboardActionController(deps);
  controller.syncKyberExcludedSourcesControl({ chain: 'plasma-alias' }, 'Kyber');
  assert.deepStrictEqual(calls.filter((call) => call[0] === 'kyberControl'), [
    ['kyberControl', { visible: false }]
  ]);
}

{
  const normalizeChainKey = (chain) => String(chain || '').trim().toLowerCase();
  let modalOptions = null;
  const { deps } = createBaseDeps({
    dashboardState: [{ id: 'cat-1', quotes: [{ id: 301, chain: 'ethereum' }] }],
    deps: {
      normalizeChainKey,
      dashboardRenderer: {
        buildQuoteSettingsModalViewState: (options) => {
          modalOptions = options;
          return { sourceSelect: { value: 'Kyber' } };
        },
        buildQuoteSettingsModalWritePlan: () => ({}),
        resolveDashboardAmountInputAction: () => ({ type: 'none' }),
        resolveDashboardClickAction: () => ({ type: 'none' })
      },
      dashboardModalUtils: {
        applyQuoteSettingsModalWritePlan: () => {},
        applyKyberExcludedSourcesControlState: () => {},
        applyQuoteRequestChannelOptionsState: () => {},
        showModal: () => {}
      },
      getQuoteMarketState: () => ({}),
      requestChannelUtils: {
        supportsRequestChannelForQuote: () => false
      },
      quoteSettingsSelectionRuntime: {
        set: () => {}
      }
    }
  });
  const controller = createDashboardActionController(deps);
  assert.strictEqual(controller.openQuoteSettingsModal('cat-1', '301'), true);
  assert.strictEqual(modalOptions.normalizeChainKey, normalizeChainKey);
}

{
  const { calls, dashboardState, deps, removedNodes } = createBaseDeps({
    dashboardState: [{ id: 'cat-1', name: '主分区', quotes: [{ id: 201 }, { id: 202 }] }]
  });
  deps.confirmActionRuntime = {
    show: (refs, message, callback) => {
      calls.push(['confirm', message]);
      callback();
    }
  };
  const controller = createDashboardActionController(deps);
  assert.strictEqual(controller.deleteCategoryFromDashboard('cat-1'), true);
  assert.deepStrictEqual(calls.filter((call) => call[0] === 'confirm'), [['confirm', '确定删除分区 "主分区" 吗？']]);
  assert.deepStrictEqual(calls.filter((call) => call[0] === 'removeFromQueue'), [['removeFromQueue', 201], ['removeFromQueue', 202]]);
  assert.deepStrictEqual(removedNodes, ['module-cat-1']);
  assert.deepStrictEqual(dashboardState, []);
  assert.strictEqual(controller.deleteCategoryFromDashboard('missing'), false);
}
