    const BACKEND_URL = `${location.protocol}//${location.hostname}:3000`;
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
    let pathAlertConfig = getPathAlertUtils().normalizeAlertConfig();
    const pathAlertConfigClient = getPathAlertUtils().createPathAlertConfigClient({
        fetch,
        url: `${BACKEND_URL}/api/get-alert-config`,
        logWarning(error) {
            console.warn('加载路径报警配置失败:', error);
        }
    });
    const alertSettingsHtmlRenderer = getDomRenderUtils().createStableHtmlRenderer();
    const pathAlertRuntimeState = getPathAlertUtils().createPathAlertRuntimeState();
    const pathAlertSchedulerRuntime = getPathAlertUtils().createPathAlertSchedulerRuntime({
        setInterval,
        clearInterval,
        setTimeout,
        clearTimeout
    });
    const mutedAlertStateHtmlRenderer = getDomRenderUtils().createStableHtmlRenderer();
    let pathAlertReloading = false;
    const alertLogTabRuntime = getAlertLogUiUtils().createAlertLogTabRuntime();
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
        isVisible: isArbPanelVisible,
        update: updateArbPanel
    });
    let quoteDisplayMode = DEFAULT_QUOTE_DISPLAY_MODE;
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
    let dataTerminalState = {
        visible: false,
        query: '',
        allowAliases: true,
        showDiff: false,
        selectedLeftKey: '',
        selectedRightKey: '',
        domRefs: null,
        htmlRenderer: getDomRenderUtils().createStableHtmlRenderer()
    };
    const arbPanelCache = getArbPathTemplateCacheUtils().createArbPanelCache();
    let arbLastPointerOpenedOpportunityId = null;
    let arbDetailState = getArbDetailUtils().buildDefaultArbDetailState();
    let arbDetailFetchController = null;
    const arbDetailSourceBudgetRuntime = getArbDetailUtils().createArbDetailSourceBudgetRuntime();
    let arbDetailChartPreviewCharts = [];
    let arbDetailChartPreviewRunId = 0;
    const arbDetailRefreshScheduler = getArbDetailRefreshUtils().createArbDetailRefreshScheduler({
        intervalMs: ARB_DETAIL_REFRESH_INTERVAL_MS,
        isActive: isArbDetailRefreshActive,
        isRefreshing: () => arbDetailState.isRefreshing,
        setRefreshing: setArbDetailRefreshing,
        refresh: refreshArbDetailCards,
        logError: logArbDetailRefreshError
    });
    const arbDetailChartAutoRefreshRuntime = getArbDetailRefreshUtils().createArbDetailChartAutoRefreshRuntime({
        intervalMs: CHART_AUTO_REFRESH_INTERVAL_MS,
        isVisible: () => arbDetailState.visible,
        isEnabled: () => Boolean(arbDetailChartAutoRefreshToggle && arbDetailChartAutoRefreshToggle.checked),
        refresh: () => {
            void syncArbDetailChartPreview(arbDetailState.selectedOpportunity, {
                forceReload: true
            });
        }
    });
    const quoteHoverRuntime = getQuoteDisplayUtils().createQuoteHoverRuntime({
        setTimeout,
        clearTimeout,
        delayMs: 100
    });

    const MAX_ALERT_LOG_ENTRIES = 300;
    const PATH_ALERT_MUTE_EXTEND_DURATION_MS = getPathAlertUtils().PATH_ALERT_MUTE_EXTEND_DURATION_MS || (2 * 60 * 60 * 1000);
    const PATH_ALERT_MUTE_DURATION_MS = Number(getPathAlertUtils().PATH_ALERT_MUTE_DURATION_MS) || (60 * 60 * 1000);
    const MUTED_PATH_LEG_EXTEND_DURATION_MS = 2 * 60 * 60 * 1000;
    const alertDebugController = getAlertDebugUtils().createAlertDebugController({
        logger(message) {
            console.info(message);
        }
    });
    window.enableAlertDebug = function (enabled) {
        return alertDebugController.enable(enabled === true);
    };

    const dashboardEl = document.getElementById('dashboard');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const alertLogWindow = document.getElementById('alert-log-window');
    const alertLogHeader = document.getElementById('alert-log-header');
    const alertLogMinBtn = document.getElementById('alert-log-min-btn');
    const alertLogLogTab = document.getElementById('alert-log-log-tab');
    const alertLogMutedLogTab = document.getElementById('alert-log-muted-log-tab');
    const alertLogMutedTab = document.getElementById('alert-log-muted-tab');
    const alertLogSettingsTab = document.getElementById('alert-log-settings-tab');
    const alertLogContent = document.getElementById('alert-log-content');
    const alertLogMutedLogContent = document.getElementById('alert-log-muted-log-content');
    const alertLogMutedContent = document.getElementById('alert-log-muted-content');
    const alertLogSettingsContent = document.getElementById('alert-log-settings-content');
    const alertLogCardInsertionRuntime = getAlertLogUiUtils().createAlertLogCardInsertionRuntime({
        getActiveContainer: () => alertLogContent,
        getMutedContainer: () => alertLogMutedLogContent,
        selectorOptions: {
            escapeCssAttributeValue: (value) => getDomRenderUtils().escapeCssAttributeValue(value)
        },
        maxEntries: MAX_ALERT_LOG_ENTRIES,
        trimContainer: (container, maxEntries) => getArbRuntimeMemoryUtils().trimContainerChildren(container, maxEntries),
        afterInsert: (nowMs) => {
            updateMutedPathAlertLogCards('', nowMs);
            syncMutedPathLogTimer();
        }
    });
    const mutedPathStorageRuntime = getMutedPathStorageUtils().createMutedPathStorageRuntime({
        getStorage: getDashboardLocalStorage,
        getMutedPathLegUtils,
        onTargetsLoadError: (error) => console.warn('读取沉默报警本地缓存失败:', error),
        onLegsLoadError: (error) => console.warn('读取屏蔽腿本地缓存失败:', error),
        onTargetsPersistError: (error) => console.warn('保存沉默报警本地缓存失败:', error),
        onLegsPersistError: (error) => console.warn('保存屏蔽腿本地缓存失败:', error)
    });
    const pathAlertSound = document.getElementById('path-alert-sound');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeRuntime = getThemeUtils().createThemeRuntime({
        body: document.body,
        button: themeToggleBtn,
        getStorage: getDashboardLocalStorage,
        onLoadError: (error) => console.warn('读取主题本地缓存失败:', error)
    });
    const audioNoticeEl = document.getElementById('audio-notice');
    const alertAudioRuntime = getAudioUtils().createAudioUnlockRuntime({
        audioElements: [pathAlertSound],
        noticeEl: audioNoticeEl,
        logWarning: (...args) => console.warn(...args),
        onUnlocked: updateAlertSoundState
    });
    const alertModal = document.getElementById('alert-modal');
    const modalSwapQuoteBtn = document.getElementById('modal-swap-quote');
    const modalDeleteQuoteBtn = document.getElementById('modal-delete-quote');
    const modalTitleEl = document.getElementById('modal-title');
    const modalSubtitleEl = document.getElementById('modal-subtitle');
    const quoteTokenAddressesEl = document.getElementById('quote-token-addresses');
    const quoteFromTokenLineEl = document.getElementById('quote-from-token-line');
    const quoteToTokenLineEl = document.getElementById('quote-to-token-line');
    const quoteSourceSelect = document.getElementById('quote-source-pref');
    const quoteSourceGroup = document.getElementById('source-select-group');
    const kyberDirectPoolsGroup = document.getElementById('kyber-direct-pools-group');
    const kyberDirectPoolsNote = document.getElementById('kyber-direct-pools-note');
    const kyberOnlyDirectPoolsInput = document.getElementById('kyber-only-direct-pools');
    const inverseToggleGroup = document.getElementById('inverse-toggle-group');
    const inverseCheckbox = document.getElementById('show-inverse-quote');
    
    const manualSaveBtn = document.getElementById('manual-save-btn');
    const manualSaveText = document.getElementById('manual-save-text');
    const quoteRunStateTag = document.getElementById('quote-run-state-tag');

    const settingsBtn = document.getElementById('global-settings-btn');
    const settingsSaveBtn = document.getElementById('settings-save');
    const settingsCancelBtn = document.getElementById('settings-cancel');
    const settingsModal = document.getElementById('settings-modal');
    const settingsIntervalInputRefs = {
        'setting-kyber-interval': document.getElementById('setting-kyber-interval'),
        'setting-zerox-interval': document.getElementById('setting-zerox-interval'),
        'setting-velora-interval': document.getElementById('setting-velora-interval'),
        'setting-lifi-interval': document.getElementById('setting-lifi-interval'),
        'setting-bybit-interval': document.getElementById('setting-bybit-interval'),
        'setting-binance-interval': document.getElementById('setting-binance-interval'),
        'setting-solana-interval': document.getElementById('setting-solana-interval'),
        'setting-sui-interval': document.getElementById('setting-sui-interval'),
        'setting-starknet-interval': document.getElementById('setting-starknet-interval')
    };
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
    
    const addQuoteModal = document.getElementById('add-quote-modal');
    const addQuoteChainSelect = document.getElementById('add-quote-chain');
    const addQuoteToChainSelect = document.getElementById('add-quote-to-chain');
    const addQuoteToChainGroup = document.getElementById('add-quote-to-chain-group');
    const addQuotePairFields = document.getElementById('add-quote-pair-fields');
    const addQuoteSymbolField = document.getElementById('add-quote-symbol-field');
    const addQuoteFromInput = document.getElementById('add-quote-from');
    const addQuoteToInput = document.getElementById('add-quote-to');
    const addQuoteSymbolInput = document.getElementById('add-quote-symbol');
    const addQuoteSaveBtn = document.getElementById('add-quote-save');
    const addQuoteModalRefs = {
        modal: addQuoteModal,
        chainSelect: addQuoteChainSelect,
        toChainSelect: addQuoteToChainSelect,
        fromInput: addQuoteFromInput,
        toInput: addQuoteToInput,
        symbolInput: addQuoteSymbolInput,
        toChainGroup: addQuoteToChainGroup,
        pairFields: addQuotePairFields,
        symbolField: addQuoteSymbolField,
        saveButton: addQuoteSaveBtn
    };
    const addQuoteModalSelectionRuntime = getDashboardModalUtils().createModalSelectionRuntime();
    const quoteSettingsSelectionRuntime = getDashboardModalUtils().createModalSelectionRuntime();
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessageEl = document.getElementById('confirm-message');
    const confirmOkBtn = document.getElementById('confirm-ok');
    const confirmCancelBtn = document.getElementById('confirm-cancel');
    const addCategoryModal = document.getElementById('add-category-modal');
    const addCategoryNameInput = document.getElementById('add-category-name');
    const addCategoryModalRefs = {
        modal: addCategoryModal,
        'add-category-name': addCategoryNameInput
    };
    const confirmModalRefs = {
        modal: confirmModal,
        message: confirmMessageEl
    };
    const confirmActionRuntime = getDashboardModalUtils().createConfirmActionRuntime();
    const globalTooltip = document.getElementById('global-tooltip');
    const copyToast = document.getElementById('copy-toast');
    const arbPathWindow = document.getElementById('arb-path-window');
    const arbPathContent = document.getElementById('arb-path-content');
    const arbGlobalFilterInput = document.getElementById('arb-global-filter-input');
    const arbGlobalChainFilterInput = document.getElementById('arb-global-chain-filter-input');
    const arbGlobalIncludeFilterInput = document.getElementById('arb-global-include-filter-input');
    const arbGlobalTwoLegOnlyInput = document.getElementById('arb-global-two-leg-only');
    const arbGlobalFilterClearBtn = document.getElementById('arb-global-filter-clear-btn');
    const arbGlobalFilterElements = {
        'arb-global-filter-input': arbGlobalFilterInput,
        'arb-global-chain-filter-input': arbGlobalChainFilterInput,
        'arb-global-include-filter-input': arbGlobalIncludeFilterInput,
        'arb-global-two-leg-only': arbGlobalTwoLegOnlyInput,
        'arb-global-filter-clear-btn': arbGlobalFilterClearBtn
    };
    const arbPathHeader = document.getElementById('arb-path-header');
    const arbPathMinBtn = document.getElementById('arb-path-min-btn');
    const toggleQuoteDisplayBtn = document.getElementById('toggle-quote-display-btn');
    const toggleDataTerminalBtn = document.getElementById('toggle-data-terminal-btn');
    const toggleArbBtn = document.getElementById('toggle-arb-btn');
    const toggleAlertLogBtn = document.getElementById('toggle-alert-log-btn');
    const toggleMultiChannelBtn = document.getElementById('toggle-multi-channel-btn');
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
    const arbDetailModal = document.getElementById('arb-detail-modal');
    const arbDetailCloseBtn = document.getElementById('arb-detail-close-btn');
    const arbDetailChartLink = document.getElementById('arb-detail-chart-link');
    const arbDetailChartAutoRefreshToggle = document.getElementById('arb-detail-chart-auto-refresh');
    const arbDetailSubtitle = document.getElementById('arb-detail-subtitle');
    const arbDetailChartPreview = document.getElementById('arb-detail-chart-preview');
    const arbDetailProfitPreview = document.getElementById('arb-detail-profit-preview');
    const arbDetailGrid = document.getElementById('arb-detail-grid');
    const requestChannelSelectGroup = document.getElementById('request-channel-select-group');
    const quoteRequestChannelSelect = document.getElementById('quote-request-channel');
    const quoteSettingsModalElements = {
        'modal-title': modalTitleEl,
        'modal-subtitle': modalSubtitleEl,
        'quote-token-addresses': quoteTokenAddressesEl,
        'quote-from-token-line': quoteFromTokenLineEl,
        'quote-to-token-line': quoteToTokenLineEl,
        'source-select-group': quoteSourceGroup,
        'quote-source-pref': quoteSourceSelect,
        'kyber-direct-pools-group': kyberDirectPoolsGroup,
        'kyber-direct-pools-note': kyberDirectPoolsNote,
        'kyber-only-direct-pools': kyberOnlyDirectPoolsInput,
        'inverse-toggle-group': inverseToggleGroup,
        'show-inverse-quote': inverseCheckbox,
        'modal-swap-quote': modalSwapQuoteBtn,
        'modal-delete-quote': modalDeleteQuoteBtn,
        'request-channel-select-group': requestChannelSelectGroup,
        'quote-request-channel': quoteRequestChannelSelect
    };
    const copyToastRuntime = getCopyUtils().createCopyToastRuntime({
        setTimeout,
        clearTimeout
    });

    function getWindowModule(globalName, missingMessage) {
        const loadedModule = window[globalName];
        if (!loadedModule) {
            throw new Error(missingMessage);
        }
        return loadedModule;
    }

    function getChainDefaults() {
        return getWindowModule('ChainDefaults', 'ChainDefaults is not loaded');
    }

    function getPathAlertUtils() {
        return getWindowModule('PathAlertUtils', 'PathAlertUtils is not loaded');
    }

    function getMutedPathLegUtils() {
        return getWindowModule('MutedPathLegUtils', 'MutedPathLegUtils is not loaded');
    }

    function getMutedPathRuntimeUtils() {
        return getWindowModule('MutedPathRuntimeUtils', 'MutedPathRuntimeUtils is not loaded');
    }

    function getMutedPathStorageUtils() {
        return getWindowModule('MutedPathStorageUtils', 'MutedPathStorageUtils is not loaded');
    }

    function getArbRuntimeMemoryUtils() {
        return getWindowModule('ArbRuntimeMemoryUtils', 'ArbRuntimeMemoryUtils is not loaded');
    }

    function getArbPanelLayoutUtils() {
        return getWindowModule('ArbPanelLayoutUtils', 'ArbPanelLayoutUtils is not loaded');
    }

    function getPathAlertRuleDefinitionsUtils() {
        return getWindowModule('PathAlertRuleDefinitions', 'PathAlertRuleDefinitions is not loaded');
    }

    function getArbRuleSnapshotUtils() {
        return getWindowModule('ArbRuleSnapshotUtils', 'ArbRuleSnapshotUtils is not loaded');
    }

    function getArbFixedUtils() {
        return getWindowModule('ArbFixedUtils', 'ArbFixedUtils is not loaded');
    }

    function getArbSpecialUtils() {
        return getWindowModule('ArbSpecialUtils', 'ArbSpecialUtils is not loaded');
    }

    function getArbCyclePriorityUtils() {
        return getWindowModule('ArbCyclePriorityUtils', 'ArbCyclePriorityUtils is not loaded');
    }

    function getArbEquivalenceUtils() {
        return getWindowModule('ArbEquivalenceUtils', 'ArbEquivalenceUtils is not loaded');
    }

    function getPriceSnapshotPayloadUtils() {
        return getWindowModule('PriceSnapshotPayloadUtils', 'PriceSnapshotPayloadUtils is not loaded');
    }

    function getDashboardApiUtils() {
        return getWindowModule('DashboardApiUtils', 'DashboardApiUtils is not loaded');
    }

    function getDashboardModalUtils() {
        return getWindowModule('DashboardModalUtils', 'DashboardModalUtils is not loaded');
    }

    function getAlertLogUiUtils() {
        return getWindowModule('AlertLogUiUtils', 'AlertLogUiUtils is not loaded');
    }

    function getSpecialRuleAlertConfigUtils() {
        return getWindowModule('SpecialRuleAlertConfigUtils', 'SpecialRuleAlertConfigUtils is not loaded');
    }

    function getArbPathConfigUtils() {
        return getWindowModule('ArbPathConfigUtils', 'ArbPathConfigUtils is not loaded');
    }

    function getArbPaths() {
        return getWindowModule('ArbPaths', 'ArbPaths is not loaded');
    }

    function getArbPanelRenderer() {
        return getWindowModule('ArbPanelRenderer', 'ArbPanelRenderer is not loaded');
    }

    function getArbPathConfig() {
        return getWindowModule('ArbPathConfig', 'ArbPathConfig is not loaded');
    }

    function getDomRenderUtils() {
        return getWindowModule('DomRenderUtils', 'DomRenderUtils is not loaded');
    }

    function getAudioUtils() {
        return getWindowModule('AudioUtils', 'AudioUtils is not loaded');
    }

    function getThemeUtils() {
        return getWindowModule('ThemeUtils', 'ThemeUtils is not loaded');
    }

    function getKeyboardShortcutUtils() {
        return getWindowModule('KeyboardShortcutUtils', 'KeyboardShortcutUtils is not loaded');
    }

    function getArbDetailRefreshUtils() {
        return getWindowModule('ArbDetailRefreshUtils', 'ArbDetailRefreshUtils is not loaded');
    }

    function getAlertDebugUtils() {
        return getWindowModule('AlertDebugUtils', 'AlertDebugUtils is not loaded');
    }

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

    function getQuotePauseUtils() {
        return getWindowModule('QuotePauseUtils', 'QuotePauseUtils is not loaded');
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

    function getRequestChannelUtils() {
        return getWindowModule('RequestChannelUtils', 'RequestChannelUtils is not loaded');
    }

    function getQueueStatsUtils() {
        return getWindowModule('QueueStatsUtils', 'QueueStatsUtils is not loaded');
    }

    function getQuoteQueueRuntimeUtils() {
        return getWindowModule('QuoteQueueRuntimeUtils', 'QuoteQueueRuntimeUtils is not loaded');
    }

    function getQuoteStateRuntimeUtils() {
        return getWindowModule('QuoteStateRuntimeUtils', 'QuoteStateRuntimeUtils is not loaded');
    }

    const quoteStateRuntime = getQuoteStateRuntimeUtils().createQuoteStateRuntime({
        dashboardRuntimeUtils: getDashboardRuntimeUtils()
    });
    const dataTerminalCache = getDataTerminalUtils().createDataTerminalCache();
    const dataTerminalUpdateRuntime = getDataTerminalUtils().createDataTerminalUpdateRuntime({
        setTimeout,
        clearTimeout,
        delayMs: DATA_TERMINAL_UPDATE_DELAY_MS,
        canUpdate: () => dataTerminalState.visible && dataTerminalState.domRefs && hasDataTerminalActiveQuery(),
        update: renderDataTerminalPanel
    });
    const mutedPathRuntime = getMutedPathRuntimeUtils().createMutedPathRuntime({
        pruneTargets: (entries, nowMs) => getPathAlertUtils().pruneExpiredMutedPathTargets(entries, nowMs),
        pruneLegs: (entries, nowMs) => getMutedPathLegUtils().pruneExpiredMutedPathLegs(entries, nowMs),
        resolveRefreshDelay: ({ mutedPathTargets, mutedPathLegs, nowMs }) => getDashboardRuntimeUtils().resolveMutedStateRefreshDelay({
            mutedPathTargets,
            mutedPathLegs,
            nowMs,
            visible: isAlertLogPanelVisible(),
            visibleRefreshMs: MUTED_STATE_VISIBLE_REFRESH_MS,
            hiddenMaxRefreshMs: MUTED_STATE_HIDDEN_MAX_REFRESH_MS
        }),
        clearTimeout,
        setTimeout,
        now: () => Date.now()
    });

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
        isSchedulerPaused: () => arbDetailState.pausedDashboard,
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
            abortQuoteFetch(quote.id);
        }
        applyActiveQuoteUiState(quote, {
            text: options.text || '排队中...',
            loading: options.loading !== false,
            clearInverse: options.clearInverse !== false
        });
        addToQueue(quote);
        if (options.updateSchedulers !== false) {
            updateSchedulers();
        }
        return true;
    }

    function rebuildQueuesForMultiChannelToggle(previousEnabled, nextEnabled) {
        let touched = false;
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
                touched = true;
            });
        });

        if (!touched) {
            updateSchedulers();
            return;
        }
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
    
    function updateAlertSoundState() {
        if (!alertAudioRuntime.isUnlocked()) return;
        getAudioUtils().syncLoopingAudio(
            pathAlertSound,
            getDashboardRuntimeUtils().hasActivePathAlertSound(pathAlertRuntimeState.getState()),
            { logPlayError: (error) => console.error('Play failed', error) }
        );
    }

    function buildQuoteAlertTriggeredEntry(alert, quote, evaluation) {
        let dexLink = null;
        if (quote && !isCrossChainQuote(quote)) {
            dexLink = getArbDetailUtils().buildArbDetailDexLink({
                chain: quote.chain,
                fromTokenAddress: quote.fromToken,
                toTokenAddress: quote.toToken,
                inputAmount: quote.amount
            });
        }

        return getPathAlertNotificationUtils().buildQuoteAlertTriggeredEntryForQuote({
            alert,
            quote,
            state: quote && quote.id != null ? getQuoteMarketState(quote.id) || {} : {},
            displayName: getQuoteChainDisplayName(quote),
            evaluation,
            formatNumber: formatDetailNumber,
            dexLink,
            buildQuoteAlertDisplayLabel
        });
    }

    function isArbOpportunityHighlighted(opportunityId, nowMs = Date.now()) {
        return arbOpportunityHighlightRuntime.isHighlighted(opportunityId, nowMs);
    }

    function buildArbOpportunityHighlightTargetKeyFromCycle(cycle) {
        if (!cycle || !Array.isArray(cycle.legs)) return '';
        const candidate = buildMutedPathTargetFromCycleLegs(cycle.legs);
        return candidate ? buildMutedPathTargetKey(candidate) : '';
    }

    function buildTriggeredArbOpportunityHighlightTargetKey(alert, evaluation) {
        if (!alert || !alert.target || alert.target.type === 'quote') return '';
        if (alert.target.type === 'path') {
            return buildMutedPathTargetKey(alert);
        }
        return buildArbOpportunityHighlightTargetKeyFromCycle(evaluation && evaluation.cycle);
    }

    function registerArbOpportunityHighlightTarget(nextTargetMap, targetKey, opportunityId) {
        getArbPanelLayoutUtils().registerArbOpportunityHighlightTarget(nextTargetMap, targetKey, opportunityId);
    }

    function markTriggeredArbOpportunities(alert, evaluation, nowMs = Date.now()) {
        const targetKey = buildTriggeredArbOpportunityHighlightTargetKey(alert, evaluation);
        if (!targetKey) return false;
        const opportunityIds = arbOpportunityRuntime.getOpportunityIdsForTarget(targetKey);
        if (!Array.isArray(opportunityIds) || !opportunityIds.length) return false;

        return arbOpportunityHighlightRuntime.mark(opportunityIds, nowMs);
    }

    function appendQuoteAlertLogEntry(entry, nowMs = Date.now()) {
        if (!alertLogWindow || !alertLogContent) return;
        const appendPlan = getAlertLogUiUtils().buildAlertLogAppendPlan([entry]);
        if (!appendPlan.entries.length) return;
        if (appendPlan.shouldAutoOpen) {
            applyAlertLogPanelDisplay('open');
        }
        const logEntry = appendPlan.entries[0];
        const mutedEntry = logEntry && logEntry.mutedTargetCandidate
            ? getMutedPathTargetEntry(logEntry.mutedTargetCandidate, nowMs)
            : null;
        const card = getDomRenderUtils().createElementFromHtml(
            getAlertLogUiUtils().buildQuoteAlertLogHtml(logEntry, {
                nowMs,
                mutedEntry,
                targetKey: logEntry && logEntry.mutedTargetCandidate ? buildMutedPathTargetKey(logEntry.mutedTargetCandidate) : '',
                statusText: mutedEntry ? getPathAlertUtils().buildMutedPathStatusText(mutedEntry, nowMs) : '已触发'
            })
        );
        if (!card) return;
        const destination = alertLogCardInsertionRuntime.prepend(logEntry, card);
        alertLogCardInsertionRuntime.finalize([destination], nowMs);
    }

    function pruneMutedPathTargetsInPlace(nowMs = Date.now()) {
        return mutedPathRuntime.pruneTargets(nowMs);
    }

    function getMutedPathTargetEntry(alertOrTarget, nowMs = Date.now()) {
        pruneMutedPathTargetsInPlace(nowMs);
        return getPathAlertUtils().findMutedPathAlert(mutedPathRuntime.getTargets(), alertOrTarget, nowMs);
    }

    function buildMutedPathTargetKey(alertOrTarget) {
        return getPathAlertUtils().buildMutedPathTargetKey(alertOrTarget);
    }

    function buildMutedPathLegTitleSnapshot(leg) {
        return buildLiveQuoteLabel(
            leg && leg.chain,
            leg && (leg.fromSymbol || leg.from),
            leg && (leg.toSymbol || leg.to)
        );
    }

    function persistMutedPathTargets() {
        const list = mutedPathStorageRuntime.persistTargets(mutedPathRuntime.getTargets());
        if (Array.isArray(list)) {
            mutedPathRuntime.setTargets(list);
        }
    }

    function persistMutedPathLegs() {
        const list = mutedPathStorageRuntime.persistLegs(mutedPathRuntime.getLegs());
        if (Array.isArray(list)) {
            mutedPathRuntime.setLegs(list);
        }
    }

    function mutePathAlertTarget(entry, nowMs = Date.now()) {
        const muteTarget = entry && entry.mutedTargetCandidate ? entry.mutedTargetCandidate : null;
        if (!muteTarget) return null;
        const pathAlertUtils = getPathAlertUtils();
        const targetKey = buildMutedPathTargetKey(muteTarget);
        if (!targetKey) return null;
        const logTitleSnapshot = getPathAlertUtils().buildMutedPathLogTitleSnapshot(entry);
        pruneMutedPathTargetsInPlace(nowMs);
        const existingEntry = pathAlertUtils.findMutedPathTargetByKey(mutedPathRuntime.getTargets(), targetKey);
        const nextMutedEntry = existingEntry
            ? pathAlertUtils.extendMutedPathTargetEntry(existingEntry, nowMs, PATH_ALERT_MUTE_EXTEND_DURATION_MS)
            : pathAlertUtils.createMutedPathTargetEntry(
                muteTarget,
                entry.summaryLines,
                nowMs,
                PATH_ALERT_MUTE_DURATION_MS,
                { logTitleSnapshot }
            );
        const mutedEntry = nextMutedEntry && !String(nextMutedEntry.logTitleSnapshot || '').trim()
            ? pathAlertUtils.normalizeMutedPathTarget({
                ...nextMutedEntry,
                logTitleSnapshot
            })
            : nextMutedEntry;
        if (!mutedEntry) return null;
        mutedPathRuntime.setTargets(pathAlertUtils.upsertMutedPathTargetEntry(mutedPathRuntime.getTargets(), mutedEntry));
        persistMutedPathTargets();
        renderMutedAlertStatePanel(nowMs);
        updateMutedPathAlertLogCards(targetKey, nowMs);
        syncMutedPathLogTimer();
        return mutedEntry;
    }

    function buildMutedPathLegKey(legOrEntry) {
        return getMutedPathLegUtils().buildMutedPathLegKey(legOrEntry);
    }

    function pruneMutedPathLegsInPlace(nowMs = Date.now()) {
        return mutedPathRuntime.pruneLegs(nowMs);
    }

    function triggerMutedPathLegRefresh(options = {}) {
        invalidateArbRuleSnapshotCache();
        evaluatePathAlertsOnce();
        renderMutedAlertStatePanel(Date.now());
        renderAlertSettingsPanel();
        updateAlertSoundState();
        updateArbPanel();
        if (options.closeDetail !== false) {
            closeArbDetailModal();
            return;
        }
        if (arbDetailState.visible) {
            renderArbDetailModal();
        }
    }

    function muteArbDetailLeg(leg, durationHours, nowMs = Date.now()) {
        if (!leg) return null;
        const mutedPathLegUtils = getMutedPathLegUtils();
        const durationMs = Number(durationHours) * 60 * 60 * 1000;
        if (!Number.isFinite(durationMs) || durationMs <= 0) return null;
        const legKey = buildMutedPathLegKey(leg);
        if (!legKey) return null;
        pruneMutedPathLegsInPlace(nowMs);
        const existingEntry = mutedPathLegUtils.findMutedPathLegByKey(mutedPathRuntime.getLegs(), legKey);
        const nextEntry = existingEntry
            ? mutedPathLegUtils.extendMutedPathLegEntry(existingEntry, nowMs, durationMs)
            : mutedPathLegUtils.createMutedPathLegEntry(
                leg,
                nowMs,
                durationMs,
                { titleSnapshot: buildMutedPathLegTitleSnapshot(leg) }
            );
        if (!nextEntry) return null;
        const mutedEntry = !String(nextEntry.titleSnapshot || '').trim()
            ? mutedPathLegUtils.normalizeMutedPathLeg({
                ...nextEntry,
                titleSnapshot: buildMutedPathLegTitleSnapshot(leg)
            })
            : nextEntry;
        if (!mutedEntry) return null;
        mutedPathRuntime.setLegs(mutedPathLegUtils.upsertMutedPathLegEntry(mutedPathRuntime.getLegs(), mutedEntry));
        persistMutedPathLegs();
        syncMutedPathLogTimer();
        triggerMutedPathLegRefresh({ closeDetail: true });
        return mutedEntry;
    }

    function extendMutedPathTargetByKey(targetKey, nowMs = Date.now()) {
        if (!targetKey) return null;
        const pathAlertUtils = getPathAlertUtils();
        pruneMutedPathTargetsInPlace(nowMs);
        const existingEntry = pathAlertUtils.findMutedPathTargetByKey(mutedPathRuntime.getTargets(), targetKey);
        if (!existingEntry) return null;
        const nextEntry = pathAlertUtils.extendMutedPathTargetEntry(existingEntry, nowMs, PATH_ALERT_MUTE_EXTEND_DURATION_MS);
        if (!nextEntry) return null;
        mutedPathRuntime.setTargets(pathAlertUtils.upsertMutedPathTargetEntry(mutedPathRuntime.getTargets(), nextEntry));
        persistMutedPathTargets();
        renderMutedAlertStatePanel(nowMs);
        updateMutedPathAlertLogCards(targetKey, nowMs);
        syncMutedPathLogTimer();
        return nextEntry;
    }

    function removeMutedPathTargetByKey(targetKey, nowMs = Date.now()) {
        if (!targetKey) return;
        mutedPathRuntime.setTargets(getPathAlertUtils().removeMutedPathTargetByKey(mutedPathRuntime.getTargets(), targetKey));
        persistMutedPathTargets();
        renderMutedAlertStatePanel(nowMs);
        updateMutedPathAlertLogCards(targetKey, nowMs);
        syncMutedPathLogTimer();
    }

    function extendMutedPathLegByKey(targetKey, nowMs = Date.now()) {
        if (!targetKey) return null;
        const mutedPathLegUtils = getMutedPathLegUtils();
        pruneMutedPathLegsInPlace(nowMs);
        const existingEntry = mutedPathLegUtils.findMutedPathLegByKey(mutedPathRuntime.getLegs(), targetKey);
        if (!existingEntry) return null;
        const nextEntry = mutedPathLegUtils.extendMutedPathLegEntry(existingEntry, nowMs, MUTED_PATH_LEG_EXTEND_DURATION_MS);
        if (!nextEntry) return null;
        mutedPathRuntime.setLegs(mutedPathLegUtils.upsertMutedPathLegEntry(mutedPathRuntime.getLegs(), nextEntry));
        persistMutedPathLegs();
        syncMutedPathLogTimer();
        triggerMutedPathLegRefresh({ closeDetail: false });
        return nextEntry;
    }

    function removeMutedPathLegByKey(targetKey, nowMs = Date.now()) {
        if (!targetKey) return;
        mutedPathRuntime.setLegs(getMutedPathLegUtils().removeMutedPathLegByKey(mutedPathRuntime.getLegs(), targetKey));
        persistMutedPathLegs();
        syncMutedPathLogTimer();
        triggerMutedPathLegRefresh({ closeDetail: false });
    }

    function extendMutedPathTargetFromLogButton(buttonEl, nowMs = Date.now()) {
        if (!buttonEl || typeof buttonEl.closest !== 'function') return false;
        const card = buttonEl.closest('.log-entry[data-muted-target-key]');
        const targetKey = String(card && card.dataset && card.dataset.mutedTargetKey || '').trim();
        if (!targetKey) return false;
        return Boolean(extendMutedPathTargetByKey(targetKey, nowMs));
    }

    function updateMutedPathAlertLogCards(targetKey = '', nowMs = Date.now()) {
        const containers = [alertLogContent, alertLogMutedLogContent].filter(Boolean);
        if (!containers.length) return;
        pruneMutedPathTargetsInPlace(nowMs);
        containers.forEach((container) => {
            const cards = container.querySelectorAll('.log-entry[data-muted-target-key]');
            cards.forEach((card) => {
                if (targetKey && card.dataset.mutedTargetKey !== targetKey) return;
                const resolvedEntry = getPathAlertUtils().findMutedPathTargetByKey(
                    mutedPathRuntime.getTargets(),
                    card.dataset.mutedTargetKey
                );
                const statusState = getAlertLogUiUtils().buildAlertLogMutedStatusState(resolvedEntry, {
                    statusText: resolvedEntry ? getPathAlertUtils().buildMutedPathStatusText(resolvedEntry, nowMs) : ''
                });
                getAlertLogUiUtils().applyAlertLogMutedStatusDomState(card, statusState);
            });
        });
    }

    function renderMutedAlertStatePanel(nowMs = Date.now()) {
        if (!alertLogMutedContent) return;
        pruneMutedPathTargetsInPlace(nowMs);
        pruneMutedPathLegsInPlace(nowMs);
        const panelHtml = getAlertLogUiUtils().buildMutedAlertStatePanelHtml({
            mutedPathTargets: mutedPathRuntime.getTargets(),
            mutedPathLegs: mutedPathRuntime.getLegs(),
            buildPathTargetKey: buildMutedPathTargetKey,
            buildPathStatusText: (entry) => getPathAlertUtils().buildMutedPathStatusText(entry, nowMs),
            buildLegKey: buildMutedPathLegKey,
            buildLegTitle: (entry) => (
                entry && entry.titleSnapshot
                || buildLiveQuoteLabel(entry && entry.chain, entry && entry.fromSymbol, entry && entry.toSymbol)
            ),
            buildLegStatusText: (entry) => getPathAlertUtils().buildMutedPathLegStatusText(entry, nowMs)
        });
        mutedAlertStateHtmlRenderer.render(alertLogMutedContent, panelHtml);
    }

    function renderAlertSettingsPanel() {
        if (!alertLogSettingsContent) return;
        alertSettingsHtmlRenderer.render(alertLogSettingsContent, getAlertLogUiUtils().buildAlertSettingsPanelHtml({
            settings: pathAlertConfig.settings || {},
            forceImmediateAlerts: pathAlertRuntimeState.isForceImmediateEnabled()
        }));
    }

    function renderAlertLogTabState() {
        getAlertLogUiUtils().applyAlertLogTabDomState({
            logTab: alertLogLogTab,
            mutedLogTab: alertLogMutedLogTab,
            mutedTab: alertLogMutedTab,
            settingsTab: alertLogSettingsTab,
            logContent: alertLogContent,
            mutedLogContent: alertLogMutedLogContent,
            mutedContent: alertLogMutedContent,
            settingsContent: alertLogSettingsContent
        }, alertLogTabRuntime.getState(), {
            renderMutedAlertStatePanel: () => renderMutedAlertStatePanel(Date.now()),
            renderAlertSettingsPanel
        });
    }

    function refreshMutedPathRuntime(nowMs = Date.now()) {
        const previousLegKeys = mutedPathRuntime.getLegKeySnapshot(buildMutedPathLegKey);
        pruneMutedPathTargetsInPlace(nowMs);
        pruneMutedPathLegsInPlace(nowMs);
        persistMutedPathTargets();
        persistMutedPathLegs();
        if (isAlertLogPanelVisible()) {
            updateMutedPathAlertLogCards('', nowMs);
            if (alertLogTabRuntime.isActive('muted')) {
                renderMutedAlertStatePanel(nowMs);
            }
        }
        const nextLegKeys = mutedPathRuntime.getLegKeySnapshot(buildMutedPathLegKey);
        if (previousLegKeys !== nextLegKeys) {
            triggerMutedPathLegRefresh({ closeDetail: false });
        }
        return mutedPathRuntime.hasEntries();
    }

    function syncMutedPathLogTimer() {
        mutedPathRuntime.syncRefresh(refreshMutedPathRuntime);
    }

    function restoreMutedAlertLogEntries(nowMs = Date.now()) {
        if (!alertLogMutedLogContent || !mutedPathRuntime.getTargets().length) return;
        const renderPlan = getAlertLogUiUtils().buildRestoredMutedAlertLogPlan(mutedPathRuntime.getTargets(), {
            buildTargetKey: buildMutedPathTargetKey,
            buildStatusText: (entry) => getPathAlertUtils().buildMutedPathStatusText(entry, nowMs)
        });
        renderPlan.forEach((item) => {
            if (getAlertLogUiUtils().hasMutedTargetLogCard(
                alertLogMutedLogContent,
                item.targetKey,
                {
                    escapeCssAttributeValue: (value) => getDomRenderUtils().escapeCssAttributeValue(value)
                }
            )) {
                return;
            }
            const card = getDomRenderUtils().createElementFromHtml(
                getAlertLogUiUtils().buildRestoredMutedAlertLogHtml(item.entry, {
                    nowMs,
                    targetKey: item.targetKey,
                    statusText: item.statusText
                })
            );
            if (card) {
                alertLogMutedLogContent.prepend(card);
            }
        });
        updateMutedPathAlertLogCards('', nowMs);
        syncMutedPathLogTimer();
        getArbRuntimeMemoryUtils().trimContainerChildren(alertLogMutedLogContent, MAX_ALERT_LOG_ENTRIES);
    }

    function appendPathAlertLogEntries(entries, nowMs = Date.now()) {
        if (!alertLogWindow || !alertLogContent) return;
        const appendPlan = getAlertLogUiUtils().buildAlertLogAppendPlan(entries);
        if (!appendPlan.entries.length) return;
        if (appendPlan.shouldAutoOpen) {
            applyAlertLogPanelDisplay('open');
        }
        const destinations = [];
        for (const entry of appendPlan.entries) {
            const mutedEntry = entry && entry.mutedTargetCandidate
                ? getMutedPathTargetEntry(entry.mutedTargetCandidate, nowMs)
                : null;
            const card = getDomRenderUtils().createElementFromHtml(
                getAlertLogUiUtils().buildPathAlertLogCardHtml(entry, {
                    nowMs,
                    mutedEntry,
                    targetKey: entry && entry.mutedTargetCandidate ? buildMutedPathTargetKey(entry.mutedTargetCandidate) : '',
                    statusText: mutedEntry ? getPathAlertUtils().buildMutedPathStatusText(mutedEntry, nowMs) : '已触发',
                    profitText: getPathAlertNotificationUtils().formatPathAlertEvaluationText(entry && entry.evaluation)
                })
            );
            if (card) {
                const destination = alertLogCardInsertionRuntime.prepend(entry, card);
                if (destination) destinations.push(destination);
            }
        }
        alertLogCardInsertionRuntime.finalize(destinations, nowMs);
    }

    function unlockAudio() {
        void alertAudioRuntime.unlockAndReport();
    }
    document.body.addEventListener('click', unlockAudio, { once: true });
    document.body.addEventListener('pointerdown', unlockAudio, { once: true });
    document.body.addEventListener('touchstart', unlockAudio, { once: true });
    document.body.addEventListener('keydown', unlockAudio, { once: true });

    function scheduleArbUpdate() {
        arbPanelUpdateRuntime.schedule();
    }

    function invalidateArbRuleSnapshotCache(options = {}) {
        if (options.bumpRevision !== false) {
            quoteStateRuntime.bumpMarketRevision();
        }
        arbPanelCache.clearRuleSnapshot();
    }

    function invalidateArbCaches() {
        invalidateArbRuleSnapshotCache();
        arbPanelCache.clearTopology();
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

    function setQuoteUiState(quoteId, nextState) {
        return quoteStateRuntime.setUiState(quoteId, nextState);
    }

    function resetQuoteUiRuntimeState(quoteId) {
        quoteStateRuntime.resetUiRuntimeState(quoteId, clearTimeout);
    }

    function deleteQuoteUiRuntimeState(quoteId) {
        quoteStateRuntime.deleteUiRuntimeState(quoteId, clearTimeout);
    }

    function buildArbRuleSnapshotCacheKey() {
        return getDashboardRuntimeUtils().buildArbRuleSnapshotCacheKey(dashboardState, quoteStateRuntime.getMarketRevision());
    }

    function buildQuotesByCategoryName() {
        return getDashboardRuntimeUtils().buildQuotesByCategoryName(dashboardState, getActiveQuotes);
    }

    function filterMutedArbEdges(edges, nowMs = Date.now()) {
        pruneMutedPathLegsInPlace(nowMs);
        return getMutedPathLegUtils().filterMutedPathLegs(edges, mutedPathRuntime.getLegs(), nowMs);
    }

    function filterMutedArbCycles(cycles, nowMs = Date.now()) {
        pruneMutedPathLegsInPlace(nowMs);
        return getMutedPathLegUtils().filterMutedCycles(cycles, mutedPathRuntime.getLegs(), nowMs);
    }

    function buildVisibleArbEdges(quotes, nowMs = Date.now()) {
        return filterMutedArbEdges(
            getArbPaths().buildEdges(quotes, getQuoteMarketStateMap(), null),
            nowMs
        );
    }

    function getSharedArbRuleSnapshot() {
        const topologyCacheForFixed = getArbPathTopologyCache();
        const cacheKey = buildArbRuleSnapshotCacheKey();
        const cachedSnapshot = arbPanelCache.getRuleSnapshot(cacheKey);
        if (cachedSnapshot) {
            return cachedSnapshot;
        }

        const aliasRules = getAliasRules();
        const allQuotes = getActiveQuotes(dashboardState.flatMap((category) => category.quotes || []));
        const allEdges = buildVisibleArbEdges(allQuotes);
        const arbPaths = getArbPaths();
        const ruleEdges = arbPaths.buildRuleEdges(aliasRules);
        const allEdgesWithRules = allEdges.concat(ruleEdges);
        const quoteMetaById = buildQuoteMetaById();
        const quotesByCategoryName = buildQuotesByCategoryName();
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
            mutedPathLegs: mutedPathRuntime.getLegs(),
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

    function getArbPathTemplateCacheUtils() {
        return getWindowModule('ArbPathTemplateCacheUtils', 'ArbPathTemplateCacheUtils is not loaded');
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

    const FIXED_PATH_RULES = getPathAlertRuleDefinitionsUtils().FIXED_PATH_RULES;
    const SPECIAL_ARB_RULES = getPathAlertRuleDefinitionsUtils().SPECIAL_ARB_RULES;
    const GLOBAL_PATH_SOURCE_SELECTORS = [0, 1, 2, 3];
    const ARB_PATH_CONFIG = getArbPathConfig();

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

    function getArbDetailUtils() {
        return getWindowModule('ArbDetailUtils', 'ArbDetailUtils is not loaded');
    }

    function getChartsUtils() {
        return getWindowModule('ChartsUtils', 'ChartsUtils is not loaded');
    }

    function getDataTerminalUtils() {
        return getWindowModule('DataTerminalUtils', 'DataTerminalUtils is not loaded');
    }

    function getDashboardRenderer() {
        return getWindowModule('DashboardRenderer', 'DashboardRenderer is not loaded');
    }

    function getQuoteDisplayUtils() {
        return getWindowModule('QuoteDisplayUtils', 'QuoteDisplayUtils is not loaded');
    }

    function getDexLinkUtils() {
        return getWindowModule('DexLinkUtils', 'DexLinkUtils is not loaded');
    }

    function formatDetailNumber(value, precision = 6) {
        return getArbDetailUtils().formatDetailNumber(value, precision);
    }

    function getQuoteDisplayText(quote, state) {
        return getQuoteDisplayUtils().buildQuoteDisplayTextForState(quote, state, {
            mode: quoteDisplayMode,
            paused: isQuotePaused(quote)
        });
    }

    function getInverseQuoteDisplayText(quote, state, fallbackText = '反向报价排队中...') {
        return getQuoteDisplayUtils().buildInverseQuoteDisplayTextForState(quote, state, {
            mode: quoteDisplayMode,
            fallbackText
        });
    }

    function updateQuotePairLabel(quote, state) {
        const pairLabelEl = document.getElementById(`quote-pair-label-${quote.id}`);
        getDomRenderUtils().applyQuotePairLabelDomState(
            pairLabelEl,
            getQuoteDisplayUtils().buildQuotePairLabelHtml(quote, state)
        );
    }

    function renderQuoteDisplayToggle() {
        getQuoteDisplayUtils().applyQuoteDisplayToggleButtonState(toggleQuoteDisplayBtn, quoteDisplayMode);
    }

    function rerenderQuoteDisplayTexts() {
        for (const category of dashboardState) {
            const quotes = Array.isArray(category && category.quotes) ? category.quotes : [];
            for (const quote of quotes) {
                const state = getQuoteMarketState(quote.id) || {};
                const quoteTextEl = document.getElementById(`quote-text-${quote.id}`);
                const inverseEl = document.getElementById(`inverse-quote-${quote.id}`);
                const inverseText = inverseEl && Number.isFinite(Number(state.inverseRawPrice))
                    ? getInverseQuoteDisplayText(quote, state, inverseEl.textContent || '...')
                    : null;
                getDomRenderUtils().applyQuoteDisplayTextDomState({
                    quoteTextEl,
                    inverseEl
                }, {
                    text: getQuoteDisplayText(quote, state),
                    inverseText
                });
            }
        }
    }

    function toggleQuoteDisplayMode() {
        quoteDisplayMode = getQuoteDisplayUtils().getNextQuoteDisplayMode(quoteDisplayMode);
        renderQuoteDisplayToggle();
        rerenderQuoteDisplayTexts();
    }

    function updatePauseButtonState(quote) {
        const pauseBtn = document.querySelector(`[data-toggle-pause-id="${quote.id}"]`);
        getQuotePauseUtils().applyQuotePauseButtonState(pauseBtn, quote);
    }

    function updateCategoryPauseButtonState(categoryId) {
        const pauseBtn = document.querySelector(`[data-toggle-category-pause-id="${categoryId}"]`);
        const category = dashboardState.find((item) => item.id == categoryId);
        getQuotePauseUtils().applyCategoryPauseButtonState(
            pauseBtn,
            category && category.quotes ? category.quotes : []
        );
    }

    function clearQuoteTrendArrow(quoteId) {
        const arrowEl = document.getElementById(`trend-arrow-${quoteId}`);
        getDomRenderUtils().resetTrendArrow(arrowEl);
        quoteStateRuntime.clearTrendTimer(quoteId, clearTimeout);
    }

    function clearQuoteAlertUi(quoteId) {
        const itemEl = document.getElementById(`quote-item-${quoteId}`);
        getDomRenderUtils().clearQuoteHighlightUi(itemEl);
    }

    function removeInverseQuoteElement(quoteId) {
        const inverseEl = document.getElementById(`inverse-quote-${quoteId}`);
        getDomRenderUtils().removeQuoteInverseElement(inverseEl);
    }

    function abortQuoteFetch(quoteId) {
        activeFetchControllerRuntime.abort(quoteId);
    }

    function applyPausedQuoteUiState(quote, state) {
        getDomRenderUtils().applyPausedQuoteDomState(
            getDomRenderUtils().getQuoteDomRefs(document, quote.id)
        );
        updateQuotePairLabel(quote, state);
        updatePauseButtonState(quote);
        removeInverseQuoteElement(quote.id);
        clearQuoteAlertUi(quote.id);
        clearQuoteTrendArrow(quote.id);
    }

    function applyActiveQuoteUiState(quote, options = {}) {
        const state = getQuoteMarketState(quote.id) || {};
        getDomRenderUtils().applyActiveQuoteDomState(
            getDomRenderUtils().getQuoteDomRefs(document, quote.id),
            options
        );
        updateQuotePairLabel(quote, state);
        updatePauseButtonState(quote);
        clearQuoteAlertUi(quote.id);
        clearQuoteTrendArrow(quote.id);
        if (options.clearInverse) {
            removeInverseQuoteElement(quote.id);
        }
    }

    function nudgeArbDetailInput(index, delta) {
        const card = arbDetailState.cards[index];
        if (!card) return;
        const nextValue = getArbDetailUtils().buildNudgedArbDetailInputAmount(card.inputAmount, delta);
        arbDetailState.editingInputIndex = null;
        updateArbDetailInput(index, nextValue);
        renderArbDetailModal();
    }

    function updateQuoteRunStateTag() {
        getDomRenderUtils().applyQuoteRunStateTagDomState(
            quoteRunStateTag,
            getArbDetailUtils().getQuoteRunState(arbDetailState.pausedDashboard)
        );
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

    function getDashboardRuntimeUtils() {
        return getWindowModule('DashboardRuntimeUtils', 'DashboardRuntimeUtils is not loaded');
    }

    function isArbPanelVisible() {
        return getDashboardRuntimeUtils().isPanelVisible(arbPathWindow);
    }

    function isAlertLogPanelVisible() {
        return getDashboardRuntimeUtils().isPanelVisible(alertLogWindow);
    }

    function hasActivePathAlertEvaluationTarget() {
        return getDashboardRuntimeUtils().hasActivePathAlertEvaluationTarget(pathAlertConfig);
    }

    function getActivePathAlertEvaluationAlerts() {
        return getDashboardRuntimeUtils().getActivePathAlertEvaluationAlerts(pathAlertConfig);
    }

    function pruneInactiveAlertRuntimeState() {
        pathAlertRuntimeState.pruneInactive(pathAlertConfig && pathAlertConfig.alerts);
    }

    function resolveDataTerminalRecordsCacheKey() {
        return getDashboardRuntimeUtils().buildDataTerminalRecordsCacheKey(dashboardState, quoteStateRuntime.getMarketRevision());
    }

    function clearDataTerminalTimer() {
        dataTerminalUpdateRuntime.clear();
    }

    function hasDataTerminalActiveQuery() {
        return getDataTerminalUtils().parseDataTerminalQuery(dataTerminalState.query).length > 0;
    }

    function buildDataTerminalRecords() {
        const cacheKey = resolveDataTerminalRecordsCacheKey();
        return dataTerminalCache.getRecords(cacheKey, () => getDataTerminalUtils().buildDataTerminalRecords(dashboardState, getQuoteMarketStateMap(), {
            isQuoteActive: (quote) => !isQuotePaused(quote)
        }));
    }

    function buildDataTerminalCandidates(utils) {
        const cacheKey = resolveDataTerminalRecordsCacheKey();
        return dataTerminalCache.getCandidates(cacheKey, () => utils.buildDataTerminalCandidates(buildDataTerminalRecords()));
    }

    function renderDataTerminalPanel() {
        if (!dataTerminalState.visible || !dataTerminalState.domRefs) return;
        const refs = dataTerminalState.domRefs;
        const utils = getDataTerminalUtils();
        if (!refs.content) return;

        utils.applyDataTerminalControlWritePlan(utils.buildDataTerminalControlWritePlan(dataTerminalState), refs);

        const candidates = buildDataTerminalCandidates(utils);
        const viewModel = utils.buildDataTerminalViewModel(candidates, {
            query: dataTerminalState.query,
            aliasRules: getAliasRules(),
            allowAliases: dataTerminalState.allowAliases,
            showDiff: dataTerminalState.showDiff
        });

        const selectionSummary = typeof utils.buildDataTerminalSelectionSummary === 'function'
            ? utils.buildDataTerminalSelectionSummary(
                {
                    leftKey: dataTerminalState.selectedLeftKey,
                    rightKey: dataTerminalState.selectedRightKey
                },
                {
                    leftRows: viewModel.leftRows || [],
                    rightRows: viewModel.rightRows || []
                }
            )
            : {
                leftKey: '',
                rightKey: '',
                profitBp: null,
                text: '--'
            };

        dataTerminalState.selectedLeftKey = selectionSummary.leftKey;
        dataTerminalState.selectedRightKey = selectionSummary.rightKey;

        utils.applyDataTerminalSelectionSummaryDomState(refs, selectionSummary);

        dataTerminalState.htmlRenderer.render(
            refs.content,
            utils.buildDataTerminalPanelHtml(
                viewModel,
                {
                    selectedLeftKey: dataTerminalState.selectedLeftKey,
                    selectedRightKey: dataTerminalState.selectedRightKey
                },
                {
                    formatChainLabel,
                    formatAmount: (amount) => formatDetailNumber(Number(amount), 6),
                    buildPairLinkHtml: (row, className, label) => getDexLinkUtils().buildDexLinkCopyButtonHtml({
                        chain: row.chain,
                        fromTokenAddress: row.fromTokenAddress,
                        toTokenAddress: row.toTokenAddress,
                        inputAmount: row.amount
                    }, className, label)
                }
            )
        );

        if (!hasDataTerminalActiveQuery()) {
            clearDataTerminalTimer();
        }
    }

    function handleDataTerminalContentClick(event) {
        const action = getDataTerminalUtils().resolveDataTerminalContentClickAction(event, { closestEventTarget });
        if (action.type === 'copy-dex-link') {
            event.preventDefault();
            event.stopPropagation();
            void copyDexLinkFromElement(action.element);
            return;
        }
        if (action.type !== 'toggle-row') {
            return;
        }

        getDataTerminalUtils().applyDataTerminalStatePatch(
            dataTerminalState,
            getDataTerminalUtils().buildDataTerminalSelectionPatch(dataTerminalState, action)
        );
        renderDataTerminalPanel();
    }

    function handleDataTerminalHeaderClick(event) {
        const action = getDataTerminalUtils().resolveDataTerminalHeaderClickAction(event, { closestEventTarget });
        if (action.type !== 'blur-search') return;
        const refs = dataTerminalState.domRefs;
        if (refs && refs.searchInput && document.activeElement === refs.searchInput) {
            refs.searchInput.blur();
        }
    }

    function mountDataTerminalPanel() {
        if (dataTerminalState.visible && dataTerminalState.domRefs && dataTerminalState.domRefs.window) {
            floatingPanelZIndexRuntime.bringToFront(dataTerminalState.domRefs.window);
            return;
        }
        const utils = getDataTerminalUtils();

        const panel = utils.createDataTerminalPanelElement({ documentImpl: document });
        if (!panel) return;
        utils.applyDataTerminalDefaultSize(panel, {
            anchorPanel: arbPathWindow,
            getComputedStyle: (element) => window.getComputedStyle(element)
        });
        utils.applyDataTerminalWindowPosition(panel, {
            anchorPanel: arbPathWindow,
            getComputedStyle: (element) => window.getComputedStyle(element)
        });
        document.body.appendChild(panel);

        const refs = utils.getDataTerminalDomRefs(panel);

        dataTerminalState.visible = true;
        dataTerminalState.domRefs = refs;
        dataTerminalState.htmlRenderer.reset();
        utils.applyDataTerminalControlWritePlan(utils.buildDataTerminalControlWritePlan(dataTerminalState), refs);

        utils.bindDataTerminalControlEvents(refs, {
            onPatch: (patch) => {
                utils.applyDataTerminalStatePatch(dataTerminalState, patch);
                renderDataTerminalPanel();
            },
            onContentClick: handleDataTerminalContentClick,
            onHeaderClick: handleDataTerminalHeaderClick,
            onMinimize: toggleDataTerminalPanel
        });
        if (refs.header) {
            getDomRenderUtils().bindFloatingPanelChrome(panel, refs.header, {
                documentImpl: document,
                zIndexRuntime: floatingPanelZIndexRuntime
            });
        }

        renderDataTerminalPanel();
        floatingPanelZIndexRuntime.bringToFront(panel);
        if (refs.searchInput && !String(dataTerminalState.query || '').trim()) {
            refs.searchInput.focus();
        }
    }

    function unmountDataTerminalPanel() {
        clearDataTerminalTimer();
        const refs = dataTerminalState.domRefs;
        if (refs && refs.window && refs.window.parentNode) {
            refs.window.parentNode.removeChild(refs.window);
        }
        dataTerminalState.visible = false;
        dataTerminalState.domRefs = null;
        dataTerminalState.htmlRenderer.reset();
    }

    function toggleDataTerminalPanel() {
        if (dataTerminalState.visible) {
            unmountDataTerminalPanel();
            return;
        }
        mountDataTerminalPanel();
    }

    function updateGlobalArbFilterBar() {
        getArbPanelLayoutUtils().applyGlobalArbFilterWritePlan(
            arbGlobalFilterElements,
            getArbPanelLayoutUtils().buildGlobalArbFilterWritePlan(getArbGlobalFilterState())
        );
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
        registerArbOpportunityHighlightTarget(
            highlightTargetMap,
            buildArbOpportunityHighlightTargetKeyFromCycle(cycle),
            opportunityId
        );

        return getArbPanelLayoutUtils().buildArbOpportunityDisplayEntry(opportunityId, cycle, label, meta, {
            isAlertHighlighted: isArbOpportunityHighlighted(opportunityId),
        });
    }

    function buildArbOpportunityChartHref(entry) {
        const chartsUtils = getChartsUtils();
        if (!chartsUtils || typeof chartsUtils.buildChartsPageHref !== 'function') {
            return '';
        }
        return getArbDetailUtils().buildArbOpportunityChartHref(
            entry,
            (chartPairs) => chartsUtils.buildChartsPageHref(chartPairs)
        );
    }

    function refreshArbOpportunityRuntime(nextOpportunityMap, nextOpportunityIdsByTargetKey) {
        const retainedEntries = [];
        if (arbDetailState && arbDetailState.selectedOpportunity && arbDetailState.selectedOpportunity.id) {
            retainedEntries.push(arbDetailState.selectedOpportunity);
        }
        const activeOpportunity = arbDetailState && arbDetailState.opportunityId
            ? arbOpportunityRuntime.getOpportunity(arbDetailState.opportunityId)
            : null;
        if (activeOpportunity) {
            retainedEntries.push(activeOpportunity);
        }

        arbOpportunityRuntime.setPanelOpportunities(nextOpportunityMap, nextOpportunityIdsByTargetKey, retainedEntries);
    }

    function buildArbDetailRowsHtml(card, cardIndex) {
        return getArbDetailUtils().buildArbDetailRowsHtml(card, {
            cardIndex,
            buildSourceHtml: (row, options) => getArbDetailUtils().buildArbDetailSourceHtml(row, options)
        });
    }

    function buildArbDetailSummaryHtml(card, index, bestProfitIndices, bestProfitRateIndices) {
        return getArbDetailUtils().buildArbDetailSummaryHtml(card, {
            index,
            bestProfitIndices,
            bestProfitRateIndices,
            formatNumber: formatDetailNumber
        });
    }

    function syncArbDetailInputValues() {
        getArbDetailUtils().syncArbDetailInputValues(arbDetailState.cards, {
            editingInputIndex: arbDetailState.editingInputIndex,
            getElementById: (id) => document.getElementById(id)
        });
    }

    function renderArbDetailCardContents() {
        const { bestProfitIndices, bestProfitRateIndices } = getArbDetailUtils().findBestSummaryIndices(arbDetailState.cards);
        getArbDetailUtils().applyArbDetailCardContents(arbDetailState.cards, {
            getElementById: (id) => document.getElementById(id),
            buildRowsHtml: (card, index) => buildArbDetailRowsHtml(card, index),
            buildSummaryHtml: (card, index) => buildArbDetailSummaryHtml(card, index, bestProfitIndices, bestProfitRateIndices)
        });
    }

    function getArbDetailIntervalMsForSource(source) {
        const intervalKey = getArbDetailUtils().getArbDetailIntervalKey(source);
        if (!intervalKey) return 0;
        const configured = Number(apiIntervals[intervalKey]);
        return Number.isFinite(configured) && configured > 0 ? configured : 0;
    }

    function syncArbDetailPrimaryCardQuoteState(quote, data, successSource, isInverseFetch) {
        if (!quote) return;
        const previousState = getQuoteMarketState(quote.id) || {};
        const nextState = getArbDetailUtils().buildArbDetailSnapshotMonitorState(previousState, data, {
            successSource,
            isInverseFetch
        });
        setQuoteMarketState(quote.id, nextState);
    }

    async function waitForArbDetailSourceBudget(source, signal) {
        const intervalKey = getArbDetailUtils().getArbDetailIntervalKey(source);
        if (!intervalKey) return;
        if (signal && signal.aborted) {
            const aborted = new Error('Aborted');
            aborted.name = 'AbortError';
            throw aborted;
        }

        const waitMs = getArbDetailUtils().getArbDetailRateLimitDelay(
            arbDetailSourceBudgetRuntime.getTimestamp(source),
            getArbDetailIntervalMsForSource(source)
        );

        if (waitMs > 0) {
            await sleep(waitMs);
            if (signal && signal.aborted) {
                const aborted = new Error('Aborted');
                aborted.name = 'AbortError';
                throw aborted;
            }
        }
    }

    function setArbDetailChartLinkState(chartHref) {
        getArbDetailUtils().applyArbDetailChartLinkState(arbDetailChartLink, chartHref);
    }

    function destroyArbDetailChartPreview() {
        arbDetailChartPreviewCharts.forEach((chart) => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        arbDetailChartPreviewCharts = [];
        getArbDetailUtils().clearArbDetailPreviewContainers({
            chartPreview: arbDetailChartPreview,
            profitPreview: arbDetailProfitPreview
        });
    }

    function syncArbDetailChartAutoRefreshTimer() {
        arbDetailChartAutoRefreshRuntime.sync();
    }

    function renderArbDetailChartPreviewMessage(message) {
        getArbDetailUtils().applyArbDetailChartPreviewMessage(arbDetailChartPreview, message);
    }

    function getArbDetailProfitCardEl() {
        return getArbDetailUtils().getArbDetailProfitCardElement(arbDetailChartPreview);
    }

    function renderArbDetailProfitPreviewMessage(message) {
        const cardEl = getArbDetailProfitCardEl();
        getArbDetailUtils().applyArbDetailProfitPreviewMessage(cardEl, message);
    }

    function syncArbDetailProfitPreview(seriesList, renderer) {
        const cardEl = getArbDetailProfitCardEl();
        if (!cardEl) return;

        const utils = getChartsUtils();
        const previewState = getArbDetailUtils().buildArbDetailProfitPreviewState(seriesList, {
            buildProfitChartPoints: utils && utils.buildProfitChartPoints,
            canMountProfitHistoryChart: Boolean(renderer && typeof renderer.mountProfitHistoryChart === 'function')
        });
        if (!previewState.ready) {
            renderArbDetailProfitPreviewMessage(previewState.message);
            return;
        }

        getArbDetailUtils().applyArbDetailProfitPreviewReady(cardEl, previewState.seriesCount);
        const profitRefs = getArbDetailUtils().getArbDetailProfitPreviewElements(cardEl);
        if (!profitRefs.canvasEl) return;

        const chartInstance = renderer.mountProfitHistoryChart(profitRefs.canvasEl, {
            mini: true,
            height: 104,
            showRightPriceScale: true
        });
        chartInstance.update(previewState.points);
        arbDetailChartPreviewCharts.push(chartInstance);

        getArbDetailUtils().applyArbDetailProfitPreviewMeta(profitRefs.metaEl, previewState.metaText);
    }

    async function syncArbDetailChartPreview(current, options = {}) {
        if (!arbDetailChartPreview) return;
        const forceReload = options.forceReload === true;

        const pairs = current && current.cycle
            ? getArbDetailUtils().buildArbDetailChartPairs(current.cycle)
            : [];
        const signature = getArbDetailUtils().buildArbDetailChartPreviewSignature(pairs);
        const chartHref = buildArbOpportunityChartHref(current);

        setArbDetailChartLinkState(chartHref);

        if (!pairs.length) {
            arbDetailState.chartPreviewSignature = '';
            destroyArbDetailChartPreview();
            renderArbDetailChartPreviewMessage('当前路径暂无可用历史图表。');
            renderArbDetailProfitPreviewMessage('当前路径暂无可用历史图表。');
            return;
        }

        if (!forceReload && arbDetailState.chartPreviewSignature === signature && getArbDetailUtils().hasArbDetailChartPreviewContent(arbDetailChartPreview)) {
            return;
        }

        arbDetailChartPreviewRunId += 1;
        const runId = arbDetailChartPreviewRunId;
        arbDetailState.chartPreviewSignature = signature;
        destroyArbDetailChartPreview();
        getArbDetailUtils().applyArbDetailChartPreviewStrip(arbDetailChartPreview, pairs, {
            buildChartPairLabel: (pair) => getChartsUtils().buildChartPairLabel(pair)
        });

        const renderer = window.ChartsRenderer || null;
        if (!renderer || typeof renderer.mountPriceHistoryChart !== 'function') {
            renderArbDetailChartPreviewMessage('图表模块未就绪，请刷新页面后重试。');
            renderArbDetailProfitPreviewMessage('图表模块未就绪，请刷新页面后重试。');
            return;
        }

        const loadedSeries = new Array(pairs.length).fill(null);
        await Promise.all(pairs.map(async (pair, index) => {
            const chartRefs = getArbDetailUtils().getArbDetailChartCardElements(arbDetailChartPreview, index);
            if (!chartRefs.cardEl) return;

            try {
                const params = new URLSearchParams({
                    quoteId: String(pair.quoteId),
                    direction: pair.direction,
                    windowSec: '3600'
                });
                const response = await fetch(`/api/chart-series?${params.toString()}`);
                if (!response.ok) {
                    const body = await response.text();
                    throw new Error(body || '图表加载失败');
                }

                const series = await response.json();
                if (!arbDetailState.visible || arbDetailChartPreviewRunId !== runId) {
                    return;
                }

                const chartInstance = renderer.mountPriceHistoryChart(chartRefs.canvasEl, {
                    mini: true,
                    height: 104,
                    showRightPriceScale: true,
                    color: '#0f766e'
                });
                chartInstance.update(series.points || []);
                loadedSeries[index] = Array.isArray(series.points) ? series.points : [];
                arbDetailChartPreviewCharts.push(chartInstance);

                getArbDetailUtils().applyArbDetailChartLoadedMeta(chartRefs.metaEl, series.source);
            } catch (error) {
                if (arbDetailChartPreviewRunId !== runId) return;
                getArbDetailUtils().applyArbDetailChartCardError(chartRefs.canvasEl, chartRefs.metaEl, error.message || '图表加载失败');
            }
        }));

        if (!arbDetailState.visible || arbDetailChartPreviewRunId !== runId) {
            return;
        }
        syncArbDetailProfitPreview(loadedSeries, renderer);
    }

    function renderArbDetailModal(forceShellRebuild = false) {
        if (!arbDetailGrid || !arbDetailModal) return;
        if (!arbDetailState.visible) {
            getArbDetailUtils().applyArbDetailModalVisibility(arbDetailModal, false);
            return;
        }

        const current = arbDetailState.selectedOpportunity;
        if (!current || !current.cycle) {
            getArbDetailUtils().applyArbDetailSubtitleText(
                arbDetailSubtitle,
                getArbDetailUtils().buildArbDetailSubtitleText(current)
            );
            setArbDetailChartLinkState('');
            destroyArbDetailChartPreview();
            getArbDetailUtils().applyArbDetailErrorHtml(arbDetailGrid, '当前套利机会已失效，请关闭后重新选择。');
            getArbDetailUtils().applyArbDetailModalVisibility(arbDetailModal, true);
            return;
        }

        const visibleLegs = (current.cycle.legs || []).filter((leg) => !isRuleLeg(leg));
        const legLines = getArbPanelLayoutUtils().buildArbPathLegLines(visibleLegs, buildArbPathLegLineOptions());
        getArbDetailUtils().applyArbDetailSubtitleText(
            arbDetailSubtitle,
            getArbDetailUtils().buildArbDetailSubtitleText(current, legLines)
        );
        void syncArbDetailChartPreview(current);
        if (forceShellRebuild || getArbDetailUtils().shouldRebuildArbDetailShellDom(arbDetailState.cards, {
            gridEl: arbDetailGrid,
            getElementById: (id) => document.getElementById(id)
        })) {
            getArbDetailUtils().applyArbDetailShellHtml(arbDetailGrid, arbDetailState.cards);
        }
        syncArbDetailInputValues();
        renderArbDetailCardContents();
        getArbDetailUtils().applyArbDetailModalVisibility(arbDetailModal, true);
    }

    function abortActiveQuoteFetches() {
        activeFetchControllerRuntime.abortAll();
    }

    function setArbDetailDashboardPause(paused) {
        const nextPaused = Boolean(paused);
        if (arbDetailState.pausedDashboard === nextPaused) return;
        arbDetailState.pausedDashboard = nextPaused;
        if (nextPaused) {
            abortActiveQuoteFetches();
        }
        updateSchedulers();
        updateQuoteRunStateTag();
    }

    function closeArbDetailModal() {
        clearArbDetailRefreshTimer();
        if (arbDetailFetchController) {
            arbDetailFetchController.abort();
            arbDetailFetchController = null;
        }
        arbDetailState = getArbDetailUtils().buildClosedArbDetailState(arbDetailState);
        arbDetailChartPreviewRunId += 1;
        destroyArbDetailChartPreview();
        arbDetailChartAutoRefreshRuntime.clear();
        setArbDetailChartLinkState('');
        getArbDetailUtils().applyArbDetailModalVisibility(arbDetailModal, false);
        setArbDetailDashboardPause(false);
    }

    function openArbDetailModal(opportunityId) {
        clearArbDetailRefreshTimer();
        let current = arbOpportunityRuntime.getOpportunity(opportunityId);
        if (!current) {
            updateArbPanel();
            current = arbOpportunityRuntime.getOpportunity(opportunityId);
        }
        if (!current || !current.cycle) return;

        if (arbDetailFetchController) {
            arbDetailFetchController.abort();
            arbDetailFetchController = null;
        }

        const baseAmount = getArbDetailUtils().resolveArbOpportunityBaseAmount(
            current.cycle,
            findQuoteById,
            isRuleLeg
        );
        arbDetailState = getArbDetailUtils().buildOpenArbDetailState(arbDetailState, {
            opportunityId,
            opportunity: current,
            baseAmount
        });
        if (arbDetailChartAutoRefreshToggle) {
            arbDetailChartAutoRefreshToggle.checked = true;
        }
        setArbDetailDashboardPause(true);
        renderArbDetailModal(true);
        syncArbDetailChartAutoRefreshTimer();
        startArbDetailRefresh(arbDetailState.refreshToken);
    }

    function updateArbDetailInput(index, rawValue) {
        getArbDetailUtils().applyArbDetailInputUpdate(arbDetailState.cards, index, rawValue);
    }

    function restartArbDetailRefresh() {
        if (!arbDetailState.visible) return;
        clearArbDetailRefreshTimer();
        if (arbDetailFetchController) {
            arbDetailFetchController.abort();
            arbDetailFetchController = null;
        }
        arbDetailState.refreshToken += 1;
        arbDetailState.isRefreshing = false;
        startArbDetailRefresh(arbDetailState.refreshToken);
    }

    function commitArbDetailInput(index, rawValue) {
        const card = arbDetailState.cards[index];
        if (!card) return;

        const parsed = getArbDetailUtils().parseCommittedArbDetailInput(rawValue);
        if (parsed === null) {
            renderArbDetailModal();
            return;
        }

        if (parsed === card.inputAmount) {
            renderArbDetailModal();
            return;
        }

        updateArbDetailInput(index, parsed);
        renderArbDetailModal();
        restartArbDetailRefresh();
    }

    async function refreshArbDetailCards(refreshToken) {
        const current = arbDetailState.selectedOpportunity;
        if (!current || !current.cycle) return false;

        const executableLegs = (current.cycle.legs || []).filter(leg => !isRuleLeg(leg));
        if (!executableLegs.length) return false;

        const controller = new AbortController();
        arbDetailFetchController = controller;

        try {
            for (const [cardIndex, card] of arbDetailState.cards.entries()) {
                if (!arbDetailState.visible || arbDetailState.refreshToken !== refreshToken) return;

                const requestVersion = Number(card.requestVersion) || 0;

                try {
                    const startAmount = Number(card.inputAmount);
                    let rollingAmount = startAmount;
                    let rows = [];
                    let finalSymbol = '';
                    let shouldSkipApply = false;

                    for (const leg of executableLegs) {
                        const match = findQuoteById(leg.quoteId);
                        if (!match || !match.quote) {
                            throw new Error('报价配置不存在');
                        }
                        const legInputAmount = rollingAmount;

                        const { data, successSource } = await fetchQuoteByStrategy(match.quote, {
                            signal: controller.signal,
                            isInverseFetch: Boolean(leg.inverse),
                            amount: legInputAmount,
                            requestChannelId: 'default',
                            skipDelay: true,
                            beforeSourceAttempt: (source) => waitForArbDetailSourceBudget(source, controller.signal)
                        });

                        if (!arbDetailState.visible || arbDetailState.refreshToken !== refreshToken) {
                            return;
                        }
                        if (!getArbDetailUtils().shouldApplyArbDetailRequestVersion(requestVersion, card.requestVersion)) {
                            shouldSkipApply = true;
                            break;
                        }

                        if (getArbDetailUtils().shouldSyncArbDetailSnapshotForCard(cardIndex)) {
                            syncArbDetailPrimaryCardQuoteState(
                                match.quote,
                                data,
                                successSource,
                                Boolean(leg.inverse)
                            );
                        }

                        rollingAmount = data.finalAmountOut;
                        finalSymbol = data.symbols.to || finalSymbol;
                        rows.push(getArbDetailUtils().buildArbDetailRow(match.quote, data, {
                            inputAmount: legInputAmount,
                            isInverseFetch: Boolean(leg.inverse),
                            formatChainLabel,
                            formatAmount: (value) => `${formatDetailNumber(value)}`
                        }));
                    }

                    if (shouldSkipApply || !getArbDetailUtils().shouldApplyArbDetailRequestVersion(requestVersion, card.requestVersion)) {
                        continue;
                    }

                    const summary = getArbDetailUtils().summarizeDetailResult(startAmount, rollingAmount);
                    if (cardIndex === 3) {
                        const baseRows = Array.isArray(arbDetailState.cards[0]?.rows) ? arbDetailState.cards[0].rows : [];
                        rows = getArbDetailUtils().applyArbDetailRateDeltas(rows, baseRows);
                    }
                    card.rows = rows;
                    card.summary = {
                        ...summary,
                        symbol: finalSymbol
                    };
                    card.error = '';
                    renderArbDetailCardContents();
                } catch (error) {
                    if (error.name === 'AbortError') {
                        throw error;
                    }
                    if (!getArbDetailUtils().shouldApplyArbDetailRequestVersion(requestVersion, card.requestVersion)) {
                        continue;
                    }
                    getArbDetailUtils().applyArbDetailCardError(
                        arbDetailState.cards,
                        cardIndex,
                        error.message || '详情报价失败'
                    );
                    renderArbDetailCardContents();
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return false;
            }
            throw error;
        } finally {
            if (arbDetailFetchController === controller) {
                arbDetailFetchController = null;
            }
            renderArbDetailCardContents();
        }

        return true;
    }

    function isArbDetailRefreshActive(refreshToken) {
        return arbDetailState.visible && arbDetailState.refreshToken === refreshToken;
    }

    function setArbDetailRefreshing(refreshing, refreshToken) {
        if (refreshing || arbDetailState.refreshToken === refreshToken) {
            arbDetailState.isRefreshing = Boolean(refreshing);
        }
    }

    function logArbDetailRefreshError(error) {
        console.error('[arb-detail] refresh failed', error);
    }

    function clearArbDetailRefreshTimer() {
        arbDetailRefreshScheduler.clear();
    }

    function startArbDetailRefresh(refreshToken) {
        arbDetailRefreshScheduler.start(refreshToken);
    }

    function getArbGlobalFilterState() {
        return arbGlobalFilterStateRuntime.get();
    }

    function updateArbGlobalFilterState(patch) {
        const result = arbGlobalFilterStateRuntime.update(patch);
        if (!result.changed) return false;
        updateArbPanel();
        return true;
    }

    function handleArbGlobalFilterClear() {
        const result = arbGlobalFilterStateRuntime.clear();
        if (!result.changed) return;
        updateArbPanel();
        if (arbGlobalFilterInput) {
            arbGlobalFilterInput.focus();
        }
    }

    function buildRuleAlertEvaluation(target, alert = null, sharedRuleSnapshot = getSharedArbRuleSnapshot()) {
        if (target.ruleKind === 'fixed') {
            const rule = FIXED_PATH_RULES.find((item) => item.id === target.ruleId) || null;
            if (!rule) return { available: false };
            const cycles = sharedRuleSnapshot && sharedRuleSnapshot.fixedByRuleId
                ? sharedRuleSnapshot.fixedByRuleId[target.ruleId]
                : null;
            const nowMs = Date.now();
            const cycle = getArbPanelLayoutUtils().selectFirstUnmutedDisplayedCycle(cycles, (candidate) => {
                const muteTarget = candidate && Array.isArray(candidate.legs)
                    ? buildMutedPathTargetFromCycleLegs(candidate.legs)
                    : null;
                return Boolean(muteTarget && getMutedPathTargetEntry(muteTarget, nowMs));
            });
            return cycle
                ? { available: true, profitRate: cycle.profitRate, label: rule.title, cycle }
                : { available: false };
        }

        const rule = SPECIAL_ARB_RULES.find((item) => item.id === target.ruleId) || null;
        if (!rule) {
            return { available: false };
        }
        const opportunities = sharedRuleSnapshot && sharedRuleSnapshot.specialByRuleId
            ? sharedRuleSnapshot.specialByRuleId[target.ruleId]
            : null;
        const best = Array.isArray(opportunities) ? opportunities[0] : null;
        if (!best || !best.cycle) {
            return { available: false };
        }
        const specialRuleConfig = getSpecialRuleAlertConfigUtils().normalizeSpecialRuleAlertConfig(
            alert && alert.specialRuleConfig
        );
        const triggerEvaluation = getSpecialRuleAlertConfigUtils().evaluateSpecialRuleTrigger(best.stats, specialRuleConfig);
        const meetsTriggerCondition = triggerEvaluation.meetsTriggerCondition === true;
        return {
            available: true,
            profitRate: best.cycle.profitRate,
            label: rule.title,
            cycle: best.cycle,
            meetsTriggerCondition,
            debugComparison: triggerEvaluation,
            displayMessage: String(best.display_message || ''),
            alertMessage: String(best.alert_message || '')
        };
    }

    function getPathAlertNotificationUtils() {
        return getWindowModule('PathAlertNotificationUtils', 'PathAlertNotificationUtils is not loaded');
    }

    function buildQuoteAlertSummaryLabel(target) {
        const match = findQuoteById(Number(target && target.quoteId));
        const quote = match ? match.quote : null;
        const monitorState = quote ? getQuoteMarketState(Number(quote.id)) : null;
        return getPathAlertPageUtils().buildQuoteAlertSummaryLabel(target, quote, monitorState || {}, {
            buildQuoteAlertDisplayLabel,
            getQuoteAlertDirection: (item) => getPathAlertNotificationUtils().getQuoteAlertDirection(item)
        });
    }

    function buildPathAlertSummaryLines(alert) {
        return getPathAlertPageUtils().buildPathAlertPageSummaryLines(alert, {
            getDisplayTitle: (item) => String(item && item.name || '').trim(),
            buildQuoteAlertThresholdLine: (target) => getPathAlertNotificationUtils().buildQuoteAlertThresholdLine(target),
            buildQuoteAlertQuoteLabel: buildQuoteAlertSummaryLabel,
            buildQuoteAlertRuleLine: (target) => getPathAlertNotificationUtils().buildQuoteAlertSummaryRuleLine(target),
            buildPathAlertSummaryLines: (item, options) => getPathAlertUtils().buildPathAlertSummaryLines(item, options),
            formatLeg(leg) {
                const match = findQuoteById(Number(leg.quoteId));
                const state = match ? getQuoteMarketState(Number(leg.quoteId)) : null;
                return getPathAlertPageUtils().buildPathAlertSummaryLegLine(leg, state, {
                    buildQuoteLabel: buildLiveQuoteLabel
                });
            },
            findRule(ruleKind, ruleId) {
                const sourceList = getPathAlertRuleDefinitionsUtils().getRuleDefinitions(ruleKind);
                return sourceList.find((item) => item.id === ruleId) || null;
            }
        });
    }

    function buildPathAlertDisplayTitle(alert) {
        const name = String(alert && alert.name || '').trim();
        if (name) return name;
        const lines = buildPathAlertSummaryLines(alert);
        return lines[0] || (alert && alert.target && alert.target.type === 'quote' ? '交易对报警' : '未配置路径');
    }

    function getPathAlertPageUtils() {
        return getWindowModule('PathAlertPageUtils', 'PathAlertPageUtils is not loaded');
    }

    function buildPathAlertLegDisplayLine(leg) {
        return getPathAlertPageUtils().buildPathAlertLegDisplayLine(leg, {
            buildQuoteLabel: buildLiveQuoteLabel
        });
    }

    function buildMutedPathTargetFromCycleLegs(legs) {
        return getPathAlertNotificationUtils().buildMutedPathTargetFromCycleLegs(legs, { isRuleLeg });
    }

    function buildMutedPathTargetCandidate(alert, evaluation) {
        return getPathAlertNotificationUtils().buildMutedPathTargetCandidate(alert, evaluation, { isRuleLeg });
    }

    function getPathAlertRealLegCount(alert, evaluation) {
        return getPathAlertUtils().countPathAlertRealLegs(alert, evaluation);
    }

    async function sendPathAlertWebhookPayload(payload, errorMessage) {
        if (!pathAlertConfig.settings || pathAlertConfig.settings.webhookEnabled !== true) return;
        try {
            const response = await fetch(`${BACKEND_URL}/api/send-path-alert-webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error((data && data.error) || '请求失败');
            }
        } catch (error) {
            console.error(errorMessage, error);
        }
    }

    async function sendPathAlertWebhookNotification(triggeredEntries) {
        const payload = getPathAlertNotificationUtils().buildPathAlertWebhookPayload(triggeredEntries);
        await sendPathAlertWebhookPayload(payload, '路径报警 webhook 发送失败:');
    }

    function recordAlertDebug(kind, id, snapshot) {
        if (!alertDebugController || typeof alertDebugController.record !== 'function') return;
        alertDebugController.record(kind, id, snapshot);
    }

    function buildRuntimeDebugSnapshot(previous, next, evaluation) {
        return getAlertDebugUtils().buildRuntimeDebugSnapshot(previous, next, evaluation);
    }

    function buildTriggeredPathAlertEntry(alert, evaluation, changedLegs) {
        return getPathAlertNotificationUtils().buildTriggeredPathAlertEntry({
            alert,
            evaluation,
            changedLegs,
            buildDisplayTitle: buildPathAlertDisplayTitle,
            buildFallbackSummaryLines: buildPathAlertSummaryLines,
            buildMutedTargetCandidate: buildMutedPathTargetCandidate,
            formatCycleLeg: formatArbPathLegLine,
            formatChangedLeg: buildPathAlertLegDisplayLine,
            getRealLegCount: getPathAlertRealLegCount,
            isRuleLeg
        });
    }

    function sortTriggeredPathAlertEntries(entries) {
        return getPathAlertNotificationUtils().sortTriggeredPathAlertEntries(entries, {
            sortEntries: getPathAlertUtils().sortTriggeredPathAlerts,
            getRealLegCount: getPathAlertRealLegCount
        });
    }

    function evaluatePathAlertsOnce() {
        const evaluationAlerts = getActivePathAlertEvaluationAlerts();
        if (!evaluationAlerts.length) {
            pruneInactiveAlertRuntimeState();
            updateAlertSoundState();
            return;
        }
        pruneMutedPathTargetsInPlace(Date.now());
        const sharedRuleSnapshot = getSharedArbRuleSnapshot();
        const context = {
            quoteStateById: getQuoteMarketStateMap(),
            resolveRuleEvaluation(target, alert) {
                return buildRuleAlertEvaluation(target, alert, sharedRuleSnapshot);
            }
        };
        const pathAlertUtils = getPathAlertUtils();
        const allLegSnapshots = pathAlertUtils.buildAllLegSnapshots(sharedRuleSnapshot.allQuotes || [], getQuoteMarketStateMap());
        const nowMs = Date.now();
        const logTriggeredEntries = [];
        const remoteTriggeredEntries = [];
        let shouldRefreshArbPanelHighlights = false;

        for (const alert of evaluationAlerts) {
            const runtimeAlert = pathAlertUtils.buildEffectiveRuntimeAlert(alert, {
                forceImmediate: pathAlertRuntimeState.isForceImmediateEnabled()
            });
            const evaluation = pathAlertUtils.evaluatePathAlert(alert, context);
            const previous = pathAlertRuntimeState.get(alert.id);
            const next = pathAlertUtils.advancePathAlertRuntime(runtimeAlert, previous, evaluation, nowMs);
            const snapshotState = pathAlertUtils.resolvePathAlertSnapshotState(runtimeAlert, previous, next, evaluation, allLegSnapshots);
            next.evaluation = evaluation;
            const debugKind = alert && alert.target && alert.target.type === 'rule' && alert.target.ruleKind === 'special'
                ? 'special'
                : 'path';
            recordAlertDebug(
                debugKind,
                alert.id,
                buildRuntimeDebugSnapshot(previous, next, evaluation)
            );
            let isMuted = false;
            if (next.shouldTrigger) {
                const changedLegs = pathAlertUtils.buildTriggeredPathAlertChangedLegs(
                    snapshotState,
                    pathAlertConfig.settings
                );
                const triggeredEntry = buildTriggeredPathAlertEntry(alert, evaluation, changedLegs);
                const mutedEntry = triggeredEntry.mutedTargetCandidate
                    ? getMutedPathTargetEntry(triggeredEntry.mutedTargetCandidate, nowMs)
                    : null;
                if (mutedEntry) {
                    triggeredEntry.mutedEntry = mutedEntry;
                    isMuted = true;
                }
                if (markTriggeredArbOpportunities(alert, evaluation, nowMs)) {
                    shouldRefreshArbPanelHighlights = true;
                }
                logTriggeredEntries.push(triggeredEntry);
                if (!isMuted) {
                    remoteTriggeredEntries.push(triggeredEntry);
                }
            }
            next.isSoundActive = pathAlertUtils.shouldActivatePathAlertSound(next, {
                muted: isMuted,
                settings: pathAlertConfig.settings
            });
            pathAlertRuntimeState.set(alert.id, next);
        }

        pruneInactiveAlertRuntimeState();

        const sortedLogEntries = sortTriggeredPathAlertEntries(logTriggeredEntries).slice(0, 3);
        if (sortedLogEntries.length) {
            appendPathAlertLogEntries(sortedLogEntries, nowMs);
        }
        const aggregatedEntries = sortTriggeredPathAlertEntries(remoteTriggeredEntries).slice(0, 3);
        if (aggregatedEntries.length) {
            sendPathAlertWebhookNotification(aggregatedEntries);
        }

        updateAlertSoundState();
        if (shouldRefreshArbPanelHighlights) {
            updateArbPanel();
        }
        renderAlertSettingsPanel();
    }

    function restartPathAlertScheduler() {
        pathAlertSchedulerRuntime.restartEvaluation({
            hasActiveTarget: hasActivePathAlertEvaluationTarget,
            intervalMs: pathAlertConfig && pathAlertConfig.settings
                ? pathAlertConfig.settings.pathAlertEvalIntervalMs
                : 0,
            evaluate: evaluatePathAlertsOnce
        });
    }

    function emitPathAlertConfigSync(source) {
        try {
            const storage = getDashboardLocalStorage();
            if (storage) {
                const utils = getPathAlertUtils();
                storage.setItem(
                    utils.PATH_ALERT_CONFIG_SYNC_KEY,
                    utils.buildPathAlertConfigSyncPayload(source)
                );
            }
        } catch (error) {
            console.warn('[path-alert-config] sync emit failed', error);
        }
    }

    function scheduleExternalPathAlertReload(reason) {
        pathAlertSchedulerRuntime.scheduleExternalReload(() => {
            reloadPathAlertConfigFromServer().catch((error) => {
                console.error('[path-alert-config] external reload failed', reason, error);
            });
        });
    }

    function handlePathAlertConfigSyncStorage(event) {
        const utils = getPathAlertUtils();
        const action = utils.resolvePathAlertConfigSyncStorageAction(event, {
            localSource: utils.PATH_ALERT_CONFIG_SYNC_SOURCE_MAIN
        });
        if (action.type !== 'reload') return;
        if (action.invalidPayload) {
            console.warn('[path-alert-config] invalid sync payload', action.error);
        }
        scheduleExternalPathAlertReload(action.reason);
    }

    async function persistPathAlertConfig() {
        const normalized = getPathAlertUtils().normalizeAlertConfig(pathAlertConfig);
        pathAlertConfig = normalized;
        await fetch(`${BACKEND_URL}/api/save-alert-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(normalized)
        });
        restartPathAlertScheduler();
        renderAlertSettingsPanel();
        emitPathAlertConfigSync(getPathAlertUtils().PATH_ALERT_CONFIG_SYNC_SOURCE_MAIN);
    }

    function queuePathAlertConfigSave() {
        pathAlertSchedulerRuntime.scheduleConfigSave(() => {
            persistPathAlertConfig().catch((error) => console.error('保存路径报警配置失败:', error));
        });
    }

    function openPathAlertsManagementPage(options = {}) {
        const href = getPathAlertPageUtils().buildPathAlertsPageHref(options);
        window.open(href, '_blank', 'noopener');
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

    function applyAlertLogPanelDisplay(action) {
        return applyFloatingPanelDisplay(alertLogWindow, action, {
            render: renderAlertLogTabState,
            afterApply: syncMutedPathLogTimer
        });
    }

    function toggleAlertLogPanel() {
        applyAlertLogPanelDisplay('toggle');
    }

    function handleAlertLogClick(event) {
        const action = getAlertLogUiUtils().resolveAlertLogClickAction(event, { closestEventTarget });
        if (action.type === 'set-tab') {
            alertLogTabRuntime.set(action.tab);
            renderAlertLogTabState();
            return;
        }
        if (action.type === 'copy-quote-dex-link') {
            event.preventDefault();
            void copyDexLinkFromElement(action.element);
            return;
        }
        if (action.type === 'extend-muted-path-target') {
            extendMutedPathTargetByKey(action.key, Date.now());
            return;
        }
        if (action.type === 'restore-muted-path-target') {
            removeMutedPathTargetByKey(action.key, Date.now());
            return;
        }
        if (action.type === 'extend-muted-path-leg') {
            extendMutedPathLegByKey(action.key, Date.now());
            return;
        }
        if (action.type === 'restore-muted-path-leg') {
            removeMutedPathLegByKey(action.key, Date.now());
            return;
        }
        if (action.type === 'mute-alert-target') {
            if (extendMutedPathTargetFromLogButton(action.buttonEl, Date.now())) {
                return;
            }
            const alertId = action.alertId;
            if (!alertId) return;
            const runtime = pathAlertRuntimeState.get(alertId);
            if (!runtime || !runtime.evaluation) return;
            const alert = (pathAlertConfig.alerts || []).find((item) => item && item.id === alertId);
            if (!alert || !alert.target) return;
            if (alert.target.type === 'quote') {
                const quote = getDashboardRuntimeUtils().findDashboardQuoteById(dashboardState, alert.target.quoteId);
                if (!quote) return;
                const triggeredEntry = buildQuoteAlertTriggeredEntry(
                    alert,
                    quote,
                    runtime.evaluation
                );
                mutePathAlertTarget(triggeredEntry, Date.now());
                return;
            }
            const triggeredEntry = buildTriggeredPathAlertEntry(
                alert,
                runtime.evaluation,
                getPathAlertUtils().buildTriggeredPathAlertChangedLegs(
                    runtime,
                    pathAlertConfig.settings
                )
            );
            mutePathAlertTarget(triggeredEntry, Date.now());
            return;
        }
        if (action.type === 'ignore') return;
        if (action.type === 'expand-collapsed-card') {
            getAlertLogUiUtils().applyExpandedAlertLogCardDomState(action.card);
            return;
        }
    }

    function handleAlertSettingsChange(event) {
        const action = getAlertLogUiUtils().resolveAlertSettingsChangeAction(event, { closestEventTarget });
        if (action.type === 'set-force-immediate') {
            const forceImmediateEnabled = pathAlertRuntimeState.setForceImmediate(action.checked);
            if (forceImmediateEnabled) {
                evaluatePathAlertsOnce();
                evaluateQuoteAlertsOnce();
                renderAlertSettingsPanel();
                return;
            }
            reloadPathAlertConfigFromServer().catch((error) => {
                console.error('关闭全部立即后重新加载路径报警配置失败:', error);
            });
            return;
        }
        if (action.type !== 'set-global-toggle' || !pathAlertConfig.settings) return;
        pathAlertConfig.settings[action.key] = action.checked;
        queuePathAlertConfigSave();
        updateAlertSoundState();
        renderAlertSettingsPanel();
    }

    async function reloadPathAlertConfigFromServer() {
        if (pathAlertReloading) return;
        pathAlertReloading = true;
        renderAlertSettingsPanel();
        try {
            pathAlertRuntimeState.reset({ forceImmediate: false });
            pathAlertConfig = await pathAlertConfigClient.loadStrict();
            restartPathAlertScheduler();
        } finally {
            pathAlertReloading = false;
            renderAlertSettingsPanel();
        }
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
        const globalCycles = filterMutedArbCycles(topologyCache.globalTemplates
            .map((template) => templateUtils.evaluateCycleTemplate(template, getQuoteMarketStateMap()))
            .filter(Boolean)
            .sort((left, right) => Number(right.profitRate) - Number(left.profitRate)));
        const layoutUtils = getArbPanelLayoutUtils();
        const filterCriteria = layoutUtils.buildGlobalArbFilterCriteria(getArbGlobalFilterState(), {
            normalizeChainFilterToken: (chainToken) => getChainDefaults().normalizeChainFilterToken(chainToken)
        });
        updateGlobalArbFilterBar();
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
        if (!options.force && !isArbPanelVisible()) {
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

    function getQuoteRequestUtils() {
        return getWindowModule('QuoteRequestUtils', 'QuoteRequestUtils is not loaded');
    }

    async function apiGetQuote(quote, signal, targetSource) {
        const quoteRequestUtils = getQuoteRequestUtils();
        const resolvedConfig = quoteRequestUtils.resolveQuoteRequestConfig(targetSource, quote);
        return quoteRequestUtils.requestResolvedQuote({
            backendUrl: BACKEND_URL,
            fetchImpl: fetch,
            quote,
            signal,
            resolvedConfig,
            buildCexSummary: (symbol, orderbook) => getQuoteDisplayUtils().buildCexOrderbookSummary(symbol, orderbook)
        });
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function fetchQuoteByStrategy(quote, options = {}) {
        const signal = options.signal;
        const beforeSourceAttempt = typeof options.beforeSourceAttempt === 'function'
            ? options.beforeSourceAttempt
            : null;
        const quoteRequestUtils = getQuoteRequestUtils();
        const requestInput = quoteRequestUtils.buildQuoteRequestInput(quote, {
            amount: options.amount,
            requestChannelId: options.requestChannelId,
            defaultRequestChannelId: getEffectiveRequestChannelIdForQuote(quote),
            isInverseFetch: options.isInverseFetch
        });
        const { requestQuote, isInverseFetch } = requestInput;
        const strategy = getChainDefaults().buildQuoteStrategy(quote);
        let fetchError = null;
        let successSource = null;
        let data = null;

        for (const source of strategy) {
            try {
                if (quoteRequestUtils.shouldSkipQuoteSource(source, quote)) continue;

                if (beforeSourceAttempt) {
                    await beforeSourceAttempt(source, requestQuote);
                }

                if (quoteRequestUtils.shouldDelayQuoteSource(source, strategy, {
                    skipDelay: options.skipDelay
                })) {
                    await sleep(600);
                }

                arbDetailSourceBudgetRuntime.recordTimestamp(source);
                data = await apiGetQuote(requestQuote, signal, source);
                if (data) {
                    successSource = source;
                    data = quoteRequestUtils.applyAutoFallbackSourceLabel(data, quote, source, { isInverseFetch });
                    break;
                }
            } catch (error) {
                if (error.name === 'AbortError') throw error;
                fetchError = error;
                console.warn(`${quote.chain} Quote Fetch Failed [${source}]:`, error.message);
            }
        }

        if (!data) {
            throw fetchError || new Error('All strategies failed');
        }

        return { data, successSource };
    }

    async function fetchSingleQuote(quote, fetchMode = 'main') {
        const quoteDataEl = document.getElementById(`quote-data-${quote.id}`);
        const quoteTextWrapperEl = document.getElementById(`quote-text-wrapper-${quote.id}`);
        const quoteTextEl = document.getElementById(`quote-text-${quote.id}`);
        if (!quoteDataEl || !quoteTextEl) return;
        if (isQuotePaused(quote)) {
            const previousState = getQuoteMarketState(quote.id) || {};
            resetQuoteUiRuntimeState(quote.id);
            applyPausedQuoteUiState(quote, previousState);
            return;
        }
        const isInverseFetch = fetchMode === 'inverse' && shouldQueueInverseFetch(quote);

        const controller = activeFetchControllerRuntime.create(quote.id);
        const signal = controller ? controller.signal : null;

        if (!isInverseFetch) {
            getDomRenderUtils().clearQuoteDataError(quoteDataEl);
        }

        try {
            const { data, successSource } = await fetchQuoteByStrategy(quote, {
                signal,
                isInverseFetch
            });

            const previousState = getQuoteMarketState(quote.id) || {};
            const inverseContainerId = `inverse-quote-${quote.id}`;
            let inverseEl = document.getElementById(inverseContainerId);

            if (isInverseFetch) {
                if (shouldQueueInverseFetch(quote)) {
                    const inverseFallbackText = `${quote.amount || 1} ${data.symbols.from} ≈ ${data.finalAmountOut.toFixed(6)} ${data.symbols.to}`;
                    const inverseState = getDashboardRuntimeUtils().buildQuoteResultMarketState(
                        previousState,
                        data,
                        { isInverseFetch: true }
                    );
                    setQuoteMarketState(quote.id, inverseState);
                    inverseEl = getDomRenderUtils().applyQuoteInverseResultDomState({
                        quoteDataEl,
                        inverseEl
                    }, {
                        id: inverseContainerId,
                        documentImpl: document,
                        text: getInverseQuoteDisplayText(quote, inverseState, inverseFallbackText)
                    });
                    if (inverseEl) {
                        bindCopyHandler(
                            inverseEl,
                            () => inverseEl.textContent
                        );
                    }
                }
            } else {
                const oldPrice = previousState.lastRawPrice;
                const oldSource = previousState.usedSourceReal;

                const newState = getDashboardRuntimeUtils().buildQuoteResultMarketState(
                    previousState,
                    data,
                    { successSource }
                );

                const quoteDisplayText = getQuoteDisplayText(quote, newState);
                getDomRenderUtils().applyQuoteMainResultDomState({
                    quoteTextEl,
                    quoteTextWrapperEl
                }, {
                    text: quoteDisplayText
                });
                updateQuotePairLabel(quote, newState);

                if (shouldQueueInverseFetch(quote)) {
                    const inverseQueuedText = Number.isFinite(Number(newState.inverseRawPrice))
                        ? getInverseQuoteDisplayText(quote, newState, inverseEl && inverseEl.textContent || '反向报价排队中...')
                        : '反向报价排队中...';
                    inverseEl = getDomRenderUtils().applyQuoteInverseQueuedDomState({
                        quoteDataEl,
                        inverseEl
                    }, {
                        id: inverseContainerId,
                        documentImpl: document,
                        text: inverseQueuedText
                    });
                } else {
                    getDomRenderUtils().removeQuoteInverseElement(inverseEl);
                    newState.inverseRawPrice = null;
                    newState.inverseTotalAmountOut = null;
                    newState.inverseFromSymbol = null;
                    newState.inverseToSymbol = null;
                }

                const marketStateChanged = setQuoteMarketState(quote.id, newState);
                if (marketStateChanged) {
                    scheduleArbUpdate();
                    dataTerminalUpdateRuntime.schedule();
                }
                
                updateTrendArrow(quote.id, data.rawPrice, oldPrice, successSource, oldSource);
                checkPriceForAlerts(quote);
            }
            
        } catch (error) {
            if (error.name === 'AbortError') return; 
            const quoteRequestUtils = getQuoteRequestUtils();
            const errorTitle = quoteRequestUtils.buildQuoteErrorTitle(error);

            if (isInverseFetch) {
                let inverseEl = document.getElementById(`inverse-quote-${quote.id}`);
                if (shouldQueueInverseFetch(quote)) {
                    getDomRenderUtils().applyQuoteInverseErrorDomState({
                        quoteDataEl,
                        inverseEl
                    }, {
                        id: `inverse-quote-${quote.id}`,
                        documentImpl: document,
                        title: errorTitle
                    });
                }
            } else {
                const displayMsg = quoteRequestUtils.formatQuoteErrorMessage(error);
                getDomRenderUtils().applyQuoteMainErrorDomState({
                    quoteDataEl,
                    quoteTextEl,
                    quoteTextWrapperEl
                }, {
                    message: displayMsg,
                    title: errorTitle
                });
            }
        } finally {
            activeFetchControllerRuntime.deleteIfCurrent(quote.id, controller);
        }
    }

    function getCopyUtils() {
        return getWindowModule('CopyUtils', 'CopyUtils is not loaded');
    }

    async function copyTextToClipboard(text) {
        try {
            await getCopyUtils().copyTextToClipboard(text);
        } catch (error) {
            console.warn('Clipboard write failed', error);
            throw error;
        }
    }

    async function copyDexLinkFromElement(targetEl) {
        return getCopyUtils().copyDexLinkFromElement(targetEl, {
            buildDexLink: (config) => getDexLinkUtils().buildDexLink(config),
            copyText: (text) => copyTextToClipboard(text),
            showToast: (message) => showCopyToast(message)
        });
    }

    function closestEventTarget(event, selector) {
        return getDomRenderUtils().closestEventTarget(event, selector);
    }

    function bindCopyHandler(targetEl, getText) {
        getCopyUtils().bindCopyPriceHandler(targetEl, {
            getText,
            extractPrice: (text) => getQuoteDisplayUtils().extractPriceFromText(text),
            copyText: (text) => copyTextToClipboard(text),
            showToast: (message) => showCopyToast(message)
        });
    }

    function showCopyToast(message) {
        copyToastRuntime.show(copyToast, message);
    }

    function handleQuoteHover(event, quoteId) {
        const textWrapper = event.currentTarget;
        const state = getQuoteMarketState(quoteId);
        const category = dashboardState.find(c => c.quotes && c.quotes.some(q => q.id === quoteId));
        const quote = category ? category.quotes.find(q => q.id === quoteId) : null;
        
        if (!quote) return; 

        textWrapper.onmouseleave = () => {
            quoteHoverRuntime.hide(quoteId, () => {
                getDomRenderUtils().hideTooltip(globalTooltip);
            });
        };
        
        quoteHoverRuntime.schedule(quoteId, () => {
            const tooltipState = getQuoteDisplayUtils().buildQuoteHoverTooltipState(quote, state, { isEvmChain });
            if (!tooltipState) return;
            getDomRenderUtils().showTooltip(globalTooltip, textWrapper, tooltipState.html, {
                className: tooltipState.className
            });
        });
    }

    function updateTrendArrow(quoteId, currentPrice, oldPrice, currentSource, oldSource) {
        const arrowEl = document.getElementById(`trend-arrow-${quoteId}`);
        if (!arrowEl) return;

        const trendState = getQuoteDisplayUtils().buildQuoteTrendArrowState(currentPrice, oldPrice, currentSource, oldSource);
        if (!trendState) return;

        getDomRenderUtils().applyTrendArrowState(arrowEl, trendState);
        if (trendState.action === 'hide') return;

        quoteStateRuntime.scheduleTrendTimer(quoteId, () => {
            getDomRenderUtils().applyTrendArrowState(arrowEl, { action: 'hide' });
        }, {
            setTimeout,
            clearTimeout,
            delayMs: 30000
        });
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
            arbDetailVisible: arbDetailState.visible
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
                if (alertLogWindow) {
                    alertLogTabRuntime.set('settings');
                    applyAlertLogPanelDisplay('open');
                }
                break;
            case 'toggle-alert-log':
                toggleAlertLogPanel();
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
        return getQuoteDisplayUtils().buildQuoteAlertDisplayLabel(quote, monitorState, direction);
    }

    function evaluateQuoteAlertsOnce() {
        for (const quote of dashboardState.flatMap((category) => Array.isArray(category && category.quotes) ? category.quotes : [])) {
            checkPriceForAlerts(quote);
        }
    }

    function playPathAlertSoundOnce() {
        if (pathAlertConfig?.settings?.localSoundEnabled === false) {
            console.info('[quote-alert] sound skipped: local sound disabled');
            return;
        }
        if (!pathAlertSound) {
            console.warn('[quote-alert] sound skipped: path alert audio element missing');
            return;
        }
        if (!alertAudioRuntime.isUnlocked()) {
            console.warn('[quote-alert] sound skipped: audio not unlocked');
            return;
        }
        getAudioUtils().playAudioOnceFromSource(pathAlertSound, {
            AudioCtor: Audio,
            logPlayError: (error) => console.error('[quote-alert] sound play failed', error)
        });
    }

    function triggerAlert(quote, alert, evaluation) {
        const entry = buildQuoteAlertTriggeredEntry(alert, quote, evaluation);
        const mutedEntry = entry.mutedTargetCandidate
            ? getMutedPathTargetEntry(entry.mutedTargetCandidate, Date.now())
            : null;
        console.info('[quote-alert] trigger', {
            quoteId: quote.id,
            chain: entry.displayName,
            label: entry.label,
            message: entry.message,
            currentValueText: entry.currentValueText,
            muted: Boolean(mutedEntry)
        });
        if (mutedEntry) {
            entry.mutedEntry = mutedEntry;
        }
        appendQuoteAlertLogEntry(entry, Date.now());
        if (mutedEntry) {
            console.info('[quote-alert] muted trigger skipped', {
                alertId: alert && alert.id,
                quoteId: quote.id
            });
            return;
        }
        playPathAlertSoundOnce();
        sendQuoteWebhookNotification(entry);
    }

    function checkPriceForAlerts(quote) {
        if (isQuotePaused(quote)) return;

        const uiState = quoteStateRuntime.getUiState(quote.id);
        const quoteAlerts = getPathAlertUtils().getQuoteAlertsForQuoteId(pathAlertConfig, quote.id);
        const itemEl = document.getElementById(`quote-item-${quote.id}`);
        const resultDiv = itemEl ? itemEl.querySelector('.quote-result') : null;
        let hasTriggeredThisTick = false;

        for (const alert of quoteAlerts) {
            const pathAlertUtils = getPathAlertUtils();
            const previous = pathAlertRuntimeState.get(alert.id);
            const evaluation = pathAlertUtils.evaluatePathAlert(alert, { quoteStateById: getQuoteMarketStateMap() });
            const next = pathAlertUtils.advanceQuoteAlertRuntime(alert, previous, evaluation, {
                forceImmediate: pathAlertRuntimeState.isForceImmediateEnabled(),
                nowMs: Date.now()
            });
            pathAlertRuntimeState.set(alert.id, next);
            recordAlertDebug(
                'quote',
                alert.id,
                buildRuntimeDebugSnapshot(previous, next)
            );

            if (!next.shouldTrigger) continue;
            hasTriggeredThisTick = true;
            triggerAlert(quote, alert, evaluation);
        }

        const uiUpdate = getDashboardRuntimeUtils().buildQuoteAlertUiUpdate(uiState, hasTriggeredThisTick);
        getDomRenderUtils().applyQuoteAlertHighlightUi(itemEl, uiUpdate);

        setQuoteUiState(quote.id, uiUpdate.nextState);
        getDomRenderUtils().applyQuoteAlertDismissButtonState(resultDiv, uiUpdate.nextState, quote.id, { documentImpl: document });
        updateAlertSoundState();
    }

    async function sendQuoteWebhookNotification(entry) {
        const payload = getPathAlertNotificationUtils().buildQuoteAlertRemotePayloadForEntry(entry);
        await sendPathAlertWebhookPayload(payload, '报价提醒远程推送失败:');
    }

    function addDnDHandlers(itemEl, categoryId) {
        itemEl.draggable = true;
        
        itemEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({
                quoteId: itemEl.id.replace('quote-item-', ''),
                categoryId: categoryId
            }));
            itemEl.classList.add('dragging');
        });

        itemEl.addEventListener('dragend', (e) => {
            itemEl.classList.remove('dragging');
            document.querySelectorAll('.quote-item').forEach(el => el.classList.remove('drag-over'));
        });
        
        itemEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!itemEl.classList.contains('dragging')) {
                itemEl.classList.add('drag-over');
            }
            e.dataTransfer.dropEffect = 'move';
        });

        itemEl.addEventListener('dragleave', (e) => {
            itemEl.classList.remove('drag-over');
        });

        itemEl.addEventListener('drop', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            itemEl.classList.remove('drag-over');
            
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const draggedId = parseInt(data.quoteId);
            const sourceCatId = parseInt(data.categoryId);
            const targetCatId = parseInt(categoryId);
            const targetQuoteId = parseInt(itemEl.id.replace('quote-item-', ''));

            if (sourceCatId !== targetCatId) return;
            if (draggedId === targetQuoteId) return;

            const category = dashboardState.find(c => c.id === targetCatId);
            if (!category) return;

            const fromIndex = category.quotes.findIndex(q => q.id === draggedId);
            const toIndex = category.quotes.findIndex(q => q.id === targetQuoteId);

            if (fromIndex > -1 && toIndex > -1) {
                const [movedQuote] = category.quotes.splice(fromIndex, 1);
                category.quotes.splice(toIndex, 0, movedQuote);

                const listEl = document.getElementById(`quote-list-${targetCatId}`);
                const draggedNode = document.getElementById(`quote-item-${draggedId}`);
                const targetNode = document.getElementById(`quote-item-${targetQuoteId}`);

                if (draggedNode && targetNode) {
                    if (fromIndex < toIndex) {
                        listEl.insertBefore(draggedNode, targetNode.nextSibling);
                    } else {
                        listEl.insertBefore(draggedNode, targetNode);
                    }
                }
                
                saveData();
            }
        });
    }

    function createQuoteItem(quote, categoryId) {
        const displayName = getQuoteChainDisplayName(quote);
        const monitorState = getQuoteMarketState(quote.id) || {};
        const lastResultText = getQuoteDisplayText(quote, monitorState);
        const initialAmount = quote.amount || 1;
        const amountInputHTML = !isCexOrderbookChain(quote.chain) ? `<input type="number" class="amount-input" value="${initialAmount}" step="any" min="0" data-category-id="${categoryId}" data-quote-id="${quote.id}">` : '';
        const quoteTextClassName = isCexOrderbookChain(quote.chain) ? 'quote-text cex-orderbook-summary' : 'quote-text';
        const pairLabelHtml = `<span class="quote-pair-label" id="quote-pair-label-${quote.id}">${getQuoteDisplayUtils().buildQuotePairLabelHtml(quote, monitorState)}</span>`;
        const requestChannel = getRequestChannelUtils().getRequestChannelDisplayForQuote(quote, requestChannelOptions);
        const requestChannelTagHtml = getRequestChannelUtils().buildRequestChannelTagHtml(quote, requestChannel);
        const renderer = getDashboardRenderer();

        const itemEl = renderer.createQuoteItemShellElement({
            quoteId: quote.id,
            categoryId,
            displayName,
            requestChannelTagHtml,
            pairLabelHtml,
            amountInputHtml: amountInputHTML,
            quoteTextClassName,
            lastResultText,
            paused: isQuotePaused(quote)
        }, { documentImpl: document });
        if (!itemEl) return null;
        
        addDnDHandlers(itemEl, categoryId);

        const labelStackEl = itemEl.querySelector('.quote-label-stack');
        const dexLinkConfig = {
            chain: quote.chain,
            fromTokenAddress: quote.fromToken,
            toTokenAddress: quote.toToken,
            inputAmount: quote.amount
        };
        const dexLinkLabel = isCrossChainQuote(quote) ? null : getDexLinkUtils().getDexLinkLabel(dexLinkConfig);
        if (labelStackEl && dexLinkLabel) {
            labelStackEl.classList.add('quote-dex-link-target');
            labelStackEl.dataset.dexLinkCopy = '1';
            labelStackEl.dataset.dexLinkLabel = dexLinkLabel;
            labelStackEl.dataset.dexLinkChain = quote.chain || '';
            labelStackEl.dataset.dexLinkFromTokenAddress = quote.fromToken || '';
            labelStackEl.dataset.dexLinkToTokenAddress = quote.toToken || '';
            const inputAmount = Number(quote.amount);
            if (Number.isFinite(inputAmount) && inputAmount > 0) {
                labelStackEl.dataset.dexLinkInputAmount = String(inputAmount);
            }
            labelStackEl.title = `点击复制 ${dexLinkLabel} 链接`;
            labelStackEl.setAttribute('draggable', 'false');
            labelStackEl.addEventListener('mousedown', (event) => event.stopPropagation());
            labelStackEl.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                void copyDexLinkFromElement(labelStackEl);
            });
        }

        const textWrapper = itemEl.querySelector('.quote-text-wrapper');
        if (textWrapper) {
            textWrapper.addEventListener('mouseenter', (e) => handleQuoteHover(e, quote.id));
            textWrapper.addEventListener('mousedown', (e) => e.stopPropagation());
            textWrapper.setAttribute('draggable', 'false'); 
            const quoteTextEl = itemEl.querySelector(`#quote-text-${quote.id}`);
            bindCopyHandler(
                textWrapper,
                () => (quoteTextEl ? quoteTextEl.textContent : textWrapper.textContent)
            );
        }
        
        return itemEl;
    }
    
    function createCategoryModule(category) {
        const categoryPauseAction = getCategoryPauseAction(category.quotes || []);
        const renderer = getDashboardRenderer();
        const moduleEl = renderer.createCategoryModuleShellElement({
            categoryId: category.id,
            categoryName: category.name,
            categoryPauseAction
        }, { documentImpl: document });
        if (!moduleEl) return null;
        const quoteListEl = moduleEl.querySelector('.quote-list');
        if (category.quotes) {
            category.quotes.forEach(quote => {
                const quoteItemEl = createQuoteItem(quote, category.id);
                if (quoteItemEl) quoteListEl.appendChild(quoteItemEl);
            });
        }
        return moduleEl;
    }

    function renderDashboard() {
        dashboardEl.innerHTML = '';
        if (!Array.isArray(dashboardState)) {
            console.error("Dashboard state is not an array:", dashboardState);
            return;
        }
        dashboardState.forEach(category => {
            const moduleEl = createCategoryModule(category);
            if (moduleEl) dashboardEl.appendChild(moduleEl);
        });
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
        invalidateArbCaches();
    }

    async function loadRequestChannels() {
        requestChannelPayload = await dashboardApiClient.loadRequestChannels();
        refreshRequestChannelOptions();
        dashboardState.forEach((category) => {
            (category.quotes || []).forEach((quote) => updateRequestChannelTagForQuote(quote));
        });
    }

    function syncKyberOnlyDirectPoolsControl(quote, selectedSource) {
        const shouldShow = Boolean(
            quote
            && isEvmChain(quote.chain)
            && quote.chain.toLowerCase() !== 'plasma'
            && (selectedSource === 'Kyber' || selectedSource === 'Auto')
        );
        getDashboardModalUtils().applyKyberDirectPoolsControlVisibility(quoteSettingsModalElements, shouldShow);
    }

    manualSaveBtn.addEventListener('click', () => { performSave(true); });
    
    themeToggleBtn.addEventListener('click', () => { themeRuntime.toggle(); });

    function openAddCategoryModal() {
        getDashboardModalUtils().openAddCategoryModal(addCategoryModalRefs);
    }

    function closeAddCategoryModal() {
        getDashboardModalUtils().closeAddCategoryModal(addCategoryModalRefs);
    }

    addCategoryBtn.addEventListener('click', openAddCategoryModal);

    function handleDashboardInput(event) {
        const action = getDashboardRenderer().resolveDashboardAmountInputAction(event, { closestEventTarget });
        if (action.type !== 'update-amount') return;
        const category = dashboardState.find(c => c.id == action.categoryId);
        if (!category) return;
        const quote = category.quotes.find(q => q.id == action.quoteId);
        if (!quote) return;

        amountInputDebounceRuntime.schedule(action.quoteId, () => {
            quote.amount = action.amount;
            renderDataTerminalPanel();
            if (!isQuotePaused(quote)) {
                queueQuoteRefresh(quote);
            }
            saveData();
        });
    }

    dashboardEl.addEventListener('input', handleDashboardInput);

    function showConfirmation(message, callback) {
        confirmActionRuntime.show(confirmModalRefs, message, callback);
    }

    function deleteQuoteFromCategory(categoryId, quoteId) {
        const category = dashboardState.find(c => c.id == categoryId);
        const quoteIndex = category ? category.quotes.findIndex(q => q.id == quoteId) : -1;
        if (quoteIndex === -1) return false;

        const quoteToDelete = category.quotes[quoteIndex];
        removeFromQueue(quoteToDelete.id);
        category.quotes.splice(quoteIndex, 1);

        const quoteItem = document.getElementById(`quote-item-${quoteId}`);
        if (quoteItem) quoteItem.remove();

        deleteQuoteMarketState(quoteId);
        deleteQuoteUiRuntimeState(quoteId);
        updateCategoryPauseButtonState(categoryId);
        updateAlertSoundState();
        renderDataTerminalPanel();
        saveData();
        return true;
    }

    function syncPauseLinkedViews() {
        updateArbPanel();
        renderDataTerminalPanel();
        evaluatePathAlertsOnce();
    }

    function setQuotePausedState(categoryId, quote, nextPaused, options = {}) {
        if (!quote || isQuotePaused(quote) === nextPaused) return false;

        const shouldSync = options.sync !== false;
        const shouldSave = options.save !== false;
        const quoteId = quote.id;
        quote.paused = nextPaused;

        amountInputDebounceRuntime.clear(quoteId);

        if (nextPaused) {
            const previousState = getQuoteMarketState(quoteId) || {};
            removeFromQueue(quoteId);
            abortQuoteFetch(quoteId);
            setQuoteMarketState(quoteId, getQuotePauseUtils().buildPausedQuoteState(previousState));
            resetQuoteUiRuntimeState(quoteId);
            applyPausedQuoteUiState(quote, getQuoteMarketState(quoteId) || {});
            updateSchedulers();
            if (getArbDetailUtils().doesArbDetailUseQuote(arbDetailState.selectedOpportunity, quoteId)) {
                closeArbDetailModal();
            }
        } else {
            queueQuoteRefresh(quote);
        }

        updateCategoryPauseButtonState(categoryId);
        if (shouldSync) {
            updateAlertSoundState();
            syncPauseLinkedViews();
        }
        if (shouldSave) {
            saveData();
        }
        return true;
    }

    function toggleQuotePause(categoryId, quoteId, options = {}) {
        const category = dashboardState.find((item) => item.id == categoryId);
        if (!category) return false;
        const quote = category.quotes.find((item) => item.id == quoteId);
        if (!quote) return false;
        return setQuotePausedState(categoryId, quote, !isQuotePaused(quote), options);
    }

    function toggleCategoryPause(categoryId) {
        const category = dashboardState.find((item) => item.id == categoryId);
        if (!category || !Array.isArray(category.quotes) || category.quotes.length === 0) {
            updateCategoryPauseButtonState(categoryId);
            return false;
        }

        const action = getCategoryPauseAction(category.quotes);
        const nextPaused = action === 'pause';
        let changed = false;

        category.quotes.forEach((quote) => {
            if (isQuotePaused(quote) === nextPaused) return;
            if (setQuotePausedState(categoryId, quote, nextPaused, { sync: false, save: false })) {
                changed = true;
            }
        });

        updateCategoryPauseButtonState(categoryId);
        if (!changed) return false;

        updateAlertSoundState();
        syncPauseLinkedViews();
        saveData();
        return true;
    }

    function swapQuoteTokens(categoryId, quoteId) {
        const category = dashboardState.find(c => c.id == categoryId);
        if (!category) return false;
        const quote = category.quotes.find(q => q.id == quoteId);
        if (!quote || isCexOrderbookChain(quote.chain) || isCrossChainQuote(quote)) return false;

        [quote.fromToken, quote.toToken] = [quote.toToken, quote.fromToken];

        const state = getQuoteMarketState(quoteId);
        if (state) {
            const nextState = getDashboardRuntimeUtils().buildSwappedQuoteMarketState(state);

            const arrowEl = document.getElementById(`trend-arrow-${quoteId}`);
            getDomRenderUtils().resetTrendArrow(arrowEl);

            const quoteItemEl = document.getElementById(`quote-item-${quoteId}`);
            getDomRenderUtils().clearQuoteHighlightUi(quoteItemEl);
            setQuoteMarketState(quoteId, nextState);
        }
        resetQuoteUiRuntimeState(quoteId);
        updateAlertSoundState();

        getDomRenderUtils().applyQuoteSwitchingDomState({
            ...getDomRenderUtils().getQuoteDomRefs(document, quoteId),
            inverseEl: document.getElementById(`inverse-quote-${quoteId}`)
        });

        saveData();
        removeFromQueue(quote.id);
        queueQuoteRefresh(quote);
        renderDataTerminalPanel();
        return true;
    }

    function openQuoteSettingsModal(categoryId, quoteId) {
        const category = dashboardState.find(c => c.id == categoryId);
        if (!category) return false;
        const quote = category.quotes.find(q => q.id == quoteId);
        if (!quote) return false;
        quoteSettingsSelectionRuntime.set({ quote, categoryId });
        const monitorState = getQuoteMarketState(quote.id) || {};
        const modalState = getDashboardRenderer().buildQuoteSettingsModalViewState({
            quote,
            monitorState,
            isCexOrderbookChain,
            isCrossChainQuote,
            isEvmChain,
            getQuoteChainDisplayName,
            getSingleChainDisplayName: formatChainLabel
        });
        const writePlan = getDashboardRenderer().buildQuoteSettingsModalWritePlan(modalState);
        getDashboardModalUtils().applyQuoteSettingsModalWritePlan(quoteSettingsModalElements, writePlan);
        syncKyberOnlyDirectPoolsControl(quote, writePlan.kyberOnlyDirectPoolsSource);

        if (getRequestChannelUtils().supportsRequestChannelForQuote(quote)) {
            const currentChannelId = getRequestChannelUtils().resolveRequestChannelIdForQuote(quote, requestChannelOptions);
            getDashboardModalUtils().applyQuoteRequestChannelOptionsState(quoteSettingsModalElements, {
                visible: true,
                optionsHtml: getRequestChannelUtils().buildRequestChannelOptionsHtml(requestChannelOptions.channels || []),
                value: currentChannelId
            });
        } else {
            getDashboardModalUtils().applyQuoteRequestChannelOptionsState(quoteSettingsModalElements, {
                visible: false
            });
        }

        getDashboardModalUtils().showModal(alertModal);
        return true;
    }

    function closeQuoteSettingsModal() {
        getDashboardModalUtils().hideModal(alertModal);
        quoteSettingsSelectionRuntime.clear();
    }

    function deleteCategoryFromDashboard(categoryId) {
        const categoryIndex = dashboardState.findIndex(c => c.id == categoryId);
        if (categoryIndex === -1) return false;
        showConfirmation(`确定删除分区 "${dashboardState[categoryIndex].name}" 吗？`, () => {
            (dashboardState[categoryIndex].quotes || []).forEach(q => {
                removeFromQueue(q.id);
                deleteQuoteMarketState(q.id);
                deleteQuoteUiRuntimeState(q.id);
            });
            updateAlertSoundState();
            dashboardState.splice(categoryIndex, 1);
            const moduleEl = document.getElementById(`module-${categoryId}`);
            if (moduleEl) moduleEl.remove();
            renderDataTerminalPanel();
            saveData();
        });
        return true;
    }

    function handleDashboardClick(event) {
        const action = getDashboardRenderer().resolveDashboardButtonClickAction(event, { closestEventTarget });
        if (action.type === 'dismiss-highlight') {
            setQuoteUiState(action.quoteId, {
                hasUnreadAlert: false
            });
            const quoteItemEl = document.getElementById(`quote-item-${action.quoteId}`);
            getDomRenderUtils().clearQuoteHighlightUi(quoteItemEl);
            return;
        }
        if (action.type === 'toggle-category-pause') {
            toggleCategoryPause(action.categoryId);
            return;
        }
        if (action.type === 'toggle-quote-pause') {
            toggleQuotePause(action.categoryId, action.quoteId);
            return;
        }
        if (action.type === 'edit-quote') {
            openQuoteSettingsModal(action.categoryId, action.quoteId);
            return;
        }
        if (action.type === 'delete-quote') {
            showConfirmation('确定删除此报价吗？', () => {
                deleteQuoteFromCategory(action.categoryId, action.quoteId);
            });
            return;
        }
        if (action.type === 'delete-category') {
            deleteCategoryFromDashboard(action.categoryId);
            return;
        }
        if (action.type === 'add-quote') {
            addQuoteModalSelectionRuntime.set(action.categoryId);
            getDashboardModalUtils().showModal(addQuoteModal);
            return;
        }
        if (action.type === 'swap-quote') {
            swapQuoteTokens(action.categoryId, action.quoteId);
        }
    }

    dashboardEl.addEventListener('click', handleDashboardClick);

    alertModal.addEventListener('click', (e) => {
        const action = getDashboardRenderer().resolveQuoteSettingsModalClickAction(e, { modal: alertModal });
        if (action.type === 'close') {
            closeQuoteSettingsModal();
            return;
        }

        const editingQuote = quoteSettingsSelectionRuntime.get();
        if (!editingQuote || !editingQuote.quote) return;
        if (action.type === 'swap') {
            swapQuoteTokens(editingQuote.categoryId, editingQuote.quote.id);
        } else if (action.type === 'delete') {
            const { categoryId, quote } = editingQuote;
            closeQuoteSettingsModal();
            showConfirmation('确定删除此报价吗？', () => {
                deleteQuoteFromCategory(categoryId, quote.id);
            });
        } else if (action.type === 'manage-alerts') {
            openPathAlertsManagementPage({
                filterQuoteId: editingQuote.quote.id
            });
        } else if (action.type === 'save') {
            const { quote } = editingQuote;
            const values = getDashboardModalUtils().readQuoteSettingsFormValues(quoteSettingsModalElements);
            const formValues = {
                ...values,
                sourceValue: values.sourceValue || (quote ? quote.preferredSource : '')
            };
            const updatePlan = getDashboardRenderer().buildQuoteSettingsUpdatePlan({
                quote,
                sourceValue: formValues.sourceValue,
                kyberOnlyDirectPools: formValues.kyberOnlyDirectPools,
                showInverse: formValues.showInverse,
                requestChannelEnabled: getRequestChannelUtils().supportsRequestChannelForQuote(quote) && Boolean(quoteRequestChannelSelect),
                requestChannelId: formValues.requestChannelId,
                isCrossChainQuote,
                isEvmChain
            });
            Object.assign(quote, updatePlan.updates);
            updatePlan.deletes.forEach((key) => { delete quote[key]; });
            if (updatePlan.requestChannelChanged) {
                updateRequestChannelTagForQuote(quote);
            }

            if (updatePlan.shouldQueueRefreshQuote) {
                removeFromQueue(quote.id);
                queueQuoteRefresh(quote);
            }

            saveData();
            closeQuoteSettingsModal();
        }
    });

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

    if (quoteSourceSelect) {
        quoteSourceSelect.addEventListener('change', () => {
            const editingQuote = quoteSettingsSelectionRuntime.get();
            const currentQuote = editingQuote && editingQuote.quote ? editingQuote.quote : null;
            syncKyberOnlyDirectPoolsControl(currentQuote, quoteSourceSelect.value);
        });
    }
    
    addCategoryModal.addEventListener('click', (e) => {
        const action = getDashboardRenderer().resolveAddCategoryModalClickAction(e, { modal: addCategoryModal });
        if (action.type === 'close') {
            closeAddCategoryModal();
        } else if (action.type === 'save') {
            const newCategory = getDashboardRenderer().buildAddCategoryDraft({
                ...getDashboardModalUtils().readAddCategoryFormValues(addCategoryModalRefs, {
                    readAddCategoryFormValues: getDashboardRenderer().readAddCategoryFormValues
                }),
                categoryId: Date.now()
            });
            if (!newCategory) return;
            dashboardState.push(newCategory);
            const moduleEl = createCategoryModule(newCategory);
            if (moduleEl) dashboardEl.appendChild(moduleEl);
            saveData();
            closeAddCategoryModal();
        }
    });

    function resetAndCloseAddQuoteModal() {
        addQuoteModalSelectionRuntime.clear();
        getDashboardModalUtils().resetAddQuoteModal(addQuoteModalRefs, {
            syncControls: syncAddQuoteFormControls
        });
    }

    function syncAddQuoteFormControls() {
        getDashboardModalUtils().syncAddQuoteFormControls(addQuoteModalRefs, {
            buildAddQuoteFormViewState: getDashboardRenderer().buildAddQuoteFormViewState,
            normalizeChainKey,
            isCexOrderbookChain,
            isEvmChain
        });
    }

    addQuoteChainSelect.addEventListener('change', () => {
        syncAddQuoteFormControls();
    });
    if (addQuoteToChainSelect) {
        addQuoteToChainSelect.addEventListener('change', () => {
            syncAddQuoteFormControls();
        });
    }
    [addQuoteFromInput, addQuoteToInput, addQuoteSymbolInput].forEach(input => {
        input.addEventListener('input', syncAddQuoteFormControls);
    });

    addQuoteModal.addEventListener('click', (e) => {
        const action = getDashboardRenderer().resolveAddQuoteModalClickAction(e, { modal: addQuoteModal });
        if (action.type === 'close') {
            resetAndCloseAddQuoteModal();
        } else if (action.type === 'save') {
            const categoryIdToAdd = addQuoteModalSelectionRuntime.get();
            if (categoryIdToAdd === null) return;
            const newQuote = getDashboardRenderer().buildAddQuoteDraft({
                ...getDashboardModalUtils().readAddQuoteFormValues(addQuoteModalRefs),
                quoteId: Date.now(),
                normalizeChainKey,
                isCexOrderbookChain,
                defaultSourceResolver
            });
            if (!newQuote) return;
            const category = dashboardState.find(c => c.id == categoryIdToAdd);
            if (!category) return;
            if (!category.quotes) category.quotes = [];
            category.quotes.push(newQuote);
            const quoteListEl = document.getElementById(`quote-list-${category.id}`);
            if (quoteListEl) {
                quoteListEl.appendChild(createQuoteItem(newQuote, category.id));
            }
            updateCategoryPauseButtonState(category.id);
            saveData();
            queueQuoteRefresh(newQuote);
            
            resetAndCloseAddQuoteModal();
        }
    });

    async function requestBackendConfigRefresh() {
        await dashboardApiClient.requestBackendConfigRefresh();
    }

    async function init() {
        audioNoticeEl.style.display = 'block';
        multiChannelEnabled = multiChannelToggleRuntime.load();
        requestChannelTagVisibilityRuntime.apply();
        await requestBackendConfigRefresh();
        await loadPriceSnapshotConfig();
        await loadArbSettings();
        themeRuntime.load();
        mutedPathRuntime.setTargets(mutedPathStorageRuntime.loadTargets());
        mutedPathRuntime.setLegs(mutedPathStorageRuntime.loadLegs());
        
        try {
            const loadedConfig = await dashboardApiClient.loadDashboardConfig(DEFAULT_INTERVALS);
            dashboardState = loadedConfig.dashboardState;
            apiIntervals = loadedConfig.apiIntervals;
            if (loadedConfig.migratedSolanaInterval) {
                saveData();
            }
            refreshRequestChannelOptions();
            await loadRequestChannels();

            pathAlertConfig = await pathAlertConfigClient.load();
            
            renderDashboard();
            updateArbPanel();
            setArbPanelMaxHeight();
            renderAlertSettingsPanel();
            
            const allQuotes = dashboardState.flatMap(c => c.quotes || []);
            
            allQuotes.forEach(quote => {
                addToQueue(quote);
            });

            updateQuoteRunStateTag();
            updateSchedulers();
            priceSnapshotTimerRuntime.start(priceSnapshotConfig, () => {
                void priceSnapshotSaveRuntime.saveIfNeeded();
            });
            window.addEventListener('storage', handlePathAlertConfigSyncStorage);
            restartPathAlertScheduler();
            
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

            renderQuoteDisplayToggle();
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
                toggleAlertLogBtn.addEventListener('click', toggleAlertLogPanel);
            }
            if (toggleMultiChannelBtn) {
                toggleMultiChannelBtn.addEventListener('click', () => {
                    setMultiChannelEnabled(!multiChannelEnabled);
                });
            }
            if (alertLogWindow) {
                alertLogWindow.addEventListener('click', handleAlertLogClick);
                alertLogWindow.addEventListener('change', handleAlertSettingsChange);
            }
            if (alertLogMutedLogContent) {
                restoreMutedAlertLogEntries(Date.now());
            }
            renderMutedAlertStatePanel(Date.now());
            renderAlertLogTabState();
            syncMutedPathLogTimer();
            if (arbPathContent) {
                arbPathContent.addEventListener('pointerdown', handleArbPathContentPointerDown);
                arbPathContent.addEventListener('click', handleArbPathContentClick);
                arbPathContent.addEventListener('keydown', handleArbPathContentKeydown);
            }
            if (arbDetailGrid) {
                arbDetailGrid.addEventListener('mousedown', (event) => {
                    const action = getArbDetailUtils().resolveArbDetailGridMouseDownAction(event, { closestEventTarget });
                    if (action.type === 'prevent-step-default') {
                        event.preventDefault();
                    }
                });
                arbDetailGrid.addEventListener('click', (event) => {
                    const action = getArbDetailUtils().resolveArbDetailGridClickAction(event, { closestEventTarget });
                    if (action.type === 'copy-token-address') {
                        copyTextToClipboard(action.tokenAddress)
                            .then(() => showCopyToast(`已复制 ${action.tokenSymbol} 地址`))
                            .catch(() => showCopyToast('复制失败'));
                        return;
                    }
                    if (action.type === 'copy-dex-link') {
                        void copyDexLinkFromElement(action.element);
                        return;
                    }
                    if (action.type === 'mute-leg') {
                        const row = arbDetailState.cards[action.cardIndex] && Array.isArray(arbDetailState.cards[action.cardIndex].rows)
                            ? arbDetailState.cards[action.cardIndex].rows[action.rowIndex]
                            : null;
                        if (!row) return;
                        const durationHours = getMutedPathLegUtils().promptMutedPathLegDurationHours(window.prompt.bind(window));
                        if (!durationHours) return;
                        muteArbDetailLeg(row, durationHours, Date.now());
                        return;
                    }
                    if (action.type === 'nudge-input') {
                        nudgeArbDetailInput(action.index, action.step);
                    }
                });
                arbDetailGrid.addEventListener('focusin', (event) => {
                    const action = getArbDetailUtils().resolveArbDetailGridInputAction(event, { closestEventTarget });
                    if (action.type !== 'input') return;
                    arbDetailState.editingInputIndex = action.index;
                });
                arbDetailGrid.addEventListener('focusout', (event) => {
                    const action = getArbDetailUtils().resolveArbDetailGridInputAction(event, { closestEventTarget });
                    if (action.type !== 'input') return;
                    arbDetailState.editingInputIndex = null;
                    commitArbDetailInput(action.index, action.value);
                });
                arbDetailGrid.addEventListener('keydown', (event) => {
                    const action = getArbDetailUtils().resolveArbDetailGridKeydownAction(event, { closestEventTarget });
                    if (action.type !== 'commit-input') return;
                    event.preventDefault();
                    action.input.blur();
                });
            }
            if (arbDetailCloseBtn) {
                arbDetailCloseBtn.addEventListener('click', closeArbDetailModal);
            }
            if (arbDetailChartAutoRefreshToggle) {
                arbDetailChartAutoRefreshToggle.addEventListener('change', () => {
                    syncArbDetailChartAutoRefreshTimer();
                });
            }
            if (arbDetailModal) {
                arbDetailModal.addEventListener('click', (event) => {
                    if (event.target === arbDetailModal) {
                        closeArbDetailModal();
                    }
                });
            }
            getArbPanelLayoutUtils().bindGlobalArbFilterEvents({
                excludedSymbolsInput: arbGlobalFilterInput,
                excludedChainsInput: arbGlobalChainFilterInput,
                includedSymbolsInput: arbGlobalIncludeFilterInput,
                twoLegOnlyInput: arbGlobalTwoLegOnlyInput,
                clearButton: arbGlobalFilterClearBtn,
                header: arbPathHeader
            }, {
                onPatch: updateArbGlobalFilterState,
                onClear: handleArbGlobalFilterClear,
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
                    toggleAlertLogPanel();
                });
            }
            window.addEventListener('resize', setArbPanelMaxHeight);
        } catch (error) {
            dashboardEl.innerHTML = `<div class="module"><h2 style="color: var(--error-color);">加载配置失败</h2><p>${error.message}。请确保后端服务已启动并刷新页面。</p></div>`;
        }
    }
    
    init();
