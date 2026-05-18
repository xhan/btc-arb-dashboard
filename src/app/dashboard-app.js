    const BACKEND_URL = `${location.protocol}//${location.hostname}:3000`;
    const {
        getAlertDebugUtils,
        getAlertLogUiUtils,
        getAlertRuntimeController,
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
        getDashboardModalUtils,
        getDashboardRenderer,
        getDashboardRuntimeUtils,
        getDashboardViewController,
        getDataTerminalController,
        getDataTerminalUtils,
        getDexLinkUtils,
        getDomRenderUtils,
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
    let requestChannelPayload = { channels: [] };
    let multiChannelEnabled = true;
    let requestChannelOptions = getRequestChannelUtils().getRequestChannelOptions(requestChannelPayload, apiIntervals);
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
    const dashboardSaveRuntime = getDashboardRuntimeUtils().createDashboardSaveRuntime({
        setTimeout,
        clearTimeout,
        delayMs: DASHBOARD_SAVE_DEBOUNCE_MS
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
        toggleDataTerminalBtn,
        toggleArbBtn,
        toggleAlertLogBtn,
        toggleMultiChannelBtn,
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
            refreshRequestChannelOptions();
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
    const manualSaveFeedbackRuntime = getDashboardRuntimeUtils().createSaveButtonFeedbackRuntime({
        button: manualSaveBtn,
        textEl: manualSaveText,
        setTimeout,
        clearTimeout
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

    const quoteStateRuntime = getQuoteStateRuntimeUtils().createQuoteStateRuntime({
        dashboardRuntimeUtils: getDashboardRuntimeUtils()
    });
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
    const arbPanelController = getArbPanelController().createArbPanelController({
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
        getAlertRuntimeController: () => alertRuntimeController,
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
        togglePanel: toggleArbPanel,
        update: updateArbPanel
    } = arbPanelController;
    alertRuntimeController = getAlertRuntimeController().createAlertRuntimeController({
        alertDebugUtils: getAlertDebugUtils(),
        alertLogUiUtils: getAlertLogUiUtils(),
        applyFloatingPanelDisplay,
        arbDetailUtils: getArbDetailUtils(),
        arbOpportunityHighlightRuntime,
        arbOpportunityRuntime,
        arbPanelLayoutUtils: getArbPanelLayoutUtils(),
        arbRuntimeMemoryUtils: getArbRuntimeMemoryUtils(),
        audioUtils: getAudioUtils(),
        backendUrl: BACKEND_URL,
        bodyEl: document.body,
        AudioCtor: Audio,
        buildLiveQuoteLabel,
        closeArbDetailModal: () => {
            if (arbDetailController) arbDetailController.close();
        },
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
        invalidateArbRuleSnapshotCache,
        isArbDetailVisible: () => Boolean(arbDetailController && arbDetailController.isVisible()),
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
        renderArbDetailModal: () => {
            if (arbDetailController) arbDetailController.render();
        },
        setInterval,
        clearInterval,
        setTimeout,
        clearTimeout,
        specialArbRules: SPECIAL_ARB_RULES,
        specialRuleAlertConfigUtils: getSpecialRuleAlertConfigUtils(),
        updateArbPanel,
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

    function refreshRequestChannelOptions() {
        requestChannelOptions = getRequestChannelUtils().getRequestChannelOptions(requestChannelPayload, apiIntervals);
    }

    function getDashboardLocalStorage() {
        return getDashboardRuntimeUtils().getBrowserLocalStorage({ window }, {
            onError: (error) => console.warn('访问浏览器本地缓存失败:', error)
        });
    }

    function getEffectiveRequestChannelIdForQuote(quote, options = {}) {
        const nextMultiChannelEnabled = typeof options.multiChannelEnabled === 'boolean'
            ? options.multiChannelEnabled
            : multiChannelEnabled;
        return getRequestChannelUtils().getEffectiveRequestChannelIdForQuote(quote, requestChannelOptions, {
            multiChannelEnabled: nextMultiChannelEnabled
        });
    }

    function updateRequestChannelTagForQuote(quote) {
        getRequestChannelUtils().applyRequestChannelTagForQuote(quote, requestChannelOptions, {
            getElementById: (id) => document.getElementById(id)
        });
    }

    const quoteQueueRuntime = getQuoteQueueRuntimeUtils().createQuoteQueueRuntime({
        getDashboardState: () => dashboardState,
        getQueueTypeForQuote: (quote) => getQueueStatsUtils().getQueueTypeForQuote(quote, requestChannelOptions, { multiChannelEnabled }),
        getQueueIntervalMs: (type) => getRequestChannelUtils().getEffectiveIntervalForQueue(type, apiIntervals, requestChannelOptions),
        getManagedQueueKeys: () => getQueueStatsUtils().buildManagedQueueKeys({
            defaultIntervals: DEFAULT_INTERVALS,
            requestChannels: requestChannelOptions,
            multiChannelEnabled,
            quotes: dashboardState.flatMap((category) => category.quotes || [])
        }),
        appendQuoteQueueTasks: (queue, quote) => getQueueStatsUtils().appendQuoteQueueTasks(queue, quote),
        removeQuoteTasksFromQueues: (queueState, quoteId) => getQueueStatsUtils().removeQuoteTasksFromQueues(queueState, quoteId),
        deferQueueTask: (queue, index) => getQueueStatsUtils().deferQueueTask(queue, index),
        getQueueTaskStatus: (task, type, quote) => getQueueStatsUtils().getQueueTaskStatus(
            task,
            type,
            quote,
            requestChannelOptions,
            { multiChannelEnabled }
        ),
        isSchedulerPaused: () => arbDetailController.isDashboardPaused(),
        hasActiveFetchController: (quoteId) => activeFetchControllerRuntime.has(quoteId),
        fetchQuote: (quote, mode) => fetchSingleQuote(quote, mode)
    });

    function addToQueue(quote) {
        if (!quote || isQuotePaused(quote)) return;
        quoteQueueRuntime.addToQueue(quote);
    }

    function queueQuoteRefresh(quote, options = {}) {
        if (!quote || isQuotePaused(quote)) return false;
        if (options.abortActive !== false) {
            activeFetchControllerRuntime.abort(quote.id);
        }
        applyActiveQuoteUiState(quote, {
            text: options.text || '排队中...',
            loading: options.loading !== false,
            clearInverse: options.clearInverse === true
        });
        addToQueue(quote);
        if (options.updateSchedulers !== false) {
            updateSchedulers();
        }
        return true;
    }

    function rebuildQueuesForMultiChannelToggle(previousEnabled, nextEnabled) {
        dashboardState.forEach((category) => {
            (category.quotes || []).forEach((quote) => {
                if (!getRequestChannelUtils().supportsRequestChannelForQuote(quote)) {
                    return;
                }
                const previousChannelId = getEffectiveRequestChannelIdForQuote(quote, { multiChannelEnabled: previousEnabled });
                const nextChannelId = getEffectiveRequestChannelIdForQuote(quote, { multiChannelEnabled: nextEnabled });
                if (previousChannelId === nextChannelId) {
                    return;
                }
                removeFromQueue(quote.id);
                queueQuoteRefresh(quote, { updateSchedulers: false });
            });
        });
        updateSchedulers();
    }

    function setMultiChannelEnabled(nextValue) {
        const result = multiChannelToggleRuntime.set(nextValue);
        multiChannelEnabled = result.nextEnabled;
        if (!result.changed) {
            return;
        }
        rebuildQueuesForMultiChannelToggle(result.previousEnabled, result.nextEnabled);
    }

    function removeFromQueue(quoteId) {
        quoteQueueRuntime.removeFromQueue(quoteId);
    }

    function updateSchedulers() {
        quoteQueueRuntime.updateSchedulers();
    }

    settingsModalRuntime.bind();

    function getQuoteMarketState(quoteId, fallback = null) {
        return quoteStateRuntime.getMarketState(quoteId, fallback);
    }

    function getQuoteMarketStateMap() {
        return quoteStateRuntime.getMarketStateMap();
    }

    function setQuoteMarketState(quoteId, nextState) {
        const marketStateChanged = quoteStateRuntime.setMarketState(quoteId, nextState);
        if (marketStateChanged) {
            invalidateArbRuleSnapshotCache({ bumpRevision: false });
        }
        return marketStateChanged;
    }

    function deleteQuoteMarketState(quoteId) {
        return quoteStateRuntime.deleteMarketState(quoteId);
    }

    function resetQuoteUiRuntimeState(quoteId) {
        quoteStateRuntime.resetUiRuntimeState(quoteId, clearTimeout);
    }

    function deleteQuoteUiRuntimeState(quoteId) {
        quoteStateRuntime.deleteUiRuntimeState(quoteId, clearTimeout);
    }

    function normalizeChainKey(chain) {
        return getQuoteRequestUtils().normalizeChainKey(chain);
    }

    function closestEventTarget(event, selector) {
        return getDomRenderUtils().closestEventTarget(event, selector);
    }

    function handleGlobalShortcuts(event) {
        const action = getKeyboardShortcutUtils().resolveGlobalShortcutAction(event, {
            arbDetailVisible: arbDetailController.isVisible()
        });
        if (!action) return;
        event.preventDefault();

        switch (action) {
            case 'close-arb-detail':
                closeArbDetailModal();
                break;
            case 'toggle-arb-panel':
                toggleArbPanel();
                break;
            case 'toggle-data-terminal':
                toggleDataTerminalPanel();
                break;
            case 'toggle-quote-display':
                toggleQuoteDisplayMode();
                break;
            case 'open-alert-log-settings':
                alertRuntimeController.openAlertLogSettingsPanel();
                break;
            case 'toggle-alert-log':
                alertRuntimeController.toggleAlertLogPanel();
                break;
            case 'toggle-request-channel-tags':
                requestChannelTagVisibilityRuntime.toggle();
                break;
        }
    }

    function buildQuoteAlertDisplayLabel(quote, monitorState = getQuoteMarketState(quote.id) || {}, direction = 'forward') {
        return alertRuntimeController.buildQuoteAlertDisplayLabel(quote, monitorState, direction);
    }

    function evaluateQuoteAlertsOnce() {
        alertRuntimeController.evaluateQuoteAlertsOnce();
    }

    async function performSave(isManual = false) {
        manualSaveFeedbackRuntime.showSaving({ manual: isManual });
        if (isManual) {
            dashboardSaveRuntime.clear();
        }

        try {
            const payload = {
                dashboard: dashboardState,
                settings: apiIntervals
            };

            await dashboardApiClient.saveDashboardConfig(payload);
            
            manualSaveFeedbackRuntime.showSuccess();

        } catch (error) { 
            console.error('配置保存失败:', error);
            manualSaveFeedbackRuntime.showError();
        }
    }

    async function saveData() {
        dashboardSaveRuntime.schedule(() => { void performSave(false); });
    }

    async function loadPriceSnapshotConfig() {
        priceSnapshotConfig = await dashboardApiClient.loadPriceSnapshotConfig();
    }

    async function loadArbSettings() {
        arbCycleStartPriority = await dashboardApiClient.loadArbSettings({
            normalizePriority: getArbCyclePriorityUtils().normalizeArbCycleStartPriority,
            defaultPriority: DEFAULT_ARB_CYCLE_START_PRIORITY
        });
        invalidateArbRuleSnapshotCache();
        clearTopologyCache();
    }

    async function loadRequestChannels() {
        requestChannelPayload = await dashboardApiClient.loadRequestChannels();
        refreshRequestChannelOptions();
        dashboardState.forEach((category) => {
            (category.quotes || []).forEach((quote) => updateRequestChannelTagForQuote(quote));
        });
    }

    manualSaveBtn.addEventListener('click', () => { performSave(true); });
    
    themeToggleBtn.addEventListener('click', () => { themeRuntime.toggle(); });

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
        getRequestChannelOptions: () => requestChannelOptions,
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
        getRequestChannelOptions: () => requestChannelOptions,
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

    function handleConfirmModalClick(event) {
        const action = getDashboardRenderer().resolveConfirmModalClickAction(event, { modal: confirmModal });
        if (action.type !== 'none' && typeof event.stopPropagation === 'function') {
            event.stopPropagation();
        }
        if (action.type === 'confirm') {
            confirmActionRuntime.confirm();
        }
        if (action.type === 'confirm' || action.type === 'close') {
            confirmActionRuntime.close(confirmModalRefs);
        }
    }

    if (confirmOkBtn) confirmOkBtn.addEventListener('click', handleConfirmModalClick);
    if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', handleConfirmModalClick);
    confirmModal.addEventListener('click', handleConfirmModalClick);

    async function init() {
        audioNoticeEl.style.display = 'block';
        multiChannelEnabled = multiChannelToggleRuntime.load();
        requestChannelTagVisibilityRuntime.apply();
        await dashboardApiClient.requestBackendConfigRefresh();
        await loadPriceSnapshotConfig();
        await loadArbSettings();
        themeRuntime.load();
        alertRuntimeController.loadMutedPathState();
        
        try {
            const loadedConfig = await dashboardApiClient.loadDashboardConfig(DEFAULT_INTERVALS);
            dashboardState = loadedConfig.dashboardState;
            apiIntervals = loadedConfig.apiIntervals;
            if (loadedConfig.migratedSolanaInterval) {
                saveData();
            }
            refreshRequestChannelOptions();
            await loadRequestChannels();

            await alertRuntimeController.loadPathAlertConfig();
            
            renderDashboard();
            updateArbPanel();
            setArbPanelMaxHeight();
            alertRuntimeController.renderAlertSettingsPanel();
            
            const allQuotes = dashboardState.flatMap(c => c.quotes || []);
            
            allQuotes.forEach(quote => {
                addToQueue(quote);
            });

            arbDetailController.syncQuoteRunStateTag();
            updateSchedulers();
            priceSnapshotTimerRuntime.start(priceSnapshotConfig, () => {
                void priceSnapshotSaveRuntime.saveIfNeeded();
            });
            window.addEventListener('storage', alertRuntimeController.handlePathAlertConfigSyncStorage);
            alertRuntimeController.restartPathAlertScheduler();
            
            if (alertLogWindow && alertLogHeader) {
                getDomRenderUtils().bindFloatingPanelChrome(alertLogWindow, alertLogHeader, {
                    documentImpl: document,
                    zIndexRuntime: floatingPanelZIndexRuntime
                });
            }
            if (arbPathWindow && arbPathHeader) {
                getDomRenderUtils().bindFloatingPanelChrome(arbPathWindow, arbPathHeader, {
                    documentImpl: document,
                    zIndexRuntime: floatingPanelZIndexRuntime,
                    draggable: false
                });
            }

            applyQuoteDisplayToggleButtonState();
            if (toggleArbBtn) {
                toggleArbBtn.addEventListener('click', toggleArbPanel);
            }
            if (toggleQuoteDisplayBtn) {
                toggleQuoteDisplayBtn.addEventListener('click', toggleQuoteDisplayMode);
            }
            if (toggleDataTerminalBtn) {
                toggleDataTerminalBtn.addEventListener('click', toggleDataTerminalPanel);
            }
            if (toggleAlertLogBtn) {
                toggleAlertLogBtn.addEventListener('click', alertRuntimeController.toggleAlertLogPanel);
            }
            if (toggleMultiChannelBtn) {
                toggleMultiChannelBtn.addEventListener('click', () => {
                    setMultiChannelEnabled(!multiChannelEnabled);
                });
            }
            if (alertLogWindow) {
                alertLogWindow.addEventListener('click', alertRuntimeController.handleAlertLogClick);
                alertLogWindow.addEventListener('change', alertRuntimeController.handleAlertSettingsChange);
            }
            if (alertLogMutedLogContent) {
                alertRuntimeController.restoreMutedAlertLogEntries(Date.now());
            }
            alertRuntimeController.renderMutedAlertStatePanel(Date.now());
            alertRuntimeController.renderAlertLogTabState();
            alertRuntimeController.syncMutedPathLogTimer();
            arbPanelController.bindContentEvents();
            arbDetailController.bindGridEvents();
            arbDetailController.bindChromeEvents();
            arbPanelController.bindGlobalFilterEvents();
            document.addEventListener('keydown', handleGlobalShortcuts);
            if (arbPathMinBtn) {
                arbPathMinBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleArbPanel();
                });
            }
            if (alertLogMinBtn) {
                alertLogMinBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    alertRuntimeController.toggleAlertLogPanel();
                });
            }
            window.addEventListener('resize', setArbPanelMaxHeight);
        } catch (error) {
            dashboardEl.innerHTML = `<div class="module"><h2 style="color: var(--error-color);">加载配置失败</h2><p>${error.message}。请确保后端服务已启动并刷新页面。</p></div>`;
        }
    }
    
    init();
