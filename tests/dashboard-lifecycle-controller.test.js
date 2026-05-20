const assert = require('assert');

const {
  createDashboardLifecycleController,
  getDashboardQuotes
} = require('../src/app/dashboard-lifecycle-controller');

function createFakeElement() {
  const listeners = {};
  return {
    innerHTML: '',
    listeners,
    style: {},
    addEventListener(type, handler) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
    },
    dispatch(type, event = {}) {
      for (const handler of listeners[type] || []) {
        handler(event);
      }
    }
  };
}

function createWindowStub() {
  const listeners = {};
  return {
    listeners,
    addEventListener(type, handler) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
    }
  };
}

assert.deepStrictEqual(getDashboardQuotes(null), []);
assert.deepStrictEqual(
  getDashboardQuotes([
    { quotes: [{ id: 101 }, { id: 102 }] },
    {},
    { quotes: [{ id: 201 }] }
  ]).map((quote) => quote.id),
  [101, 102, 201]
);

const manualSaveBtn = createFakeElement();
const themeToggleBtn = createFakeElement();
const confirmModal = createFakeElement();
const confirmOkBtn = createFakeElement();
const confirmCancelBtn = createFakeElement();
const staticCalls = [];
const staticController = createDashboardLifecycleController({
  confirmActionRuntime: {
    close(refs) {
      staticCalls.push(['confirmClose', refs && refs.id]);
    },
    confirm() {
      staticCalls.push(['confirm']);
    }
  },
  dashboardRenderer: {
    resolveConfirmModalClickAction(event) {
      return { type: event.actionType || 'none' };
    }
  },
  performSave(options) {
    staticCalls.push(['performSave', options.manual]);
  },
  refs: {
    manualSaveBtn,
    themeToggleBtn,
    confirmModal,
    confirmOkBtn,
    confirmCancelBtn,
    confirmModalRefs: { id: 'confirm-refs' }
  },
  themeRuntime: {
    toggle() {
      staticCalls.push(['themeToggle']);
    }
  }
});
staticController.bindStaticEvents();
manualSaveBtn.dispatch('click');
themeToggleBtn.dispatch('click');
confirmOkBtn.dispatch('click', {
  actionType: 'confirm',
  stopPropagation() {
    staticCalls.push(['stopConfirm']);
  }
});
confirmCancelBtn.dispatch('click', {
  actionType: 'close',
  stopPropagation() {
    staticCalls.push(['stopClose']);
  }
});
confirmModal.dispatch('click', { actionType: 'none' });
assert.deepStrictEqual(staticCalls, [
  ['performSave', true],
  ['themeToggle'],
  ['stopConfirm'],
  ['confirm'],
  ['confirmClose', 'confirm-refs'],
  ['stopClose'],
  ['confirmClose', 'confirm-refs']
]);

(async () => {
  const calls = [];
  let dashboardState = [];
  let apiIntervals = {};
  let priceSnapshotConfig = { enabled: false };
  let arbCycleStartPriority = [];
  const dashboardEl = createFakeElement();
  const audioNoticeEl = createFakeElement();
  const alertLogWindow = createFakeElement();
  const alertLogHeader = createFakeElement();
  const arbPathWindow = createFakeElement();
  const arbPathHeader = createFakeElement();
  const arbPathMinBtn = createFakeElement();
  const toggleArbBtn = createFakeElement();
  const toggleAlertLogBtn = createFakeElement();
  const windowImpl = createWindowStub();
  const lifecycleController = createDashboardLifecycleController({
    addToQueue(quote) {
      calls.push(['addToQueue', quote.id]);
    },
    alertRuntimeController: {
      handleAlertLogClick: () => calls.push(['alertLogClick']),
      handleAlertSettingsChange: () => calls.push(['alertSettingsChange']),
      handlePathAlertConfigSyncStorage: () => calls.push(['storage']),
      loadMutedPathState: () => calls.push(['loadMutedPathState']),
      loadPathAlertConfig: async () => calls.push(['loadPathAlertConfig']),
      renderAlertLogTabState: () => calls.push(['renderAlertLogTabState']),
      renderAlertSettingsPanel: () => calls.push(['renderAlertSettingsPanel']),
      renderMutedAlertStatePanel: () => calls.push(['renderMutedAlertStatePanel']),
      restartPathAlertScheduler: () => calls.push(['restartPathAlertScheduler']),
      restoreMutedAlertLogEntries: () => calls.push(['restoreMutedAlertLogEntries']),
      syncMutedPathLogTimer: () => calls.push(['syncMutedPathLogTimer']),
      toggleAlertLogPanel: () => calls.push(['toggleAlertLogPanel'])
    },
    applyQuoteDisplayToggleButtonState: () => calls.push(['applyQuoteDisplayToggleButtonState']),
    arbDetailController: {
      bindChromeEvents: () => calls.push(['bindArbDetailChrome']),
      bindGridEvents: () => calls.push(['bindArbDetailGrid']),
      syncQuoteRunStateTag: () => calls.push(['syncQuoteRunStateTag'])
    },
    arbPanelController: {
      bindContentEvents: () => calls.push(['bindArbPanelContent']),
      bindGlobalFilterEvents: () => calls.push(['bindArbPanelFilters'])
    },
    clearTopologyCache: () => calls.push(['clearTopologyCache']),
    dashboardApiClient: {
      loadArbSettings: async () => ['priority-a', 'priority-b'],
      loadDashboardConfig: async () => ({
        dashboardState: [
          { quotes: [{ id: 101 }, { id: 102 }] },
          { quotes: [{ id: 201 }] }
        ],
        apiIntervals: { kyber: 3000 },
        migratedSolanaInterval: true
      }),
      loadPriceSnapshotConfig: async () => ({ enabled: true, intervalSec: 5 }),
      loadRequestChannels: async () => ({ channels: [{ id: 'fast' }] }),
      requestBackendConfigRefresh: async () => calls.push(['requestBackendConfigRefresh'])
    },
    dashboardViewModeController: {
      bind: () => calls.push(['bindDashboardViewMode'])
    },
    defaultArbCycleStartPriority: ['default'],
    defaultIntervals: { kyber: 5000 },
    documentImpl: {},
    domRenderUtils: {
      bindFloatingPanelChrome(panel, header, options) {
        calls.push(['bindFloatingPanelChrome', panel === alertLogWindow, header === alertLogHeader, options.draggable]);
      }
    },
    floatingPanelZIndexRuntime: { id: 'z-index' },
    getDashboardState: () => dashboardState,
    getPriceSnapshotConfig: () => priceSnapshotConfig,
    invalidateArbRuleSnapshotCache: () => calls.push(['invalidateArbRuleSnapshotCache']),
    keyboardShortcutController: {
      bind: () => calls.push(['bindKeyboard'])
    },
    normalizeArbCycleStartPriority: (value) => value,
    priceSnapshotSaveRuntime: {
      saveIfNeeded() {
        calls.push(['savePriceSnapshot']);
      }
    },
    priceSnapshotTimerRuntime: {
      start(config, callback) {
        calls.push(['startPriceSnapshotTimer', config.enabled, config.intervalSec, typeof callback]);
      }
    },
    quoteSpreadController: {
      bindEvents: () => calls.push(['bindQuoteSpreadEvents']),
      bindPanelChrome: () => calls.push(['bindQuoteSpreadChrome'])
    },
    renderDashboard: () => calls.push(['renderDashboard']),
    requestChannelRuntime: {
      loadMultiChannelEnabled: () => calls.push(['loadMultiChannelEnabled']),
      setDefaultIntervals: (intervals) => calls.push(['setDefaultIntervals', intervals.kyber]),
      setPayload: (payload) => calls.push(['setRequestChannels', payload.channels.length]),
      updateTagsForDashboard: (state) => calls.push(['updateTagsForDashboard', state.length])
    },
    requestChannelTagVisibilityRuntime: {
      apply: () => calls.push(['applyRequestChannelTagVisibility'])
    },
    refs: {
      dashboardEl,
      audioNoticeEl,
      alertLogWindow,
      alertLogHeader,
      alertLogMutedLogContent: createFakeElement(),
      arbPathWindow,
      arbPathHeader,
      arbPathMinBtn,
      toggleArbBtn,
      toggleAlertLogBtn
    },
    saveData: () => calls.push(['saveData']),
    setApiIntervals: (nextIntervals) => { apiIntervals = nextIntervals; },
    setArbCycleStartPriority: (nextPriority) => { arbCycleStartPriority = nextPriority; },
    setArbPanelMaxHeight: () => calls.push(['setArbPanelMaxHeight']),
    setDashboardState: (nextState) => { dashboardState = nextState; },
    setPriceSnapshotConfig: (nextConfig) => { priceSnapshotConfig = nextConfig; },
    themeRuntime: {
      load: () => calls.push(['themeLoad'])
    },
    toggleArbPanel: () => calls.push(['toggleArbPanel']),
    toggleDataTerminalPanel: () => calls.push(['toggleDataTerminalPanel']),
    toggleMultiChannel: () => calls.push(['toggleMultiChannel']),
    toggleQuoteDisplayMode: () => calls.push(['toggleQuoteDisplayMode']),
    updateArbPanel: () => calls.push(['updateArbPanel']),
    updateSchedulers: () => calls.push(['updateSchedulers']),
    windowImpl
  });

  await lifecycleController.init();

  assert.strictEqual(audioNoticeEl.style.display, 'block');
  assert.deepStrictEqual(priceSnapshotConfig, { enabled: true, intervalSec: 5 });
  assert.deepStrictEqual(arbCycleStartPriority, ['priority-a', 'priority-b']);
  assert.deepStrictEqual(apiIntervals, { kyber: 3000 });
  assert.deepStrictEqual(dashboardState.map((category) => category.quotes.length), [2, 1]);
  assert.ok(calls.some((call) => call[0] === 'saveData'));
  assert.deepStrictEqual(
    calls.filter((call) => call[0] === 'addToQueue').map((call) => call[1]),
    [101, 102, 201]
  );
  assert.ok(calls.some((call) => call[0] === 'startPriceSnapshotTimer' && call[1] === true && call[2] === 5));
  assert.strictEqual(windowImpl.listeners.storage.length, 1);
  assert.strictEqual(windowImpl.listeners.resize.length, 1);
  assert.strictEqual(alertLogWindow.listeners.click.length, 1);
  assert.strictEqual(alertLogWindow.listeners.change.length, 1);
  assert.ok(calls.some((call) => call[0] === 'bindDashboardViewMode'));

  arbPathMinBtn.dispatch('click', {
    stopPropagation() {
      calls.push(['stopArbMin']);
    }
  });
  toggleAlertLogBtn.dispatch('click');
  assert.ok(calls.some((call) => call[0] === 'stopArbMin'));
  assert.ok(calls.some((call) => call[0] === 'toggleArbPanel'));
  assert.ok(calls.some((call) => call[0] === 'toggleAlertLogPanel'));

  const failingDashboardEl = createFakeElement();
  const failingController = createDashboardLifecycleController({
    alertRuntimeController: {
      loadMutedPathState() {}
    },
    dashboardApiClient: {
      loadArbSettings: async () => [],
      loadDashboardConfig: async () => {
        throw new Error('config broken');
      },
      loadPriceSnapshotConfig: async () => ({}),
      requestBackendConfigRefresh: async () => {}
    },
    requestChannelRuntime: {
      loadMultiChannelEnabled() {}
    },
    requestChannelTagVisibilityRuntime: {
      apply() {}
    },
    refs: {
      dashboardEl: failingDashboardEl
    },
    setApiIntervals() {},
    setArbCycleStartPriority() {},
    setDashboardState() {},
    setPriceSnapshotConfig() {},
    themeRuntime: {
      load() {}
    }
  });
  await failingController.init();
  assert.ok(failingDashboardEl.innerHTML.includes('加载配置失败'));
  assert.ok(failingDashboardEl.innerHTML.includes('config broken'));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
