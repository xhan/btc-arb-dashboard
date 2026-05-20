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
    const {
        getAlertDebugUtils,
        getAlertLogUiUtils,
        getAlertRuntimeController,
        getArbAlertBridgeUtils,
        getArbCyclePriorityUtils,
        getArbDetailController,
        getArbDetailRefreshUtils,
        getArbDetailUtils,
        getArbEquivalenceUtils,
        getArbFixedUtils,
        getArbPanelLayoutUtils,
        getArbPanelController,
        getArbPanelRenderer,
        getArbPathConfig,
        getArbPathConfigUtils,
        getArbPathTemplateCacheUtils,
        getArbPaths,
        getArbRuleSnapshotUtils,
        getArbRuntimeMemoryUtils,
        getArbSpecialUtils,
        getAudioUtils,
        getChainDefaults,
        getChartsUtils,
        getCopyUtils,
        getDashboardActionController,
        getDashboardApiUtils,
        getDashboardArbAlertRuntime,
        getDashboardCommandController,
        getDashboardCommandRuntime,
        getDashboardDomRefs,
        getDashboardFormController,
        getDashboardLifecycleController,
        getDashboardModalUtils,
        getDashboardQuoteDomainAdapter,
        getDashboardQuoteRuntime,
        getDashboardRenderer,
        getDashboardRuntimeUtils,
        getDashboardViewModeController,
        getDashboardViewController,
        getDataTerminalController,
        getDataTerminalUtils,
        getDexLinkUtils,
        getDomRenderUtils,
        getKeyboardShortcutController,
        getKeyboardShortcutUtils,
        getMutedPathLegUtils,
        getMutedPathRuntimeUtils,
        getMutedPathStorageUtils,
        getPathAlertNotificationUtils,
        getPathAlertPageUtils,
        getPathAlertRuleDefinitionsUtils,
        getPathAlertUtils,
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
        getSpecialRuleAlertConfigUtils,
        getThemeUtils
    } = window.DashboardModuleRegistry.createDashboardModuleRegistry(window);
    let dashboardState = [];

    const DEFAULT_INTERVALS = { ...getQueueStatsUtils().DEFAULT_INTERVALS };
    const DEFAULT_ARB_CYCLE_START_PRIORITY = getArbCyclePriorityUtils().DEFAULT_ARB_CYCLE_START_PRIORITY;

    let apiIntervals = { ...DEFAULT_INTERVALS };
    let arbCycleStartPriority = Array.from(DEFAULT_ARB_CYCLE_START_PRIORITY);
    const dashboardApiClient = getDashboardApiUtils().createDashboardApiClient({
        backendUrl: BACKEND_URL,
        fetchImpl: fetch,
        logger: console
    });

    let priceSnapshotConfig = { enabled: false, intervalSec: 10 };
    let quoteRuntime = null;
    let arbAlertRuntime = null;
    let dashboardViewModeController = null;
    let dashboardRendered = false;
    let dashboardDirty = false;
    function getQuoteRuntime() {
        if (!quoteRuntime) {
            throw new Error('Dashboard quote runtime is not initialized');
        }
        return quoteRuntime;
    }
    function abortActiveFetchControllers() {
        return getQuoteRuntime().abortActiveFetchControllers();
    }
    function fetchQuoteByStrategy(quote, options) {
        return getQuoteRuntime().fetchQuoteByStrategy(quote, options);
    }
    function updateSchedulers() {
        return getQuoteRuntime().updateSchedulers();
    }
    function getArbAlertRuntime() {
        if (!arbAlertRuntime) {
            throw new Error('Dashboard arb alert runtime is not initialized');
        }
        return arbAlertRuntime;
    }
    function invalidateArbRuleSnapshotCache(options) {
        return getArbAlertRuntime().invalidateArbRuleSnapshotCache(options);
    }
    function updateArbPanel(options) {
        return getArbAlertRuntime().updateArbPanel(options);
    }
    function isDashboardViewActive() {
        return Boolean(
            dashboardViewModeController
            && dashboardViewModeController.getMode() === getDashboardViewModeController().APP_VIEW_DASHBOARD
        );
    }
    function markDashboardViewDirty() {
        dashboardDirty = true;
        return false;
    }
    const floatingPanelZIndexRuntime = getDomRenderUtils().createFloatingPanelZIndexRuntime({
        baseZIndex: FLOATING_PANEL_BASE_Z_INDEX
    });
    const quoteStateRuntime = getQuoteStateRuntimeUtils().createQuoteStateRuntime({
        dashboardRuntimeUtils: getDashboardRuntimeUtils(),
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
        getConfig: () => priceSnapshotConfig,
        buildPayload: () => getPriceSnapshotPayloadUtils().buildPriceSnapshotPayload({
            dashboardState,
            quoteStateById: getQuoteMarketStateMap(),
            clientCapturedAt: new Date().toISOString()
        }),
        savePayload: (payload) => dashboardApiClient.savePriceSnapshot(payload),
        logWarning: (...args) => console.warn(...args)
    });
    const amountInputDebounceRuntime = getDashboardRuntimeUtils().createInputDebounceRuntime({
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

    const themeRuntime = getThemeUtils().createThemeRuntime({
        body: document.body,
        button: themeToggleBtn,
        getStorage: getDashboardLocalStorage,
        onLoadError: (error) => console.warn('读取主题本地缓存失败:', error)
    });
    const settingsSaveFeedbackRuntime = getDashboardRuntimeUtils().createButtonFeedbackRuntime({
        setTimeout,
        clearTimeout,
        durationMs: 1500
    });
    const dashboardPersistenceRuntime = getDashboardRuntimeUtils().createDashboardPersistenceRuntime({
        saveRuntimeOptions: {
            setTimeout,
            clearTimeout,
            delayMs: DASHBOARD_SAVE_DEBOUNCE_MS
        },
        feedbackOptions: {
            button: manualSaveBtn,
            textEl: manualSaveText,
            setTimeout,
            clearTimeout
        },
        getDashboardState: () => dashboardState,
        getApiIntervals: () => apiIntervals,
        saveDashboardConfig: (payload) => dashboardApiClient.saveDashboardConfig(payload),
        logger: console
    });
    const performSave = dashboardPersistenceRuntime.performSave;
    const saveData = dashboardPersistenceRuntime.scheduleSave;
    const settingsModalRuntime = getDashboardModalUtils().createSettingsModalRuntime({
        openButton: settingsBtn,
        cancelButton: settingsCancelBtn,
        saveButton: settingsSaveBtn,
        modal: settingsModal,
        intervalInputRefs: settingsIntervalInputRefs,
        defaultIntervals: DEFAULT_INTERVALS,
        getIntervals: () => apiIntervals,
        setIntervals: (nextIntervals) => { apiIntervals = nextIntervals; },
        buildSettingsIntervalWritePlan: getDashboardRenderer().buildSettingsIntervalWritePlan,
        readSettingsIntervalFormValues: getDashboardRenderer().readSettingsIntervalFormValues,
        buildSettingsIntervalsFromFormValues: getDashboardRenderer().buildSettingsIntervalsFromFormValues,
        onSave: () => {
            requestChannelRuntime.setDefaultIntervals(apiIntervals);
            updateSchedulers();
            saveData();
        },
        showSaveFeedback: () => {
            settingsSaveFeedbackRuntime.show({
                button: settingsSaveBtn,
                text: '已保存!',
                resetState: {
                    button: settingsSaveBtn,
                    text: '保存'
                }
            });
        }
    });
    const addQuoteModalSelectionRuntime = getDashboardModalUtils().createModalSelectionRuntime();
    const quoteSettingsSelectionRuntime = getDashboardModalUtils().createModalSelectionRuntime();
    const confirmActionRuntime = getDashboardModalUtils().createConfirmActionRuntime();
    const multiChannelToggleRuntime = getRequestChannelUtils().createMultiChannelToggleRuntime({
        button: toggleMultiChannelBtn,
        getStorage: getDashboardLocalStorage,
        onLoadError: (error) => console.warn('读取多渠道开关本地缓存失败:', error),
        onPersistError: (error) => console.warn('保存多渠道开关本地缓存失败:', error)
    });
    const requestChannelRuntime = getRequestChannelUtils().createRequestChannelRuntime({
        payload: { channels: [] },
        defaultIntervals: apiIntervals,
        multiChannelToggleRuntime,
        tagOptions: {
            getElementById: (id) => document.getElementById(id)
        }
    });
    const getEffectiveRequestChannelIdForQuote = requestChannelRuntime.getEffectiveChannelIdForQuote;
    const updateRequestChannelTagForQuote = requestChannelRuntime.updateTagForQuote;
    const requestChannelTagVisibilityRuntime = getRequestChannelUtils().createRequestChannelTagVisibilityRuntime({
        getBody: () => document.body,
        visible: true
    });
    const copyToastRuntime = getCopyUtils().createCopyToastRuntime({
        setTimeout,
        clearTimeout
    });

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
        domRenderUtils: getDomRenderUtils(),
        getDashboardState: () => dashboardState,
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
    let arbDetailController = null;
    arbAlertRuntime = getDashboardArbAlertRuntime().createDashboardArbAlertRuntime({
        AudioCtor: Audio,
        alertDebugUtils: getAlertDebugUtils(),
        alertLogUiUtils: getAlertLogUiUtils(),
        alertRuntimeControllerUtils: getAlertRuntimeController(),
        arbAlertBridgeUtils: getArbAlertBridgeUtils(),
        arbPanelControllerUtils: getArbPanelController(),
        arbCyclePriorityUtils: getArbCyclePriorityUtils(),
        arbDetailUtils: getArbDetailUtils(),
        arbEquivalenceUtils: getArbEquivalenceUtils(),
        arbFixedUtils: getArbFixedUtils(),
        arbPanelLayoutUtils: getArbPanelLayoutUtils(),
        arbPanelRenderer: getArbPanelRenderer(),
        arbPathConfig: getArbPathConfig(),
        arbPathConfigUtils: getArbPathConfigUtils(),
        arbPaths: getArbPaths(),
        arbPathTemplateCacheUtils: getArbPathTemplateCacheUtils(),
        arbRuleSnapshotUtils: getArbRuleSnapshotUtils(),
        arbRuntimeMemoryUtils: getArbRuntimeMemoryUtils(),
        arbSpecialUtils: getArbSpecialUtils(),
        audioUtils: getAudioUtils(),
        backendUrl: BACKEND_URL,
        bodyEl: document.body,
        chainDefaults: getChainDefaults(),
        closestEventTarget,
        copyDexLinkFromElement,
        dashboardRuntimeUtils: getDashboardRuntimeUtils(),
        documentImpl: document,
        domRenderUtils: getDomRenderUtils(),
        fetchImpl: fetch,
        getActiveQuotes,
        getArbCycleStartPriority: () => arbCycleStartPriority,
        getArbDetailController: () => arbDetailController,
        getDashboardLocalStorage,
        getDashboardState: () => dashboardState,
        getQuoteChainDisplayName,
        getQuoteMarketState,
        getQuoteMarketStateMap,
        globalPathSourceSelectors: GLOBAL_PATH_SOURCE_SELECTORS,
        highlightDurationMs: 8000,
        isCrossChainQuote,
        isQuotePaused,
        logError: (...args) => console.error(...args),
        logInfo: (...args) => console.info(...args),
        logWarning: (...args) => console.warn(...args),
        mutedPathLegUtils: getMutedPathLegUtils(),
        mutedPathRuntimeUtils: getMutedPathRuntimeUtils(),
        mutedPathStorageUtils: getMutedPathStorageUtils(),
        mutedStateHiddenMaxRefreshMs: MUTED_STATE_HIDDEN_MAX_REFRESH_MS,
        mutedStateVisibleRefreshMs: MUTED_STATE_VISIBLE_REFRESH_MS,
        pathAlertNotificationUtils: getPathAlertNotificationUtils(),
        pathAlertPageUtils: getPathAlertPageUtils(),
        pathAlertRuleDefinitions: getPathAlertRuleDefinitionsUtils(),
        pathAlertUtils: getPathAlertUtils(),
        quoteDisplayUtils: getQuoteDisplayUtils(),
        quoteStateRuntime,
        specialRuleAlertConfigUtils: getSpecialRuleAlertConfigUtils(),
        arbPanelRefs: {
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
        alertRefs: {
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
        setInterval,
        clearInterval,
        setTimeout,
        clearTimeout,
        updateDelayMs: ARB_PANEL_UPDATE_DELAY_MS,
        windowImpl: window,
        zIndexRuntime: floatingPanelZIndexRuntime
    });
    const {
        alertRuntimeController,
        arbPanelController,
        applyFloatingPanelDisplay,
        buildArbPathLegLineOptions,
        buildLiveQuoteLabel,
        clearTopologyCache,
        findQuoteById,
        formatArbPathLegLine,
        formatChainLabel,
        formatDetailNumber,
        getAliasRules,
        getSharedArbRuleSnapshot,
        isRuleLeg,
        scheduleArbPanelUpdate,
        setArbPanelMaxHeight
    } = arbAlertRuntime;
    function renderDashboardForCurrentState() {
        renderDashboard();
        dashboardRendered = true;
        dashboardDirty = false;
    }

    function ensureDashboardRendered() {
        if (!dashboardRendered || dashboardDirty) {
            renderDashboardForCurrentState();
        }
        return dashboardRendered;
    }

    dashboardViewModeController = getDashboardViewModeController().createDashboardViewModeController({
        bodyEl: document.body,
        onShowDashboard: ensureDashboardRendered,
        refs: {
            dashboardEl,
            addCategoryBtn,
            arbPathWindow,
            viewArbBtn,
            viewDashboardBtn
        },
        setArbPanelMaxHeight,
        updateArbPanel
    });
    const quoteSpreadController = getQuoteSpreadController().createQuoteSpreadController({
        applyFloatingPanelDisplay,
        documentImpl: document,
        domRenderUtils: getDomRenderUtils(),
        formatChainLabel,
        getDashboardState: () => dashboardState,
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
    arbDetailController = getArbDetailController().createArbDetailController({
        arbDetailRefreshUtils: getArbDetailRefreshUtils(),
        arbDetailUtils: getArbDetailUtils(),
        arbPanelLayoutUtils: getArbPanelLayoutUtils(),
        abortActiveFetchControllers,
        buildArbPathLegLineOptions,
        chartAutoRefreshIntervalMs: CHART_AUTO_REFRESH_INTERVAL_MS,
        closestEventTarget,
        copyDexLinkFromElement,
        copyTextToClipboard,
        detailRefreshIntervalMs: ARB_DETAIL_REFRESH_INTERVAL_MS,
        documentImpl: document,
        domRenderUtils: getDomRenderUtils(),
        fetchImpl: fetch,
        fetchQuoteByStrategy,
        findQuoteById,
        formatChainLabel,
        formatDetailNumber,
        getApiIntervals: () => apiIntervals,
        getChartsRenderer: () => window.ChartsRenderer || null,
        getChartsUtils,
        getOpportunity: (opportunityId) => arbAlertRuntime.getOpportunity(opportunityId),
        getQuoteMarketState,
        isRuleLeg,
        logRefreshError: (error) => console.error('[arb-detail] refresh failed', error),
        muteLeg: (row, durationHours, nowMs) => alertRuntimeController.muteArbDetailLeg(row, durationHours, nowMs),
        promptImpl: window.prompt ? window.prompt.bind(window) : null,
        promptMutedPathLegDurationHours: (promptImpl) => getMutedPathLegUtils().promptMutedPathLegDurationHours(promptImpl),
        refs: {
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
        refreshOpportunities: () => updateArbPanel(),
        setQuoteMarketState,
        showCopyToast,
        updateSchedulers,
        windowImpl: window,
        setTimeout,
        clearTimeout
    });
    const closeArbDetailModal = arbDetailController.close;
    const openArbDetailModal = arbDetailController.open;
    const renderArbDetailModal = arbDetailController.render;
    const dataTerminalController = getDataTerminalController().createDataTerminalController({
        dataTerminalUtils: getDataTerminalUtils(),
        dashboardRuntimeUtils: getDashboardRuntimeUtils(),
        domRenderUtils: getDomRenderUtils(),
        documentImpl: document,
        windowImpl: window,
        setTimeout,
        clearTimeout,
        updateDelayMs: DATA_TERMINAL_UPDATE_DELAY_MS,
        getAnchorPanel: () => arbPathWindow,
        zIndexRuntime: floatingPanelZIndexRuntime,
        getDashboardState: () => dashboardState,
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
    quoteRuntime = getDashboardQuoteRuntime().createDashboardQuoteRuntime({
        AbortController,
        backendUrl: BACKEND_URL,
        chainDefaults: getChainDefaults(),
        checkPriceForAlerts: alertRuntimeController.checkPriceForAlerts,
        dashboardRuntimeUtils: getDashboardRuntimeUtils(),
        defaultIntervals: DEFAULT_INTERVALS,
        documentImpl: document,
        domRenderUtils: getDomRenderUtils(),
        fetchImpl: fetch,
        getApiIntervals: () => apiIntervals,
        getDashboardState: () => dashboardState,
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
        scheduleArbPanelUpdate,
        scheduleDataTerminalUpdate,
        setQuoteMarketState,
        shouldQueueInverseFetch,
        updateQuotePairLabel,
        updateTrendArrow
    });
    const {
        activeFetchControllerRuntime,
        addToQueue,
        queueQuoteRefresh,
        removeFromQueue,
        toggleMultiChannel
    } = quoteRuntime;

    function getDashboardLocalStorage() {
        return getDashboardRuntimeUtils().getBrowserLocalStorage({ window }, {
            onError: (error) => console.warn('访问浏览器本地缓存失败:', error)
        });
    }

    function closestEventTarget(event, selector) {
        return getDomRenderUtils().closestEventTarget(event, selector);
    }

    function buildQuoteAlertDisplayLabel(quote, monitorState = getQuoteMarketState(quote.id) || {}, direction = 'forward') {
        return alertRuntimeController.buildQuoteAlertDisplayLabel(quote, monitorState, direction);
    }

    function evaluateQuoteAlertsOnce() {
        alertRuntimeController.evaluateQuoteAlertsOnce();
    }

    const dashboardActionController = getDashboardActionController().createDashboardActionController({
        activeFetchControllerRuntime,
        addCategoryModalRefs,
        addQuoteModal,
        addQuoteModalSelectionRuntime,
        amountInputDebounceRuntime,
        arbDetailUtils: getArbDetailUtils(),
        closestEventTarget,
        closeArbDetailModal,
        confirmActionRuntime,
        confirmModalRefs,
        dashboardModalUtils: getDashboardModalUtils(),
        dashboardRenderer: getDashboardRenderer(),
        dashboardRuntimeUtils: getDashboardRuntimeUtils(),
        deleteQuoteMarketState,
        deleteQuoteUiRuntimeState,
        documentImpl: document,
        domRenderUtils: getDomRenderUtils(),
        evaluatePathAlertsOnce: alertRuntimeController.evaluatePathAlertsOnce,
        formatChainLabel,
        getArbDetailState: () => arbDetailController.getState(),
        getCategoryPauseAction,
        getDashboardState: () => dashboardState,
        getQuoteChainDisplayName,
        getQuoteMarketState,
        getRequestChannelOptions: () => requestChannelRuntime.getOptions(),
        isCexOrderbookChain,
        isCrossChainQuote,
        isEvmChain,
        isQuotePaused,
        quotePauseUtils: getQuotePauseUtils(),
        quoteSettingsModal,
        quoteSettingsModalElements,
        quoteSettingsSelectionRuntime,
        quoteStateRuntime,
        copyDexLinkFromElement,
        copyPriceText,
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
    });

    const {
        closeAddCategoryModal,
        closeQuoteSettingsModal,
        deleteCategoryFromDashboard,
        deleteQuoteFromCategory,
        handleDashboardClick,
        handleDashboardInput,
        openAddCategoryModal,
        setQuotePausedState,
        showConfirmation,
        swapQuoteTokens,
        syncKyberExcludedSourcesControl,
        toggleCategoryPause,
        toggleQuotePause,
        updateCategoryPauseButtonState
    } = dashboardActionController;

    const dashboardViewController = getDashboardViewController().createDashboardViewController({
        dashboardEl,
        dashboardRenderer: getDashboardRenderer(),
        dashboardRuntimeUtils: getDashboardRuntimeUtils(),
        dexLinkUtils: getDexLinkUtils(),
        documentImpl: document,
        getCategoryPauseAction,
        getDashboardState: () => dashboardState,
        getQuoteChainDisplayName,
        getQuoteDisplayText,
        getQuoteMarketState,
        getRequestChannelOptions: () => requestChannelRuntime.getOptions(),
        handleQuoteHover,
        isCexOrderbookChain,
        isCrossChainQuote,
        isQuotePaused,
        logger: console,
        quoteDisplayUtils: getQuoteDisplayUtils(),
        requestChannelUtils: getRequestChannelUtils(),
        saveData
    });
    const {
        createCategoryModule,
        createQuoteItem,
        renderDashboard
    } = dashboardViewController;

    const dashboardFormController = getDashboardFormController().createDashboardFormController({
        addCategoryModal,
        addCategoryModalRefs,
        addQuoteChainSelect,
        addQuoteInputs: [addQuoteFromInput, addQuoteToInput, addQuoteSymbolInput],
        addQuoteModal,
        addQuoteModalRefs,
        addQuoteModalSelectionRuntime,
        addQuoteToChainSelect,
        closeAddCategoryModal,
        closeQuoteSettingsModal,
        createCategoryModule,
        createQuoteItem,
        dashboardEl,
        dashboardModalUtils: getDashboardModalUtils(),
        dashboardRenderer: getDashboardRenderer(),
        dashboardRuntimeUtils: getDashboardRuntimeUtils(),
        defaultSourceResolver,
        deleteQuoteFromCategory,
        documentImpl: document,
        getDashboardState: () => dashboardState,
        isCexOrderbookChain,
        isCrossChainQuote,
        isEvmChain,
        normalizeChainKey,
        pathAlertPageUtils: getPathAlertPageUtils(),
        queueQuoteRefresh,
        quoteRequestChannelSelect,
        quoteSettingsModal,
        quoteSettingsModalElements,
        quoteSettingsSelectionRuntime,
        quoteSourceSelect,
        removeFromQueue,
        requestChannelUtils: getRequestChannelUtils(),
        saveData,
        showConfirmation,
        swapQuoteTokens,
        syncKyberExcludedSourcesControl,
        updateCategoryPauseButtonState,
        updateRequestChannelTagForQuote,
        windowImpl: window
    });
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
        domRenderUtils: getDomRenderUtils(),
        floatingPanelZIndexRuntime,
        getDashboardState: () => dashboardState,
        getPriceSnapshotConfig: () => priceSnapshotConfig,
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
        setApiIntervals: (nextIntervals) => { apiIntervals = nextIntervals; },
        setArbCycleStartPriority: (nextPriority) => { arbCycleStartPriority = nextPriority; },
        setArbPanelMaxHeight,
        setDashboardState: (nextState) => { dashboardState = nextState; },
        setPriceSnapshotConfig: (nextConfig) => { priceSnapshotConfig = nextConfig; },
        settingsModalRuntime,
        themeRuntime,
        updateArbPanel,
        updateSchedulers,
        windowImpl: window
    });
    dashboardLifecycleController.bindStaticEvents();
    
    dashboardLifecycleController.init();
}());
