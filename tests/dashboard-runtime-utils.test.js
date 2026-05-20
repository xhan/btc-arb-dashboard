const assert = require('assert');

const {
  buildArbRuleSnapshotCacheKey,
  buildDefaultQuoteUiState,
  buildDataTerminalRecordsCacheKey,
  buildQuoteMetaById,
  buildQuoteAlertUiUpdate,
  buildQuoteResultMarketState,
  buildQuotesByCategoryName,
  buildSwappedQuoteMarketState,
  clearQuoteTrendTimer,
  createButtonFeedbackRuntime,
  createDashboardPersistenceRuntime,
  createDashboardSaveRuntime,
  createInputDebounceRuntime,
  createSaveButtonFeedbackRuntime,
  deleteQuoteUiRuntimeState,
  findDashboardCategoryById,
  findDashboardCategoryIndexById,
  findDashboardQuoteById,
  findDashboardQuoteMatchByCategoryId,
  findDashboardQuoteMatchById,
  getActivePathAlertEvaluationAlerts,
  getBrowserLocalStorage,
  getQuoteUiState,
  hasActivePathAlertSound,
  hasQuoteMarketStateChanged,
  resetQuoteUiRuntimeState,
  sanitizeQuoteMarketState,
  setQuoteUiState,
  hasActivePathAlertEvaluationTarget,
  isPanelVisible,
  resolveMutedStateRefreshDelay
} = require('../src/dashboard/dashboard-runtime-utils');

assert.strictEqual(typeof getBrowserLocalStorage, 'function');
const dashboardLocalStorage = { getItem() {}, setItem() {} };
assert.strictEqual(getBrowserLocalStorage({ window: { localStorage: dashboardLocalStorage } }), dashboardLocalStorage);
assert.strictEqual(getBrowserLocalStorage({ window: null }), null);
let dashboardLocalStorageError = null;
assert.strictEqual(
  getBrowserLocalStorage({
    window: Object.defineProperty({}, 'localStorage', {
      get() {
        throw new Error('blocked');
      }
    })
  }, {
    onError(error) {
      dashboardLocalStorageError = error;
    }
  }),
  null
);
assert.strictEqual(dashboardLocalStorageError && dashboardLocalStorageError.message, 'blocked');

assert.strictEqual(isPanelVisible(null), false);
assert.strictEqual(isPanelVisible({}), true);
assert.strictEqual(
  isPanelVisible({}, () => ({ display: 'none' })),
  false
);
assert.strictEqual(
  isPanelVisible({}, () => ({ display: 'flex' })),
  true
);
assert.strictEqual(
  isPanelVisible({}, () => {
    throw new Error('style unavailable');
  }),
  true
);

assert.strictEqual(hasActivePathAlertEvaluationTarget(null), false);
assert.strictEqual(
  hasActivePathAlertEvaluationTarget({
    alerts: [
      { id: 'quote-1', enabled: true, target: { type: 'quote', quoteId: 1 } },
      { id: 'disabled-path', enabled: false, target: { type: 'path', legs: [] } }
    ]
  }),
  false
);
assert.strictEqual(
  hasActivePathAlertEvaluationTarget({
    alerts: [
      { id: 'path-1', enabled: true, target: { type: 'path', legs: [{ quoteId: 1 }] } }
    ]
  }),
  true
);
assert.strictEqual(
  hasActivePathAlertEvaluationTarget({
    alerts: [
      { id: 'rule-1', target: { type: 'rule', ruleKind: 'fixed', ruleId: 'fixed:wbtc-eth-arb' } }
    ]
  }),
  true
);
assert.deepStrictEqual(
  getActivePathAlertEvaluationAlerts({
    alerts: [
      { id: 'quote-1', enabled: true, target: { type: 'quote', quoteId: 1 } },
      { id: 'disabled-path', enabled: false, target: { type: 'path', legs: [{ quoteId: 2 }] } },
      { id: '', enabled: true, target: { type: 'path', legs: [{ quoteId: 3 }] } },
      { id: 'path-1', enabled: true, target: { type: 'path', legs: [{ quoteId: 4 }] } },
      { id: 'rule-1', target: { type: 'rule', ruleKind: 'fixed', ruleId: 'fixed:wbtc-eth-arb' } }
    ]
  }),
  [
    { id: 'path-1', enabled: true, target: { type: 'path', legs: [{ quoteId: 4 }] } },
    { id: 'rule-1', target: { type: 'rule', ruleKind: 'fixed', ruleId: 'fixed:wbtc-eth-arb' } }
  ]
);
assert.strictEqual(findDashboardQuoteById(null, 101), null);
assert.strictEqual(findDashboardQuoteById([{ quotes: [] }], 'bad'), null);
const dashboardQuoteLookupState = [
  {
    id: 'cat-1',
    quotes: [
      { id: 101, symbol: 'BTCUSDT' },
      { id: 102, symbol: 'ETHUSDT' }
    ]
  },
  {
    id: 'cat-2',
    quotes: [
      { id: '103', symbol: 'SOLUSDT' }
    ]
  }
];
assert.deepStrictEqual(
  findDashboardQuoteById(dashboardQuoteLookupState, '101'),
  { id: 101, symbol: 'BTCUSDT' }
);
assert.deepStrictEqual(
  findDashboardCategoryById(dashboardQuoteLookupState, 'cat-1'),
  dashboardQuoteLookupState[0]
);
assert.strictEqual(findDashboardCategoryById(dashboardQuoteLookupState, 'missing'), null);
assert.strictEqual(findDashboardCategoryIndexById(dashboardQuoteLookupState, 'cat-2'), 1);
assert.strictEqual(findDashboardCategoryIndexById(dashboardQuoteLookupState, 'missing'), -1);
assert.deepStrictEqual(
  findDashboardQuoteMatchByCategoryId(dashboardQuoteLookupState, 'cat-1', '102'),
  {
    category: dashboardQuoteLookupState[0],
    quote: { id: 102, symbol: 'ETHUSDT' },
    quoteIndex: 1
  }
);
assert.strictEqual(findDashboardQuoteMatchByCategoryId(dashboardQuoteLookupState, 'cat-1', 103), null);
assert.strictEqual(findDashboardQuoteMatchByCategoryId(dashboardQuoteLookupState, 'missing', 101), null);
assert.deepStrictEqual(
  findDashboardQuoteById(dashboardQuoteLookupState, 103),
  { id: '103', symbol: 'SOLUSDT' }
);
assert.strictEqual(findDashboardQuoteById(dashboardQuoteLookupState, 999), null);
assert.deepStrictEqual(
  findDashboardQuoteMatchById(dashboardQuoteLookupState, '102'),
  {
    quote: { id: 102, symbol: 'ETHUSDT' },
    category: dashboardQuoteLookupState[0]
  }
);
assert.deepStrictEqual(
  findDashboardQuoteMatchById(dashboardQuoteLookupState, 103),
  {
    quote: { id: '103', symbol: 'SOLUSDT' },
    category: dashboardQuoteLookupState[1]
  }
);
assert.strictEqual(findDashboardQuoteMatchById(dashboardQuoteLookupState, 'bad'), null);
assert.strictEqual(findDashboardQuoteMatchById(dashboardQuoteLookupState, 999), null);

assert.strictEqual(resolveMutedStateRefreshDelay({ nowMs: 1000 }), null);
assert.strictEqual(
  resolveMutedStateRefreshDelay({
    mutedPathTargets: [{ expiresAt: 5000 }],
    nowMs: 1000,
    visible: true
  }),
  1000
);
assert.strictEqual(
  resolveMutedStateRefreshDelay({
    mutedPathTargets: [{ expiresAt: 1500 }],
    nowMs: 1000,
    hiddenMinRefreshMs: 1000,
    hiddenMaxRefreshMs: 60 * 1000
  }),
  1000
);
assert.strictEqual(
  resolveMutedStateRefreshDelay({
    mutedPathTargets: [{ expiresAt: 2500 }],
    nowMs: 1000,
    hiddenMinRefreshMs: 1000,
    hiddenMaxRefreshMs: 60 * 1000
  }),
  1550
);
assert.strictEqual(
  resolveMutedStateRefreshDelay({
    mutedPathTargets: [{ expiresAt: 10 * 60 * 1000 }],
    nowMs: 1000,
    hiddenMaxRefreshMs: 60 * 1000
  }),
  60 * 1000
);
assert.strictEqual(
  resolveMutedStateRefreshDelay({
    mutedPathTargets: [{ expiresAt: null }],
    nowMs: 1000,
    hiddenMinRefreshMs: 1000
  }),
  1000
);

let debounceTimerId = 0;
const debounceTimers = [];
const clearedDebounceTimers = [];
const inputDebounceRuntime = createInputDebounceRuntime({
  delayMs: 600,
  setTimeout(callback, delayMs) {
    const timer = { id: ++debounceTimerId, callback, delayMs };
    debounceTimers.push(timer);
    return timer;
  },
  clearTimeout(timer) {
    clearedDebounceTimers.push(timer.id);
  }
});
let debouncedValue = '';
assert.strictEqual(inputDebounceRuntime.schedule(101, () => { debouncedValue = 'first'; }).delayMs, 600);
assert.strictEqual(inputDebounceRuntime.has(101), true);
inputDebounceRuntime.schedule(101, () => { debouncedValue = 'second'; }, 250);
assert.deepStrictEqual(clearedDebounceTimers, [1]);
assert.strictEqual(debounceTimers[1].delayMs, 250);
debounceTimers[1].callback();
assert.strictEqual(debouncedValue, 'second');
assert.strictEqual(inputDebounceRuntime.has(101), false);
inputDebounceRuntime.schedule(202, () => {});
assert.strictEqual(inputDebounceRuntime.clear(202), true);
assert.strictEqual(inputDebounceRuntime.clear(202), false);

let saveTimerId = 0;
const saveTimers = [];
const clearedSaveTimers = [];
const dashboardSaveRuntime = createDashboardSaveRuntime({
  delayMs: 1500,
  setTimeout(callback, delayMs) {
    const timer = { id: ++saveTimerId, callback, delayMs };
    saveTimers.push(timer);
    return timer;
  },
  clearTimeout(timer) {
    clearedSaveTimers.push(timer.id);
  }
});
let saveRunCount = 0;
assert.strictEqual(dashboardSaveRuntime.schedule(() => { saveRunCount += 1; }).delayMs, 1500);
dashboardSaveRuntime.schedule(() => { saveRunCount += 10; }, 500);
assert.deepStrictEqual(clearedSaveTimers, [1]);
assert.strictEqual(saveTimers[1].delayMs, 500);
saveTimers[1].callback();
assert.strictEqual(saveRunCount, 10);
assert.strictEqual(dashboardSaveRuntime.getTimer(), null);
dashboardSaveRuntime.schedule(() => {});
assert.strictEqual(dashboardSaveRuntime.clear(), true);
assert.strictEqual(dashboardSaveRuntime.clear(), false);

let feedbackTimerId = 0;
const feedbackTimers = [];
const clearedFeedbackTimers = [];
const feedbackButtonClasses = new Set();
const feedbackButton = {
  disabled: false,
  textContent: '',
  classList: {
    add(className) {
      feedbackButtonClasses.add(className);
    },
    remove(className) {
      feedbackButtonClasses.delete(className);
    }
  }
};
const feedbackText = { textContent: '' };
const buttonFeedbackRuntime = createButtonFeedbackRuntime({
  durationMs: 1500,
  setTimeout(callback, delayMs) {
    const timer = { id: ++feedbackTimerId, callback, delayMs };
    feedbackTimers.push(timer);
    return timer;
  },
  clearTimeout(timer) {
    clearedFeedbackTimers.push(timer.id);
  }
});
assert.strictEqual(buttonFeedbackRuntime.show({
  button: feedbackButton,
  textEl: feedbackText,
  removeClasses: ['saving', 'error'],
  addClasses: 'success',
  text: '已保存!',
  disabled: true,
  resetState: {
    button: feedbackButton,
    textEl: feedbackText,
    removeClasses: 'success',
    text: '保存配置',
    disabled: false
  }
}), true);
assert.strictEqual(feedbackButtonClasses.has('success'), true);
assert.strictEqual(feedbackText.textContent, '已保存!');
assert.strictEqual(feedbackButton.disabled, true);
assert.strictEqual(feedbackTimers[0].delayMs, 1500);
buttonFeedbackRuntime.show({
  button: feedbackButton,
  textEl: feedbackText,
  addClasses: 'error',
  text: '保存失败',
  durationMs: 3000,
  resetState: {
    button: feedbackButton,
    textEl: feedbackText,
    removeClasses: 'error',
    text: '保存配置'
  }
});
assert.deepStrictEqual(clearedFeedbackTimers, [1]);
assert.strictEqual(feedbackTimers[1].delayMs, 3000);
feedbackTimers[1].callback();
assert.strictEqual(feedbackButtonClasses.has('error'), false);
assert.strictEqual(feedbackText.textContent, '保存配置');
assert.strictEqual(buttonFeedbackRuntime.getTimer(), null);

let saveFeedbackTimerId = 0;
const saveFeedbackTimers = [];
const saveFeedbackClearedTimers = [];
const saveFeedbackClasses = new Set();
const saveFeedbackButton = {
  disabled: false,
  classList: {
    add(className) {
      saveFeedbackClasses.add(className);
    },
    remove(className) {
      saveFeedbackClasses.delete(className);
    }
  }
};
const saveFeedbackText = { textContent: '保存配置' };
const saveButtonFeedbackRuntime = createSaveButtonFeedbackRuntime({
  button: saveFeedbackButton,
  textEl: saveFeedbackText,
  setTimeout(callback, delayMs) {
    const timer = { id: ++saveFeedbackTimerId, callback, delayMs };
    saveFeedbackTimers.push(timer);
    return timer;
  },
  clearTimeout(timer) {
    saveFeedbackClearedTimers.push(timer.id);
  }
});
assert.strictEqual(saveButtonFeedbackRuntime.showSaving({ manual: true }), true);
assert.strictEqual(saveFeedbackClasses.has('saving'), true);
assert.strictEqual(saveFeedbackText.textContent, '保存中...');
assert.strictEqual(saveFeedbackButton.disabled, true);
assert.strictEqual(saveButtonFeedbackRuntime.showSuccess(), true);
assert.strictEqual(saveFeedbackClasses.has('saving'), false);
assert.strictEqual(saveFeedbackClasses.has('success'), true);
assert.strictEqual(saveFeedbackText.textContent, '已保存!');
assert.strictEqual(saveFeedbackTimers[0].delayMs, 2000);
saveButtonFeedbackRuntime.showError();
assert.deepStrictEqual(saveFeedbackClearedTimers, [1]);
assert.strictEqual(saveFeedbackClasses.has('success'), false);
assert.strictEqual(saveFeedbackClasses.has('error'), true);
assert.strictEqual(saveFeedbackTimers[1].delayMs, 3000);
saveFeedbackTimers[1].callback();
assert.strictEqual(saveFeedbackClasses.has('error'), false);
assert.strictEqual(saveFeedbackText.textContent, '保存配置');
assert.strictEqual(saveFeedbackButton.disabled, false);

const dashboard = [
  {
    id: 10,
    name: 'WBTC监控',
    quotes: [
      {
        id: 101,
        chain: 'ethereum',
        toChain: '',
        fromToken: '0xaaa',
        toToken: '0xbbb',
        symbol: '',
        amount: 1,
        showInverse: true,
        paused: false
      }
    ]
  }
];

const firstKey = buildDataTerminalRecordsCacheKey(dashboard, 1);
assert.strictEqual(firstKey, buildDataTerminalRecordsCacheKey(dashboard, 1));
assert.notStrictEqual(firstKey, buildDataTerminalRecordsCacheKey(dashboard, 2));

const arbSnapshotKey = buildArbRuleSnapshotCacheKey([
  {
    name: 'WBTC监控',
    quotes: [
      { id: 101, chain: 'ethereum', toChain: '', showInverse: true },
      { id: 102, chain: 'bsc', toChain: 'ethereum', showInverse: false, paused: true }
    ]
  },
  {
    name: 'ETH监控',
    quotes: [
      { id: 201, chain: 'arbitrum', toChain: '', showInverse: false }
    ]
  }
], 7);
assert.strictEqual(arbSnapshotKey, '7|WBTC监控:101:ethereum::1|ETH监控:201:arbitrum::0');
assert.strictEqual(
  arbSnapshotKey,
  buildArbRuleSnapshotCacheKey([
    {
      name: 'WBTC监控',
      quotes: [
        { id: 101, chain: 'ethereum', toChain: '', showInverse: true },
        { id: 102, chain: 'polygon', toChain: '', showInverse: true, paused: true }
      ]
    },
    {
      name: 'ETH监控',
      quotes: [
        { id: 201, chain: 'arbitrum', toChain: '', showInverse: false }
      ]
    }
  ], 7)
);
assert.notStrictEqual(arbSnapshotKey, buildArbRuleSnapshotCacheKey(dashboard, 8));

const pausedDashboard = JSON.parse(JSON.stringify(dashboard));
pausedDashboard[0].quotes[0].paused = true;
assert.notStrictEqual(firstKey, buildDataTerminalRecordsCacheKey(pausedDashboard, 1));

const retokenizedDashboard = JSON.parse(JSON.stringify(dashboard));
retokenizedDashboard[0].quotes[0].toToken = '0xccc';
assert.notStrictEqual(firstKey, buildDataTerminalRecordsCacheKey(retokenizedDashboard, 1));

const quotesByCategoryName = buildQuotesByCategoryName([
  {
    name: 'WBTC监控',
    quotes: [
      { id: 101, paused: false },
      { id: 102, paused: true }
    ]
  },
  {
    name: '',
    quotes: [{ id: 999 }]
  }
], (quote) => quote && quote.paused !== true);
assert.deepStrictEqual(Array.from(quotesByCategoryName.keys()), ['WBTC监控']);
assert.deepStrictEqual(quotesByCategoryName.get('WBTC监控').map((quote) => quote.id), [101]);

const quoteMetaById = buildQuoteMetaById([
  {
    name: 'WBTC监控',
    quotes: [{ id: 101 }, { id: '102' }]
  },
  {
    name: 'ETH监控',
    quotes: [{ id: 201 }]
  }
]);
assert.deepStrictEqual(quoteMetaById.get(101), { categoryName: 'WBTC监控' });
assert.deepStrictEqual(quoteMetaById.get('102'), { categoryName: 'WBTC监控' });
assert.deepStrictEqual(quoteMetaById.get(201), { categoryName: 'ETH监控' });

const marketState = {
  fromSymbol: 'cbBTC',
  toSymbol: 'WBTC',
  lastResultText: 'cbBTC ≈ 1.001 WBTC',
  lastRawPrice: 1.001,
  lastTotalAmountOut: 1.001,
  inverseRawPrice: 0.999,
  inverseTotalAmountOut: 0.999,
  inverseFromSymbol: 'WBTC',
  inverseToSymbol: 'cbBTC',
  usedSource: 'Kyber',
  usedSourceReal: 'Kyber',
  cexOrderbook: null,
  hasUnreadAlert: false,
  logShown: false,
  trendTimer: 123
};

const sameMarketStateWithUiChanges = {
  ...marketState,
  hasUnreadAlert: true,
  logShown: true,
  trendTimer: 456
};

assert.strictEqual(hasQuoteMarketStateChanged(marketState, sameMarketStateWithUiChanges), false);
assert.strictEqual(
  hasQuoteMarketStateChanged(marketState, { ...marketState, lastRawPrice: 1.002 }),
  true
);
assert.strictEqual(
  hasQuoteMarketStateChanged(marketState, {
    ...marketState,
    cexOrderbook: { bestBidPrice: 100, bestAskPrice: 101 }
  }),
  true
);

const sanitizedMarketState = sanitizeQuoteMarketState({
  ...marketState,
  isSoundActive: true
});
assert.deepStrictEqual(
  Object.keys(sanitizedMarketState).filter((field) => ['hasUnreadAlert', 'logShown', 'trendTimer', 'isSoundActive'].includes(field)),
  []
);
assert.strictEqual(sanitizedMarketState.lastRawPrice, marketState.lastRawPrice);

assert.deepStrictEqual(buildDefaultQuoteUiState(), {
  hasUnreadAlert: false,
  trendTimer: null
});
assert.deepStrictEqual(
  buildQuoteAlertUiUpdate({ hasUnreadAlert: false, trendTimer: 'timer-1' }, true),
  {
    nextState: { hasUnreadAlert: true, trendTimer: 'timer-1' },
    highlighted: true,
    highlightPast: false
  }
);
assert.deepStrictEqual(
  buildQuoteAlertUiUpdate({ hasUnreadAlert: true, trendTimer: null }, false),
  {
    nextState: { hasUnreadAlert: true, trendTimer: null },
    highlighted: false,
    highlightPast: true
  }
);
assert.deepStrictEqual(
  buildQuoteAlertUiUpdate({ hasUnreadAlert: false, trendTimer: null }, false),
  {
    nextState: { hasUnreadAlert: false, trendTimer: null },
    highlighted: false,
    highlightPast: false
  }
);
assert.strictEqual(hasActivePathAlertSound(new Map()), false);
assert.strictEqual(
  hasActivePathAlertSound(new Map([
    ['a', { isSoundActive: false }],
    ['b', { isSoundActive: true }]
  ])),
  true
);
assert.strictEqual(hasActivePathAlertSound([{ isSoundActive: true }]), false);

const quoteUiState = new Map();
assert.deepStrictEqual(getQuoteUiState(quoteUiState, 101), buildDefaultQuoteUiState());
assert.deepStrictEqual(
  setQuoteUiState(quoteUiState, '101', { hasUnreadAlert: true }),
  { hasUnreadAlert: true, trendTimer: null }
);
assert.deepStrictEqual(getQuoteUiState(quoteUiState, 101), {
  hasUnreadAlert: true,
  trendTimer: null
});
assert.deepStrictEqual(
  setQuoteUiState(quoteUiState, 101, { hasUnreadAlert: false }),
  { hasUnreadAlert: false, trendTimer: null }
);
assert.deepStrictEqual(getQuoteUiState(quoteUiState, '101'), {
  hasUnreadAlert: false,
  trendTimer: null
});

const clearedTimers = [];
setQuoteUiState(quoteUiState, 101, { trendTimer: 'timer-1' });
assert.strictEqual(clearQuoteTrendTimer(quoteUiState, '101', (timer) => clearedTimers.push(timer)), true);
assert.deepStrictEqual(clearedTimers, ['timer-1']);
assert.strictEqual(getQuoteUiState(quoteUiState, 101).trendTimer, null);
assert.strictEqual(clearQuoteTrendTimer(quoteUiState, '101', (timer) => clearedTimers.push(timer)), false);

setQuoteUiState(quoteUiState, 101, { hasUnreadAlert: true, trendTimer: 'timer-2' });
assert.deepStrictEqual(
  resetQuoteUiRuntimeState(quoteUiState, 101, (timer) => clearedTimers.push(timer)),
  buildDefaultQuoteUiState()
);
assert.deepStrictEqual(getQuoteUiState(quoteUiState, 101), buildDefaultQuoteUiState());
assert.ok(clearedTimers.includes('timer-2'));

setQuoteUiState(quoteUiState, 101, { trendTimer: 'timer-3' });
assert.strictEqual(deleteQuoteUiRuntimeState(quoteUiState, 101, (timer) => clearedTimers.push(timer)), true);
assert.deepStrictEqual(getQuoteUiState(quoteUiState, 101), buildDefaultQuoteUiState());
assert.ok(clearedTimers.includes('timer-3'));

assert.deepStrictEqual(
  buildQuoteResultMarketState(
    { hasUnreadAlert: true, fromSymbol: 'old' },
    {
      symbols: { from: 'ETH', to: 'USDC' },
      resultText: 'ETH result',
      rawPrice: 3200,
      finalAmountOut: 6400,
      usedSource: 'Velora',
      cexOrderbook: { bestBidPrice: 3199, bestAskPrice: 3201 }
    },
    { successSource: 'Velora' }
  ),
  {
    hasUnreadAlert: true,
    fromSymbol: 'ETH',
    toSymbol: 'USDC',
    lastResultText: 'ETH result',
    lastRawPrice: 3200,
    lastTotalAmountOut: 6400,
    cexOrderbook: { bestBidPrice: 3199, bestAskPrice: 3201 },
    usedSource: 'Velora',
    usedSourceReal: 'Velora'
  }
);

assert.deepStrictEqual(
  buildQuoteResultMarketState(
    { fromSymbol: 'ETH', toSymbol: 'USDC' },
    {
      symbols: { from: 'USDC', to: 'ETH' },
      rawPrice: 0.0003125,
      finalAmountOut: 0.625
    },
    { isInverseFetch: true }
  ),
  {
    fromSymbol: 'ETH',
    toSymbol: 'USDC',
    inverseRawPrice: 0.0003125,
    inverseTotalAmountOut: 0.625,
    inverseFromSymbol: 'USDC',
    inverseToSymbol: 'ETH'
  }
);

assert.deepStrictEqual(
  buildSwappedQuoteMarketState({
    fromSymbol: 'ETH',
    toSymbol: 'USDC',
    lastRawPrice: 3200,
    lastTotalAmountOut: 6400,
    inverseRawPrice: 0.0003125,
    inverseTotalAmountOut: 0.625,
    usedSource: 'Kyber'
  }),
  {
    fromSymbol: 'USDC',
    toSymbol: 'ETH',
    lastRawPrice: null,
    lastTotalAmountOut: null,
    inverseRawPrice: null,
    inverseTotalAmountOut: null,
    usedSource: 'Kyber'
  }
);

(async () => {
  const persistenceCalls = [];
  const savedPayloads = [];
  const loggedErrors = [];
  let scheduledSaveCallback = null;
  let shouldFailSave = false;
  const persistenceRuntime = createDashboardPersistenceRuntime({
    saveRuntime: {
      clear() {
        persistenceCalls.push(['clearScheduledSave']);
        return true;
      },
      getTimer() {
        return 'save-timer';
      },
      schedule(callback) {
        scheduledSaveCallback = callback;
        persistenceCalls.push(['scheduleSave']);
        return 'scheduled-save';
      }
    },
    feedbackRuntime: {
      showSaving(config) {
        persistenceCalls.push(['showSaving', config.manual]);
      },
      showSuccess() {
        persistenceCalls.push(['showSuccess']);
      },
      showError() {
        persistenceCalls.push(['showError']);
      }
    },
    getDashboardState: () => [{ id: 1, name: 'WBTC监控' }],
    getApiIntervals: () => ({ kyber: 3000 }),
    saveDashboardConfig(payload) {
      if (shouldFailSave) {
        throw new Error('save failed');
      }
      savedPayloads.push(payload);
    },
    logger: {
      error(...args) {
        loggedErrors.push(args);
      }
    }
  });

  assert.strictEqual(persistenceRuntime.scheduleSave(), 'scheduled-save');
  assert.strictEqual(typeof scheduledSaveCallback, 'function');
  scheduledSaveCallback();
  await Promise.resolve();
  assert.deepStrictEqual(savedPayloads, [
    {
      dashboard: [{ id: 1, name: 'WBTC监控' }],
      settings: { kyber: 3000 }
    }
  ]);
  assert.deepStrictEqual(persistenceCalls.slice(0, 3), [
    ['scheduleSave'],
    ['showSaving', false],
    ['showSuccess']
  ]);

  assert.strictEqual(await persistenceRuntime.performSave(true), true);
  assert.deepStrictEqual(persistenceCalls.slice(3, 6), [
    ['showSaving', true],
    ['clearScheduledSave'],
    ['showSuccess']
  ]);

  shouldFailSave = true;
  assert.strictEqual(await persistenceRuntime.performSave({ manual: true }), false);
  assert.deepStrictEqual(persistenceCalls.slice(6), [
    ['showSaving', true],
    ['clearScheduledSave'],
    ['showError']
  ]);
  assert.strictEqual(loggedErrors.length, 1);
  assert.strictEqual(loggedErrors[0][0], '配置保存失败:');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
