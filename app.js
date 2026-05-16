    const BACKEND_URL = `${location.protocol}//${location.hostname}:3000`;
    let dashboardState = [];
    let quoteMarketState = new Map();
    let quoteUiState = new Map();
    
    let isAudioUnlocked = false; 
    let onConfirmAction = null;
    const PATH_ALERT_CONFIG_SYNC_KEY = 'path-alert-config-sync';
    const PATH_ALERT_CONFIG_SYNC_SOURCE_MAIN = 'main-dashboard';
    const MULTI_CHANNEL_ENABLED_STORAGE_KEY = 'dashboard-multi-channel-enabled';

    let queues = {};
    let indices = {};
    let timers = {};

    const DEFAULT_INTERVALS = { ...getQueueStatsUtils().DEFAULT_INTERVALS };
    const DEFAULT_ARB_CYCLE_START_PRIORITY = getArbCyclePriorityUtils().DEFAULT_ARB_CYCLE_START_PRIORITY;

    let apiIntervals = { ...DEFAULT_INTERVALS };
    let arbCycleStartPriority = Array.from(DEFAULT_ARB_CYCLE_START_PRIORITY);
    let requestChannelPayload = { channels: [] };
    let multiChannelEnabled = true;
    let showRequestChannelTags = true;
    let requestChannelOptions = getRequestChannelUtils().getRequestChannelOptions(requestChannelPayload, apiIntervals);

    let activeFetchControllers = new Map(); 
    let saveTimeout = null;
    let priceSnapshotTimer = null;
    let priceSnapshotConfig = { enabled: false, intervalSec: 10 };
    const CHART_AUTO_REFRESH_INTERVAL_MS = 5000;
    let arbUpdateTimer = null;
    let pathAlertConfig = getPathAlertUtils().normalizeAlertConfig();
    let pathAlertSaveTimer = null;
    let pathAlertEvalTimer = null;
    let pathAlertPanelHidden = true;
    const pathAlertPanelHtmlRenderer = getDomRenderUtils().createStableHtmlRenderer();
    let pathAlertRuntimeState = new Map();
    let mutedPathTargets = [];
    let mutedPathLegs = [];
    const mutedAlertStateHtmlRenderer = getDomRenderUtils().createStableHtmlRenderer();
    let mutedPathLogTimer = null;
    let pathAlertReloading = false;
    let pathAlertExternalReloadTimer = null;
    let forceImmediateAlerts = false;
    let alertLogActiveTab = 'log';
    const ARB_OPPORTUNITY_HIGHLIGHT_DURATION_MS = 8000;
    let arbHighlightedOpportunityUntilById = new Map();
    let arbOpportunityIdsByTargetKey = new Map();
    let arbOpportunityHighlightCleanupTimer = null;
    const FLOATING_PANEL_BASE_Z_INDEX = 2100;
    let floatingPanelZCounter = FLOATING_PANEL_BASE_Z_INDEX;
    const DATA_TERMINAL_UPDATE_DELAY_MS = 1000;
    const DATA_TERMINAL_DEFAULT_WIDTH_SCALE = 0.65;
    const DEFAULT_QUOTE_DISPLAY_MODE = 'rate';
    const ARB_PANEL_UPDATE_DELAY_MS = 1000;
    const ARB_DETAIL_REFRESH_INTERVAL_MS = 2500;
    const MUTED_PATH_TARGETS_STORAGE_KEY = 'mutedPathTargets';
    const MUTED_PATH_LEGS_STORAGE_KEY = 'mutedPathLegs';
    const MUTED_STATE_VISIBLE_REFRESH_MS = 1000;
    const MUTED_STATE_HIDDEN_MAX_REFRESH_MS = 60 * 1000;
    let arbExpandedSections = new Set();
    let arbGlobalExcludedSymbolsInput = '';
    let arbGlobalExcludedChainsInput = '';
    let arbGlobalIncludedSymbolsInput = '';
    let arbGlobalTwoLegOnly = false;
    let arbOpportunityMap = new Map();
    let arbOpportunityStore = new Map();
    let arbPanelDirty = false;
    const arbPanelHtmlRenderer = getDomRenderUtils().createStableHtmlRenderer();
    let quoteDisplayMode = DEFAULT_QUOTE_DISPLAY_MODE;
    let dataTerminalState = {
        visible: false,
        query: '',
        allowAliases: true,
        showDiff: false,
        selectedLeftKey: '',
        selectedRightKey: '',
        timer: null,
        domRefs: null,
        htmlRenderer: getDomRenderUtils().createStableHtmlRenderer()
    };
    let dataTerminalRecordsCacheKey = '';
    let dataTerminalRecordsCache = null;
    let dataTerminalCandidatesCacheKey = '';
    let dataTerminalCandidatesCache = null;
    let quoteMarketStateRevision = 0;
    let arbRuleSnapshotCacheKey = '';
    let arbRuleSnapshotCache = null;
    let arbPathTopologyCacheKey = '';
    let arbPathTopologyCache = null;
    let arbLastPointerOpenedOpportunityId = null;
    let arbDetailState = {
        visible: false,
        opportunityId: null,
        selectedOpportunity: null,
        cards: [],
        pausedDashboard: false,
        refreshToken: 0,
        isRefreshing: false,
        editingInputIndex: null,
        chartPreviewSignature: ''
    };
    let arbDetailFetchController = null;
    let quoteSourceLastRequestAtByIntervalKey = new Map();
    let arbDetailChartPreviewCharts = [];
    let arbDetailChartPreviewRunId = 0;
    let arbDetailChartAutoRefreshTimer = null;
    const arbDetailRefreshScheduler = getArbDetailRefreshUtils().createArbDetailRefreshScheduler({
        intervalMs: ARB_DETAIL_REFRESH_INTERVAL_MS,
        isActive: isArbDetailRefreshActive,
        isRefreshing: () => arbDetailState.isRefreshing,
        setRefreshing: setArbDetailRefreshing,
        refresh: refreshArbDetailCards,
        logError: logArbDetailRefreshError
    });
    
    let hoverTimeout = null;        
    let currentHoveredQuoteId = null; 
    let currentlyEditingQuote = null; 
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
    const alertModal = document.getElementById('alert-modal');
    const pathAlertWindow = document.getElementById('path-alert-window');
    const pathAlertContent = document.getElementById('path-alert-content');
    const pathAlertHeader = document.getElementById('path-alert-header');
    const pathAlertMinBtn = document.getElementById('path-alert-min-btn');
    const togglePathAlertBtn = document.getElementById('toggle-path-alert-btn');
    const modalSwapQuoteBtn = document.getElementById('modal-swap-quote');
    const modalDeleteQuoteBtn = document.getElementById('modal-delete-quote');
    const quoteTokenAddressesEl = document.getElementById('quote-token-addresses');
    const quoteFromTokenLineEl = document.getElementById('quote-from-token-line');
    const quoteToTokenLineEl = document.getElementById('quote-to-token-line');
    const quoteSourceSelect = document.getElementById('quote-source-pref');
    const kyberDirectPoolsGroup = document.getElementById('kyber-direct-pools-group');
    const kyberDirectPoolsNote = document.getElementById('kyber-direct-pools-note');
    const kyberOnlyDirectPoolsInput = document.getElementById('kyber-only-direct-pools');
    
    const manualSaveBtn = document.getElementById('manual-save-btn');
    const manualSaveText = document.getElementById('manual-save-text');
    const quoteRunStateTag = document.getElementById('quote-run-state-tag');

    const settingsBtn = document.getElementById('global-settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    
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
    let currentCategoryIdToAdd = null;
    const confirmModal = document.getElementById('confirm-modal');
    const addCategoryModal = document.getElementById('add-category-modal');
    const addCategoryNameInput = document.getElementById('add-category-name');
    const globalTooltip = document.getElementById('global-tooltip');
    const copyToast = document.getElementById('copy-toast');
    const arbPathWindow = document.getElementById('arb-path-window');
    const arbPathContent = document.getElementById('arb-path-content');
    const arbGlobalFilterInput = document.getElementById('arb-global-filter-input');
    const arbGlobalChainFilterInput = document.getElementById('arb-global-chain-filter-input');
    const arbGlobalIncludeFilterInput = document.getElementById('arb-global-include-filter-input');
    const arbGlobalTwoLegOnlyInput = document.getElementById('arb-global-two-leg-only');
    const arbGlobalFilterClearBtn = document.getElementById('arb-global-filter-clear-btn');
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
    let copyToastTimer = null;
    const THEME_ORDER = ['light', 'warm', 'dark'];
    const THEME_META = {
        light: { icon: '☀️', title: '切换主题（当前：浅色）' },
        warm: { icon: '🌤️', title: '切换主题（当前：暖色）' },
        dark: { icon: '🌙', title: '切换主题（当前：深色）' }
    };
    
    const CHAIN_ADDRESS_PLACEHOLDERS = {
        ethereum: '0x...', solana: 'Enter mint address...', sui: '0x...::module::TYPE',
        polygon: '0x...', arbitrum: '0x...', optimism: '0x...',
        bsc: '0x...', avalanche: '0x...', base: '0x...', megaeth: '0x...', hemi: '0x...', katana: '0x...', starknet: '0x...', Bybit: 'N/A', bybit: 'N/A', Binance: 'N/A', binance: 'N/A'
    };

    function normalizeChainKey(chain) {
        return String(chain || '').trim().toLowerCase();
    }

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

    function getTradingPairUtils() {
        if (!window.TradingPairUtils) {
            throw new Error('TradingPairUtils is not loaded');
        }
        return window.TradingPairUtils;
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

    function getSingleChainDisplayName(chain) {
        return getChainDefaults().getChainDisplayName(chain);
    }

    function getQuoteChainDisplayName(quote) {
        return getChainDefaults().buildQuoteChainDisplayName(quote);
    }

    function isCexOrderbookChain(chain) {
        return getChainDefaults().isCexOrderbookChain(chain);
    }

    function parseCexTradingPairSymbol(symbol) {
        return getTradingPairUtils().parseCexTradingPairSymbol(symbol);
    }
    
    const KYBER_SUPPORTED_CHAINS = [
        'ethereum', 'bsc', 'arbitrum', 'polygon', 'optimism', 'avalanche', 
        'base', 'linea', 'mantle', 'sonic', 'berachain', 'ronin', 
        'unichain', 'hyperevm', 'plasma', 'etherlink', 'monad', 'megaeth',
        'cronos', 'zksync', 'fantom', 'polygon-zkevm', 
        'scroll', 'aurora', 'bittorrent', 'velas', 'oasis', 'blast',
        'moonbeam', 'boba', 'gnosis', 'celo', 'mode'
    ];

    const ZEROX_CHAIN_IDS = {
        'ethereum': 1,
        'optimism': 10,
        'bsc': 56,
        'polygon': 137,
        'base': 8453,
        'arbitrum': 42161,
        'avalanche': 43114,
        'linea': 59144,
        'scroll': 534352,
        'mantle': 5000,
        'blast': 81457,
        'mode': 34443
    };
    const ZEROX_SUPPORTED_CHAINS = Object.keys(ZEROX_CHAIN_IDS);
    const defaultSourceResolver = (chain) => getChainDefaults().getDefaultSourceForChain(chain);

    function isEvmChain(chain) {
        return getChainDefaults().isEvmChain(chain);
    }

    function is0xSupported(chain) {
        return ZEROX_SUPPORTED_CHAINS.includes(normalizeChainKey(chain));
    }

    function isKyberSupported(chain) {
        return KYBER_SUPPORTED_CHAINS.includes(normalizeChainKey(chain));
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

    function buildPausedMonitorState(previousState) {
        return getQuotePauseUtils().buildPausedQuoteState(previousState);
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
            if (raw === null) return true;
            return raw !== 'false';
        } catch (error) {
            console.warn('读取多渠道开关本地缓存失败:', error);
        }
        return true;
    }

    function persistMultiChannelEnabled() {
        const storage = getLocalStorageSafe();
        if (!storage) return;
        try {
            storage.setItem(MULTI_CHANNEL_ENABLED_STORAGE_KEY, multiChannelEnabled ? 'true' : 'false');
        } catch (error) {
            console.warn('保存多渠道开关本地缓存失败:', error);
        }
    }

    function renderMultiChannelToggle() {
        if (!toggleMultiChannelBtn) return;
        toggleMultiChannelBtn.textContent = `多渠道: ${multiChannelEnabled ? '开' : '关'}`;
        toggleMultiChannelBtn.title = multiChannelEnabled ? '已开启多渠道，点击后临时并入默认渠道' : '已关闭多渠道，点击后恢复按交易对渠道请求';
        toggleMultiChannelBtn.setAttribute('aria-pressed', multiChannelEnabled ? 'true' : 'false');
        toggleMultiChannelBtn.classList.toggle('active', multiChannelEnabled);
    }

    function getEffectiveRequestChannelIdForQuote(quote, options = {}) {
        const nextMultiChannelEnabled = typeof options.multiChannelEnabled === 'boolean'
            ? options.multiChannelEnabled
            : multiChannelEnabled;
        return getRequestChannelUtils().getEffectiveRequestChannelIdForQuote(quote, requestChannelOptions, {
            multiChannelEnabled: nextMultiChannelEnabled
        });
    }

    function getRequestChannelDisplayForQuote(quote) {
        return getRequestChannelUtils().getRequestChannelDisplayForQuote(quote, requestChannelOptions);
    }

    function buildRequestChannelTagHtml(quote) {
        const channel = getRequestChannelDisplayForQuote(quote);
        return getQuoteDisplayUtils().buildQuoteRequestChannelTagHtml(quote, channel);
    }

    function updateRequestChannelTagForQuote(quote) {
        if (!quote) return;
        const itemEl = document.getElementById(`quote-item-${quote.id}`);
        if (!itemEl) return;

        const labelRow = itemEl.querySelector('.quote-label-row');
        if (!labelRow) return;

        const existingTag = itemEl.querySelector(`#quote-channel-tag-${quote.id}`);
        const channel = getRequestChannelDisplayForQuote(quote);
        if (!channel) {
            if (existingTag) existingTag.remove();
            return;
        }

        if (existingTag) {
            existingTag.textContent = channel.name;
            return;
        }

        const labelEl = labelRow.querySelector('.quote-label');
        if (!labelEl) return;
        labelEl.insertAdjacentHTML('afterend', buildRequestChannelTagHtml(quote));
    }

    function syncRequestChannelTagVisibility() {
        document.body.classList.toggle('show-request-channel-tags', showRequestChannelTags);
    }

    function toggleRequestChannelTags() {
        showRequestChannelTags = !showRequestChannelTags;
        syncRequestChannelTagVisibility();
    }

    function getQueueTypeForQuote(quote) {
        return getQueueStatsUtils().getQueueTypeForQuote(quote, requestChannelOptions, { multiChannelEnabled });
    }

    function getQueueIntervalMs(type) {
        return getRequestChannelUtils().getEffectiveIntervalForQueue(type, apiIntervals, requestChannelOptions);
    }

    function ensureQueueState(type) {
        if (!Array.isArray(queues[type])) {
            queues[type] = [];
        }
        if (!Number.isInteger(indices[type])) {
            indices[type] = 0;
        }
        if (!(type in timers)) {
            timers[type] = null;
        }
        return queues[type];
    }

    function buildManagedQueueKeys() {
        return getQueueStatsUtils().buildManagedQueueKeys({
            defaultIntervals: DEFAULT_INTERVALS,
            requestChannels: requestChannelOptions,
            multiChannelEnabled,
            quotes: dashboardState.flatMap((category) => category.quotes || [])
        });
    }

    function addToQueue(quote) {
        if (!quote || isQuotePaused(quote)) return;
        const type = getQueueTypeForQuote(quote);
        const queue = ensureQueueState(type);
        getQueueStatsUtils().appendQuoteQueueTasks(queue, quote);
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
                if (!shouldShowRequestChannelForQuote(quote)) {
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
        getQueueStatsUtils().removeQuoteTasksFromQueues(queues, quoteId);
    }

    function deferCurrentQueueTask(type) {
        const queue = ensureQueueState(type);
        indices[type] = getQueueStatsUtils().deferQueueTask(queue, indices[type]);
    }

    function processQueue(type) {
        const queue = ensureQueueState(type);
        if (queue.length === 0) return;

        indices[type] = (indices[type] + 1) % queue.length;
        const taskFromQueue = queue[indices[type]];
        
        const category = dashboardState.find(c => c.quotes && c.quotes.some(q => q.id === taskFromQueue.quoteId));
        const quoteToFetch = category ? category.quotes.find(q => q.id === taskFromQueue.quoteId) : null;
        const taskStatus = getQueueStatsUtils().getQueueTaskStatus(
            taskFromQueue,
            type,
            quoteToFetch,
            requestChannelOptions,
            { multiChannelEnabled }
        );

        if (taskStatus.action === 'remove') {
            removeFromQueue(taskFromQueue.quoteId);
            return;
        }
        if (taskStatus.action === 'requeue') {
            removeFromQueue(taskFromQueue.quoteId);
            addToQueue(quoteToFetch);
            return;
        }
        if (!activeFetchControllers.has(quoteToFetch.id)) {
            fetchSingleQuote(quoteToFetch, taskFromQueue.mode);
        } else {
            deferCurrentQueueTask(type);
        }
    }

    function updateSchedulers() {
        const managedKeys = buildManagedQueueKeys();
        const allKeys = new Set([...Object.keys(timers), ...managedKeys]);

        allKeys.forEach((type) => {
            if (timers[type]) clearInterval(timers[type]);
            timers[type] = null;

            if (!managedKeys.has(type) && (!queues[type] || queues[type].length === 0)) {
                delete queues[type];
                delete indices[type];
                delete timers[type];
                return;
            }

            ensureQueueState(type);

            if (arbDetailState.pausedDashboard) {
                return;
            }

            const intervalMs = getQueueIntervalMs(type);
            if (intervalMs > 0) {
                timers[type] = setInterval(() => processQueue(type), intervalMs);
            }
        });
    }

    settingsBtn.addEventListener('click', () => {
        document.getElementById('setting-kyber-interval').value = apiIntervals.kyber;
        document.getElementById('setting-zerox-interval').value = apiIntervals.zerox;
        document.getElementById('setting-velora-interval').value = apiIntervals.velora;
        document.getElementById('setting-lifi-interval').value = apiIntervals.lifi;
        document.getElementById('setting-bybit-interval').value = apiIntervals.bybit;
        document.getElementById('setting-binance-interval').value = apiIntervals.binance;
        document.getElementById('setting-solana-interval').value = apiIntervals.solana;
        document.getElementById('setting-sui-interval').value = apiIntervals.sui;
        document.getElementById('setting-starknet-interval').value = apiIntervals.starknet;
        settingsModal.classList.add('visible');
    });

    document.getElementById('settings-cancel').addEventListener('click', () => {
        settingsModal.classList.remove('visible');
    });

    document.getElementById('settings-save').addEventListener('click', () => {
        const newIntervals = {
            kyber: parseInt(document.getElementById('setting-kyber-interval').value) || DEFAULT_INTERVALS.kyber,
            zerox: parseInt(document.getElementById('setting-zerox-interval').value) || DEFAULT_INTERVALS.zerox,
            velora: parseInt(document.getElementById('setting-velora-interval').value) || DEFAULT_INTERVALS.velora,
            lifi: parseInt(document.getElementById('setting-lifi-interval').value) || DEFAULT_INTERVALS.lifi,
            bybit: parseInt(document.getElementById('setting-bybit-interval').value) || DEFAULT_INTERVALS.bybit,
            binance: parseInt(document.getElementById('setting-binance-interval').value) || DEFAULT_INTERVALS.binance,
            solana: parseInt(document.getElementById('setting-solana-interval').value) || DEFAULT_INTERVALS.solana,
            sui: parseInt(document.getElementById('setting-sui-interval').value) || DEFAULT_INTERVALS.sui,
            starknet: parseInt(document.getElementById('setting-starknet-interval').value) || DEFAULT_INTERVALS.starknet
        };
        
        apiIntervals = newIntervals;
        refreshRequestChannelOptions();
        updateSchedulers();
        saveData(); 
        settingsModal.classList.remove('visible');
        
        const btn = document.getElementById('settings-save');
        const originalText = btn.textContent;
        btn.textContent = "已保存!";
        setTimeout(() => btn.textContent = originalText, 1500);
    });
    
    function syncLoopingAlertSound(audioEl, shouldPlay) {
        if (!audioEl) return;
        if (shouldPlay) {
            if (audioEl.paused) {
                audioEl.loop = true;
                audioEl.play().catch((error) => console.error('Play failed', error));
            }
            return;
        }
        if (!audioEl.paused) {
            audioEl.pause();
            audioEl.currentTime = 0;
        }
    }

    function updateAlertSoundState() {
        if (!isAudioUnlocked) return;

        let shouldPlayPathAlert = false;
        for (const runtime of pathAlertRuntimeState.values()) {
            if (runtime && runtime.isSoundActive) {
                shouldPlayPathAlert = true;
                break;
            }
        }
        syncLoopingAlertSound(pathAlertSound, shouldPlayPathAlert);
    }

    function bringFloatingPanelToFront(panel) {
        if (!panel) return;
        floatingPanelZCounter += 1;
        panel.style.zIndex = String(floatingPanelZCounter);
    }

    function bindFloatingPanelFocus(panel, header) {
        if (!panel || !header) return;
        header.addEventListener('mousedown', () => bringFloatingPanelToFront(panel));
        header.addEventListener('click', () => bringFloatingPanelToFront(panel));
        panel.addEventListener('mousedown', () => bringFloatingPanelToFront(panel));
    }

    function getAlertLogEntryContainers() {
        return [alertLogContent, alertLogMutedLogContent].filter(Boolean);
    }

    function appendMutedAlertLogCard(card, nowMs = Date.now()) {
        if (!card || !alertLogMutedLogContent) return;
        removeRestoredMutedAlertLogCards(card.dataset.mutedTargetKey || '');
        alertLogMutedLogContent.prepend(card);
        updateMutedPathAlertLogCards('', nowMs);
        syncMutedPathLogTimer();
        getArbRuntimeMemoryUtils().trimContainerChildren(alertLogMutedLogContent, MAX_ALERT_LOG_ENTRIES);
    }

    function shouldAutoOpenAlertLogEntries(entries) {
        return getAlertLogUiUtils().shouldAutoOpenAlertLogEntries(entries);
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

    function buildQuoteAlertActionLink(quote) {
        const dexLink = buildQuoteAlertDexLink(quote);
        return getPathAlertNotificationUtils().buildQuoteAlertActionLink(dexLink);
    }

    function buildQuoteAlertTriggeredEntry(alert, quote, message, options = {}) {
        const displayName = getQuoteChainDisplayName(quote);
        const direction = getQuoteAlertDirection(alert && alert.target);
        const label = buildQuoteAlertDisplayLabel(quote, quoteMarketState.get(quote.id) || {}, direction);
        const actionLink = buildQuoteAlertActionLink(quote);
        return getPathAlertNotificationUtils().buildQuoteAlertTriggeredEntry({
            alert,
            quote,
            displayName,
            label,
            message,
            currentValueText: options.currentValueText || '',
            actionLink
        });
    }

    function findDashboardQuoteById(quoteId) {
        return getDashboardRuntimeUtils().findDashboardQuoteById(dashboardState, quoteId);
    }

    function pruneArbOpportunityHighlightsInPlace(nowMs = Date.now()) {
        return getArbRuntimeMemoryUtils().pruneExpiredArbOpportunityHighlights(arbHighlightedOpportunityUntilById, nowMs);
    }

    function scheduleArbOpportunityHighlightCleanup(nowMs = Date.now()) {
        if (arbOpportunityHighlightCleanupTimer) {
            clearTimeout(arbOpportunityHighlightCleanupTimer);
            arbOpportunityHighlightCleanupTimer = null;
        }
        pruneArbOpportunityHighlightsInPlace(nowMs);
        if (!arbHighlightedOpportunityUntilById.size) return;

        const nextExpiresAt = getArbRuntimeMemoryUtils().getNextArbOpportunityHighlightExpiry(arbHighlightedOpportunityUntilById);
        if (!Number.isFinite(Number(nextExpiresAt))) return;

        const delayMs = Math.max(0, nextExpiresAt - nowMs);
        arbOpportunityHighlightCleanupTimer = setTimeout(() => {
            arbOpportunityHighlightCleanupTimer = null;
            const previousSize = arbHighlightedOpportunityUntilById.size;
            pruneArbOpportunityHighlightsInPlace(Date.now());
            if (arbHighlightedOpportunityUntilById.size !== previousSize) {
                updateArbPanel();
            }
            scheduleArbOpportunityHighlightCleanup(Date.now());
        }, delayMs + 10);
    }

    function isArbOpportunityHighlighted(opportunityId, nowMs = Date.now()) {
        return getArbRuntimeMemoryUtils().isArbOpportunityHighlighted(arbHighlightedOpportunityUntilById, opportunityId, nowMs);
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
        const opportunityIds = arbOpportunityIdsByTargetKey.get(targetKey);
        if (!Array.isArray(opportunityIds) || !opportunityIds.length) return false;

        const { changed } = getArbRuntimeMemoryUtils().markArbOpportunityHighlights(
            arbHighlightedOpportunityUntilById,
            opportunityIds,
            {
                nowMs,
                durationMs: ARB_OPPORTUNITY_HIGHLIGHT_DURATION_MS
            }
        );
        if (changed) {
            scheduleArbOpportunityHighlightCleanup(nowMs);
        }
        return changed;
    }

    function appendQuoteAlertLogEntry(entry, nowMs = Date.now()) {
        if (!alertLogWindow || !alertLogContent) return;
        if (shouldAutoOpenAlertLogEntries([entry])) {
            alertLogWindow.style.display = 'flex';
            bringFloatingPanelToFront(alertLogWindow);
        }
        const quote = entry && entry.quote ? entry.quote : null;
        const mutedEntry = entry && entry.mutedTargetCandidate
            ? getMutedPathTargetEntry(entry.mutedTargetCandidate, nowMs)
            : null;
        const card = getDomRenderUtils().createElementFromHtml(
            getAlertLogUiUtils().buildQuoteAlertLogHtml(entry, {
                nowMs,
                actionLink: entry && entry.actionLink ? entry.actionLink : buildQuoteAlertActionLink(quote),
                mutedEntry,
                targetKey: entry && entry.mutedTargetCandidate ? buildMutedPathTargetKey(entry.mutedTargetCandidate) : '',
                statusText: mutedEntry ? getPathAlertUtils().buildMutedPathStatusText(mutedEntry, nowMs) : '已触发'
            })
        );
        if (!card) return;
        if (entry && entry.mutedEntry) {
            appendMutedAlertLogCard(card, nowMs);
            return;
        }
        removeRestoredMutedAlertLogCards(card.dataset.mutedTargetKey || '');
        alertLogContent.prepend(card);
        updateMutedPathAlertLogCards('', nowMs);
        syncMutedPathLogTimer();
        getArbRuntimeMemoryUtils().trimContainerChildren(alertLogContent, MAX_ALERT_LOG_ENTRIES);
    }

    function pruneMutedPathTargetsInPlace(nowMs = Date.now()) {
        mutedPathTargets = getPathAlertUtils().pruneExpiredMutedPathTargets(mutedPathTargets, nowMs);
        return mutedPathTargets;
    }

    function getMutedPathTargetEntry(alertOrTarget, nowMs = Date.now()) {
        pruneMutedPathTargetsInPlace(nowMs);
        return getPathAlertUtils().findMutedPathAlert(mutedPathTargets, alertOrTarget, nowMs);
    }

    function buildMutedPathTargetKey(alertOrTarget) {
        return getPathAlertUtils().buildMutedPathTargetKey(alertOrTarget);
    }

    function loadMutedPathTargetsFromStorage() {
        const storage = getLocalStorageSafe();
        if (!storage) return [];
        try {
            const raw = storage.getItem(MUTED_PATH_TARGETS_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return getMutedPathStorageUtils().normalizeStoredMutedPathTargets(parsed);
        } catch (error) {
            console.warn('读取沉默报警本地缓存失败:', error);
        }
        return [];
    }

    function loadMutedPathLegsFromStorage() {
        const storage = getLocalStorageSafe();
        if (!storage) return [];
        try {
            const raw = storage.getItem(MUTED_PATH_LEGS_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return getMutedPathLegUtils().pruneExpiredMutedPathLegs(parsed, Date.now());
        } catch (error) {
            console.warn('读取屏蔽腿本地缓存失败:', error);
        }
        return [];
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
        const storage = getLocalStorageSafe();
        if (!storage) return;
        try {
            const list = getMutedPathStorageUtils().trimMutedPathTargetsForStorage(mutedPathTargets);
            mutedPathTargets = Array.isArray(list) ? list : [];
            storage.setItem(MUTED_PATH_TARGETS_STORAGE_KEY, JSON.stringify(mutedPathTargets));
        } catch (error) {
            console.warn('保存沉默报警本地缓存失败:', error);
        }
    }

    function persistMutedPathLegs() {
        const storage = getLocalStorageSafe();
        if (!storage) return;
        try {
            const list = getMutedPathLegUtils().trimMutedPathLegsForStorage(mutedPathLegs);
            mutedPathLegs = Array.isArray(list) ? list : [];
            storage.setItem(MUTED_PATH_LEGS_STORAGE_KEY, JSON.stringify(mutedPathLegs));
        } catch (error) {
            console.warn('保存屏蔽腿本地缓存失败:', error);
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
        const existingEntry = mutedPathTargets.find((item) => buildMutedPathTargetKey(item) === targetKey) || null;
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
        mutedPathTargets = mutedPathTargets.filter((item) => buildMutedPathTargetKey(item) !== targetKey);
        mutedPathTargets.push(mutedEntry);
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
        mutedPathLegs = getMutedPathLegUtils().pruneExpiredMutedPathLegs(mutedPathLegs, nowMs);
        return mutedPathLegs;
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
        const existingEntry = mutedPathLegs.find((entry) => buildMutedPathLegKey(entry) === legKey) || null;
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
        mutedPathLegs = mutedPathLegs.filter((entry) => buildMutedPathLegKey(entry) !== legKey);
        mutedPathLegs.push(mutedEntry);
        persistMutedPathLegs();
        syncMutedPathLogTimer();
        triggerMutedPathLegRefresh({ closeDetail: true });
        return mutedEntry;
    }

    function extendMutedPathTargetByKey(targetKey, nowMs = Date.now()) {
        if (!targetKey) return null;
        pruneMutedPathTargetsInPlace(nowMs);
        const existingEntry = mutedPathTargets.find((entry) => buildMutedPathTargetKey(entry) === targetKey) || null;
        if (!existingEntry) return null;
        const nextEntry = getPathAlertUtils().extendMutedPathTargetEntry(existingEntry, nowMs, PATH_ALERT_MUTE_EXTEND_DURATION_MS);
        if (!nextEntry) return null;
        mutedPathTargets = mutedPathTargets.filter((entry) => buildMutedPathTargetKey(entry) !== targetKey);
        mutedPathTargets.push(nextEntry);
        persistMutedPathTargets();
        renderMutedAlertStatePanel(nowMs);
        updateMutedPathAlertLogCards(targetKey, nowMs);
        syncMutedPathLogTimer();
        return nextEntry;
    }

    function removeMutedPathTargetByKey(targetKey, nowMs = Date.now()) {
        if (!targetKey) return;
        mutedPathTargets = mutedPathTargets.filter((entry) => buildMutedPathTargetKey(entry) !== targetKey);
        persistMutedPathTargets();
        renderMutedAlertStatePanel(nowMs);
        updateMutedPathAlertLogCards(targetKey, nowMs);
        syncMutedPathLogTimer();
    }

    function extendMutedPathLegByKey(targetKey, nowMs = Date.now()) {
        if (!targetKey) return null;
        pruneMutedPathLegsInPlace(nowMs);
        const existingEntry = mutedPathLegs.find((entry) => buildMutedPathLegKey(entry) === targetKey) || null;
        if (!existingEntry) return null;
        const nextEntry = getMutedPathLegUtils().extendMutedPathLegEntry(existingEntry, nowMs, MUTED_PATH_LEG_EXTEND_DURATION_MS);
        if (!nextEntry) return null;
        mutedPathLegs = mutedPathLegs.filter((entry) => buildMutedPathLegKey(entry) !== targetKey);
        mutedPathLegs.push(nextEntry);
        persistMutedPathLegs();
        syncMutedPathLogTimer();
        triggerMutedPathLegRefresh({ closeDetail: false });
        return nextEntry;
    }

    function removeMutedPathLegByKey(targetKey, nowMs = Date.now()) {
        if (!targetKey) return;
        mutedPathLegs = mutedPathLegs.filter((entry) => buildMutedPathLegKey(entry) !== targetKey);
        persistMutedPathLegs();
        syncMutedPathLogTimer();
        triggerMutedPathLegRefresh({ closeDetail: false });
    }

    function extendMutedPathTargetFromLogButton(buttonEl, nowMs = Date.now()) {
        if (!buttonEl || typeof buttonEl.closest !== 'function') return false;
        const card = buttonEl.closest('.log-entry[data-muted-target-key]');
        const targetKey = String(card && card.dataset && card.dataset.mutedTargetKey || '').trim();
        if (!targetKey) return false;
        pruneMutedPathTargetsInPlace(nowMs);
        const existingEntry = mutedPathTargets.find((entry) => buildMutedPathTargetKey(entry) === targetKey) || null;
        if (!existingEntry) return false;
        return Boolean(extendMutedPathTargetByKey(targetKey, nowMs));
    }

    function removeRestoredMutedAlertLogCards(targetKey = '') {
        if (!targetKey) return;
        const escapedTargetKey = getDomRenderUtils().escapeCssAttributeValue(targetKey);
        getAlertLogEntryContainers().forEach((container) => {
            container
                .querySelectorAll(`.log-entry[data-muted-restored="1"][data-muted-target-key="${escapedTargetKey}"]`)
                .forEach((card) => card.remove());
        });
    }

    function updateMutedPathAlertLogCards(targetKey = '', nowMs = Date.now()) {
        const containers = getAlertLogEntryContainers();
        if (!containers.length) return;
        pruneMutedPathTargetsInPlace(nowMs);
        containers.forEach((container) => {
            const cards = container.querySelectorAll('.log-entry[data-muted-target-key]');
            cards.forEach((card) => {
                if (targetKey && card.dataset.mutedTargetKey !== targetKey) return;
                const resolvedEntry = mutedPathTargets.find((entry) => buildMutedPathTargetKey(entry) === card.dataset.mutedTargetKey) || null;
                const statusEl = card.querySelector('[data-path-alert-muted-status]');
                const buttonEl = card.querySelector('[data-path-alert-log-mute], [data-quote-alert-log-mute]');
                if (resolvedEntry) {
                    if (statusEl) {
                        statusEl.textContent = getPathAlertUtils().buildMutedPathStatusText(resolvedEntry, nowMs);
                        statusEl.className = 'path-alert-log-tag path-alert-log-tag-muted';
                    }
                    if (buttonEl) {
                        buttonEl.textContent = '延长 2 小时';
                        buttonEl.disabled = false;
                    }
                } else {
                    if (statusEl) {
                        statusEl.textContent = '已触发';
                        statusEl.className = 'path-alert-log-tag';
                    }
                    if (buttonEl) {
                        buttonEl.textContent = '忽略 1 小时';
                        buttonEl.disabled = false;
                    }
                }
            });
        });
    }

    function renderMutedAlertStatePanel(nowMs = Date.now()) {
        if (!alertLogMutedContent) return;
        pruneMutedPathTargetsInPlace(nowMs);
        pruneMutedPathLegsInPlace(nowMs);
        const alertLogUi = getAlertLogUiUtils();
        const mutedPathItems = mutedPathTargets
            .slice()
            .sort((left, right) => Number(right && right.mutedAt) - Number(left && left.mutedAt))
            .map((entry) => alertLogUi.buildMutedStateItemHtml({
                title: entry.logTitleSnapshot || entry.summaryLinesSnapshot[0] || '路径沉默',
                lines: entry.summaryLinesSnapshot,
                status: getPathAlertUtils().buildMutedPathStatusText(entry, nowMs),
                actions: [
                    { label: '延长 2 小时', dataAttr: 'data-muted-path-target-extend', value: buildMutedPathTargetKey(entry) },
                    { label: '恢复', dataAttr: 'data-muted-path-target-restore', value: buildMutedPathTargetKey(entry) }
                ]
            }));
        const mutedLegItems = mutedPathLegs
            .slice()
            .sort((left, right) => Number(right && right.mutedAt) - Number(left && left.mutedAt))
            .map((entry) => alertLogUi.buildMutedStateItemHtml({
                title: entry.titleSnapshot || buildLiveQuoteLabel(entry.chain, entry.fromSymbol, entry.toSymbol),
                lines: [],
                status: getPathAlertUtils().buildMutedPathLegStatusText(entry, nowMs),
                actions: [
                    { label: '延长 2 小时', dataAttr: 'data-muted-path-leg-extend', value: buildMutedPathLegKey(entry) },
                    { label: '恢复', dataAttr: 'data-muted-path-leg-restore', value: buildMutedPathLegKey(entry) }
                ]
            }));
        mutedAlertStateHtmlRenderer.render(alertLogMutedContent, [
            alertLogUi.buildMutedStateSectionHtml('沉默的路径', mutedPathItems, '当前没有沉默中的路径'),
            alertLogUi.buildMutedStateSectionHtml('屏蔽的腿', mutedLegItems, '当前没有屏蔽中的腿')
        ].join(''));
    }

    function renderAlertLogTabState() {
        const showLogTab = alertLogActiveTab === 'log';
        const showMutedLogTab = alertLogActiveTab === 'muted-log';
        const showMutedStateTab = alertLogActiveTab === 'muted';
        if (alertLogLogTab) {
            alertLogLogTab.classList.toggle('active', showLogTab);
        }
        if (alertLogMutedLogTab) {
            alertLogMutedLogTab.classList.toggle('active', showMutedLogTab);
        }
        if (alertLogMutedTab) {
            alertLogMutedTab.classList.toggle('active', showMutedStateTab);
        }
        if (alertLogContent) {
            alertLogContent.hidden = !showLogTab;
        }
        if (alertLogMutedLogContent) {
            alertLogMutedLogContent.hidden = !showMutedLogTab;
        }
        if (alertLogMutedContent) {
            alertLogMutedContent.hidden = !showMutedStateTab;
            if (showMutedStateTab) {
                renderMutedAlertStatePanel(Date.now());
            }
        }
    }

    function resolveMutedStateRefreshDelay(nowMs = Date.now()) {
        return getDashboardRuntimeUtils().resolveMutedStateRefreshDelay({
            mutedPathTargets,
            mutedPathLegs,
            nowMs,
            visible: isAlertLogPanelVisible(),
            visibleRefreshMs: MUTED_STATE_VISIBLE_REFRESH_MS,
            hiddenMaxRefreshMs: MUTED_STATE_HIDDEN_MAX_REFRESH_MS
        });
    }

    function clearMutedPathLogTimer() {
        if (!mutedPathLogTimer) return;
        clearTimeout(mutedPathLogTimer);
        mutedPathLogTimer = null;
    }

    function refreshMutedPathRuntime(nowMs = Date.now()) {
        const previousLegKeys = mutedPathLegs.map((entry) => buildMutedPathLegKey(entry)).join('|');
        pruneMutedPathTargetsInPlace(nowMs);
        pruneMutedPathLegsInPlace(nowMs);
        persistMutedPathTargets();
        persistMutedPathLegs();
        if (isAlertLogPanelVisible()) {
            updateMutedPathAlertLogCards('', nowMs);
            if (alertLogActiveTab === 'muted') {
                renderMutedAlertStatePanel(nowMs);
            }
        }
        const nextLegKeys = mutedPathLegs.map((entry) => buildMutedPathLegKey(entry)).join('|');
        if (previousLegKeys !== nextLegKeys) {
            triggerMutedPathLegRefresh({ closeDetail: false });
        }
        return Boolean(mutedPathTargets.length || mutedPathLegs.length);
    }

    function scheduleMutedPathLogTimer(nowMs = Date.now()) {
        clearMutedPathLogTimer();
        const delayMs = resolveMutedStateRefreshDelay(nowMs);
        if (delayMs === null) return;
        mutedPathLogTimer = setTimeout(() => {
            mutedPathLogTimer = null;
            const nextNow = Date.now();
            if (refreshMutedPathRuntime(nextNow)) {
                scheduleMutedPathLogTimer(nextNow);
            }
        }, delayMs);
    }

    function syncMutedPathLogTimer() {
        const nowMs = Date.now();
        if (!refreshMutedPathRuntime(nowMs)) {
            clearMutedPathLogTimer();
            return;
        }
        scheduleMutedPathLogTimer(nowMs);
    }

    function restoreMutedAlertLogEntries(nowMs = Date.now()) {
        if (!alertLogMutedLogContent || !mutedPathTargets.length) return;
        const sortedEntries = mutedPathTargets
            .slice()
            .sort((left, right) => Number(left && left.mutedAt) - Number(right && right.mutedAt));
        sortedEntries.forEach((entry) => {
            const targetKey = buildMutedPathTargetKey(entry);
            if (!targetKey) return;
            const escapedTargetKey = getDomRenderUtils().escapeCssAttributeValue(targetKey);
            if (alertLogMutedLogContent.querySelector(`.log-entry[data-muted-target-key="${escapedTargetKey}"]`)) {
                return;
            }
            const card = getDomRenderUtils().createElementFromHtml(
                getAlertLogUiUtils().buildRestoredMutedAlertLogHtml(entry, {
                    nowMs,
                    targetKey,
                    statusText: getPathAlertUtils().buildMutedPathStatusText(entry, nowMs)
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
        const list = Array.isArray(entries) ? entries : [];
        if (!list.length) return;
        if (shouldAutoOpenAlertLogEntries(list)) {
            alertLogWindow.style.display = 'flex';
            bringFloatingPanelToFront(alertLogWindow);
        }
        for (let index = list.length - 1; index >= 0; index -= 1) {
            const entry = list[index];
            const mutedEntry = entry && entry.mutedTargetCandidate
                ? getMutedPathTargetEntry(entry.mutedTargetCandidate, nowMs)
                : null;
            const card = getDomRenderUtils().createElementFromHtml(
                getAlertLogUiUtils().buildPathAlertLogCardHtml(entry, {
                    nowMs,
                    mutedEntry,
                    targetKey: entry && entry.mutedTargetCandidate ? buildMutedPathTargetKey(entry.mutedTargetCandidate) : '',
                    statusText: mutedEntry ? getPathAlertUtils().buildMutedPathStatusText(mutedEntry, nowMs) : '已触发',
                    profitText: formatPathAlertEvaluationText(entry && entry.evaluation)
                })
            );
            if (card) {
                if (entry && entry.mutedEntry) {
                    appendMutedAlertLogCard(card, nowMs);
                } else {
                    removeRestoredMutedAlertLogCards(card.dataset.mutedTargetKey || '');
                    alertLogContent.prepend(card);
                }
            }
        }
        updateMutedPathAlertLogCards('', nowMs);
        syncMutedPathLogTimer();
        getArbRuntimeMemoryUtils().trimContainerChildren(alertLogContent, MAX_ALERT_LOG_ENTRIES);
    }

    async function primeAlertAudio(audioEl) {
        if (!audioEl) return false;
        audioEl.muted = true;
        await audioEl.play();
        audioEl.pause();
        audioEl.currentTime = 0;
        audioEl.muted = false;
        return true;
    }

    function unlockAudio() {
        if (isAudioUnlocked) return;
        audioNoticeEl.style.display = 'none';
        Promise.allSettled([primeAlertAudio(pathAlertSound)]).then((results) => {
            if (!results.some((result) => result.status === 'fulfilled' && result.value === true)) {
                throw new Error('no audio unlocked');
            }
            isAudioUnlocked = true;
            updateAlertSoundState();
        }).catch(error => {
            console.warn("Unlock failed", error);
        });
    }
    document.body.addEventListener('click', unlockAudio, { once: true });
    document.body.addEventListener('pointerdown', unlockAudio, { once: true });
    document.body.addEventListener('touchstart', unlockAudio, { once: true });
    document.body.addEventListener('keydown', unlockAudio, { once: true });

    function scheduleArbUpdate() {
        if (!isArbPanelVisible()) {
            arbPanelDirty = true;
            return;
        }
        if (arbUpdateTimer) return;
        arbUpdateTimer = setTimeout(() => {
            arbUpdateTimer = null;
            updateArbPanel();
        }, ARB_PANEL_UPDATE_DELAY_MS);
    }

    function invalidateArbRuleSnapshotCache() {
        quoteMarketStateRevision += 1;
        arbRuleSnapshotCache = null;
        arbRuleSnapshotCacheKey = '';
    }

    function invalidateArbPathTopologyCache() {
        arbPathTopologyCache = null;
        arbPathTopologyCacheKey = '';
    }

    function invalidateArbCaches() {
        invalidateArbRuleSnapshotCache();
        invalidateArbPathTopologyCache();
    }

    function hasQuoteMarketStateChanged(previousState, nextState) {
        return getDashboardRuntimeUtils().hasQuoteMarketStateChanged(previousState, nextState);
    }

    function sanitizeQuoteMarketState(state) {
        return getDashboardRuntimeUtils().sanitizeQuoteMarketState(state);
    }

    function setQuoteMarketState(quoteId, nextState) {
        const previousState = quoteMarketState.get(quoteId) || null;
        const marketState = sanitizeQuoteMarketState(nextState);
        const marketStateChanged = hasQuoteMarketStateChanged(previousState, marketState);
        quoteMarketState.set(quoteId, marketState);
        if (marketStateChanged) {
            invalidateArbRuleSnapshotCache();
        }
        return marketStateChanged;
    }

    function getQuoteUiState(quoteId) {
        return getDashboardRuntimeUtils().getQuoteUiState(quoteUiState, quoteId);
    }

    function setQuoteUiState(quoteId, nextState) {
        return getDashboardRuntimeUtils().setQuoteUiState(quoteUiState, quoteId, nextState);
    }

    function clearQuoteTrendTimer(quoteId) {
        getDashboardRuntimeUtils().clearQuoteTrendTimer(quoteUiState, quoteId, clearTimeout);
    }

    function resetQuoteUiRuntimeState(quoteId) {
        getDashboardRuntimeUtils().resetQuoteUiRuntimeState(quoteUiState, quoteId, clearTimeout);
    }

    function deleteQuoteUiRuntimeState(quoteId) {
        getDashboardRuntimeUtils().deleteQuoteUiRuntimeState(quoteUiState, quoteId, clearTimeout);
    }

    function buildArbRuleSnapshotCacheKey() {
        return getDashboardRuntimeUtils().buildArbRuleSnapshotCacheKey(dashboardState, quoteMarketStateRevision);
    }

    function buildQuotesByCategoryName() {
        return getDashboardRuntimeUtils().buildQuotesByCategoryName(dashboardState, getActiveQuotes);
    }

    function filterMutedArbEdges(edges, nowMs = Date.now()) {
        pruneMutedPathLegsInPlace(nowMs);
        return getMutedPathLegUtils().filterMutedPathLegs(edges, mutedPathLegs, nowMs);
    }

    function filterMutedArbCycles(cycles, nowMs = Date.now()) {
        pruneMutedPathLegsInPlace(nowMs);
        return getMutedPathLegUtils().filterMutedCycles(cycles, mutedPathLegs, nowMs);
    }

    function buildVisibleArbEdges(quotes, nowMs = Date.now()) {
        return filterMutedArbEdges(
            getArbPaths().buildEdges(quotes, quoteMarketState, null),
            nowMs
        );
    }

    function getSharedArbRuleSnapshot() {
        const topologyCacheForFixed = getArbPathTopologyCache();
        const cacheKey = buildArbRuleSnapshotCacheKey();
        if (arbRuleSnapshotCache && arbRuleSnapshotCacheKey === cacheKey) {
            return arbRuleSnapshotCache;
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
            quoteStateById: quoteMarketState,
            aliasRules,
            mutedPathLegs,
            mutedPathLegUtils: getMutedPathLegUtils(),
            preferredStartSymbols: buildPreferredCycleStartSymbols(aliasRules, 'cbBTC'),
            arbPathsApi: arbPaths,
            arbFixedUtils: getArbFixedUtils(),
            arbSpecialUtils: getArbSpecialUtils()
        });

        arbRuleSnapshotCacheKey = cacheKey;
        arbRuleSnapshotCache = {
            ...baseSnapshot,
            aliasRules,
            allQuotes,
            allEdges,
            ruleEdges,
            allEdgesWithRules,
            quoteMetaById,
            quotesByCategoryName
        };
        return arbRuleSnapshotCache;
    }

    function getArbPathTemplateCacheUtils() {
        if (!window.ArbPathTemplateCacheUtils) {
            throw new Error('ArbPathTemplateCacheUtils is not loaded');
        }
        return window.ArbPathTemplateCacheUtils;
    }

    function getArbPathTopologyCache() {
        const utils = getArbPathTemplateCacheUtils();

        const cacheKey = `${utils.buildArbPathTopologyCacheKey(dashboardState, quoteMarketState)}|${arbCycleStartPriority.join(',')}`;
        if (arbPathTopologyCache && arbPathTopologyCacheKey === cacheKey) {
            return arbPathTopologyCache;
        }

        const aliasRules = getAliasRules();
        const preferredCycleStartSymbols = buildPreferredCycleStartSymbols(aliasRules, 'cbBTC');
        const arbPaths = getArbPaths();
        const ruleEdges = arbPaths.buildRuleEdges(aliasRules);
        const quoteMetaById = buildQuoteMetaById();
        const allQuotes = getActiveQuotes(dashboardState.flatMap((category) => category.quotes || []));
        const allTopologyEdges = utils.buildTopologyEdges(allQuotes, quoteMarketState, null);
        const allTopologyEdgesWithRules = allTopologyEdges.concat(ruleEdges);
        const fixedTemplatesByRuleId = {};

        const globalSourceCategories = getArbPanelLayoutUtils().resolveItemsBySelectors(dashboardState, GLOBAL_PATH_SOURCE_SELECTORS);
        const globalSourceQuotes = getActiveQuotes(globalSourceCategories.flatMap((category) => Array.isArray(category && category.quotes) ? category.quotes : []));
        const globalEdges = utils.buildTopologyEdges(globalSourceQuotes, quoteMarketState, null);
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

        arbPathTopologyCacheKey = cacheKey;
        arbPathTopologyCache = {
            ruleEdges,
            globalTemplates,
            fixedTemplatesByRuleId
        };
        return arbPathTopologyCache;
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

    function formatArbPathLegLine(leg) {
        const displayFrom = leg && leg.rawFrom ? leg.rawFrom : leg.from;
        const displayTo = leg && leg.rawTo ? leg.rawTo : leg.to;
        const baseLine = getArbPaths().formatLegLine({
            from: displayFrom,
            to: displayTo,
            rate: leg.rate,
            chainLabel: formatChainLabel(leg.chain)
        });
        if (leg && leg.cexLevelLabel && typeof leg.cexLevelSize === 'number' && Number.isFinite(leg.cexLevelSize)) {
            return `${baseLine} ${leg.cexLevelLabel}×${formatCexBookValue(leg.cexLevelSize, 6)}`;
        }
        return baseLine;
    }

    function buildLegLines(legs) {
        return legs.map((leg) => formatArbPathLegLine(leg));
    }

    function isRuleLeg(leg) {
        return Boolean(leg && (leg.rule || leg.chain === '规则'));
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

    function getDexLinkLabel(config = {}) {
        return getDexLinkUtils().getDexLinkLabel(config);
    }

    function buildDexLinkCopyButtonHtml(config = {}, className = '', buttonText = '复制') {
        return getDexLinkUtils().buildDexLinkCopyButtonHtml(config, className, buttonText);
    }

    function formatDetailNumber(value, precision = 6) {
        return getArbDetailUtils().formatDetailNumber(value, precision);
    }

    function formatDetailProfitRate(profitRate) {
        if (typeof profitRate !== 'number' || !Number.isFinite(profitRate)) return '--';
        return getArbPaths().formatProfitWanfen(profitRate);
    }

    function formatCexBookValue(value, maxDecimals = 10) {
        return getQuoteDisplayUtils().formatCexBookValue(value, maxDecimals);
    }

    function buildCexOrderbookSummary(symbol, orderbook) {
        return getQuoteDisplayUtils().buildCexOrderbookSummary(symbol, orderbook);
    }

    function buildCexOrderbookTooltipHtml(orderbook) {
        return getQuoteDisplayUtils().buildCexOrderbookTooltipHtml(orderbook);
    }

    function buildQuotePairLabelHtml(quote, state) {
        return getQuoteDisplayUtils().buildQuotePairLabelHtml(quote, state);
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
        pairLabelEl.innerHTML = buildQuotePairLabelHtml(quote, state);
    }

    function renderQuoteDisplayToggle() {
        if (!toggleQuoteDisplayBtn) return;
        const isRateMode = quoteDisplayMode === DEFAULT_QUOTE_DISPLAY_MODE;
        toggleQuoteDisplayBtn.textContent = isRateMode ? '价格: 汇率' : '价格: 数量';
        toggleQuoteDisplayBtn.title = isRateMode
            ? '切换看板报价显示为数量 (P)'
            : '切换看板报价显示为汇率 (P)';
    }

    function rerenderQuoteDisplayTexts() {
        for (const category of dashboardState) {
            const quotes = Array.isArray(category && category.quotes) ? category.quotes : [];
            for (const quote of quotes) {
                const state = quoteMarketState.get(quote.id) || {};
                const quoteTextEl = document.getElementById(`quote-text-${quote.id}`);
                if (quoteTextEl) {
                    quoteTextEl.textContent = getQuoteDisplayText(quote, state);
                }
                const inverseEl = document.getElementById(`inverse-quote-${quote.id}`);
                if (inverseEl && Number.isFinite(Number(state.inverseRawPrice))) {
                    inverseEl.textContent = getInverseQuoteDisplayText(quote, state, inverseEl.textContent || '...');
                }
            }
        }
    }

    function toggleQuoteDisplayMode() {
        quoteDisplayMode = quoteDisplayMode === DEFAULT_QUOTE_DISPLAY_MODE ? 'amount' : DEFAULT_QUOTE_DISPLAY_MODE;
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
        if (arrowEl) {
            arrowEl.className = 'trend-arrow';
            arrowEl.innerHTML = '';
        }
        clearQuoteTrendTimer(quoteId);
    }

    function clearQuoteAlertUi(quoteId) {
        const itemEl = document.getElementById(`quote-item-${quoteId}`);
        if (!itemEl) return;
        itemEl.classList.remove('highlight', 'highlight-past');
        const dismissBtn = itemEl.querySelector('.dismiss-highlight-btn');
        if (dismissBtn) dismissBtn.remove();
    }

    function removeInverseQuoteElement(quoteId) {
        const inverseEl = document.getElementById(`inverse-quote-${quoteId}`);
        if (inverseEl) inverseEl.remove();
    }

    function abortQuoteFetch(quoteId) {
        const controller = activeFetchControllers.get(quoteId);
        if (!controller) return;
        controller.abort();
        activeFetchControllers.delete(quoteId);
    }

    function applyPausedQuoteUiState(quote, state) {
        const itemEl = document.getElementById(`quote-item-${quote.id}`);
        const quoteDataEl = document.getElementById(`quote-data-${quote.id}`);
        const quoteTextWrapperEl = document.getElementById(`quote-text-wrapper-${quote.id}`);
        const quoteTextEl = document.getElementById(`quote-text-${quote.id}`);

        if (itemEl) {
            itemEl.classList.add('quote-item-paused');
        }
        if (quoteDataEl) {
            quoteDataEl.classList.remove('error');
            quoteDataEl.removeAttribute('title');
        }
        if (quoteTextWrapperEl) {
            quoteTextWrapperEl.classList.remove('loading-text');
        }
        if (quoteTextEl) {
            quoteTextEl.textContent = '已暂停';
        }
        updateQuotePairLabel(quote, state);
        updatePauseButtonState(quote);
        removeInverseQuoteElement(quote.id);
        clearQuoteAlertUi(quote.id);
        clearQuoteTrendArrow(quote.id);
    }

    function applyActiveQuoteUiState(quote, options = {}) {
        const itemEl = document.getElementById(`quote-item-${quote.id}`);
        const quoteDataEl = document.getElementById(`quote-data-${quote.id}`);
        const quoteTextWrapperEl = document.getElementById(`quote-text-wrapper-${quote.id}`);
        const quoteTextEl = document.getElementById(`quote-text-${quote.id}`);
        const state = quoteMarketState.get(quote.id) || {};

        if (itemEl) {
            itemEl.classList.remove('quote-item-paused', 'highlight', 'highlight-past');
        }
        if (quoteDataEl) {
            quoteDataEl.classList.remove('error');
            quoteDataEl.removeAttribute('title');
        }
        if (quoteTextWrapperEl) {
            quoteTextWrapperEl.classList.remove('loading-text');
            if (options.loading) {
                quoteTextWrapperEl.classList.add('loading-text');
            }
        }
        if (quoteTextEl && options.text) {
            quoteTextEl.textContent = options.text;
        }
        updateQuotePairLabel(quote, state);
        updatePauseButtonState(quote);
        clearQuoteAlertUi(quote.id);
        clearQuoteTrendArrow(quote.id);
        if (options.clearInverse) {
            removeInverseQuoteElement(quote.id);
        }
    }

    function doesArbDetailUseQuote(quoteId) {
        const selectedOpportunity = arbDetailState.selectedOpportunity;
        if (!selectedOpportunity || !selectedOpportunity.cycle) return false;
        return (selectedOpportunity.cycle.legs || []).some((leg) => !isRuleLeg(leg) && Number(leg.quoteId) === Number(quoteId));
    }

    function nudgeArbDetailInput(index, delta) {
        const card = arbDetailState.cards[index];
        if (!card) return;
        const currentValue = Number(card.inputAmount);
        const base = Number.isFinite(currentValue) && currentValue > 0 ? currentValue : 1;
        const nextValue = Math.max(0.1, Number((base + delta).toFixed(4)));
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
        const firstLeg = (cycle?.legs || []).find(leg => !isRuleLeg(leg) && leg.quoteId !== undefined && leg.quoteId !== null);
        if (!firstLeg) return 1;
        const match = findQuoteById(firstLeg.quoteId);
        const amount = match && match.quote ? Number(match.quote.amount) : NaN;
        return Number.isFinite(amount) && amount > 0 ? amount : 1;
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
        const activeIds = new Set(
            (Array.isArray(pathAlertConfig && pathAlertConfig.alerts) ? pathAlertConfig.alerts : [])
                .filter((alert) => alert && alert.id && alert.enabled !== false)
                .map((alert) => alert.id)
        );
        for (const alertId of Array.from(pathAlertRuntimeState.keys())) {
            if (!activeIds.has(alertId)) {
                pathAlertRuntimeState.delete(alertId);
            }
        }
    }

    function resolveDataTerminalRecordsCacheKey() {
        return getDashboardRuntimeUtils().buildDataTerminalRecordsCacheKey(dashboardState, quoteMarketStateRevision);
    }

    function clearDataTerminalTimer() {
        if (dataTerminalState.timer) {
            clearTimeout(dataTerminalState.timer);
            dataTerminalState.timer = null;
        }
    }

    function hasDataTerminalActiveQuery() {
        return getDataTerminalUtils().parseDataTerminalQuery(dataTerminalState.query).length > 0;
    }

    function buildDataTerminalRecords() {
        const cacheKey = resolveDataTerminalRecordsCacheKey();
        if (dataTerminalRecordsCache && dataTerminalRecordsCacheKey === cacheKey) {
            return dataTerminalRecordsCache;
        }

        const records = getDataTerminalUtils().buildDataTerminalRecords(dashboardState, quoteMarketState, {
            isQuoteActive: (quote) => !isQuotePaused(quote)
        });

        dataTerminalRecordsCacheKey = cacheKey;
        dataTerminalRecordsCache = records;
        return records;
    }

    function buildDataTerminalCandidates(utils) {
        const cacheKey = resolveDataTerminalRecordsCacheKey();
        if (dataTerminalCandidatesCache && dataTerminalCandidatesCacheKey === cacheKey) {
            return dataTerminalCandidatesCache;
        }
        const candidates = utils.buildDataTerminalCandidates(buildDataTerminalRecords());
        dataTerminalCandidatesCacheKey = cacheKey;
        dataTerminalCandidatesCache = candidates;
        return candidates;
    }

    function renderDataTerminalPanel() {
        if (!dataTerminalState.visible || !dataTerminalState.domRefs) return;
        const refs = dataTerminalState.domRefs;
        const utils = getDataTerminalUtils();
        if (!refs.content) return;

        if (refs.searchInput && refs.searchInput.value !== dataTerminalState.query) {
            refs.searchInput.value = dataTerminalState.query;
        }
        if (refs.aliasToggle) {
            refs.aliasToggle.checked = dataTerminalState.allowAliases;
        }
        if (refs.diffToggle) {
            refs.diffToggle.checked = dataTerminalState.showDiff;
        }

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
                    buildPairLinkHtml: (row, className, label) => buildDexLinkCopyButtonHtml({
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
        const eventTarget = resolveEventTargetElement(event);
        if (!eventTarget) return;
        const copyBtn = eventTarget.closest('[data-dex-link-copy]');
        if (copyBtn) {
            event.preventDefault();
            event.stopPropagation();
            void copyDexLinkFromElement(copyBtn);
            return;
        }
        const rowEl = eventTarget.closest('[data-data-terminal-row-key]');
        if (!rowEl) return;
        const side = rowEl.dataset.dataTerminalSide;
        const rowKey = rowEl.dataset.dataTerminalRowKey || '';
        if (!rowKey) return;

        if (side === 'left') {
            dataTerminalState.selectedLeftKey = dataTerminalState.selectedLeftKey === rowKey ? '' : rowKey;
        } else if (side === 'right') {
            dataTerminalState.selectedRightKey = dataTerminalState.selectedRightKey === rowKey ? '' : rowKey;
        } else {
            return;
        }

        renderDataTerminalPanel();
    }

    function scheduleDataTerminalUpdate() {
        if (!dataTerminalState.visible || !dataTerminalState.domRefs || !hasDataTerminalActiveQuery()) {
            return;
        }
        if (dataTerminalState.timer) return;
        dataTerminalState.timer = setTimeout(() => {
            dataTerminalState.timer = null;
            renderDataTerminalPanel();
        }, DATA_TERMINAL_UPDATE_DELAY_MS);
    }

    function handleDataTerminalHeaderClick(event) {
        if (!event) return;
        if (closestEventTarget(event, 'button')) {
            return;
        }
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
        panel.style.zIndex = String(FLOATING_PANEL_BASE_Z_INDEX);
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

        if (refs.searchInput) {
            refs.searchInput.value = dataTerminalState.query;
            refs.searchInput.addEventListener('input', (event) => {
                dataTerminalState.query = event.target.value || '';
                renderDataTerminalPanel();
            });
            refs.searchInput.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                event.target.blur();
            });
        }
        if (refs.aliasToggle) {
            refs.aliasToggle.checked = dataTerminalState.allowAliases;
            refs.aliasToggle.addEventListener('change', (event) => {
                dataTerminalState.allowAliases = event.target.checked;
                renderDataTerminalPanel();
            });
        }
        if (refs.diffToggle) {
            refs.diffToggle.checked = dataTerminalState.showDiff;
            refs.diffToggle.addEventListener('change', (event) => {
                dataTerminalState.showDiff = event.target.checked;
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
            makeDraggable(panel, refs.header);
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

    function updateGlobalArbFilterBar() {
        if (arbGlobalFilterInput && arbGlobalFilterInput.value !== arbGlobalExcludedSymbolsInput) {
            arbGlobalFilterInput.value = arbGlobalExcludedSymbolsInput;
        }
        if (arbGlobalChainFilterInput && arbGlobalChainFilterInput.value !== arbGlobalExcludedChainsInput) {
            arbGlobalChainFilterInput.value = arbGlobalExcludedChainsInput;
        }
        if (arbGlobalIncludeFilterInput && arbGlobalIncludeFilterInput.value !== arbGlobalIncludedSymbolsInput) {
            arbGlobalIncludeFilterInput.value = arbGlobalIncludedSymbolsInput;
        }
        if (arbGlobalTwoLegOnlyInput && arbGlobalTwoLegOnlyInput.checked !== arbGlobalTwoLegOnly) {
            arbGlobalTwoLegOnlyInput.checked = arbGlobalTwoLegOnly;
        }
        if (arbGlobalFilterClearBtn) {
            arbGlobalFilterClearBtn.disabled = !arbGlobalExcludedSymbolsInput.trim() && !arbGlobalExcludedChainsInput.trim() && !arbGlobalIncludedSymbolsInput.trim() && arbGlobalTwoLegOnly !== true;
        }
    }

    function getDefaultArbDisplayMinProfitBp() {
        return getArbPanelLayoutUtils().resolveDefaultDisplayMinProfitBp(getPathAlertRuleDefinitionsUtils());
    }

    function getFixedRuleDisplayMinProfitBp(rule) {
        return getArbPanelLayoutUtils().normalizeDisplayMinProfitBp(rule && rule.displayMinProfitBp, getDefaultArbDisplayMinProfitBp());
    }

    function getCycleDisplayState(cycles, maxPositiveCount, expanded = false, options = null) {
        return getArbPanelLayoutUtils().getCycleDisplayState(cycles, maxPositiveCount, expanded, options);
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
        const toggleBtn = closestEventTarget(event, '.arb-path-expand-toggle');
        if (toggleBtn && arbPathContent.contains(toggleBtn)) {
            const sectionKey = toggleBtn.dataset.arbSectionKey;
            if (!sectionKey) return;

            if (arbExpandedSections.has(sectionKey)) {
                arbExpandedSections.delete(sectionKey);
            } else {
                arbExpandedSections.add(sectionKey);
            }
            updateArbPanel();
            return;
        }

        const opportunityEl = closestEventTarget(event, '[data-arb-opportunity-id]');
        if (!opportunityEl) return;
        const opportunityId = opportunityEl.dataset.arbOpportunityId;
        if (!opportunityId) return;
        if (arbLastPointerOpenedOpportunityId === opportunityId) {
            arbLastPointerOpenedOpportunityId = null;
            return;
        }
        openArbDetailModal(opportunityId);
    }

    function handleArbPathContentKeydown(event) {
        if (!arbPathContent) return;
        const opportunityEl = closestEventTarget(event, '[data-arb-opportunity-id]');
        if (!opportunityEl) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openArbDetailModal(opportunityEl.dataset.arbOpportunityId);
    }

    function handleArbPathContentPointerDown(event) {
        if (!arbPathContent) return;
        if (typeof event.button === 'number' && event.button !== 0) return;
        if (closestEventTarget(event, '.arb-path-expand-toggle')) return;

        const opportunityEl = closestEventTarget(event, '[data-arb-opportunity-id]');
        if (!opportunityEl) return;
        const opportunityId = opportunityEl.dataset.arbOpportunityId;
        if (!opportunityId) return;

        arbLastPointerOpenedOpportunityId = opportunityId;
        openArbDetailModal(opportunityId);
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
        const cycle = entry && entry.cycle ? entry.cycle : entry;
        if (!cycle) return '';
        const chartsUtils = getChartsUtils();
        if (!chartsUtils || typeof chartsUtils.buildChartsPageHref !== 'function') {
            return '';
        }
        const chartPairs = getArbDetailUtils().buildArbDetailChartPairs(cycle);
        return chartPairs.length ? chartsUtils.buildChartsPageHref(chartPairs) : '';
    }

    function refreshArbOpportunityStore(nextOpportunityMap) {
        const retainedEntries = [];
        if (arbDetailState && arbDetailState.selectedOpportunity && arbDetailState.selectedOpportunity.id) {
            retainedEntries.push(arbDetailState.selectedOpportunity);
        }
        if (arbDetailState && arbDetailState.opportunityId && arbOpportunityStore.has(arbDetailState.opportunityId)) {
            retainedEntries.push(arbOpportunityStore.get(arbDetailState.opportunityId));
        }

        arbOpportunityStore = getArbRuntimeMemoryUtils().buildRetainedArbOpportunityStore(nextOpportunityMap, retainedEntries);
    }

    function buildArbDetailRowsHtml(card, cardIndex) {
        return getArbDetailUtils().buildArbDetailRowsHtml(card, {
            cardIndex,
            buildSourceHtml: (row, options) => buildArbDetailSourceHtml(row, options)
        });
    }

    function buildArbDetailSourceHtml(row, options = {}) {
        return getArbDetailUtils().buildArbDetailSourceHtml(row, options);
    }

    function promptMutedPathLegDurationHours() {
        const input = window.prompt('输入屏蔽时长（小时，正整数）', '2');
        if (input === null) return null;
        const value = Number.parseInt(String(input).trim(), 10);
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    function getArbDetailRateDeltaTone(rateDeltaText) {
        const value = Number.parseFloat(String(rateDeltaText || ''));
        if (!Number.isFinite(value)) return 'neutral';
        if (value > 0) return 'positive';
        if (value < 0) return 'negative';
        return 'neutral';
    }

    function buildArbDetailSummaryHtml(card, index, bestProfitIndices, bestProfitRateIndices) {
        return getArbDetailUtils().buildArbDetailSummaryHtml(card, {
            index,
            bestProfitIndices,
            bestProfitRateIndices,
            formatNumber: formatDetailNumber,
            formatProfitRate: formatDetailProfitRate
        });
    }

    function shouldRebuildArbDetailShell() {
        if (!arbDetailGrid) return false;
        if (arbDetailGrid.querySelectorAll('[data-arb-detail-card-index]').length !== arbDetailState.cards.length) {
            return true;
        }

        return arbDetailState.cards.some((_, index) => {
            const ids = getArbDetailUtils().getArbDetailCardDomIds(index);
            return !document.getElementById(ids.inputId)
                || !document.getElementById(ids.rowsId)
                || !document.getElementById(ids.summaryId);
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
        return getArbDetailUtils().getArbDetailBudgetTimestamp(
            quoteSourceLastRequestAtByIntervalKey,
            source
        );
    }

    function recordQuoteSourceBudgetTimestamp(source, requestedAt = Date.now()) {
        return getArbDetailUtils().recordArbDetailBudgetTimestamp(
            quoteSourceLastRequestAtByIntervalKey,
            source,
            requestedAt
        );
    }

    function syncArbDetailPrimaryCardQuoteState(quote, data, successSource, isInverseFetch) {
        if (!quote) return;
        const previousState = quoteMarketState.get(quote.id) || {};
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
        if (arbDetailChartAutoRefreshTimer) {
            clearInterval(arbDetailChartAutoRefreshTimer);
            arbDetailChartAutoRefreshTimer = null;
        }
        if (!arbDetailState.visible || !arbDetailChartAutoRefreshToggle || !arbDetailChartAutoRefreshToggle.checked) {
            return;
        }
        arbDetailChartAutoRefreshTimer = setInterval(() => {
            if (!arbDetailState.visible) return;
            void syncArbDetailChartPreview(arbDetailState.selectedOpportunity, {
                forceReload: true
            });
        }, CHART_AUTO_REFRESH_INTERVAL_MS);
    }

    function renderArbDetailChartPreviewMessage(message) {
        if (!arbDetailChartPreview) return;
        arbDetailChartPreview.innerHTML = getArbDetailUtils().buildArbDetailChartMessageHtml(message);
    }

    function buildArbDetailChartPreviewSignature(pairs) {
        return JSON.stringify((pairs || []).map((pair) => `${pair.quoteId}:${pair.direction}`));
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

        const validSeries = (seriesList || []).filter((series) => Array.isArray(series) && series.length);
        if (validSeries.length < 2) {
            renderArbDetailProfitPreviewMessage('至少需要 2 张价格图表。');
            return;
        }

        const utils = getChartsUtils();
        if (!utils || typeof utils.buildProfitChartPoints !== 'function') {
            renderArbDetailProfitPreviewMessage('收益图算法未就绪，请刷新页面后重试。');
            return;
        }

        if (!renderer || typeof renderer.mountProfitHistoryChart !== 'function') {
            renderArbDetailProfitPreviewMessage('图表模块未就绪，请刷新页面后重试。');
            return;
        }

        const points = utils.buildProfitChartPoints(validSeries);
        if (!points.length) {
            renderArbDetailProfitPreviewMessage('当前价格图表缺少对齐时间点，暂时无法计算收益。');
            return;
        }

        cardEl.innerHTML = getArbDetailUtils().buildArbDetailProfitPreviewReadyHtml(validSeries.length);
        const canvasEl = cardEl.querySelector('.arb-detail-profit-canvas');
        const metaEl = cardEl ? cardEl.querySelector('.arb-detail-profit-meta') : null;
        if (!canvasEl) return;

        const chartInstance = renderer.mountProfitHistoryChart(canvasEl, {
            mini: true,
            height: 104,
            showRightPriceScale: true
        });
        chartInstance.update(points);
        arbDetailChartPreviewCharts.push(chartInstance);

        if (metaEl) {
            metaEl.textContent = `按当前 ${validSeries.length} 张价格图逐时点乘积计算，> 1.0 为正收益。`;
        }
    }

    async function syncArbDetailChartPreview(current, options = {}) {
        if (!arbDetailChartPreview) return;
        const forceReload = options.forceReload === true;

        const pairs = current && current.cycle
            ? getArbDetailUtils().buildArbDetailChartPairs(current.cycle)
            : [];
        const signature = buildArbDetailChartPreviewSignature(pairs);
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
        for (const controller of activeFetchControllers.values()) {
            controller.abort();
        }
        activeFetchControllers.clear();
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
        arbDetailState.visible = false;
        arbDetailState.opportunityId = null;
        arbDetailState.selectedOpportunity = null;
        arbDetailState.cards = [];
        arbDetailState.refreshToken += 1;
        arbDetailState.isRefreshing = false;
        arbDetailState.editingInputIndex = null;
        arbDetailState.chartPreviewSignature = '';
        arbDetailChartPreviewRunId += 1;
        destroyArbDetailChartPreview();
        if (arbDetailChartAutoRefreshTimer) {
            clearInterval(arbDetailChartAutoRefreshTimer);
            arbDetailChartAutoRefreshTimer = null;
        }
        setArbDetailChartLinkState('');
        if (arbDetailModal) {
            arbDetailModal.classList.remove('visible');
        }
        setArbDetailDashboardPause(false);
    }

    function openArbDetailModal(opportunityId) {
        clearArbDetailRefreshTimer();
        let current = arbOpportunityMap.get(opportunityId) || arbOpportunityStore.get(opportunityId);
        if (!current) {
            updateArbPanel();
            current = arbOpportunityMap.get(opportunityId) || arbOpportunityStore.get(opportunityId);
        }
        if (!current || !current.cycle) return;

        if (arbDetailFetchController) {
            arbDetailFetchController.abort();
            arbDetailFetchController = null;
        }

        const baseAmount = getArbOpportunityBaseAmount(current.cycle);
        const defaultAmounts = getArbDetailUtils().buildDetailInputAmounts(baseAmount);
        arbDetailState.visible = true;
        arbDetailState.opportunityId = opportunityId;
        arbDetailState.selectedOpportunity = {
            ...current,
            cycle: current.cycle
                ? { ...current.cycle, legs: Array.isArray(current.cycle.legs) ? current.cycle.legs.map(leg => ({ ...leg })) : [] }
                : null
        };
        arbDetailState.cards = defaultAmounts.map((amount) => ({
            inputAmount: amount,
            rows: [],
            summary: null,
            error: '',
            requestVersion: 0
        }));
        arbDetailState.refreshToken += 1;
        arbDetailState.isRefreshing = false;
        arbDetailState.editingInputIndex = null;
        arbDetailState.chartPreviewSignature = '';
        if (arbDetailChartAutoRefreshToggle) {
            arbDetailChartAutoRefreshToggle.checked = true;
        }
        setArbDetailDashboardPause(true);
        renderArbDetailModal(true);
        syncArbDetailChartAutoRefreshTimer();
        startArbDetailRefresh(arbDetailState.refreshToken);
    }

    function updateArbDetailInput(index, rawValue) {
        const card = arbDetailState.cards[index];
        if (!card) return;
        const parsed = getArbDetailUtils().parseCommittedArbDetailInput(rawValue);
        if (parsed === null) return;
        card.inputAmount = parsed;
        card.rows = [];
        card.summary = null;
        card.error = '';
        card.requestVersion = getArbDetailUtils().getNextArbDetailRequestVersion(card.requestVersion);
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
                    const rows = [];
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
                        const isInverseLeg = Boolean(leg.inverse);
                        rows.push({
                            quoteId: Number(match.quote.id),
                            direction: isInverseLeg ? 'inverse' : 'forward',
                            pricingMode: 'raw',
                            chain: match.quote.chain,
                            chainLabel: formatChainLabel(match.quote.chain),
                            fromSymbol: data.symbols.from,
                            toSymbol: data.symbols.to,
                            fromTokenAddress: isInverseLeg ? match.quote.toToken : match.quote.fromToken,
                            toTokenAddress: isInverseLeg ? match.quote.fromToken : match.quote.toToken,
                            inputAmount: legInputAmount,
                            rawPrice: data.rawPrice,
                            rateText: getArbDetailUtils().buildArbDetailRateText(
                                data.rawPrice,
                                data.symbols.from,
                                data.symbols.to
                            ),
                            amountText: `${formatDetailNumber(data.finalAmountOut)}`,
                            sourceText: data.usedSource || match.quote.preferredSource || 'Unknown'
                        });
                    }

                    if (shouldSkipApply || !getArbDetailUtils().shouldApplyArbDetailRequestVersion(requestVersion, card.requestVersion)) {
                        continue;
                    }

                    const summary = getArbDetailUtils().summarizeDetailResult(startAmount, rollingAmount);
                    if (cardIndex === 3) {
                        const baseRows = Array.isArray(arbDetailState.cards[0]?.rows) ? arbDetailState.cards[0].rows : [];
                        rows.forEach((row, rowIndex) => {
                            const baseRow = baseRows[rowIndex];
                            const rateDeltaText = getArbDetailUtils().buildArbDetailRateDeltaText(
                                baseRow && baseRow.rawPrice,
                                row && row.rawPrice
                            );
                            row.rateDeltaText = rateDeltaText;
                            row.rateDeltaTone = getArbDetailRateDeltaTone(rateDeltaText);
                        });
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

    function handleArbGlobalFilterInput(event) {
        const nextValue = (event && event.target && typeof event.target.value === 'string') ? event.target.value : '';
        if (nextValue === arbGlobalExcludedSymbolsInput) return;
        arbGlobalExcludedSymbolsInput = nextValue;
        updateArbPanel();
    }

    function handleArbGlobalChainFilterInput(event) {
        const nextValue = (event && event.target && typeof event.target.value === 'string') ? event.target.value : '';
        if (nextValue === arbGlobalExcludedChainsInput) return;
        arbGlobalExcludedChainsInput = nextValue;
        updateArbPanel();
    }

    function handleArbGlobalIncludeFilterInput(event) {
        const nextValue = (event && event.target && typeof event.target.value === 'string') ? event.target.value : '';
        if (nextValue === arbGlobalIncludedSymbolsInput) return;
        arbGlobalIncludedSymbolsInput = nextValue;
        updateArbPanel();
    }

    function handleArbGlobalTwoLegOnlyChange(event) {
        const nextChecked = Boolean(event && event.target && event.target.checked);
        if (nextChecked === arbGlobalTwoLegOnly) return;
        arbGlobalTwoLegOnly = nextChecked;
        updateArbPanel();
    }

    function handleArbGlobalFilterClear() {
        if (!arbGlobalExcludedSymbolsInput && !arbGlobalExcludedChainsInput && !arbGlobalIncludedSymbolsInput && !arbGlobalTwoLegOnly) return;
        arbGlobalExcludedSymbolsInput = '';
        arbGlobalExcludedChainsInput = '';
        arbGlobalIncludedSymbolsInput = '';
        arbGlobalTwoLegOnly = false;
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

    function buildQuoteAlertThresholdLine(target) {
        return getPathAlertNotificationUtils().buildQuoteAlertThresholdLine(target);
    }

    function getPathAlertNotificationUtils() {
        if (!window.PathAlertNotificationUtils) {
            throw new Error('PathAlertNotificationUtils is not loaded');
        }
        return window.PathAlertNotificationUtils;
    }

    function formatPathAlertEvaluationText(evaluation) {
        return getPathAlertNotificationUtils().formatPathAlertEvaluationText(evaluation);
    }

    function buildPathAlertSummaryLines(alert) {
        if (alert && alert.target && alert.target.type === 'quote') {
            const displayTitle = String(alert.name || '').trim();
            if (displayTitle) {
                return [
                    displayTitle,
                    buildQuoteAlertThresholdLine(alert.target)
                ];
            }
            const match = findQuoteById(Number(alert.target.quoteId));
            const quote = match ? match.quote : null;
            const monitorState = quote ? quoteMarketState.get(Number(quote.id)) : null;
            const label = quote
                ? buildQuoteAlertDisplayLabel(quote, monitorState || {}, getQuoteAlertDirection(alert.target))
                : `报价 #${String(alert.target.quoteId || '--')}`;
            const ruleLine = alert.target.ruleKind === 'targetAbove'
                ? `汇率 >= ${String(alert.target.value != null ? alert.target.value : '--')}`
                : alert.target.ruleKind === 'targetBelow'
                    ? `汇率 <= ${String(alert.target.value != null ? alert.target.value : '--')}`
                    : alert.target.ruleKind === 'percentUp'
                        ? `相对基准上涨 >= ${String(alert.target.value != null ? alert.target.value : '--')}%`
                        : `相对基准下跌 >= ${String(alert.target.value != null ? alert.target.value : '--')}%`;
            return [label, ruleLine];
        }
        return getPathAlertUtils().buildPathAlertSummaryLines(alert, {
            formatLeg(leg) {
                const match = findQuoteById(Number(leg.quoteId));
                const state = match ? quoteMarketState.get(Number(leg.quoteId)) : null;
                if (state && state.fromSymbol && state.toSymbol) {
                    if (leg.pricingMode === 'cex-ask1-inverse') {
                        return buildLiveQuoteLabel(leg.chain, state.toSymbol, state.fromSymbol, ' [ask1]');
                    }
                    if (leg.pricingMode === 'cex-bid1') {
                        return buildLiveQuoteLabel(leg.chain, state.fromSymbol, state.toSymbol, ' [bid1]');
                    }
                    if (leg.direction === 'inverse') {
                        return buildLiveQuoteLabel(leg.chain, state.toSymbol, state.fromSymbol);
                    }
                    return buildLiveQuoteLabel(leg.chain, state.fromSymbol, state.toSymbol);
                }
                return buildLiveQuoteLabel(leg.chain, leg.fromSymbol, leg.toSymbol);
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
        if (!leg) return '--';
        const suffix = leg.pricingMode === 'cex-bid1'
            ? ' [bid1]'
            : leg.pricingMode === 'cex-ask1-inverse'
                ? ' [ask1]'
                : '';
        return buildLiveQuoteLabel(leg.chain, leg.fromSymbol, leg.toSymbol, suffix);
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
            quoteStateById: quoteMarketState,
            resolveRuleEvaluation(target, alert) {
                return buildRuleAlertEvaluation(target, alert, sharedRuleSnapshot);
            }
        };
    }

    function formatPathAlertNotificationTitle(triggeredEntries) {
        return getPathAlertNotificationUtils().buildPathAlertNotificationTitle(triggeredEntries);
    }

    function buildPathAlertNotificationBody(triggeredEntries) {
        return getPathAlertNotificationUtils().buildPathAlertNotificationBody(triggeredEntries);
    }

    async function sendPathAlertWebhookNotification(triggeredEntries) {
        if (!pathAlertConfig.settings || pathAlertConfig.settings.webhookEnabled !== true) return;
        try {
            const response = await fetch(`${BACKEND_URL}/api/send-path-alert-webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formatPathAlertNotificationTitle(triggeredEntries),
                    body: buildPathAlertNotificationBody(triggeredEntries)
                })
            });
            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error((data && data.error) || '请求失败');
            }
        } catch (error) {
            console.error('路径报警 webhook 发送失败:', error);
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
        const allLegSnapshots = pathAlertUtils.buildAllLegSnapshots(sharedRuleSnapshot.allQuotes || [], quoteMarketState);
        const nowMs = Date.now();
        const logTriggeredEntries = [];
        const remoteTriggeredEntries = [];
        let shouldRefreshArbPanelHighlights = false;

        for (const alert of evaluationAlerts) {
            const runtimeAlert = pathAlertUtils.buildEffectiveRuntimeAlert(alert, { forceImmediate: forceImmediateAlerts });
            const evaluation = pathAlertUtils.evaluatePathAlert(alert, context);
            const previous = pathAlertRuntimeState.get(alert.id) || null;
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
                const changedLegMinBp = Number(pathAlertConfig?.settings?.changedLegMinBp);
                const changedLegs = pathAlertUtils.buildChangedLegs(
                    snapshotState.currentSnapshots,
                    snapshotState.baselineSnapshots,
                    Number.isFinite(changedLegMinBp) ? changedLegMinBp : 0.1
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
            next.isSoundActive = Boolean(next.shouldTrigger && !isMuted && pathAlertConfig.settings && pathAlertConfig.settings.localSoundEnabled !== false);
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
        if (pathAlertEvalTimer) clearInterval(pathAlertEvalTimer);
        pathAlertEvalTimer = null;
        if (!hasActivePathAlertEvaluationTarget()) return;
        const intervalMs = Number(pathAlertConfig?.settings?.pathAlertEvalIntervalMs);
        if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;
        pathAlertEvalTimer = setInterval(evaluatePathAlertsOnce, intervalMs);
        evaluatePathAlertsOnce();
    }

    function emitPathAlertConfigSync(source) {
        const payload = JSON.stringify({
            source: String(source || ''),
            ts: Date.now()
        });
        try {
            const storage = getLocalStorageSafe();
            if (storage) {
                storage.setItem(PATH_ALERT_CONFIG_SYNC_KEY, payload);
            }
        } catch (error) {
            console.warn('[path-alert-config] sync emit failed', error);
        }
    }

    function scheduleExternalPathAlertReload(reason) {
        if (pathAlertExternalReloadTimer) clearTimeout(pathAlertExternalReloadTimer);
        pathAlertExternalReloadTimer = setTimeout(() => {
            pathAlertExternalReloadTimer = null;
            reloadPathAlertConfigFromServer().catch((error) => {
                console.error('[path-alert-config] external reload failed', reason, error);
            });
        }, 60);
    }

    function handlePathAlertConfigSyncStorage(event) {
        if (!event || event.key !== PATH_ALERT_CONFIG_SYNC_KEY || !event.newValue) return;
        try {
            const payload = JSON.parse(event.newValue);
            if (payload && payload.source === PATH_ALERT_CONFIG_SYNC_SOURCE_MAIN) return;
        } catch (error) {
            console.warn('[path-alert-config] invalid sync payload', error);
        }
        scheduleExternalPathAlertReload('storage');
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
        emitPathAlertConfigSync(PATH_ALERT_CONFIG_SYNC_SOURCE_MAIN);
    }

    function queuePathAlertConfigSave() {
        if (pathAlertSaveTimer) clearTimeout(pathAlertSaveTimer);
        pathAlertSaveTimer = setTimeout(() => {
            pathAlertSaveTimer = null;
            persistPathAlertConfig().catch((error) => console.error('保存路径报警配置失败:', error));
        }, 250);
    }

    function buildPathAlertsManagementHref(options = {}) {
        return getPathAlertPageUtils().buildPathAlertsPageHref(options);
    }

    function openPathAlertsManagementPage(options = {}) {
        const href = buildPathAlertsManagementHref(options);
        window.open(href, '_blank', 'noopener');
    }

    async function loadPathAlertConfig(options = {}) {
        const pathAlertUtils = getPathAlertUtils();
        const fallbackToDefault = options.fallbackToDefault !== false;
        try {
            const response = await fetch(`${BACKEND_URL}/api/get-alert-config`);
            if (!response.ok) throw new Error('获取路径报警配置失败');
            const data = await response.json();
            pathAlertConfig = pathAlertUtils.normalizeAlertConfig(data);
        } catch (error) {
            if (!fallbackToDefault) {
                throw error;
            }
            console.warn('加载路径报警配置失败:', error);
            pathAlertConfig = pathAlertUtils.normalizeAlertConfig();
        }
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
            forceImmediateAlerts,
            getRuntime: (alert) => pathAlertRuntimeState.get(alert.id) || null,
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
        const logTabBtn = closestEventTarget(event, '#alert-log-log-tab');
        if (logTabBtn) {
            alertLogActiveTab = 'log';
            renderAlertLogTabState();
            return;
        }
        const mutedLogTabBtn = closestEventTarget(event, '#alert-log-muted-log-tab');
        if (mutedLogTabBtn) {
            alertLogActiveTab = 'muted-log';
            renderAlertLogTabState();
            return;
        }
        const mutedTabBtn = closestEventTarget(event, '#alert-log-muted-tab');
        if (mutedTabBtn) {
            alertLogActiveTab = 'muted';
            renderAlertLogTabState();
            return;
        }
        const quoteDexLinkEl = closestEventTarget(event, '[data-quote-alert-dex-link-copy]');
        if (quoteDexLinkEl) {
            event.preventDefault();
            void copyDexLinkFromElement(quoteDexLinkEl);
            return;
        }
        const extendMutedPathTargetBtn = closestEventTarget(event, '[data-muted-path-target-extend]');
        if (extendMutedPathTargetBtn) {
            extendMutedPathTargetByKey(String(extendMutedPathTargetBtn.dataset.mutedPathTargetExtend || ''), Date.now());
            return;
        }
        const restoreMutedPathTargetBtn = closestEventTarget(event, '[data-muted-path-target-restore]');
        if (restoreMutedPathTargetBtn) {
            removeMutedPathTargetByKey(String(restoreMutedPathTargetBtn.dataset.mutedPathTargetRestore || ''), Date.now());
            return;
        }
        const extendMutedPathLegBtn = closestEventTarget(event, '[data-muted-path-leg-extend]');
        if (extendMutedPathLegBtn) {
            extendMutedPathLegByKey(String(extendMutedPathLegBtn.dataset.mutedPathLegExtend || ''), Date.now());
            return;
        }
        const restoreMutedPathLegBtn = closestEventTarget(event, '[data-muted-path-leg-restore]');
        if (restoreMutedPathLegBtn) {
            removeMutedPathLegByKey(String(restoreMutedPathLegBtn.dataset.mutedPathLegRestore || ''), Date.now());
            return;
        }
        const muteBtn = closestEventTarget(event, '[data-path-alert-log-mute]');
        const quoteMuteBtn = closestEventTarget(event, '[data-quote-alert-log-mute]');
        const buttonEl = muteBtn || quoteMuteBtn;
        if (buttonEl && !buttonEl.disabled) {
            if (extendMutedPathTargetFromLogButton(buttonEl, Date.now())) {
                return;
            }
            const alertId = String(
                (muteBtn && muteBtn.dataset.pathAlertLogMute)
                || (quoteMuteBtn && quoteMuteBtn.dataset.quoteAlertLogMute)
                || ''
            ).trim();
            if (!alertId) return;
            const runtime = pathAlertRuntimeState.get(alertId);
            if (!runtime || !runtime.evaluation) return;
            const alert = (pathAlertConfig.alerts || []).find((item) => item && item.id === alertId);
            if (!alert || !alert.target) return;
            if (alert.target.type === 'quote') {
                const quote = findDashboardQuoteById(alert.target.quoteId);
                if (!quote) return;
                const triggeredEntry = buildQuoteAlertTriggeredEntry(
                    alert,
                    quote,
                    buildQuoteAlertMessage(alert, runtime.evaluation),
                    {
                        currentValueText: buildQuoteAlertCurrentValueText(quote, alert, runtime.evaluation)
                    }
                );
                mutePathAlertTarget(triggeredEntry, Date.now());
                return;
            }
            const changedLegMinBp = Number(pathAlertConfig?.settings?.changedLegMinBp);
            const triggeredEntry = buildTriggeredPathAlertEntry(
                alert,
                runtime.evaluation,
                getPathAlertUtils().buildChangedLegs(
                    Array.isArray(runtime.currentLegSnapshots) ? runtime.currentLegSnapshots : [],
                    Array.isArray(runtime.baselineLegSnapshots) ? runtime.baselineLegSnapshots : [],
                    Number.isFinite(changedLegMinBp) ? changedLegMinBp : 0.1
                )
            );
            mutePathAlertTarget(triggeredEntry, Date.now());
            return;
        }
        if (closestEventTarget(event, 'a, button')) return;
        const collapsedCard = closestEventTarget(event, '[data-alert-log-collapsed="1"]');
        if (collapsedCard) {
            expandCollapsedAlertLogCard(collapsedCard);
            return;
        }
    }

    function handlePathAlertPanelChange(event) {
        const forceImmediateToggle = closestEventTarget(event, '[data-path-alert-force-immediate]');
        if (forceImmediateToggle) {
            forceImmediateAlerts = forceImmediateToggle.checked;
            if (forceImmediateAlerts) {
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
        const toggle = closestEventTarget(event, '[data-path-alert-global-toggle]');
        if (!toggle || !pathAlertConfig.settings) return;
        const key = toggle.dataset.pathAlertGlobalToggle;
        if (!key) return;
        pathAlertConfig.settings[key] = toggle.checked;
        queuePathAlertConfigSave();
        updateAlertSoundState();
    }

    function handlePathAlertPanelClick(event) {
        const deleteBtn = closestEventTarget(event, '[data-path-alert-delete]');
        if (deleteBtn) {
            removePathAlertById(deleteBtn.dataset.pathAlertDelete);
            queuePathAlertConfigSave();
            return;
        }

        const dismissDeleteBtn = closestEventTarget(event, '[data-path-alert-dismiss-delete]');
        if (dismissDeleteBtn) {
            dismissPathAlertById(dismissDeleteBtn.dataset.pathAlertDismissDelete);
            queuePathAlertConfigSave();
        }
    }

    async function reloadPathAlertConfigFromServer() {
        if (pathAlertReloading) return;
        pathAlertReloading = true;
        renderPathAlertPanel();
        try {
            forceImmediateAlerts = false;
            await loadPathAlertConfig({ fallbackToDefault: false });
            pathAlertRuntimeState = new Map();
            restartPathAlertScheduler();
        } finally {
            pathAlertReloading = false;
            renderPathAlertPanel();
        }
    }

    function buildQuotePriceWatchSection() {
        return getArbPanelLayoutUtils().buildQuotePriceWatchSection({
            watchItems: getArbPathConfigUtils().getQuotePriceWatchItems(ARB_PATH_CONFIG),
            findQuote: (item) => findDashboardQuoteById(item.quoteId),
            getQuoteState: (quote) => quoteMarketState.get(Number(quote.id)) || {},
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
            .map((template) => templateUtils.evaluateCycleTemplate(template, quoteMarketState))
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
        const filterState = layoutUtils.filterGlobalArbCycles(globalCycles, {
            includedSymbols,
            excludedSymbols,
            excludedChains,
            twoLegOnly: arbGlobalTwoLegOnly,
            isRuleLeg
        });
        const filteredGlobalCycles = filterState.cycles;
        const hasGlobalFilter = filterState.hasFilter;
        updateGlobalArbFilterBar();
        const globalCycleDisplayState = getCycleDisplayState(filteredGlobalCycles, 8, arbExpandedSections.has(globalSectionKey));
        const opportunities = layoutUtils.mapEntriesForDisplayCycles(globalCycles, globalCycleDisplayState.displayCycles, (cycle, index) => createArbOpportunityEntry(
            nextOpportunityMap,
            nextOpportunityIdsByTargetKey,
            cycle,
            `机会 ${index + 1}`,
            { section: '全局路径', alertPreset: { type: 'path' } }
        ));

        return {
            title: '全局路径',
            opportunities,
            footerHtml: buildArbSectionToggleHtml(globalSectionKey, globalCycleDisplayState),
            emptyText: hasGlobalFilter ? '过滤后暂无路径' : '等待数据...'
        };
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
        const fixedColumns = getArbPanelLayoutUtils().splitSectionsBySectionCount(fixedSections, 6, 2);
        const columns = [
            fixedColumns[0] || [],
            fixedColumns[1] || [],
            specialSections,
            [buildQuotePriceWatchSection()],
            [globalSection]
        ];

        return {
            columns,
            nextOpportunityMap,
            nextOpportunityIdsByTargetKey
        };
    }

    function updateArbPanel(options = {}) {
        if (!arbPathContent) return;
        if (!options.force && !isArbPanelVisible()) {
            arbPanelDirty = true;
            return;
        }
        arbPanelDirty = false;

        const panelData = buildArbPanelData();
        if (panelData.error) {
            arbPanelHtmlRenderer.reset();
            arbPathContent.textContent = panelData.error;
            return;
        }

        const { columns, nextOpportunityMap, nextOpportunityIdsByTargetKey } = panelData;

        arbOpportunityMap = nextOpportunityMap;
        arbOpportunityIdsByTargetKey = nextOpportunityIdsByTargetKey instanceof Map ? nextOpportunityIdsByTargetKey : new Map();
        refreshArbOpportunityStore(nextOpportunityMap);

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

    async function getMarketQuote(quote, signal, config) {
        const requestQuote = config.requestQuote || quote;
        const response = await fetch(`${BACKEND_URL}${config.endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...requestQuote }),
            signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || config.errorMessage || 'API Request Failed');

        const usedSource = typeof config.resolveUsedSource === 'function'
            ? config.resolveUsedSource(data, quote)
            : config.source;
        return getQuoteRequestUtils().buildMarketQuoteResult(data, usedSource, config);
    }

    async function getCexOrderbookQuote(quote, signal, options) {
        const response = await fetch(`${BACKEND_URL}${options.endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...quote }),
            signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `${options.source} API Request Failed`);

        return getQuoteRequestUtils().buildCexOrderbookQuoteResult(data, quote, {
            source: options.source,
            buildSummary: buildCexOrderbookSummary
        });
    }

    async function apiGetQuote(quote, signal, targetSource) {
        const quoteRequestUtils = getQuoteRequestUtils();
        const requestConfig = quoteRequestUtils.resolveQuoteRequestConfig(targetSource, quote);
        if (requestConfig.type === 'cex') {
            return getCexOrderbookQuote(quote, signal, requestConfig.config);
        }
        return getMarketQuote(quote, signal, requestConfig.config);
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
                if (quoteRequestUtils.shouldSkipQuoteSource(source, quote, {
                    isKyberSupported,
                    is0xSupported
                })) continue;

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
            const previousState = quoteMarketState.get(quote.id) || {};
            resetQuoteUiRuntimeState(quote.id);
            applyPausedQuoteUiState(quote, previousState);
            return;
        }
        const isInverseFetch = fetchMode === 'inverse' && shouldQueueInverseFetch(quote);

        if (activeFetchControllers.has(quote.id)) {
            activeFetchControllers.get(quote.id).abort();
            activeFetchControllers.delete(quote.id);
        }

        const controller = new AbortController();
        const signal = controller.signal;
        activeFetchControllers.set(quote.id, controller);

        if (!isInverseFetch) {
            quoteDataEl.classList.remove('error');
        }

        try {
            const { data, successSource } = await fetchQuoteByStrategy(quote, {
                signal,
                isInverseFetch
            });

            const previousState = quoteMarketState.get(quote.id) || {};
            const inverseContainerId = `inverse-quote-${quote.id}`;
            let inverseEl = document.getElementById(inverseContainerId);

            if (isInverseFetch) {
                if (shouldQueueInverseFetch(quote)) {
                    if (!inverseEl) {
                        inverseEl = document.createElement('div');
                        inverseEl.id = inverseContainerId;
                        inverseEl.className = 'inverse-quote-text';
                        quoteDataEl.appendChild(inverseEl);
                    }

                    inverseEl.textContent = `${quote.amount || 1} ${data.symbols.from} ≈ ${data.finalAmountOut.toFixed(6)} ${data.symbols.to}`;
                    const inverseState = getDashboardRuntimeUtils().buildQuoteResultMarketState(
                        previousState,
                        data,
                        { isInverseFetch: true }
                    );
                    setQuoteMarketState(quote.id, inverseState);
                    inverseEl.textContent = getInverseQuoteDisplayText(quote, inverseState, inverseEl.textContent);
                    bindCopyHandler(
                        inverseEl,
                        () => inverseEl.textContent
                    );
                }
            } else {
                const oldPrice = previousState.lastRawPrice;
                const oldSource = previousState.usedSourceReal;

                const newState = getDashboardRuntimeUtils().buildQuoteResultMarketState(
                    previousState,
                    data,
                    { successSource }
                );

                quoteTextEl.textContent = getQuoteDisplayText(quote, newState);
                updateQuotePairLabel(quote, newState);
                quoteTextWrapperEl.classList.remove('loading-text');

                if (shouldQueueInverseFetch(quote)) {
                    if (!inverseEl) {
                        inverseEl = document.createElement('div');
                        inverseEl.id = inverseContainerId;
                        inverseEl.className = 'inverse-quote-text';
                        inverseEl.textContent = '反向报价排队中...';
                        quoteDataEl.appendChild(inverseEl);
                    }
                } else {
                    if (inverseEl) inverseEl.remove();
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
                    if (!inverseEl) {
                        inverseEl = document.createElement('div');
                        inverseEl.id = `inverse-quote-${quote.id}`;
                        inverseEl.className = 'inverse-quote-text';
                        quoteDataEl.appendChild(inverseEl);
                    }
                    inverseEl.textContent = '反向报价失败';
                    inverseEl.title = errorTitle;
                }
            } else {
                const displayMsg = quoteRequestUtils.formatQuoteErrorMessage(error);

                quoteTextEl.textContent = `❌ ${displayMsg}`;
                quoteTextWrapperEl.classList.remove('loading-text');
                quoteDataEl.classList.add('error');
                quoteDataEl.title = errorTitle;
            }
        } finally {
            if (activeFetchControllers.get(quote.id) === controller) {
                activeFetchControllers.delete(quote.id);
            }
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

    function resolveEventTargetElement(event) {
        return getDomRenderUtils().resolveEventTargetElement(event);
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
        if (!copyToast) return;
        if (copyToastTimer) {
            clearTimeout(copyToastTimer);
            copyToastTimer = null;
        }
        copyToast.textContent = message;
        copyToast.classList.add('visible');
        copyToastTimer = setTimeout(() => {
            copyToast.classList.remove('visible');
        }, 1200);
    }

    function handleQuoteHover(event, quoteId) {
        const textWrapper = event.currentTarget;
        const state = quoteMarketState.get(quoteId);
        const category = dashboardState.find(c => c.quotes && c.quotes.some(q => q.id === quoteId));
        const quote = category ? category.quotes.find(q => q.id === quoteId) : null;
        
        if (!quote) return; 

        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
        
        currentHoveredQuoteId = quoteId;
        textWrapper.onmouseleave = () => hideGlobalTooltip(quoteId);
        
        hoverTimeout = setTimeout(() => {
            if (currentHoveredQuoteId !== quoteId) return;
            
            if (isCexOrderbookChain(quote.chain)) {
                showGlobalTooltip(
                    buildCexOrderbookTooltipHtml(state ? state.cexOrderbook : null),
                    textWrapper,
                    { className: 'cex-orderbook-tooltip-host' }
                );
                return;
            }

            let content = '';
            let sourceInfo = state ? (state.usedSource || '未知') : '等待数据...';

            if (isEvmChain(quote.chain)) {
                let pref = quote.preferredSource || 'Kyber';
                content += `<div>来源：<strong>${sourceInfo}</strong></div>`;
                content += `<div>偏好：${pref}</div>`;
            } else {
                content += `<div>来源：<strong>${sourceInfo}</strong></div>`;
            }
            
            showGlobalTooltip(content, textWrapper);
        }, 100); 
    }

    function showGlobalTooltip(htmlContent, targetEl, options = {}) {
        globalTooltip.innerHTML = htmlContent;
        globalTooltip.classList.remove('visible', 'cex-orderbook-tooltip-host');
        globalTooltip.classList.add('visible');
        if (options.className) {
            globalTooltip.classList.add(options.className);
        }
        
        const rect = targetEl.getBoundingClientRect();
        const top = rect.top;
        const left = rect.left + (rect.width / 2);
        
        globalTooltip.style.top = `${top}px`;
        globalTooltip.style.left = `${left}px`;
    }

    function hideGlobalTooltip(quoteId) {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
        if (currentHoveredQuoteId === quoteId) {
            currentHoveredQuoteId = null;
            globalTooltip.classList.remove('visible');
        }
    }

    function updateTrendArrow(quoteId, currentPrice, oldPrice, currentSource, oldSource) {
        const arrowEl = document.getElementById(`trend-arrow-${quoteId}`);
        if (!arrowEl) return;

        if (currentSource && oldSource && currentSource !== oldSource) {
            arrowEl.classList.remove('visible');
            return;
        }

        if (typeof oldPrice !== 'number' || currentPrice === oldPrice) return;

        const changeRatio = Math.abs((currentPrice - oldPrice) / oldPrice);
        
        if (changeRatio < 0.0001) return; 

        const uiState = getQuoteUiState(quoteId);
        
        if (uiState.trendTimer) clearTimeout(uiState.trendTimer);

        arrowEl.classList.remove('visible');
        
        void arrowEl.offsetWidth; 

        if (currentPrice > oldPrice) {
            arrowEl.innerHTML = '&#8593;&#8593;&#8593;'; 
            arrowEl.className = 'trend-arrow trend-up visible';
        } else {
            arrowEl.innerHTML = '&#8595;&#8595;&#8595;'; 
            arrowEl.className = 'trend-arrow trend-down visible';
        }

        const trendTimer = setTimeout(() => {
            arrowEl.classList.remove('visible');
        }, 30000);
        
        setQuoteUiState(quoteId, { trendTimer });
    }

    function toggleArbPanel() {
        if (!arbPathWindow) return;
        const isHidden = window.getComputedStyle(arbPathWindow).display === 'none';
        arbPathWindow.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
            bringFloatingPanelToFront(arbPathWindow);
            if (arbPanelDirty) {
                updateArbPanel({ force: true });
            }
        }
    }

    function isTypingTarget(target) {
        if (!target || typeof target.closest !== 'function') return false;
        if (target.isContentEditable) return true;
        return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
    }

    function handleGlobalShortcuts(event) {
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (isTypingTarget(event.target)) return;

        const key = (event.key || '').toLowerCase();
        if (!key) return;

        if (key === 'escape' && arbDetailState.visible) {
            event.preventDefault();
            closeArbDetailModal();
            return;
        }
        if (key === 't') {
            event.preventDefault();
            toggleArbPanel();
            return;
        }
        if (key === 's') {
            event.preventDefault();
            toggleDataTerminalPanel();
            return;
        }
        if (key === 'p') {
            event.preventDefault();
            toggleQuoteDisplayMode();
            return;
        }
        if (key === 'a') {
            event.preventDefault();
            togglePathAlertPanel();
            return;
        }
        if (key === 'l') {
            event.preventDefault();
            toggleAlertLogPanel();
            return;
        }
        if (key === 'c') {
            event.preventDefault();
            toggleRequestChannelTags();
            return;
        }
    }

    function setArbPanelMaxHeight() {
        if (!arbPathWindow) return;
        const maxHeight = Math.max(200, window.innerHeight);
        arbPathWindow.style.height = `${maxHeight}px`;
    }

    function getQuoteAlertDirection(target) {
        return getPathAlertNotificationUtils().getQuoteAlertDirection(target);
    }

    function buildQuoteAlertDisplayLabel(quote, monitorState = quoteMarketState.get(quote.id) || {}, direction = 'forward') {
        return getQuoteDisplayUtils().buildQuoteAlertDisplayLabel(quote, monitorState, direction);
    }

    function getQuoteAlertsForQuoteId(quoteId) {
        return getPathAlertUtils().getQuoteAlertsForQuoteId(pathAlertConfig, quoteId);
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

    function buildQuoteAlertMessage(alert, evaluation) {
        return getPathAlertNotificationUtils().buildQuoteAlertMessage(alert, evaluation, {
            formatNumber: formatDetailNumber
        });
    }

    function buildQuoteAlertCurrentValueText(quote, alert, evaluation) {
        if (!quote) return '';
        return getPathAlertNotificationUtils().buildQuoteAlertCurrentValueText(alert, evaluation, {
            formatNumber: formatDetailNumber
        });
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
        if (!isAudioUnlocked) {
            console.warn('[quote-alert] sound skipped: audio not unlocked');
            return;
        }
        const oneShotAudio = new Audio(pathAlertSound.currentSrc || pathAlertSound.src);
        oneShotAudio.loop = false;
        oneShotAudio.volume = pathAlertSound.volume;
        oneShotAudio.play().catch((error) => console.error('[quote-alert] sound play failed', error));
    }

    function triggerAlert(quote, alert, message, options = {}) {
        const entry = buildQuoteAlertTriggeredEntry(alert, quote, message, options);
        const mutedEntry = entry.mutedTargetCandidate
            ? getMutedPathTargetEntry(entry.mutedTargetCandidate, Date.now())
            : null;
        console.info('[quote-alert] trigger', {
            quoteId: quote.id,
            chain: entry.displayName,
            label: entry.label,
            message,
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
        sendQuoteWebhookNotification(entry.displayName, entry.label, message, entry.currentValueText, entry.actionLink);
    }

    function checkPriceForAlerts(quote) {
        if (isQuotePaused(quote)) return;

        const uiState = getQuoteUiState(quote.id);
        const quoteAlerts = getQuoteAlertsForQuoteId(quote.id);
        const itemEl = document.getElementById(`quote-item-${quote.id}`);
        const resultDiv = itemEl ? itemEl.querySelector('.quote-result') : null;
        let hasTriggeredThisTick = false;

        for (const alert of quoteAlerts) {
            const pathAlertUtils = getPathAlertUtils();
            const runtimeAlert = pathAlertUtils.buildEffectiveRuntimeAlert(alert, { forceImmediate: forceImmediateAlerts });
            const previous = pathAlertRuntimeState.get(alert.id) || null;
            const evaluation = pathAlertUtils.evaluatePathAlert(alert, { quoteStateById: quoteMarketState });
            const next = pathAlertUtils.advancePathAlertRuntime(runtimeAlert, previous, evaluation, Date.now());
            next.evaluation = evaluation;
            next.isSoundActive = false;
            pathAlertRuntimeState.set(alert.id, next);
            recordAlertDebug(
                'quote',
                alert.id,
                buildRuntimeDebugSnapshot(previous, next)
            );

            if (!next.shouldTrigger) continue;
            hasTriggeredThisTick = true;
            triggerAlert(quote, alert, buildQuoteAlertMessage(alert, evaluation), {
                currentValueText: buildQuoteAlertCurrentValueText(quote, alert, evaluation)
            });
        }

        const nextUiState = { ...uiState };
        if (hasTriggeredThisTick) {
            nextUiState.hasUnreadAlert = true;
            if (itemEl) {
                itemEl.classList.add('highlight');
                itemEl.classList.remove('highlight-past');
            }
        } else if (itemEl) {
            itemEl.classList.remove('highlight');
            if (nextUiState.hasUnreadAlert) {
                itemEl.classList.add('highlight-past');
            } else {
                itemEl.classList.remove('highlight-past');
            }
        }

        setQuoteUiState(quote.id, nextUiState);
        syncQuoteAlertDismissButton(resultDiv, nextUiState, quote.id);
        updateAlertSoundState();
    }

    function buildQuoteAlertRemotePayload(displayName, label, message, currentValueText, actionLink = null) {
        return getPathAlertNotificationUtils().buildQuoteAlertRemotePayload({
            chainName: displayName,
            label,
            currentValueText,
            message,
            actionLink
        });
    }

    async function sendQuoteWebhookNotification(displayName, label, message, currentValueText, actionLink = null) {
        if (!pathAlertConfig.settings || pathAlertConfig.settings.webhookEnabled !== true) return;
        const payload = buildQuoteAlertRemotePayload(displayName, label, message, currentValueText, actionLink);
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
            console.error('报价提醒远程推送失败:', error);
        }
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
        const monitorState = quoteMarketState.get(quote.id) || {};
        const lastResultText = getQuoteDisplayText(quote, monitorState);
        const itemEl = document.createElement('li');
        itemEl.id = `quote-item-${quote.id}`;
        itemEl.className = isQuotePaused(quote) ? 'quote-item quote-item-paused' : 'quote-item';
        const initialAmount = quote.amount || 1;
        const amountInputHTML = !isCexOrderbookChain(quote.chain) ? `<input type="number" class="amount-input" value="${initialAmount}" step="any" min="0" data-category-id="${categoryId}" data-quote-id="${quote.id}">` : '';
        const quoteTextClassName = isCexOrderbookChain(quote.chain) ? 'quote-text cex-orderbook-summary' : 'quote-text';
        const pairLabelHtml = `<span class="quote-pair-label" id="quote-pair-label-${quote.id}">${buildQuotePairLabelHtml(quote, monitorState)}</span>`;
        const requestChannelTagHtml = buildRequestChannelTagHtml(quote);
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
        const dexLinkLabel = isCrossChainQuote(quote) ? null : getDexLinkLabel(dexLinkConfig);
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
        if (isManual) {
            manualSaveBtn.classList.add('saving');
            manualSaveText.textContent = '保存中...';
            manualSaveBtn.disabled = true;
            if (saveTimeout) clearTimeout(saveTimeout);
        } else {
            manualSaveBtn.classList.add('saving');
            manualSaveText.textContent = '自动保存...';
        }

        try {
            const payload = {
                dashboard: dashboardState,
                settings: apiIntervals
            };

            await fetch(`${BACKEND_URL}/api/save-config`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload)
            });
            
            manualSaveBtn.classList.remove('saving');
            manualSaveBtn.classList.add('success');
            manualSaveText.textContent = '已保存!';
            
            setTimeout(() => {
                manualSaveBtn.classList.remove('success');
                manualSaveText.textContent = '保存配置';
                manualSaveBtn.disabled = false;
            }, 2000);

        } catch (error) { 
            console.error('配置保存失败:', error);
            manualSaveBtn.classList.remove('saving');
            manualSaveBtn.classList.add('error');
            manualSaveText.textContent = '保存失败';
            setTimeout(() => {
                manualSaveBtn.classList.remove('error');
                manualSaveText.textContent = '保存配置';
                manualSaveBtn.disabled = false;
            }, 3000);
        }
    }

    async function saveData() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => { performSave(false); }, 1500); 
    }

    async function loadPriceSnapshotConfig() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/get-price-snapshot-config`);
            if (!response.ok) throw new Error('获取价格快照配置失败');
            const data = await response.json();
            const intervalSec = Number.parseInt(data.intervalSec, 10);
            priceSnapshotConfig = {
                enabled: data.enabled === true,
                intervalSec: Number.isFinite(intervalSec) && intervalSec > 0 ? intervalSec : 10
            };
        } catch (error) {
            console.warn('加载价格快照配置失败:', error);
            priceSnapshotConfig = { enabled: false, intervalSec: 10 };
        }
    }

    async function loadArbSettings() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/get-arb-settings`);
            if (!response.ok) throw new Error('获取套利路径配置失败');
            const data = await response.json();
            const nextPriority = getArbCyclePriorityUtils().normalizeArbCycleStartPriority(data && data.cycleStartPriority);
            arbCycleStartPriority = nextPriority;
        } catch (error) {
            console.warn('加载套利路径配置失败:', error);
            arbCycleStartPriority = Array.from(DEFAULT_ARB_CYCLE_START_PRIORITY);
        }
        invalidateArbCaches();
    }

    async function loadRequestChannels() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/get-request-channels`);
            if (!response.ok) throw new Error('获取请求通道失败');
            const data = await response.json();
            requestChannelPayload = data && typeof data === 'object' ? data : { channels: [] };
        } catch (error) {
            console.warn('加载请求通道失败:', error);
            requestChannelPayload = { channels: [] };
        }
        refreshRequestChannelOptions();
        dashboardState.forEach((category) => {
            (category.quotes || []).forEach((quote) => updateRequestChannelTagForQuote(quote));
        });
    }

    function shouldShowRequestChannelForQuote(quote) {
        return getRequestChannelUtils().supportsRequestChannelForQuote(quote);
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

        if (!shouldShowRequestChannelForQuote(quote)) {
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
            quoteStateById: quoteMarketState,
            clientCapturedAt: new Date().toISOString()
        });
    }

    async function savePriceSnapshot() {
        if (!priceSnapshotConfig.enabled) return;
        const payload = buildPriceSnapshotPayload();
        if (!payload.quotes.length) return;

        try {
            await fetch(`${BACKEND_URL}/api/save-price-snapshot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.warn('保存价格快照失败:', error);
        }
    }

    function startPriceSnapshotTimer() {
        if (priceSnapshotTimer) clearInterval(priceSnapshotTimer);
        priceSnapshotTimer = null;
        if (!priceSnapshotConfig.enabled) return;
        priceSnapshotTimer = setInterval(() => {
            savePriceSnapshot();
        }, priceSnapshotConfig.intervalSec * 1000);
    }

    function normalizeTheme(theme) {
        return THEME_ORDER.includes(theme) ? theme : 'light';
    }

    function applyTheme(theme) {
        const nextTheme = normalizeTheme(theme);
        document.body.classList.remove('dark-mode', 'warm-mode');
        if (nextTheme === 'dark') document.body.classList.add('dark-mode');
        if (nextTheme === 'warm') document.body.classList.add('warm-mode');
        document.body.dataset.theme = nextTheme;
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = THEME_META[nextTheme].icon;
            themeToggleBtn.title = THEME_META[nextTheme].title;
            themeToggleBtn.setAttribute('aria-label', THEME_META[nextTheme].title);
        }
        const storage = getLocalStorageSafe();
        if (storage) {
            storage.setItem('theme', nextTheme);
        }
    }

    function getNextTheme(currentTheme) {
        const index = THEME_ORDER.indexOf(normalizeTheme(currentTheme));
        return THEME_ORDER[(index + 1) % THEME_ORDER.length];
    }

    manualSaveBtn.addEventListener('click', () => { performSave(true); });
    
    themeToggleBtn.addEventListener('click', () => {
        applyTheme(getNextTheme(document.body.dataset.theme));
    });

    addCategoryBtn.addEventListener('click', () => {
        addCategoryNameInput.value = '';
        addCategoryModal.classList.add('visible');
        addCategoryNameInput.focus();
    });

    let inputDebounceMap = new Map();
    dashboardEl.addEventListener('input', (e) => {
        if (e.target.matches('.amount-input')) {
            const input = e.target;
            const categoryId = input.dataset.categoryId;
            const quoteId = parseInt(input.dataset.quoteId);
            const category = dashboardState.find(c => c.id == categoryId);
            if (!category) return;
            const quote = category.quotes.find(q => q.id == quoteId);
            if (!quote) return;

            const newAmount = parseFloat(input.value);
            
            if (inputDebounceMap.has(quoteId)) clearTimeout(inputDebounceMap.get(quoteId));

            if (!isNaN(newAmount) && newAmount >= 0) {
                const timerId = setTimeout(() => {
                    quote.amount = newAmount;
                    renderDataTerminalPanel();
                    if (!isQuotePaused(quote)) {
                        queueQuoteRefresh(quote);
                    }
                    saveData();
                    inputDebounceMap.delete(quoteId);
                }, 600);
                inputDebounceMap.set(quoteId, timerId);
            }
        }
    });

    function showConfirmation(message, callback) {
        document.getElementById('confirm-message').textContent = message;
        onConfirmAction = callback;
        confirmModal.classList.add('visible');
    }

    function closeConfirmModal() {
        confirmModal.classList.remove('visible');
        onConfirmAction = null;
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

        quoteMarketState.delete(quoteId);
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

        if (inputDebounceMap.has(quoteId)) {
            clearTimeout(inputDebounceMap.get(quoteId));
            inputDebounceMap.delete(quoteId);
        }

        if (nextPaused) {
            const previousState = quoteMarketState.get(quoteId) || {};
            removeFromQueue(quoteId);
            abortQuoteFetch(quoteId);
            setQuoteMarketState(quoteId, buildPausedMonitorState(previousState));
            resetQuoteUiRuntimeState(quoteId);
            applyPausedQuoteUiState(quote, quoteMarketState.get(quoteId) || {});
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

        const state = quoteMarketState.get(quoteId);
        if (state) {
            const nextState = getDashboardRuntimeUtils().buildSwappedQuoteMarketState(state);

            const arrowEl = document.getElementById(`trend-arrow-${quoteId}`);
            if (arrowEl) {
                arrowEl.className = 'trend-arrow';
            }

            const quoteItemEl = document.getElementById(`quote-item-${quoteId}`);
            if (quoteItemEl) {
                quoteItemEl.classList.remove('highlight');
                quoteItemEl.classList.remove('highlight-past');
                const dismissBtn = quoteItemEl.querySelector('.dismiss-highlight-btn');
                if (dismissBtn) dismissBtn.remove();
            }
            setQuoteMarketState(quoteId, nextState);
        }
        resetQuoteUiRuntimeState(quoteId);
        updateAlertSoundState();

        const quoteTextEl = document.getElementById(`quote-text-${quoteId}`);
        const quoteTextWrapperEl = document.getElementById(`quote-text-wrapper-${quoteId}`);
        if (quoteTextEl && quoteTextWrapperEl) {
            quoteTextEl.textContent = '切换中...';
            quoteTextWrapperEl.classList.add('loading-text');
            const inverseEl = document.getElementById(`inverse-quote-${quoteId}`);
            if (inverseEl) inverseEl.textContent = '刷新中...';
        }

        saveData();
        removeFromQueue(quote.id);
        queueQuoteRefresh(quote);
        renderDataTerminalPanel();
        return true;
    }

    dashboardEl.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const categoryId = target.dataset.categoryId;
        const quoteId = parseInt(target.dataset.quoteId);
        
        if (target.matches('.dismiss-highlight-btn')) {
            const quoteIdToDismiss = parseInt(target.dataset.dismissHighlightId);
            setQuoteUiState(quoteIdToDismiss, {
                hasUnreadAlert: false
            });
            const quoteItemEl = document.getElementById(`quote-item-${quoteIdToDismiss}`);
            if(quoteItemEl) {
                quoteItemEl.classList.remove('highlight');
                quoteItemEl.classList.remove('highlight-past');
            }
            target.remove();
        } else if (target.dataset.toggleCategoryPauseId) {
            toggleCategoryPause(categoryId);
        } else if (target.dataset.togglePauseId) {
            const toggleQuoteId = parseInt(target.dataset.togglePauseId);
            toggleQuotePause(categoryId, toggleQuoteId);
        } else if (target.dataset.editAlertId) {
            const editQuoteId = parseInt(target.dataset.editAlertId);
            const category = dashboardState.find(c => c.id == categoryId);
            if (!category) return;
            const quote = category.quotes.find(q => q.id == editQuoteId);
            if (!quote) return;
            currentlyEditingQuote = { quote: quote, categoryId: categoryId };
            const monitorState = quoteMarketState.get(quote.id) || {};
            
            let pairLabel = quote.symbol;
            if(!pairLabel && monitorState.fromSymbol && monitorState.toSymbol){
                pairLabel = `${monitorState.fromSymbol}/${monitorState.toSymbol}`;
            }
            document.getElementById('modal-title').textContent = `设置 · ${getQuoteChainDisplayName(quote)}`;
            const modalSubtitleEl = document.getElementById('modal-subtitle');
            if (modalSubtitleEl) {
                modalSubtitleEl.textContent = pairLabel || '...';
            }

            const fromSymbolLabel = monitorState.fromSymbol || 'From Token';
            const toSymbolLabel = monitorState.toSymbol || 'To Token';
            if (quoteTokenAddressesEl && quoteFromTokenLineEl && quoteToTokenLineEl) {
                if (isCexOrderbookChain(quote.chain) || !quote.fromToken || !quote.toToken) {
                    quoteTokenAddressesEl.style.display = 'none';
                } else {
                    const fromChainLabel = getSingleChainDisplayName(quote.chain);
                    const toChainLabel = getSingleChainDisplayName(quote.toChain || quote.chain);
                    quoteFromTokenLineEl.textContent = `${fromSymbolLabel} (${fromChainLabel}) ${quote.fromToken}`;
                    quoteToTokenLineEl.textContent = `${toSymbolLabel} (${toChainLabel}) ${quote.toToken}`;
                    quoteTokenAddressesEl.style.display = 'block';
                }
            }
            
            const sourceGroup = document.getElementById('source-select-group');
            if (quoteSourceSelect) quoteSourceSelect.disabled = false;
            if (isCrossChainQuote(quote)) {
                if (sourceGroup) sourceGroup.style.display = 'block';
                if (quoteSourceSelect) {
                    quoteSourceSelect.value = 'LI.FI';
                    quoteSourceSelect.disabled = true;
                }
                syncKyberOnlyDirectPoolsControl(quote, '');
            } else if (isEvmChain(quote.chain)) {
                if (quote.chain.toLowerCase() === 'plasma') {
                    if (sourceGroup) sourceGroup.style.display = 'none';
                    syncKyberOnlyDirectPoolsControl(quote, '');
                } else {
                    if (sourceGroup) sourceGroup.style.display = 'block';
                    const pref = quote.preferredSource || 'Kyber';
                    if (quoteSourceSelect) quoteSourceSelect.value = pref;
                    syncKyberOnlyDirectPoolsControl(quote, pref);
                }
            } else {
                if (sourceGroup) sourceGroup.style.display = 'none';
                syncKyberOnlyDirectPoolsControl(quote, '');
            }

            if (kyberOnlyDirectPoolsInput) {
                kyberOnlyDirectPoolsInput.checked = quote.kyberOnlyDirectPools === true;
            }

            renderQuoteRequestChannelOptions(quote);

            const inverseCheckbox = document.getElementById('show-inverse-quote');
            if (isCexOrderbookChain(quote.chain) || isCrossChainQuote(quote)) {
                 document.getElementById('inverse-toggle-group').style.display = 'none';
            } else {
                 document.getElementById('inverse-toggle-group').style.display = 'flex';
                 inverseCheckbox.checked = !!quote.showInverse;
            }

            if (modalSwapQuoteBtn) {
                modalSwapQuoteBtn.style.display = (isCexOrderbookChain(quote.chain) || isCrossChainQuote(quote)) ? 'none' : 'block';
            }
            if (modalDeleteQuoteBtn) {
                modalDeleteQuoteBtn.style.display = 'block';
            }

            alertModal.classList.add('visible');

        } else if (target.matches('.delete-btn')) {
             if (quoteId && categoryId) {
                showConfirmation('确定删除此报价吗？', () => {
                    deleteQuoteFromCategory(categoryId, quoteId);
                });
            } else if (categoryId) {
                const categoryIndex = dashboardState.findIndex(c => c.id == categoryId);
                if (categoryIndex !== -1) {
                     showConfirmation(`确定删除分区 "${dashboardState[categoryIndex].name}" 吗？`, () => {
                        (dashboardState[categoryIndex].quotes || []).forEach(q => {
                           removeFromQueue(q.id);
                           quoteMarketState.delete(q.id);
                           deleteQuoteUiRuntimeState(q.id);
                        });
                        updateAlertSoundState();
                        dashboardState.splice(categoryIndex, 1);
                        document.getElementById(`module-${categoryId}`).remove();
                        renderDataTerminalPanel();
                        saveData();
                    });
                }
            }
        } else if (target.matches('.add-quote-btn')) {
            currentCategoryIdToAdd = categoryId;
            addQuoteModal.classList.add('visible');
        } else if (target.matches('.swap-btn')) {
            swapQuoteTokens(categoryId, quoteId);
        }
    });

    alertModal.addEventListener('click', (e) => {
        if (e.target.id === 'modal-cancel' || (e.target === alertModal && !e.target.closest('.modal-box'))) {
            alertModal.classList.remove('visible');
            currentlyEditingQuote = null;
        } else if (e.target.id === 'modal-swap-quote') {
            if (currentlyEditingQuote && currentlyEditingQuote.quote) {
                swapQuoteTokens(currentlyEditingQuote.categoryId, currentlyEditingQuote.quote.id);
            }
        } else if (e.target.id === 'modal-delete-quote') {
            if (currentlyEditingQuote && currentlyEditingQuote.quote) {
                const { categoryId, quote } = currentlyEditingQuote;
                alertModal.classList.remove('visible');
                currentlyEditingQuote = null;
                showConfirmation('确定删除此报价吗？', () => {
                    deleteQuoteFromCategory(categoryId, quote.id);
                });
            }
        } else if (e.target.id === 'open-quote-alerts-manage') {
            if (currentlyEditingQuote && currentlyEditingQuote.quote) {
                openPathAlertsManagementPage({
                    filterQuoteId: currentlyEditingQuote.quote.id
                });
            }
        } else if (e.target.id === 'modal-save') {
            if (currentlyEditingQuote && currentlyEditingQuote.quote) {
                const { quote } = currentlyEditingQuote;
                let shouldQueueRefreshQuote = false;
                
                if (isCrossChainQuote(quote)) {
                    if (quote.preferredSource !== 'LI.FI') {
                        quote.preferredSource = 'LI.FI';
                        shouldQueueRefreshQuote = true;
                    }
                } else if (isEvmChain(quote.chain)) {
                    if (quote.chain.toLowerCase() !== 'plasma') {
                        const newSource = quoteSourceSelect.value;
                        if (quote.preferredSource !== newSource) {
                            quote.preferredSource = newSource;
                            shouldQueueRefreshQuote = true;
                        }
                    }
                }

                const kyberOnlyDirectPools = !isCrossChainQuote(quote) && kyberOnlyDirectPoolsInput && kyberOnlyDirectPoolsInput.checked === true;
                if (quote.kyberOnlyDirectPools !== kyberOnlyDirectPools) {
                    if (kyberOnlyDirectPools) {
                        quote.kyberOnlyDirectPools = true;
                    } else {
                        delete quote.kyberOnlyDirectPools;
                    }
                    shouldQueueRefreshQuote = true;
                }

                const showInverse = isCrossChainQuote(quote) ? false : document.getElementById('show-inverse-quote').checked;
                if (quote.showInverse !== showInverse) {
                    quote.showInverse = showInverse;
                    shouldQueueRefreshQuote = true;
                }

                if (shouldShowRequestChannelForQuote(quote) && quoteRequestChannelSelect) {
                    const nextChannelId = quoteRequestChannelSelect.value || 'default';
                    const previousChannelId = quote.requestChannelId || 'default';
                    if (previousChannelId !== nextChannelId) {
                        if (nextChannelId === 'default') {
                            delete quote.requestChannelId;
                        } else {
                            quote.requestChannelId = nextChannelId;
                        }
                        updateRequestChannelTagForQuote(quote);
                        shouldQueueRefreshQuote = true;
                    }
                } else if (quote.requestChannelId) {
                    delete quote.requestChannelId;
                    updateRequestChannelTagForQuote(quote);
                    shouldQueueRefreshQuote = true;
                }

                if (shouldQueueRefreshQuote) {
                    removeFromQueue(quote.id);
                    queueQuoteRefresh(quote);
                }

                saveData();
                alertModal.classList.remove('visible');
                currentlyEditingQuote = null;
            }
        }
    });

    document.getElementById('confirm-ok').addEventListener('click', () => { if (typeof onConfirmAction === 'function') { onConfirmAction(); } closeConfirmModal(); });
    document.getElementById('confirm-cancel').addEventListener('click', closeConfirmModal);
    confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) closeConfirmModal(); });

    if (quoteSourceSelect) {
        quoteSourceSelect.addEventListener('change', () => {
            const currentQuote = currentlyEditingQuote && currentlyEditingQuote.quote ? currentlyEditingQuote.quote : null;
            syncKyberOnlyDirectPoolsControl(currentQuote, quoteSourceSelect.value);
        });
    }
    
    addCategoryModal.addEventListener('click', (e) => {
         if (e.target.id === 'add-category-cancel' || (e.target === addCategoryModal && !e.target.closest('.modal-box'))) {
            addCategoryModal.classList.remove('visible');
        } else if (e.target.id === 'add-category-save') {
            const categoryName = addCategoryNameInput.value.trim();
            if (categoryName) {
                const newCategory = { name: categoryName, id: Date.now(), quotes: [] };
                dashboardState.push(newCategory);
                dashboardEl.appendChild(createCategoryModule(newCategory));
                saveData();
                addCategoryModal.classList.remove('visible');
            }
        }
    });

    function resetAndCloseAddQuoteModal() {
        addQuoteChainSelect.value = '';
        if (addQuoteToChainSelect) addQuoteToChainSelect.value = '';
        addQuoteFromInput.value = '';
        addQuoteToInput.value = '';
        addQuoteSymbolInput.value = '';
        if (addQuoteToChainGroup) addQuoteToChainGroup.style.display = 'none';
        addQuotePairFields.style.display = 'none';
        addQuoteSymbolField.style.display = 'none';
        addQuoteSaveBtn.disabled = true;
        addQuoteModal.classList.remove('visible');
        currentCategoryIdToAdd = null;
    }

    function updateAddQuoteTokenPlaceholders() {
        const chain = normalizeChainKey(addQuoteChainSelect.value);
        const toChain = normalizeChainKey(addQuoteToChainSelect && addQuoteToChainSelect.value);
        addQuoteFromInput.placeholder = CHAIN_ADDRESS_PLACEHOLDERS[chain] || 'Enter token address';
        addQuoteToInput.placeholder = CHAIN_ADDRESS_PLACEHOLDERS[toChain || chain] || 'Enter token address';
    }

    function syncAddQuoteCrossChainControls() {
        const chain = addQuoteChainSelect.value;
        const showTarget = chain && !isCexOrderbookChain(chain) && isEvmChain(chain);
        if (addQuoteToChainGroup) addQuoteToChainGroup.style.display = showTarget ? 'block' : 'none';
        if (!showTarget && addQuoteToChainSelect) addQuoteToChainSelect.value = '';
        updateAddQuoteTokenPlaceholders();
    }

    function validateAddQuoteForm() {
        const chain = addQuoteChainSelect.value;
        if (!chain) { addQuoteSaveBtn.disabled = true; return; }
        if (isCexOrderbookChain(chain)) { addQuoteSaveBtn.disabled = !addQuoteSymbolInput.value.trim(); } 
        else { addQuoteSaveBtn.disabled = !addQuoteFromInput.value.trim() || !addQuoteToInput.value.trim(); }
    }

    addQuoteChainSelect.addEventListener('change', () => {
        const chain = addQuoteChainSelect.value;
        addQuotePairFields.style.display = (chain && !isCexOrderbookChain(chain)) ? 'block' : 'none';
        addQuoteSymbolField.style.display = isCexOrderbookChain(chain) ? 'block' : 'none';
        syncAddQuoteCrossChainControls();
        validateAddQuoteForm();
    });
    if (addQuoteToChainSelect) {
        addQuoteToChainSelect.addEventListener('change', () => {
            updateAddQuoteTokenPlaceholders();
            validateAddQuoteForm();
        });
    }
    [addQuoteFromInput, addQuoteToInput, addQuoteSymbolInput].forEach(input => {
        input.addEventListener('input', validateAddQuoteForm);
    });

    addQuoteModal.addEventListener('click', (e) => {
         if (e.target.id === 'add-quote-cancel' || (e.target === addQuoteModal && !e.target.closest('.modal-box'))) {
            resetAndCloseAddQuoteModal();
        } else if (e.target.id === 'add-quote-save') {
            if (currentCategoryIdToAdd === null) return;
            const chain = addQuoteChainSelect.value;
            const normalizedChain = normalizeChainKey(chain);
            const normalizedToChain = addQuoteToChainSelect && addQuoteToChainSelect.value
                ? normalizeChainKey(addQuoteToChainSelect.value)
                : '';
            const defaultSource = defaultSourceResolver(chain);
            const newQuote = { id: Date.now(), chain: normalizedChain, amount: 1, preferredSource: defaultSource };
            if (isCexOrderbookChain(chain)) {
                newQuote.chain = chain;
                newQuote.symbol = addQuoteSymbolInput.value.trim().toUpperCase();
            } else {
                newQuote.fromToken = addQuoteFromInput.value.trim();
                newQuote.toToken = addQuoteToInput.value.trim();
                if (normalizedToChain && normalizedToChain !== normalizedChain) {
                    newQuote.toChain = normalizedToChain;
                    newQuote.preferredSource = 'LI.FI';
                    newQuote.showInverse = false;
                }
            }
            const category = dashboardState.find(c => c.id == currentCategoryIdToAdd);
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

    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;
        function dragMouseDown(e) { e.preventDefault(); bringFloatingPanelToFront(element); pos3 = e.clientX; pos4 = e.clientY; document.onmouseup = closeDragElement; document.onmousemove = elementDrag; }
        function elementDrag(e) { e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; element.style.top = (element.offsetTop - pos2) + "px"; element.style.left = (element.offsetLeft - pos1) + "px"; }
        function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
    }
    
    async function requestBackendConfigRefresh() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/request-update-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}'
            });
            if (!response.ok) {
                throw new Error('刷新后端配置失败');
            }
        } catch (error) {
            console.warn('刷新后端配置失败:', error);
        }
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
        mutedPathTargets = loadMutedPathTargetsFromStorage();
        mutedPathLegs = loadMutedPathLegsFromStorage();
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/get-config`);
            if(!response.ok) {
                console.warn("Server returned error, initializing empty dashboard");
                dashboardState = [];
            } else {
                const rawData = await response.json();
                
                if (Array.isArray(rawData)) {
                    dashboardState = rawData;
                    apiIntervals = { ...DEFAULT_INTERVALS };
                } else if (typeof rawData === 'object' && rawData !== null) {
                    dashboardState = Array.isArray(rawData.dashboard) ? rawData.dashboard : [];
                    if (rawData.settings) {
                        apiIntervals = { ...DEFAULT_INTERVALS, ...rawData.settings };
                        if (apiIntervals.solana === 1200) {
                            apiIntervals.solana = 3500;
                            saveData(); 
                        }
                    }
                } else {
                    dashboardState = [];
                }
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

            // 启动 burst 会与 scheduler 并行，容易放大瞬时请求量（尤其是 Kyber）。
            // allQuotes.forEach((quote, i) => {
            //     setTimeout(() => fetchSingleQuote(quote), i * 100);
            // });

            updateQuoteRunStateTag();
            updateSchedulers();
            startPriceSnapshotTimer();
            window.addEventListener('storage', handlePathAlertConfigSyncStorage);
            restartPathAlertScheduler();
            
            if (alertLogWindow && alertLogHeader) {
                makeDraggable(alertLogWindow, alertLogHeader);
                bindFloatingPanelFocus(alertLogWindow, alertLogHeader);
            }
            if (pathAlertWindow && pathAlertHeader) {
                makeDraggable(pathAlertWindow, pathAlertHeader);
                bindFloatingPanelFocus(pathAlertWindow, pathAlertHeader);
            }
            if (arbPathWindow && arbPathHeader) {
                bindFloatingPanelFocus(arbPathWindow, arbPathHeader);
            }
            [alertLogWindow, pathAlertWindow, arbPathWindow].forEach((panel) => {
                if (panel) {
                    panel.style.zIndex = String(FLOATING_PANEL_BASE_Z_INDEX);
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
                    const eventTarget = resolveEventTargetElement(event);
                    if (!eventTarget) return;
                    const stepBtn = eventTarget.closest('[data-arb-detail-step-index]');
                    if (stepBtn) {
                        event.preventDefault();
                    }
                });
                arbDetailGrid.addEventListener('click', (event) => {
                    const eventTarget = resolveEventTargetElement(event);
                    if (!eventTarget) return;
                    const tokenEl = eventTarget.closest('[data-arb-detail-token-address]');
                    if (tokenEl) {
                        const tokenAddress = tokenEl.dataset.arbDetailTokenAddress;
                        const tokenSymbol = tokenEl.dataset.arbDetailTokenSymbol || 'Token';
                        if (!tokenAddress) return;
                        copyTextToClipboard(tokenAddress)
                            .then(() => showCopyToast(`已复制 ${tokenSymbol} 地址`))
                            .catch(() => showCopyToast('复制失败'));
                        return;
                    }

                    const dexLinkEl = eventTarget.closest('[data-dex-link-copy]');
                    if (dexLinkEl) {
                        void copyDexLinkFromElement(dexLinkEl);
                        return;
                    }

                    const muteLegBtn = eventTarget.closest('[data-arb-detail-leg-mute]');
                    if (muteLegBtn) {
                        const cardIndex = Number(muteLegBtn.dataset.arbDetailCardIndex);
                        const rowIndex = Number(muteLegBtn.dataset.arbDetailRowIndex);
                        if (!Number.isFinite(cardIndex) || !Number.isFinite(rowIndex)) return;
                        const row = arbDetailState.cards[cardIndex] && Array.isArray(arbDetailState.cards[cardIndex].rows)
                            ? arbDetailState.cards[cardIndex].rows[rowIndex]
                            : null;
                        if (!row) return;
                        const durationHours = promptMutedPathLegDurationHours();
                        if (!durationHours) return;
                        muteArbDetailLeg(row, durationHours, Date.now());
                        return;
                    }

                    const stepBtn = eventTarget.closest('[data-arb-detail-step-index]');
                    if (!stepBtn) return;
                    const index = Number(stepBtn.dataset.arbDetailStepIndex);
                    const step = Number(stepBtn.dataset.arbDetailStep);
                    if (!Number.isFinite(index) || !Number.isFinite(step)) return;
                    nudgeArbDetailInput(index, step);
                });
                arbDetailGrid.addEventListener('focusin', (event) => {
                    const eventTarget = resolveEventTargetElement(event);
                    if (!eventTarget) return;
                    const input = eventTarget.closest('[data-arb-detail-input-index]');
                    if (!input) return;
                    arbDetailState.editingInputIndex = Number(input.dataset.arbDetailInputIndex);
                });
                arbDetailGrid.addEventListener('focusout', (event) => {
                    const eventTarget = resolveEventTargetElement(event);
                    if (!eventTarget) return;
                    const input = eventTarget.closest('[data-arb-detail-input-index]');
                    if (!input) return;
                    arbDetailState.editingInputIndex = null;
                    commitArbDetailInput(Number(input.dataset.arbDetailInputIndex), input.value);
                });
                arbDetailGrid.addEventListener('keydown', (event) => {
                    const eventTarget = resolveEventTargetElement(event);
                    if (!eventTarget) return;
                    const input = eventTarget.closest('[data-arb-detail-input-index]');
                    if (!input) return;
                    if (!getArbDetailUtils().shouldCommitArbDetailInputOnKey(event.key)) return;
                    event.preventDefault();
                    input.blur();
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
