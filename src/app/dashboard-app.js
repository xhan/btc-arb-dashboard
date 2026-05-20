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
        getChainDefaults,
        getCopyUtils,
        getDashboardActionController,
        getDashboardApiUtils,
        getDashboardAppStateRuntime,
        getDashboardArbWorkspaceRuntime,
        getDashboardBoardRuntime,
        getDashboardCommandController,
        getDashboardCommandRuntime,
        getDashboardDomRefs,
        getDashboardFormController,
        getDashboardLifecycleController,
        getDashboardModalUtils,
        getDashboardQuoteDomainAdapter,
        getDashboardQuoteRuntime,
        getDashboardRenderer,
        getDashboardRuntimeRefUtils,
        getDashboardRuntimeUtils,
        getDashboardShellRuntime,
        getDashboardViewModeController,
        getDashboardViewController,
        getDataTerminalController,
        getDataTerminalUtils,
        getDexLinkUtils,
        getDomRenderUtils,
        getKeyboardShortcutController,
        getKeyboardShortcutUtils,
        getPathAlertPageUtils,
        getPriceSnapshotPayloadUtils,
        getQueueStatsUtils,
        getQuoteDisplayUtils,
        getQuoteFetchController,
        getQuotePauseUtils,
        getQuoteQueueRuntimeUtils,
        getQuoteRequestUtils,
        getQuoteSpreadController,
        getQuoteSpreadUtils,
        getQuoteStateRuntimeUtils,
        getQuoteUiController,
        getRequestChannelUtils,
        getThemeUtils
    } = dashboardModules;
    const dashboardRuntimeUtils = getDashboardRuntimeUtils();
    const domRenderUtils = getDomRenderUtils();
    const closestEventTarget = domRenderUtils.closestEventTarget;

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
        renderDashboardForCurrentState,
        ensureDashboardRendered
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

    const quoteDomainAdapter = getDashboardQuoteDomainAdapter().createDashboardQuoteDomainAdapter({
        chainDefaults: getChainDefaults(),
        queueStatsUtils: getQueueStatsUtils(),
        quotePauseUtils: getQuotePauseUtils(),
        quoteRequestUtils: getQuoteRequestUtils()
    });
    const {
        getActiveQuotes,
        getCategoryPauseAction,
        getDefaultSourceForChain: defaultSourceResolver,
        getQuoteChainDisplayName,
        isCexOrderbookChain,
        isCrossChainQuote,
        isEvmChain,
        isQuotePaused,
        normalizeChainKey,
        shouldQueueInverseFetch
    } = quoteDomainAdapter;

    const quoteUiController = getQuoteUiController().createQuoteUiController({
        copyToast,
        copyToastRuntime,
        copyUtils: getCopyUtils(),
        dexLinkUtils: getDexLinkUtils(),
        documentImpl: document,
        domRenderUtils,
        getDashboardState,
        getQuoteMarketState,
        globalTooltip,
        initialQuoteDisplayMode: DEFAULT_QUOTE_DISPLAY_MODE,
        isEvmChain,
        isDashboardUiActive: isDashboardViewActive,
        isQuotePaused,
        logger: console,
        markDashboardUiDirty: markDashboardViewDirty,
        quoteDisplayUtils: getQuoteDisplayUtils(),
        quotePauseUtils: getQuotePauseUtils(),
        quoteStateRuntime,
        toggleQuoteDisplayBtn,
        setTimeout,
        clearTimeout
    });
    const {
        applyActiveQuoteUiState,
        applyPausedQuoteUiState,
        applyQuoteDisplayToggleButtonState,
        copyDexLinkFromElement,
        copyPriceText,
        copyTextToClipboard,
        getInverseQuoteDisplayText,
        getQuoteDisplayMode,
        getQuoteDisplayText,
        handleQuoteHover,
        showCopyToast,
        toggleQuoteDisplayMode,
        updateQuotePairLabel,
        updateTrendArrow
    } = quoteUiController;
    const arbWorkspaceRuntime = getDashboardArbWorkspaceRuntime().createDashboardArbWorkspaceRuntime({
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
            getQuoteChainDisplayName,
            getQuoteMarketState,
            getQuoteMarketStateMap,
            isCrossChainQuote,
            isQuotePaused,
            logError: (...args) => console.error(...args),
            logInfo: (...args) => console.info(...args),
            logWarning: (...args) => console.warn(...args),
            onShowDashboard: ensureDashboardRendered,
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
    const {
        alertRuntimeController,
        arbDetailController,
        arbPanelController,
        dashboardViewModeController,
        applyFloatingPanelDisplay,
        buildLiveQuoteLabel,
        clearTopologyCache,
        formatArbPathLegLine,
        formatChainLabel,
        formatDetailNumber,
        getAliasRules,
        getSharedArbRuleSnapshot,
        isRuleLeg,
        scheduleArbPanelUpdate,
        setArbPanelMaxHeight
    } = arbWorkspaceRuntime;
    const closeArbDetailModal = arbWorkspaceRuntime.closeArbDetailModal;
    const openArbDetailModal = arbWorkspaceRuntime.openArbDetailModal;
    const renderArbDetailModal = arbWorkspaceRuntime.renderArbDetailModal;
    const quoteSpreadController = getQuoteSpreadController().createQuoteSpreadController({
        applyFloatingPanelDisplay,
        documentImpl: document,
        domRenderUtils,
        formatChainLabel,
        getDashboardState,
        getQuoteMarketStateMap,
        quoteSpreadUtils: getQuoteSpreadUtils(),
        refs: {
            window: quoteSpreadWindow,
            header: quoteSpreadHeader,
            minButton: quoteSpreadMinBtn,
            toggleButton: toggleSpreadBtn,
            content: quoteSpreadContent
        },
        setInterval,
        clearInterval,
        zIndexRuntime: floatingPanelZIndexRuntime
    });
    const dataTerminalController = getDataTerminalController().createDataTerminalController({
        dataTerminalUtils: getDataTerminalUtils(),
        dashboardRuntimeUtils,
        domRenderUtils,
        documentImpl: document,
        windowImpl: window,
        setTimeout,
        clearTimeout,
        updateDelayMs: DATA_TERMINAL_UPDATE_DELAY_MS,
        getAnchorPanel: () => arbPathWindow,
        zIndexRuntime: floatingPanelZIndexRuntime,
        getDashboardState,
        getQuoteMarketStateMap,
        getMarketRevision: () => quoteStateRuntime.getMarketRevision(),
        isQuoteActive: (quote) => !isQuotePaused(quote),
        getAliasRules,
        closestEventTarget,
        formatChainLabel,
        formatAmount: (amount) => formatDetailNumber(Number(amount), 6),
        buildPairLinkHtml: (row, className, label) => getDexLinkUtils().buildDexLinkCopyButtonHtml({
            chain: row.chain,
            fromTokenAddress: row.fromTokenAddress,
            toTokenAddress: row.toTokenAddress,
            inputAmount: row.amount
        }, className, label),
        copyDexLinkFromElement
    });
    const renderDataTerminalPanel = dataTerminalController.renderPanel;
    const toggleDataTerminalPanel = dataTerminalController.togglePanel;
    const scheduleDataTerminalUpdate = dataTerminalController.scheduleUpdate;
    function handleQuoteMarketStateChanged(quote, state, context) {
        if (arbWorkspaceRuntime && typeof arbWorkspaceRuntime.handleQuoteMarketStateChanged === 'function') {
            arbWorkspaceRuntime.handleQuoteMarketStateChanged(quote, state, context);
        }
        scheduleDataTerminalUpdate();
    }

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
            'toggle-request-channel-tags': requestChannelTagVisibilityRuntime.toggle
        }
    });
    const { dashboardCommandController, keyboardShortcutController } = dashboardCommandRuntime;
    const quoteRuntime = quoteRuntimeRef.set(getDashboardQuoteRuntime().createDashboardQuoteRuntime({
        AbortController,
        backendUrl: BACKEND_URL,
        chainDefaults: getChainDefaults(),
        dashboardRuntimeUtils,
        defaultIntervals: DEFAULT_INTERVALS,
        documentImpl: document,
        domRenderUtils,
        fetchImpl: fetch,
        getApiIntervals,
        getDashboardState,
        getEffectiveRequestChannelIdForQuote,
        getInverseQuoteDisplayText,
        getQuoteDisplayMode,
        getQuoteDisplayText,
        getQuoteMarketState,
        isDashboardUiActive: isDashboardViewActive,
        isQuotePaused,
        isSchedulerPaused: () => arbDetailController.isDashboardPaused(),
        logWarning: (...args) => console.warn(...args),
        markDashboardUiDirty: markDashboardViewDirty,
        onQuoteMainFetchSuccess: arbWorkspaceRuntime.handleQuoteMainFetchSuccess,
        onQuoteMarketStateChanged: handleQuoteMarketStateChanged,
        applyActiveQuoteUiState,
        queueStatsUtils: getQueueStatsUtils(),
        quoteDisplayUtils: getQuoteDisplayUtils(),
        quoteFetchControllerUtils: getQuoteFetchController(),
        quoteQueueRuntimeUtils: getQuoteQueueRuntimeUtils(),
        quoteRequestUtils: getQuoteRequestUtils(),
        recordSourceAttempt: (source) => arbDetailController.recordSourceAttempt(source),
        resetQuoteUiRuntimeState,
        requestChannelRuntime,
        requestChannelUtils: getRequestChannelUtils(),
        setQuoteMarketState,
        shouldQueueInverseFetch,
        updateQuotePairLabel,
        updateTrendArrow
    }));
    const {
        activeFetchControllerRuntime,
        addToQueue,
        queueQuoteRefresh,
        removeFromQueue,
        toggleMultiChannel
    } = quoteRuntime;

    function getDashboardLocalStorage() {
        return dashboardRuntimeUtils.getBrowserLocalStorage({ window }, {
            onError: (error) => console.warn('访问浏览器本地缓存失败:', error)
        });
    }

    const dashboardBoardRuntime = getDashboardBoardRuntime().createDashboardBoardRuntime({
        addQuoteModalSelectionRuntime,
        confirmActionRuntime,
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
            saveData
        },
        formOptions: {
            defaultSourceResolver,
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
