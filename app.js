    const BACKEND_URL = `${location.protocol}//${location.hostname}:3000`;
    let dashboardState = [];
    let quoteMarketState = new Map();
    let quoteUiState = new Map();
    let globalSymbolCache = new Map(); 
    
    let isAudioUnlocked = false; 
    let onConfirmAction = null;
    const PATH_ALERT_CONFIG_SYNC_KEY = 'path-alert-config-sync';
    const PATH_ALERT_CONFIG_SYNC_SOURCE_MAIN = 'main-dashboard';
    const MULTI_CHANNEL_ENABLED_STORAGE_KEY = 'dashboard-multi-channel-enabled';

    let queues = {};
    let indices = {};
    let timers = {};

    const DEFAULT_INTERVALS = window.QueueStatsUtils
        ? { ...window.QueueStatsUtils.DEFAULT_INTERVALS }
        : {
            kyber: 170,
            zerox: 110,
            velora: 700,
            lifi: 170,
            bybit: 1000,
            binance: 1000,
            solana: 3500,
            sui: 500,
            starknet: 1000
        };
    const DEFAULT_ARB_CYCLE_START_PRIORITY = window.ArbCyclePriorityUtils
        ? window.ArbCyclePriorityUtils.DEFAULT_ARB_CYCLE_START_PRIORITY
        : ['cbBTC', 'WBTC', 'ETH'];

    let apiIntervals = { ...DEFAULT_INTERVALS };
    let arbCycleStartPriority = Array.from(DEFAULT_ARB_CYCLE_START_PRIORITY);
    let requestChannelPayload = { channels: [] };
    let multiChannelEnabled = true;
    let showRequestChannelTags = true;
    let requestChannelOptions = window.RequestChannelUtils && typeof window.RequestChannelUtils.getRequestChannelOptions === 'function'
        ? window.RequestChannelUtils.getRequestChannelOptions(requestChannelPayload, apiIntervals)
        : {
            channels: [{ id: 'default', name: '默认通道', isDefault: true, httpProxy: '', intervals: { ...apiIntervals } }],
            byId: new Map([['default', { id: 'default', name: '默认通道', isDefault: true, httpProxy: '', intervals: { ...apiIntervals } }]]),
            defaultChannelId: 'default'
        };

    let activeFetchControllers = new Map(); 
    let saveTimeout = null;
    let priceSnapshotTimer = null;
    let priceSnapshotConfig = { enabled: false, intervalSec: 10 };
    const CHART_AUTO_REFRESH_INTERVAL_MS = 5000;
    let arbUpdateTimer = null;
    let pathAlertConfig = window.PathAlertUtils
        ? window.PathAlertUtils.normalizeAlertConfig()
        : {
            version: 1,
            settings: {
                pathAlertEvalIntervalMs: 1000,
                defaultCooldownSec: 180,
                changedLegMinBp: 0.1,
                localSoundEnabled: true,
                webhookEnabled: false,
                dayAppEnabled: false,
                telegramEnabled: true,
                webhookUrl: 'https://api.day.app/45xWAiD79Rn8DPXw6Beudh/[title]/[body]?sound=ladder',
                webhookSecret: ''
            },
            alerts: [],
            dismissedTargets: []
        };
    let pathAlertSaveTimer = null;
    let pathAlertEvalTimer = null;
    let pathAlertPanelHidden = true;
    const pathAlertPanelHtmlRenderer = window.DomRenderUtils.createStableHtmlRenderer();
    let pathAlertRuntimeState = new Map();
    let mutedPathTargets = [];
    let mutedPathLegs = [];
    const mutedAlertStateHtmlRenderer = window.DomRenderUtils.createStableHtmlRenderer();
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
    const arbPanelHtmlRenderer = window.DomRenderUtils.createStableHtmlRenderer();
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
        htmlRenderer: window.DomRenderUtils.createStableHtmlRenderer()
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
    const arbDetailRefreshScheduler = window.ArbDetailRefreshUtils.createArbDetailRefreshScheduler({
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
    const PATH_ALERT_MUTE_EXTEND_DURATION_MS = window.PathAlertUtils
        ? window.PathAlertUtils.PATH_ALERT_MUTE_EXTEND_DURATION_MS || (2 * 60 * 60 * 1000)
        : (2 * 60 * 60 * 1000);
    const PATH_ALERT_MUTE_DURATION_MS = Number(window.PathAlertUtils && window.PathAlertUtils.PATH_ALERT_MUTE_DURATION_MS) || (60 * 60 * 1000);
    const MUTED_PATH_LEG_EXTEND_DURATION_MS = 2 * 60 * 60 * 1000;
    const alertDebugController = window.AlertDebugUtils
        && typeof window.AlertDebugUtils.createAlertDebugController === 'function'
        ? window.AlertDebugUtils.createAlertDebugController({
            logger(message) {
                console.info(message);
            }
        })
        : null;
    window.enableAlertDebug = function (enabled) {
        if (!alertDebugController || typeof alertDebugController.enable !== 'function') {
            return false;
        }
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
    
    const CHAIN_DISPLAY_NAMES = {
        ethereum: 'ETH', solana: 'SOL', sui: 'SUI', polygon: 'Polygon',
        arbitrum: 'Arbitrum', optimism: 'Optimism', bsc: 'BSC',
        avalanche: 'Avalanche', base: 'Base', Bybit: 'Bybit', bybit: 'Bybit', Binance: 'Binance', binance: 'Binance',
        linea: 'Linea', mantle: 'Mantle', sonic: 'Sonic', berachain: 'Berachain',
        ronin: 'Ronin', unichain: 'Unichain', hyperevm: 'HyperEVM', plasma: 'Plasma',
        scroll: 'Scroll', blast: 'Blast', mode: 'Mode', monad: 'Monad', etherlink: 'Etherlink',
        fantom: 'Fantom', cronos: 'Cronos', moonbeam: 'Moonbeam', boba: 'Boba', gnosis: 'Gnosis', celo: 'Celo',
        megaeth: 'MegaETH',
        hemi: 'Hemi',
        katana: 'Katana',
        starknet: 'Starknet'
    };

    const CHAIN_FILTER_ALIASES = {
        ETH: 'ethereum',
        SOL: 'solana',
        SUI: 'sui',
        POLY: 'polygon',
        MATIC: 'polygon',
        ARB: 'arbitrum',
        OP: 'optimism',
        BSC: 'bsc',
        BNB: 'bsc',
        AVAX: 'avalanche',
        BASE: 'base',
        LINEA: 'linea',
        MNT: 'mantle',
        MANTLE: 'mantle',
        SONIC: 'sonic',
        BERA: 'berachain',
        RON: 'ronin',
        UNI: 'unichain',
        HYPE: 'hyperevm',
        SCROLL: 'scroll',
        BLAST: 'blast',
        MODE: 'mode',
        MONAD: 'monad',
        FTM: 'fantom',
        CRO: 'cronos',
        GLMR: 'moonbeam',
        BOBA: 'boba',
        GNO: 'gnosis',
        CELO: 'celo',
        MEGA: 'megaeth',
        MEGAETH: 'megaeth'
    };

    const CHAIN_ADDRESS_PLACEHOLDERS = {
        ethereum: '0x...', solana: 'Enter mint address...', sui: '0x...::module::TYPE',
        polygon: '0x...', arbitrum: '0x...', optimism: '0x...',
        bsc: '0x...', avalanche: '0x...', base: '0x...', megaeth: '0x...', hemi: '0x...', katana: '0x...', starknet: '0x...', Bybit: 'N/A', bybit: 'N/A', Binance: 'N/A', binance: 'N/A'
    };

    function normalizeChainKey(chain) {
        return String(chain || '').trim().toLowerCase();
    }

    function isCrossChainQuote(quote) {
        const fromChain = normalizeChainKey(quote && quote.chain);
        const toChain = normalizeChainKey(quote && quote.toChain);
        return Boolean(fromChain && toChain && fromChain !== toChain);
    }

    function getSingleChainDisplayName(chain) {
        const normalized = normalizeChainKey(chain);
        return CHAIN_DISPLAY_NAMES[normalized] || chain || '';
    }

    function getQuoteChainDisplayName(quote) {
        if (!quote) return '';
        const fromChain = normalizeChainKey(quote.chain);
        const toChain = normalizeChainKey(quote.toChain);
        const fromLabel = getSingleChainDisplayName(quote.chain);
        if (!fromChain || !toChain || fromChain === toChain) return fromLabel;
        return `${fromLabel} -> ${getSingleChainDisplayName(quote.toChain)}`;
    }

    function isCexOrderbookChain(chain) {
        const normalized = normalizeChainKey(chain);
        return normalized === 'bybit' || normalized === 'binance';
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
    const defaultSourceResolver = (window.ChainDefaults && typeof window.ChainDefaults.getDefaultSourceForChain === 'function')
        ? window.ChainDefaults.getDefaultSourceForChain
        : () => 'Kyber';

    function isEvmChain(chain) {
        const nonEvm = ['solana', 'sui', 'starknet', 'bybit', 'binance'];
        return !!chain && !nonEvm.includes(normalizeChainKey(chain));
    }

    function is0xSupported(chain) {
        return ZEROX_SUPPORTED_CHAINS.includes(normalizeChainKey(chain));
    }

    function isKyberSupported(chain) {
        return KYBER_SUPPORTED_CHAINS.includes(normalizeChainKey(chain));
    }

    function shouldQueueInverseFetch(quote) {
        if (isCrossChainQuote(quote)) return false;
        if (window.QueueStatsUtils && typeof window.QueueStatsUtils.shouldQueueInverseFetch === 'function') {
            return window.QueueStatsUtils.shouldQueueInverseFetch(quote);
        }
        return !!quote && !!quote.showInverse && !isCexOrderbookChain(quote.chain);
    }

    function isQuotePaused(quote) {
        if (window.QuotePauseUtils && typeof window.QuotePauseUtils.isQuotePaused === 'function') {
            return window.QuotePauseUtils.isQuotePaused(quote);
        }
        return !!quote && quote.paused === true;
    }

    function getActiveQuotes(quotes) {
        if (window.QuotePauseUtils && typeof window.QuotePauseUtils.getActiveQuotes === 'function') {
            return window.QuotePauseUtils.getActiveQuotes(quotes);
        }
        return Array.isArray(quotes) ? quotes.filter((quote) => !isQuotePaused(quote)) : [];
    }

    function getCategoryPauseAction(quotes) {
        if (window.QuotePauseUtils && typeof window.QuotePauseUtils.getCategoryPauseAction === 'function') {
            return window.QuotePauseUtils.getCategoryPauseAction(quotes);
        }
        const items = Array.isArray(quotes) ? quotes : [];
        if (items.length > 0 && getActiveQuotes(items).length === 0) {
            return 'resume';
        }
        return 'pause';
    }

    function buildPausedMonitorState(previousState) {
        if (window.QuotePauseUtils && typeof window.QuotePauseUtils.buildPausedQuoteState === 'function') {
            return window.QuotePauseUtils.buildPausedQuoteState(previousState);
        }
        const state = previousState && typeof previousState === 'object' ? previousState : {};
        return {
            fromSymbol: state.fromSymbol || '',
            toSymbol: state.toSymbol || '',
            lastRawPrice: null,
            lastTotalAmountOut: null,
            lastResultText: '',
            inverseRawPrice: null,
            inverseTotalAmountOut: null,
            inverseFromSymbol: '',
            inverseToSymbol: '',
            usedSource: '',
            usedSourceReal: '',
            cexOrderbook: null
        };
    }

    function refreshRequestChannelOptions() {
        if (window.RequestChannelUtils && typeof window.RequestChannelUtils.getRequestChannelOptions === 'function') {
            requestChannelOptions = window.RequestChannelUtils.getRequestChannelOptions(requestChannelPayload, apiIntervals);
            return;
        }
        requestChannelOptions = {
            channels: [{ id: 'default', name: '默认通道', isDefault: true, httpProxy: '', intervals: { ...apiIntervals } }],
            byId: new Map([['default', { id: 'default', name: '默认通道', isDefault: true, httpProxy: '', intervals: { ...apiIntervals } }]]),
            defaultChannelId: 'default'
        };
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

        if (window.RequestChannelUtils && typeof window.RequestChannelUtils.getEffectiveRequestChannelIdForQuote === 'function') {
            return window.RequestChannelUtils.getEffectiveRequestChannelIdForQuote(quote, requestChannelOptions, {
                multiChannelEnabled: nextMultiChannelEnabled
            });
        }

        const channelId = window.RequestChannelUtils && typeof window.RequestChannelUtils.resolveRequestChannelIdForQuote === 'function'
            ? window.RequestChannelUtils.resolveRequestChannelIdForQuote(quote, requestChannelOptions)
            : (quote && quote.requestChannelId) || 'default';

        if (nextMultiChannelEnabled === false && shouldShowRequestChannelForQuote(quote)) {
            return 'default';
        }
        return channelId || 'default';
    }

    function getRequestChannelDisplayForQuote(quote) {
        return window.RequestChannelUtils && typeof window.RequestChannelUtils.getRequestChannelDisplayForQuote === 'function'
            ? window.RequestChannelUtils.getRequestChannelDisplayForQuote(quote, requestChannelOptions)
            : null;
    }

    function buildRequestChannelTagHtml(quote) {
        const channel = getRequestChannelDisplayForQuote(quote);
        const utils = getQuoteDisplayUtils();
        if (!utils || typeof utils.buildQuoteRequestChannelTagHtml !== 'function') return '';
        return utils.buildQuoteRequestChannelTagHtml(quote, channel);
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
        if (window.QueueStatsUtils && typeof window.QueueStatsUtils.getQueueTypeForQuote === 'function') {
            const queueType = window.QueueStatsUtils.getQueueTypeForQuote(quote, requestChannelOptions);
            if (multiChannelEnabled === false) {
                return window.QueueStatsUtils.getQueueTypeForQuote(quote, requestChannelOptions, { multiChannelEnabled });
            }
            return queueType;
        }
        let type = 'kyber';
        if (isCrossChainQuote(quote)) return 'lifi';
        if (isCexOrderbookChain(quote.chain)) {
            type = String(quote.chain).trim().toLowerCase() === 'binance' ? 'binance' : 'bybit';
        }
        else if (quote.chain === 'solana') type = 'solana';
        else if (quote.chain === 'sui') type = 'sui';
        else if (quote.chain === 'starknet') type = 'starknet';
        else if (isEvmChain(quote.chain)) {
            if (quote.preferredSource === 'Velora') {
                type = 'velora';
            } else if (quote.preferredSource === '0x') {
                type = 'zerox';
            } else if (quote.preferredSource === 'LI.FI') {
                type = 'lifi';
            }
        }
        if (window.RequestChannelUtils && typeof window.RequestChannelUtils.buildQueueKey === 'function') {
            return window.RequestChannelUtils.buildQueueKey(type, getEffectiveRequestChannelIdForQuote(quote));
        }
        return type;
    }

    function getQueueIntervalMs(type) {
        if (window.RequestChannelUtils && typeof window.RequestChannelUtils.getEffectiveIntervalForQueue === 'function') {
            return window.RequestChannelUtils.getEffectiveIntervalForQueue(type, apiIntervals, requestChannelOptions);
        }
        const configured = Number(apiIntervals[type]);
        return Number.isFinite(configured) && configured >= 0 ? configured : 0;
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
        const keys = new Set();
        const defaultChannelId = requestChannelOptions && requestChannelOptions.defaultChannelId
            ? requestChannelOptions.defaultChannelId
            : 'default';

        Object.keys(DEFAULT_INTERVALS).forEach((sourceKey) => {
            if (window.RequestChannelUtils && typeof window.RequestChannelUtils.buildQueueKey === 'function') {
                keys.add(window.RequestChannelUtils.buildQueueKey(sourceKey, defaultChannelId));
                return;
            }
            keys.add(sourceKey);
        });

        dashboardState.forEach((category) => {
            (category.quotes || []).forEach((quote) => {
                if (isQuotePaused(quote)) return;
                keys.add(getQueueTypeForQuote(quote));
            });
        });

        return keys;
    }

    function buildQueueTasksForQuote(quote) {
        const tasks = [{ quoteId: quote.id, mode: 'main' }];
        if (shouldQueueInverseFetch(quote)) {
            tasks.push({ quoteId: quote.id, mode: 'inverse' });
        }
        return tasks;
    }

    function getQueueTaskKey(task) {
        return `${task.quoteId}:${task.mode}`;
    }

    function addToQueue(quote) {
        if (!quote || isQuotePaused(quote)) return;
        const type = getQueueTypeForQuote(quote);
        const queue = ensureQueueState(type);
        const taskKeys = new Set(queue.map(getQueueTaskKey));
        const tasks = buildQueueTasksForQuote(quote);

        for (const task of tasks) {
            const key = getQueueTaskKey(task);
            if (!taskKeys.has(key)) {
                queue.push(task);
                taskKeys.add(key);
            }
        }
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
        Object.keys(queues).forEach(type => {
            queues[type] = queues[type].filter(task => task.quoteId !== quoteId);
        });
    }

    function deferCurrentQueueTask(type) {
        const queue = ensureQueueState(type);
        if (!queue || queue.length <= 1) return;

        const currentIndex = indices[type];
        if (currentIndex < 0 || currentIndex >= queue.length) return;

        const [task] = queue.splice(currentIndex, 1);
        queue.push(task);

        // 回退一格，确保下一个 tick 轮到“当前任务后面的任务”，而不是刚被挪到队尾的同一任务。
        indices[type] = (currentIndex - 1 + queue.length) % queue.length;
    }

    function processQueue(type) {
        const queue = ensureQueueState(type);
        if (queue.length === 0) return;

        indices[type] = (indices[type] + 1) % queue.length;
        const taskFromQueue = queue[indices[type]];
        
        const category = dashboardState.find(c => c.quotes && c.quotes.some(q => q.id === taskFromQueue.quoteId));
        const quoteToFetch = category ? category.quotes.find(q => q.id === taskFromQueue.quoteId) : null;

        if (quoteToFetch) {
            if (isQuotePaused(quoteToFetch)) {
                removeFromQueue(quoteToFetch.id);
                return;
            }
            const currentType = getQueueTypeForQuote(quoteToFetch);
            const inverseTaskInvalid = taskFromQueue.mode === 'inverse' && !shouldQueueInverseFetch(quoteToFetch);

            if (currentType !== type || inverseTaskInvalid) {
                removeFromQueue(quoteToFetch.id);
                addToQueue(quoteToFetch);
                return;
            }

            if (!activeFetchControllers.has(quoteToFetch.id)) {
                fetchSingleQuote(quoteToFetch, taskFromQueue.mode);
            } else {
                deferCurrentQueueTask(type);
            }
        } else {
            removeFromQueue(taskFromQueue.quoteId);
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

    function appendAlertLogEntry(title, message, subtitle = '') {
        if (!alertLogWindow || !alertLogContent) return;
        alertLogWindow.style.display = 'flex';
        bringFloatingPanelToFront(alertLogWindow);
        const now = new Date();
        const logEntry = window.DomRenderUtils.createElementFromHtml(
            window.AlertLogUiUtils.buildGenericAlertLogEntryHtml({
                title,
                subtitle,
                message,
                timeText: now.toLocaleTimeString()
            })
        );
        if (!logEntry) return;
        alertLogContent.prepend(logEntry);
        if (window.ArbRuntimeMemoryUtils && typeof window.ArbRuntimeMemoryUtils.trimContainerChildren === 'function') {
            window.ArbRuntimeMemoryUtils.trimContainerChildren(alertLogContent, MAX_ALERT_LOG_ENTRIES);
        }
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
        if (window.ArbRuntimeMemoryUtils && typeof window.ArbRuntimeMemoryUtils.trimContainerChildren === 'function') {
            window.ArbRuntimeMemoryUtils.trimContainerChildren(alertLogMutedLogContent, MAX_ALERT_LOG_ENTRIES);
        }
    }

    function shouldAutoOpenAlertLogEntries(entries) {
        if (window.AlertLogUiUtils && typeof window.AlertLogUiUtils.shouldAutoOpenAlertLogEntries === 'function') {
            return window.AlertLogUiUtils.shouldAutoOpenAlertLogEntries(entries);
        }
        const list = Array.isArray(entries) ? entries : [];
        return list.some((entry) => !(entry && entry.mutedEntry));
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
        if (!dexLink || !dexLink.url) return null;
        return {
            label: dexLink.label || '交易链接',
            url: dexLink.url
        };
    }

    function buildQuoteAlertTriggeredEntry(alert, quote, message, options = {}) {
        const displayName = getQuoteChainDisplayName(quote);
        const direction = getQuoteAlertDirection(alert && alert.target);
        const label = buildQuoteAlertDisplayLabel(quote, quoteMarketState.get(quote.id) || {}, direction);
        const currentValueText = options.currentValueText || '';
        const actionLink = buildQuoteAlertActionLink(quote);
        return {
            alert,
            quote,
            displayName,
            label,
            message,
            currentValueText,
            actionLink,
            summaryLines: [[displayName, label].filter(Boolean).join(' '), message].filter(Boolean),
            mutedTargetCandidate: alert && alert.target && alert.target.type === 'quote' ? alert : null
        };
    }

    function findDashboardQuoteById(quoteId) {
        const numericQuoteId = Number(quoteId);
        if (!Number.isFinite(numericQuoteId)) return null;
        const category = dashboardState.find((item) => Array.isArray(item && item.quotes) && item.quotes.some((quote) => Number(quote && quote.id) === numericQuoteId));
        return category ? category.quotes.find((quote) => Number(quote && quote.id) === numericQuoteId) || null : null;
    }

    function pruneArbOpportunityHighlightsInPlace(nowMs = Date.now()) {
        if (!(arbHighlightedOpportunityUntilById instanceof Map) || !arbHighlightedOpportunityUntilById.size) {
            return arbHighlightedOpportunityUntilById;
        }
        for (const [opportunityId, expiresAt] of arbHighlightedOpportunityUntilById.entries()) {
            if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) {
                arbHighlightedOpportunityUntilById.delete(opportunityId);
            }
        }
        return arbHighlightedOpportunityUntilById;
    }

    function scheduleArbOpportunityHighlightCleanup(nowMs = Date.now()) {
        if (arbOpportunityHighlightCleanupTimer) {
            clearTimeout(arbOpportunityHighlightCleanupTimer);
            arbOpportunityHighlightCleanupTimer = null;
        }
        pruneArbOpportunityHighlightsInPlace(nowMs);
        if (!arbHighlightedOpportunityUntilById.size) return;

        let nextExpiresAt = Number.POSITIVE_INFINITY;
        for (const expiresAt of arbHighlightedOpportunityUntilById.values()) {
            if (Number.isFinite(expiresAt) && expiresAt < nextExpiresAt) {
                nextExpiresAt = expiresAt;
            }
        }
        if (!Number.isFinite(nextExpiresAt)) return;

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
        if (!opportunityId) return false;
        pruneArbOpportunityHighlightsInPlace(nowMs);
        const expiresAt = arbHighlightedOpportunityUntilById.get(String(opportunityId));
        return Number.isFinite(expiresAt) && expiresAt > nowMs;
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
        if (!targetKey || !opportunityId) return;
        const currentIds = nextTargetMap.get(targetKey);
        if (currentIds) {
            currentIds.push(opportunityId);
            return;
        }
        nextTargetMap.set(targetKey, [opportunityId]);
    }

    function markTriggeredArbOpportunities(alert, evaluation, nowMs = Date.now()) {
        const targetKey = buildTriggeredArbOpportunityHighlightTargetKey(alert, evaluation);
        if (!targetKey) return false;
        const opportunityIds = arbOpportunityIdsByTargetKey.get(targetKey);
        if (!Array.isArray(opportunityIds) || !opportunityIds.length) return false;

        let changed = false;
        const nextExpiresAt = nowMs + ARB_OPPORTUNITY_HIGHLIGHT_DURATION_MS;
        for (const opportunityId of opportunityIds) {
            const normalizedId = String(opportunityId || '').trim();
            if (!normalizedId) continue;
            const previousExpiresAt = arbHighlightedOpportunityUntilById.get(normalizedId) || 0;
            if (previousExpiresAt >= nextExpiresAt) continue;
            arbHighlightedOpportunityUntilById.set(normalizedId, nextExpiresAt);
            changed = true;
        }
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
        const card = window.DomRenderUtils.createElementFromHtml(
            window.AlertLogUiUtils.buildQuoteAlertLogHtml(entry, {
                nowMs,
                actionLink: entry && entry.actionLink ? entry.actionLink : buildQuoteAlertActionLink(quote),
                mutedEntry,
                targetKey: entry && entry.mutedTargetCandidate ? buildMutedPathTargetKey(entry.mutedTargetCandidate) : '',
                statusText: mutedEntry ? buildMutedPathStatusText(mutedEntry, nowMs) : '已触发'
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
        if (window.ArbRuntimeMemoryUtils && typeof window.ArbRuntimeMemoryUtils.trimContainerChildren === 'function') {
            window.ArbRuntimeMemoryUtils.trimContainerChildren(alertLogContent, MAX_ALERT_LOG_ENTRIES);
        }
    }

    function pruneMutedPathTargetsInPlace(nowMs = Date.now()) {
        if (!window.PathAlertUtils || typeof window.PathAlertUtils.pruneExpiredMutedPathTargets !== 'function') {
            return mutedPathTargets;
        }
        mutedPathTargets = window.PathAlertUtils.pruneExpiredMutedPathTargets(mutedPathTargets, nowMs);
        return mutedPathTargets;
    }

    function getMutedPathTargetEntry(alertOrTarget, nowMs = Date.now()) {
        pruneMutedPathTargetsInPlace(nowMs);
        if (!window.PathAlertUtils || typeof window.PathAlertUtils.findMutedPathAlert !== 'function') {
            return null;
        }
        return window.PathAlertUtils.findMutedPathAlert(mutedPathTargets, alertOrTarget, nowMs);
    }

    function buildMutedPathTargetKey(alertOrTarget) {
        if (!window.PathAlertUtils || typeof window.PathAlertUtils.buildPathAlertTargetDuplicateKey !== 'function') {
            return '';
        }
        const target = alertOrTarget && alertOrTarget.target ? alertOrTarget.target : alertOrTarget;
        return window.PathAlertUtils.buildPathAlertTargetDuplicateKey(target);
    }

    function loadMutedPathTargetsFromStorage() {
        const storage = getLocalStorageSafe();
        if (!storage) return [];
        try {
            const raw = storage.getItem(MUTED_PATH_TARGETS_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (window.MutedPathStorageUtils && typeof window.MutedPathStorageUtils.normalizeStoredMutedPathTargets === 'function') {
                return window.MutedPathStorageUtils.normalizeStoredMutedPathTargets(parsed);
            }
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
            if (window.MutedPathLegUtils && typeof window.MutedPathLegUtils.pruneExpiredMutedPathLegs === 'function') {
                return window.MutedPathLegUtils.pruneExpiredMutedPathLegs(parsed, Date.now());
            }
        } catch (error) {
            console.warn('读取屏蔽腿本地缓存失败:', error);
        }
        return [];
    }

    function buildMutedPathLogTitleSnapshot(entry) {
        if (!entry || typeof entry !== 'object') return '';
        const explicitTitle = String(entry.logTitleSnapshot || '').trim();
        if (explicitTitle) return explicitTitle;
        if (entry.quote) {
            return String(entry.displayName || (entry.alert && entry.alert.name) || '报价提醒').trim();
        }
        const alertName = String(entry.alert && entry.alert.name || '').trim();
        return alertName ? `🚨 [路径报警] ${alertName}` : '🚨 [路径报警]';
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
            const list = window.MutedPathStorageUtils && typeof window.MutedPathStorageUtils.trimMutedPathTargetsForStorage === 'function'
                ? window.MutedPathStorageUtils.trimMutedPathTargetsForStorage(mutedPathTargets)
                : mutedPathTargets;
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
            const list = window.MutedPathLegUtils && typeof window.MutedPathLegUtils.trimMutedPathLegsForStorage === 'function'
                ? window.MutedPathLegUtils.trimMutedPathLegsForStorage(mutedPathLegs)
                : mutedPathLegs;
            mutedPathLegs = Array.isArray(list) ? list : [];
            storage.setItem(MUTED_PATH_LEGS_STORAGE_KEY, JSON.stringify(mutedPathLegs));
        } catch (error) {
            console.warn('保存屏蔽腿本地缓存失败:', error);
        }
    }

    function mutePathAlertTarget(entry, nowMs = Date.now()) {
        const muteTarget = entry && entry.mutedTargetCandidate ? entry.mutedTargetCandidate : null;
        if (!muteTarget) return null;
        if (!window.PathAlertUtils || typeof window.PathAlertUtils.createMutedPathTargetEntry !== 'function') return null;
        const targetKey = buildMutedPathTargetKey(muteTarget);
        if (!targetKey) return null;
        const logTitleSnapshot = buildMutedPathLogTitleSnapshot(entry);
        pruneMutedPathTargetsInPlace(nowMs);
        const existingEntry = mutedPathTargets.find((item) => buildMutedPathTargetKey(item) === targetKey) || null;
        const nextMutedEntry = existingEntry && typeof window.PathAlertUtils.extendMutedPathTargetEntry === 'function'
            ? window.PathAlertUtils.extendMutedPathTargetEntry(existingEntry, nowMs, PATH_ALERT_MUTE_EXTEND_DURATION_MS)
            : window.PathAlertUtils.createMutedPathTargetEntry(
                muteTarget,
                entry.summaryLines,
                nowMs,
                PATH_ALERT_MUTE_DURATION_MS,
                { logTitleSnapshot }
            );
        const mutedEntry = nextMutedEntry && !String(nextMutedEntry.logTitleSnapshot || '').trim()
            ? window.PathAlertUtils.normalizeMutedPathTarget({
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

    function buildMutedPathStatusText(mutedEntry, nowMs = Date.now()) {
        if (!mutedEntry) return '';
        const remainingMs = Math.max(0, Number(mutedEntry.expiresAt) - nowMs);
        const countdown = window.PathAlertUtils && typeof window.PathAlertUtils.formatMutedCountdown === 'function'
            ? window.PathAlertUtils.formatMutedCountdown(remainingMs)
            : '--:--';
        return `沉默中 · ${countdown}`;
    }

    function buildMutedPathLegStatusText(mutedEntry, nowMs = Date.now()) {
        if (!mutedEntry) return '';
        const remainingMs = Math.max(0, Number(mutedEntry.expiresAt) - nowMs);
        const countdown = window.PathAlertUtils && typeof window.PathAlertUtils.formatMutedCountdown === 'function'
            ? window.PathAlertUtils.formatMutedCountdown(remainingMs)
            : '--:--';
        return `屏蔽中 · ${countdown}`;
    }

    function buildMutedPathLegKey(legOrEntry) {
        if (!window.MutedPathLegUtils || typeof window.MutedPathLegUtils.buildMutedPathLegKey !== 'function') {
            return '';
        }
        return window.MutedPathLegUtils.buildMutedPathLegKey(legOrEntry);
    }

    function pruneMutedPathLegsInPlace(nowMs = Date.now()) {
        if (!window.MutedPathLegUtils || typeof window.MutedPathLegUtils.pruneExpiredMutedPathLegs !== 'function') {
            return mutedPathLegs;
        }
        mutedPathLegs = window.MutedPathLegUtils.pruneExpiredMutedPathLegs(mutedPathLegs, nowMs);
        return mutedPathLegs;
    }

    function getMutedPathLegEntry(leg, nowMs = Date.now()) {
        pruneMutedPathLegsInPlace(nowMs);
        if (!window.MutedPathLegUtils || typeof window.MutedPathLegUtils.findMutedPathLeg !== 'function') {
            return null;
        }
        return window.MutedPathLegUtils.findMutedPathLeg(mutedPathLegs, leg, nowMs);
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
        if (!leg || !window.MutedPathLegUtils || typeof window.MutedPathLegUtils.createMutedPathLegEntry !== 'function') {
            return null;
        }
        const durationMs = Number(durationHours) * 60 * 60 * 1000;
        if (!Number.isFinite(durationMs) || durationMs <= 0) return null;
        const legKey = buildMutedPathLegKey(leg);
        if (!legKey) return null;
        pruneMutedPathLegsInPlace(nowMs);
        const existingEntry = mutedPathLegs.find((entry) => buildMutedPathLegKey(entry) === legKey) || null;
        const nextEntry = existingEntry && typeof window.MutedPathLegUtils.extendMutedPathLegEntry === 'function'
            ? window.MutedPathLegUtils.extendMutedPathLegEntry(existingEntry, nowMs, durationMs)
            : window.MutedPathLegUtils.createMutedPathLegEntry(
                leg,
                nowMs,
                durationMs,
                { titleSnapshot: buildMutedPathLegTitleSnapshot(leg) }
            );
        if (!nextEntry) return null;
        const mutedEntry = !String(nextEntry.titleSnapshot || '').trim() && typeof window.MutedPathLegUtils.normalizeMutedPathLeg === 'function'
            ? window.MutedPathLegUtils.normalizeMutedPathLeg({
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
        if (!targetKey || !window.PathAlertUtils || typeof window.PathAlertUtils.extendMutedPathTargetEntry !== 'function') {
            return null;
        }
        pruneMutedPathTargetsInPlace(nowMs);
        const existingEntry = mutedPathTargets.find((entry) => buildMutedPathTargetKey(entry) === targetKey) || null;
        if (!existingEntry) return null;
        const nextEntry = window.PathAlertUtils.extendMutedPathTargetEntry(existingEntry, nowMs, PATH_ALERT_MUTE_EXTEND_DURATION_MS);
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
        if (!targetKey || !window.MutedPathLegUtils || typeof window.MutedPathLegUtils.extendMutedPathLegEntry !== 'function') {
            return null;
        }
        pruneMutedPathLegsInPlace(nowMs);
        const existingEntry = mutedPathLegs.find((entry) => buildMutedPathLegKey(entry) === targetKey) || null;
        if (!existingEntry) return null;
        const nextEntry = window.MutedPathLegUtils.extendMutedPathLegEntry(existingEntry, nowMs, MUTED_PATH_LEG_EXTEND_DURATION_MS);
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
        const escapedTargetKey = window.DomRenderUtils.escapeCssAttributeValue(targetKey);
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
                        statusEl.textContent = buildMutedPathStatusText(resolvedEntry, nowMs);
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
        const mutedPathItems = mutedPathTargets
            .slice()
            .sort((left, right) => Number(right && right.mutedAt) - Number(left && left.mutedAt))
            .map((entry) => window.AlertLogUiUtils.buildMutedStateItemHtml({
                title: entry.logTitleSnapshot || entry.summaryLinesSnapshot[0] || '路径沉默',
                lines: entry.summaryLinesSnapshot,
                status: buildMutedPathStatusText(entry, nowMs),
                actions: [
                    { label: '延长 2 小时', dataAttr: 'data-muted-path-target-extend', value: buildMutedPathTargetKey(entry) },
                    { label: '恢复', dataAttr: 'data-muted-path-target-restore', value: buildMutedPathTargetKey(entry) }
                ]
            }));
        const mutedLegItems = mutedPathLegs
            .slice()
            .sort((left, right) => Number(right && right.mutedAt) - Number(left && left.mutedAt))
            .map((entry) => window.AlertLogUiUtils.buildMutedStateItemHtml({
                title: entry.titleSnapshot || buildLiveQuoteLabel(entry.chain, entry.fromSymbol, entry.toSymbol),
                lines: [],
                status: buildMutedPathLegStatusText(entry, nowMs),
                actions: [
                    { label: '延长 2 小时', dataAttr: 'data-muted-path-leg-extend', value: buildMutedPathLegKey(entry) },
                    { label: '恢复', dataAttr: 'data-muted-path-leg-restore', value: buildMutedPathLegKey(entry) }
                ]
            }));
        mutedAlertStateHtmlRenderer.render(alertLogMutedContent, [
            window.AlertLogUiUtils.buildMutedStateSectionHtml('沉默的路径', mutedPathItems, '当前没有沉默中的路径'),
            window.AlertLogUiUtils.buildMutedStateSectionHtml('屏蔽的腿', mutedLegItems, '当前没有屏蔽中的腿')
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
        const utils = getDashboardRuntimeUtils();
        if (utils && typeof utils.resolveMutedStateRefreshDelay === 'function') {
            return utils.resolveMutedStateRefreshDelay({
                mutedPathTargets,
                mutedPathLegs,
                nowMs,
                visible: isAlertLogPanelVisible(),
                visibleRefreshMs: MUTED_STATE_VISIBLE_REFRESH_MS,
                hiddenMaxRefreshMs: MUTED_STATE_HIDDEN_MAX_REFRESH_MS
            });
        }
        if (!mutedPathTargets.length && !mutedPathLegs.length) return null;
        return isAlertLogPanelVisible()
            ? MUTED_STATE_VISIBLE_REFRESH_MS
            : MUTED_STATE_HIDDEN_MAX_REFRESH_MS;
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
            const escapedTargetKey = window.DomRenderUtils.escapeCssAttributeValue(targetKey);
            if (alertLogMutedLogContent.querySelector(`.log-entry[data-muted-target-key="${escapedTargetKey}"]`)) {
                return;
            }
            const card = window.DomRenderUtils.createElementFromHtml(
                window.AlertLogUiUtils.buildRestoredMutedAlertLogHtml(entry, {
                    nowMs,
                    targetKey,
                    statusText: buildMutedPathStatusText(entry, nowMs)
                })
            );
            if (card) {
                alertLogMutedLogContent.prepend(card);
            }
        });
        updateMutedPathAlertLogCards('', nowMs);
        syncMutedPathLogTimer();
        if (window.ArbRuntimeMemoryUtils && typeof window.ArbRuntimeMemoryUtils.trimContainerChildren === 'function') {
            window.ArbRuntimeMemoryUtils.trimContainerChildren(alertLogMutedLogContent, MAX_ALERT_LOG_ENTRIES);
        }
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
            const card = window.DomRenderUtils.createElementFromHtml(
                window.AlertLogUiUtils.buildPathAlertLogCardHtml(entry, {
                    nowMs,
                    mutedEntry,
                    targetKey: entry && entry.mutedTargetCandidate ? buildMutedPathTargetKey(entry.mutedTargetCandidate) : '',
                    statusText: mutedEntry ? buildMutedPathStatusText(mutedEntry, nowMs) : '已触发',
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
        if (window.ArbRuntimeMemoryUtils && typeof window.ArbRuntimeMemoryUtils.trimContainerChildren === 'function') {
            window.ArbRuntimeMemoryUtils.trimContainerChildren(alertLogContent, MAX_ALERT_LOG_ENTRIES);
        }
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
        const utils = getDashboardRuntimeUtils();
        if (utils && typeof utils.hasQuoteMarketStateChanged === 'function') {
            return utils.hasQuoteMarketStateChanged(previousState, nextState);
        }
        return previousState !== nextState;
    }

    function sanitizeQuoteMarketState(state) {
        const utils = getDashboardRuntimeUtils();
        if (utils && typeof utils.sanitizeQuoteMarketState === 'function') {
            return utils.sanitizeQuoteMarketState(state);
        }
        const source = state && typeof state === 'object' ? state : {};
        const result = { ...source };
        delete result.hasUnreadAlert;
        delete result.logShown;
        delete result.isSoundActive;
        delete result.trendTimer;
        return result;
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

    function buildDefaultQuoteUiState() {
        return {
            hasUnreadAlert: false,
            trendTimer: null
        };
    }

    function normalizeQuoteStateKey(quoteId) {
        const numericQuoteId = Number(quoteId);
        return Number.isFinite(numericQuoteId) ? numericQuoteId : quoteId;
    }

    function getQuoteUiState(quoteId) {
        return quoteUiState.get(normalizeQuoteStateKey(quoteId)) || buildDefaultQuoteUiState();
    }

    function setQuoteUiState(quoteId, nextState) {
        const key = normalizeQuoteStateKey(quoteId);
        const current = getQuoteUiState(key);
        const merged = {
            ...buildDefaultQuoteUiState(),
            ...current,
            ...(nextState && typeof nextState === 'object' ? nextState : {})
        };
        quoteUiState.set(key, merged);
        return merged;
    }

    function clearQuoteTrendTimer(quoteId) {
        const key = normalizeQuoteStateKey(quoteId);
        const state = quoteUiState.get(key);
        if (state && state.trendTimer) {
            clearTimeout(state.trendTimer);
            quoteUiState.set(key, { ...state, trendTimer: null });
        }
    }

    function resetQuoteUiRuntimeState(quoteId) {
        clearQuoteTrendTimer(quoteId);
        quoteUiState.set(normalizeQuoteStateKey(quoteId), buildDefaultQuoteUiState());
    }

    function deleteQuoteUiRuntimeState(quoteId) {
        clearQuoteTrendTimer(quoteId);
        quoteUiState.delete(normalizeQuoteStateKey(quoteId));
    }

    function buildArbRuleSnapshotCacheKey() {
        const categorySignature = dashboardState
            .map((category) => {
                const quoteIds = Array.isArray(category && category.quotes)
                    ? category.quotes
                        .filter((quote) => quote && quote.paused !== true)
                        .map((quote) => `${quote.id}:${quote.chain}:${quote.toChain || ''}:${quote.showInverse ? 1 : 0}`)
                        .join(',')
                    : '';
                return `${category && category.name || ''}:${quoteIds}`;
            })
            .join('|');
        return `${quoteMarketStateRevision}|${categorySignature}`;
    }

    function buildQuotesByCategoryName() {
        const result = new Map();
        for (const category of dashboardState) {
            if (!category || !category.name) continue;
            result.set(category.name, getActiveQuotes(Array.isArray(category.quotes) ? category.quotes : []));
        }
        return result;
    }

    function filterMutedArbEdges(edges, nowMs = Date.now()) {
        pruneMutedPathLegsInPlace(nowMs);
        if (!window.MutedPathLegUtils || typeof window.MutedPathLegUtils.filterMutedPathLegs !== 'function') {
            return Array.isArray(edges) ? edges : [];
        }
        return window.MutedPathLegUtils.filterMutedPathLegs(edges, mutedPathLegs, nowMs);
    }

    function filterMutedArbCycles(cycles, nowMs = Date.now()) {
        pruneMutedPathLegsInPlace(nowMs);
        if (!window.MutedPathLegUtils || typeof window.MutedPathLegUtils.filterMutedCycles !== 'function') {
            return Array.isArray(cycles) ? cycles : [];
        }
        return window.MutedPathLegUtils.filterMutedCycles(cycles, mutedPathLegs, nowMs);
    }

    function buildVisibleArbEdges(quotes, nowMs = Date.now()) {
        return filterMutedArbEdges(
            window.ArbPaths.buildEdges(quotes, quoteMarketState, null),
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
        const ruleEdges = window.ArbPaths.buildRuleEdges(aliasRules);
        const allEdgesWithRules = allEdges.concat(ruleEdges);
        const quoteMetaById = buildQuoteMetaById();
        const quotesByCategoryName = buildQuotesByCategoryName();
        const baseSnapshot = window.ArbRuleSnapshotUtils && typeof window.ArbRuleSnapshotUtils.buildArbRuleSnapshot === 'function'
            ? window.ArbRuleSnapshotUtils.buildArbRuleSnapshot({
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
                mutedPathLegUtils: window.MutedPathLegUtils,
                preferredStartSymbols: buildPreferredCycleStartSymbols(aliasRules, 'cbBTC'),
                arbPathsApi: window.ArbPaths,
                arbFixedUtils: window.ArbFixedUtils,
                arbSpecialUtils: window.ArbSpecialUtils
            })
            : {
                fixedResults: [],
                fixedByRuleId: {},
                specialResults: [],
                specialByRuleId: {}
            };

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
        return window.ArbPathTemplateCacheUtils || null;
    }

    function getArbPathTopologyCache() {
        const utils = getArbPathTemplateCacheUtils();
        if (!utils || !window.ArbPaths) return null;

        const cacheKey = `${utils.buildArbPathTopologyCacheKey(dashboardState, quoteMarketState)}|${arbCycleStartPriority.join(',')}`;
        if (arbPathTopologyCache && arbPathTopologyCacheKey === cacheKey) {
            return arbPathTopologyCache;
        }

        const aliasRules = getAliasRules();
        const preferredCycleStartSymbols = buildPreferredCycleStartSymbols(aliasRules, 'cbBTC');
        const ruleEdges = window.ArbPaths.buildRuleEdges(aliasRules);
        const quoteMetaById = buildQuoteMetaById();
        const targetNames = ['WBTC监控', 'LBTC监控', 'TBTC监控'];
        const targetCategories = dashboardState.filter((category) => targetNames.includes(category && category.name));
        const categoryTemplatesBySectionKey = new Map();
        const allQuotes = getActiveQuotes(dashboardState.flatMap((category) => category.quotes || []));
        const allTopologyEdges = utils.buildTopologyEdges(allQuotes, quoteMarketState, null);
        const allTopologyEdgesWithRules = allTopologyEdges.concat(ruleEdges);
        const fixedTemplatesByRuleId = {};

        for (const category of targetCategories) {
            const sectionKey = buildArbSectionKey('category', category && (category.id || category.name));
            const quotes = getActiveQuotes(Array.isArray(category && category.quotes) ? category.quotes : []);
            const edges = utils.buildTopologyEdges(quotes, quoteMarketState, null);
            const templates = utils.buildCycleTemplates(edges.concat(ruleEdges), {
                maxDepth: 3,
                limit: Number.MAX_SAFE_INTEGER,
                acceptCycle: window.ArbPaths.isMeaningfulPath,
                preferredStartSymbols: preferredCycleStartSymbols
            });
            categoryTemplatesBySectionKey.set(sectionKey, templates);
        }

        const globalSourceCategories = window.ArbPanelLayoutUtils && typeof window.ArbPanelLayoutUtils.resolveItemsBySelectors === 'function'
            ? window.ArbPanelLayoutUtils.resolveItemsBySelectors(dashboardState, GLOBAL_PATH_SOURCE_SELECTORS)
            : dashboardState.slice(0, 4);
        const globalSourceQuotes = getActiveQuotes(globalSourceCategories.flatMap((category) => Array.isArray(category && category.quotes) ? category.quotes : []));
        const globalEdges = utils.buildTopologyEdges(globalSourceQuotes, quoteMarketState, null);
        const globalTemplates = utils.buildCycleTemplates(globalEdges.concat(ruleEdges), {
            maxDepth: 3,
            limit: Number.MAX_SAFE_INTEGER,
            acceptCycle: window.ArbPaths.isMeaningfulPath,
            preferredStartSymbols: preferredCycleStartSymbols
        });

        for (const rule of FIXED_PATH_RULES) {
            if (!rule) continue;
            const filteredEdges = window.ArbFixedUtils && typeof window.ArbFixedUtils.filterEdgesForFixedRule === 'function'
                ? window.ArbFixedUtils.filterEdgesForFixedRule(rule, allTopologyEdgesWithRules, quoteMetaById)
                : allTopologyEdgesWithRules;
            fixedTemplatesByRuleId[rule.id] = utils.buildFixedPathTemplates(filteredEdges, rule, aliasRules, {
                limit: Number(rule.resultLimit) || 1,
                preferredStartSymbols: preferredCycleStartSymbols
            });
        }

        arbPathTopologyCacheKey = cacheKey;
        arbPathTopologyCache = {
            ruleEdges,
            categoryTemplatesBySectionKey,
            globalTemplates,
            fixedTemplatesByRuleId
        };
        return arbPathTopologyCache;
    }

    function formatChainLabel(chain) {
        return CHAIN_DISPLAY_NAMES[chain] || chain;
    }

    function normalizeArbChainFilterToken(chainToken) {
        const token = String(chainToken || '').trim();
        if (!token) return '';
        if (Object.prototype.hasOwnProperty.call(CHAIN_DISPLAY_NAMES, token)) {
            return token;
        }

        for (const [chainKey, displayName] of Object.entries(CHAIN_DISPLAY_NAMES)) {
            if (displayName === token) {
                return chainKey;
            }
        }

        const aliasMatch = CHAIN_FILTER_ALIASES[token.toUpperCase()];
        return aliasMatch || '';
    }

    const FIXED_PATH_RULES = (window.PathAlertRuleDefinitions && Array.isArray(window.PathAlertRuleDefinitions.FIXED_PATH_RULES))
        ? window.PathAlertRuleDefinitions.FIXED_PATH_RULES
        : [
        {
            id: 'fixed:wbtc-eth-arb',
            title: 'WBTC ETH <-> ARB',
            base: 'cbBTC',
            quote: 'WBTC',
            categoryNames: ['WBTC监控'],
            chains: ['ethereum', 'arbitrum'],
            steps: 2
        },
        {
            id: 'fixed:gho-usdc',
            title: 'GHO <-> USDC',
            base: 'GHO',
            quote: 'USDC',
            steps: 2,
            crossChain: true
        }
    ];
    const SPECIAL_ARB_RULES = (window.PathAlertRuleDefinitions && Array.isArray(window.PathAlertRuleDefinitions.SPECIAL_ARB_RULES))
        ? window.PathAlertRuleDefinitions.SPECIAL_ARB_RULES
        : [
        {
            id: 'special:wbtc-bybit',
            title: 'WBTC <-> BYBIT',
            type: 'pair-bybit',
            categoryName: 'WBTC监控',
            dexBase: 'cbBTC',
            dexQuote: 'WBTC',
            cexQuote: 'BTC',
            cexChain: 'Bybit',
            displayTargets: [1, 2, 3],
            withdrawFee: 0.0001,
            depthSizeDecimals: 5,
            targetAmountDecimals: 5,
            profitDecimals: 5,
            bpDecimals: 1
        },
        {
            id: 'special:usde-bybit',
            title: 'USDe <-> BYBIT',
            type: 'pair-bybit',
            categoryName: 'USD监控',
            dexBase: 'USDT',
            dexQuote: 'USDe',
            cexQuote: 'USDT',
            cexChain: 'Bybit',
            displayTargets: [100000, 200000],
            withdrawFee: 0,
            depthSizeDecimals: 1,
            targetAmountDecimals: 1,
            profitDecimals: 1,
            bpDecimals: 1
        },
        {
            id: 'special:usdtb-bybit',
            title: 'USDtb <-> BYBIT',
            type: 'pair-bybit',
            categoryName: 'USD监控',
            dexBase: 'USDT',
            dexQuote: 'USDtb',
            cexQuote: 'USDT',
            cexChain: 'Bybit',
            displayTargets: [100000, 200000],
            withdrawFee: 0,
            depthSizeDecimals: 1,
            targetAmountDecimals: 1,
            profitDecimals: 1,
            bpDecimals: 1
        }
    ];
    const GLOBAL_PATH_SOURCE_SELECTORS = [0, 1, 2, 3];
    const ARB_PATH_CONFIG = window.ArbPathConfig || { watchItems: [] };

    function formatArbPathLegLine(leg) {
        const displayFrom = leg && leg.rawFrom ? leg.rawFrom : leg.from;
        const displayTo = leg && leg.rawTo ? leg.rawTo : leg.to;
        const baseLine = window.ArbPaths.formatLegLine({
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

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getArbDetailUtils() {
        return window.ArbDetailUtils || {
            buildDetailInputAmounts(baseAmount) {
                const amount = Number(baseAmount);
                const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;
                const roundToOneDecimal = (value) => {
                    const rounded = Math.round(Number(value) * 10) / 10;
                    return Number.isFinite(rounded) && rounded > 0 ? rounded : 1;
                };
                return [
                    safeAmount,
                    roundToOneDecimal(safeAmount * 0.5),
                    roundToOneDecimal(safeAmount * 1.5),
                    roundToOneDecimal(safeAmount * 3)
                ];
            },
            buildArbDetailRateText(rawPrice, fromSymbol, toSymbol, precision = 6) {
                if (rawPrice === null || rawPrice === undefined || rawPrice === '') return '--';
                const numericRate = Number(rawPrice);
                if (!Number.isFinite(numericRate)) return '--';
                const formattedRate = Number(numericRate.toFixed(precision));
                if (!fromSymbol || !toSymbol) {
                    return String(formattedRate);
                }
                return `1 ${fromSymbol} ≈ ${formattedRate} ${toSymbol}`;
            },
            buildArbDetailRateDeltaText(baseRate, nextRate, decimals = 1) {
                const safeBaseRate = Number(baseRate);
                const safeNextRate = Number(nextRate);
                if (!Number.isFinite(safeBaseRate) || safeBaseRate <= 0) return '--';
                if (!Number.isFinite(safeNextRate) || safeNextRate <= 0) return '--';
                const safeDecimals = Number.isInteger(decimals) && decimals >= 0 ? decimals : 1;
                const bpDelta = ((safeNextRate / safeBaseRate) - 1) * 10000;
                const roundedDelta = Number(bpDelta.toFixed(safeDecimals));
                const sign = roundedDelta >= 0 ? '+' : '';
                return `${sign}${roundedDelta.toFixed(safeDecimals)}bp`;
            },
            summarizeDetailResult(startAmount, finalAmount) {
                const safeStart = Number(startAmount) > 0 ? Number(startAmount) : 1;
                if (typeof finalAmount !== 'number' || Number.isNaN(finalAmount)) {
                    return { profit: null, profitRate: null };
                }
                const profit = finalAmount - safeStart;
                return {
                    profit,
                    profitRate: profit / safeStart
                };
            },
            getQuoteRunState(isPaused) {
                return isPaused
                    ? { text: '暂停中', tone: 'paused' }
                    : { text: '报价中', tone: 'running' };
            },
            buildArbDetailChartPairs(cycle) {
                const legs = Array.isArray(cycle?.legs) ? cycle.legs : [];
                return legs
                    .filter((leg) => !(leg && (leg.rule || leg.chain === '规则')))
                    .map((leg) => ({
                        quoteId: Number(leg?.quoteId),
                        direction: leg?.inverse ? 'inverse' : 'forward',
                        chain: String(leg?.chain || ''),
                        fromSymbol: String(leg?.rawFrom || leg?.from || ''),
                        toSymbol: String(leg?.rawTo || leg?.to || '')
                    }))
                    .filter((item) => Number.isFinite(item.quoteId) && item.quoteId > 0);
            },
            buildUniqueArbOpportunityId(existingIds, section, label, cycle) {
                const baseId = this.buildArbOpportunityStableId(section, label, cycle);
                const usedIds = existingIds instanceof Set ? existingIds : new Set(existingIds || []);
                if (!usedIds.has(baseId)) {
                    return baseId;
                }
                let suffix = 2;
                while (usedIds.has(`${baseId}:${suffix}`)) {
                    suffix += 1;
                }
                return `${baseId}:${suffix}`;
            },
            getNextArbDetailRequestVersion(currentVersion) {
                const safeCurrent = Number(currentVersion);
                if (!Number.isFinite(safeCurrent) || safeCurrent < 0) return 1;
                return safeCurrent + 1;
            },
            shouldApplyArbDetailRequestVersion(expectedVersion, currentVersion) {
                return Number(expectedVersion) === Number(currentVersion);
            },
            getArbDetailBudgetTimestamp(budgetState, source) {
                if (!(budgetState instanceof Map)) return null;
                const intervalKey = this.getArbDetailIntervalKey(source);
                if (!intervalKey) return null;
                const timestamp = Number(budgetState.get(intervalKey));
                return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
            },
            recordArbDetailBudgetTimestamp(budgetState, source, requestedAt = Date.now()) {
                if (!(budgetState instanceof Map)) return null;
                const intervalKey = this.getArbDetailIntervalKey(source);
                if (!intervalKey) return null;
                const nextTimestamp = Number(requestedAt);
                if (!Number.isFinite(nextTimestamp) || nextTimestamp <= 0) {
                    return this.getArbDetailBudgetTimestamp(budgetState, source);
                }
                const currentTimestamp = this.getArbDetailBudgetTimestamp(budgetState, source);
                const appliedTimestamp = currentTimestamp && currentTimestamp > nextTimestamp
                    ? currentTimestamp
                    : nextTimestamp;
                budgetState.set(intervalKey, appliedTimestamp);
                return appliedTimestamp;
            },
            shouldSyncArbDetailSnapshotForCard(cardIndex) {
                return Number(cardIndex) === 0;
            },
            buildArbDetailSnapshotMonitorState(previousState, quoteResult, options = {}) {
                const baseState = previousState && typeof previousState === 'object'
                    ? { ...previousState }
                    : {};
                const symbols = quoteResult && quoteResult.symbols && typeof quoteResult.symbols === 'object'
                    ? quoteResult.symbols
                    : {};
                if (options.isInverseFetch) {
                    return {
                        ...baseState,
                        inverseRawPrice: quoteResult?.rawPrice,
                        inverseTotalAmountOut: quoteResult?.finalAmountOut,
                        inverseFromSymbol: symbols.from || '',
                        inverseToSymbol: symbols.to || ''
                    };
                }
                return {
                    ...baseState,
                    fromSymbol: symbols.from || '',
                    toSymbol: symbols.to || '',
                    lastResultText: quoteResult?.resultText || '',
                    lastRawPrice: quoteResult?.rawPrice,
                    lastTotalAmountOut: quoteResult?.finalAmountOut,
                    cexOrderbook: quoteResult?.cexOrderbook || null,
                    usedSource: quoteResult?.usedSource || '',
                    usedSourceReal: options.successSource || null
                };
            },
            buildArbDetailDexLink(config = {}) {
                const utils = window.DexLinkUtils;
                if (!utils || typeof utils.buildDexLink !== 'function') return null;
                return utils.buildDexLink(config);
            },
            findBestSummaryIndices(cards) {
                let bestProfit = null;
                let bestProfitRate = null;
                const bestProfitIndices = [];
                const bestProfitRateIndices = [];

                (cards || []).forEach((card, index) => {
                    const profit = card?.summary?.profit;
                    const profitRate = card?.summary?.profitRate;
                    if (typeof profit === 'number' && Number.isFinite(profit)) {
                        if (bestProfit === null || profit > bestProfit) {
                            bestProfit = profit;
                            bestProfitIndices.length = 0;
                            bestProfitIndices.push(index);
                        } else if (profit === bestProfit) {
                            bestProfitIndices.push(index);
                        }
                    }
                    if (typeof profitRate === 'number' && Number.isFinite(profitRate)) {
                        if (bestProfitRate === null || profitRate > bestProfitRate) {
                            bestProfitRate = profitRate;
                            bestProfitRateIndices.length = 0;
                            bestProfitRateIndices.push(index);
                        } else if (profitRate === bestProfitRate) {
                            bestProfitRateIndices.push(index);
                        }
                    }
                });

                return { bestProfitIndices, bestProfitRateIndices };
            },
            shouldSyncArbDetailInput(index, editingInputIndex) {
                return index !== editingInputIndex;
            }
        };
    }

    function getChartsUtils() {
        return window.ChartsUtils || {
            buildChartsPageHref() {
                return '/charts';
            },
            buildChartPairLabel(pair) {
                const chain = pair?.chain ? `(${pair.chain}) ` : '';
                return `${chain}${pair?.fromSymbol || '--'} -> ${pair?.toSymbol || '--'}`;
            }
        };
    }

    function getChartsRenderer() {
        return window.ChartsRenderer || null;
    }

    function getDataTerminalUtils() {
        return window.DataTerminalUtils || null;
    }

    function getQuoteDisplayUtils() {
        return window.QuoteDisplayUtils || null;
    }

    function getDexLinkUtils() {
        return window.DexLinkUtils || null;
    }

    function getDexLinkLabel(config = {}) {
        const utils = getDexLinkUtils();
        if (!utils || typeof utils.getDexLinkLabel !== 'function') return null;
        return utils.getDexLinkLabel(config);
    }

    function buildDexLinkCopyButtonHtml(config = {}, className = '', buttonText = '复制') {
        const dexLabel = getDexLinkLabel(config);
        if (!dexLabel) return '';
        const inputAmount = Number(config.inputAmount);
        const amountAttr = Number.isFinite(inputAmount) && inputAmount > 0
            ? ` data-dex-link-input-amount="${escapeHtml(String(inputAmount))}"`
            : '';
        return `
            <button
                type="button"
                class="${escapeHtml(className)}"
                data-dex-link-copy="1"
                data-dex-link-label="${escapeHtml(dexLabel)}"
                data-dex-link-chain="${escapeHtml(config.chain || '')}"
                data-dex-link-from-token-address="${escapeHtml(config.fromTokenAddress || '')}"
                data-dex-link-to-token-address="${escapeHtml(config.toTokenAddress || '')}"${amountAttr}
            >${escapeHtml(buttonText)}</button>
        `;
    }

    function formatDetailNumber(value, precision = 6) {
        return (typeof value === 'number' && Number.isFinite(value))
            ? Number(value.toFixed(precision))
            : '--';
    }

    function formatDetailProfitRate(profitRate) {
        if (typeof profitRate !== 'number' || !Number.isFinite(profitRate)) return '--';
        return window.ArbPaths && typeof window.ArbPaths.formatProfitWanfen === 'function'
            ? window.ArbPaths.formatProfitWanfen(profitRate)
            : `${(profitRate * 10000).toFixed(2)}‱`;
    }

    function formatCexBookValue(value, maxDecimals = 10) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
        const abs = Math.abs(value);
        let decimals = maxDecimals;
        if (abs >= 1000) decimals = Math.min(decimals, 2);
        else if (abs >= 1) decimals = Math.min(decimals, 6);
        else if (abs >= 0.01) decimals = Math.min(decimals, 8);
        return Number(value.toFixed(decimals)).toString();
    }

    function buildCexOrderbookSummary(symbol, orderbook) {
        if (!orderbook) return `${symbol}: 等待盘口...`;
        const ask = `ASK ${formatCexBookValue(orderbook.bestAskPrice)} × ${formatCexBookValue(orderbook.bestAskSize, 6)}`;
        const bid = `BID ${formatCexBookValue(orderbook.bestBidPrice)} × ${formatCexBookValue(orderbook.bestBidSize, 6)}`;
        return `${ask}\n${bid}`;
    }

    function buildCexOrderbookTooltipHtml(orderbook) {
        if (!orderbook) {
            return '<div class="cex-orderbook-tooltip-empty">盘口等待数据...</div>';
        }

        const feeRate = Number(orderbook.feeRate);
        const feeNotice = Number.isFinite(feeRate)
            ? `<div class="cex-orderbook-fee-note">已计入手续费 ${(feeRate * 100).toFixed(2)}%</div>`
            : '';

        function renderSide(title, levels) {
            if (!Array.isArray(levels) || levels.length === 0) {
                return `
                    <div class="cex-orderbook-side">
                        <div class="cex-orderbook-title">${escapeHtml(title)}</div>
                        <div class="cex-orderbook-level empty">暂无数据</div>
                    </div>
                `;
            }

            const rows = levels.map((level, index) => `
                <div class="cex-orderbook-level">
                    <span>${index + 1}. ${formatCexBookValue(level.price)}</span>
                    <span>${formatCexBookValue(level.size, 6)}</span>
                </div>
            `).join('');

            return `
                <div class="cex-orderbook-side">
                    <div class="cex-orderbook-title">${escapeHtml(title)}</div>
                    ${rows}
                </div>
            `;
        }

        return `
            <div class="cex-orderbook-tooltip">
                ${feeNotice}
                ${renderSide('ASK', orderbook.asksTop5)}
                ${renderSide('BID', orderbook.bidsTop5)}
            </div>
        `;
    }

    function buildQuotePairLabelHtml(quote, state) {
        const utils = getQuoteDisplayUtils();
        if (!utils || typeof utils.buildQuotePairLabelHtml !== 'function') return '';
        return utils.buildQuotePairLabelHtml(quote, state);
    }

    function getQuoteDisplayText(quote, state) {
        const utils = getQuoteDisplayUtils();
        if (!utils || typeof utils.buildQuoteDisplayTextForState !== 'function') {
            return (state && state.lastResultText) || '...';
        }
        return utils.buildQuoteDisplayTextForState(quote, state, {
            mode: quoteDisplayMode,
            paused: isQuotePaused(quote)
        });
    }

    function getInverseQuoteDisplayText(quote, state, fallbackText = '反向报价排队中...') {
        const utils = getQuoteDisplayUtils();
        if (!utils || typeof utils.buildInverseQuoteDisplayTextForState !== 'function') {
            return fallbackText;
        }
        return utils.buildInverseQuoteDisplayTextForState(quote, state, {
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
        const paused = isQuotePaused(quote);
        pauseBtn.title = paused ? '恢复' : '暂停';
        pauseBtn.setAttribute('aria-label', paused ? '恢复' : '暂停');
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        pauseBtn.innerHTML = paused ? '▶️' : '⏸️';
    }

    function updateCategoryPauseButtonState(categoryId) {
        const pauseBtn = document.querySelector(`[data-toggle-category-pause-id="${categoryId}"]`);
        if (!pauseBtn) return;
        const category = dashboardState.find((item) => item.id == categoryId);
        const action = getCategoryPauseAction(category && category.quotes ? category.quotes : []);
        const allPaused = action === 'resume';
        pauseBtn.title = allPaused ? '恢复分区' : '暂停分区';
        pauseBtn.setAttribute('aria-label', allPaused ? '恢复分区' : '暂停分区');
        pauseBtn.setAttribute('aria-pressed', allPaused ? 'true' : 'false');
        pauseBtn.innerHTML = allPaused ? '▶️' : '⏸️';
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
        for (const category of dashboardState) {
            const quote = (category.quotes || []).find(item => item.id === quoteId);
            if (quote) return { quote, category };
        }
        return null;
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
        if (window.ArbCyclePriorityUtils && typeof window.ArbCyclePriorityUtils.buildPreferredCycleStartSymbols === 'function') {
            return window.ArbCyclePriorityUtils.buildPreferredCycleStartSymbols(aliasRules, configuredPriority);
        }
        const symbols = new Set([canonicalSymbol]);
        for (const [alias, mapped] of Object.entries(aliasRules || {})) {
            if (mapped === canonicalSymbol) {
                symbols.add(alias);
                symbols.add(mapped);
            }
        }
        return Array.from(symbols);
    }

    function getAssetEquivalenceGroups() {
        if (window.ArbEquivalenceUtils && window.ArbEquivalenceUtils.DEFAULT_ASSET_EQUIVALENCE_GROUPS) {
            return window.ArbEquivalenceUtils.DEFAULT_ASSET_EQUIVALENCE_GROUPS;
        }
        return {
            cbBTC: ['cbBTC', 'xBTC', 'BTCB', 'BTC.b'],
            WBTC: ['WBTC', 'wBTC'],
            tBTC: ['tBTC', 'TBTC'],
            USDe: ['USDe', 'USDE'],
            USDtb: ['USDtb', 'USDTB'],
            USDT: ['USDT', 'USD₮0']
        };
    }

    function getAliasRules() {
        const groups = getAssetEquivalenceGroups();
        if (window.ArbEquivalenceUtils && typeof window.ArbEquivalenceUtils.buildAliasRulesFromGroups === 'function') {
            return window.ArbEquivalenceUtils.buildAliasRulesFromGroups(groups);
        }
        return {
            xBTC: 'cbBTC',
            BTCB: 'cbBTC',
            'BTC.b': 'cbBTC',
            wBTC: 'WBTC',
            TBTC: 'tBTC',
            USDE: 'USDe',
            USDTB: 'USDtb',
            'USD₮0': 'USDT'
        };
    }

    function buildQuoteMetaById() {
        const quoteMetaById = new Map();
        for (const category of dashboardState) {
            for (const quote of (category.quotes || [])) {
                quoteMetaById.set(quote.id, { categoryName: category.name });
            }
        }
        return quoteMetaById;
    }

    function getFixedRuleById(ruleId) {
        return FIXED_PATH_RULES.find((rule) => rule.id === ruleId) || null;
    }

    function getSpecialRuleById(ruleId) {
        return SPECIAL_ARB_RULES.find((rule) => rule.id === ruleId) || null;
    }

    function buildLiveQuoteLabel(chain, fromSymbol, toSymbol, suffix = '') {
        const chainText = formatChainLabel(chain);
        return `(${chainText}) ${fromSymbol || '--'} -> ${toSymbol || '--'}${suffix}`;
    }

    function parseArbFilterInput(inputText) {
        const tokens = String(inputText || '')
            .split(/\s+/)
            .map(token => token.trim())
            .filter(Boolean);
        return Array.from(new Set(tokens));
    }

    function getDashboardRuntimeUtils() {
        return window.DashboardRuntimeUtils || null;
    }

    function isArbPanelVisible() {
        const utils = getDashboardRuntimeUtils();
        if (utils && typeof utils.isPanelVisible === 'function') {
            return utils.isPanelVisible(arbPathWindow);
        }
        if (!arbPathWindow) return false;
        return window.getComputedStyle(arbPathWindow).display !== 'none';
    }

    function isAlertLogPanelVisible() {
        const utils = getDashboardRuntimeUtils();
        if (utils && typeof utils.isPanelVisible === 'function') {
            return utils.isPanelVisible(alertLogWindow);
        }
        if (!alertLogWindow) return false;
        return window.getComputedStyle(alertLogWindow).display !== 'none';
    }

    function hasActivePathAlertEvaluationTarget() {
        const utils = getDashboardRuntimeUtils();
        if (utils && typeof utils.hasActivePathAlertEvaluationTarget === 'function') {
            return utils.hasActivePathAlertEvaluationTarget(pathAlertConfig);
        }
        return (pathAlertConfig.alerts || []).some((alert) => (
            alert
                && alert.enabled !== false
                && alert.target
                && alert.target.type !== 'quote'
        ));
    }

    function resolveDataTerminalRecordsCacheKey() {
        const utils = getDashboardRuntimeUtils();
        if (utils && typeof utils.buildDataTerminalRecordsCacheKey === 'function') {
            return utils.buildDataTerminalRecordsCacheKey(dashboardState, quoteMarketStateRevision);
        }
        return `${quoteMarketStateRevision}|${dashboardState.length}`;
    }

    function clearDataTerminalTimer() {
        if (dataTerminalState.timer) {
            clearTimeout(dataTerminalState.timer);
            dataTerminalState.timer = null;
        }
    }

    function hasDataTerminalActiveQuery() {
        const utils = getDataTerminalUtils();
        if (!utils || typeof utils.parseDataTerminalQuery !== 'function') {
            return String(dataTerminalState.query || '').trim().length > 0;
        }
        return utils.parseDataTerminalQuery(dataTerminalState.query).length > 0;
    }

    function buildDataTerminalRecords() {
        const cacheKey = resolveDataTerminalRecordsCacheKey();
        if (dataTerminalRecordsCache && dataTerminalRecordsCacheKey === cacheKey) {
            return dataTerminalRecordsCache;
        }

        const records = [];

        for (const category of dashboardState) {
            for (const quote of getActiveQuotes(Array.isArray(category && category.quotes) ? category.quotes : [])) {
                const state = quoteMarketState.get(quote.id) || {};
                records.push({
                    categoryName: category && category.name,
                    quote,
                    fromSymbol: state.fromSymbol,
                    toSymbol: state.toSymbol,
                    lastRawPrice: state.lastRawPrice,
                    inverseRawPrice: state.inverseRawPrice,
                    cexOrderbook: state.cexOrderbook || null
                });
            }
        }

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
        if (!utils
            || typeof utils.buildDataTerminalCandidates !== 'function'
            || typeof utils.buildDataTerminalViewModel !== 'function'
            || typeof utils.buildDataTerminalPanelHtml !== 'function') {
            dataTerminalState.htmlRenderer.render(refs.content, '<div class="data-terminal-empty">数据终端模块未加载</div>');
            return;
        }

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
        if (!utils || typeof utils.buildDataTerminalShellHtml !== 'function') {
            appendAlertLogEntry('数据终端', '数据终端模块未加载');
            return;
        }

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

    function cycleContainsAnySymbols(cycle, symbols) {
        if (!cycle || !Array.isArray(cycle.legs) || !Array.isArray(symbols) || !symbols.length) return false;
        const symbolSet = new Set(symbols);
        return cycle.legs.some(leg => symbolSet.has(leg.from) || symbolSet.has(leg.to));
    }

    function cycleContainsAnyChains(cycle, chains) {
        if (!cycle || !Array.isArray(cycle.legs) || !Array.isArray(chains) || !chains.length) return false;
        const chainSet = new Set(chains);
        return cycle.legs.some(leg => chainSet.has(String(leg.chain || '')));
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
        const ruleDefault = Number(window.PathAlertRuleDefinitions && window.PathAlertRuleDefinitions.DEFAULT_FIXED_PATH_DISPLAY_MIN_PROFIT_BP);
        if (Number.isFinite(ruleDefault)) return Math.max(0, ruleDefault);
        const layoutDefault = Number(window.ArbPanelLayoutUtils && window.ArbPanelLayoutUtils.DEFAULT_DISPLAY_MIN_PROFIT_BP);
        return Number.isFinite(layoutDefault) ? Math.max(0, layoutDefault) : 0.5;
    }

    function normalizeArbDisplayMinProfitBp(value, fallback = getDefaultArbDisplayMinProfitBp()) {
        const numericValue = Number(value);
        if (Number.isFinite(numericValue)) return Math.max(0, numericValue);
        const fallbackValue = Number(fallback);
        return Number.isFinite(fallbackValue) ? Math.max(0, fallbackValue) : getDefaultArbDisplayMinProfitBp();
    }

    function getFixedRuleDisplayMinProfitBp(rule) {
        return normalizeArbDisplayMinProfitBp(rule && rule.displayMinProfitBp, getDefaultArbDisplayMinProfitBp());
    }

    function getCycleDisplayState(cycles, maxPositiveCount, expanded = false, options = null) {
        if (window.ArbPanelLayoutUtils && typeof window.ArbPanelLayoutUtils.getCycleDisplayState === 'function') {
            return window.ArbPanelLayoutUtils.getCycleDisplayState(cycles, maxPositiveCount, expanded, options);
        }
        const list = Array.isArray(cycles) ? cycles : [];
        const maxCount = Math.max(1, Number(maxPositiveCount) || 1);
        if (!list.length) {
            return {
                displayCycles: [],
                positiveCount: 0,
                hiddenPositiveCount: 0,
                canToggleExpand: false,
                expanded: false,
                displayMinProfitBp: normalizeArbDisplayMinProfitBp(
                    (typeof options === 'number' || typeof options === 'string') ? options : options && options.minProfitBp
                )
            };
        }
        const displayMinProfitBp = normalizeArbDisplayMinProfitBp(
            (typeof options === 'number' || typeof options === 'string') ? options : options && options.minProfitBp
        );
        const positiveCycles = list.filter(cycle =>
            cycle &&
            Number.isFinite(Number(cycle.profitRate)) &&
            Number(cycle.profitRate) * 10000 > displayMinProfitBp
        );
        if (positiveCycles.length) {
            const canToggleExpand = positiveCycles.length > maxCount;
            const shouldExpand = canToggleExpand && expanded;
            const displayCycles = shouldExpand ? positiveCycles : positiveCycles.slice(0, maxCount);
            return {
                displayCycles,
                positiveCount: positiveCycles.length,
                hiddenPositiveCount: Math.max(0, positiveCycles.length - displayCycles.length),
                canToggleExpand,
                expanded: shouldExpand,
                displayMinProfitBp
            };
        }
        return {
            displayCycles: [],
            positiveCount: 0,
            hiddenPositiveCount: 0,
            canToggleExpand: false,
            expanded: false,
            displayMinProfitBp
        };
    }

    function buildArbSectionToggleHtml(sectionKey, cycleDisplayState) {
        if (!cycleDisplayState || !cycleDisplayState.canToggleExpand) return '';

        const minProfitBp = normalizeArbDisplayMinProfitBp(cycleDisplayState.displayMinProfitBp);
        const buttonText = cycleDisplayState.expanded
            ? `已展开 ${cycleDisplayState.positiveCount} 条 > ${minProfitBp}bp，点击收起`
            : `还有 ${cycleDisplayState.hiddenPositiveCount} 条 > ${minProfitBp}bp 未显示，点击展开全部`;

        return `
            <button
                type="button"
                class="arb-path-expand-toggle"
                data-arb-section-key="${sectionKey}"
                aria-expanded="${cycleDisplayState.expanded ? 'true' : 'false'}"
                style="margin-top:6px;padding:0;border:none;background:none;color:#2563eb;cursor:pointer;font-size:12px;text-decoration:underline;"
            >${buttonText}</button>
        `;
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
        const entry = {
            id: opportunityId,
            cycle,
            label,
            ...meta
        };
        targetMap.set(opportunityId, entry);
        registerArbOpportunityHighlightTarget(
            highlightTargetMap,
            buildArbOpportunityHighlightTargetKeyFromCycle(cycle),
            opportunityId
        );

        return {
            label,
            cycle,
            opportunityId,
            isAlertHighlighted: isArbOpportunityHighlighted(opportunityId),
            clickable: meta.clickable !== false,
            displayMessage: typeof meta.displayMessage === 'string' ? meta.displayMessage : '',
            hideLegs: meta.hideLegs === true,
            entryType: typeof meta.entryType === 'string' ? meta.entryType : ''
        };
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

        if (window.ArbRuntimeMemoryUtils && typeof window.ArbRuntimeMemoryUtils.buildRetainedArbOpportunityStore === 'function') {
            arbOpportunityStore = window.ArbRuntimeMemoryUtils.buildRetainedArbOpportunityStore(nextOpportunityMap, retainedEntries);
            return;
        }

        const nextStore = nextOpportunityMap instanceof Map ? new Map(nextOpportunityMap) : new Map();
        for (const entry of retainedEntries) {
            if (!entry || !entry.id || nextStore.has(entry.id)) continue;
            nextStore.set(entry.id, entry);
        }
        arbOpportunityStore = nextStore;
    }

    function getPathAlertDefaultThresholdBp() {
        const fallback = 1.1;
        if (!window.PathAlertUtils || !Number.isFinite(window.PathAlertUtils.DEFAULT_PATH_ALERT_THRESHOLD_BP)) {
            return fallback;
        }
        return window.PathAlertUtils.DEFAULT_PATH_ALERT_THRESHOLD_BP;
    }

    function buildArbDetailRowsHtml(card, cardIndex) {
        const utils = getArbDetailUtils();
        if (typeof utils.buildArbDetailRowsHtml === 'function') {
            return utils.buildArbDetailRowsHtml(card, {
                cardIndex,
                buildSourceHtml: (row, options) => buildArbDetailSourceHtml(row, options)
            });
        }

        return '<div class="arb-detail-error">详情渲染模块未加载</div>';
    }

    function buildArbDetailMuteButtonHtml(cardIndex, rowIndex, quoteId) {
        if (Number(cardIndex) !== 0) return '';
        return `<button
            type="button"
            class="arb-detail-leg-mute-btn"
            data-arb-detail-leg-mute="${escapeHtml(String(quoteId || ''))}"
            data-arb-detail-card-index="${escapeHtml(String(cardIndex))}"
            data-arb-detail-row-index="${escapeHtml(String(rowIndex))}"
        >屏蔽</button>`;
    }

    function buildArbDetailSourceMetaHtml(row) {
        const dexLinkConfig = {
            chain: row && row.chain,
            fromTokenAddress: row && row.fromTokenAddress,
            toTokenAddress: row && row.toTokenAddress,
            inputAmount: row && row.inputAmount
        };
        const sourceText = escapeHtml(row && row.sourceText ? row.sourceText : 'Unknown');
        const dexButtonHtml = buildDexLinkCopyButtonHtml(
            dexLinkConfig,
            'arb-detail-dex-link',
            getDexLinkLabel(dexLinkConfig) || 'DEX'
        );
        return dexButtonHtml ? `${sourceText} · ${dexButtonHtml}` : sourceText;
    }

    function buildArbDetailSourceActionsHtml(row, options = {}) {
        const muteButtonHtml = buildArbDetailMuteButtonHtml(options.cardIndex, options.rowIndex, row && row.quoteId);
        return muteButtonHtml || '';
    }

    function buildArbDetailSourceHtml(row, options = {}) {
        const sourceMetaHtml = buildArbDetailSourceMetaHtml(row);
        const actionsHtml = buildArbDetailSourceActionsHtml(row, options);
        if (!actionsHtml) {
            return `<span class="arb-detail-leg-source-main">${sourceMetaHtml}</span>`;
        }
        return `
            <span class="arb-detail-leg-source-main">${sourceMetaHtml}</span>
            <span class="arb-detail-leg-source-actions">${actionsHtml}</span>
        `;
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
        const utils = getArbDetailUtils();
        if (typeof utils.buildArbDetailSummaryHtml === 'function') {
            return utils.buildArbDetailSummaryHtml(card, {
                index,
                bestProfitIndices,
                bestProfitRateIndices,
                formatNumber: formatDetailNumber,
                formatProfitRate: formatDetailProfitRate
            });
        }

        return '<span class="arb-detail-metric">收益 --</span>';
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
        const utils = getArbDetailUtils();
        arbDetailGrid.innerHTML = typeof utils.buildArbDetailShellHtml === 'function'
            ? utils.buildArbDetailShellHtml(arbDetailState.cards)
            : '<div class="arb-detail-error">详情渲染模块未加载</div>';
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
        if (window.PathAlertRuleDefinitions && typeof window.PathAlertRuleDefinitions.getRuleDefinitions === 'function') {
            return window.PathAlertRuleDefinitions.getRuleDefinitions(sourceType);
        }
        if (sourceType === 'fixed') return FIXED_PATH_RULES;
        if (sourceType === 'special') return SPECIAL_ARB_RULES;
        return [];
    }

    function resolveSpecialRuleAlertConfig(alert) {
        if (window.SpecialRuleAlertConfigUtils && typeof window.SpecialRuleAlertConfigUtils.normalizeSpecialRuleAlertConfig === 'function') {
            return window.SpecialRuleAlertConfigUtils.normalizeSpecialRuleAlertConfig(alert && alert.specialRuleConfig);
        }
        const source = alert && alert.specialRuleConfig && typeof alert.specialRuleConfig === 'object'
            ? alert.specialRuleConfig
            : {};
        return {
            minNetProfit: Number.isFinite(Number(source.minNetProfit)) ? Number(source.minNetProfit) : null,
            minNetProfitBp: Number.isFinite(Number(source.minNetProfitBp)) ? Number(source.minNetProfitBp) : null
        };
    }

    function splitAlertMessageLines(message) {
        return String(message || '')
            .split('\n')
            .map((line) => String(line || '').trim())
            .filter(Boolean);
    }

    function buildRuleAlertEvaluation(target, alert = null, sharedRuleSnapshot = getSharedArbRuleSnapshot()) {
        if (target.ruleKind === 'fixed') {
            const rule = getFixedRuleById(target.ruleId);
            if (!rule) return { available: false };
            const cycles = sharedRuleSnapshot && sharedRuleSnapshot.fixedByRuleId
                ? sharedRuleSnapshot.fixedByRuleId[target.ruleId]
                : null;
            const nowMs = Date.now();
            const cycle = window.ArbPanelLayoutUtils && typeof window.ArbPanelLayoutUtils.selectFirstUnmutedDisplayedCycle === 'function'
                ? window.ArbPanelLayoutUtils.selectFirstUnmutedDisplayedCycle(cycles, (candidate) => {
                    const muteTarget = candidate && Array.isArray(candidate.legs)
                        ? buildMutedPathTargetFromCycleLegs(candidate.legs)
                        : null;
                    return Boolean(muteTarget && getMutedPathTargetEntry(muteTarget, nowMs));
                })
                : (Array.isArray(cycles) && cycles.length ? cycles[0] : null);
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
        const primaryStats = best.stats && best.stats.primary ? best.stats.primary : null;
        const specialRuleConfig = resolveSpecialRuleAlertConfig(alert);
        const triggerEvaluation = window.SpecialRuleAlertConfigUtils
            && typeof window.SpecialRuleAlertConfigUtils.evaluateSpecialRuleTrigger === 'function'
            ? window.SpecialRuleAlertConfigUtils.evaluateSpecialRuleTrigger(best.stats, specialRuleConfig)
            : {
                meetsTriggerCondition: false,
                netProfit: Number(primaryStats && primaryStats.netProfit),
                minNetProfit: Number(specialRuleConfig.minNetProfit),
                netProfitBp: Number(primaryStats && primaryStats.netProfitBp),
                minNetProfitBp: Number(specialRuleConfig.minNetProfitBp)
            };
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

    function getPathAlertDefaultThresholdBp() {
        return Number(window.PathAlertUtils && window.PathAlertUtils.DEFAULT_PATH_ALERT_THRESHOLD_BP) || 1.1;
    }

    function buildQuoteAlertThresholdLine(target) {
        if (!target || target.type !== 'quote') return '--';
        const directionLabel = getQuoteAlertDirection(target) === 'inverse' ? '反向' : '正向';
        if (target.ruleKind === 'targetAbove' || target.ruleKind === 'targetBelow') {
            return `${directionLabel} · 汇率阈值 ${String(target.value != null ? target.value : '--')}`;
        }
        if (target.ruleKind === 'percentUp' || target.ruleKind === 'percentDown') {
            return `${directionLabel} · 阈值 ${String(target.value != null ? target.value : '--')}% | 基准汇率 ${String(target.basePrice != null ? target.basePrice : '--')}`;
        }
        return '--';
    }

    function getPathAlertLegPricingMode(leg) {
        if (!leg || typeof leg !== 'object') return 'raw';
        if (leg.cexLevelLabel === 'bid1') return 'cex-bid1';
        if (leg.cexLevelLabel === 'ask1') return 'cex-ask1-inverse';
        return 'raw';
    }

    function buildPathAlertDraftFromOpportunityEntry(entry) {
        if (!entry) return null;
        const preset = entry.alertPreset || { type: 'path' };
        const settings = pathAlertConfig.settings || {};
        const baseDraft = {
            id: '',
            name: '',
            enabled: true,
            thresholdBp: getPathAlertDefaultThresholdBp(),
            triggerMode: 'delayed',
            confirmDelaySec: 13,
            cooldownSec: settings.defaultCooldownSec || 180
        };

        if (preset.type === 'rule') {
            return {
                ...baseDraft,
                target: {
                    type: 'rule',
                    ruleKind: preset.ruleKind,
                    ruleId: preset.ruleId
                }
            };
        }

        const legs = (entry.cycle?.legs || [])
            .filter((leg) => !isRuleLeg(leg) && Number.isFinite(Number(leg.quoteId)))
            .map((leg) => ({
                quoteId: Number(leg.quoteId),
                direction: leg.inverse ? 'inverse' : 'forward',
                pricingMode: getPathAlertLegPricingMode(leg),
                chain: leg.chain,
                fromSymbol: leg.from,
                toSymbol: leg.to
            }));

        if (!legs.length) return null;
        return {
            ...baseDraft,
            target: {
                type: 'path',
                legs
            }
        };
    }

    function buildPathAlertDraftFromOpportunity(opportunityId) {
        const entry = arbOpportunityStore.get(opportunityId);
        return entry ? buildPathAlertDraftFromOpportunityEntry(entry) : null;
    }

    function formatPathAlertEvaluationText(evaluation) {
        if (window.PathAlertNotificationUtils && typeof window.PathAlertNotificationUtils.formatPathAlertEvaluationText === 'function') {
            return window.PathAlertNotificationUtils.formatPathAlertEvaluationText(evaluation);
        }
        if (!evaluation || evaluation.available !== true || !Number.isFinite(evaluation.profitBp)) {
            return '--';
        }
        const value = evaluation.profitBp;
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}bp`;
    }

    function getPathAlertStatusInfo(alert, runtime) {
        if (!alert || alert.enabled === false) {
            return { text: '已禁用', className: 'path-alert-status-disabled' };
        }
        if (!runtime || runtime.status === 'unavailable') {
            if (alert && alert.target && alert.target.type === 'quote') {
                return { text: '等待报价', className: 'path-alert-status-unavailable' };
            }
            return { text: '缺报价', className: 'path-alert-status-unavailable' };
        }
        if (runtime.status === 'pending_confirm') {
            return { text: '待确认', className: 'path-alert-status-pending' };
        }
        if (runtime.status === 'cooldown') {
            return { text: '冷却中', className: 'path-alert-status-cooldown' };
        }
        return { text: '', className: '' };
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
        if (window.PathAlertUtils && typeof window.PathAlertUtils.buildPathAlertSummaryLines === 'function') {
            return window.PathAlertUtils.buildPathAlertSummaryLines(alert, {
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
        return [];
    }

    function buildPathAlertSummary(alert) {
        return buildPathAlertSummaryLines(alert).join(' | ');
    }

    function buildPathAlertDisplayTitle(alert) {
        const name = String(alert && alert.name || '').trim();
        if (name) return name;
        const lines = buildPathAlertSummaryLines(alert);
        return lines[0] || (alert && alert.target && alert.target.type === 'quote' ? '交易对报警' : '未配置路径');
    }

    function renderPathAlertSummaryLinesHtml(alert) {
        const lines = buildPathAlertSummaryLines(alert);
        if (!lines.length) {
            return '<div class="path-alert-item-route-line">--</div>';
        }
        return lines.map((line) => `<div class="path-alert-item-route-line">${escapeHtml(line)}</div>`).join('');
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

    function buildPathAlertCycleSummaryLines(alert, evaluation) {
        if (evaluation && evaluation.cycle && Array.isArray(evaluation.cycle.legs)) {
            const lines = buildLegLines(evaluation.cycle.legs.filter((leg) => !isRuleLeg(leg)));
            if (lines.length) return lines;
        }
        return buildPathAlertSummaryLines(alert);
    }

    function buildPathAlertLegKey(leg) {
        const quoteId = Number(leg && leg.quoteId);
        if (!Number.isFinite(quoteId) || quoteId <= 0) return '';
        const direction = (leg && (leg.direction === 'inverse' || leg.inverse)) ? 'inverse' : 'forward';
        const pricingMode = ['raw', 'cex-bid1', 'cex-ask1-inverse'].includes(leg && leg.pricingMode)
            ? leg.pricingMode
            : 'raw';
        return `${quoteId}|${direction}|${pricingMode}`;
    }

    function buildMutedPathTargetFromCycleLegs(legs) {
        const normalizedLegs = (Array.isArray(legs) ? legs : [])
            .filter((leg) => !isRuleLeg(leg) && Number.isFinite(Number(leg && leg.quoteId)))
            .map((leg) => ({
                quoteId: Number(leg.quoteId),
                direction: leg.inverse ? 'inverse' : 'forward',
                pricingMode: getPathAlertLegPricingMode(leg),
                chain: leg.chain,
                fromSymbol: leg.from,
                toSymbol: leg.to
            }));
        if (!normalizedLegs.length) return null;
        return {
            target: {
                type: 'path',
                legs: normalizedLegs
            }
        };
    }

    function buildMutedPathTargetCandidate(alert, evaluation) {
        if (!alert || !alert.target) return null;
        if (alert.target.type === 'path') {
            return alert;
        }
        if (alert.target.type === 'rule' && alert.target.ruleKind === 'fixed' && evaluation && evaluation.cycle) {
            return buildMutedPathTargetFromCycleLegs(evaluation.cycle.legs);
        }
        return null;
    }

    function buildPathAlertCycleSummaryEntries(alert, evaluation) {
        if (evaluation && typeof evaluation.displayMessage === 'string' && evaluation.displayMessage.trim()) {
            return splitAlertMessageLines(evaluation.displayMessage).map((line) => ({ line, key: '' }));
        }
        if (evaluation && evaluation.cycle && Array.isArray(evaluation.cycle.legs)) {
            const cycleLegs = evaluation.cycle.legs.filter((leg) => !isRuleLeg(leg));
            const entries = cycleLegs.map((leg) => ({
                line: formatArbPathLegLine(leg),
                key: buildPathAlertLegKey(leg)
            }));
            if (entries.length) return entries;
        }
        return buildPathAlertSummaryLines(alert).map((line) => ({ line, key: '' }));
    }

    function buildPathAlertChangedLegLines(changedLegs, maxCount = 3) {
        return (Array.isArray(changedLegs) ? changedLegs : [])
            .slice(0, maxCount)
            .map((leg) => {
                const rateText = Number.isFinite(Number(leg && leg.rate))
                    ? ` @${Number(leg.rate).toFixed(6)}`
                    : '';
                return `${buildPathAlertLegDisplayLine(leg)}${rateText} ${leg.deltaBp >= 0 ? '+' : ''}${leg.deltaBp.toFixed(2)}bp`;
            });
    }

    function getPathAlertRealLegCount(alert, evaluation) {
        if (window.PathAlertUtils && typeof window.PathAlertUtils.countPathAlertRealLegs === 'function') {
            return window.PathAlertUtils.countPathAlertRealLegs(alert, evaluation);
        }
        if (alert && alert.target && alert.target.type === 'path' && Array.isArray(alert.target.legs)) {
            return alert.target.legs.length;
        }
        return 0;
    }

    function createDismissedTargetEntry(alert) {
        if (!window.PathAlertUtils || typeof window.PathAlertUtils.createDismissedTargetEntry !== 'function') {
            return null;
        }
        return window.PathAlertUtils.createDismissedTargetEntry(
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
        if (!alert || !window.PathAlertUtils) {
            removePathAlertById(alertId);
            return;
        }
        const entry = createDismissedTargetEntry(alert);
        if (entry && !window.PathAlertUtils.findDismissedPathAlert(pathAlertConfig.dismissedTargets, entry)) {
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
        if (window.PathAlertNotificationUtils && typeof window.PathAlertNotificationUtils.buildPathAlertNotificationTitle === 'function') {
            return window.PathAlertNotificationUtils.buildPathAlertNotificationTitle(triggeredEntries);
        }
        const list = Array.isArray(triggeredEntries) ? triggeredEntries : [];
        if (!list.length) return '路径报警';
        return list.length === 1 ? (list[0].alert?.name || '路径报警') : `${list.length} 条`;
    }

    function buildPathAlertNotificationBody(triggeredEntries) {
        if (window.PathAlertNotificationUtils && typeof window.PathAlertNotificationUtils.buildPathAlertNotificationBody === 'function') {
            return window.PathAlertNotificationUtils.buildPathAlertNotificationBody(triggeredEntries);
        }
        const list = (Array.isArray(triggeredEntries) ? triggeredEntries : []).slice(0, 3);
        return list.map((entry) => {
            const customAlertMessage = String(entry && entry.customAlertMessage || '').trim();
            if (customAlertMessage) {
                return customAlertMessage;
            }
            return [formatPathAlertEvaluationText(entry.evaluation), ...entry.summaryLines].join('\n');
        }).join('\n\n');
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

    function inferRuntimeDebugReason(previous, next) {
        if (!next || typeof next !== 'object') return 'skip';
        if (next.shouldTrigger) return 'trigger';
        const previousEligibleSince = Number(previous && previous.eligibleSince);
        const nextEligibleSince = Number(next.eligibleSince);
        const hadEligibleSince = Number.isFinite(previousEligibleSince);
        const hasEligibleSince = Number.isFinite(nextEligibleSince);
        if (!hadEligibleSince && hasEligibleSince) return 'condition_on';
        if (hadEligibleSince && !hasEligibleSince) return 'condition_off';
        if (next.status === 'cooldown') return 'cooldown_block';
        return next.status || 'idle';
    }

    function buildRuntimeDebugSnapshot(previous, next, evaluation) {
        if (!next || typeof next !== 'object') return null;
        return {
            now: Date.now(),
            status: next.shouldTrigger ? 'trigger' : (next.status || 'idle'),
            reason: inferRuntimeDebugReason(previous, next),
            eligibleSince: next.eligibleSince,
            lastTriggeredAt: next.lastTriggeredAt,
            cooldownUntil: next.cooldownUntil,
            comparison: evaluation && evaluation.debugComparison && typeof evaluation.debugComparison === 'object'
                ? { ...evaluation.debugComparison }
                : null
        };
    }

    function buildAggregatedPathAlertLog(triggeredEntries) {
        if (window.PathAlertNotificationUtils && typeof window.PathAlertNotificationUtils.buildPathAlertAggregatedLog === 'function') {
            return window.PathAlertNotificationUtils.buildPathAlertAggregatedLog(triggeredEntries);
        }
        return {
            title: '[路径报警]',
            subtitle: '',
            message: buildPathAlertNotificationBody(triggeredEntries)
        };
    }

    function buildTriggeredPathAlertEntry(alert, evaluation, changedLegs) {
        const summaryEntries = buildPathAlertCycleSummaryEntries(alert, evaluation);
        return {
            alert: {
                ...alert,
                name: buildPathAlertDisplayTitle(alert)
            },
            evaluation,
            summaryLines: summaryEntries.map((item) => item.line),
            summaryLegKeys: summaryEntries.map((item) => item.key),
            customAlertMessage: String(evaluation && evaluation.alertMessage || '').trim(),
            changedLegLines: buildPathAlertChangedLegLines(changedLegs, 3),
            changedLegs: Array.isArray(changedLegs) ? changedLegs.slice(0, 3) : [],
            realLegCount: getPathAlertRealLegCount(alert, evaluation),
            mutedTargetCandidate: buildMutedPathTargetCandidate(alert, evaluation)
        };
    }

    function sortTriggeredPathAlertEntries(entries) {
        if (window.PathAlertUtils && typeof window.PathAlertUtils.sortTriggeredPathAlerts === 'function') {
            return window.PathAlertUtils.sortTriggeredPathAlerts(entries).map((entry) => ({
                ...entry,
                realLegCount: entry.realLegCount ?? getPathAlertRealLegCount(entry.alert, entry.evaluation)
            }));
        }
        return [...entries].sort((left, right) => {
            const legDiff = left.realLegCount - right.realLegCount;
            if (legDiff !== 0) return legDiff;
            return Number(right.evaluation && right.evaluation.profitBp) - Number(left.evaluation && left.evaluation.profitBp);
        });
    }

    function evaluatePathAlertsOnce() {
        if (!window.PathAlertUtils) return;
        pruneMutedPathTargetsInPlace(Date.now());
        const sharedRuleSnapshot = getSharedArbRuleSnapshot();
        const context = buildPathAlertEvaluationContext(sharedRuleSnapshot);
        const allLegSnapshots = typeof window.PathAlertUtils.buildAllLegSnapshots === 'function'
            ? window.PathAlertUtils.buildAllLegSnapshots(sharedRuleSnapshot.allQuotes || [], quoteMarketState)
            : [];
        const activeIds = new Set();
        const nowMs = Date.now();
        const logTriggeredEntries = [];
        const remoteTriggeredEntries = [];
        let shouldRefreshArbPanelHighlights = false;

        for (const alert of (pathAlertConfig.alerts || [])) {
            activeIds.add(alert.id);
            if (alert && alert.target && alert.target.type === 'quote') {
                continue;
            }
            const runtimeAlert = window.PathAlertUtils.buildEffectiveRuntimeAlert(alert, { forceImmediate: forceImmediateAlerts });
            const evaluation = window.PathAlertUtils.evaluatePathAlert(alert, context);
            const previous = pathAlertRuntimeState.get(alert.id) || null;
            const next = window.PathAlertUtils.advancePathAlertRuntime(runtimeAlert, previous, evaluation, nowMs);
            const snapshotState = typeof window.PathAlertUtils.resolvePathAlertSnapshotState === 'function'
                ? window.PathAlertUtils.resolvePathAlertSnapshotState(runtimeAlert, previous, next, evaluation, allLegSnapshots)
                : { currentSnapshots: [], baselineSnapshots: [] };
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
                const changedLegs = window.PathAlertUtils.buildChangedLegs(
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

        for (const alertId of Array.from(pathAlertRuntimeState.keys())) {
            if (!activeIds.has(alertId)) {
                pathAlertRuntimeState.delete(alertId);
            }
        }

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
        const normalized = window.PathAlertUtils
            ? window.PathAlertUtils.normalizeAlertConfig(pathAlertConfig)
            : pathAlertConfig;
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
        if (window.PathAlertPageUtils && typeof window.PathAlertPageUtils.buildPathAlertsPageHref === 'function') {
            return window.PathAlertPageUtils.buildPathAlertsPageHref(options);
        }
        return '/path-alerts';
    }

    function openPathAlertsManagementPage(options = {}) {
        const href = buildPathAlertsManagementHref(options);
        window.open(href, '_blank', 'noopener');
    }

    async function loadPathAlertConfig(options = {}) {
        if (!window.PathAlertUtils) return;
        const fallbackToDefault = options.fallbackToDefault !== false;
        try {
            const response = await fetch(`${BACKEND_URL}/api/get-alert-config`);
            if (!response.ok) throw new Error('获取路径报警配置失败');
            const data = await response.json();
            pathAlertConfig = window.PathAlertUtils.normalizeAlertConfig(data);
        } catch (error) {
            if (!fallbackToDefault) {
                throw error;
            }
            console.warn('加载路径报警配置失败:', error);
            pathAlertConfig = window.PathAlertUtils.normalizeAlertConfig();
        }
    }

    function buildPathAlertMetaText(alert) {
        const triggerText = alert.triggerMode === 'delayed'
            ? `延迟 ${String(alert.confirmDelaySec)}s`
            : '立即';
        const cooldownText = `冷却 ${String(alert.cooldownSec)}s`;
        if (alert && alert.target && alert.target.type === 'quote') {
            return `报价 | ${escapeHtml(String(alert.target.value != null ? alert.target.value : '--'))} | ${triggerText} | ${cooldownText}`;
        }
        if (alert && alert.target && alert.target.type === 'rule' && alert.target.ruleKind === 'special') {
            const specialRuleConfig = resolveSpecialRuleAlertConfig(alert);
            return [
                `净收益 > ${escapeHtml(String(specialRuleConfig.minNetProfit != null ? specialRuleConfig.minNetProfit : '--'))}`,
                `净收益率 > ${escapeHtml(String(specialRuleConfig.minNetProfitBp != null ? specialRuleConfig.minNetProfitBp : '--'))}bp`,
                triggerText,
                cooldownText
            ].join(' | ');
        }
        return `阈值 ${escapeHtml(String(alert.thresholdBp))}bp | ${triggerText} | ${cooldownText}`;
    }

    function renderPathAlertPanel() {
        if (!pathAlertContent) return;
        if (pathAlertPanelHidden) return;
        const alerts = Array.isArray(pathAlertConfig.alerts) ? pathAlertConfig.alerts : [];
        const settings = pathAlertConfig.settings || {};
        const dismissedCount = Array.isArray(pathAlertConfig.dismissedTargets) ? pathAlertConfig.dismissedTargets.length : 0;
        const toolbar = `
            <div class="path-alert-toolbar">
                <div class="path-alert-toolbar-meta">
                    <label class="path-alert-toolbar-toggle">
                        <input type="checkbox" data-path-alert-global-toggle="localSoundEnabled" ${settings.localSoundEnabled !== false ? 'checked' : ''}>
                        <span>音效</span>
                    </label>
                    <label class="path-alert-toolbar-toggle">
                        <input type="checkbox" data-path-alert-global-toggle="webhookEnabled" ${settings.webhookEnabled === true ? 'checked' : ''}>
                        <span>远程</span>
                    </label>
                    <label class="path-alert-toolbar-toggle">
                        <input type="checkbox" data-path-alert-force-immediate ${forceImmediateAlerts ? 'checked' : ''}>
                        <span>全部立即</span>
                    </label>
                    <div class="path-alert-toolbar-cycle">周期 ${settings.pathAlertEvalIntervalMs}ms</div>
                    <div class="path-alert-toolbar-cycle">已忽略 ${dismissedCount} 条</div>
                </div>
            </div>
        `;
        if (!alerts.length) {
            pathAlertPanelHtmlRenderer.render(pathAlertContent, `${toolbar}<div class="path-alert-empty">暂无路径报警</div>`);
            return;
        }

        const alertItems = alerts
            .map((alert) => {
                const runtime = pathAlertRuntimeState.get(alert.id) || null;
                const evaluation = runtime && runtime.evaluation ? runtime.evaluation : null;
                const statusInfo = getPathAlertStatusInfo(alert, runtime);
                return {
                    alert,
                    runtime,
                    evaluation,
                    statusInfo
                };
            })
            .filter(({ statusInfo }) => Boolean(
                statusInfo
                && statusInfo.text
                && statusInfo.className !== 'path-alert-status-unavailable'
            ));

        if (!alertItems.length) {
            pathAlertPanelHtmlRenderer.render(pathAlertContent, `${toolbar}<div class="path-alert-empty">暂无需要关注的路径报警</div>`);
            return;
        }

        const items = alertItems.map(({ alert, runtime, evaluation, statusInfo }) => {
            const statusTagHtml = statusInfo.text
                ? `<span class="path-alert-status-tag ${statusInfo.className}">${statusInfo.text}</span>`
                : '';
            const lastTriggeredText = runtime && runtime.lastTriggeredAt
                ? new Date(runtime.lastTriggeredAt).toLocaleTimeString()
                : '--';
            const editHref = buildPathAlertsManagementHref({
                mode: 'edit',
                alertId: alert.id
            });
            return `
                <div class="path-alert-item">
                    <div class="path-alert-item-head">
                        <div>
                            <div class="path-alert-item-title">${escapeHtml(buildPathAlertDisplayTitle(alert))}</div>
                            <div class="path-alert-item-route">${renderPathAlertSummaryLinesHtml(alert)}</div>
                            <div class="path-alert-item-meta">${buildPathAlertMetaText(alert)}</div>
                        </div>
                        <div class="path-alert-item-actions">
                            <a
                                class="path-alert-item-link"
                                href="${escapeHtml(editHref)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                data-path-alert-edit-link="${escapeHtml(alert.id)}"
                            >编辑</a>
                            <button type="button" data-path-alert-delete="${escapeHtml(alert.id)}">删除</button>
                            <button type="button" data-path-alert-dismiss-delete="${escapeHtml(alert.id)}">标记并删除</button>
                        </div>
                    </div>
                    <div class="path-alert-status-row">
                        ${statusTagHtml}
                        <span class="path-alert-profit">${formatPathAlertEvaluationText(evaluation)}</span>
                    </div>
                    <div class="path-alert-item-meta">上次报警: ${escapeHtml(lastTriggeredText)}</div>
                </div>
            `;
        }).join('');

        pathAlertPanelHtmlRenderer.render(pathAlertContent, `${toolbar}<div class="path-alert-list">${items}</div>`);
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
                window.PathAlertUtils && typeof window.PathAlertUtils.buildChangedLegs === 'function'
                    ? window.PathAlertUtils.buildChangedLegs(
                        Array.isArray(runtime.currentLegSnapshots) ? runtime.currentLegSnapshots : [],
                        Array.isArray(runtime.baselineLegSnapshots) ? runtime.baselineLegSnapshots : [],
                        Number.isFinite(changedLegMinBp) ? changedLegMinBp : 0.1
                    )
                    : []
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

    function selectArbOpportunityEntriesByCycles(entries, cycles) {
        const cycleSet = new Set(Array.isArray(cycles) ? cycles : []);
        return Array.isArray(entries)
            ? entries.filter((entry) => entry && entry.cycle && cycleSet.has(entry.cycle))
            : [];
    }

    function getQuotePriceWatchItems() {
        if (window.ArbPathConfigUtils && typeof window.ArbPathConfigUtils.getQuotePriceWatchItems === 'function') {
            return window.ArbPathConfigUtils.getQuotePriceWatchItems(ARB_PATH_CONFIG);
        }
        const items = Array.isArray(ARB_PATH_CONFIG && ARB_PATH_CONFIG.watchItems)
            ? ARB_PATH_CONFIG.watchItems
            : [];
        return items
            .filter((item) => item && item.type === 'quote-price')
            .map((item) => ({
                title: String(item.title || '').trim(),
                type: 'quote-price',
                quoteId: Number(item.quoteId),
                direction: item.direction === 'inverse' ? 'inverse' : 'forward'
            }))
            .filter((item) => item.title && Number.isFinite(item.quoteId) && item.quoteId > 0);
    }

    function resolveQuotePriceWatchValue(item, state) {
        if (window.ArbPathConfigUtils && typeof window.ArbPathConfigUtils.resolveQuotePriceValue === 'function') {
            return window.ArbPathConfigUtils.resolveQuotePriceValue(item, state);
        }
        if (!state || typeof state !== 'object') return null;
        const value = item && item.direction === 'inverse'
            ? Number(state.inverseRawPrice)
            : Number(state.lastRawPrice);
        return Number.isFinite(value) ? value : null;
    }

    function buildQuotePriceWatchEntry(item) {
        const quote = findDashboardQuoteById(item.quoteId);
        const state = quote ? quoteMarketState.get(Number(quote.id)) || {} : {};
        const value = resolveQuotePriceWatchValue(item, state);
        const isPaused = quote ? isQuotePaused(quote) : false;
        const statusText = !quote || value == null
            ? '等待报价'
            : isPaused
                ? '报价暂停'
                : '';
        const pairLabel = quote
            ? buildQuoteAlertDisplayLabel(quote, state, item.direction)
            : `报价 #${String(item.quoteId)}`;
        const chainLabel = quote ? formatChainLabel(quote.chain) : '未知链';
        return {
            entryType: 'quote-price',
            title: item.title,
            priceText: value == null ? '--' : String(formatDetailNumber(value, 8)),
            metaText: [chainLabel, pairLabel].filter(Boolean).join(' · '),
            statusText,
            muted: Boolean(statusText)
        };
    }

    function buildQuotePriceWatchEntries() {
        return getQuotePriceWatchItems()
            .map(buildQuotePriceWatchEntry)
            .filter(Boolean);
    }

    function buildQuotePriceWatchSection() {
        return {
            title: '关注列表',
            opportunities: buildQuotePriceWatchEntries(),
            emptyText: '暂无关注价格'
        };
    }

    function buildArbPanelData() {
        if (!window.ArbPaths) {
            return { error: '路径模块未加载' };
        }
        if (!window.ArbPanelRenderer || typeof window.ArbPanelRenderer.renderArbGrid !== 'function') {
            return { error: '路径渲染模块未加载' };
        }
        const targetNames = ['WBTC监控', 'LBTC监控', 'TBTC监控'];
        const targetCategories = dashboardState.filter(c => targetNames.includes(c.name));
        if (!targetCategories.length) {
            return { error: '暂无可用路径' };
        }

        const sharedRuleSnapshot = getSharedArbRuleSnapshot();
        const topologyCache = getArbPathTopologyCache();
        const templateUtils = getArbPathTemplateCacheUtils();
        const ruleEdges = topologyCache && Array.isArray(topologyCache.ruleEdges)
            ? topologyCache.ruleEdges
            : sharedRuleSnapshot.ruleEdges;
        const nextOpportunityMap = new Map();
        const nextOpportunityIdsByTargetKey = new Map();

        const fixedSections = sharedRuleSnapshot.fixedResults
                .map(({ rule, cycles }) => {
                    const displayMinProfitBp = getFixedRuleDisplayMinProfitBp(rule);
                    const displayCycles = window.ArbPanelLayoutUtils && typeof window.ArbPanelLayoutUtils.selectCyclesAboveDisplayThreshold === 'function'
                        ? window.ArbPanelLayoutUtils.selectCyclesAboveDisplayThreshold(cycles, displayMinProfitBp)
                        : (Array.isArray(cycles) ? cycles.filter((cycle) => cycle && Number(cycle.profitRate) * 10000 > displayMinProfitBp) : []);
                    const opportunities = displayCycles
                        .map((cycle, index, items) => createArbOpportunityEntry(
                            nextOpportunityMap,
                            nextOpportunityIdsByTargetKey,
                            cycle,
                            items.length > 1 ? `机会 ${index + 1}` : '',
                            { section: `fixed:${rule?.id || ''}`, alertPreset: { type: 'path' } }
                        ))
                        .filter(Boolean);
                    return {
                        title: String(rule?.title || '固定路径'),
                        opportunities,
                        emptyText: `无收益率 > ${displayMinProfitBp}bp`
                    };
                });
        const specialOpportunities = sharedRuleSnapshot.specialResults
            .flatMap(({ opportunities }) => Array.isArray(opportunities) ? opportunities : []);
        const specialEntries = specialOpportunities
            .map((opportunity) => createArbOpportunityEntry(
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
            ))
            .filter(Boolean);
        const specialEntriesByLabel = new Map(
            specialEntries
                .filter((entry) => entry && typeof entry.label === 'string' && entry.label.trim())
                .map((entry) => [entry.label.trim(), entry])
        );
        const specialSections = SPECIAL_ARB_RULES
            .filter((rule) => rule && typeof rule.title === 'string' && rule.title.trim())
            .map((rule) => {
                const title = rule.title.trim();
                const entry = specialEntriesByLabel.get(title);
                const opportunity = entry && entry.cycle && entry.cycle.profitRate > 0
                    ? { ...entry, label: '' }
                    : null;
                return {
                    title,
                    sectionType: 'special-rule',
                    titleProfitRate: opportunity && opportunity.cycle ? opportunity.cycle.profitRate : null,
                    opportunities: opportunity ? [opportunity] : [],
                    emptyText: '无收益率'
                };
            });

        const categorySections = [];
        let lbtcSection = null;
        for (const category of targetCategories) {
            const sectionKey = buildArbSectionKey('category', category.id || category.name);
            const cachedTemplates = topologyCache
                ? topologyCache.categoryTemplatesBySectionKey.get(sectionKey) || []
                : [];
            const cycles = cachedTemplates.length && templateUtils
                ? filterMutedArbCycles(cachedTemplates
                    .map((template) => templateUtils.evaluateCycleTemplate(template, quoteMarketState))
                    .filter(Boolean)
                    .sort((left, right) => Number(right.profitRate) - Number(left.profitRate)))
                : window.ArbPaths.findTopCycles(
                    buildVisibleArbEdges(
                        getActiveQuotes(Array.isArray(category.quotes) ? category.quotes : []),
                    ).concat(ruleEdges),
                    {
                        maxDepth: 3,
                        limit: Number.MAX_SAFE_INTEGER,
                        acceptCycle: window.ArbPaths.isMeaningfulPath,
                        preferredStartSymbols: buildPreferredCycleStartSymbols(sharedRuleSnapshot.aliasRules, 'cbBTC')
                    }
                );
            const cycleDisplayState = getCycleDisplayState(cycles, 4, arbExpandedSections.has(sectionKey));
            const displayEntries = window.ArbPanelLayoutUtils && typeof window.ArbPanelLayoutUtils.mapEntriesForDisplayCycles === 'function'
                ? window.ArbPanelLayoutUtils.mapEntriesForDisplayCycles(cycles, cycleDisplayState.displayCycles, (cycle, index) => createArbOpportunityEntry(
                    nextOpportunityMap,
                    nextOpportunityIdsByTargetKey,
                    cycle,
                    `机会 ${index + 1}`,
                    { section: category.name, alertPreset: { type: 'path' } }
                ))
                : cycleDisplayState.displayCycles
                    .map((cycle, index) => createArbOpportunityEntry(
                        nextOpportunityMap,
                        nextOpportunityIdsByTargetKey,
                        cycle,
                        `机会 ${index + 1}`,
                        { section: category.name, alertPreset: { type: 'path' } }
                    ))
                    .filter(Boolean);
            const footerHtml = buildArbSectionToggleHtml(sectionKey, cycleDisplayState);
            const sectionDef = {
                title: category.name,
                opportunities: displayEntries,
                footerHtml
            };
            if (category.name === 'LBTC监控') {
                lbtcSection = sectionDef;
            } else {
                categorySections.push(sectionDef);
            }
        }

        const globalSectionKey = buildArbSectionKey('global', 'all');
        const globalCycles = topologyCache && templateUtils
            ? filterMutedArbCycles(topologyCache.globalTemplates
                .map((template) => templateUtils.evaluateCycleTemplate(template, quoteMarketState))
                .filter(Boolean)
                .sort((left, right) => Number(right.profitRate) - Number(left.profitRate)))
            : (() => {
                const globalSourceCategories = window.ArbPanelLayoutUtils && typeof window.ArbPanelLayoutUtils.resolveItemsBySelectors === 'function'
                    ? window.ArbPanelLayoutUtils.resolveItemsBySelectors(dashboardState, GLOBAL_PATH_SOURCE_SELECTORS)
                    : dashboardState.slice(0, 4);
                const globalSourceQuotes = getActiveQuotes(globalSourceCategories.flatMap((category) => Array.isArray(category && category.quotes) ? category.quotes : []));
                const globalEdges = buildVisibleArbEdges(globalSourceQuotes);
                return window.ArbPaths.findTopCycles(globalEdges.concat(ruleEdges), {
                    maxDepth: 3,
                    limit: Number.MAX_SAFE_INTEGER,
                    acceptCycle: window.ArbPaths.isMeaningfulPath,
                    preferredStartSymbols: buildPreferredCycleStartSymbols(sharedRuleSnapshot.aliasRules, 'cbBTC')
                });
            })();
        const excludedSymbols = parseArbFilterInput(arbGlobalExcludedSymbolsInput);
        const excludedChains = Array.from(new Set(
            parseArbFilterInput(arbGlobalExcludedChainsInput)
                .map(normalizeArbChainFilterToken)
                .filter(Boolean)
        ));
        const includedSymbols = parseArbFilterInput(arbGlobalIncludedSymbolsInput);
        const twoLegOnlyCycles = arbGlobalTwoLegOnly
            ? globalCycles.filter((cycle) => {
                const cycleLegs = Array.isArray(cycle && cycle.legs) ? cycle.legs.filter((leg) => !isRuleLeg(leg)) : [];
                return cycleLegs.length === 2;
            })
            : globalCycles;
        const hasGlobalFilter = excludedSymbols.length || excludedChains.length || includedSymbols.length;
        const filteredGlobalCycles = hasGlobalFilter
            ? twoLegOnlyCycles.filter(cycle =>
                (!includedSymbols.length || cycleContainsAnySymbols(cycle, includedSymbols)) &&
                !cycleContainsAnySymbols(cycle, excludedSymbols) &&
                !cycleContainsAnyChains(cycle, excludedChains)
            )
            : twoLegOnlyCycles;
        updateGlobalArbFilterBar();
        const globalCycleDisplayState = getCycleDisplayState(filteredGlobalCycles, 8, arbExpandedSections.has(globalSectionKey));
        const globalEntries = window.ArbPanelLayoutUtils && typeof window.ArbPanelLayoutUtils.mapEntriesForDisplayCycles === 'function'
            ? window.ArbPanelLayoutUtils.mapEntriesForDisplayCycles(globalCycles, globalCycleDisplayState.displayCycles, (cycle, index) => createArbOpportunityEntry(
                nextOpportunityMap,
                nextOpportunityIdsByTargetKey,
                cycle,
                `机会 ${index + 1}`,
                { section: '全局路径', alertPreset: { type: 'path' } }
            ))
            : globalCycleDisplayState.displayCycles
                .map((cycle, index) => createArbOpportunityEntry(
                    nextOpportunityMap,
                    nextOpportunityIdsByTargetKey,
                    cycle,
                    `机会 ${index + 1}`,
                    { section: '全局路径', alertPreset: { type: 'path' } }
                ))
                .filter(Boolean);
        const globalFooterHtml = buildArbSectionToggleHtml(globalSectionKey, globalCycleDisplayState);
        const globalEmptyText = hasGlobalFilter ? '过滤后暂无路径' : '等待数据...';
        const fixedColumns = window.ArbPanelLayoutUtils && typeof window.ArbPanelLayoutUtils.splitSectionsBySectionCount === 'function'
            ? window.ArbPanelLayoutUtils.splitSectionsBySectionCount(fixedSections, 6, 2)
            : [fixedSections, []];
        const wbtcSection = categorySections.find((section) => section && section.title === 'WBTC监控') || { title: 'WBTC监控', opportunities: [], emptyText: '等待数据...' };
        const tbtcSection = categorySections.find((section) => section && section.title === 'TBTC监控') || { title: 'TBTC监控', opportunities: [], emptyText: '等待数据...' };
        const columns = [
            fixedColumns[0] || [],
            fixedColumns[1] || [],
            specialSections,
            [buildQuotePriceWatchSection()],
            [{
                title: '全局路径',
                opportunities: globalEntries,
                footerHtml: globalFooterHtml,
                emptyText: globalEmptyText
            }]
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

        const nextArbPanelHtml = window.ArbPanelRenderer.renderArbGrid({
            columns,
            isMeaningfulPath: cycle => cycle && window.ArbPaths.isMeaningfulPath(cycle.legs),
            shouldIncludeLeg: leg => !isRuleLeg(leg),
            formatChainLabel,
            formatLegLine: formatArbPathLegLine,
            formatProfit: profitRate => window.ArbPaths.formatProfitWanfen(profitRate)
        });
        arbPanelHtmlRenderer.render(arbPathContent, nextArbPanelHtml);
    }

    async function getEvmMetadata(chain, tokenAddress, signal) {
        const cacheKey = `${chain}-${tokenAddress}`;
        if (globalSymbolCache.has(cacheKey) && globalSymbolCache.get(cacheKey).decimals !== undefined) {
            return globalSymbolCache.get(cacheKey);
        }
        const response = await fetch(`${BACKEND_URL}/api/get-evm-meta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chain, tokenAddress }),
            signal
        });
        if (!response.ok) throw new Error('Metadata fetch failed');
        const meta = await response.json();
        
        globalSymbolCache.set(cacheKey, meta);
        return meta;
    }

    async function get0xQuote(quote, signal) {
        const response = await fetch(`${BACKEND_URL}/api/get-0x-quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...quote }), 
            signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '0x API Request Failed');
        
        return {
            symbols: { from: data.fromSymbol, to: data.toSymbol },
            finalAmountOut: data.amountOut,
            rawPrice: data.raw_price,
            usedSource: '0x', 
            resultText: `${data.fromSymbol} ≈ ${data.amountOut.toFixed(6)} ${data.toSymbol}`
        };
    }

    async function getLifiQuote(quote, signal) {
        const response = await fetch(`${BACKEND_URL}/api/get-lifi-quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...quote }),
            signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'LI.FI API Request Failed');

        return {
            symbols: { from: data.fromSymbol, to: data.toSymbol },
            finalAmountOut: data.amountOut,
            rawPrice: data.raw_price,
            usedSource: 'LI.FI',
            fromChain: data.fromChain,
            toChain: data.toChain,
            isCrossChain: data.isCrossChain === true,
            resultText: `${data.fromSymbol} ≈ ${data.amountOut.toFixed(6)} ${data.toSymbol}`
        };
    }

    async function getEkuboQuote(quote, signal) {
        const response = await fetch(`${BACKEND_URL}/api/get-ekubo-quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...quote }),
            signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Ekubo API Request Failed');

        return {
            symbols: { from: data.fromSymbol, to: data.toSymbol },
            finalAmountOut: data.amountOut,
            rawPrice: data.raw_price,
            usedSource: 'Ekubo',
            resultText: `${data.fromSymbol} ≈ ${data.amountOut.toFixed(6)} ${data.toSymbol}`
        };
    }

    async function getJupiterQuote(quote, signal) {
        const response = await fetch(`${BACKEND_URL}/api/get-jupiter-quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...quote }),
            signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Jupiter API Request Failed');

        return {
            symbols: { from: data.fromSymbol, to: data.toSymbol },
            finalAmountOut: data.amountOut,
            rawPrice: data.raw_price,
            usedSource: 'Jupiter',
            resultText: `${data.fromSymbol} ≈ ${data.amountOut.toFixed(6)} ${data.toSymbol}`
        };
    }

    async function getVeloraQuote(quote, signal) {
        const response = await fetch(`${BACKEND_URL}/api/get-velora-quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...quote }),
            signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Velora API Request Failed');

        return {
            symbols: { from: data.fromSymbol, to: data.toSymbol },
            finalAmountOut: data.amountOut,
            rawPrice: data.raw_price,
            usedSource: 'Velora',
            resultText: `${data.fromSymbol} ≈ ${data.amountOut.toFixed(6)} ${data.toSymbol}`
        };
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

        const cexOrderbook = {
            bestBidPrice: data.bestBidPrice,
            bestBidSize: data.bestBidSize,
            bestAskPrice: data.bestAskPrice,
            bestAskSize: data.bestAskSize,
            bidsTop5: data.bidsTop5,
            asksTop5: data.asksTop5,
            bidsTopDepth: data.bidsTopDepth,
            asksTopDepth: data.asksTopDepth,
            feeRate: data.feeRate
        };

        return {
            symbols: { from: data.fromSymbol, to: data.toSymbol },
            finalAmountOut: data.amountOut,
            rawPrice: data.raw_price,
            usedSource: options.source,
            resultText: buildCexOrderbookSummary(quote.symbol, cexOrderbook),
            cexOrderbook
        };
    }

    async function getBybitQuote(quote, signal) {
        return getCexOrderbookQuote(quote, signal, {
            endpoint: '/api/get-bybit-quote',
            source: 'Bybit'
        });
    }

    async function getBinanceQuote(quote, signal) {
        return getCexOrderbookQuote(quote, signal, {
            endpoint: '/api/get-binance-quote',
            source: 'Binance'
        });
    }

    async function apiGetQuote(quote, signal, targetSource) {
        let result = { resultText: '', rawPrice: 0, finalAmountOut: 0, symbols: {from:null, to:null}, usedSource: '' };

        try {
            if (targetSource === '0x') {
                 result = await get0xQuote(quote, signal);
            } else if (targetSource === 'Velora') {
                result = await getVeloraQuote(quote, signal);
            } else if (targetSource === 'LI.FI') {
                result = await getLifiQuote(quote, signal);
            } else if (targetSource === 'Ekubo') {
                result = await getEkuboQuote(quote, signal);
            } else if (targetSource === 'Jupiter') {
                result = await getJupiterQuote(quote, signal);
            } else if (targetSource === 'Bybit') {
                result = await getBybitQuote(quote, signal);
            } else if (targetSource === 'Binance') {
                result = await getBinanceQuote(quote, signal);
            } else {
                const amountToFetch = quote.amount || 1;
                const endpoint = quote.chain === 'sui' ? 'get-cetus-quote' : 'get-kyber-quote';
                const response = await fetch(`${BACKEND_URL}/api/${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...quote, amount: amountToFetch }),
                    signal
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'API Request Failed');
                
                result.symbols = { from: data.fromSymbol, to: data.toSymbol };
                result.finalAmountOut = data.amountOut;
                result.rawPrice = data.raw_price;
                result.usedSource = data.source || (quote.chain === 'sui' ? 'Cetus' : 'Unknown');
                result.resultText = `${data.fromSymbol} ≈ ${result.finalAmountOut.toFixed(6)} ${data.toSymbol}`;
            }
        } catch (e) {
            throw e;
        }

        return result;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function buildQuoteStrategy(quote) {
        if (isCrossChainQuote(quote)) return ['LI.FI'];
        if (isEvmChain(quote.chain)) {
            const pref = quote.preferredSource || 'Kyber';
            if (pref === 'Auto') {
                return ['Kyber', '0x', 'Kyber'];
            }
            if (pref === '0x') {
                return ['0x', '0x'];
            }
            if (pref === 'Velora') {
                return ['Velora', 'Velora'];
            }
            if (pref === 'LI.FI') {
                return ['LI.FI', 'LI.FI'];
            }
            return ['Kyber', 'Kyber'];
        }

        if (quote.chain === 'sui') return ['Cetus'];
        if (quote.chain === 'solana') return ['Jupiter'];
        if (quote.chain === 'starknet') return ['Ekubo'];
        if (isCexOrderbookChain(quote.chain)) {
            return [String(quote.chain).trim().toLowerCase() === 'binance' ? 'Binance' : 'Bybit'];
        }
        return [];
    }

    async function fetchQuoteByStrategy(quote, options = {}) {
        const signal = options.signal;
        const beforeSourceAttempt = typeof options.beforeSourceAttempt === 'function'
            ? options.beforeSourceAttempt
            : null;
        const isInverseFetch = Boolean(options.isInverseFetch);
        const amountOverride = Number(options.amount);
        const requestedAmount = Number.isFinite(amountOverride) && amountOverride > 0
            ? amountOverride
            : (quote.amount || 1);
        const requestChannelId = typeof options.requestChannelId === 'string' && options.requestChannelId.trim()
            ? options.requestChannelId.trim()
            : getEffectiveRequestChannelIdForQuote(quote);
        const requestQuote = isInverseFetch
            ? { ...quote, fromToken: quote.toToken, toToken: quote.fromToken, amount: requestedAmount, requestChannelId }
            : { ...quote, amount: requestedAmount, requestChannelId };
        const strategy = buildQuoteStrategy(quote);
        let fetchError = null;
        let successSource = null;
        let data = null;

        for (const source of strategy) {
            try {
                if (source === 'Kyber' && !isKyberSupported(quote.chain)) continue;
                if (source === '0x' && !is0xSupported(quote.chain)) continue;

                if (beforeSourceAttempt) {
                    await beforeSourceAttempt(source, requestQuote);
                }

                if (!options.skipDelay && source === '0x' && strategy[0] !== '0x') {
                    await sleep(600);
                }

                recordQuoteSourceBudgetTimestamp(source);
                data = await apiGetQuote(requestQuote, signal, source);
                if (data) {
                    successSource = source;
                    if (!isInverseFetch && quote.preferredSource === 'Auto' && source !== 'Kyber') {
                        data.usedSource = `${source} (Auto Fallback)`;
                    }
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
                    const inverseState = {
                        ...previousState,
                        inverseRawPrice: data.rawPrice,
                        inverseTotalAmountOut: data.finalAmountOut,
                        inverseFromSymbol: data.symbols.from,
                        inverseToSymbol: data.symbols.to
                    };
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

                const newState = {
                    ...previousState,
                    fromSymbol: data.symbols.from,
                    toSymbol: data.symbols.to,
                    lastResultText: data.resultText,
                    lastRawPrice: data.rawPrice,
                    lastTotalAmountOut: data.finalAmountOut,
                    cexOrderbook: data.cexOrderbook || null,
                    usedSource: data.usedSource,
                    usedSourceReal: successSource
                };

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
                    inverseEl.title = `详细错误: ${error.message}`;
                }
            } else {
                let displayMsg = error.message;
                if (displayMsg.includes("ENOTFOUND")) displayMsg = "网络连接失败";
                
                if (displayMsg.includes("ESTIMATED_LOSS_GREATER_THAN_MAX_IMPACT")) {
                    displayMsg = "流动性不足 (滑点过高)";
                }
                if (displayMsg.includes("Liquidity unavailable") || displayMsg.includes("Liquidity Unavailable")) {
                    displayMsg = "流动性不足 (0x)";
                }
                if (displayMsg.includes("INSUFFICIENT_ASSET_LIQUIDITY") || displayMsg.includes("Asset Liquidity")) {
                    displayMsg = "资产流动性不足 (0x)";
                }
                
                if (displayMsg.includes("429")) displayMsg = "请求过快 (Rate Limit)";
                if (displayMsg.length > 40) displayMsg = displayMsg.substring(0, 40) + '...';

                quoteTextEl.textContent = `❌ ${displayMsg}`;
                quoteTextWrapperEl.classList.remove('loading-text');
                quoteDataEl.classList.add('error');
                quoteDataEl.title = `详细错误: ${error.message}`;
            }
        } finally {
            if (activeFetchControllers.get(quote.id) === controller) {
                activeFetchControllers.delete(quote.id);
            }
        }
    }

    function extractPriceFromText(text) {
        if (!text) return null;
        const delimiterMatch = text.match(/(?:≈|=|:)\s*([-+]?\d*\.?\d+(?:e[+-]?\d+)?)/i);
        if (delimiterMatch) return Number(delimiterMatch[1]);
        const numberMatch = text.match(/[-+]?\d*\.?\d+(?:e[+-]?\d+)?/i);
        return numberMatch ? Number(numberMatch[0]) : null;
    }

    async function copyTextToClipboard(text) {
        try {
            if (window.CopyUtils && typeof window.CopyUtils.copyTextToClipboard === 'function') {
                await window.CopyUtils.copyTextToClipboard(text);
                return;
            }
        } catch (error) {
            console.warn('Clipboard write failed', error);
            throw error;
        }
        throw new Error('Clipboard unavailable');
    }

    async function copyDexLinkFromElement(targetEl) {
        if (!targetEl) return false;
        const utils = getDexLinkUtils();
        if (!utils || typeof utils.buildDexLink !== 'function') {
            showCopyToast('DEX 链接模块未加载');
            return false;
        }

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
        const target = event && event.target;
        if (target instanceof Element) {
            return target;
        }
        if (target && target.parentElement instanceof Element) {
            return target.parentElement;
        }
        return null;
    }

    function closestEventTarget(event, selector) {
        const target = resolveEventTargetElement(event);
        return target && typeof target.closest === 'function'
            ? target.closest(selector)
            : null;
    }

    function copyPriceFromText(text) {
        const price = extractPriceFromText(text);
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
        return target && target.direction === 'inverse' ? 'inverse' : 'forward';
    }

    function buildQuoteAlertDisplayLabel(quote, monitorState = quoteMarketState.get(quote.id) || {}, direction = 'forward') {
        if (!quote) return '--';
        const isInverse = direction === 'inverse';
        if (isCexOrderbookChain(quote.chain)) {
            const parsed = parseCexTradingPairSymbol(quote.symbol);
            if (parsed) {
                const fromSymbol = isInverse ? parsed.toSymbol : parsed.fromSymbol;
                const toSymbol = isInverse ? parsed.fromSymbol : parsed.toSymbol;
                return `${fromSymbol}/${toSymbol}`;
            }
            return String(quote.symbol || '').trim() || '--';
        }
        if (monitorState.fromSymbol && monitorState.toSymbol) {
            return isInverse
                ? `${monitorState.toSymbol}/${monitorState.fromSymbol}`
                : `${monitorState.fromSymbol}/${monitorState.toSymbol}`;
        }
        const fromToken = isInverse ? quote.toToken : quote.fromToken;
        const toToken = isInverse ? quote.fromToken : quote.toToken;
        return `${String(fromToken || '').slice(0, 4)}.../${String(toToken || '').slice(0, 4)}...`;
    }

    function getQuoteAlertsForQuoteId(quoteId) {
        const normalizedQuoteId = Number(quoteId);
        return (pathAlertConfig.alerts || []).filter((alert) => (
            alert
            && alert.target
            && alert.target.type === 'quote'
            && Number(alert.target.quoteId) === normalizedQuoteId
        ));
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
        if (!alert || !alert.target || !evaluation) return '';
        const target = alert.target;
        if (target.ruleKind === 'targetAbove') {
            return `汇率已达到或超过目标 ${formatDetailNumber(target.value)}`;
        }
        if (target.ruleKind === 'targetBelow') {
            return `汇率已达到或低于目标 ${formatDetailNumber(target.value)}`;
        }
        if (target.ruleKind === 'percentUp') {
            return `汇率相比基准(${formatDetailNumber(evaluation.basePrice)}) 上涨 ${Number(evaluation.changePercent || 0).toFixed(3)}% (>${formatDetailNumber(target.value)}%)`;
        }
        if (target.ruleKind === 'percentDown') {
            return `汇率相比基准(${formatDetailNumber(evaluation.basePrice)}) 下跌 ${Math.abs(Number(evaluation.changePercent || 0)).toFixed(3)}% (>${formatDetailNumber(target.value)}%)`;
        }
        return '';
    }

    function buildQuoteAlertCurrentValueText(quote, alert, evaluation) {
        if (!quote || !alert || !alert.target || !evaluation) return '';
        if (alert.target.ruleKind === 'targetAbove' || alert.target.ruleKind === 'targetBelow') {
            return Number.isFinite(Number(evaluation.currentValue))
                ? `当前汇率 ${formatDetailNumber(evaluation.currentValue)}`
                : '';
        }
        return Number.isFinite(Number(evaluation.basePrice)) && Number.isFinite(Number(evaluation.currentValue))
            ? `基准汇率 ${formatDetailNumber(evaluation.basePrice)} -> ${formatDetailNumber(evaluation.currentValue)}`
            : '';
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
            const runtimeAlert = window.PathAlertUtils.buildEffectiveRuntimeAlert(alert, { forceImmediate: forceImmediateAlerts });
            const previous = pathAlertRuntimeState.get(alert.id) || null;
            const evaluation = window.PathAlertUtils
                ? window.PathAlertUtils.evaluatePathAlert(alert, { quoteStateById: quoteMarketState })
                : null;
            const next = window.PathAlertUtils
                ? window.PathAlertUtils.advancePathAlertRuntime(runtimeAlert, previous, evaluation, Date.now())
                : null;
            if (!next) continue;
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
        if (
            window.PathAlertNotificationUtils
            && typeof window.PathAlertNotificationUtils.buildLegacyQuoteAlertRemotePayload === 'function'
        ) {
            return window.PathAlertNotificationUtils.buildLegacyQuoteAlertRemotePayload({
                chainName: displayName,
                label,
                currentValueText,
                message,
                actionLink
            });
        }
        return {
            title: [[displayName || '未知链', [label, currentValueText].filter(Boolean).join('  ')].filter(Boolean).join(' ')].filter(Boolean).join('\n') || '监控命中',
            body: [message].filter(Boolean).join('\n') || '监控命中',
            telegramHtmlBody: ''
        };
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
        const pauseButtonTitle = isQuotePaused(quote) ? '恢复' : '暂停';
        const pauseButtonIcon = isQuotePaused(quote) ? '▶️' : '⏸️';
        
        itemEl.innerHTML = `
            <div class="quote-left-container">
                <span class="quote-label-stack">
                    <span class="quote-label-row">
                        <span class="quote-label">${displayName}</span>
                        ${requestChannelTagHtml}
                    </span>
                    ${pairLabelHtml}
                </span>
                <span id="trend-arrow-${quote.id}" class="trend-arrow"></span>
            </div>
            <div class="quote-result">
                <div id="quote-data-${quote.id}" class="quote-data">
                    <div style="display:flex; align-items:center;">
                        ${amountInputHTML}
                        <span class="quote-text-wrapper" id="quote-text-wrapper-${quote.id}">
                            <span class="${quoteTextClassName}" id="quote-text-${quote.id}">${lastResultText}</span>
                        </span>
                    </div>
                </div>
                <div class="quote-actions">
                    <button class="icon-btn" title="${pauseButtonTitle}" aria-label="${pauseButtonTitle}" aria-pressed="${isQuotePaused(quote) ? 'true' : 'false'}" data-toggle-pause-id="${quote.id}" data-category-id="${categoryId}">${pauseButtonIcon}</button>
                    <button class="icon-btn" title="设置" data-edit-alert-id="${quote.id}" data-category-id="${categoryId}">⚙️</button>
                </div>
            </div>`;
        
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
        const categoryPauseTitle = categoryPauseAction === 'resume' ? '恢复分区' : '暂停分区';
        const categoryPauseIcon = categoryPauseAction === 'resume' ? '▶️' : '⏸️';
        moduleEl.innerHTML = `
            <div class="module-header">
                <h2>${category.name}</h2>
                <div class="module-header-actions">
                    <button class="icon-btn add-quote-btn" title="添加报价" aria-label="添加报价" data-category-id="${category.id}">+</button>
                    <button class="icon-btn" title="${categoryPauseTitle}" aria-label="${categoryPauseTitle}" aria-pressed="${categoryPauseAction === 'resume' ? 'true' : 'false'}" data-toggle-category-pause-id="${category.id}" data-category-id="${category.id}">${categoryPauseIcon}</button>
                    <button class="icon-btn delete-btn" title="删除分区" data-category-id="${category.id}">×</button>
                </div>
            </div>
            <ul class="quote-list" id="quote-list-${category.id}"></ul>`;
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
            const nextPriority = window.ArbCyclePriorityUtils && typeof window.ArbCyclePriorityUtils.normalizeArbCycleStartPriority === 'function'
                ? window.ArbCyclePriorityUtils.normalizeArbCycleStartPriority(data && data.cycleStartPriority)
                : Array.from(DEFAULT_ARB_CYCLE_START_PRIORITY);
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
        return !!(window.RequestChannelUtils
            && typeof window.RequestChannelUtils.supportsRequestChannelForQuote === 'function'
            && window.RequestChannelUtils.supportsRequestChannelForQuote(quote));
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
        const currentChannelId = window.RequestChannelUtils && typeof window.RequestChannelUtils.resolveRequestChannelIdForQuote === 'function'
            ? window.RequestChannelUtils.resolveRequestChannelIdForQuote(quote, requestChannelOptions)
            : (quote.requestChannelId || 'default');

        quoteRequestChannelSelect.innerHTML = (requestChannelOptions.channels || []).map((channel) => {
            const suffix = channel.isDefault ? ' (默认)' : '';
            return `<option value="${escapeHtml(channel.id)}">${escapeHtml(channel.name)}${suffix}</option>`;
        }).join('');
        quoteRequestChannelSelect.value = currentChannelId;
    }

    function buildPriceSnapshotPayload() {
        return window.PriceSnapshotPayloadUtils
            ? window.PriceSnapshotPayloadUtils.buildPriceSnapshotPayload({
                dashboardState,
                quoteStateById: quoteMarketState,
                clientCapturedAt: new Date().toISOString()
            })
            : {
                clientCapturedAt: new Date().toISOString(),
                quotes: []
            };
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
            const nextState = {
                ...state,
                lastRawPrice: null,
                lastTotalAmountOut: null,
                inverseRawPrice: null,
                inverseTotalAmountOut: null
            };

            const arrowEl = document.getElementById(`trend-arrow-${quoteId}`);
            if (arrowEl) {
                arrowEl.className = 'trend-arrow';
            }

            if (nextState.fromSymbol && nextState.toSymbol) {
                const temp = nextState.fromSymbol;
                nextState.fromSymbol = nextState.toSymbol;
                nextState.toSymbol = temp;
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
