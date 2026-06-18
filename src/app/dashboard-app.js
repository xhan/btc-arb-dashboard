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
            logger: console,
            windowImpl: window
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
        getDashboardLocalStorage,
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
            dashboardRuntimeUtils,
            dashboardShellRuntime,
            dataTerminalRuntimeRef,
            documentImpl: document,
            domRenderUtils,
            fetchImpl: fetch,
            fetchQuoteByStrategy,
            getApiIntervals,
            getArbCycleStartPriority,
            getDashboardLocalStorage,
            getDashboardState,
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
            dashboardShellRuntime,
            toggleDataTerminalPanel,
            toggleMultiChannel,
            toggleQuoteDisplayMode
        }
    });

    const dashboardAppBoardRuntime = getDashboardAppBoardRuntime().createDashboardAppBoardRuntime({
        modules: dashboardModules,
        deps: {
            activeFetchControllerRuntime,
            amountInputDebounceRuntime,
            closeArbDetailModal,
            closestEventTarget,
            copyDexLinkFromElement,
            copyPriceText,
            dashboardShellRuntime,
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
            handleQuoteHover,
            interactionRuntime: dashboardInputInteractionRuntime,
            isCexOrderbookChain,
            isCrossChainQuote,
            isEvmChain,
            isQuotePaused,
            logger: console,
            normalizeChainKey,
            quoteStateRuntime,
            queueQuoteRefresh,
            removeFromQueue,
            renderDataTerminalPanel,
            resetQuoteUiRuntimeState,
            setQuoteMarketState,
            shouldQueueInverseFetch,
            updateAlertSoundState: alertRuntimeController.updateAlertSoundState,
            updateArbPanel,
            updateSchedulers,
            windowImpl: window
        },
        refs: dashboardAppRefGroups.board
    });
    const dashboardAppLifecycleRuntime = getDashboardAppLifecycleRuntime().createDashboardAppLifecycleRuntime({
        modules: dashboardModules,
        deps: {
            addToQueue,
            alertRuntimeController,
            applyQuoteDisplayToggleButtonState,
            arbDetailController,
            arbPanelController,
            clearTopologyCache,
            dashboardApiClient,
            dashboardAppBoardRuntime,
            dashboardCommandRuntime,
            dashboardShellRuntime,
            dashboardViewModeController,
            defaultArbCycleStartPriority: DEFAULT_ARB_CYCLE_START_PRIORITY,
            defaultIntervals: DEFAULT_INTERVALS,
            documentImpl: document,
            domRenderUtils,
            floatingPanelZIndexRuntime,
            getDashboardState,
            getPriceSnapshotConfig,
            invalidateArbRuleSnapshotCache,
            priceSnapshotSaveRuntime,
            priceSnapshotTimerRuntime,
            quoteSpreadController,
            renderDashboardForCurrentState,
            setApiIntervals,
            setArbCycleStartPriority,
            setArbPanelMaxHeight,
            setDashboardState,
            setPriceSnapshotConfig,
            updateArbPanel,
            updateSchedulers,
            windowImpl: window
        },
        refs: dashboardAppRefGroups.lifecycle
    });
    dashboardAppLifecycleRuntime.bindStaticEvents();
    
    dashboardAppLifecycleRuntime.init();
}());
