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
        getArbCyclePriorityUtils,
        getArbDetailUtils,
        getCopyUtils,
        getDashboardActionController,
        getDashboardApiUtils,
        getDashboardAppStateRuntime,
        getDashboardArbWorkspaceRuntime,
        getDashboardBoardRuntime,
        getDashboardCommandController,
        getDashboardCommandRuntime,
        getDashboardDataTerminalRuntime,
        getDashboardDomRefs,
        getDashboardFormController,
        getDashboardLifecycleController,
        getDashboardModalUtils,
        getDashboardQuoteSpreadRuntime,
        getDashboardQuoteWorkspaceRuntime,
        getDashboardRenderer,
        getDashboardRuntimeRefUtils,
        getDashboardRuntimeUtils,
        getDashboardShellRuntime,
        getDashboardViewModeController,
        getDashboardViewController,
        getDexLinkUtils,
        getDomRenderUtils,
        getKeyboardShortcutController,
        getKeyboardShortcutUtils,
        getPathAlertPageUtils,
        getPriceSnapshotPayloadUtils,
        getQueueStatsUtils,
        getQuoteDisplayUtils,
        getQuotePauseUtils,
        getQuoteStateRuntimeUtils,
        getRequestChannelUtils,
        getThemeUtils
    } = dashboardModules;
    const dashboardRuntimeUtils = getDashboardRuntimeUtils();
    const domRenderUtils = getDomRenderUtils();
    const closestEventTarget = domRenderUtils.closestEventTarget;
    const dashboardInputInteractionRuntime = domRenderUtils.createRenderInteractionHoldRuntime({
        clearTimeout,
        eventListenerOptions: { capture: true },
        idleDelayMs: 80,
        setTimeout,
        trackFocus: false
    });
    dashboardInputInteractionRuntime.bind(document);

    const DEFAULT_INTERVALS = { ...getQueueStatsUtils().DEFAULT_INTERVALS };
    const DEFAULT_ARB_CYCLE_START_PRIORITY = getArbCyclePriorityUtils().DEFAULT_ARB_CYCLE_START_PRIORITY;

    const appStateRuntime = getDashboardAppStateRuntime().createDashboardAppStateRuntime({
        defaultIntervals: DEFAULT_INTERVALS,
        defaultArbCycleStartPriority: DEFAULT_ARB_CYCLE_START_PRIORITY,
        defaultPriceSnapshotConfig: { enabled: false, intervalSec: 10 }
    });
    const getDashboardState = appStateRuntime.getDashboardState;
    const setDashboardState = appStateRuntime.setDashboardState;
    const getApiIntervals = appStateRuntime.getApiIntervals;
    const setApiIntervals = appStateRuntime.setApiIntervals;
    const getArbCycleStartPriority = appStateRuntime.getArbCycleStartPriority;
    const setArbCycleStartPriority = appStateRuntime.setArbCycleStartPriority;
    const getPriceSnapshotConfig = appStateRuntime.getPriceSnapshotConfig;
    const setPriceSnapshotConfig = appStateRuntime.setPriceSnapshotConfig;
    const dashboardApiClient = getDashboardApiUtils().createDashboardApiClient({
        backendUrl: BACKEND_URL,
        fetchImpl: fetch,
        logger: console
    });

    const dashboardRuntimeBridge = getDashboardRuntimeRefUtils().createDashboardRuntimeBridge();
    const {
        quoteRuntimeRef,
        arbAlertRuntimeRef,
        dashboardViewRenderRuntimeRef,
        abortActiveFetchControllers,
        fetchQuoteByStrategy,
        updateSchedulers,
        invalidateArbRuleSnapshotCache,
        updateArbPanel,
        isDashboardViewActive,
        markDashboardViewDirty,
        renderDashboardForCurrentState
    } = dashboardRuntimeBridge;
    const floatingPanelZIndexRuntime = domRenderUtils.createFloatingPanelZIndexRuntime({
        baseZIndex: FLOATING_PANEL_BASE_Z_INDEX
    });
    const quoteStateRuntime = getQuoteStateRuntimeUtils().createQuoteStateRuntime({
        dashboardRuntimeUtils,
        clearTimeout,
        onMarketStateChanged: () => invalidateArbRuleSnapshotCache({ bumpRevision: false })
    });
    const getQuoteMarketState = quoteStateRuntime.getMarketState;
    const getQuoteMarketStateMap = quoteStateRuntime.getMarketStateMap;
    const setQuoteMarketState = quoteStateRuntime.setMarketState;
    const deleteQuoteMarketState = quoteStateRuntime.deleteMarketState;
    const resetQuoteUiRuntimeState = quoteStateRuntime.resetUiRuntimeState;
    const deleteQuoteUiRuntimeState = quoteStateRuntime.deleteUiRuntimeState;
    const priceSnapshotTimerRuntime = getPriceSnapshotPayloadUtils().createPriceSnapshotTimerRuntime({
        setInterval,
        clearInterval
    });
    const priceSnapshotSaveRuntime = getPriceSnapshotPayloadUtils().createPriceSnapshotSaveRuntime({
        getConfig: getPriceSnapshotConfig,
        buildPayload: () => getPriceSnapshotPayloadUtils().buildPriceSnapshotPayload({
            dashboardState: getDashboardState(),
            quoteStateById: getQuoteMarketStateMap(),
            clientCapturedAt: new Date().toISOString()
        }),
        savePayload: (payload) => dashboardApiClient.savePriceSnapshot(payload),
        logWarning: (...args) => console.warn(...args)
    });
    const amountInputDebounceRuntime = dashboardRuntimeUtils.createInputDebounceRuntime({
        setTimeout,
        clearTimeout,
        delayMs: AMOUNT_INPUT_DEBOUNCE_MS
    });
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

    const dashboardShellRuntime = getDashboardShellRuntime().createDashboardShellRuntime({
        clearTimeout,
        copyUtils: getCopyUtils(),
        dashboardModalUtils: getDashboardModalUtils(),
        dashboardRenderer: getDashboardRenderer(),
        dashboardRuntimeUtils,
        dashboardSaveDebounceMs: DASHBOARD_SAVE_DEBOUNCE_MS,
        defaultIntervals: DEFAULT_INTERVALS,
        documentImpl: document,
        getApiIntervals,
        getDashboardLocalStorage,
        getDashboardState,
        logger: console,
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
        requestChannelUtils: getRequestChannelUtils(),
        saveDashboardConfig: (payload) => dashboardApiClient.saveDashboardConfig(payload),
        setApiIntervals,
        setTimeout,
        themeUtils: getThemeUtils(),
        updateSchedulers
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

    let arbWorkspaceRuntime = null;
    let arbDetailController = null;
    let scheduleDataTerminalUpdate = () => {};
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
            isSchedulerPaused: () => arbDetailController && arbDetailController.isDashboardPaused(),
            logger: console,
            markDashboardUiDirty: markDashboardViewDirty,
            onQuoteMainFetchSuccess: (quote, context) => {
                if (arbWorkspaceRuntime && typeof arbWorkspaceRuntime.handleQuoteMainFetchSuccess === 'function') {
                    arbWorkspaceRuntime.handleQuoteMainFetchSuccess(quote, context);
                }
            },
            onQuoteMarketStateChanged: (quote, state, context) => {
                if (arbWorkspaceRuntime && typeof arbWorkspaceRuntime.handleQuoteMarketStateChanged === 'function') {
                    arbWorkspaceRuntime.handleQuoteMarketStateChanged(quote, state, context);
                }
            },
            onQuoteMarketStateChangedSideEffect: () => {
                scheduleDataTerminalUpdate();
            },
            quoteRuntimeRef,
            quoteStateRuntime,
            recordSourceAttempt: (source) => {
                if (arbDetailController && typeof arbDetailController.recordSourceAttempt === 'function') {
                    arbDetailController.recordSourceAttempt(source);
                }
            },
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
    arbWorkspaceRuntime = getDashboardArbWorkspaceRuntime().createDashboardArbWorkspaceRuntime({
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
    });
    const alertRuntimeController = arbWorkspaceRuntime.alertRuntimeController;
    arbDetailController = arbWorkspaceRuntime.arbDetailController;
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
    const quoteSpreadRuntime = getDashboardQuoteSpreadRuntime().createDashboardQuoteSpreadRuntime({
        modules: dashboardModules,
        deps: {
            applyFloatingPanelDisplay,
            documentImpl: document,
            domRenderUtils,
            formatChainLabel,
            getDashboardState,
            getQuoteMarketStateMap,
            zIndexRuntime: floatingPanelZIndexRuntime
        },
        refs: {
            window: quoteSpreadWindow,
            header: quoteSpreadHeader,
            minButton: quoteSpreadMinBtn,
            toggleButton: toggleSpreadBtn,
            content: quoteSpreadContent
        },
        timers: {
            setInterval,
            clearInterval
        }
    });
    const quoteSpreadController = quoteSpreadRuntime.quoteSpreadController;
    const dataTerminalRuntime = getDashboardDataTerminalRuntime().createDashboardDataTerminalRuntime({
        modules: dashboardModules,
        constants: {
            dataTerminalUpdateDelayMs: DATA_TERMINAL_UPDATE_DELAY_MS
        },
        deps: {
            clearTimeout,
            closestEventTarget,
            copyDexLinkFromElement,
            dashboardRuntimeUtils,
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
        }
    });
    const renderDataTerminalPanel = dataTerminalRuntime.renderDataTerminalPanel;
    const toggleDataTerminalPanel = dataTerminalRuntime.toggleDataTerminalPanel;
    scheduleDataTerminalUpdate = dataTerminalRuntime.scheduleDataTerminalUpdate;

    const dashboardCommandRuntime = getDashboardCommandRuntime().createDashboardCommandRuntime({
        dashboardCommandControllerUtils: getDashboardCommandController(),
        documentImpl: document,
        keyboardShortcutControllerUtils: getKeyboardShortcutController(),
        keyboardShortcutUtils: getKeyboardShortcutUtils(),
        isArbDetailVisible: () => arbDetailController.isVisible(),
        actions: {
            'close-arb-detail': closeArbDetailModal,
            'toggle-arb-panel': dashboardViewModeController.toggleArbView,
            'toggle-data-terminal': toggleDataTerminalPanel,
            'toggle-quote-display': toggleQuoteDisplayMode,
            'open-alert-log-settings': alertRuntimeController.openAlertLogSettingsPanel,
            'toggle-alert-log': alertRuntimeController.toggleAlertLogPanel,
            'toggle-multi-channel': toggleMultiChannel,
            'toggle-request-channel-tags': requestChannelTagVisibilityRuntime.toggle
        }
    });
    const { dashboardCommandController, keyboardShortcutController } = dashboardCommandRuntime;

    function getDashboardLocalStorage() {
        return dashboardRuntimeUtils.getBrowserLocalStorage({ window }, {
            onError: (error) => console.warn('访问浏览器本地缓存失败:', error)
        });
    }

    const dashboardBoardRuntime = getDashboardBoardRuntime().createDashboardBoardRuntime({
        addQuoteModalSelectionRuntime,
        confirmActionRuntime,
        interactionRuntime: dashboardInputInteractionRuntime,
        dashboardActionControllerUtils: getDashboardActionController(),
        dashboardFormControllerUtils: getDashboardFormController(),
        dashboardViewControllerUtils: getDashboardViewController(),
        dashboardViewModeController,
        dashboardViewModeControllerUtils: getDashboardViewModeController(),
        dashboardViewRenderRuntimeRef,
        getRequestChannelOptions: () => requestChannelRuntime.getOptions(),
        quoteSettingsSelectionRuntime,
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
        },
        shared: {
            dashboardModalUtils: getDashboardModalUtils(),
            dashboardRenderer: getDashboardRenderer(),
            dashboardRuntimeUtils,
            documentImpl: document,
            getDashboardState
        },
        actionOptions: {
            activeFetchControllerRuntime,
            amountInputDebounceRuntime,
            arbDetailUtils: getArbDetailUtils(),
            closestEventTarget,
            closeArbDetailModal,
            copyDexLinkFromElement,
            copyPriceText,
            deleteQuoteMarketState,
            deleteQuoteUiRuntimeState,
            domRenderUtils,
            evaluatePathAlertsOnce: alertRuntimeController.evaluatePathAlertsOnce,
            formatChainLabel,
            getArbDetailState: () => arbDetailController.getState(),
            getCategoryPauseAction,
            getQuoteChainDisplayName,
            getQuoteMarketState,
            isCexOrderbookChain,
            isCrossChainQuote,
            isEvmChain,
            isQuotePaused,
            normalizeChainKey,
            quotePauseUtils: getQuotePauseUtils(),
            quoteStateRuntime,
            queueQuoteRefresh,
            removeFromQueue,
            renderDataTerminalPanel,
            requestChannelUtils: getRequestChannelUtils(),
            resetQuoteUiRuntimeState,
            saveData,
            setQuoteMarketState,
            updateAlertSoundState: alertRuntimeController.updateAlertSoundState,
            updateArbPanel,
            updateRequestChannelTagForQuote,
            updateSchedulers
        },
        viewOptions: {
            dexLinkUtils: getDexLinkUtils(),
            getCategoryPauseAction,
            getInverseQuoteDisplayText,
            getQuoteChainDisplayName,
            getQuoteDisplayText,
            getQuoteMarketState,
            handleQuoteHover,
            isCexOrderbookChain,
            isCrossChainQuote,
            isQuotePaused,
            logger: console,
            quoteDisplayUtils: getQuoteDisplayUtils(),
            requestChannelUtils: getRequestChannelUtils(),
            saveData,
            shouldQueueInverseFetch
        },
        formOptions: {
            defaultSourceResolver,
            formatChainLabel,
            isCexOrderbookChain,
            isCrossChainQuote,
            isEvmChain,
            normalizeChainKey,
            pathAlertPageUtils: getPathAlertPageUtils(),
            queueQuoteRefresh,
            removeFromQueue,
            requestChannelUtils: getRequestChannelUtils(),
            saveData,
            updateRequestChannelTagForQuote,
            windowImpl: window
        }
    });
    const dashboardFormController = dashboardBoardRuntime.dashboardFormController;
    const handleDashboardClick = dashboardBoardRuntime.handleDashboardClick;
    const handleDashboardInput = dashboardBoardRuntime.handleDashboardInput;
    const openAddCategoryModal = dashboardBoardRuntime.openAddCategoryModal;
    const dashboardLifecycleController = getDashboardLifecycleController().createDashboardLifecycleController({
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
        dashboardRenderer: getDashboardRenderer(),
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
        normalizeArbCycleStartPriority: getArbCyclePriorityUtils().normalizeArbCycleStartPriority,
        openAddCategoryModal,
        performSave,
        priceSnapshotSaveRuntime,
        priceSnapshotTimerRuntime,
        quoteSpreadController,
        renderDashboard: renderDashboardForCurrentState,
        requestChannelRuntime,
        requestChannelTagVisibilityRuntime,
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
        },
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
    });
    dashboardLifecycleController.bindStaticEvents();
    
    dashboardLifecycleController.init();
}());
