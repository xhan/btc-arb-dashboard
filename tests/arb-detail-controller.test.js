const assert = require('assert');

const { createArbDetailController } = require('../src/arb/arb-detail-controller');
const { createArbDetailSourceBudgetRuntime } = require('../src/arb/arb-detail-utils');

function createElement(id) {
  return {
    id,
    checked: false,
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
  };
}

function createBaseDeps(overrides = {}) {
  const calls = [];
  let state = {
    visible: false,
    refreshToken: 0,
    isRefreshing: false,
    pausedDashboard: false,
    selectedOpportunity: null,
    opportunityId: null,
    cards: [],
    editingInputIndex: null,
    chartPreviewSignature: ''
  };
  const opportunity = {
    id: 'opp-1',
    cycle: {
      legs: [{ quoteId: 101, chain: 'ethereum' }]
    }
  };
  const elements = {};
  const refs = {
    modal: createElement('modal'),
    closeButton: createElement('close'),
    multiLinksButton: createElement('multi-links'),
    chartLink: createElement('chart-link'),
    chartAutoRefreshToggle: createElement('chart-toggle'),
    subtitle: createElement('subtitle'),
    chartPreview: null,
    profitPreview: null,
    grid: createElement('grid'),
    quoteRunStateTag: createElement('run-state')
  };

  const deps = {
    arbDetailRefreshUtils: {
      createArbDetailRefreshScheduler: (options) => {
        calls.push(['createScheduler', options.intervalMs]);
        return {
          clear: () => calls.push(['schedulerClear']),
          start: (refreshToken) => calls.push(['schedulerStart', refreshToken])
        };
      },
      createArbDetailChartAutoRefreshRuntime: (options) => {
        calls.push(['createChartRuntime', options.intervalMs]);
        return {
          clear: () => calls.push(['chartRuntimeClear']),
          sync: () => calls.push(['chartRuntimeSync'])
        };
      }
    },
    arbDetailUtils: {
      applyArbDetailCardContents: (cards) => calls.push(['cardContents', cards.length]),
      applyArbDetailChartLinkState: (element, href) => calls.push(['chartLink', element && element.id, href]),
      applyArbDetailInputUpdate: (cards, index, value) => {
        calls.push(['inputUpdate', index, value]);
        cards[index].inputAmount = value;
        cards[index].requestVersion = Number(cards[index].requestVersion || 0) + 1;
      },
      applyArbDetailModalVisibility: (element, visible) => calls.push(['modalVisible', element && element.id, visible]),
      applyArbDetailShellHtml: (element, cards) => calls.push(['shell', element.id, cards.length]),
      applyArbDetailSubtitleText: (element, text) => calls.push(['subtitle', element.id, text]),
      buildArbDetailRowsHtml: () => '<rows>',
      buildArbDetailSourceHtml: () => '<source>',
      buildArbDetailSubtitleText: () => 'subtitle text',
      buildArbDetailSummaryHtml: () => '<summary>',
      buildArbDetailMultiLinksUrl: () => '',
      buildDefaultArbDetailState: () => state,
      buildClosedArbDetailState: (currentState) => {
        state = { ...currentState, visible: false };
        return state;
      },
      buildNudgedArbDetailInputAmount: (amount, delta) => Number(amount) + Number(delta),
      buildOpenArbDetailState: (currentState, options) => {
        state = {
          ...currentState,
          visible: true,
          refreshToken: 12,
          pausedDashboard: false,
          selectedOpportunity: options.opportunity,
          opportunityId: options.opportunityId,
          cards: [{ inputAmount: options.baseAmount, requestVersion: 0, rows: [] }],
          editingInputIndex: null
        };
        return state;
      },
      clearArbDetailPreviewContainers: () => calls.push(['clearPreview']),
      createArbDetailSourceBudgetRuntime: () => ({
        recordTimestamp: (source) => calls.push(['recordSource', source]),
        getTimestamp: () => 0,
        waitForTurn: (source) => calls.push(['waitForSource', source])
      }),
      findBestSummaryIndices: () => ({ bestProfitIndices: [], bestProfitRateIndices: [] }),
      getQuoteRunState: (paused) => ({ text: paused ? 'paused' : 'running' }),
      resolveArbOpportunityBaseAmount: () => 5,
      resolveArbDetailGridClickAction: () => ({ type: 'nudge-input', index: 0, step: 1 }),
      resolveArbDetailGridInputAction: () => ({ type: 'input', index: 0, value: '8' }),
      resolveArbDetailGridKeydownAction: () => ({ type: 'none' }),
      resolveArbDetailGridMouseDownAction: () => ({ type: 'none' }),
      parseCommittedArbDetailInput: (value) => Number(value),
      shouldRebuildArbDetailShellDom: () => true,
      syncArbDetailInputValues: (cards, options) => calls.push(['syncInputs', cards.length, options.editingInputIndex])
    },
    arbPanelLayoutUtils: {
      buildArbPathLegLines: () => ['line']
    },
    abortActiveFetchControllers: () => calls.push(['abortActive']),
    buildArbPathLegLineOptions: () => ({}),
    chartAutoRefreshIntervalMs: 5000,
    closestEventTarget: () => null,
    copyDexLinkFromElement: (element) => calls.push(['copyDex', element && element.id]),
    copyTextToClipboard: async (text) => calls.push(['copyText', text]),
    detailRefreshIntervalMs: 2500,
    documentImpl: {
      getElementById: (id) => elements[id] || null
    },
    domRenderUtils: {
      applyQuoteRunStateTagDomState: (element, nextState) => calls.push(['runState', element.id, nextState.text])
    },
    fetchImpl: async () => ({ ok: true, json: async () => ({ points: [] }) }),
    fetchQuoteByStrategy: async () => ({ data: {}, successSource: 'Kyber' }),
    findQuoteById: () => ({ quote: { id: 101 } }),
    formatChainLabel: (chain) => chain,
    formatDetailNumber: (value) => String(value),
    getApiIntervals: () => ({}),
    getChartsRenderer: () => null,
    getChartsUtils: () => ({ buildChartsPageHref: () => '', buildChartPairLabel: () => '' }),
    getOpportunity: (id) => (id === 'opp-1' ? opportunity : null),
    getQuoteMarketState: () => ({}),
    isRuleLeg: () => false,
    logRefreshError: (error) => calls.push(['refreshError', error.message]),
    muteLeg: (row, durationHours) => calls.push(['muteLeg', row.id, durationHours]),
    promptImpl: () => '2',
    promptMutedPathLegDurationHours: () => 2,
    refs,
    refreshOpportunities: () => calls.push(['refreshOpportunities']),
    setQuoteMarketState: (quoteId, nextState) => calls.push(['setQuote', quoteId, nextState]),
    showCopyToast: (message) => calls.push(['toast', message]),
    updateSchedulers: () => calls.push(['updateSchedulers']),
    windowImpl: {},
    setTimeout: (callback) => {
      callback();
      return 'timer';
    },
    clearTimeout: (timer) => calls.push(['clearTimeout', timer]),
    ...overrides
  };

  return {
    calls,
    controller: createArbDetailController(deps),
    deps,
    refs
  };
}

{
  const { calls, controller, refs } = createBaseDeps();
  assert.strictEqual(controller.open('missing'), false);
  calls.length = 0;
  assert.strictEqual(controller.open('opp-1'), true);
  assert.strictEqual(controller.isVisible(), true);
  assert.strictEqual(controller.isDashboardPaused(), true);
  assert.strictEqual(refs.chartAutoRefreshToggle.checked, true);
  assert.deepStrictEqual(
    calls.filter((call) => ['schedulerClear', 'abortActive', 'updateSchedulers', 'runState', 'subtitle', 'shell', 'syncInputs', 'cardContents', 'modalVisible', 'chartRuntimeSync', 'schedulerStart'].includes(call[0])),
    [
      ['schedulerClear'],
      ['abortActive'],
      ['updateSchedulers'],
      ['runState', 'run-state', 'paused'],
      ['subtitle', 'subtitle', 'subtitle text'],
      ['shell', 'grid', 1],
      ['syncInputs', 1, null],
      ['cardContents', 1],
      ['modalVisible', 'modal', true],
      ['chartRuntimeSync'],
      ['schedulerStart', 12]
    ]
  );

  controller.close();
  assert.strictEqual(controller.isVisible(), false);
  assert.ok(calls.some((call) => call[0] === 'chartRuntimeClear'));
  assert.ok(calls.some((call) => call[0] === 'modalVisible' && call[2] === false));
  assert.ok(calls.some((call) => call[0] === 'runState' && call[2] === 'running'));
}

{
  const { calls, controller, refs } = createBaseDeps();
  controller.open('opp-1');
  controller.bindGridEvents();
  refs.grid.listeners.click({});
  refs.grid.listeners.focusin({});
  refs.grid.listeners.focusout({});
  assert.ok(calls.some((call) => call[0] === 'inputUpdate' && call[1] === 0 && call[2] === 6));
  assert.ok(calls.some((call) => call[0] === 'inputUpdate' && call[1] === 0 && call[2] === 8));
  assert.ok(calls.some((call) => call[0] === 'schedulerStart' && call[1] === 13));
}

{
  const { calls, controller } = createBaseDeps();
  controller.recordSourceAttempt('Kyber');
  assert.deepStrictEqual(calls.filter((call) => call[0] === 'recordSource'), [['recordSource', 'Kyber']]);
  controller.open('opp-1');
  assert.deepStrictEqual(controller.getRetainedOpportunities(() => ({ id: 'active' })).map((entry) => entry.id), ['opp-1', 'active']);
}

{
  const { calls, controller, refs } = createBaseDeps({
    arbDetailUtils: {
      ...createBaseDeps().deps.arbDetailUtils,
      buildOpenArbDetailState: (currentState, options) => ({
        ...currentState,
        visible: true,
        refreshToken: 12,
        pausedDashboard: false,
        selectedOpportunity: { ...options.opportunity, label: '机会 7', groupName: 'WBTC eth <-> arb' },
        opportunityId: options.opportunityId,
        cards: [{ inputAmount: options.baseAmount, requestVersion: 0, rows: [{ id: 'row-1' }] }],
        editingInputIndex: null
      }),
      buildArbDetailMultiLinksUrl: (rows, options) => {
        calls.push(['buildMultiLinks', rows.length, options.name, options.color]);
        return 'chrome-extension://kopjcgdfdbflnmmjplaefilbjjagiakb/open.html?payload=abc';
      }
    },
    copyTextToClipboard: (text) => ({
      then(resolve) {
        calls.push(['copyText', text]);
        resolve();
        return {
          catch() {}
        };
      }
    })
  });
  controller.open('opp-1');
  controller.bindChromeEvents();
  refs.multiLinksButton.listeners.click({});
  assert.ok(calls.some((call) => call[0] === 'buildMultiLinks' && call[1] === 1 && call[2] === 'WBTC eth <-> arb' && call[3] === undefined));
  assert.ok(calls.some((call) => call[0] === 'copyText' && String(call[1]).startsWith('chrome-extension://kopjcgdfdbflnmmjplaefilbjjagiakb/open.html?payload=')));
  assert.ok(calls.some((call) => call[0] === 'toast' && call[1] === '已复制多链接'));
}

(async () => {
  let refreshCards = null;
  const baseDeps = createBaseDeps().deps;
  const opportunity = {
    id: 'opp-live',
    cycle: {
      legs: [{ quoteId: 101, chain: 'ethereum', inverse: true }]
    }
  };
  const { calls, controller } = createBaseDeps({
    arbDetailRefreshUtils: {
      ...baseDeps.arbDetailRefreshUtils,
      createArbDetailRefreshScheduler: (options) => {
        refreshCards = options.refresh;
        return {
          clear: () => calls.push(['schedulerClear']),
          start: (refreshToken) => calls.push(['schedulerStart', refreshToken])
        };
      }
    },
    arbDetailUtils: {
      ...baseDeps.arbDetailUtils,
      buildArbDetailSnapshotMonitorState: (previousState, data, options) => ({
        ...previousState,
        lastRawPrice: data.rawPrice,
        usedSourceReal: options.successSource,
        isInverseFetch: options.isInverseFetch
      }),
      buildArbDetailRow: (quote, data, options) => ({
        quoteId: quote.id,
        outputAmount: data.finalAmountOut,
        inputAmount: options.inputAmount,
        isInverseFetch: options.isInverseFetch
      }),
      shouldApplyArbDetailRequestVersion: () => true,
      shouldSyncArbDetailSnapshotForCard: (cardIndex) => cardIndex === 0,
      summarizeDetailResult: (startAmount, finalAmount) => ({
        profit: finalAmount - startAmount,
        profitRate: finalAmount / startAmount - 1
      })
    },
    fetchQuoteByStrategy: async (quote, options) => {
      calls.push(['fetchQuote', quote.id, options.isInverseFetch, options.skipDelay]);
      return {
        data: {
          rawPrice: 0.995,
          finalAmountOut: 4.975,
          symbols: { to: 'WBTC' }
        },
        successSource: '0x'
      };
    },
    getOpportunity: (id) => (id === 'opp-live' ? opportunity : null),
    onQuoteMarketStateChanged: (quote, state, context) => calls.push([
      'marketChanged',
      quote.id,
      state.lastRawPrice,
      context.fetchMode,
      context.successSource
    ]),
    setQuoteMarketState: (quoteId, nextState) => {
      calls.push(['setQuote', quoteId, nextState.lastRawPrice, nextState.isInverseFetch]);
      return true;
    }
  });

  controller.open('opp-live');
  assert.ok(refreshCards);
  await refreshCards(12);

  assert.ok(calls.some((call) => call[0] === 'fetchQuote' && call[1] === 101 && call[2] === true && call[3] === true));
  assert.ok(calls.some((call) => call[0] === 'setQuote' && call[1] === 101 && call[2] === 0.995 && call[3] === true));
  assert.ok(calls.some((call) => call[0] === 'marketChanged' && call[1] === 101 && call[2] === 0.995 && call[3] === 'inverse' && call[4] === '0x'));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

(async () => {
  let refreshCards = null;
  const sourceStartTimes = [];
  const baseDeps = createBaseDeps().deps;
  const opportunity = {
    id: 'opp-rate-limited',
    cycle: { legs: [{ quoteId: 101, chain: 'solana' }] }
  };
  const { controller } = createBaseDeps({
    arbDetailRefreshUtils: {
      ...baseDeps.arbDetailRefreshUtils,
      createArbDetailRefreshScheduler: (options) => {
        refreshCards = options.refresh;
        return { clear() {}, start() {} };
      }
    },
    arbDetailUtils: {
      ...baseDeps.arbDetailUtils,
      buildOpenArbDetailState: (currentState, options) => ({
        ...currentState,
        visible: true,
        refreshToken: 12,
        selectedOpportunity: options.opportunity,
        opportunityId: options.opportunityId,
        cards: [0.1, 0.1, 0.2, 0.3].map((inputAmount) => ({ inputAmount, requestVersion: 0, rows: [] }))
      }),
      buildArbDetailRow: (_quote, data) => ({ outputAmount: data.finalAmountOut }),
      shouldApplyArbDetailRequestVersion: () => true,
      shouldSyncArbDetailSnapshotForCard: () => false,
      summarizeDetailResult: () => ({ profit: 0, profitRate: 0 }),
      applyArbDetailRateDeltas: (rows) => rows,
      getArbDetailIntervalKey: () => 'solana',
      resolveArbDetailIntervalMs: () => 20,
      getArbDetailRateLimitDelay: (lastRequestAt, intervalMs, now = Date.now()) => (
        lastRequestAt ? Math.max(0, lastRequestAt + intervalMs - now) : 0
      ),
      createArbDetailSourceBudgetRuntime
    },
    fetchQuoteByStrategy: async (_quote, options) => {
      await options.beforeSourceAttempt('Jupiter');
      sourceStartTimes.push(Date.now());
      return {
        data: { finalAmountOut: 0.101, symbols: { to: 'WBTC' } },
        successSource: 'Jupiter'
      };
    },
    getOpportunity: (id) => (id === 'opp-rate-limited' ? opportunity : null),
    setTimeout,
    clearTimeout
  });

  controller.open('opp-rate-limited');
  await refreshCards(12);
  assert.strictEqual(sourceStartTimes.length, 4);
  for (let index = 1; index < sourceStartTimes.length; index += 1) {
    assert.ok(sourceStartTimes[index] - sourceStartTimes[index - 1] >= 15, '同来源请求必须继续按间隔排队');
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

(async () => {
  let refreshCards = null;
  const pendingFetches = [];
  const baseDeps = createBaseDeps().deps;
  const opportunity = {
    id: 'opp-concurrent',
    cycle: {
      legs: [
        { quoteId: 101, chain: 'ethereum' },
        { quoteId: 102, chain: 'arbitrum' }
      ]
    }
  };
  const { controller } = createBaseDeps({
    arbDetailRefreshUtils: {
      ...baseDeps.arbDetailRefreshUtils,
      createArbDetailRefreshScheduler: (options) => {
        refreshCards = options.refresh;
        return { clear() {}, start() {} };
      }
    },
    arbDetailUtils: {
      ...baseDeps.arbDetailUtils,
      buildOpenArbDetailState: (currentState, options) => ({
        ...currentState,
        visible: true,
        refreshToken: 12,
        selectedOpportunity: options.opportunity,
        opportunityId: options.opportunityId,
        cards: [0.1, 0.1, 0.2, 0.3].map((inputAmount) => ({
          inputAmount,
          requestVersion: 0,
          rows: []
        }))
      }),
      buildArbDetailRow: (_quote, data) => ({ outputAmount: data.finalAmountOut }),
      shouldApplyArbDetailRequestVersion: () => true,
      shouldSyncArbDetailSnapshotForCard: () => false,
      summarizeDetailResult: (startAmount, finalAmount) => ({
        profit: finalAmount - startAmount,
        profitRate: finalAmount / startAmount - 1
      }),
      applyArbDetailRateDeltas: (rows) => rows
    },
    fetchQuoteByStrategy: (quote) => new Promise((resolve) => {
      pendingFetches.push({ quoteId: quote.id, resolve, resolved: false });
    }),
    findQuoteById: (quoteId) => ({ quote: { id: quoteId } }),
    getOpportunity: (id) => (id === 'opp-concurrent' ? opportunity : null)
  });

  controller.open('opp-concurrent');
  const refreshPromise = refreshCards(12);
  await Promise.resolve();
  assert.strictEqual(pendingFetches.length, 1);
  pendingFetches[0].resolved = true;
  pendingFetches[0].resolve({
    data: {
      finalAmountOut: 0.101,
      symbols: { to: 'WBTC' }
    },
    successSource: 'Kyber'
  });
  await Promise.resolve();
  await Promise.resolve();
  assert.strictEqual(pendingFetches.length, 5, '第一档首腿完成后，其余 size 应并发开始');

  for (let round = 0; round < 3; round += 1) {
    pendingFetches.filter((item) => !item.resolved).forEach((item) => {
      item.resolved = true;
      item.resolve({
        data: { finalAmountOut: 0.101, symbols: { to: 'WBTC' } },
        successSource: 'Kyber'
      });
    });
    await Promise.resolve();
    await Promise.resolve();
  }
  await refreshPromise;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
