(function () {
    const {
        AMOUNT_INPUT_DEBOUNCE_MS,
        DASHBOARD_SAVE_DEBOUNCE_MS,
        CHART_AUTO_REFRESH_INTERVAL_MS,
        FLOATING_PANEL_BASE_Z_INDEX,
        DATA_TERMINAL_UPDATE_DELAY_MS,
        DEFAULT_QUOTE_DISPLAY_MODE,
        ARB_PANEL_UPDATE_DELAY_MS,
        ARB_DETAIL_REFRESH_INTERVAL_MS,
        MUTED_STATE_VISIBLE_REFRESH_MS,
        MUTED_STATE_HIDDEN_MAX_REFRESH_MS,
        GLOBAL_PATH_SOURCE_SELECTORS,
        buildBackendUrl
    } = window.DashboardAppConfig;
    const BACKEND_URL = buildBackendUrl(location);
    const dashboardModules = window.DashboardModuleRegistry.createDashboardModuleRegistry(window);
    const {
        getArbDetailUtils,
        getDashboardAppBoardRuntime,
        getDashboardAppCommandRuntime,
        getDashboardAppLifecycleRuntime,
        getDashboardAppRefGroups,
        getDashboardAppShellRuntime,
        getDashboardAppWorkspaceRuntime,
        getDashboardCoreRuntime,
        getDashboardDomRefs
    } = dashboardModules;
    const coreRuntime = getDashboardCoreRuntime().createDashboardCoreRuntime({
        modules: dashboardModules,
        constants: {
            amountInputDebounceMs: AMOUNT_INPUT_DEBOUNCE_MS,
            floatingPanelBaseZIndex: FLOATING_PANEL_BASE_Z_INDEX
        },
        deps: {
            backendUrl: BACKEND_URL,
            documentImpl: document,
            fetchImpl: fetch,
            logger: console
        },
        timers: {
            setInterval,
            clearInterval,
            setTimeout,
            clearTimeout
        }
    });
    const {
        dashboardRuntimeUtils,
        domRenderUtils,
        closestEventTarget,
        dashboardInputInteractionRuntime,
        defaultIntervals: DEFAULT_INTERVALS,
        defaultArbCycleStartPriority: DEFAULT_ARB_CYCLE_START_PRIORITY,
        getDashboardState,
        setDashboardState,
        getApiIntervals,
        setApiIntervals,
        getArbCycleStartPriority,
        setArbCycleStartPriority,
        getPriceSnapshotConfig,
        setPriceSnapshotConfig,
        dashboardApiClient,
        dashboardRuntimeBridge,
        floatingPanelZIndexRuntime,
        quoteStateRuntime,
        getQuoteMarketState,
        getQuoteMarketStateMap,
        setQuoteMarketState,
        deleteQuoteMarketState,
        resetQuoteUiRuntimeState,
        deleteQuoteUiRuntimeState,
        priceSnapshotTimerRuntime,
        priceSnapshotSaveRuntime,
        amountInputDebounceRuntime
    } = coreRuntime;
    const {
        quoteRuntimeRef,
        arbAlertRuntimeRef,
        arbWorkspaceRuntimeRef,
        dataTerminalRuntimeRef,
        dashboardViewRenderRuntimeRef,
        abortActiveFetchControllers,
        fetchQuoteByStrategy,
        updateSchedulers,
        invalidateArbRuleSnapshotCache,
        updateArbPanel,
        isArbDetailSchedulerPaused,
        recordArbDetailSourceAttempt,
        handleQuoteMainFetchSuccess,
        handleQuoteMarketStateChanged,
        scheduleDataTerminalUpdate,
        isDashboardViewActive,
        markDashboardViewDirty,
        renderDashboardForCurrentState
    } = dashboardRuntimeBridge;
    const dashboardDomRefs = getDashboardDomRefs().createDashboardDomRefs(document);
    const dashboardAppRefGroups = getDashboardAppRefGroups().createDashboardAppRefGroups({
        refs: dashboardDomRefs,
        bodyEl: document.body
    });

    const dashboardShellRuntime = getDashboardAppShellRuntime().createDashboardAppShellRuntime({
        modules: dashboardModules,
        constants: {
            dashboardSaveDebounceMs: DASHBOARD_SAVE_DEBOUNCE_MS,
            defaultIntervals: DEFAULT_INTERVALS
        },
        deps: {
            dashboardApiClient,
            dashboardRuntimeUtils,
            documentImpl: document,
            getApiIntervals,
            getDashboardLocalStorage,
            getDashboardState,
            logger: console,
            setApiIntervals,
            updateSchedulers
        },
        refs: dashboardAppRefGroups.shell,
        timers: {
            clearTimeout,
            setTimeout
        }
    });
    const themeRuntime = dashboardShellRuntime.themeRuntime;
    const performSave = dashboardShellRuntime.performSave;
    const saveData = dashboardShellRuntime.saveData;
    const settingsModalRuntime = dashboardShellRuntime.settingsModalRuntime;
    const addQuoteModalSelectionRuntime = dashboardShellRuntime.addQuoteModalSelectionRuntime;
    const quoteSettingsSelectionRuntime = dashboardShellRuntime.quoteSettingsSelectionRuntime;
    const confirmActionRuntime = dashboardShellRuntime.confirmActionRuntime;
    const requestChannelRuntime = dashboardShellRuntime.requestChannelRuntime;
    const getEffectiveRequestChannelIdForQuote = dashboardShellRuntime.getEffectiveRequestChannelIdForQuote;
    const updateRequestChannelTagForQuote = dashboardShellRuntime.updateRequestChannelTagForQuote;
    const requestChannelTagVisibilityRuntime = dashboardShellRuntime.requestChannelTagVisibilityRuntime;
    const copyToastRuntime = dashboardShellRuntime.copyToastRuntime;

    const dashboardAppWorkspaceRuntime = getDashboardAppWorkspaceRuntime().createDashboardAppWorkspaceRuntime({
        modules: dashboardModules,
        constants: {
            defaultIntervals: DEFAULT_INTERVALS,
            initialQuoteDisplayMode: DEFAULT_QUOTE_DISPLAY_MODE,
            arbDetailRefreshIntervalMs: ARB_DETAIL_REFRESH_INTERVAL_MS,
            arbPanelUpdateDelayMs: ARB_PANEL_UPDATE_DELAY_MS,
            chartAutoRefreshIntervalMs: CHART_AUTO_REFRESH_INTERVAL_MS,
            dataTerminalUpdateDelayMs: DATA_TERMINAL_UPDATE_DELAY_MS,
            globalPathSourceSelectors: GLOBAL_PATH_SOURCE_SELECTORS,
            highlightDurationMs: 8000,
            mutedStateHiddenMaxRefreshMs: MUTED_STATE_HIDDEN_MAX_REFRESH_MS,
            mutedStateVisibleRefreshMs: MUTED_STATE_VISIBLE_REFRESH_MS
        },
        deps: {
            AbortController,
            AudioCtor: Audio,
            abortActiveFetchControllers,
            arbAlertRuntimeRef,
            arbWorkspaceRuntimeRef,
            backendUrl: BACKEND_URL,
            bodyEl: document.body,
            closestEventTarget,
            copyToastRuntime,
            dashboardRuntimeUtils,
            dataTerminalRuntimeRef,
            documentImpl: document,
            domRenderUtils,
            fetchImpl: fetch,
            fetchQuoteByStrategy,
            getApiIntervals,
            getArbCycleStartPriority,
            getDashboardLocalStorage,
            getDashboardState,
            getEffectiveRequestChannelIdForQuote,
            getQuoteMarketState,
            getQuoteMarketStateMap,
            interactionRuntime: dashboardInputInteractionRuntime,
            isDashboardUiActive: isDashboardViewActive,
            isSchedulerPaused: isArbDetailSchedulerPaused,
            logger: console,
            markDashboardUiDirty: markDashboardViewDirty,
            onQuoteMainFetchSuccess: handleQuoteMainFetchSuccess,
            onQuoteMarketStateChanged: handleQuoteMarketStateChanged,
            onQuoteMarketStateChangedSideEffect: scheduleDataTerminalUpdate,
            onShowDashboard: renderDashboardForCurrentState,
            quoteRuntimeRef,
            quoteStateRuntime,
            recordSourceAttempt: recordArbDetailSourceAttempt,
            requestChannelRuntime,
            resetQuoteUiRuntimeState,
            setQuoteMarketState,
            updateSchedulers,
            windowImpl: window,
            zIndexRuntime: floatingPanelZIndexRuntime
        },
        refs: dashboardAppRefGroups.workspace,
        timers: {
            setInterval,
            clearInterval,
            setTimeout,
            clearTimeout
        }
    });
    const {
        activeFetchControllerRuntime,
        addToQueue,
        applyActiveQuoteUiState,
        applyPausedQuoteUiState,
        applyQuoteDisplayToggleButtonState,
        copyDexLinkFromElement,
        copyPriceText,
        copyTextToClipboard,
        defaultSourceResolver,
        getActiveQuotes,
        getCategoryPauseAction,
        getInverseQuoteDisplayText,
        getQuoteChainDisplayName,
        getQuoteDisplayMode,
        getQuoteDisplayText,
        isCexOrderbookChain,
        isCrossChainQuote,
        isEvmChain,
        isQuotePaused,
        normalizeChainKey,
        handleQuoteHover,
        queueQuoteRefresh,
        removeFromQueue,
        shouldQueueInverseFetch,
        showCopyToast,
        toggleMultiChannel,
        toggleQuoteDisplayMode,
        updateQuotePairLabel,
        updateTrendArrow,
        alertRuntimeController,
        arbDetailController,
        arbPanelController,
        dashboardViewModeController,
        buildLiveQuoteLabel,
        clearTopologyCache,
        formatArbPathLegLine,
        formatChainLabel,
        getSharedArbRuleSnapshot,
        isRuleLeg,
        scheduleArbPanelUpdate,
        setArbPanelMaxHeight,
        closeArbDetailModal,
        openArbDetailModal,
        renderArbDetailModal,
        quoteSpreadController,
        renderDataTerminalPanel,
        toggleDataTerminalPanel
    } = dashboardAppWorkspaceRuntime;

    const dashboardCommandRuntime = getDashboardAppCommandRuntime().createDashboardAppCommandRuntime({
        modules: dashboardModules,
        deps: {
            alertRuntimeController,
            arbDetailController,
            closeArbDetailModal,
            dashboardViewModeController,
            documentImpl: document,
            requestChannelTagVisibilityRuntime,
            toggleDataTerminalPanel,
            toggleMultiChannel,
            toggleQuoteDisplayMode
        }
    });
    const { dashboardCommandController, keyboardShortcutController } = dashboardCommandRuntime;

    function getDashboardLocalStorage() {
        return dashboardRuntimeUtils.getBrowserLocalStorage({ window }, {
            onError: (error) => console.warn('访问浏览器本地缓存失败:', error)
        });
    }

    const dashboardAppBoardRuntime = getDashboardAppBoardRuntime().createDashboardAppBoardRuntime({
        modules: dashboardModules,
        deps: {
            activeFetchControllerRuntime,
            addQuoteModalSelectionRuntime,
            amountInputDebounceRuntime,
            closeArbDetailModal,
            closestEventTarget,
            confirmActionRuntime,
            copyDexLinkFromElement,
            copyPriceText,
            dashboardRuntimeUtils,
            dashboardViewModeController,
            dashboardViewRenderRuntimeRef,
            defaultSourceResolver,
            deleteQuoteMarketState,
            deleteQuoteUiRuntimeState,
            documentImpl: document,
            domRenderUtils,
            evaluatePathAlertsOnce: alertRuntimeController.evaluatePathAlertsOnce,
            formatChainLabel,
            getArbDetailState: () => arbDetailController.getState(),
            getCategoryPauseAction,
            getDashboardState,
            getInverseQuoteDisplayText,
            getQuoteChainDisplayName,
            getQuoteDisplayText,
            getQuoteMarketState,
            getRequestChannelOptions: () => requestChannelRuntime.getOptions(),
            handleQuoteHover,
            interactionRuntime: dashboardInputInteractionRuntime,
            isCexOrderbookChain,
            isCrossChainQuote,
            isEvmChain,
            isQuotePaused,
            logger: console,
            normalizeChainKey,
            quoteSettingsSelectionRuntime,
            quoteStateRuntime,
            queueQuoteRefresh,
            removeFromQueue,
            renderDataTerminalPanel,
            resetQuoteUiRuntimeState,
            saveData,
            setQuoteMarketState,
            shouldQueueInverseFetch,
            updateAlertSoundState: alertRuntimeController.updateAlertSoundState,
            updateArbPanel,
            updateRequestChannelTagForQuote,
            updateSchedulers,
            windowImpl: window
        },
        refs: dashboardAppRefGroups.board
    });
    const dashboardFormController = dashboardAppBoardRuntime.dashboardFormController;
    const handleDashboardClick = dashboardAppBoardRuntime.handleDashboardClick;
    const handleDashboardInput = dashboardAppBoardRuntime.handleDashboardInput;
    const openAddCategoryModal = dashboardAppBoardRuntime.openAddCategoryModal;
    const dashboardAppLifecycleRuntime = getDashboardAppLifecycleRuntime().createDashboardAppLifecycleRuntime({
        modules: dashboardModules,
        deps: {
            addToQueue,
            alertRuntimeController,
            applyQuoteDisplayToggleButtonState,
            arbDetailController,
            arbPanelController,
            clearTopologyCache,
            confirmActionRuntime,
            dashboardApiClient,
            dashboardCommandController,
            dashboardFormController,
            dashboardViewModeController,
            defaultArbCycleStartPriority: DEFAULT_ARB_CYCLE_START_PRIORITY,
            defaultIntervals: DEFAULT_INTERVALS,
            documentImpl: document,
            domRenderUtils,
            floatingPanelZIndexRuntime,
            getDashboardState,
            getPriceSnapshotConfig,
            handleDashboardClick,
            handleDashboardInput,
            invalidateArbRuleSnapshotCache,
            keyboardShortcutController,
            openAddCategoryModal,
            performSave,
            priceSnapshotSaveRuntime,
            priceSnapshotTimerRuntime,
            quoteSpreadController,
            renderDashboardForCurrentState,
            requestChannelRuntime,
            requestChannelTagVisibilityRuntime,
            saveData,
            setApiIntervals,
            setArbCycleStartPriority,
            setArbPanelMaxHeight,
            setDashboardState,
            setPriceSnapshotConfig,
            settingsModalRuntime,
            themeRuntime,
            updateArbPanel,
            updateSchedulers,
            windowImpl: window
        },
        refs: dashboardAppRefGroups.lifecycle
    });
    dashboardAppLifecycleRuntime.bindStaticEvents();
    
    dashboardAppLifecycleRuntime.init();
}());
