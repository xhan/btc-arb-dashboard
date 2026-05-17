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
        isVisible: () => getDashboardRuntimeUtils().isPanelVisible(arbPathWindow),
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
    const arbPanelCache = getArbPathTemplateCacheUtils().createArbPanelCache();
    let arbLastPointerOpenedOpportunityId = null;
    let arbDetailState = getArbDetailUtils().buildDefaultArbDetailState();
    let arbDetailFetchController = null;
    const arbDetailSourceBudgetRuntime = getArbDetailUtils().createArbDetailSourceBudgetRuntime();
    let arbDetailChartPreviewCharts = [];
    let arbDetailChartPreviewRunId = 0;
    const arbDetailRefreshScheduler = getArbDetailRefreshUtils().createArbDetailRefreshScheduler({
        intervalMs: ARB_DETAIL_REFRESH_INTERVAL_MS,
        isActive: (refreshToken) => arbDetailState.visible && arbDetailState.refreshToken === refreshToken,
        isRefreshing: () => arbDetailState.isRefreshing,
        setRefreshing: (refreshing, refreshToken) => {
            if (refreshing || arbDetailState.refreshToken === refreshToken) {
                arbDetailState.isRefreshing = Boolean(refreshing);
            }
        },
        refresh: refreshArbDetailCards,
        logError: (error) => console.error('[arb-detail] refresh failed', error)
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
    const quoteSettingsModal = document.getElementById('quote-settings-modal');
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

    function getQuoteFetchController() {
        return getWindowModule('QuoteFetchController', 'QuoteFetchController is not loaded');
    }

    const quoteStateRuntime = getQuoteStateRuntimeUtils().createQuoteStateRuntime({
        dashboardRuntimeUtils: getDashboardRuntimeUtils()
    });
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
        checkPriceForAlerts,
        dashboardRuntimeUtils: getDashboardRuntimeUtils(),
        documentImpl: document,
        domRenderUtils: getDomRenderUtils(),
        fetchImpl: fetch,
        getEffectiveRequestChannelIdForQuote,
        getInverseQuoteDisplayText,
        getQuoteDisplayMode: () => quoteDisplayMode,
        getQuoteDisplayText,
        getQuoteMarketState,
        isQuotePaused,
        logWarning: (...args) => console.warn(...args),
        quoteDisplayUtils: getQuoteDisplayUtils(),
        quoteRequestUtils: getQuoteRequestUtils(),
        recordSourceAttempt: (source) => arbDetailSourceBudgetRuntime.recordTimestamp(source),
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
    const mutedPathRuntime = getMutedPathRuntimeUtils().createMutedPathRuntime({
        pruneTargets: (entries, nowMs) => getPathAlertUtils().pruneExpiredMutedPathTargets(entries, nowMs),
        pruneLegs: (entries, nowMs) => getMutedPathLegUtils().pruneExpiredMutedPathLegs(entries, nowMs),
        resolveRefreshDelay: ({ mutedPathTargets, mutedPathLegs, nowMs }) => getDashboardRuntimeUtils().resolveMutedStateRefreshDelay({
            mutedPathTargets,
            mutedPathLegs,
            nowMs,
            visible: getDashboardRuntimeUtils().isPanelVisible(alertLogWindow),
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

    function markTriggeredArbOpportunities(alert, evaluation, nowMs = Date.now()) {
        const targetKey = getArbPanelLayoutUtils().buildTriggeredArbOpportunityHighlightTargetKey(alert, evaluation, {
            buildMutedPathTargetFromCycleLegs,
            buildTargetKey: buildMutedPathTargetKey
        });
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
        if (getDashboardRuntimeUtils().isPanelVisible(alertLogWindow)) {
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
        pruneMutedPathLegsInPlace(nowMs);
        const allEdges = getMutedPathLegUtils().filterMutedPathLegs(
            arbPaths.buildEdges(allQuotes, getQuoteMarketStateMap(), null),
            mutedPathRuntime.getLegs(),
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

    function getDataTerminalController() {
        return getWindowModule('DataTerminalController', 'DataTerminalController is not loaded');
    }

    function getDashboardRenderer() {
        return getWindowModule('DashboardRenderer', 'DashboardRenderer is not loaded');
    }

    function getDashboardActionController() {
        return getWindowModule('DashboardActionController', 'DashboardActionController is not loaded');
    }

    function getDashboardFormController() {
        return getWindowModule('DashboardFormController', 'DashboardFormController is not loaded');
    }

    function getDashboardViewController() {
        return getWindowModule('DashboardViewController', 'DashboardViewController is not loaded');
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
        getQuoteDisplayUtils().applyQuoteDisplayToggleButtonState(toggleQuoteDisplayBtn, quoteDisplayMode);
        rerenderQuoteDisplayTexts();
    }

    function updatePauseButtonState(quote) {
        const pauseBtn = document.querySelector(`[data-toggle-pause-id="${quote.id}"]`);
        getQuotePauseUtils().applyQuotePauseButtonState(pauseBtn, quote);
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
        getArbDetailUtils().applyArbDetailInputUpdate(arbDetailState.cards, index, nextValue);
        renderArbDetailModal();
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

    function pruneInactiveAlertRuntimeState() {
        pathAlertRuntimeState.pruneInactive(pathAlertConfig && pathAlertConfig.alerts);
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
            getArbDetailUtils().resolveArbDetailIntervalMs(source, apiIntervals)
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

    function syncArbDetailProfitPreview(seriesList, renderer) {
        const cardEl = getArbDetailUtils().getArbDetailProfitCardElement(arbDetailChartPreview);
        if (!cardEl) return;

        const utils = getChartsUtils();
        const previewState = getArbDetailUtils().buildArbDetailProfitPreviewState(seriesList, {
            buildProfitChartPoints: utils && utils.buildProfitChartPoints,
            canMountProfitHistoryChart: Boolean(renderer && typeof renderer.mountProfitHistoryChart === 'function')
        });
        if (!previewState.ready) {
            getArbDetailUtils().applyArbDetailProfitPreviewMessage(cardEl, previewState.message);
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
        const chartsUtils = getChartsUtils();
        const chartHref = chartsUtils && typeof chartsUtils.buildChartsPageHref === 'function'
            ? getArbDetailUtils().buildArbOpportunityChartHref(
                current,
                (chartPairs) => chartsUtils.buildChartsPageHref(chartPairs)
            )
            : '';

        getArbDetailUtils().applyArbDetailChartLinkState(arbDetailChartLink, chartHref);

        if (!pairs.length) {
            arbDetailState.chartPreviewSignature = '';
            destroyArbDetailChartPreview();
            const message = '当前路径暂无可用历史图表。';
            getArbDetailUtils().applyArbDetailChartPreviewMessage(arbDetailChartPreview, message);
            getArbDetailUtils().applyArbDetailProfitPreviewMessage(
                getArbDetailUtils().getArbDetailProfitCardElement(arbDetailChartPreview),
                message
            );
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
            const message = '图表模块未就绪，请刷新页面后重试。';
            getArbDetailUtils().applyArbDetailChartPreviewMessage(arbDetailChartPreview, message);
            getArbDetailUtils().applyArbDetailProfitPreviewMessage(
                getArbDetailUtils().getArbDetailProfitCardElement(arbDetailChartPreview),
                message
            );
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
            getArbDetailUtils().applyArbDetailChartLinkState(arbDetailChartLink, '');
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

    function setArbDetailDashboardPause(paused) {
        const nextPaused = Boolean(paused);
        if (arbDetailState.pausedDashboard === nextPaused) return;
        arbDetailState.pausedDashboard = nextPaused;
        if (nextPaused) {
            activeFetchControllerRuntime.abortAll();
        }
        updateSchedulers();
        getDomRenderUtils().applyQuoteRunStateTagDomState(
            quoteRunStateTag,
            getArbDetailUtils().getQuoteRunState(arbDetailState.pausedDashboard)
        );
    }

    function closeArbDetailModal() {
        arbDetailRefreshScheduler.clear();
        if (arbDetailFetchController) {
            arbDetailFetchController.abort();
            arbDetailFetchController = null;
        }
        arbDetailState = getArbDetailUtils().buildClosedArbDetailState(arbDetailState);
        arbDetailChartPreviewRunId += 1;
        destroyArbDetailChartPreview();
        arbDetailChartAutoRefreshRuntime.clear();
        getArbDetailUtils().applyArbDetailChartLinkState(arbDetailChartLink, '');
        getArbDetailUtils().applyArbDetailModalVisibility(arbDetailModal, false);
        setArbDetailDashboardPause(false);
    }

    function openArbDetailModal(opportunityId) {
        arbDetailRefreshScheduler.clear();
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
        arbDetailChartAutoRefreshRuntime.sync();
        arbDetailRefreshScheduler.start(arbDetailState.refreshToken);
    }

    function restartArbDetailRefresh() {
        if (!arbDetailState.visible) return;
        arbDetailRefreshScheduler.clear();
        if (arbDetailFetchController) {
            arbDetailFetchController.abort();
            arbDetailFetchController = null;
        }
        arbDetailState.refreshToken += 1;
        arbDetailState.isRefreshing = false;
        arbDetailRefreshScheduler.start(arbDetailState.refreshToken);
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

        getArbDetailUtils().applyArbDetailInputUpdate(arbDetailState.cards, index, parsed);
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
            buildDisplayTitle(alertItem) {
                const name = String(alertItem && alertItem.name || '').trim();
                if (name) return name;
                const lines = buildPathAlertSummaryLines(alertItem);
                return lines[0] || (alertItem && alertItem.target && alertItem.target.type === 'quote' ? '交易对报警' : '未配置路径');
            },
            buildFallbackSummaryLines: buildPathAlertSummaryLines,
            buildMutedTargetCandidate: (alertItem, alertEvaluation) => (
                getPathAlertNotificationUtils().buildMutedPathTargetCandidate(alertItem, alertEvaluation, { isRuleLeg })
            ),
            formatCycleLeg: formatArbPathLegLine,
            formatChangedLeg: buildPathAlertLegDisplayLine,
            getRealLegCount: (alertItem, alertEvaluation) => (
                getPathAlertUtils().countPathAlertRealLegs(alertItem, alertEvaluation)
            ),
            isRuleLeg
        });
    }

    function sortTriggeredPathAlertEntries(entries) {
        return getPathAlertNotificationUtils().sortTriggeredPathAlertEntries(entries, {
            sortEntries: getPathAlertUtils().sortTriggeredPathAlerts,
            getRealLegCount: (alertItem, alertEvaluation) => (
                getPathAlertUtils().countPathAlertRealLegs(alertItem, alertEvaluation)
            )
        });
    }

    function evaluatePathAlertsOnce() {
        const evaluationAlerts = getDashboardRuntimeUtils().getActivePathAlertEvaluationAlerts(pathAlertConfig);
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
            const payload = getPathAlertNotificationUtils().buildPathAlertWebhookPayload(aggregatedEntries);
            sendPathAlertWebhookPayload(payload, '路径报警 webhook 发送失败:');
        }

        updateAlertSoundState();
        if (shouldRefreshArbPanelHighlights) {
            updateArbPanel();
        }
        renderAlertSettingsPanel();
    }

    function restartPathAlertScheduler() {
        pathAlertSchedulerRuntime.restartEvaluation({
            hasActiveTarget: () => getDashboardRuntimeUtils().hasActivePathAlertEvaluationTarget(pathAlertConfig),
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
            if (action.mutedTargetKey && extendMutedPathTargetByKey(action.mutedTargetKey, Date.now())) {
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
        const nowMs = Date.now();
        pruneMutedPathLegsInPlace(nowMs);
        const globalCycles = getMutedPathLegUtils().filterMutedCycles(
            topologyCache.globalTemplates
                .map((template) => templateUtils.evaluateCycleTemplate(template, getQuoteMarketStateMap()))
                .filter(Boolean)
                .sort((left, right) => Number(right.profitRate) - Number(left.profitRate)),
            mutedPathRuntime.getLegs(),
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

    function getQuoteRequestUtils() {
        return getWindowModule('QuoteRequestUtils', 'QuoteRequestUtils is not loaded');
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
        const payload = getPathAlertNotificationUtils().buildQuoteAlertRemotePayloadForEntry(entry);
        sendPathAlertWebhookPayload(payload, '报价提醒远程推送失败:');
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

        quoteStateRuntime.setUiState(quote.id, uiUpdate.nextState);
        getDomRenderUtils().applyQuoteAlertDismissButtonState(resultDiv, uiUpdate.nextState, quote.id, { documentImpl: document });
        updateAlertSoundState();
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
        evaluatePathAlertsOnce,
        formatChainLabel,
        getArbDetailState: () => arbDetailState,
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
        updateAlertSoundState,
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

            getDomRenderUtils().applyQuoteRunStateTagDomState(
                quoteRunStateTag,
                getArbDetailUtils().getQuoteRunState(arbDetailState.pausedDashboard)
            );
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

            getQuoteDisplayUtils().applyQuoteDisplayToggleButtonState(toggleQuoteDisplayBtn, quoteDisplayMode);
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
                    arbDetailChartAutoRefreshRuntime.sync();
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
                    toggleAlertLogPanel();
                });
            }
            window.addEventListener('resize', setArbPanelMaxHeight);
        } catch (error) {
            dashboardEl.innerHTML = `<div class="module"><h2 style="color: var(--error-color);">加载配置失败</h2><p>${error.message}。请确保后端服务已启动并刷新页面。</p></div>`;
        }
    }
    
    init();
