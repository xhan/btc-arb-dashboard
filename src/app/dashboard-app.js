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
        getDashboardAppShellRuntime,
        getDashboardArbWorkspaceRuntime,
        getDashboardAuxPanelsRuntime,
        getDashboardCoreRuntime,
        getDashboardDomRefs,
        getDashboardQuoteWorkspaceRuntime
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
    const {
        dashboardEl,
        addCategoryBtn,
        alertLogWindow,
        alertLogHeader,
        alertLogMinBtn,
        alertLogLogTab,
        alertLogMutedLogTab,
        alertLogMutedTab,
        alertLogSettingsTab,
        alertLogContent,
        alertLogMutedLogContent,
        alertLogMutedContent,
        alertLogSettingsContent,
        pathAlertSound,
        viewArbBtn,
        viewDashboardBtn,
        themeToggleBtn,
        audioNoticeEl,
        quoteSettingsModal,
        quoteSourceSelect,
        manualSaveBtn,
        manualSaveText,
        quoteRunStateTag,
        settingsBtn,
        settingsSaveBtn,
        settingsCancelBtn,
        settingsModal,
        settingsIntervalInputRefs,
        addQuoteModal,
        addQuoteChainSelect,
        addQuoteToChainSelect,
        addQuoteFromInput,
        addQuoteToInput,
        addQuoteSymbolInput,
        addQuoteModalRefs,
        confirmModal,
        confirmOkBtn,
        confirmCancelBtn,
        addCategoryModal,
        addCategoryModalRefs,
        confirmModalRefs,
        globalTooltip,
        copyToast,
        arbPathWindow,
        arbPathContent,
        arbGlobalFilterInput,
        arbGlobalChainFilterInput,
        arbGlobalIncludeFilterInput,
        arbGlobalTwoLegOnlyInput,
        arbGlobalFilterClearBtn,
        arbGlobalFilterElements,
        arbPathHeader,
        arbPathMinBtn,
        toggleQuoteDisplayBtn,
        toggleSpreadBtn,
        toggleDataTerminalBtn,
        toggleArbBtn,
        toggleAlertLogBtn,
        toggleMultiChannelBtn,
        quoteSpreadWindow,
        quoteSpreadHeader,
        quoteSpreadMinBtn,
        quoteSpreadContent,
        arbDetailModal,
        arbDetailCloseBtn,
        arbDetailChartLink,
        arbDetailChartAutoRefreshToggle,
        arbDetailSubtitle,
        arbDetailChartPreview,
        arbDetailProfitPreview,
        arbDetailGrid,
        quoteRequestChannelSelect,
        quoteSettingsModalElements
    } = getDashboardDomRefs().createDashboardDomRefs(document);

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
        refs: {
            bodyEl: document.body,
            themeToggleBtn,
            manualSaveBtn,
            manualSaveText,
            settingsBtn,
            settingsCancelBtn,
            settingsSaveBtn,
            settingsModal,
            settingsIntervalInputRefs,
            toggleMultiChannelBtn,
            copyToast
        },
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

    const quoteWorkspaceRuntime = getDashboardQuoteWorkspaceRuntime().createDashboardQuoteWorkspaceRuntime({
        modules: dashboardModules,
        constants: {
            defaultIntervals: DEFAULT_INTERVALS,
            initialQuoteDisplayMode: DEFAULT_QUOTE_DISPLAY_MODE
        },
        deps: {
            AbortController,
            backendUrl: BACKEND_URL,
            copyToastRuntime,
            dashboardRuntimeUtils,
            documentImpl: document,
            domRenderUtils,
            fetchImpl: fetch,
            getApiIntervals,
            getDashboardState,
            getEffectiveRequestChannelIdForQuote,
            getQuoteMarketState,
            isDashboardUiActive: isDashboardViewActive,
            isSchedulerPaused: isArbDetailSchedulerPaused,
            logger: console,
            markDashboardUiDirty: markDashboardViewDirty,
            onQuoteMainFetchSuccess: handleQuoteMainFetchSuccess,
            onQuoteMarketStateChanged: handleQuoteMarketStateChanged,
            onQuoteMarketStateChangedSideEffect: scheduleDataTerminalUpdate,
            quoteRuntimeRef,
            quoteStateRuntime,
            recordSourceAttempt: recordArbDetailSourceAttempt,
            resetQuoteUiRuntimeState,
            requestChannelRuntime,
            setQuoteMarketState,
            setTimeout,
            clearTimeout
        },
        refs: {
            copyToast,
            globalTooltip,
            toggleQuoteDisplayBtn
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
        updateTrendArrow
    } = quoteWorkspaceRuntime;
    const arbWorkspaceRuntime = arbWorkspaceRuntimeRef.set(getDashboardArbWorkspaceRuntime().createDashboardArbWorkspaceRuntime({
        arbAlertRuntimeRef,
        modules: dashboardModules,
        constants: {
            arbDetailRefreshIntervalMs: ARB_DETAIL_REFRESH_INTERVAL_MS,
            arbPanelUpdateDelayMs: ARB_PANEL_UPDATE_DELAY_MS,
            chartAutoRefreshIntervalMs: CHART_AUTO_REFRESH_INTERVAL_MS,
            globalPathSourceSelectors: GLOBAL_PATH_SOURCE_SELECTORS,
            highlightDurationMs: 8000,
            mutedStateHiddenMaxRefreshMs: MUTED_STATE_HIDDEN_MAX_REFRESH_MS,
            mutedStateVisibleRefreshMs: MUTED_STATE_VISIBLE_REFRESH_MS
        },
        deps: {
            AudioCtor: Audio,
            abortActiveFetchControllers,
            backendUrl: BACKEND_URL,
            bodyEl: document.body,
            closestEventTarget,
            copyDexLinkFromElement,
            copyTextToClipboard,
            dashboardRuntimeUtils,
            documentImpl: document,
            domRenderUtils,
            fetchImpl: fetch,
            fetchQuoteByStrategy,
            getActiveQuotes,
            getApiIntervals,
            getArbCycleStartPriority,
            getDashboardLocalStorage,
            getDashboardState,
            interactionRuntime: dashboardInputInteractionRuntime,
            getQuoteChainDisplayName,
            getQuoteMarketState,
            getQuoteMarketStateMap,
            isCrossChainQuote,
            isQuotePaused,
            logError: (...args) => console.error(...args),
            logInfo: (...args) => console.info(...args),
            logWarning: (...args) => console.warn(...args),
            onShowDashboard: renderDashboardForCurrentState,
            quoteStateRuntime,
            setQuoteMarketState,
            showCopyToast,
            updateSchedulers,
            windowImpl: window,
            zIndexRuntime: floatingPanelZIndexRuntime
        },
        refs: {
            arbPanel: {
                arbPathWindow,
                arbPathContent,
                arbPathHeader,
                arbGlobalFilterInput,
                arbGlobalChainFilterInput,
                arbGlobalIncludeFilterInput,
                arbGlobalTwoLegOnlyInput,
                arbGlobalFilterClearBtn,
                arbGlobalFilterElements
            },
            alert: {
                alertLogWindow,
                alertLogLogTab,
                alertLogMutedLogTab,
                alertLogMutedTab,
                alertLogSettingsTab,
                alertLogContent,
                alertLogMutedLogContent,
                alertLogMutedContent,
                alertLogSettingsContent,
                audioNoticeEl,
                pathAlertSound
            },
            detail: {
                modal: arbDetailModal,
                closeButton: arbDetailCloseBtn,
                chartLink: arbDetailChartLink,
                chartAutoRefreshToggle: arbDetailChartAutoRefreshToggle,
                subtitle: arbDetailSubtitle,
                chartPreview: arbDetailChartPreview,
                profitPreview: arbDetailProfitPreview,
                grid: arbDetailGrid,
                quoteRunStateTag
            },
            viewMode: {
                dashboardEl,
                addCategoryBtn,
                arbPathWindow,
                viewArbBtn,
                viewDashboardBtn
            }
        },
        timers: {
            setInterval,
            clearInterval,
            setTimeout,
            clearTimeout
        }
    }));
    const alertRuntimeController = arbWorkspaceRuntime.alertRuntimeController;
    const arbDetailController = arbWorkspaceRuntime.arbDetailController;
    const arbPanelController = arbWorkspaceRuntime.arbPanelController;
    const dashboardViewModeController = arbWorkspaceRuntime.dashboardViewModeController;
    const applyFloatingPanelDisplay = arbWorkspaceRuntime.applyFloatingPanelDisplay;
    const buildLiveQuoteLabel = arbWorkspaceRuntime.buildLiveQuoteLabel;
    const clearTopologyCache = arbWorkspaceRuntime.clearTopologyCache;
    const formatArbPathLegLine = arbWorkspaceRuntime.formatArbPathLegLine;
    const formatChainLabel = arbWorkspaceRuntime.formatChainLabel;
    const formatDetailNumber = arbWorkspaceRuntime.formatDetailNumber;
    const getAliasRules = arbWorkspaceRuntime.getAliasRules;
    const getSharedArbRuleSnapshot = arbWorkspaceRuntime.getSharedArbRuleSnapshot;
    const isRuleLeg = arbWorkspaceRuntime.isRuleLeg;
    const scheduleArbPanelUpdate = arbWorkspaceRuntime.scheduleArbPanelUpdate;
    const setArbPanelMaxHeight = arbWorkspaceRuntime.setArbPanelMaxHeight;
    const closeArbDetailModal = arbWorkspaceRuntime.closeArbDetailModal;
    const openArbDetailModal = arbWorkspaceRuntime.openArbDetailModal;
    const renderArbDetailModal = arbWorkspaceRuntime.renderArbDetailModal;
    const auxPanelsRuntime = getDashboardAuxPanelsRuntime().createDashboardAuxPanelsRuntime({
        modules: dashboardModules,
        constants: {
            dataTerminalUpdateDelayMs: DATA_TERMINAL_UPDATE_DELAY_MS
        },
        deps: {
            applyFloatingPanelDisplay,
            clearTimeout,
            closestEventTarget,
            copyDexLinkFromElement,
            dashboardRuntimeUtils,
            dataTerminalRuntimeRef,
            documentImpl: document,
            domRenderUtils,
            formatChainLabel,
            formatDetailNumber,
            getAliasRules,
            getAnchorPanel: () => arbPathWindow,
            getDashboardState,
            getQuoteMarketStateMap,
            interactionRuntime: dashboardInputInteractionRuntime,
            isQuotePaused,
            quoteStateRuntime,
            setTimeout,
            windowImpl: window,
            zIndexRuntime: floatingPanelZIndexRuntime
        },
        refs: {
            quoteSpread: {
                window: quoteSpreadWindow,
                header: quoteSpreadHeader,
                minButton: quoteSpreadMinBtn,
                toggleButton: toggleSpreadBtn,
                content: quoteSpreadContent
            }
        },
        timers: {
            setInterval,
            clearInterval
        }
    });
    const quoteSpreadController = auxPanelsRuntime.quoteSpreadController;
    const renderDataTerminalPanel = auxPanelsRuntime.renderDataTerminalPanel;
    const toggleDataTerminalPanel = auxPanelsRuntime.toggleDataTerminalPanel;

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
        refs: {
            addCategoryModal,
            addCategoryModalRefs,
            addQuoteChainSelect,
            addQuoteInputs: [addQuoteFromInput, addQuoteToInput, addQuoteSymbolInput],
            addQuoteModal,
            addQuoteModalRefs,
            addQuoteToChainSelect,
            confirmModalRefs,
            dashboardEl,
            quoteRequestChannelSelect,
            quoteSettingsModal,
            quoteSettingsModalElements,
            quoteSourceSelect
        }
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
        refs: {
            dashboardEl,
            addCategoryBtn,
            audioNoticeEl,
            manualSaveBtn,
            themeToggleBtn,
            confirmOkBtn,
            confirmCancelBtn,
            confirmModal,
            confirmModalRefs,
            alertLogWindow,
            alertLogHeader,
            alertLogMinBtn,
            alertLogMutedLogContent,
            arbPathWindow,
            arbPathHeader,
            arbPathMinBtn,
            toggleArbBtn,
            toggleQuoteDisplayBtn,
            toggleDataTerminalBtn,
            toggleAlertLogBtn,
            toggleMultiChannelBtn
        }
    });
    dashboardAppLifecycleRuntime.bindStaticEvents();
    
    dashboardAppLifecycleRuntime.init();
}());
