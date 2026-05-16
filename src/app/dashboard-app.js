    const BACKEND_URL = `${location.protocol}//${location.hostname}:3000`;
    let dashboardState = [];
    const MULTI_CHANNEL_ENABLED_STORAGE_KEY = 'dashboard-multi-channel-enabled';

    const DEFAULT_INTERVALS = { ...getQueueStatsUtils().DEFAULT_INTERVALS };
    const DEFAULT_ARB_CYCLE_START_PRIORITY = getArbCyclePriorityUtils().DEFAULT_ARB_CYCLE_START_PRIORITY;
    const AMOUNT_INPUT_DEBOUNCE_MS = 600;
    const DASHBOARD_SAVE_DEBOUNCE_MS = 1500;

    let apiIntervals = { ...DEFAULT_INTERVALS };
    let arbCycleStartPriority = Array.from(DEFAULT_ARB_CYCLE_START_PRIORITY);
    let requestChannelPayload = { channels: [] };
    let multiChannelEnabled = true;
    let showRequestChannelTags = true;
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
    let pathAlertPanelHidden = true;
    const pathAlertPanelHtmlRenderer = getDomRenderUtils().createStableHtmlRenderer();
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
    const DATA_TERMINAL_DEFAULT_WIDTH_SCALE = 0.65;
    const DEFAULT_QUOTE_DISPLAY_MODE = 'rate';
    const ARB_PANEL_UPDATE_DELAY_MS = 1000;
    const ARB_DETAIL_REFRESH_INTERVAL_MS = 2500;
    const MUTED_STATE_VISIBLE_REFRESH_MS = 1000;
    const MUTED_STATE_HIDDEN_MAX_REFRESH_MS = 60 * 1000;
    let arbExpandedSections = new Set();
    let arbGlobalExcludedSymbolsInput = '';
    let arbGlobalExcludedChainsInput = '';
    let arbGlobalIncludedSymbolsInput = '';
    let arbGlobalTwoLegOnly = false;
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
    const alertLogContent = document.getElementById('alert-log-content');
    const alertLogMutedLogContent = document.getElementById('alert-log-muted-log-content');
    const alertLogMutedContent = document.getElementById('alert-log-muted-content');
    const pathAlertSound = document.getElementById('path-alert-sound');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const audioNoticeEl = document.getElementById('audio-notice');
    const alertAudioRuntime = getAudioUtils().createAudioUnlockRuntime({
        audioElements: [pathAlertSound],
        noticeEl: audioNoticeEl,
        logWarning: (...args) => console.warn(...args),
        onUnlocked: updateAlertSoundState
    });
    const alertModal = document.getElementById('alert-modal');
    const pathAlertWindow = document.getElementById('path-alert-window');
    const pathAlertContent = document.getElementById('path-alert-content');
    const pathAlertHeader = document.getElementById('path-alert-header');
    const pathAlertMinBtn = document.getElementById('path-alert-min-btn');
    const togglePathAlertBtn = document.getElementById('toggle-path-alert-btn');
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
        'kyber-only-direct-pools': kyberOnlyDirectPoolsInput,
        'inverse-toggle-group': inverseToggleGroup,
        'show-inverse-quote': inverseCheckbox,
        'modal-swap-quote': modalSwapQuoteBtn,
        'modal-delete-quote': modalDeleteQuoteBtn,
        'quote-request-channel': quoteRequestChannelSelect
    };
    const copyToastRuntime = getCopyUtils().createCopyToastRuntime({
        setTimeout,
        clearTimeout
    });

    function getChainDefaults() {
        if (!window.ChainDefaults) {
            throw new Error('ChainDefaults is not loaded');
        }
        return window.ChainDefaults;
    }

    function getPathAlertUtils() {
        if (!window.PathAlertUtils) {
            throw new Error('PathAlertUtils is not loaded');
        }
        return window.PathAlertUtils;
    }

    function getMutedPathLegUtils() {
        if (!window.MutedPathLegUtils) {
            throw new Error('MutedPathLegUtils is not loaded');
        }
        return window.MutedPathLegUtils;
    }

    function getMutedPathRuntimeUtils() {
        if (!window.MutedPathRuntimeUtils) {
            throw new Error('MutedPathRuntimeUtils is not loaded');
        }
        return window.MutedPathRuntimeUtils;
    }

    function getMutedPathStorageUtils() {
        if (!window.MutedPathStorageUtils) {
            throw new Error('MutedPathStorageUtils is not loaded');
        }
        return window.MutedPathStorageUtils;
    }

    function getArbRuntimeMemoryUtils() {
        if (!window.ArbRuntimeMemoryUtils) {
            throw new Error('ArbRuntimeMemoryUtils is not loaded');
        }
        return window.ArbRuntimeMemoryUtils;
    }

    function getArbPanelLayoutUtils() {
        if (!window.ArbPanelLayoutUtils) {
            throw new Error('ArbPanelLayoutUtils is not loaded');
        }
        return window.ArbPanelLayoutUtils;
    }

    function getPathAlertRuleDefinitionsUtils() {
        if (!window.PathAlertRuleDefinitions) {
            throw new Error('PathAlertRuleDefinitions is not loaded');
        }
        return window.PathAlertRuleDefinitions;
    }

    function getArbRuleSnapshotUtils() {
        if (!window.ArbRuleSnapshotUtils) {
            throw new Error('ArbRuleSnapshotUtils is not loaded');
        }
        return window.ArbRuleSnapshotUtils;
    }

    function getArbFixedUtils() {
        if (!window.ArbFixedUtils) {
            throw new Error('ArbFixedUtils is not loaded');
        }
        return window.ArbFixedUtils;
    }

    function getArbSpecialUtils() {
        if (!window.ArbSpecialUtils) {
            throw new Error('ArbSpecialUtils is not loaded');
        }
        return window.ArbSpecialUtils;
    }

    function getArbCyclePriorityUtils() {
        if (!window.ArbCyclePriorityUtils) {
            throw new Error('ArbCyclePriorityUtils is not loaded');
        }
        return window.ArbCyclePriorityUtils;
    }

    function getArbEquivalenceUtils() {
        if (!window.ArbEquivalenceUtils) {
            throw new Error('ArbEquivalenceUtils is not loaded');
        }
        return window.ArbEquivalenceUtils;
    }

    function getPriceSnapshotPayloadUtils() {
        if (!window.PriceSnapshotPayloadUtils) {
            throw new Error('PriceSnapshotPayloadUtils is not loaded');
        }
        return window.PriceSnapshotPayloadUtils;
    }

    function getDashboardApiUtils() {
        if (!window.DashboardApiUtils) {
            throw new Error('DashboardApiUtils is not loaded');
        }
        return window.DashboardApiUtils;
    }

    function getDashboardModalUtils() {
        if (!window.DashboardModalUtils) {
            throw new Error('DashboardModalUtils is not loaded');
        }
        return window.DashboardModalUtils;
    }

    function getAlertLogUiUtils() {
        if (!window.AlertLogUiUtils) {
            throw new Error('AlertLogUiUtils is not loaded');
        }
        return window.AlertLogUiUtils;
    }

    function getSpecialRuleAlertConfigUtils() {
        if (!window.SpecialRuleAlertConfigUtils) {
            throw new Error('SpecialRuleAlertConfigUtils is not loaded');
        }
        return window.SpecialRuleAlertConfigUtils;
    }

    function getArbPathConfigUtils() {
        if (!window.ArbPathConfigUtils) {
            throw new Error('ArbPathConfigUtils is not loaded');
        }
        return window.ArbPathConfigUtils;
    }

    function getArbPaths() {
        if (!window.ArbPaths) {
            throw new Error('ArbPaths is not loaded');
        }
        return window.ArbPaths;
    }

    function getArbPanelRenderer() {
        if (!window.ArbPanelRenderer) {
            throw new Error('ArbPanelRenderer is not loaded');
        }
        return window.ArbPanelRenderer;
    }

    function getArbPathConfig() {
        if (!window.ArbPathConfig) {
            throw new Error('ArbPathConfig is not loaded');
        }
        return window.ArbPathConfig;
    }

    function getDomRenderUtils() {
        if (!window.DomRenderUtils) {
            throw new Error('DomRenderUtils is not loaded');
        }
        return window.DomRenderUtils;
    }

    function getAudioUtils() {
        if (!window.AudioUtils) {
            throw new Error('AudioUtils is not loaded');
        }
        return window.AudioUtils;
    }

    function getThemeUtils() {
        if (!window.ThemeUtils) {
            throw new Error('ThemeUtils is not loaded');
        }
        return window.ThemeUtils;
    }

    function getKeyboardShortcutUtils() {
        if (!window.KeyboardShortcutUtils) {
            throw new Error('KeyboardShortcutUtils is not loaded');
        }
        return window.KeyboardShortcutUtils;
    }

    function getArbDetailRefreshUtils() {
        if (!window.ArbDetailRefreshUtils) {
            throw new Error('ArbDetailRefreshUtils is not loaded');
        }
        return window.ArbDetailRefreshUtils;
    }

    function getAlertDebugUtils() {
        if (!window.AlertDebugUtils) {
            throw new Error('AlertDebugUtils is not loaded');
        }
        return window.AlertDebugUtils;
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
        if (!window.QuotePauseUtils) {
            throw new Error('QuotePauseUtils is not loaded');
        }
        return window.QuotePauseUtils;
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
        if (!window.RequestChannelUtils) {
            throw new Error('RequestChannelUtils is not loaded');
        }
        return window.RequestChannelUtils;
    }

    function getQueueStatsUtils() {
        if (!window.QueueStatsUtils) {
            throw new Error('QueueStatsUtils is not loaded');
        }
        return window.QueueStatsUtils;
    }

    function getQuoteQueueRuntimeUtils() {
        if (!window.QuoteQueueRuntimeUtils) {
            throw new Error('QuoteQueueRuntimeUtils is not loaded');
        }
        return window.QuoteQueueRuntimeUtils;
    }

    function getQuoteStateRuntimeUtils() {
        if (!window.QuoteStateRuntimeUtils) {
            throw new Error('QuoteStateRuntimeUtils is not loaded');
        }
        return window.QuoteStateRuntimeUtils;
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

    function getLocalStorageSafe() {
        try {
            return window.localStorage || null;
        } catch (error) {
            console.warn('访问浏览器本地缓存失败:', error);
            return null;
        }
    }

    function loadMultiChannelEnabledFromStorage() {
        const storage = getLocalStorageSafe();
        if (!storage) return true;
        try {
            const raw = storage.getItem(MULTI_CHANNEL_ENABLED_STORAGE_KEY);
            return getRequestChannelUtils().parseMultiChannelEnabledStorageValue(raw);
        } catch (error) {
            console.warn('读取多渠道开关本地缓存失败:', error);
        }
        return true;
    }

    function persistMultiChannelEnabled() {
        const storage = getLocalStorageSafe();
        if (!storage) return;
        try {
            storage.setItem(
                MULTI_CHANNEL_ENABLED_STORAGE_KEY,
                getRequestChannelUtils().formatMultiChannelEnabledStorageValue(multiChannelEnabled)
            );
        } catch (error) {
            console.warn('保存多渠道开关本地缓存失败:', error);
        }
    }

    function renderMultiChannelToggle() {
        if (!toggleMultiChannelBtn) return;
        const state = getRequestChannelUtils().buildMultiChannelToggleState(multiChannelEnabled);
        toggleMultiChannelBtn.textContent = state.text;
        toggleMultiChannelBtn.title = state.title;
        toggleMultiChannelBtn.setAttribute('aria-pressed', state.ariaPressed);
        toggleMultiChannelBtn.classList.toggle('active', state.active);
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
        if (!quote) return;
        const itemEl = document.getElementById(`quote-item-${quote.id}`);
        if (!itemEl) return;

        const labelRow = itemEl.querySelector('.quote-label-row');
        if (!labelRow) return;

        const existingTag = itemEl.querySelector(`#quote-channel-tag-${quote.id}`);
        const channel = getRequestChannelUtils().getRequestChannelDisplayForQuote(quote, requestChannelOptions);
        const patch = getQuoteDisplayUtils().buildQuoteRequestChannelTagPatch(quote, channel, {
            hasExistingTag: Boolean(existingTag)
        });
        if (!patch) return;

        if (patch.action === 'remove') {
            if (existingTag) existingTag.remove();
            return;
        }

        if (patch.action === 'update') {
            if (existingTag) existingTag.textContent = patch.text;
            return;
        }

        const labelEl = labelRow.querySelector('.quote-label');
        if (!labelEl) return;
        labelEl.insertAdjacentHTML('afterend', patch.html);
    }

    function syncRequestChannelTagVisibility() {
        document.body.classList.toggle('show-request-channel-tags', showRequestChannelTags);
    }

    function toggleRequestChannelTags() {
        showRequestChannelTags = !showRequestChannelTags;
        syncRequestChannelTagVisibility();
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
        const normalized = nextValue !== false;
        const previousEnabled = multiChannelEnabled;
        if (previousEnabled === normalized) {
            renderMultiChannelToggle();
            persistMultiChannelEnabled();
            return;
        }
        multiChannelEnabled = normalized;
        renderMultiChannelToggle();
        persistMultiChannelEnabled();
        rebuildQueuesForMultiChannelToggle(previousEnabled, normalized);
    }

    function removeFromQueue(quoteId) {
        quoteQueueRuntime.removeFromQueue(quoteId);
    }

    function updateSchedulers() {
        quoteQueueRuntime.updateSchedulers();
    }

    function syncSettingsIntervalInputs() {
        const writePlan = getDashboardRenderer().buildSettingsIntervalWritePlan(apiIntervals);
        getDashboardModalUtils().applySettingsIntervalWritePlan(settingsIntervalInputRefs, writePlan);
    }

    function readSettingsIntervalInputs() {
        return getDashboardModalUtils().readSettingsIntervalFormValues(settingsIntervalInputRefs, {
            readSettingsIntervalFormValues: getDashboardRenderer().readSettingsIntervalFormValues
        });
    }

    settingsBtn.addEventListener('click', () => {
        syncSettingsIntervalInputs();
        getDashboardModalUtils().showModal(settingsModal);
    });

    document.getElementById('settings-cancel').addEventListener('click', () => {
        getDashboardModalUtils().hideModal(settingsModal);
    });

    settingsSaveBtn.addEventListener('click', () => {
        const newIntervals = getDashboardRenderer().buildSettingsIntervalsFromFormValues(
            readSettingsIntervalInputs(),
            DEFAULT_INTERVALS
        );
        
        apiIntervals = newIntervals;
        refreshRequestChannelOptions();
        updateSchedulers();
        saveData(); 
        getDashboardModalUtils().hideModal(settingsModal);

        settingsSaveFeedbackRuntime.show({
            button: settingsSaveBtn,
            text: '已保存!',
            resetState: {
                button: settingsSaveBtn,
                text: '保存'
            }
        });
    });
    
    function updateAlertSoundState() {
        if (!alertAudioRuntime.isUnlocked()) return;
        getAudioUtils().syncLoopingAudio(
            pathAlertSound,
            getDashboardRuntimeUtils().hasActivePathAlertSound(pathAlertRuntimeState.getState()),
            { logPlayError: (error) => console.error('Play failed', error) }
        );
    }

    function bringFloatingPanelToFront(panel) {
        return floatingPanelZIndexRuntime.bringToFront(panel);
    }

    function bindFloatingPanelFocus(panel, header) {
        getDomRenderUtils().bindFloatingPanelFocus(panel, header, { bringToFront: bringFloatingPanelToFront });
    }

    function bindDraggableFloatingPanel(element, handle) {
        getDomRenderUtils().bindDraggableElement(element, handle, {
            documentImpl: document,
            onDragStart: bringFloatingPanelToFront
        });
    }

    function getAlertLogEntryContainers() {
        return [alertLogContent, alertLogMutedLogContent].filter(Boolean);
    }

    function getAlertLogSelectorOptions() {
        return {
            escapeCssAttributeValue: (value) => getDomRenderUtils().escapeCssAttributeValue(value)
        };
    }

    function prependAlertLogCard(entry, card) {
        if (!card) return '';
        const targetKey = String(card.dataset && card.dataset.mutedTargetKey || '');
        const placement = getAlertLogUiUtils().resolveAlertLogCardPlacement(entry, { targetKey });
        const container = placement.destination === 'muted'
            ? alertLogMutedLogContent
            : alertLogContent;
        if (!container) return '';
        if (placement.removeRestoredTargetKey) {
            removeRestoredMutedAlertLogCards(placement.removeRestoredTargetKey);
        }
        container.prepend(card);
        return placement.destination;
    }

    function finalizeAlertLogCardInsertions(destinations, nowMs = Date.now()) {
        const insertedDestinations = (Array.isArray(destinations) ? destinations : [destinations]).filter(Boolean);
        if (!insertedDestinations.length) return;
        updateMutedPathAlertLogCards('', nowMs);
        syncMutedPathLogTimer();
        const destinationSet = new Set(insertedDestinations);
        if (destinationSet.has('active') && alertLogContent) {
            getArbRuntimeMemoryUtils().trimContainerChildren(alertLogContent, MAX_ALERT_LOG_ENTRIES);
        }
        if (destinationSet.has('muted') && alertLogMutedLogContent) {
            getArbRuntimeMemoryUtils().trimContainerChildren(alertLogMutedLogContent, MAX_ALERT_LOG_ENTRIES);
        }
    }

    function expandCollapsedAlertLogCard(card) {
        if (!card || card.dataset.alertLogCollapsed !== '1') return;
        card.dataset.alertLogCollapsed = '0';
        card.classList.remove('alert-log-entry-collapsed');
        const titleEl = card.querySelector('[data-alert-log-title]');
        if (titleEl) {
            titleEl.classList.remove('alert-log-title-muted');
            const expandedTitle = titleEl.dataset.alertLogExpandedTitle;
            if (expandedTitle) {
                titleEl.textContent = expandedTitle;
            }
        }
        card.querySelectorAll('.alert-log-collapsible[hidden]').forEach((element) => {
            element.hidden = false;
        });
    }

    function buildQuoteAlertDexLink(quote) {
        if (!quote || isCrossChainQuote(quote)) return null;
        return getArbDetailUtils().buildArbDetailDexLink({
            chain: quote.chain,
            fromTokenAddress: quote.fromToken,
            toTokenAddress: quote.toToken,
            inputAmount: quote.amount
        });
    }

    function buildQuoteAlertTriggeredEntry(alert, quote, evaluation) {
        return getPathAlertNotificationUtils().buildQuoteAlertTriggeredEntryForQuote({
            alert,
            quote,
            state: quote && quote.id != null ? getQuoteMarketState(quote.id) || {} : {},
            displayName: getQuoteChainDisplayName(quote),
            evaluation,
            formatNumber: formatDetailNumber,
            dexLink: buildQuoteAlertDexLink(quote),
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
            alertLogWindow.style.display = 'flex';
            bringFloatingPanelToFront(alertLogWindow);
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
        const destination = prependAlertLogCard(logEntry, card);
        finalizeAlertLogCardInsertions([destination], nowMs);
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

    function loadMutedPathTargetsFromStorage() {
        return getMutedPathStorageUtils().loadMutedPathTargetsFromStorage(getLocalStorageSafe(), {
            onError: (error) => console.warn('读取沉默报警本地缓存失败:', error)
        });
    }

    function loadMutedPathLegsFromStorage() {
        return getMutedPathStorageUtils().loadMutedPathLegsFromStorage(getLocalStorageSafe(), {
            mutedPathLegUtils: getMutedPathLegUtils(),
            onError: (error) => console.warn('读取屏蔽腿本地缓存失败:', error)
        });
    }

    function buildMutedPathLogTitleSnapshot(entry) {
        return getPathAlertUtils().buildMutedPathLogTitleSnapshot(entry);
    }

    function buildMutedPathLegTitleSnapshot(leg) {
        return buildLiveQuoteLabel(
            leg && leg.chain,
            leg && (leg.fromSymbol || leg.from),
            leg && (leg.toSymbol || leg.to)
        );
    }

    function persistMutedPathTargets() {
        const list = getMutedPathStorageUtils().persistMutedPathTargetsToStorage(
            getLocalStorageSafe(),
            mutedPathRuntime.getTargets(),
            { onError: (error) => console.warn('保存沉默报警本地缓存失败:', error) }
        );
        if (Array.isArray(list)) {
            mutedPathRuntime.setTargets(list);
        }
    }

    function persistMutedPathLegs() {
        const list = getMutedPathStorageUtils().persistMutedPathLegsToStorage(
            getLocalStorageSafe(),
            mutedPathRuntime.getLegs(),
            {
                mutedPathLegUtils: getMutedPathLegUtils(),
                onError: (error) => console.warn('保存屏蔽腿本地缓存失败:', error)
            }
        );
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
        const logTitleSnapshot = buildMutedPathLogTitleSnapshot(entry);
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
        renderPathAlertPanel();
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

    function removeRestoredMutedAlertLogCards(targetKey = '') {
        getAlertLogUiUtils().removeRestoredMutedAlertLogCards(
            getAlertLogEntryContainers(),
            targetKey,
            getAlertLogSelectorOptions()
        );
    }

    function updateMutedPathAlertLogCards(targetKey = '', nowMs = Date.now()) {
        const containers = getAlertLogEntryContainers();
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
                const statusEl = card.querySelector('[data-path-alert-muted-status]');
                const buttonEl = card.querySelector('[data-path-alert-log-mute], [data-quote-alert-log-mute]');
                const statusState = getAlertLogUiUtils().buildAlertLogMutedStatusState(resolvedEntry, {
                    statusText: resolvedEntry ? getPathAlertUtils().buildMutedPathStatusText(resolvedEntry, nowMs) : ''
                });
                if (statusEl) {
                    statusEl.textContent = statusState.statusText;
                    statusEl.className = statusState.statusClassName;
                }
                if (buttonEl) {
                    buttonEl.textContent = statusState.buttonText;
                    buttonEl.disabled = statusState.buttonDisabled;
                }
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

    function renderAlertLogTabState() {
        const tabState = alertLogTabRuntime.getState();
        if (alertLogLogTab) {
            alertLogLogTab.classList.toggle('active', tabState.showLogTab);
        }
        if (alertLogMutedLogTab) {
            alertLogMutedLogTab.classList.toggle('active', tabState.showMutedLogTab);
        }
        if (alertLogMutedTab) {
            alertLogMutedTab.classList.toggle('active', tabState.showMutedStateTab);
        }
        if (alertLogContent) {
            alertLogContent.hidden = !tabState.showLogTab;
        }
        if (alertLogMutedLogContent) {
            alertLogMutedLogContent.hidden = !tabState.showMutedLogTab;
        }
        if (alertLogMutedContent) {
            alertLogMutedContent.hidden = !tabState.showMutedStateTab;
            if (tabState.showMutedStateTab) {
                renderMutedAlertStatePanel(Date.now());
            }
        }
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
                getAlertLogSelectorOptions()
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
            alertLogWindow.style.display = 'flex';
            bringFloatingPanelToFront(alertLogWindow);
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
                const destination = prependAlertLogCard(entry, card);
                if (destination) destinations.push(destination);
            }
        }
        finalizeAlertLogCardInsertions(destinations, nowMs);
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

    function invalidateArbPathTopologyCache() {
        arbPanelCache.clearTopology();
    }

    function invalidateArbCaches() {
        invalidateArbRuleSnapshotCache();
        invalidateArbPathTopologyCache();
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

    function getQuoteUiState(quoteId) {
        return quoteStateRuntime.getUiState(quoteId);
    }

    function setQuoteUiState(quoteId, nextState) {
        return quoteStateRuntime.setUiState(quoteId, nextState);
    }

    function clearQuoteTrendTimer(quoteId) {
        quoteStateRuntime.clearTrendTimer(quoteId, clearTimeout);
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
        if (!window.ArbPathTemplateCacheUtils) {
            throw new Error('ArbPathTemplateCacheUtils is not loaded');
        }
        return window.ArbPathTemplateCacheUtils;
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

    function normalizeArbChainFilterToken(chainToken) {
        return getChainDefaults().normalizeChainFilterToken(chainToken);
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

    function buildLegLines(legs) {
        return getArbPanelLayoutUtils().buildArbPathLegLines(legs, buildArbPathLegLineOptions());
    }

    function isRuleLeg(leg) {
        return getArbDetailUtils().isArbRuleLeg(leg);
    }

    function getArbDetailUtils() {
        if (!window.ArbDetailUtils) {
            throw new Error('ArbDetailUtils is not loaded');
        }
        return window.ArbDetailUtils;
    }

    function getChartsUtils() {
        if (!window.ChartsUtils) {
            throw new Error('ChartsUtils is not loaded');
        }
        return window.ChartsUtils;
    }

    function getChartsRenderer() {
        return window.ChartsRenderer || null;
    }

    function getDataTerminalUtils() {
        if (!window.DataTerminalUtils) {
            throw new Error('DataTerminalUtils is not loaded');
        }
        return window.DataTerminalUtils;
    }

    function getDashboardRenderer() {
        if (!window.DashboardRenderer) {
            throw new Error('DashboardRenderer is not loaded');
        }
        return window.DashboardRenderer;
    }

    function getQuoteDisplayUtils() {
        if (!window.QuoteDisplayUtils) {
            throw new Error('QuoteDisplayUtils is not loaded');
        }
        return window.QuoteDisplayUtils;
    }

    function getDexLinkUtils() {
        if (!window.DexLinkUtils) {
            throw new Error('DexLinkUtils is not loaded');
        }
        return window.DexLinkUtils;
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
        if (!pairLabelEl) return;
        pairLabelEl.innerHTML = getQuoteDisplayUtils().buildQuotePairLabelHtml(quote, state);
    }

    function renderQuoteDisplayToggle() {
        if (!toggleQuoteDisplayBtn) return;
        const state = getQuoteDisplayUtils().buildQuoteDisplayToggleState(quoteDisplayMode);
        toggleQuoteDisplayBtn.textContent = state.text;
        toggleQuoteDisplayBtn.title = state.title;
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
        if (!pauseBtn) return;
        const state = getQuotePauseUtils().buildQuotePauseButtonState(quote);
        pauseBtn.title = state.title;
        pauseBtn.setAttribute('aria-label', state.ariaLabel);
        pauseBtn.setAttribute('aria-pressed', state.ariaPressed);
        pauseBtn.innerHTML = state.icon;
    }

    function updateCategoryPauseButtonState(categoryId) {
        const pauseBtn = document.querySelector(`[data-toggle-category-pause-id="${categoryId}"]`);
        if (!pauseBtn) return;
        const category = dashboardState.find((item) => item.id == categoryId);
        const state = getQuotePauseUtils().buildCategoryPauseButtonState(category && category.quotes ? category.quotes : []);
        pauseBtn.title = state.title;
        pauseBtn.setAttribute('aria-label', state.ariaLabel);
        pauseBtn.setAttribute('aria-pressed', state.ariaPressed);
        pauseBtn.innerHTML = state.icon;
    }

    function clearQuoteTrendArrow(quoteId) {
        const arrowEl = document.getElementById(`trend-arrow-${quoteId}`);
        getDomRenderUtils().resetTrendArrow(arrowEl);
        clearQuoteTrendTimer(quoteId);
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

    function getQuoteDomRefs(quoteId) {
        return {
            itemEl: document.getElementById(`quote-item-${quoteId}`),
            quoteDataEl: document.getElementById(`quote-data-${quoteId}`),
            quoteTextWrapperEl: document.getElementById(`quote-text-wrapper-${quoteId}`),
            quoteTextEl: document.getElementById(`quote-text-${quoteId}`)
        };
    }

    function applyPausedQuoteUiState(quote, state) {
        getDomRenderUtils().applyPausedQuoteDomState(getQuoteDomRefs(quote.id));
        updateQuotePairLabel(quote, state);
        updatePauseButtonState(quote);
        removeInverseQuoteElement(quote.id);
        clearQuoteAlertUi(quote.id);
        clearQuoteTrendArrow(quote.id);
    }

    function applyActiveQuoteUiState(quote, options = {}) {
        const state = getQuoteMarketState(quote.id) || {};
        getDomRenderUtils().applyActiveQuoteDomState(getQuoteDomRefs(quote.id), options);
        updateQuotePairLabel(quote, state);
        updatePauseButtonState(quote);
        clearQuoteAlertUi(quote.id);
        clearQuoteTrendArrow(quote.id);
        if (options.clearInverse) {
            removeInverseQuoteElement(quote.id);
        }
    }

    function doesArbDetailUseQuote(quoteId) {
        return getArbDetailUtils().doesArbDetailUseQuote(arbDetailState.selectedOpportunity, quoteId);
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
        if (!quoteRunStateTag) return;
        const state = getArbDetailUtils().getQuoteRunState(arbDetailState.pausedDashboard);
        quoteRunStateTag.textContent = state.text;
        quoteRunStateTag.classList.remove('running', 'paused');
        quoteRunStateTag.classList.add(state.tone || 'running');
    }

    function findQuoteById(quoteId) {
        return getDashboardRuntimeUtils().findDashboardQuoteMatchById(dashboardState, quoteId);
    }

    function getArbOpportunityBaseAmount(cycle) {
        return getArbDetailUtils().resolveArbOpportunityBaseAmount(cycle, findQuoteById, isRuleLeg);
    }

    function buildPreferredCycleStartSymbols(aliasRules, canonicalSymbol = 'cbBTC') {
        const configuredPriority = Array.isArray(arbCycleStartPriority) && arbCycleStartPriority.length
            ? arbCycleStartPriority
            : [canonicalSymbol];
        return getArbCyclePriorityUtils().buildPreferredCycleStartSymbols(aliasRules, configuredPriority);
    }

    function getAssetEquivalenceGroups() {
        return getArbEquivalenceUtils().DEFAULT_ASSET_EQUIVALENCE_GROUPS;
    }

    function getAliasRules() {
        return getArbEquivalenceUtils().buildAliasRulesFromGroups(getAssetEquivalenceGroups());
    }

    function buildQuoteMetaById() {
        return getDashboardRuntimeUtils().buildQuoteMetaById(dashboardState);
    }

    function getFixedRuleById(ruleId) {
        return FIXED_PATH_RULES.find((rule) => rule.id === ruleId) || null;
    }

    function getSpecialRuleById(ruleId) {
        return SPECIAL_ARB_RULES.find((rule) => rule.id === ruleId) || null;
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
        if (!window.DashboardRuntimeUtils) {
            throw new Error('DashboardRuntimeUtils is not loaded');
        }
        return window.DashboardRuntimeUtils;
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

    function getDataTerminalControlElements(refs) {
        return {
            'data-terminal-search-input': refs && refs.searchInput,
            'data-terminal-alias-toggle': refs && refs.aliasToggle,
            'data-terminal-diff-toggle': refs && refs.diffToggle
        };
    }

    function applyDataTerminalControlWritePlan(plan, refs) {
        const elements = getDataTerminalControlElements(refs);
        (plan.value || []).forEach((item) => {
            const element = elements[item.id];
            if (element && element.value !== item.value) element.value = item.value;
        });
        (plan.checked || []).forEach((item) => {
            const element = elements[item.id];
            if (element && element.checked !== item.checked) element.checked = item.checked;
        });
    }

    function applyDataTerminalControlPatch(patch) {
        if (Object.prototype.hasOwnProperty.call(patch, 'query')) {
            dataTerminalState.query = patch.query;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'allowAliases')) {
            dataTerminalState.allowAliases = patch.allowAliases;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'showDiff')) {
            dataTerminalState.showDiff = patch.showDiff;
        }
    }

    function applyDataTerminalSelectionPatch(patch) {
        if (Object.prototype.hasOwnProperty.call(patch, 'selectedLeftKey')) {
            dataTerminalState.selectedLeftKey = patch.selectedLeftKey;
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'selectedRightKey')) {
            dataTerminalState.selectedRightKey = patch.selectedRightKey;
        }
    }

    function renderDataTerminalPanel() {
        if (!dataTerminalState.visible || !dataTerminalState.domRefs) return;
        const refs = dataTerminalState.domRefs;
        const utils = getDataTerminalUtils();
        if (!refs.content) return;

        applyDataTerminalControlWritePlan(utils.buildDataTerminalControlWritePlan(dataTerminalState), refs);

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

        if (refs.profitBp) {
            refs.profitBp.textContent = selectionSummary.text;
            refs.profitBp.classList.toggle('data-terminal-profit-bp-empty', selectionSummary.profitBp === null);
        }

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

        applyDataTerminalSelectionPatch(getDataTerminalUtils().buildDataTerminalSelectionPatch(dataTerminalState, action));
        renderDataTerminalPanel();
    }

    function scheduleDataTerminalUpdate() {
        dataTerminalUpdateRuntime.schedule();
    }

    function handleDataTerminalHeaderClick(event) {
        const action = getDataTerminalUtils().resolveDataTerminalHeaderClickAction(event, { closestEventTarget });
        if (action.type !== 'blur-search') return;
        const refs = dataTerminalState.domRefs;
        if (refs && refs.searchInput && document.activeElement === refs.searchInput) {
            refs.searchInput.blur();
        }
    }

    function positionDataTerminalWindow(panel) {
        if (!panel) return;
        panel.style.left = '20px';
        panel.style.bottom = '20px';
        panel.style.top = '';

        if (!arbPathWindow || window.getComputedStyle(arbPathWindow).display === 'none') {
            return;
        }

        const rect = arbPathWindow.getBoundingClientRect();
        panel.style.left = `${Math.max(20, rect.left + 24)}px`;
        panel.style.top = `${Math.max(80, rect.top + 24)}px`;
        panel.style.bottom = '';
    }

    function syncDataTerminalPanelDefaultSize(panel) {
        if (!panel || !arbPathWindow) return;
        const arbStyle = window.getComputedStyle(arbPathWindow);
        if (arbStyle.width) {
            const arbWidth = parseFloat(arbStyle.width);
            panel.style.width = Number.isFinite(arbWidth)
                ? `${Math.round(arbWidth * DATA_TERMINAL_DEFAULT_WIDTH_SCALE)}px`
                : arbStyle.width;
        }
        if (arbStyle.height) {
            panel.style.height = arbStyle.height;
        }
    }

    function mountDataTerminalPanel() {
        if (dataTerminalState.visible && dataTerminalState.domRefs && dataTerminalState.domRefs.window) {
            bringFloatingPanelToFront(dataTerminalState.domRefs.window);
            return;
        }
        const utils = getDataTerminalUtils();

        const panel = document.createElement('div');
        panel.id = 'data-terminal-window';
        panel.innerHTML = utils.buildDataTerminalShellHtml();
        floatingPanelZIndexRuntime.resetPanel(panel);
        syncDataTerminalPanelDefaultSize(panel);
        positionDataTerminalWindow(panel);
        document.body.appendChild(panel);

        const refs = {
            window: panel,
            header: panel.querySelector('#data-terminal-header'),
            minBtn: panel.querySelector('#data-terminal-min-btn'),
            searchInput: panel.querySelector('#data-terminal-search-input'),
            aliasToggle: panel.querySelector('#data-terminal-alias-toggle'),
            diffToggle: panel.querySelector('#data-terminal-diff-toggle'),
            profitBp: panel.querySelector('#data-terminal-profit-bp'),
            content: panel.querySelector('#data-terminal-content')
        };

        dataTerminalState.visible = true;
        dataTerminalState.domRefs = refs;
        dataTerminalState.htmlRenderer.reset();
        applyDataTerminalControlWritePlan(utils.buildDataTerminalControlWritePlan(dataTerminalState), refs);

        if (refs.searchInput) {
            refs.searchInput.addEventListener('input', (event) => {
                applyDataTerminalControlPatch(utils.buildDataTerminalControlEventPatch('query', event));
                renderDataTerminalPanel();
            });
            refs.searchInput.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                event.target.blur();
            });
        }
        if (refs.aliasToggle) {
            refs.aliasToggle.addEventListener('change', (event) => {
                applyDataTerminalControlPatch(utils.buildDataTerminalControlEventPatch('allowAliases', event));
                renderDataTerminalPanel();
            });
        }
        if (refs.diffToggle) {
            refs.diffToggle.addEventListener('change', (event) => {
                applyDataTerminalControlPatch(utils.buildDataTerminalControlEventPatch('showDiff', event));
                renderDataTerminalPanel();
            });
        }
        if (refs.content) {
            refs.content.addEventListener('click', handleDataTerminalContentClick);
        }
        if (refs.minBtn) {
            refs.minBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleDataTerminalPanel();
            });
        }
        if (refs.header) {
            refs.header.addEventListener('click', handleDataTerminalHeaderClick);
            bindDraggableFloatingPanel(panel, refs.header);
            bindFloatingPanelFocus(panel, refs.header);
        }

        renderDataTerminalPanel();
        bringFloatingPanelToFront(panel);
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

    function applyArbGlobalFilterWritePlan(plan) {
        (plan.value || []).forEach((item) => {
            const input = arbGlobalFilterElements[item.id];
            if (input && input.value !== item.value) input.value = item.value;
        });
        (plan.checked || []).forEach((item) => {
            const input = arbGlobalFilterElements[item.id];
            if (input && input.checked !== item.checked) input.checked = item.checked;
        });
        (plan.disabled || []).forEach((item) => {
            const input = arbGlobalFilterElements[item.id];
            if (input && input.disabled !== item.disabled) input.disabled = item.disabled;
        });
    }

    function updateGlobalArbFilterBar() {
        applyArbGlobalFilterWritePlan(
            getArbPanelLayoutUtils().buildGlobalArbFilterWritePlan(getArbGlobalFilterState())
        );
    }

    function getDefaultArbDisplayMinProfitBp() {
        return getArbPanelLayoutUtils().resolveDefaultDisplayMinProfitBp(getPathAlertRuleDefinitionsUtils());
    }

    function getFixedRuleDisplayMinProfitBp(rule) {
        return getArbPanelLayoutUtils().normalizeDisplayMinProfitBp(rule && rule.displayMinProfitBp, getDefaultArbDisplayMinProfitBp());
    }

    function buildArbSectionToggleHtml(sectionKey, cycleDisplayState) {
        if (!cycleDisplayState || !cycleDisplayState.canToggleExpand) return '';
        return getArbPanelRenderer().renderArbSectionToggleHtml(sectionKey, {
            ...cycleDisplayState,
            displayMinProfitBp: getArbPanelLayoutUtils().normalizeDisplayMinProfitBp(cycleDisplayState.displayMinProfitBp)
        });
    }

    function buildArbSectionKey(prefix, idOrName) {
        return `${prefix}:${String(idOrName ?? '')}`;
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

    function promptMutedPathLegDurationHours() {
        const input = window.prompt('输入屏蔽时长（小时，正整数）', '2');
        if (input === null) return null;
        const value = Number.parseInt(String(input).trim(), 10);
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    function buildArbDetailSummaryHtml(card, index, bestProfitIndices, bestProfitRateIndices) {
        return getArbDetailUtils().buildArbDetailSummaryHtml(card, {
            index,
            bestProfitIndices,
            bestProfitRateIndices,
            formatNumber: formatDetailNumber
        });
    }

    function shouldRebuildArbDetailShell() {
        if (!arbDetailGrid) return false;
        return getArbDetailUtils().shouldRebuildArbDetailShell(arbDetailState.cards, {
            getCardCount: () => arbDetailGrid.querySelectorAll('[data-arb-detail-card-index]').length,
            hasElement: (id) => Boolean(document.getElementById(id))
        });
    }

    function renderArbDetailShell() {
        arbDetailGrid.innerHTML = getArbDetailUtils().buildArbDetailShellHtml(arbDetailState.cards);
    }
    function syncArbDetailInputValues() {
        arbDetailState.cards.forEach((card, index) => {
            const ids = getArbDetailUtils().getArbDetailCardDomIds(index);
            const inputEl = document.getElementById(ids.inputId);
            if (!inputEl) return;
            if (!getArbDetailUtils().shouldSyncArbDetailInput(index, arbDetailState.editingInputIndex)) {
                return;
            }
            const nextValue = String(card.inputAmount);
            if (inputEl.value !== nextValue) {
                inputEl.value = nextValue;
            }
        });
    }

    function renderArbDetailCardContents() {
        const { bestProfitIndices, bestProfitRateIndices } = getArbDetailUtils().findBestSummaryIndices(arbDetailState.cards);

        arbDetailState.cards.forEach((card, index) => {
            const ids = getArbDetailUtils().getArbDetailCardDomIds(index);
            const rowsEl = document.getElementById(ids.rowsId);
            const summaryEl = document.getElementById(ids.summaryId);
            if (!rowsEl || !summaryEl) return;

            rowsEl.innerHTML = buildArbDetailRowsHtml(card, index);
            summaryEl.innerHTML = buildArbDetailSummaryHtml(card, index, bestProfitIndices, bestProfitRateIndices);
        });
    }

    function getArbDetailIntervalMsForSource(source) {
        const intervalKey = getArbDetailUtils().getArbDetailIntervalKey(source);
        if (!intervalKey) return 0;
        const configured = Number(apiIntervals[intervalKey]);
        return Number.isFinite(configured) && configured > 0 ? configured : 0;
    }

    function getQuoteSourceBudgetTimestamp(source) {
        return arbDetailSourceBudgetRuntime.getTimestamp(source);
    }

    function recordQuoteSourceBudgetTimestamp(source, requestedAt = Date.now()) {
        return arbDetailSourceBudgetRuntime.recordTimestamp(source, requestedAt);
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
            getQuoteSourceBudgetTimestamp(source),
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
        if (!arbDetailChartLink) return;
        const href = chartHref ? String(chartHref) : '/charts';
        arbDetailChartLink.href = href;
        arbDetailChartLink.setAttribute('aria-disabled', chartHref ? 'false' : 'true');
    }

    function destroyArbDetailChartPreview() {
        arbDetailChartPreviewCharts.forEach((chart) => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        arbDetailChartPreviewCharts = [];
        if (arbDetailChartPreview) {
            arbDetailChartPreview.innerHTML = '';
        }
        if (arbDetailProfitPreview) {
            arbDetailProfitPreview.innerHTML = '';
        }
    }

    function syncArbDetailChartAutoRefreshTimer() {
        arbDetailChartAutoRefreshRuntime.sync();
    }

    function renderArbDetailChartPreviewMessage(message) {
        if (!arbDetailChartPreview) return;
        arbDetailChartPreview.innerHTML = getArbDetailUtils().buildArbDetailChartMessageHtml(message);
    }

    function getArbDetailProfitCardEl() {
        return arbDetailChartPreview
            ? arbDetailChartPreview.querySelector('[data-arb-detail-profit-card]')
            : null;
    }

    function renderArbDetailProfitPreviewMessage(message) {
        const cardEl = getArbDetailProfitCardEl();
        if (!cardEl) return;
        cardEl.innerHTML = getArbDetailUtils().buildArbDetailProfitPreviewMessageHtml(message);
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

        cardEl.innerHTML = getArbDetailUtils().buildArbDetailProfitPreviewReadyHtml(previewState.seriesCount);
        const canvasEl = cardEl.querySelector('.arb-detail-profit-canvas');
        const metaEl = cardEl ? cardEl.querySelector('.arb-detail-profit-meta') : null;
        if (!canvasEl) return;

        const chartInstance = renderer.mountProfitHistoryChart(canvasEl, {
            mini: true,
            height: 104,
            showRightPriceScale: true
        });
        chartInstance.update(previewState.points);
        arbDetailChartPreviewCharts.push(chartInstance);

        if (metaEl) {
            metaEl.textContent = previewState.metaText;
        }
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

        if (!forceReload && arbDetailState.chartPreviewSignature === signature && arbDetailChartPreview.childElementCount > 0) {
            return;
        }

        arbDetailChartPreviewRunId += 1;
        const runId = arbDetailChartPreviewRunId;
        arbDetailState.chartPreviewSignature = signature;
        destroyArbDetailChartPreview();
        arbDetailChartPreview.innerHTML = getArbDetailUtils().buildArbDetailChartPreviewStripHtml(pairs, {
            buildChartPairLabel: (pair) => getChartsUtils().buildChartPairLabel(pair)
        });

        const renderer = getChartsRenderer();
        if (!renderer || typeof renderer.mountPriceHistoryChart !== 'function') {
            renderArbDetailChartPreviewMessage('图表模块未就绪，请刷新页面后重试。');
            renderArbDetailProfitPreviewMessage('图表模块未就绪，请刷新页面后重试。');
            return;
        }

        const loadedSeries = new Array(pairs.length).fill(null);
        await Promise.all(pairs.map(async (pair, index) => {
            const cardEl = arbDetailChartPreview.querySelector(`[data-arb-detail-chart-index="${index}"]`);
            if (!cardEl) return;

            const metaEl = cardEl.querySelector('.arb-detail-chart-card-meta');
            const canvasEl = cardEl.querySelector('.arb-detail-chart-canvas');

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

                const chartInstance = renderer.mountPriceHistoryChart(canvasEl, {
                    mini: true,
                    height: 104,
                    showRightPriceScale: true,
                    color: '#0f766e'
                });
                chartInstance.update(series.points || []);
                loadedSeries[index] = Array.isArray(series.points) ? series.points : [];
                arbDetailChartPreviewCharts.push(chartInstance);

                if (metaEl) {
                    metaEl.textContent = `${series.source || '历史快照'} · 最近 1 小时`;
                }
            } catch (error) {
                if (arbDetailChartPreviewRunId !== runId) return;
                if (canvasEl) {
                    canvasEl.outerHTML = getArbDetailUtils().buildArbDetailChartMessageHtml(error.message || '图表加载失败');
                }
                if (metaEl) {
                    metaEl.textContent = '加载失败';
                }
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
            arbDetailModal.classList.remove('visible');
            return;
        }

        const current = arbDetailState.selectedOpportunity;
        if (!current || !current.cycle) {
            arbDetailSubtitle.textContent = '当前套利机会不可用';
            setArbDetailChartLinkState('');
            destroyArbDetailChartPreview();
            arbDetailGrid.innerHTML = '<div class="arb-detail-error">当前套利机会已失效，请关闭后重新选择。</div>';
            arbDetailModal.classList.add('visible');
            return;
        }

        const legLines = buildLegLines((current.cycle.legs || []).filter(leg => !isRuleLeg(leg)));
        arbDetailSubtitle.textContent = `${current.label || '套利机会'} | ${legLines.join(' | ')}`;
        void syncArbDetailChartPreview(current);
        if (forceShellRebuild || shouldRebuildArbDetailShell()) {
            renderArbDetailShell();
        }
        syncArbDetailInputValues();
        renderArbDetailCardContents();
        arbDetailModal.classList.add('visible');
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
        if (arbDetailModal) {
            arbDetailModal.classList.remove('visible');
        }
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

        const baseAmount = getArbOpportunityBaseAmount(current.cycle);
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
        return getArbPanelLayoutUtils().buildGlobalArbFilterState({
            excludedSymbolsInput: arbGlobalExcludedSymbolsInput,
            excludedChainsInput: arbGlobalExcludedChainsInput,
            includedSymbolsInput: arbGlobalIncludedSymbolsInput,
            twoLegOnly: arbGlobalTwoLegOnly
        });
    }

    function applyArbGlobalFilterState(state) {
        const nextState = getArbPanelLayoutUtils().buildGlobalArbFilterState(state);
        arbGlobalExcludedSymbolsInput = nextState.excludedSymbolsInput;
        arbGlobalExcludedChainsInput = nextState.excludedChainsInput;
        arbGlobalIncludedSymbolsInput = nextState.includedSymbolsInput;
        arbGlobalTwoLegOnly = nextState.twoLegOnly;
    }

    function updateArbGlobalFilterState(patch) {
        const result = getArbPanelLayoutUtils().updateGlobalArbFilterState(getArbGlobalFilterState(), patch);
        if (!result.changed) return false;
        applyArbGlobalFilterState(result.state);
        updateArbPanel();
        return true;
    }

    function handleArbGlobalFilterInput(event) {
        updateArbGlobalFilterState(
            getArbPanelLayoutUtils().buildGlobalArbFilterEventPatch('excludedSymbolsInput', event)
        );
    }

    function handleArbGlobalChainFilterInput(event) {
        updateArbGlobalFilterState(
            getArbPanelLayoutUtils().buildGlobalArbFilterEventPatch('excludedChainsInput', event)
        );
    }

    function handleArbGlobalIncludeFilterInput(event) {
        updateArbGlobalFilterState(
            getArbPanelLayoutUtils().buildGlobalArbFilterEventPatch('includedSymbolsInput', event)
        );
    }

    function handleArbGlobalTwoLegOnlyChange(event) {
        updateArbGlobalFilterState(
            getArbPanelLayoutUtils().buildGlobalArbFilterEventPatch('twoLegOnly', event)
        );
    }

    function handleArbGlobalFilterClear() {
        const result = getArbPanelLayoutUtils().clearGlobalArbFilterState(getArbGlobalFilterState());
        if (!result.changed) return;
        applyArbGlobalFilterState(result.state);
        updateArbPanel();
        if (arbGlobalFilterInput) {
            arbGlobalFilterInput.focus();
        }
    }

    function blurArbGlobalFilterInputs() {
        const activeElement = document.activeElement;
        if (activeElement === arbGlobalFilterInput || activeElement === arbGlobalChainFilterInput || activeElement === arbGlobalIncludeFilterInput) {
            activeElement.blur();
        }
    }

    function handleArbGlobalFilterKeydown(event) {
        if (!event || event.key !== 'Enter') return;
        event.preventDefault();
        blurArbGlobalFilterInputs();
    }

    function handleArbPathHeaderClick(event) {
        if (!event) return;
        if (closestEventTarget(event, 'button, input, textarea, select, [contenteditable="true"]')) {
            return;
        }
        blurArbGlobalFilterInputs();
    }

    function getPathAlertRuleDefinitions(sourceType) {
        return getPathAlertRuleDefinitionsUtils().getRuleDefinitions(sourceType);
    }

    function resolveSpecialRuleAlertConfig(alert) {
        return getSpecialRuleAlertConfigUtils().normalizeSpecialRuleAlertConfig(alert && alert.specialRuleConfig);
    }

    function buildRuleAlertEvaluation(target, alert = null, sharedRuleSnapshot = getSharedArbRuleSnapshot()) {
        if (target.ruleKind === 'fixed') {
            const rule = getFixedRuleById(target.ruleId);
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

        const rule = getSpecialRuleById(target.ruleId);
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
        const specialRuleConfig = resolveSpecialRuleAlertConfig(alert);
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
        if (!window.PathAlertNotificationUtils) {
            throw new Error('PathAlertNotificationUtils is not loaded');
        }
        return window.PathAlertNotificationUtils;
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
                const sourceList = getPathAlertRuleDefinitions(ruleKind);
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
        if (!window.PathAlertPageUtils) {
            throw new Error('PathAlertPageUtils is not loaded');
        }
        return window.PathAlertPageUtils;
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

    function createDismissedTargetEntry(alert) {
        return getPathAlertUtils().createDismissedTargetEntry(
            alert,
            buildPathAlertSummaryLines(alert),
            Date.now()
        );
    }

    function removePathAlertById(alertId) {
        pathAlertConfig.alerts = (pathAlertConfig.alerts || []).filter((item) => item.id !== alertId);
        pathAlertRuntimeState.delete(alertId);
        updateAlertSoundState();
        renderPathAlertPanel();
    }

    function dismissPathAlertById(alertId) {
        const alert = (pathAlertConfig.alerts || []).find((item) => item.id === alertId);
        if (!alert) {
            removePathAlertById(alertId);
            return;
        }
        const entry = createDismissedTargetEntry(alert);
        if (entry && !getPathAlertUtils().findDismissedPathAlert(pathAlertConfig.dismissedTargets, entry)) {
            const nextDismissed = Array.isArray(pathAlertConfig.dismissedTargets)
                ? [...pathAlertConfig.dismissedTargets]
                : [];
            nextDismissed.push(entry);
            pathAlertConfig.dismissedTargets = nextDismissed;
        }
        removePathAlertById(alertId);
    }

    function buildPathAlertEvaluationContext(sharedRuleSnapshot) {
        return {
            quoteStateById: getQuoteMarketStateMap(),
            resolveRuleEvaluation(target, alert) {
                return buildRuleAlertEvaluation(target, alert, sharedRuleSnapshot);
            }
        };
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
        const context = buildPathAlertEvaluationContext(sharedRuleSnapshot);
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
        renderPathAlertPanel();
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
            const storage = getLocalStorageSafe();
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
        renderPathAlertPanel();
        emitPathAlertConfigSync(getPathAlertUtils().PATH_ALERT_CONFIG_SYNC_SOURCE_MAIN);
    }

    function queuePathAlertConfigSave() {
        pathAlertSchedulerRuntime.scheduleConfigSave(() => {
            persistPathAlertConfig().catch((error) => console.error('保存路径报警配置失败:', error));
        });
    }

    function buildPathAlertsManagementHref(options = {}) {
        return getPathAlertPageUtils().buildPathAlertsPageHref(options);
    }

    function openPathAlertsManagementPage(options = {}) {
        const href = buildPathAlertsManagementHref(options);
        window.open(href, '_blank', 'noopener');
    }

    async function loadPathAlertConfig() {
        pathAlertConfig = await pathAlertConfigClient.load();
    }

    async function loadPathAlertConfigStrict() {
        pathAlertConfig = await pathAlertConfigClient.loadStrict();
    }

    function renderPathAlertPanel() {
        if (!pathAlertContent) return;
        if (pathAlertPanelHidden) return;
        const alerts = Array.isArray(pathAlertConfig.alerts) ? pathAlertConfig.alerts : [];
        const settings = pathAlertConfig.settings || {};
        const dismissedCount = Array.isArray(pathAlertConfig.dismissedTargets) ? pathAlertConfig.dismissedTargets.length : 0;

        const renderOptions = getPathAlertPageUtils().buildPathAlertPanelRenderOptions({
            alerts,
            settings,
            dismissedCount,
            forceImmediateAlerts: pathAlertRuntimeState.isForceImmediateEnabled(),
            getRuntime: (alert) => pathAlertRuntimeState.get(alert.id),
            buildTitle: buildPathAlertDisplayTitle,
            renderSummaryLinesHtml: (alert) => getPathAlertPageUtils().renderPathAlertSummaryLinesHtml(buildPathAlertSummaryLines(alert)),
            buildMetaText: (alert) => getPathAlertPageUtils().buildPathAlertMetaText(alert, {
                resolveSpecialRuleConfig
            }),
            formatEvaluationText: formatPathAlertEvaluationText,
            formatTime: (value) => new Date(value).toLocaleTimeString()
        });
        pathAlertPanelHtmlRenderer.render(pathAlertContent, getPathAlertPageUtils().renderPathAlertPanelHtml(renderOptions));
    }

    function togglePathAlertPanel() {
        if (!pathAlertWindow) return;
        pathAlertPanelHidden = !pathAlertPanelHidden;
        const isVisible = !pathAlertPanelHidden;
        if (isVisible) {
            renderPathAlertPanel();
        }
        pathAlertWindow.style.display = isVisible ? 'flex' : 'none';
        if (isVisible) bringFloatingPanelToFront(pathAlertWindow);
    }

    function toggleAlertLogPanel() {
        if (!alertLogWindow) return;
        const isHidden = window.getComputedStyle(alertLogWindow).display === 'none';
        alertLogWindow.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
            bringFloatingPanelToFront(alertLogWindow);
            renderAlertLogTabState();
        }
        syncMutedPathLogTimer();
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
            expandCollapsedAlertLogCard(action.card);
            return;
        }
    }

    function handlePathAlertPanelChange(event) {
        const action = getPathAlertPageUtils().resolvePathAlertPanelChangeAction(event, { closestEventTarget });
        if (action.type === 'set-force-immediate') {
            const forceImmediateEnabled = pathAlertRuntimeState.setForceImmediate(action.checked);
            if (forceImmediateEnabled) {
                evaluatePathAlertsOnce();
                evaluateQuoteAlertsOnce();
                renderPathAlertPanel();
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
    }

    function handlePathAlertPanelClick(event) {
        const action = getPathAlertPageUtils().resolvePathAlertPanelClickAction(event, { closestEventTarget });
        if (action.type === 'delete-alert') {
            removePathAlertById(action.alertId);
            queuePathAlertConfigSave();
            return;
        }

        if (action.type === 'dismiss-delete-alert') {
            dismissPathAlertById(action.alertId);
            queuePathAlertConfigSave();
        }
    }

    async function reloadPathAlertConfigFromServer() {
        if (pathAlertReloading) return;
        pathAlertReloading = true;
        renderPathAlertPanel();
        try {
            pathAlertRuntimeState.reset({ forceImmediate: false });
            await loadPathAlertConfigStrict();
            restartPathAlertScheduler();
        } finally {
            pathAlertReloading = false;
            renderPathAlertPanel();
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
            getDisplayMinProfitBp: getFixedRuleDisplayMinProfitBp,
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
        const globalSectionKey = buildArbSectionKey('global', 'all');
        const globalCycles = filterMutedArbCycles(topologyCache.globalTemplates
            .map((template) => templateUtils.evaluateCycleTemplate(template, getQuoteMarketStateMap()))
            .filter(Boolean)
            .sort((left, right) => Number(right.profitRate) - Number(left.profitRate)));
        const layoutUtils = getArbPanelLayoutUtils();
        const excludedSymbols = layoutUtils.parseFilterInput(arbGlobalExcludedSymbolsInput);
        const excludedChains = Array.from(new Set(
            layoutUtils.parseFilterInput(arbGlobalExcludedChainsInput)
                .map(normalizeArbChainFilterToken)
                .filter(Boolean)
        ));
        const includedSymbols = layoutUtils.parseFilterInput(arbGlobalIncludedSymbolsInput);
        updateGlobalArbFilterBar();
        return layoutUtils.buildGlobalArbSection({
            sectionKey: globalSectionKey,
            cycles: globalCycles,
            includedSymbols,
            excludedSymbols,
            excludedChains,
            twoLegOnly: arbGlobalTwoLegOnly,
            expanded: arbExpandedSections.has(globalSectionKey),
            isRuleLeg,
            buildEntry: (cycle, index) => createArbOpportunityEntry(
                nextOpportunityMap,
                nextOpportunityIdsByTargetKey,
                cycle,
                `机会 ${index + 1}`,
                { section: '全局路径', alertPreset: { type: 'path' } }
            ),
            buildFooterHtml: (cycleDisplayState) => buildArbSectionToggleHtml(globalSectionKey, cycleDisplayState)
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
            arbPathContent.textContent = panelData.error;
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
        if (!window.QuoteRequestUtils) {
            throw new Error('QuoteRequestUtils is not loaded');
        }
        return window.QuoteRequestUtils;
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

                recordQuoteSourceBudgetTimestamp(source);
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
                    inverseEl = getDomRenderUtils().applyQuoteInverseQueuedDomState({
                        quoteDataEl,
                        inverseEl
                    }, {
                        id: inverseContainerId,
                        documentImpl: document
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
                    scheduleDataTerminalUpdate();
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
        if (!window.CopyUtils) {
            throw new Error('CopyUtils is not loaded');
        }
        return window.CopyUtils;
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
        if (!targetEl) return false;
        const utils = getDexLinkUtils();
        const dexLink = utils.buildDexLink({
            chain: targetEl.dataset.dexLinkChain || '',
            fromTokenAddress: targetEl.dataset.dexLinkFromTokenAddress || '',
            toTokenAddress: targetEl.dataset.dexLinkToTokenAddress || '',
            inputAmount: targetEl.dataset.dexLinkInputAmount || ''
        });
        if (!dexLink || !dexLink.url) {
            showCopyToast('该交易对不支持 DEX 链接');
            return false;
        }

        try {
            await copyTextToClipboard(dexLink.url);
            showCopyToast(`已复制 ${(targetEl.dataset.dexLinkLabel || dexLink.label || 'DEX')} 链接`);
            return true;
        } catch (error) {
            showCopyToast('复制失败');
            return false;
        }
    }

    function closestEventTarget(event, selector) {
        return getDomRenderUtils().closestEventTarget(event, selector);
    }

    function copyPriceFromText(text) {
        const price = getQuoteDisplayUtils().extractPriceFromText(text);
        if (typeof price !== 'number' || Number.isNaN(price)) return;
        copyTextToClipboard(String(price));
        showCopyToast(`已复制: ${price}`);
    }

    function bindCopyHandler(targetEl, getText) {
        if (!targetEl || targetEl.dataset.copyBound) return;
        targetEl.dataset.copyBound = '1';
        targetEl.addEventListener('click', (event) => {
            event.stopPropagation();
            const text = typeof getText === 'function' ? getText() : targetEl.textContent;
            copyPriceFromText(text);
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

        textWrapper.onmouseleave = () => hideGlobalTooltip(quoteId);
        
        quoteHoverRuntime.schedule(quoteId, () => {
            const tooltipState = getQuoteDisplayUtils().buildQuoteHoverTooltipState(quote, state, { isEvmChain });
            if (!tooltipState) return;
            showGlobalTooltip(tooltipState.html, textWrapper, { className: tooltipState.className });
        });
    }

    function showGlobalTooltip(htmlContent, targetEl, options = {}) {
        getDomRenderUtils().applyTooltipState(globalTooltip, targetEl, {
            html: htmlContent,
            className: options.className
        });
    }

    function hideGlobalTooltip(quoteId) {
        quoteHoverRuntime.hide(quoteId, () => {
            getDomRenderUtils().hideTooltip(globalTooltip);
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
        if (!arbPathWindow) return;
        const isHidden = window.getComputedStyle(arbPathWindow).display === 'none';
        arbPathWindow.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
            bringFloatingPanelToFront(arbPathWindow);
            if (arbPanelUpdateRuntime.isDirty()) {
                updateArbPanel({ force: true });
            }
        }
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
            case 'toggle-path-alert':
                togglePathAlertPanel();
                break;
            case 'toggle-alert-log':
                toggleAlertLogPanel();
                break;
            case 'toggle-request-channel-tags':
                toggleRequestChannelTags();
                break;
        }
    }

    function setArbPanelMaxHeight() {
        if (!arbPathWindow) return;
        const maxHeight = Math.max(200, window.innerHeight);
        arbPathWindow.style.height = `${maxHeight}px`;
    }

    function buildQuoteAlertDisplayLabel(quote, monitorState = getQuoteMarketState(quote.id) || {}, direction = 'forward') {
        return getQuoteDisplayUtils().buildQuoteAlertDisplayLabel(quote, monitorState, direction);
    }

    function evaluateQuoteAlertsOnce() {
        for (const quote of dashboardState.flatMap((category) => Array.isArray(category && category.quotes) ? category.quotes : [])) {
            checkPriceForAlerts(quote);
        }
    }

    function syncQuoteAlertDismissButton(resultDiv, state, quoteId) {
        if (resultDiv && !resultDiv.querySelector('.dismiss-highlight-btn')) {
            if (state.hasUnreadAlert) {
                const dismissBtn = document.createElement('button');
                dismissBtn.className = 'icon-btn dismiss-highlight-btn';
                dismissBtn.title = '确认报警/清除状态';
                dismissBtn.dataset.dismissHighlightId = quoteId;
                dismissBtn.innerHTML = '✔️';
                const settingsBtn = resultDiv.querySelector('[data-edit-alert-id]');
                if (settingsBtn) settingsBtn.parentElement.insertBefore(dismissBtn, settingsBtn);
            }
        } else if (resultDiv && !state.hasUnreadAlert) {
            const dismissBtn = resultDiv.querySelector('.dismiss-highlight-btn');
            if (dismissBtn) dismissBtn.remove();
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

        const uiState = getQuoteUiState(quote.id);
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
        syncQuoteAlertDismissButton(resultDiv, uiUpdate.nextState, quote.id);
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
        const itemEl = document.createElement('li');
        itemEl.id = `quote-item-${quote.id}`;
        itemEl.className = isQuotePaused(quote) ? 'quote-item quote-item-paused' : 'quote-item';
        const initialAmount = quote.amount || 1;
        const amountInputHTML = !isCexOrderbookChain(quote.chain) ? `<input type="number" class="amount-input" value="${initialAmount}" step="any" min="0" data-category-id="${categoryId}" data-quote-id="${quote.id}">` : '';
        const quoteTextClassName = isCexOrderbookChain(quote.chain) ? 'quote-text cex-orderbook-summary' : 'quote-text';
        const pairLabelHtml = `<span class="quote-pair-label" id="quote-pair-label-${quote.id}">${getQuoteDisplayUtils().buildQuotePairLabelHtml(quote, monitorState)}</span>`;
        const requestChannel = getRequestChannelUtils().getRequestChannelDisplayForQuote(quote, requestChannelOptions);
        const requestChannelTagHtml = getQuoteDisplayUtils().buildQuoteRequestChannelTagHtml(quote, requestChannel);
        const renderer = getDashboardRenderer();
        
        itemEl.innerHTML = renderer.renderQuoteItemShell({
            quoteId: quote.id,
            categoryId,
            displayName,
            requestChannelTagHtml,
            pairLabelHtml,
            amountInputHtml: amountInputHTML,
            quoteTextClassName,
            lastResultText,
            paused: isQuotePaused(quote)
        });
        
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
        const moduleEl = document.createElement('div');
        moduleEl.className = 'module';
        moduleEl.id = `module-${category.id}`;
        const categoryPauseAction = getCategoryPauseAction(category.quotes || []);
        const renderer = getDashboardRenderer();
        moduleEl.innerHTML = renderer.renderCategoryModuleShell({
            categoryId: category.id,
            categoryName: category.name,
            categoryPauseAction
        });
        const quoteListEl = moduleEl.querySelector('.quote-list');
        if (category.quotes) {
            category.quotes.forEach(quote => {
                quoteListEl.appendChild(createQuoteItem(quote, category.id));
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
            dashboardEl.appendChild(createCategoryModule(category));
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

    function shouldShowKyberOnlyDirectPoolsControl(quote, selectedSource) {
        if (!quote || !isEvmChain(quote.chain) || quote.chain.toLowerCase() === 'plasma') {
            return false;
        }
        return selectedSource === 'Kyber' || selectedSource === 'Auto';
    }

    function syncKyberOnlyDirectPoolsControl(quote, selectedSource) {
        const shouldShow = shouldShowKyberOnlyDirectPoolsControl(quote, selectedSource);
        if (kyberDirectPoolsGroup) {
            kyberDirectPoolsGroup.style.display = shouldShow ? 'flex' : 'none';
        }
        if (kyberDirectPoolsNote) {
            kyberDirectPoolsNote.style.display = shouldShow ? 'block' : 'none';
        }
    }

    function renderQuoteRequestChannelOptions(quote) {
        if (!requestChannelSelectGroup || !quoteRequestChannelSelect) return;

        if (!getRequestChannelUtils().supportsRequestChannelForQuote(quote)) {
            requestChannelSelectGroup.style.display = 'none';
            quoteRequestChannelSelect.innerHTML = '';
            return;
        }

        requestChannelSelectGroup.style.display = 'block';
        const currentChannelId = getRequestChannelUtils().resolveRequestChannelIdForQuote(quote, requestChannelOptions);

        quoteRequestChannelSelect.innerHTML = getRequestChannelUtils().buildRequestChannelOptionsHtml(requestChannelOptions.channels || []);
        quoteRequestChannelSelect.value = currentChannelId;
    }

    function buildPriceSnapshotPayload() {
        return getPriceSnapshotPayloadUtils().buildPriceSnapshotPayload({
            dashboardState,
            quoteStateById: getQuoteMarketStateMap(),
            clientCapturedAt: new Date().toISOString()
        });
    }

    async function savePriceSnapshot() {
        if (!priceSnapshotConfig.enabled) return;
        const payload = buildPriceSnapshotPayload();
        if (!payload.quotes.length) return;

        try {
            await dashboardApiClient.savePriceSnapshot(payload);
        } catch (error) {
            console.warn('保存价格快照失败:', error);
        }
    }

    function startPriceSnapshotTimer() {
        priceSnapshotTimerRuntime.start(priceSnapshotConfig, () => { void savePriceSnapshot(); });
    }

    function applyTheme(theme) {
        const plan = getThemeUtils().buildThemeWritePlan(theme);
        document.body.classList.remove(...plan.body.removeClasses);
        (plan.body.addClasses || []).forEach((className) => {
            document.body.classList.add(className);
        });
        document.body.dataset.theme = plan.body.dataset.theme;
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = plan.button.html;
            themeToggleBtn.title = plan.button.title;
            themeToggleBtn.setAttribute('aria-label', plan.button.ariaLabel);
        }
        const storage = getLocalStorageSafe();
        if (storage) {
            storage.setItem(plan.storage.key, plan.storage.value);
        }
    }

    function getNextTheme(currentTheme) {
        return getThemeUtils().getNextTheme(currentTheme);
    }

    manualSaveBtn.addEventListener('click', () => { performSave(true); });
    
    themeToggleBtn.addEventListener('click', () => {
        applyTheme(getNextTheme(document.body.dataset.theme));
    });

    function openAddCategoryModal() {
        getDashboardModalUtils().openAddCategoryModal(addCategoryModalRefs);
    }

    function closeAddCategoryModal() {
        getDashboardModalUtils().closeAddCategoryModal(addCategoryModalRefs);
    }

    function getAddCategoryFormValues() {
        return getDashboardModalUtils().readAddCategoryFormValues(addCategoryModalRefs, {
            readAddCategoryFormValues: getDashboardRenderer().readAddCategoryFormValues
        });
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

    function closeConfirmModal() {
        confirmActionRuntime.close(confirmModalRefs);
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
            if (doesArbDetailUseQuote(quoteId)) {
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
            ...getQuoteDomRefs(quoteId),
            inverseEl: document.getElementById(`inverse-quote-${quoteId}`)
        });

        saveData();
        removeFromQueue(quote.id);
        queueQuoteRefresh(quote);
        renderDataTerminalPanel();
        return true;
    }

    function dismissQuoteHighlight(quoteId) {
        setQuoteUiState(quoteId, {
            hasUnreadAlert: false
        });
        const quoteItemEl = document.getElementById(`quote-item-${quoteId}`);
        getDomRenderUtils().clearQuoteHighlightUi(quoteItemEl);
    }

    function applyQuoteSettingsModalWritePlan(plan) {
        getDashboardModalUtils().applyQuoteSettingsModalWritePlan(quoteSettingsModalElements, plan);
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
        applyQuoteSettingsModalWritePlan(writePlan);
        syncKyberOnlyDirectPoolsControl(quote, writePlan.kyberOnlyDirectPoolsSource);

        renderQuoteRequestChannelOptions(quote);

        getDashboardModalUtils().showModal(alertModal);
        return true;
    }

    function closeQuoteSettingsModal() {
        getDashboardModalUtils().hideModal(alertModal);
        quoteSettingsSelectionRuntime.clear();
    }

    function getQuoteSettingsFormValues(quote) {
        const values = getDashboardModalUtils().readQuoteSettingsFormValues(quoteSettingsModalElements);
        return {
            ...values,
            sourceValue: values.sourceValue || (quote ? quote.preferredSource : '')
        };
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
            dismissQuoteHighlight(action.quoteId);
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
            const formValues = getQuoteSettingsFormValues(quote);
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
            closeConfirmModal();
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
                ...getAddCategoryFormValues(),
                categoryId: Date.now()
            });
            if (!newCategory) return;
            dashboardState.push(newCategory);
            dashboardEl.appendChild(createCategoryModule(newCategory));
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

    function getAddQuoteFormValues() {
        return getDashboardModalUtils().readAddQuoteFormValues(addQuoteModalRefs);
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
                ...getAddQuoteFormValues(),
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
        multiChannelEnabled = loadMultiChannelEnabledFromStorage();
        renderMultiChannelToggle();
        syncRequestChannelTagVisibility();
        await requestBackendConfigRefresh();
        await loadPriceSnapshotConfig();
        await loadArbSettings();
        const storage = getLocalStorageSafe();
        applyTheme(storage ? storage.getItem('theme') : null);
        mutedPathRuntime.setTargets(loadMutedPathTargetsFromStorage());
        mutedPathRuntime.setLegs(loadMutedPathLegsFromStorage());
        
        try {
            const loadedConfig = await dashboardApiClient.loadDashboardConfig(DEFAULT_INTERVALS);
            dashboardState = loadedConfig.dashboardState;
            apiIntervals = loadedConfig.apiIntervals;
            if (loadedConfig.migratedSolanaInterval) {
                saveData();
            }
            refreshRequestChannelOptions();
            await loadRequestChannels();

            await loadPathAlertConfig();
            
            renderDashboard();
            updateArbPanel();
            setArbPanelMaxHeight();
            renderPathAlertPanel();
            
            const allQuotes = dashboardState.flatMap(c => c.quotes || []);
            
            allQuotes.forEach(quote => {
                addToQueue(quote);
            });

            updateQuoteRunStateTag();
            updateSchedulers();
            startPriceSnapshotTimer();
            window.addEventListener('storage', handlePathAlertConfigSyncStorage);
            restartPathAlertScheduler();
            
            if (alertLogWindow && alertLogHeader) {
                bindDraggableFloatingPanel(alertLogWindow, alertLogHeader);
                bindFloatingPanelFocus(alertLogWindow, alertLogHeader);
            }
            if (pathAlertWindow && pathAlertHeader) {
                bindDraggableFloatingPanel(pathAlertWindow, pathAlertHeader);
                bindFloatingPanelFocus(pathAlertWindow, pathAlertHeader);
            }
            if (arbPathWindow && arbPathHeader) {
                bindFloatingPanelFocus(arbPathWindow, arbPathHeader);
            }
            [alertLogWindow, pathAlertWindow, arbPathWindow].forEach((panel) => {
                if (panel) {
                    floatingPanelZIndexRuntime.resetPanel(panel);
                }
            });
            if (pathAlertWindow && window.getComputedStyle(pathAlertWindow).display !== 'none') {
                bringFloatingPanelToFront(pathAlertWindow);
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
            if (togglePathAlertBtn) {
                togglePathAlertBtn.addEventListener('click', () => {
                    openPathAlertsManagementPage();
                });
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
            }
            if (alertLogMutedLogContent) {
                restoreMutedAlertLogEntries(Date.now());
            }
            renderMutedAlertStatePanel(Date.now());
            renderAlertLogTabState();
            syncMutedPathLogTimer();
            if (pathAlertContent) {
                pathAlertContent.addEventListener('click', handlePathAlertPanelClick);
                pathAlertContent.addEventListener('change', handlePathAlertPanelChange);
            }
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
                        const durationHours = promptMutedPathLegDurationHours();
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
            if (arbGlobalFilterInput) {
                arbGlobalFilterInput.addEventListener('input', handleArbGlobalFilterInput);
                arbGlobalFilterInput.addEventListener('keydown', handleArbGlobalFilterKeydown);
            }
            if (arbGlobalChainFilterInput) {
                arbGlobalChainFilterInput.addEventListener('input', handleArbGlobalChainFilterInput);
                arbGlobalChainFilterInput.addEventListener('keydown', handleArbGlobalFilterKeydown);
            }
            if (arbGlobalIncludeFilterInput) {
                arbGlobalIncludeFilterInput.addEventListener('input', handleArbGlobalIncludeFilterInput);
                arbGlobalIncludeFilterInput.addEventListener('keydown', handleArbGlobalFilterKeydown);
            }
            if (arbGlobalTwoLegOnlyInput) {
                arbGlobalTwoLegOnlyInput.addEventListener('change', handleArbGlobalTwoLegOnlyChange);
            }
            if (arbGlobalFilterClearBtn) {
                arbGlobalFilterClearBtn.addEventListener('click', handleArbGlobalFilterClear);
            }
            if (arbPathHeader) {
                arbPathHeader.addEventListener('click', handleArbPathHeaderClick);
            }
            document.addEventListener('keydown', handleGlobalShortcuts);
            if (arbPathMinBtn) {
                arbPathMinBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleArbPanel();
                });
            }
            if (pathAlertMinBtn) {
                pathAlertMinBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    togglePathAlertPanel();
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
