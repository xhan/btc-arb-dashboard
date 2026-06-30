(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardLifecycleController = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardLifecycleController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function addEventListener(element, type, handler) {
    if (!element || typeof element.addEventListener !== 'function') return false;
    if (typeof handler !== 'function') return false;
    element.addEventListener(type, handler);
    return true;
  }

  function addClickListener(element, handler) {
    return addEventListener(element, 'click', handler);
  }

  function stopEventPropagation(event) {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
  }

  function getDashboardQuotes(dashboardState) {
    const categories = Array.isArray(dashboardState) ? dashboardState : [];
    return categories.flatMap((category) => (
      Array.isArray(category && category.quotes) ? category.quotes : []
    ));
  }

  function seedQuoteMarketState(dashboardState, quoteMarketStateById, setQuoteMarketState) {
    if (typeof setQuoteMarketState !== 'function') return 0;
    const seed = quoteMarketStateById && typeof quoteMarketStateById === 'object' ? quoteMarketStateById : {};
    const quoteIds = new Map(
      getDashboardQuotes(dashboardState)
        .filter((quote) => quote && quote.id !== undefined && quote.id !== null)
        .map((quote) => [String(quote.id), quote.id])
    );
    let seededCount = 0;

    for (const [rawQuoteId, state] of Object.entries(seed)) {
      const quoteId = quoteIds.get(String(rawQuoteId));
      if (quoteId === undefined) continue;
      const fromSymbol = String(state && state.fromSymbol || '').trim();
      const toSymbol = String(state && state.toSymbol || '').trim();
      if (!fromSymbol || !toSymbol) continue;
      setQuoteMarketState(quoteId, { fromSymbol, toSymbol });
      seededCount += 1;
    }

    return seededCount;
  }

  function createDashboardLifecycleController(deps = {}) {
    const refs = deps.refs || {};
    const windowImpl = deps.windowImpl || (typeof window !== 'undefined' ? window : null);
    const documentImpl = deps.documentImpl || (typeof document !== 'undefined' ? document : null);
    let interactionEventsBound = false;

    function getDashboardState() {
      return typeof deps.getDashboardState === 'function' ? deps.getDashboardState() : [];
    }

    function getPriceSnapshotConfig() {
      return typeof deps.getPriceSnapshotConfig === 'function' ? deps.getPriceSnapshotConfig() : {};
    }

    function dispatchCommand(commandId) {
      if (!deps.dashboardCommandController || typeof deps.dashboardCommandController.dispatch !== 'function') {
        return false;
      }
      return deps.dashboardCommandController.dispatch(commandId);
    }

    async function loadPriceSnapshotConfig() {
      const config = await deps.dashboardApiClient.loadPriceSnapshotConfig();
      if (typeof deps.setPriceSnapshotConfig === 'function') {
        deps.setPriceSnapshotConfig(config);
      }
      return config;
    }

    async function loadArbSettings() {
      const priority = await deps.dashboardApiClient.loadArbSettings({
        normalizePriority: deps.normalizeArbCycleStartPriority,
        defaultPriority: deps.defaultArbCycleStartPriority
      });
      if (typeof deps.setArbCycleStartPriority === 'function') {
        deps.setArbCycleStartPriority(priority);
      }
      if (typeof deps.invalidateArbRuleSnapshotCache === 'function') {
        deps.invalidateArbRuleSnapshotCache();
      }
      if (typeof deps.clearTopologyCache === 'function') {
        deps.clearTopologyCache();
      }
      return priority;
    }

    async function loadRequestChannels() {
      const payload = await deps.dashboardApiClient.loadRequestChannels();
      deps.requestChannelRuntime.setPayload(payload);
      deps.requestChannelRuntime.updateTagsForDashboard(getDashboardState());
      return payload;
    }

    function handleConfirmModalClick(event) {
      const action = deps.dashboardRenderer.resolveConfirmModalClickAction(event, {
        modal: refs.confirmModal
      });
      if (action.type !== 'none') {
        stopEventPropagation(event);
      }
      if (action.type === 'confirm') {
        deps.confirmActionRuntime.confirm();
      }
      if (action.type === 'confirm' || action.type === 'close') {
        deps.confirmActionRuntime.close(refs.confirmModalRefs);
      }
    }

    function bindStaticEvents() {
      addClickListener(refs.manualSaveBtn, () => { void deps.performSave({ manual: true }); });
      addClickListener(refs.themeToggleBtn, () => { deps.themeRuntime.toggle(); });
      addClickListener(refs.confirmOkBtn, handleConfirmModalClick);
      addClickListener(refs.confirmCancelBtn, handleConfirmModalClick);
      addClickListener(refs.confirmModal, handleConfirmModalClick);
      addClickListener(refs.addCategoryBtn, deps.openAddCategoryModal);
      addEventListener(refs.dashboardEl, 'input', deps.handleDashboardInput);
      addEventListener(refs.dashboardEl, 'click', deps.handleDashboardClick);
      if (deps.keyboardShortcutController && typeof deps.keyboardShortcutController.bind === 'function') {
        deps.keyboardShortcutController.bind();
      }
      if (deps.settingsModalRuntime && typeof deps.settingsModalRuntime.bind === 'function') {
        deps.settingsModalRuntime.bind();
      }
      if (deps.dashboardFormController && typeof deps.dashboardFormController.bind === 'function') {
        deps.dashboardFormController.bind();
      }
      bindInteractionEvents();
    }

    function bindFloatingPanels() {
      if (
        refs.alertLogWindow
        && refs.alertLogHeader
        && deps.domRenderUtils
        && typeof deps.domRenderUtils.bindFloatingPanelChrome === 'function'
      ) {
        deps.domRenderUtils.bindFloatingPanelChrome(refs.alertLogWindow, refs.alertLogHeader, {
          documentImpl,
          zIndexRuntime: deps.floatingPanelZIndexRuntime
        });
      }
      if (
        refs.arbPathWindow
        && refs.arbPathHeader
        && deps.domRenderUtils
        && typeof deps.domRenderUtils.bindFloatingPanelChrome === 'function'
      ) {
        deps.domRenderUtils.bindFloatingPanelChrome(refs.arbPathWindow, refs.arbPathHeader, {
          documentImpl,
          zIndexRuntime: deps.floatingPanelZIndexRuntime,
          draggable: false
        });
      }
      if (deps.quoteSpreadController && typeof deps.quoteSpreadController.bindPanelChrome === 'function') {
        deps.quoteSpreadController.bindPanelChrome();
      }
    }

    function bindToolbarEvents() {
      addClickListener(refs.toggleArbBtn, () => dispatchCommand('toggle-arb-panel'));
      addClickListener(refs.toggleQuoteDisplayBtn, () => dispatchCommand('toggle-quote-display'));
      addClickListener(refs.toggleDataTerminalBtn, () => dispatchCommand('toggle-data-terminal'));
      if (deps.quoteSpreadController && typeof deps.quoteSpreadController.bindEvents === 'function') {
        deps.quoteSpreadController.bindEvents();
      }
      addClickListener(refs.toggleAlertLogBtn, () => dispatchCommand('toggle-alert-log'));
      addClickListener(refs.toggleMultiChannelBtn, () => dispatchCommand('toggle-multi-channel'));
    }

    function bindAlertLogEvents() {
      if (!refs.alertLogWindow || !deps.alertRuntimeController) return;
      addEventListener(refs.alertLogWindow, 'click', deps.alertRuntimeController.handleAlertLogClick);
      addEventListener(refs.alertLogWindow, 'change', deps.alertRuntimeController.handleAlertSettingsChange);
    }

    function bindPanelMinimizeEvents() {
      addClickListener(refs.arbPathMinBtn, (event) => {
        stopEventPropagation(event);
        dispatchCommand('toggle-arb-panel');
      });
      addClickListener(refs.alertLogMinBtn, (event) => {
        stopEventPropagation(event);
        dispatchCommand('toggle-alert-log');
      });
    }

    function bindInteractionEvents() {
      if (interactionEventsBound) return false;
      interactionEventsBound = true;
      if (windowImpl && typeof windowImpl.addEventListener === 'function') {
        if (deps.alertRuntimeController && typeof deps.alertRuntimeController.handlePathAlertConfigSyncStorage === 'function') {
          windowImpl.addEventListener('storage', deps.alertRuntimeController.handlePathAlertConfigSyncStorage);
        }
        if (typeof deps.setArbPanelMaxHeight === 'function') {
          windowImpl.addEventListener('resize', deps.setArbPanelMaxHeight);
        }
      }
      if (deps.dashboardViewModeController && typeof deps.dashboardViewModeController.bind === 'function') {
        deps.dashboardViewModeController.bind();
      }
      bindFloatingPanels();
      bindToolbarEvents();
      bindAlertLogEvents();
      if (deps.arbPanelController && typeof deps.arbPanelController.bindContentEvents === 'function') {
        deps.arbPanelController.bindContentEvents();
      }
      if (deps.arbDetailController && typeof deps.arbDetailController.bindGridEvents === 'function') {
        deps.arbDetailController.bindGridEvents();
      }
      if (deps.arbDetailController && typeof deps.arbDetailController.bindChromeEvents === 'function') {
        deps.arbDetailController.bindChromeEvents();
      }
      if (deps.arbPanelController && typeof deps.arbPanelController.bindGlobalFilterEvents === 'function') {
        deps.arbPanelController.bindGlobalFilterEvents();
      }
      bindPanelMinimizeEvents();
      return true;
    }

    function shouldRenderDashboardOnInit() {
      if (
        deps.dashboardViewModeController
        && typeof deps.dashboardViewModeController.getMode === 'function'
      ) {
        return deps.dashboardViewModeController.getMode() === 'dashboard';
      }
      return true;
    }

    function renderLoadError(error) {
      if (!refs.dashboardEl) return;
      refs.dashboardEl.innerHTML = `<div class="module"><h2 style="color: var(--error-color);">加载配置失败</h2><p>${error.message}。请确保后端服务已启动并刷新页面。</p></div>`;
    }

    async function init() {
      bindInteractionEvents();
      if (refs.audioNoticeEl) {
        refs.audioNoticeEl.style.display = 'block';
      }
      deps.requestChannelRuntime.loadMultiChannelEnabled();
      deps.requestChannelTagVisibilityRuntime.apply();
      await deps.dashboardApiClient.requestBackendConfigRefresh();
      await loadPriceSnapshotConfig();
      await loadArbSettings();
      deps.themeRuntime.load();
      deps.alertRuntimeController.loadMutedPathState();

      try {
        const loadedConfig = await deps.dashboardApiClient.loadDashboardConfig(deps.defaultIntervals);
        deps.setDashboardState(loadedConfig.dashboardState);
        seedQuoteMarketState(loadedConfig.dashboardState, loadedConfig.quoteMarketStateById, deps.setQuoteMarketState);
        deps.setApiIntervals(loadedConfig.apiIntervals);
        if (loadedConfig.migratedSolanaInterval) {
          deps.saveData();
        }
        deps.requestChannelRuntime.setDefaultIntervals(loadedConfig.apiIntervals);
        await loadRequestChannels();
        await deps.alertRuntimeController.loadPathAlertConfig();

        if (shouldRenderDashboardOnInit()) {
          deps.renderDashboard();
        }
        deps.updateArbPanel();
        deps.setArbPanelMaxHeight();
        deps.alertRuntimeController.renderAlertSettingsPanel();

        for (const quote of getDashboardQuotes(getDashboardState())) {
          deps.addToQueue(quote);
        }

        deps.arbDetailController.syncQuoteRunStateTag();
        deps.updateSchedulers();
        deps.priceSnapshotTimerRuntime.start(getPriceSnapshotConfig(), () => {
          void deps.priceSnapshotSaveRuntime.saveIfNeeded();
        });
        deps.alertRuntimeController.restartPathAlertScheduler();

        if (refs.alertLogMutedLogContent) {
          deps.alertRuntimeController.restoreMutedAlertLogEntries(Date.now());
        }
        deps.alertRuntimeController.renderMutedAlertStatePanel(Date.now());
        deps.alertRuntimeController.renderAlertLogTabState();
        deps.alertRuntimeController.syncMutedPathLogTimer();
        deps.applyQuoteDisplayToggleButtonState();
      } catch (error) {
        renderLoadError(error);
      }
    }

    return {
      bindStaticEvents,
      bindInteractionEvents,
      init,
      loadArbSettings,
      loadPriceSnapshotConfig,
      loadRequestChannels
    };
  }

  return {
    addEventListener,
    addClickListener,
    createDashboardLifecycleController,
    getDashboardQuotes
  };
});
