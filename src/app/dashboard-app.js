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
        getDashboardAppStateRuntime,
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
        getDashboardRuntimeRefUtils,
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

    const quoteRuntimeRef = getDashboardRuntimeRefUtils().createDashboardRuntimeRef({ name: 'Dashboard quote runtime' });
    const arbAlertRuntimeRef = getDashboardRuntimeRefUtils().createDashboardRuntimeRef({ name: 'Dashboard arb alert runtime' });
    const dashboardViewRenderRuntimeRef = getDashboardRuntimeRefUtils().createDashboardRuntimeRef({ name: 'Dashboard view render runtime' });
    let dashboardViewModeController = null;
    function abortActiveFetchControllers() {
        return quoteRuntimeRef.call('abortActiveFetchControllers');
    }
    function fetchQuoteByStrategy(quote, options) {
        return quoteRuntimeRef.call('fetchQuoteByStrategy', quote, options);
    }
    function updateSchedulers() {
        return quoteRuntimeRef.call('updateSchedulers');
    }
    function invalidateArbRuleSnapshotCache(options) {
        return arbAlertRuntimeRef.call('invalidateArbRuleSnapshotCache', options);
    }
    function updateArbPanel(options) {
        return arbAlertRuntimeRef.call('updateArbPanel', options);
    }
    function isDashboardViewActive() {
        return Boolean(dashboardViewRenderRuntimeRef.callOr(false, 'isActive'));
    }
    function markDashboardViewDirty() {
        return dashboardViewRenderRuntimeRef.callOr(false, 'markDirty');
    }
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

    const themeRuntime = getThemeUtils().createThemeRuntime({
        body: document.body,
        button: themeToggleBtn,
        getStorage: getDashboardLocalStorage,
        onLoadError: (error) => console.warn('读取主题本地缓存失败:', error)
    });
    const settingsSaveFeedbackRuntime = dashboardRuntimeUtils.createButtonFeedbackRuntime({
        setTimeout,
        clearTimeout,
        durationMs: 1500
    });
    const dashboardPersistenceRuntime = dashboardRuntimeUtils.createDashboardPersistenceRuntime({
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
        getDashboardState,
        getApiIntervals,
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
        getIntervals: getApiIntervals,
        setIntervals: setApiIntervals,
        buildSettingsIntervalWritePlan: getDashboardRenderer().buildSettingsIntervalWritePlan,
        readSettingsIntervalFormValues: getDashboardRenderer().readSettingsIntervalFormValues,
        buildSettingsIntervalsFromFormValues: getDashboardRenderer().buildSettingsIntervalsFromFormValues,
        onSave: () => {
            requestChannelRuntime.setDefaultIntervals(getApiIntervals());
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
        defaultIntervals: getApiIntervals(),
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
    let arbDetailController = null;
    const arbAlertRuntime = arbAlertRuntimeRef.set(getDashboardArbAlertRuntime().createDashboardArbAlertRuntime({
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
        dashboardRuntimeUtils,
        documentImpl: document,
        domRenderUtils,
        fetchImpl: fetch,
        getActiveQuotes,
        getArbCycleStartPriority,
        getArbDetailController: () => arbDetailController,
        getDashboardLocalStorage,
        getDashboardState,
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
    }));
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
        return dashboardViewRenderRuntimeRef.callOr(false, 'renderNow');
    }

    function ensureDashboardRendered() {
        return dashboardViewRenderRuntimeRef.callOr(false, 'ensureRendered');
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
        domRenderUtils,
        fetchImpl: fetch,
        fetchQuoteByStrategy,
        findQuoteById,
        formatChainLabel,
        formatDetailNumber,
        getApiIntervals,
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
        checkPriceForAlerts: alertRuntimeController.checkPriceForAlerts,
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
        dashboardRuntimeUtils,
        deleteQuoteMarketState,
        deleteQuoteUiRuntimeState,
        documentImpl: document,
        domRenderUtils,
        evaluatePathAlertsOnce: alertRuntimeController.evaluatePathAlertsOnce,
        formatChainLabel,
        getArbDetailState: () => arbDetailController.getState(),
        getCategoryPauseAction,
        getDashboardState,
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
        dashboardRuntimeUtils,
        dexLinkUtils: getDexLinkUtils(),
        documentImpl: document,
        getCategoryPauseAction,
        getDashboardState,
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
    dashboardViewRenderRuntimeRef.set(getDashboardViewModeController().createDashboardViewRenderRuntime({
        activeMode: getDashboardViewModeController().APP_VIEW_DASHBOARD,
        getMode: () => dashboardViewModeController && dashboardViewModeController.getMode(),
        render: renderDashboard
    }));

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
        dashboardRuntimeUtils,
        defaultSourceResolver,
        deleteQuoteFromCategory,
        documentImpl: document,
        getDashboardState,
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
