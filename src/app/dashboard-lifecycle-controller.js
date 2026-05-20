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
  function addClickListener(element, handler) {
    if (!element || typeof element.addEventListener !== 'function') return false;
    element.addEventListener('click', handler);
    return true;
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

  function createDashboardLifecycleController(deps = {}) {
    const refs = deps.refs || {};
    const windowImpl = deps.windowImpl || (typeof window !== 'undefined' ? window : null);
    const documentImpl = deps.documentImpl || (typeof document !== 'undefined' ? document : null);

    function getDashboardState() {
      return typeof deps.getDashboardState === 'function' ? deps.getDashboardState() : [];
    }

    function getPriceSnapshotConfig() {
      return typeof deps.getPriceSnapshotConfig === 'function' ? deps.getPriceSnapshotConfig() : {};
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
    }

    function bindFloatingPanels() {
      if (refs.alertLogWindow && refs.alertLogHeader) {
        deps.domRenderUtils.bindFloatingPanelChrome(refs.alertLogWindow, refs.alertLogHeader, {
          documentImpl,
          zIndexRuntime: deps.floatingPanelZIndexRuntime
        });
      }
      if (refs.arbPathWindow && refs.arbPathHeader) {
        deps.domRenderUtils.bindFloatingPanelChrome(refs.arbPathWindow, refs.arbPathHeader, {
          documentImpl,
          zIndexRuntime: deps.floatingPanelZIndexRuntime,
          draggable: false
        });
      }
      deps.quoteSpreadController.bindPanelChrome();
    }

    function bindToolbarEvents() {
      addClickListener(refs.toggleArbBtn, deps.toggleArbPanel);
      addClickListener(refs.toggleQuoteDisplayBtn, deps.toggleQuoteDisplayMode);
      addClickListener(refs.toggleDataTerminalBtn, deps.toggleDataTerminalPanel);
      deps.quoteSpreadController.bindEvents();
      addClickListener(refs.toggleAlertLogBtn, deps.alertRuntimeController.toggleAlertLogPanel);
      addClickListener(refs.toggleMultiChannelBtn, deps.toggleMultiChannel);
    }

    function bindAlertLogEvents() {
      if (!refs.alertLogWindow) return;
      refs.alertLogWindow.addEventListener('click', deps.alertRuntimeController.handleAlertLogClick);
      refs.alertLogWindow.addEventListener('change', deps.alertRuntimeController.handleAlertSettingsChange);
    }

    function bindPanelMinimizeEvents() {
      addClickListener(refs.arbPathMinBtn, (event) => {
        stopEventPropagation(event);
        deps.toggleArbPanel();
      });
      addClickListener(refs.alertLogMinBtn, (event) => {
        stopEventPropagation(event);
        deps.alertRuntimeController.toggleAlertLogPanel();
      });
    }

    function bindLoadedEvents() {
      if (windowImpl && typeof windowImpl.addEventListener === 'function') {
        windowImpl.addEventListener('storage', deps.alertRuntimeController.handlePathAlertConfigSyncStorage);
        windowImpl.addEventListener('resize', deps.setArbPanelMaxHeight);
      }
      if (deps.dashboardViewModeController && typeof deps.dashboardViewModeController.bind === 'function') {
        deps.dashboardViewModeController.bind();
      }
      bindFloatingPanels();
      bindToolbarEvents();
      bindAlertLogEvents();
      deps.arbPanelController.bindContentEvents();
      deps.arbDetailController.bindGridEvents();
      deps.arbDetailController.bindChromeEvents();
      deps.arbPanelController.bindGlobalFilterEvents();
      deps.keyboardShortcutController.bind();
      bindPanelMinimizeEvents();
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
        bindLoadedEvents();
      } catch (error) {
        renderLoadError(error);
      }
    }

    return {
      bindStaticEvents,
      init,
      loadArbSettings,
      loadPriceSnapshotConfig,
      loadRequestChannels
    };
  }

  return {
    addClickListener,
    createDashboardLifecycleController,
    getDashboardQuotes
  };
});
