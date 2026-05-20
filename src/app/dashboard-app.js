    const BACKEND_URL = `${location.protocol}//${location.hostname}:3000`;
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
        getDashboardDomRefs,
        getDashboardFormController,
        getDashboardLifecycleController,
        getDashboardModalUtils,
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
    const AMOUNT_INPUT_DEBOUNCE_MS = 600;
    const DASHBOARD_SAVE_DEBOUNCE_MS = 1500;

    let apiIntervals = { ...DEFAULT_INTERVALS };
    let arbCycleStartPriority = Array.from(DEFAULT_ARB_CYCLE_START_PRIORITY);
    const dashboardApiClient = getDashboardApiUtils().createDashboardApiClient({
        backendUrl: BACKEND_URL,
        fetchImpl: fetch,
        logger: console
    });

    const activeFetchControllerRuntime = getQuoteQueueRuntimeUtils().createActiveFetchControllerRuntime({
        AbortController
    });
    let priceSnapshotConfig = { enabled: false, intervalSec: 10 };
    const CHART_AUTO_REFRESH_INTERVAL_MS = 5000;
    const arbOpportunityRuntime = getArbRuntimeMemoryUtils().createArbOpportunityRuntime();
    const arbOpportunityHighlightRuntime = getArbRuntimeMemoryUtils().createArbOpportunityHighlightRuntime({
        durationMs: 8000,
        setTimer: setTimeout,
        clearTimer: clearTimeout,
        onExpired: () => updateArbPanel()
    });
    const FLOATING_PANEL_BASE_Z_INDEX = 2100;
    const floatingPanelZIndexRuntime = getDomRenderUtils().createFloatingPanelZIndexRuntime({
        baseZIndex: FLOATING_PANEL_BASE_Z_INDEX
    });
    const DATA_TERMINAL_UPDATE_DELAY_MS = 1000;
    const DEFAULT_QUOTE_DISPLAY_MODE = 'rate';
    const ARB_PANEL_UPDATE_DELAY_MS = 1000;
    const ARB_DETAIL_REFRESH_INTERVAL_MS = 2500;
    const MUTED_STATE_VISIBLE_REFRESH_MS = 1000;
    const MUTED_STATE_HIDDEN_MAX_REFRESH_MS = 60 * 1000;
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

    function isCrossChainQuote(quote) {
        return getChainDefaults().isCrossChainQuote(quote);
    }

    function getQuoteChainDisplayName(quote) {
        return getChainDefaults().buildQuoteChainDisplayName(quote);
    }

    function isCexOrderbookChain(chain) {
        return getChainDefaults().isCexOrderbookChain(chain);
    }

    const defaultSourceResolver = (chain) => getChainDefaults().getDefaultSourceForChain(chain);

    function isEvmChain(chain) {
        return getChainDefaults().isEvmChain(chain);
    }

    function shouldQueueInverseFetch(quote) {
        return getQueueStatsUtils().shouldQueueInverseFetch(quote);
    }

    function isQuotePaused(quote) {
        return getQuotePauseUtils().isQuotePaused(quote);
    }

    function getActiveQuotes(quotes) {
        return getQuotePauseUtils().getActiveQuotes(quotes);
    }

    function getCategoryPauseAction(quotes) {
        return getQuotePauseUtils().getCategoryPauseAction(quotes);
    }

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
        isQuotePaused,
        logger: console,
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
        bindCopyHandler,
        copyDexLinkFromElement,
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
    let alertRuntimeController = null;
    let arbDetailController = null;
    const FIXED_PATH_RULES = getPathAlertRuleDefinitionsUtils().FIXED_PATH_RULES;
    const SPECIAL_ARB_RULES = getPathAlertRuleDefinitionsUtils().SPECIAL_ARB_RULES;
    const GLOBAL_PATH_SOURCE_SELECTORS = [0, 1, 2, 3];
    const ARB_PATH_CONFIG = getArbPathConfig();
    const arbAlertBridgeRuntime = getArbAlertBridgeUtils().createArbAlertBridgeRuntime({
        arbOpportunityRuntime,
        arbOpportunityHighlightRuntime,
        closeArbDetailModal: () => {
            if (arbDetailController) arbDetailController.close();
        },
        getAlertRuntimeController: () => alertRuntimeController,
        invalidateArbRuleSnapshotCache: () => invalidateArbRuleSnapshotCache(),
        isArbDetailVisible: () => Boolean(arbDetailController && arbDetailController.isVisible()),
        renderArbDetailModal: () => {
            if (arbDetailController) arbDetailController.render();
        },
        updateArbPanel: () => updateArbPanel()
    });
    const arbPanelController = getArbPanelController().createArbPanelController({
        arbAlertBridgeRuntime,
        arbCyclePriorityUtils: getArbCyclePriorityUtils(),
        arbDetailUtils: getArbDetailUtils(),
        arbEquivalenceUtils: getArbEquivalenceUtils(),
        arbFixedUtils: getArbFixedUtils(),
        arbOpportunityHighlightRuntime,
        arbOpportunityRuntime,
        arbPanelLayoutUtils: getArbPanelLayoutUtils(),
        arbPanelRenderer: getArbPanelRenderer(),
        arbPathConfig: ARB_PATH_CONFIG,
        arbPathConfigUtils: getArbPathConfigUtils(),
        arbPaths: getArbPaths(),
        arbPathTemplateCacheUtils: getArbPathTemplateCacheUtils(),
        arbRuleSnapshotUtils: getArbRuleSnapshotUtils(),
        arbRuntimeMemoryUtils: getArbRuntimeMemoryUtils(),
        arbSpecialUtils: getArbSpecialUtils(),
        chainDefaults: getChainDefaults(),
        closestEventTarget,
        dashboardRuntimeUtils: getDashboardRuntimeUtils(),
        documentImpl: document,
        domRenderUtils: getDomRenderUtils(),
        fixedPathRules: FIXED_PATH_RULES,
        getActiveQuotes,
        getArbCycleStartPriority: () => arbCycleStartPriority,
        getArbDetailController: () => arbDetailController,
        getDashboardState: () => dashboardState,
        getQuoteMarketState,
        getQuoteMarketStateMap,
        globalPathSourceSelectors: GLOBAL_PATH_SOURCE_SELECTORS,
        isQuotePaused,
        mutedPathLegUtils: getMutedPathLegUtils(),
        openArbDetailModal: (opportunityId) => {
            if (arbDetailController) arbDetailController.open(opportunityId);
        },
        pathAlertPageUtils: getPathAlertPageUtils(),
        pathAlertRuleDefinitions: getPathAlertRuleDefinitionsUtils(),
        quoteDisplayUtils: getQuoteDisplayUtils(),
        quoteStateRuntime,
        refs: {
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
        setTimeout,
        clearTimeout,
        specialArbRules: SPECIAL_ARB_RULES,
        updateDelayMs: ARB_PANEL_UPDATE_DELAY_MS,
        windowImpl: window,
        zIndexRuntime: floatingPanelZIndexRuntime,
        buildQuoteAlertDisplayLabel: (quote, state, direction) => buildQuoteAlertDisplayLabel(quote, state, direction)
    });
    const {
        applyFloatingPanelDisplay,
        buildArbPathLegLineOptions,
        buildLiveQuoteLabel,
        clearTopologyCache,
        findQuoteById,
        formatArbPathLegLine,
        formatChainLabel,
        formatDetailNumber,
        getAliasRules,
        getSharedRuleSnapshot: getSharedArbRuleSnapshot,
        invalidateRuleSnapshotCache: invalidateArbRuleSnapshotCache,
        isRuleLeg,
        scheduleUpdate: scheduleArbPanelUpdate,
        setMaxHeight: setArbPanelMaxHeight,
        update: updateArbPanel
    } = arbPanelController;
    let dashboardRendered = false;

    function renderDashboardForCurrentState() {
        renderDashboard();
        dashboardRendered = true;
    }

    function ensureDashboardRendered() {
        if (!dashboardRendered) {
            renderDashboardForCurrentState();
        }
        return dashboardRendered;
    }

    const dashboardViewModeController = getDashboardViewModeController().createDashboardViewModeController({
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
    alertRuntimeController = getAlertRuntimeController().createAlertRuntimeController({
        alertDebugUtils: getAlertDebugUtils(),
        alertLogUiUtils: getAlertLogUiUtils(),
        arbAlertBridgeRuntime,
        applyFloatingPanelDisplay,
        arbDetailUtils: getArbDetailUtils(),
        arbPanelLayoutUtils: getArbPanelLayoutUtils(),
        arbRuntimeMemoryUtils: getArbRuntimeMemoryUtils(),
        audioUtils: getAudioUtils(),
        backendUrl: BACKEND_URL,
        bodyEl: document.body,
        AudioCtor: Audio,
        buildLiveQuoteLabel,
        closestEventTarget,
        copyDexLinkFromElement,
        dashboardRuntimeUtils: getDashboardRuntimeUtils(),
        documentImpl: document,
        domRenderUtils: getDomRenderUtils(),
        fetchImpl: fetch,
        findQuoteById,
        fixedPathRules: FIXED_PATH_RULES,
        formatArbPathLegLine,
        formatDetailNumber,
        getDashboardLocalStorage,
        getDashboardState: () => dashboardState,
        getQuoteChainDisplayName,
        getQuoteMarketState,
        getQuoteMarketStateMap,
        getSharedArbRuleSnapshot,
        isCrossChainQuote,
        isQuotePaused,
        isRuleLeg,
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
        refs: {
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
        specialArbRules: SPECIAL_ARB_RULES,
        specialRuleAlertConfigUtils: getSpecialRuleAlertConfigUtils(),
        windowImpl: window
    });
    alertRuntimeController.bindAudioUnlockEvents();

    arbDetailController = getArbDetailController().createArbDetailController({
        arbDetailRefreshUtils: getArbDetailRefreshUtils(),
        arbDetailUtils: getArbDetailUtils(),
        arbPanelLayoutUtils: getArbPanelLayoutUtils(),
        abortActiveFetchControllers: () => activeFetchControllerRuntime.abortAll(),
        buildArbPathLegLineOptions,
        chartAutoRefreshIntervalMs: CHART_AUTO_REFRESH_INTERVAL_MS,
        closestEventTarget,
        copyDexLinkFromElement,
        copyTextToClipboard,
        detailRefreshIntervalMs: ARB_DETAIL_REFRESH_INTERVAL_MS,
        documentImpl: document,
        domRenderUtils: getDomRenderUtils(),
        fetchImpl: fetch,
        fetchQuoteByStrategy: (quote, options) => fetchQuoteByStrategy(quote, options),
        findQuoteById,
        formatChainLabel,
        formatDetailNumber,
        getApiIntervals: () => apiIntervals,
        getChartsRenderer: () => window.ChartsRenderer || null,
        getChartsUtils,
        getOpportunity: (opportunityId) => arbOpportunityRuntime.getOpportunity(opportunityId),
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
        updateSchedulers: () => updateSchedulers(),
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
    const keyboardShortcutController = getKeyboardShortcutController().createKeyboardShortcutController({
        documentImpl: document,
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
    const quoteFetchController = getQuoteFetchController().createQuoteFetchController({
        activeFetchControllerRuntime,
        backendUrl: BACKEND_URL,
        bindCopyHandler,
        chainDefaults: getChainDefaults(),
        checkPriceForAlerts: alertRuntimeController.checkPriceForAlerts,
        dashboardRuntimeUtils: getDashboardRuntimeUtils(),
        documentImpl: document,
        domRenderUtils: getDomRenderUtils(),
        fetchImpl: fetch,
        getEffectiveRequestChannelIdForQuote,
        getInverseQuoteDisplayText,
        getQuoteDisplayMode,
        getQuoteDisplayText,
        getQuoteMarketState,
        isQuotePaused,
        logWarning: (...args) => console.warn(...args),
        quoteDisplayUtils: getQuoteDisplayUtils(),
        quoteRequestUtils: getQuoteRequestUtils(),
        recordSourceAttempt: (source) => arbDetailController.recordSourceAttempt(source),
        resetQuoteUiRuntimeState,
        scheduleArbPanelUpdate,
        scheduleDataTerminalUpdate,
        setQuoteMarketState,
        shouldQueueInverseFetch,
        updateQuotePairLabel,
        updateTrendArrow
    });
    const fetchQuoteByStrategy = quoteFetchController.fetchByStrategy;
    const fetchSingleQuote = quoteFetchController.fetchSingle;

    function getDashboardLocalStorage() {
        return getDashboardRuntimeUtils().getBrowserLocalStorage({ window }, {
            onError: (error) => console.warn('访问浏览器本地缓存失败:', error)
        });
    }

    const quoteQueueRuntime = getQuoteQueueRuntimeUtils().createQuoteQueueRuntime({
        getDashboardState: () => dashboardState,
        getQueueTypeForQuote: (quote) => getQueueStatsUtils().getQueueTypeForQuote(quote, requestChannelRuntime.getOptions(), {
            multiChannelEnabled: requestChannelRuntime.isMultiChannelEnabled()
        }),
        getQueueIntervalMs: (type) => getRequestChannelUtils().getEffectiveIntervalForQueue(type, apiIntervals, requestChannelRuntime.getOptions()),
        getManagedQueueKeys: () => getQueueStatsUtils().buildManagedQueueKeys({
            defaultIntervals: DEFAULT_INTERVALS,
            requestChannels: requestChannelRuntime.getOptions(),
            multiChannelEnabled: requestChannelRuntime.isMultiChannelEnabled(),
            quotes: dashboardState.flatMap((category) => category.quotes || [])
        }),
        appendQuoteQueueTasks: (queue, quote) => getQueueStatsUtils().appendQuoteQueueTasks(queue, quote),
        removeQuoteTasksFromQueues: (queueState, quoteId) => getQueueStatsUtils().removeQuoteTasksFromQueues(queueState, quoteId),
        deferQueueTask: (queue, index) => getQueueStatsUtils().deferQueueTask(queue, index),
        getQueueTaskStatus: (task, type, quote) => getQueueStatsUtils().getQueueTaskStatus(
            task,
            type,
            quote,
            requestChannelRuntime.getOptions(),
            { multiChannelEnabled: requestChannelRuntime.isMultiChannelEnabled() }
        ),
        isSchedulerPaused: () => arbDetailController.isDashboardPaused(),
        hasActiveFetchController: (quoteId) => activeFetchControllerRuntime.has(quoteId),
        fetchQuote: (quote, mode) => fetchSingleQuote(quote, mode)
    });
    const quoteRefreshRuntime = getQuoteQueueRuntimeUtils().createQuoteRefreshRuntime({
        activeFetchControllerRuntime,
        applyActiveQuoteUiState,
        isQuotePaused,
        quoteQueueRuntime
    });
    const addToQueue = quoteRefreshRuntime.addToQueue;
    const queueQuoteRefresh = quoteRefreshRuntime.queueQuoteRefresh;
    const removeFromQueue = quoteRefreshRuntime.removeFromQueue;
    const updateSchedulers = quoteRefreshRuntime.updateSchedulers;

    function toggleMultiChannel() {
        requestChannelRuntime.toggleMultiChannel(dashboardState, quoteRefreshRuntime.getQueueMutationCallbacks());
    }

    settingsModalRuntime.bind();

    function normalizeChainKey(chain) {
        return getQuoteRequestUtils().normalizeChainKey(chain);
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

    addCategoryBtn.addEventListener('click', openAddCategoryModal);
    dashboardEl.addEventListener('input', handleDashboardInput);
    dashboardEl.addEventListener('click', handleDashboardClick);

    const dashboardViewController = getDashboardViewController().createDashboardViewController({
        bindCopyHandler,
        copyDexLinkFromElement,
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
    dashboardFormController.bind();

    const dashboardLifecycleController = getDashboardLifecycleController().createDashboardLifecycleController({
        addToQueue,
        alertRuntimeController,
        applyQuoteDisplayToggleButtonState,
        arbDetailController,
        arbPanelController,
        clearTopologyCache,
        confirmActionRuntime,
        dashboardApiClient,
        dashboardRenderer: getDashboardRenderer(),
        dashboardViewModeController,
        defaultArbCycleStartPriority: DEFAULT_ARB_CYCLE_START_PRIORITY,
        defaultIntervals: DEFAULT_INTERVALS,
        documentImpl: document,
        domRenderUtils: getDomRenderUtils(),
        floatingPanelZIndexRuntime,
        getDashboardState: () => dashboardState,
        getPriceSnapshotConfig: () => priceSnapshotConfig,
        invalidateArbRuleSnapshotCache,
        keyboardShortcutController,
        normalizeArbCycleStartPriority: getArbCyclePriorityUtils().normalizeArbCycleStartPriority,
        performSave,
        priceSnapshotSaveRuntime,
        priceSnapshotTimerRuntime,
        quoteSpreadController,
        renderDashboard: renderDashboardForCurrentState,
        requestChannelRuntime,
        requestChannelTagVisibilityRuntime,
        refs: {
            dashboardEl,
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
        themeRuntime,
        toggleArbPanel: dashboardViewModeController.toggleArbView,
        toggleDataTerminalPanel,
        toggleMultiChannel,
        toggleQuoteDisplayMode,
        updateArbPanel,
        updateSchedulers,
        windowImpl: window
    });
    dashboardLifecycleController.bindStaticEvents();
    
    dashboardLifecycleController.init();
