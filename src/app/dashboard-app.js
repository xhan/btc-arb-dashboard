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
    let arbExpandedSections = new Set();
    const arbGlobalFilterStateRuntime = getArbPanelLayoutUtils().createGlobalArbFilterStateRuntime();
    const arbPanelHtmlRenderer = getDomRenderUtils().createStableHtmlRenderer();
    const arbPanelUpdateRuntime = getArbRuntimeMemoryUtils().createArbPanelUpdateRuntime({
        setTimer: setTimeout,
        clearTimer: clearTimeout,
        delayMs: ARB_PANEL_UPDATE_DELAY_MS,
        isVisible: () => getDashboardRuntimeUtils().isPanelVisible(arbPathWindow),
        update: updateArbPanel
    });
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
    const arbPanelCache = getArbPathTemplateCacheUtils().createArbPanelCache();
    let arbLastPointerOpenedOpportunityId = null;
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
    let arbDetailController = null;
    const FIXED_PATH_RULES = getPathAlertRuleDefinitionsUtils().FIXED_PATH_RULES;
    const SPECIAL_ARB_RULES = getPathAlertRuleDefinitionsUtils().SPECIAL_ARB_RULES;
    const GLOBAL_PATH_SOURCE_SELECTORS = [0, 1, 2, 3];
    const ARB_PATH_CONFIG = getArbPathConfig();
    const alertRuntimeController = getAlertRuntimeController().createAlertRuntimeController({
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
        scheduleArbPanelUpdate: () => arbPanelUpdateRuntime.schedule(),
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

    function buildMutedPathTargetKey(alertOrTarget) {
        return alertRuntimeController.buildMutedPathTargetKey(alertOrTarget);
    }

    function buildMutedPathLegKey(legOrEntry) {
        return alertRuntimeController.buildMutedPathLegKey(legOrEntry);
    }

    function invalidateArbRuleSnapshotCache(options = {}) {
        if (options.bumpRevision !== false) {
            quoteStateRuntime.bumpMarketRevision();
        }
        arbPanelCache.clearRuleSnapshot();
    }

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

    function getSharedArbRuleSnapshot() {
        const topologyCacheForFixed = getArbPathTopologyCache();
        const cacheKey = getDashboardRuntimeUtils().buildArbRuleSnapshotCacheKey(
            dashboardState,
            quoteStateRuntime.getMarketRevision()
        );
        const cachedSnapshot = arbPanelCache.getRuleSnapshot(cacheKey);
        if (cachedSnapshot) {
            return cachedSnapshot;
        }

        const aliasRules = getAliasRules();
        const allQuotes = getActiveQuotes(dashboardState.flatMap((category) => category.quotes || []));
        const arbPaths = getArbPaths();
        const nowMs = Date.now();
        alertRuntimeController.pruneMutedPathLegsInPlace(nowMs);
        const allEdges = getMutedPathLegUtils().filterMutedPathLegs(
            arbPaths.buildEdges(allQuotes, getQuoteMarketStateMap(), null),
            alertRuntimeController.getMutedPathLegs(),
            nowMs
        );
        const ruleEdges = arbPaths.buildRuleEdges(aliasRules);
        const allEdgesWithRules = allEdges.concat(ruleEdges);
        const quoteMetaById = buildQuoteMetaById();
        const quotesByCategoryName = getDashboardRuntimeUtils().buildQuotesByCategoryName(
            dashboardState,
            getActiveQuotes
        );
        const baseSnapshot = getArbRuleSnapshotUtils().buildArbRuleSnapshot({
            fixedRules: FIXED_PATH_RULES,
            specialRules: SPECIAL_ARB_RULES,
            allEdgesWithRules,
            fixedTemplatesByRuleId: topologyCacheForFixed && topologyCacheForFixed.fixedTemplatesByRuleId
                ? topologyCacheForFixed.fixedTemplatesByRuleId
                : null,
            quoteMetaById,
            quotesByCategoryName,
            quoteStateById: getQuoteMarketStateMap(),
            aliasRules,
            mutedPathLegs: alertRuntimeController.getMutedPathLegs(),
            mutedPathLegUtils: getMutedPathLegUtils(),
            preferredStartSymbols: buildPreferredCycleStartSymbols(aliasRules, 'cbBTC'),
            arbPathsApi: arbPaths,
            arbFixedUtils: getArbFixedUtils(),
            arbSpecialUtils: getArbSpecialUtils()
        });

        return arbPanelCache.setRuleSnapshot(cacheKey, {
            ...baseSnapshot,
            aliasRules,
            allQuotes,
            allEdges,
            ruleEdges,
            allEdgesWithRules,
            quoteMetaById,
            quotesByCategoryName
        });
    }

    function getArbPathTopologyCache() {
        const utils = getArbPathTemplateCacheUtils();

        const cacheKey = `${utils.buildArbPathTopologyCacheKey(dashboardState, getQuoteMarketStateMap())}|${arbCycleStartPriority.join(',')}`;
        const cachedTopology = arbPanelCache.getTopology(cacheKey);
        if (cachedTopology) {
            return cachedTopology;
        }

        const aliasRules = getAliasRules();
        const preferredCycleStartSymbols = buildPreferredCycleStartSymbols(aliasRules, 'cbBTC');
        const arbPaths = getArbPaths();
        const ruleEdges = arbPaths.buildRuleEdges(aliasRules);
        const quoteMetaById = buildQuoteMetaById();
        const allQuotes = getActiveQuotes(dashboardState.flatMap((category) => category.quotes || []));
        const allTopologyEdges = utils.buildTopologyEdges(allQuotes, getQuoteMarketStateMap(), null);
        const allTopologyEdgesWithRules = allTopologyEdges.concat(ruleEdges);
        const fixedTemplatesByRuleId = {};

        const globalSourceCategories = getArbPanelLayoutUtils().resolveItemsBySelectors(dashboardState, GLOBAL_PATH_SOURCE_SELECTORS);
        const globalSourceQuotes = getActiveQuotes(globalSourceCategories.flatMap((category) => Array.isArray(category && category.quotes) ? category.quotes : []));
        const globalEdges = utils.buildTopologyEdges(globalSourceQuotes, getQuoteMarketStateMap(), null);
        const globalTemplates = utils.buildCycleTemplates(globalEdges.concat(ruleEdges), {
            maxDepth: 3,
            limit: Number.MAX_SAFE_INTEGER,
            acceptCycle: arbPaths.isMeaningfulPath,
            preferredStartSymbols: preferredCycleStartSymbols
        });

        const arbFixedUtils = getArbFixedUtils();
        for (const rule of FIXED_PATH_RULES) {
            if (!rule) continue;
            const filteredEdges = arbFixedUtils.filterEdgesForFixedRule(rule, allTopologyEdgesWithRules, quoteMetaById);
            fixedTemplatesByRuleId[rule.id] = utils.buildFixedPathTemplates(filteredEdges, rule, aliasRules, {
                limit: Number(rule.resultLimit) || 1,
                preferredStartSymbols: preferredCycleStartSymbols
            });
        }

        return arbPanelCache.setTopology(cacheKey, {
            ruleEdges,
            globalTemplates,
            fixedTemplatesByRuleId
        });
    }

    function formatChainLabel(chain) {
        return getChainDefaults().getChainDisplayName(chain);
    }

    function normalizeChainKey(chain) {
        return getQuoteRequestUtils().normalizeChainKey(chain);
    }

    function buildArbPathLegLineOptions() {
        return {
            formatLegLine: (line) => getArbPaths().formatLegLine(line),
            formatChainLabel,
            formatCexBookValue: (value, maxDecimals) => getQuoteDisplayUtils().formatCexBookValue(value, maxDecimals)
        };
    }

    function formatArbPathLegLine(leg) {
        return getArbPanelLayoutUtils().buildArbPathLegLine(leg, buildArbPathLegLineOptions());
    }

    function isRuleLeg(leg) {
        return getArbDetailUtils().isArbRuleLeg(leg);
    }

    function formatDetailNumber(value, precision = 6) {
        return getArbDetailUtils().formatDetailNumber(value, precision);
    }

    function findQuoteById(quoteId) {
        return getDashboardRuntimeUtils().findDashboardQuoteMatchById(dashboardState, quoteId);
    }

    function buildPreferredCycleStartSymbols(aliasRules, canonicalSymbol = 'cbBTC') {
        const configuredPriority = Array.isArray(arbCycleStartPriority) && arbCycleStartPriority.length
            ? arbCycleStartPriority
            : [canonicalSymbol];
        return getArbCyclePriorityUtils().buildPreferredCycleStartSymbols(aliasRules, configuredPriority);
    }

    function getAliasRules() {
        return getArbEquivalenceUtils().buildAliasRulesFromGroups(
            getArbEquivalenceUtils().DEFAULT_ASSET_EQUIVALENCE_GROUPS
        );
    }

    function buildQuoteMetaById() {
        return getDashboardRuntimeUtils().buildQuoteMetaById(dashboardState);
    }

    function buildLiveQuoteLabel(chain, fromSymbol, toSymbol, suffix = '') {
        return getPathAlertPageUtils().buildPathAlertQuoteLabel({
            chain,
            fromSymbol,
            toSymbol,
            suffix,
            formatChainLabel
        });
    }

    function handleArbPathContentClick(event) {
        if (!arbPathContent) return;
        const action = getArbPanelRenderer().resolveArbPathContentClickAction(event, {
            closestEventTarget,
            containsElement: (element) => arbPathContent.contains(element)
        });
        if (action.type === 'toggle-section') {
            if (arbExpandedSections.has(action.sectionKey)) {
                arbExpandedSections.delete(action.sectionKey);
            } else {
                arbExpandedSections.add(action.sectionKey);
            }
            updateArbPanel();
            return;
        }
        if (action.type !== 'open-opportunity') return;
        if (arbLastPointerOpenedOpportunityId === action.opportunityId) {
            arbLastPointerOpenedOpportunityId = null;
            return;
        }
        openArbDetailModal(action.opportunityId);
    }

    function handleArbPathContentKeydown(event) {
        if (!arbPathContent) return;
        const action = getArbPanelRenderer().resolveArbPathContentKeydownAction(event, { closestEventTarget });
        if (action.type !== 'open-opportunity') return;
        event.preventDefault();
        openArbDetailModal(action.opportunityId);
    }

    function handleArbPathContentPointerDown(event) {
        if (!arbPathContent) return;
        const action = getArbPanelRenderer().resolveArbPathContentPointerDownAction(event, { closestEventTarget });
        if (action.type !== 'open-opportunity') return;
        arbLastPointerOpenedOpportunityId = action.opportunityId;
        openArbDetailModal(action.opportunityId);
    }

    function createArbOpportunityEntry(targetMap, highlightTargetMap, cycle, label, meta = {}) {
        if (!cycle) return null;
        const opportunityId = getArbDetailUtils().buildUniqueArbOpportunityId(
            new Set(targetMap.keys()),
            meta.section || '',
            label || '',
            cycle
        );
        const entry = getArbPanelLayoutUtils().buildArbOpportunityStoreEntry(opportunityId, cycle, label, meta);
        targetMap.set(opportunityId, entry);
        getArbPanelLayoutUtils().registerArbOpportunityHighlightTarget(
            highlightTargetMap,
            getArbPanelLayoutUtils().buildArbOpportunityHighlightTargetKeyFromCycle(cycle, {
                buildMutedPathTargetFromCycleLegs,
                buildTargetKey: buildMutedPathTargetKey
            }),
            opportunityId
        );

        return getArbPanelLayoutUtils().buildArbOpportunityDisplayEntry(opportunityId, cycle, label, meta, {
            isAlertHighlighted: arbOpportunityHighlightRuntime.isHighlighted(opportunityId),
        });
    }

    function refreshArbOpportunityRuntime(nextOpportunityMap, nextOpportunityIdsByTargetKey) {
        const retainedEntries = arbDetailController.getRetainedOpportunities(
            (opportunityId) => arbOpportunityRuntime.getOpportunity(opportunityId)
        );

        arbOpportunityRuntime.setPanelOpportunities(nextOpportunityMap, nextOpportunityIdsByTargetKey, retainedEntries);
    }

    function buildMutedPathTargetFromCycleLegs(legs) {
        return alertRuntimeController.buildMutedPathTargetFromCycleLegs(legs);
    }

    function applyFloatingPanelDisplay(panel, action, options = {}) {
        const result = getDomRenderUtils().applyFloatingPanelDisplayState(panel, action, {
            getComputedStyle: (element) => window.getComputedStyle(element),
            displayValue: options.displayValue
        });
        if (!result.panelFound) return result;
        if (result.shouldBringToFront) {
            floatingPanelZIndexRuntime.bringToFront(panel);
        }
        if (result.shouldRender && typeof options.render === 'function') {
            options.render(result);
        }
        if (typeof options.afterApply === 'function') {
            options.afterApply(result);
        }
        return result;
    }

    function buildQuotePriceWatchSection() {
        return getArbPanelLayoutUtils().buildQuotePriceWatchSection({
            watchItems: getArbPathConfigUtils().getQuotePriceWatchItems(ARB_PATH_CONFIG),
            findQuote: (item) => getDashboardRuntimeUtils().findDashboardQuoteById(dashboardState, item.quoteId),
            getQuoteState: (quote) => getQuoteMarketState(Number(quote.id)) || {},
            resolveValue: (item, state) => getArbPathConfigUtils().resolveQuotePriceValue(item, state),
            isQuotePaused,
            buildPairLabel: (quote, state, item) => buildQuoteAlertDisplayLabel(quote, state, item.direction),
            formatChainLabel,
            formatPrice: (value) => String(formatDetailNumber(value, 8))
        });
    }

    function buildFixedArbSections(sharedRuleSnapshot, nextOpportunityMap, nextOpportunityIdsByTargetKey) {
        return getArbPanelLayoutUtils().buildFixedArbSections({
            fixedResults: sharedRuleSnapshot.fixedResults,
            getDisplayMinProfitBp: (rule) => getArbPanelLayoutUtils().normalizeDisplayMinProfitBp(
                rule && rule.displayMinProfitBp,
                getArbPanelLayoutUtils().resolveDefaultDisplayMinProfitBp(getPathAlertRuleDefinitionsUtils())
            ),
            buildEntry: (cycle, index, items, rule) => createArbOpportunityEntry(
                nextOpportunityMap,
                nextOpportunityIdsByTargetKey,
                cycle,
                items.length > 1 ? `机会 ${index + 1}` : '',
                { section: `fixed:${rule?.id || ''}`, alertPreset: { type: 'path' } }
            )
        });
    }

    function buildSpecialArbSections(sharedRuleSnapshot, nextOpportunityMap, nextOpportunityIdsByTargetKey) {
        return getArbPanelLayoutUtils().buildSpecialArbSections({
            specialResults: sharedRuleSnapshot.specialResults,
            specialRules: SPECIAL_ARB_RULES,
            buildEntry: (opportunity) => createArbOpportunityEntry(
                nextOpportunityMap,
                nextOpportunityIdsByTargetKey,
                opportunity.cycle,
                opportunity.label,
                {
                    section: 'special',
                    entryType: 'special-rule',
                    clickable: false,
                    displayMessage: String(opportunity.display_message || ''),
                    hideLegs: true,
                    alertPreset: {
                        type: 'rule',
                        ruleKind: 'special',
                        ruleId: opportunity.ruleId
                    }
                }
            )
        });
    }

    function buildGlobalArbSection(topologyCache, templateUtils, nextOpportunityMap, nextOpportunityIdsByTargetKey) {
        const globalSectionKey = 'global:all';
        const nowMs = Date.now();
        alertRuntimeController.pruneMutedPathLegsInPlace(nowMs);
        const globalCycles = getMutedPathLegUtils().filterMutedCycles(
            topologyCache.globalTemplates
                .map((template) => templateUtils.evaluateCycleTemplate(template, getQuoteMarketStateMap()))
                .filter(Boolean)
                .sort((left, right) => Number(right.profitRate) - Number(left.profitRate)),
            alertRuntimeController.getMutedPathLegs(),
            nowMs
        );
        const layoutUtils = getArbPanelLayoutUtils();
        const filterState = arbGlobalFilterStateRuntime.get();
        const filterCriteria = layoutUtils.buildGlobalArbFilterCriteria(filterState, {
            normalizeChainFilterToken: (chainToken) => getChainDefaults().normalizeChainFilterToken(chainToken)
        });
        layoutUtils.applyGlobalArbFilterWritePlan(
            arbGlobalFilterElements,
            layoutUtils.buildGlobalArbFilterWritePlan(filterState)
        );
        return layoutUtils.buildGlobalArbSection({
            sectionKey: globalSectionKey,
            cycles: globalCycles,
            ...filterCriteria,
            expanded: arbExpandedSections.has(globalSectionKey),
            isRuleLeg,
            buildEntry: (cycle, index) => createArbOpportunityEntry(
                nextOpportunityMap,
                nextOpportunityIdsByTargetKey,
                cycle,
                `机会 ${index + 1}`,
                { section: '全局路径', alertPreset: { type: 'path' } }
            ),
            buildFooterHtml: (cycleDisplayState) => {
                if (!cycleDisplayState || !cycleDisplayState.canToggleExpand) return '';
                return getArbPanelRenderer().renderArbSectionToggleHtml(globalSectionKey, {
                    ...cycleDisplayState,
                    displayMinProfitBp: layoutUtils.normalizeDisplayMinProfitBp(cycleDisplayState.displayMinProfitBp)
                });
            }
        });
    }

    function buildArbPanelData() {
        const targetNames = ['WBTC监控', 'LBTC监控', 'TBTC监控'];
        const targetCategories = dashboardState.filter(c => targetNames.includes(c.name));
        if (!targetCategories.length) {
            return { error: '暂无可用路径' };
        }

        const sharedRuleSnapshot = getSharedArbRuleSnapshot();
        const topologyCache = getArbPathTopologyCache();
        const templateUtils = getArbPathTemplateCacheUtils();
        const nextOpportunityMap = new Map();
        const nextOpportunityIdsByTargetKey = new Map();

        const fixedSections = buildFixedArbSections(sharedRuleSnapshot, nextOpportunityMap, nextOpportunityIdsByTargetKey);
        const specialSections = buildSpecialArbSections(sharedRuleSnapshot, nextOpportunityMap, nextOpportunityIdsByTargetKey);
        const globalSection = buildGlobalArbSection(
            topologyCache,
            templateUtils,
            nextOpportunityMap,
            nextOpportunityIdsByTargetKey
        );
        const columns = getArbPanelLayoutUtils().buildArbPanelColumns({
            fixedSections,
            specialSections,
            quoteSection: buildQuotePriceWatchSection(),
            globalSection
        });

        return {
            columns,
            nextOpportunityMap,
            nextOpportunityIdsByTargetKey
        };
    }

    function updateArbPanel(options = {}) {
        if (!arbPathContent) return;
        if (!options.force && !getDashboardRuntimeUtils().isPanelVisible(arbPathWindow)) {
            arbPanelUpdateRuntime.markDirty();
            return;
        }
        arbPanelUpdateRuntime.clearDirty();

        const panelData = buildArbPanelData();
        if (panelData.error) {
            arbPanelHtmlRenderer.reset();
            getArbPanelRenderer().applyArbPanelErrorText(arbPathContent, panelData.error);
            return;
        }

        const { columns, nextOpportunityMap, nextOpportunityIdsByTargetKey } = panelData;

        refreshArbOpportunityRuntime(nextOpportunityMap, nextOpportunityIdsByTargetKey);

        const arbPaths = getArbPaths();
        const nextArbPanelHtml = getArbPanelRenderer().renderArbGrid({
            columns,
            isMeaningfulPath: cycle => cycle && arbPaths.isMeaningfulPath(cycle.legs),
            shouldIncludeLeg: leg => !isRuleLeg(leg),
            formatChainLabel,
            formatLegLine: formatArbPathLegLine,
            formatProfit: profitRate => arbPaths.formatProfitWanfen(profitRate)
        });
        arbPanelHtmlRenderer.render(arbPathContent, nextArbPanelHtml);
    }

    function closestEventTarget(event, selector) {
        return getDomRenderUtils().closestEventTarget(event, selector);
    }

    function toggleArbPanel() {
        applyFloatingPanelDisplay(arbPathWindow, 'toggle', {
            render: () => {
                if (arbPanelUpdateRuntime.isDirty()) {
                    updateArbPanel({ force: true });
                }
            }
        });
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

    function setArbPanelMaxHeight() {
        getDomRenderUtils().applyFloatingPanelViewportHeight(arbPathWindow, window.innerHeight, { minHeight: 200 });
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
        arbPanelCache.clearTopology();
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
        syncKyberOnlyDirectPoolsControl,
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
        syncKyberOnlyDirectPoolsControl,
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
            if (arbPathContent) {
                arbPathContent.addEventListener('pointerdown', handleArbPathContentPointerDown);
                arbPathContent.addEventListener('click', handleArbPathContentClick);
                arbPathContent.addEventListener('keydown', handleArbPathContentKeydown);
            }
            arbDetailController.bindGridEvents();
            arbDetailController.bindChromeEvents();
            getArbPanelLayoutUtils().bindGlobalArbFilterEvents({
                excludedSymbolsInput: arbGlobalFilterInput,
                excludedChainsInput: arbGlobalChainFilterInput,
                includedSymbolsInput: arbGlobalIncludeFilterInput,
                twoLegOnlyInput: arbGlobalTwoLegOnlyInput,
                clearButton: arbGlobalFilterClearBtn,
                header: arbPathHeader
            }, {
                onPatch: (patch) => {
                    const result = arbGlobalFilterStateRuntime.update(patch);
                    if (!result.changed) return false;
                    updateArbPanel();
                    return true;
                },
                onClear: () => {
                    const result = arbGlobalFilterStateRuntime.clear();
                    if (!result.changed) return;
                    updateArbPanel();
                    if (arbGlobalFilterInput) {
                        arbGlobalFilterInput.focus();
                    }
                },
                getActiveElement: () => document.activeElement,
                closestEventTarget
            });
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
