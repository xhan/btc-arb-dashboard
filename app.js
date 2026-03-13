    const BACKEND_URL = `${location.protocol}//${location.hostname}:3000`;
    let dashboardState = [];
    let quoteMonitorState = new Map();
    let globalSymbolCache = new Map(); 
    
    let isAudioUnlocked = false; 
    let onConfirmAction = null;

    let queues = {
        kyber: [],
        zerox: [],
        velora: [],
        lifi: [],
        bybit: [],
        binance: [],
        solana: [],
        sui: [],
        starknet: []
    };

    let indices = {
        kyber: 0,
        zerox: 0,
        velora: 0,
        lifi: 0,
        bybit: 0,
        binance: 0,
        solana: 0,
        sui: 0,
        starknet: 0
    };

    let timers = {
        kyber: null,
        zerox: null,
        velora: null,
        lifi: null,
        bybit: null,
        binance: null,
        solana: null,
        sui: null,
        starknet: null
    };

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

    let apiIntervals = { ...DEFAULT_INTERVALS };

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
                defaultCooldownSec: 300,
                localSoundEnabled: true,
                webhookEnabled: false,
                webhookUrl: 'https://api.day.app/45xWAiD79Rn8DPXw6Beudh/[title]/[body]?sound=ladder',
                webhookSecret: ''
            },
            alerts: []
        };
    let pathAlertSaveTimer = null;
    let pathAlertEvalTimer = null;
    let pathAlertPanelHidden = false;
    let pathAlertRuntimeState = new Map();
    let pathAlertPanelCollapsed = false;
    let pathAlertReloading = false;
    let pathAlertEditorState = {
        visible: false,
        editingId: '',
        sourceType: 'path',
        selectedRuleId: '',
        searchQuery: '',
        draftLegs: []
    };
    const ARB_PANEL_UPDATE_DELAY_MS = 1000;
    let arbExpandedSections = new Set();
    let arbGlobalExcludedSymbolsInput = '';
    let arbGlobalExcludedChainsInput = '';
    let arbOpportunityMap = new Map();
    let arbOpportunityStore = new Map();
    let arbLastPointerOpenedOpportunityId = null;
    let arbDetailState = {
        visible: false,
        opportunityId: null,
        selectedOpportunity: null,
        cards: [],
        pausedDashboard: false,
        loopToken: 0,
        isRefreshing: false,
        editingInputIndex: null,
        chartPreviewSignature: ''
    };
    let arbDetailFetchController = null;
    let quoteSourceLastRequestAtByIntervalKey = new Map();
    let arbDetailChartPreviewCharts = [];
    let arbDetailChartPreviewRunId = 0;
    let arbDetailChartAutoRefreshTimer = null;
    
    let hoverTimeout = null;        
    let currentHoveredQuoteId = null; 
    let currentlyEditingQuote = null; 

    const dashboardEl = document.getElementById('dashboard');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const alertLogWindow = document.getElementById('alert-log-window');
    const alertLogContent = document.getElementById('alert-log-content');
    const alertSound = document.getElementById('alert-sound');
    const pathAlertSound = document.getElementById('path-alert-sound');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const audioNoticeEl = document.getElementById('audio-notice');
    const alertModal = document.getElementById('alert-modal');
    const pathAlertWindow = document.getElementById('path-alert-window');
    const pathAlertContent = document.getElementById('path-alert-content');
    const pathAlertHeader = document.getElementById('path-alert-header');
    const pathAlertMinBtn = document.getElementById('path-alert-min-btn');
    const togglePathAlertBtn = document.getElementById('toggle-path-alert-btn');
    const pathAlertModal = document.getElementById('path-alert-modal');
    const pathAlertModalTitle = document.getElementById('path-alert-modal-title');
    const pathAlertNameInput = document.getElementById('path-alert-name');
    const pathAlertSearchInput = document.getElementById('path-alert-search-input');
    const pathAlertCandidateList = document.getElementById('path-alert-candidate-list');
    const pathAlertRuleList = document.getElementById('path-alert-rule-list');
    const pathAlertSelectedLegs = document.getElementById('path-alert-selected-legs');
    const pathAlertPreview = document.getElementById('path-alert-preview');
    const pathAlertThresholdBpInput = document.getElementById('path-alert-threshold-bp');
    const pathAlertTriggerModeSelect = document.getElementById('path-alert-trigger-mode');
    const pathAlertConfirmDelayInput = document.getElementById('path-alert-confirm-delay');
    const pathAlertCooldownInput = document.getElementById('path-alert-cooldown');
    const pathAlertEnabledInput = document.getElementById('path-alert-enabled');
    const pathAlertPathEditor = document.getElementById('path-alert-path-editor');
    const pathAlertRuleEditor = document.getElementById('path-alert-rule-editor');
    const pathAlertCancelBtn = document.getElementById('path-alert-cancel');
    const pathAlertSaveBtn = document.getElementById('path-alert-save');
    const modalSwapQuoteBtn = document.getElementById('modal-swap-quote');
    const modalDeleteQuoteBtn = document.getElementById('modal-delete-quote');
    const quoteTokenAddressesEl = document.getElementById('quote-token-addresses');
    const quoteFromTokenLineEl = document.getElementById('quote-from-token-line');
    const quoteToTokenLineEl = document.getElementById('quote-to-token-line');
    
    const manualSaveBtn = document.getElementById('manual-save-btn');
    const manualSaveText = document.getElementById('manual-save-text');
    const quoteRunStateTag = document.getElementById('quote-run-state-tag');

    const settingsBtn = document.getElementById('global-settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    
    const addQuoteModal = document.getElementById('add-quote-modal');
    const addQuoteChainSelect = document.getElementById('add-quote-chain');
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
    const arbGlobalFilterBar = document.getElementById('arb-global-filter-bar');
    const arbGlobalFilterInput = document.getElementById('arb-global-filter-input');
    const arbGlobalChainFilterInput = document.getElementById('arb-global-chain-filter-input');
    const arbGlobalFilterClearBtn = document.getElementById('arb-global-filter-clear-btn');
    const arbPathHeader = document.getElementById('arb-path-header');
    const arbPathMaxBtn = document.getElementById('arb-path-max-btn');
    const arbPathMinBtn = document.getElementById('arb-path-min-btn');
    const toggleArbBtn = document.getElementById('toggle-arb-btn');
    const arbDetailModal = document.getElementById('arb-detail-modal');
    const arbDetailCloseBtn = document.getElementById('arb-detail-close-btn');
    const arbDetailChartLink = document.getElementById('arb-detail-chart-link');
    const arbDetailChartAutoRefreshToggle = document.getElementById('arb-detail-chart-auto-refresh');
    const arbDetailSubtitle = document.getElementById('arb-detail-subtitle');
    const arbDetailChartPreview = document.getElementById('arb-detail-chart-preview');
    const arbDetailProfitPreview = document.getElementById('arb-detail-profit-preview');
    const arbDetailGrid = document.getElementById('arb-detail-grid');
    const calcWindow = document.getElementById('calc-window');
    const calcContent = document.getElementById('calc-content');
    const calcHeader = document.getElementById('calc-header');
    const calcResetBtn = document.getElementById('calc-reset-btn');
    const calcMinBtn = document.getElementById('calc-min-btn');
    const toggleCalcBtn = document.getElementById('toggle-calc-btn');
    let copyToastTimer = null;
    let calculatorEntries = [];
    
    const CHAIN_DISPLAY_NAMES = {
        ethereum: 'ETH', solana: 'SOL', sui: 'SUI', polygon: 'Polygon',
        arbitrum: 'Arbitrum', optimism: 'Optimism', bsc: 'BSC',
        avalanche: 'Avalanche', base: 'Base', Bybit: 'Bybit', bybit: 'Bybit', Binance: 'Binance', binance: 'Binance',
        linea: 'Linea', mantle: 'Mantle', sonic: 'Sonic', berachain: 'Berachain',
        ronin: 'Ronin', unichain: 'Unichain', hyperevm: 'HyperEVM', plasma: 'Plasma',
        scroll: 'Scroll', blast: 'Blast', mode: 'Mode', monad: 'Monad', etherlink: 'Etherlink',
        fantom: 'Fantom', cronos: 'Cronos', moonbeam: 'Moonbeam', boba: 'Boba', gnosis: 'Gnosis', celo: 'Celo',
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
        CELO: 'celo'
    };

    const CHAIN_ADDRESS_PLACEHOLDERS = {
        ethereum: '0x...', solana: 'Enter mint address...', sui: '0x...::module::TYPE',
        polygon: '0x...', arbitrum: '0x...', optimism: '0x...',
        bsc: '0x...', avalanche: '0x...', base: '0x...', hemi: '0x...', katana: '0x...', starknet: '0x...', Bybit: 'N/A', bybit: 'N/A', Binance: 'N/A', binance: 'N/A'
    };

    function isCexOrderbookChain(chain) {
        const normalized = String(chain || '').trim().toLowerCase();
        return normalized === 'bybit' || normalized === 'binance';
    }
    
    const KYBER_SUPPORTED_CHAINS = [
        'ethereum', 'bsc', 'arbitrum', 'polygon', 'optimism', 'avalanche', 
        'base', 'linea', 'mantle', 'sonic', 'berachain', 'ronin', 
        'unichain', 'hyperevm', 'plasma', 'etherlink', 'monad',
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
        return !nonEvm.includes(chain.toLowerCase());
    }

    function is0xSupported(chain) {
        return ZEROX_SUPPORTED_CHAINS.includes(chain.toLowerCase());
    }

    function isKyberSupported(chain) {
        return KYBER_SUPPORTED_CHAINS.includes(chain.toLowerCase());
    }

    function shouldQueueInverseFetch(quote) {
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
            lastResultText: '',
            inverseRawPrice: null,
            inverseFromSymbol: '',
            inverseToSymbol: '',
            usedSource: '',
            usedSourceReal: '',
            cexOrderbook: null,
            hasUnreadAlert: false,
            logShown: false,
            isSoundActive: false
        };
    }

    function getQueueTypeForQuote(quote) {
        if (window.QueueStatsUtils && typeof window.QueueStatsUtils.getQueueTypeForQuote === 'function') {
            return window.QueueStatsUtils.getQueueTypeForQuote(quote);
        }
        let type = 'kyber';
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
        return type;
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
        const queue = queues[type];
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

    function removeFromQueue(quoteId) {
        Object.keys(queues).forEach(type => {
            queues[type] = queues[type].filter(task => task.quoteId !== quoteId);
        });
    }

    function deferCurrentQueueTask(type) {
        const queue = queues[type];
        if (!queue || queue.length <= 1) return;

        const currentIndex = indices[type];
        if (currentIndex < 0 || currentIndex >= queue.length) return;

        const [task] = queue.splice(currentIndex, 1);
        queue.push(task);

        // 回退一格，确保下一个 tick 轮到“当前任务后面的任务”，而不是刚被挪到队尾的同一任务。
        indices[type] = (currentIndex - 1 + queue.length) % queue.length;
    }

    function processQueue(type) {
        const queue = queues[type];
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
        Object.keys(timers).forEach(type => {
            if (timers[type]) clearInterval(timers[type]);
            timers[type] = null;

            if (arbDetailState.pausedDashboard) {
                return;
            }

            if (apiIntervals[type] > 0) {
                timers[type] = setInterval(() => processQueue(type), apiIntervals[type]);
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
        
        let shouldPlayQuoteAlert = false;
        for (const state of quoteMonitorState.values()) {
            if (state.isSoundActive) {
                shouldPlayQuoteAlert = true;
                break;
            }
        }
        let shouldPlayPathAlert = false;
        for (const runtime of pathAlertRuntimeState.values()) {
            if (runtime && runtime.isSoundActive) {
                shouldPlayPathAlert = true;
                break;
            }
        }
        syncLoopingAlertSound(alertSound, shouldPlayQuoteAlert);
        syncLoopingAlertSound(pathAlertSound, shouldPlayPathAlert);
    }

    function appendAlertLogEntry(title, message, subtitle = '') {
        if (!alertLogWindow || !alertLogContent) return;
        alertLogWindow.style.display = 'flex';
        const now = new Date();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        const subtitleHtml = subtitle ? `<div>${subtitle}</div>` : '';
        logEntry.innerHTML = `<div><strong>${escapeHtml(title)}</strong></div>${subtitleHtml}<div>${escapeHtml(message)}</div><span class="log-time">${now.toLocaleTimeString()}</span>`;
        alertLogContent.prepend(logEntry);
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
        Promise.allSettled([primeAlertAudio(alertSound), primeAlertAudio(pathAlertSound)]).then((results) => {
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
    document.body.addEventListener('keydown', unlockAudio, { once: true });

    function scheduleArbUpdate() {
        if (arbUpdateTimer) return;
        arbUpdateTimer = setTimeout(() => {
            arbUpdateTimer = null;
            updateArbPanel();
        }, ARB_PANEL_UPDATE_DELAY_MS);
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
            id: 'special:dex-cex-wbtc',
            title: 'DEX <-> CEX',
            type: 'dex-cex',
            categoryName: 'WBTC监控',
            dexBase: 'cbBTC',
            dexQuote: 'WBTC',
            cexQuote: 'BTC',
            cexChains: ['Bybit', 'Binance']
        }
    ];

    function formatArbPathLegLine(leg) {
        const baseLine = window.ArbPaths.formatLegLine({
            from: leg.from,
            to: leg.to,
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
                return [
                    safeAmount,
                    Math.max(1, Math.round(safeAmount * 0.5)),
                    Math.max(1, Math.round(safeAmount * 1.5)),
                    Math.max(1, Math.round(safeAmount * 2))
                ];
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
                        fromSymbol: String(leg?.from || ''),
                        toSymbol: String(leg?.to || '')
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
                    cexOrderbook: quoteResult?.cexOrderbook || null,
                    usedSource: quoteResult?.usedSource || '',
                    usedSourceReal: options.successSource || null
                };
            },
            buildArbDetailDexLink(config = {}) {
                const chain = String(config.chain || '').trim();
                const normalizedChain = chain.toLowerCase();
                const fromTokenAddress = String(config.fromTokenAddress || '').trim();
                const toTokenAddress = String(config.toTokenAddress || '').trim();
                if (!fromTokenAddress || !toTokenAddress) return null;
                if (normalizedChain === 'bybit' || normalizedChain === 'binance') return null;
                if (normalizedChain === 'sui') {
                    return {
                        label: 'cetus',
                        url: `https://app.cetus.zone/swap/${encodeURIComponent(fromTokenAddress)}/${encodeURIComponent(toTokenAddress)}`
                    };
                }
                if (normalizedChain === 'solana') {
                    return {
                        label: 'jup.ag',
                        url: `https://jup.ag/?sell=${encodeURIComponent(fromTokenAddress)}&buy=${encodeURIComponent(toTokenAddress)}`
                    };
                }
                if (normalizedChain === 'starknet') {
                    const inputAmount = Number(config.inputAmount);
                    if (!Number.isFinite(inputAmount) || inputAmount <= 0) return null;
                    return {
                        label: 'ekubo',
                        url: `https://ekubo.org/starknet/swap?inputCurrency=${encodeURIComponent(fromTokenAddress)}&amount=${encodeURIComponent(String(inputAmount))}&outputCurrency=${encodeURIComponent(toTokenAddress)}`
                    };
                }
                return {
                    label: 'swap.defillama',
                    url: `https://swap.defillama.com/?chain=${encodeURIComponent(normalizedChain)}&from=${encodeURIComponent(fromTokenAddress)}&tab=swap&to=${encodeURIComponent(toTokenAddress)}`
                };
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

    function getCexPairLabel(quote, state) {
        if (!isCexOrderbookChain(quote && quote.chain)) return '';
        if (state && state.fromSymbol && state.toSymbol) {
            return `${state.fromSymbol}/${state.toSymbol}`;
        }
        return String(quote?.symbol || '').trim().toUpperCase();
    }

    function getQuotePairLabel(quote, state) {
        if (!quote) return '';
        if (state && state.fromSymbol && state.toSymbol) {
            return `${state.fromSymbol}/${state.toSymbol}`;
        }
        return getCexPairLabel(quote, state);
    }

    function getQuoteDisplayText(quote, state) {
        if (isQuotePaused(quote)) return '已暂停';
        return (state && state.lastResultText) || '...';
    }

    function updateQuotePairLabel(quote, state) {
        const pairLabelEl = document.getElementById(`quote-pair-label-${quote.id}`);
        if (!pairLabelEl) return;
        const nextLabel = getQuotePairLabel(quote, state);
        pairLabelEl.textContent = nextLabel;
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

    function clearQuoteTrendArrow(quoteId, previousState) {
        const arrowEl = document.getElementById(`trend-arrow-${quoteId}`);
        if (arrowEl) {
            arrowEl.className = 'trend-arrow';
            arrowEl.innerHTML = '';
        }
        const state = previousState && typeof previousState === 'object' ? previousState : {};
        if (state.trendTimer) {
            clearTimeout(state.trendTimer);
        }
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

    function applyPausedQuoteUiState(quote, state, previousState) {
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
        clearQuoteTrendArrow(quote.id, previousState);

        if (currentlyEditingQuote && currentlyEditingQuote.quote && currentlyEditingQuote.quote.id === quote.id && alertModal.classList.contains('visible')) {
            const modalPriceEl = document.getElementById('alert-current-price-value');
            if (modalPriceEl) {
                modalPriceEl.textContent = '已暂停';
            }
        }
    }

    function applyActiveQuoteUiState(quote, options = {}) {
        const itemEl = document.getElementById(`quote-item-${quote.id}`);
        const quoteDataEl = document.getElementById(`quote-data-${quote.id}`);
        const quoteTextWrapperEl = document.getElementById(`quote-text-wrapper-${quote.id}`);
        const quoteTextEl = document.getElementById(`quote-text-${quote.id}`);
        const state = quoteMonitorState.get(quote.id) || {};

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
        clearQuoteTrendArrow(quote.id, state);
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

    function buildPathAlertQuoteCandidates() {
        const candidates = [];
        for (const category of dashboardState) {
            for (const quote of getActiveQuotes(category.quotes || [])) {
                const state = quoteMonitorState.get(quote.id);
                if (!state) continue;

                if (isCexOrderbookChain(quote.chain) && state.fromSymbol && state.toSymbol) {
                    if (state.cexOrderbook && Number.isFinite(state.cexOrderbook.bestBidPrice)) {
                        candidates.push({
                            key: `${quote.id}:cex-bid1`,
                            quoteId: quote.id,
                            direction: 'forward',
                            pricingMode: 'cex-bid1',
                            chain: quote.chain,
                            fromSymbol: state.fromSymbol,
                            toSymbol: state.toSymbol,
                            categoryName: category.name,
                            label: buildLiveQuoteLabel(quote.chain, state.fromSymbol, state.toSymbol, ' [bid1]')
                        });
                    }
                    if (state.cexOrderbook && Number.isFinite(state.cexOrderbook.bestAskPrice)) {
                        candidates.push({
                            key: `${quote.id}:cex-ask1-inverse`,
                            quoteId: quote.id,
                            direction: 'forward',
                            pricingMode: 'cex-ask1-inverse',
                            chain: quote.chain,
                            fromSymbol: state.toSymbol,
                            toSymbol: state.fromSymbol,
                            categoryName: category.name,
                            label: buildLiveQuoteLabel(quote.chain, state.toSymbol, state.fromSymbol, ' [ask1]')
                        });
                    }
                    continue;
                }

                if (state.fromSymbol && state.toSymbol && Number.isFinite(state.lastRawPrice)) {
                    candidates.push({
                        key: `${quote.id}:forward`,
                        quoteId: quote.id,
                        direction: 'forward',
                        pricingMode: 'raw',
                        chain: quote.chain,
                        fromSymbol: state.fromSymbol,
                        toSymbol: state.toSymbol,
                        categoryName: category.name,
                        label: buildLiveQuoteLabel(quote.chain, state.fromSymbol, state.toSymbol)
                    });
                }

                if (quote.showInverse && state.toSymbol && state.fromSymbol && Number.isFinite(state.inverseRawPrice)) {
                    candidates.push({
                        key: `${quote.id}:inverse`,
                        quoteId: quote.id,
                        direction: 'inverse',
                        pricingMode: 'raw',
                        chain: quote.chain,
                        fromSymbol: state.toSymbol,
                        toSymbol: state.fromSymbol,
                        categoryName: category.name,
                        label: buildLiveQuoteLabel(quote.chain, state.toSymbol, state.fromSymbol)
                    });
                }
            }
        }

        return candidates;
    }

    function matchesPathAlertCandidate(candidate, query) {
        const utils = getChartsUtils();
        const queryTokens = typeof utils.tokenizeChartSearch === 'function'
            ? utils.tokenizeChartSearch(query)
            : String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (!queryTokens.length) return true;
        const terms = String(`${candidate.label} ${candidate.categoryName || ''} ${candidate.chain || ''}`)
            .toLowerCase()
            .split(/[^a-z0-9.+-]+/i)
            .filter(Boolean);
        return queryTokens.every((token) => terms.some((term) => term.startsWith(token)));
    }

    function parseArbFilterInput(inputText) {
        const tokens = String(inputText || '')
            .split(/\s+/)
            .map(token => token.trim())
            .filter(Boolean);
        return Array.from(new Set(tokens));
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
        if (!arbGlobalFilterBar) return;

        if (arbGlobalFilterInput && arbGlobalFilterInput.value !== arbGlobalExcludedSymbolsInput) {
            arbGlobalFilterInput.value = arbGlobalExcludedSymbolsInput;
        }
        if (arbGlobalChainFilterInput && arbGlobalChainFilterInput.value !== arbGlobalExcludedChainsInput) {
            arbGlobalChainFilterInput.value = arbGlobalExcludedChainsInput;
        }
        if (arbGlobalFilterClearBtn) {
            arbGlobalFilterClearBtn.disabled = !arbGlobalExcludedSymbolsInput.trim() && !arbGlobalExcludedChainsInput.trim();
        }
    }

    function getCycleDisplayState(cycles, maxPositiveCount, expanded = false) {
        const list = Array.isArray(cycles) ? cycles : [];
        const maxCount = Math.max(1, Number(maxPositiveCount) || 1);
        if (!list.length) {
            return {
                displayCycles: [],
                positiveCount: 0,
                hiddenPositiveCount: 0,
                canToggleExpand: false,
                expanded: false
            };
        }

        const positiveCycles = list.filter(cycle =>
            cycle &&
            typeof cycle.profitRate === 'number' &&
            cycle.profitRate > 0
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
                expanded: shouldExpand
            };
        }

        return {
            displayCycles: list.slice(0, 1),
            positiveCount: 0,
            hiddenPositiveCount: 0,
            canToggleExpand: false,
            expanded: false
        };
    }

    function buildArbSectionToggleHtml(sectionKey, cycleDisplayState) {
        if (!cycleDisplayState || !cycleDisplayState.canToggleExpand) return '';

        const buttonText = cycleDisplayState.expanded
            ? `已展开 ${cycleDisplayState.positiveCount} 条正收益，点击收起`
            : `还有 ${cycleDisplayState.hiddenPositiveCount} 条正收益未显示，点击展开全部`;

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
        const toggleBtn = event.target.closest('.arb-path-expand-toggle');
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

        const addAlertBtn = event.target.closest('[data-arb-opportunity-alert-id]');
        if (addAlertBtn && arbPathContent.contains(addAlertBtn)) {
            const draft = buildPathAlertDraftFromOpportunity(addAlertBtn.dataset.arbOpportunityAlertId);
            if (draft) {
                openPathAlertsManagementPage({
                    mode: 'create',
                    draft
                });
            }
            return;
        }

        if (event.target.closest('.arb-opportunity-chart-link')) return;

        const opportunityEl = event.target.closest('[data-arb-opportunity-id]');
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
        if (event.target.closest('.arb-opportunity-chart-link')) return;
        const opportunityEl = event.target.closest('[data-arb-opportunity-id]');
        if (!opportunityEl) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openArbDetailModal(opportunityEl.dataset.arbOpportunityId);
    }

    function handleArbPathContentPointerDown(event) {
        if (!arbPathContent) return;
        if (typeof event.button === 'number' && event.button !== 0) return;
        if (event.target.closest('.arb-path-expand-toggle')) return;
        if (event.target.closest('[data-arb-opportunity-alert-id]')) return;
        if (event.target.closest('.arb-opportunity-chart-link')) return;

        const opportunityEl = event.target.closest('[data-arb-opportunity-id]');
        if (!opportunityEl) return;
        const opportunityId = opportunityEl.dataset.arbOpportunityId;
        if (!opportunityId) return;

        arbLastPointerOpenedOpportunityId = opportunityId;
        openArbDetailModal(opportunityId);
    }

    function createArbOpportunityEntry(targetMap, cycle, label, meta = {}) {
        if (!cycle) return null;
        const opportunityId = getArbDetailUtils().buildUniqueArbOpportunityId(
            new Set(targetMap.keys()),
            meta.section || '',
            label || '',
            cycle
        );
        const chartPairs = getArbDetailUtils().buildArbDetailChartPairs(cycle);
        const chartHref = getChartsUtils().buildChartsPageHref(chartPairs);
        const entry = {
            id: opportunityId,
            cycle,
            label,
            chartHref,
            ...meta
        };
        targetMap.set(opportunityId, entry);
        arbOpportunityStore.set(opportunityId, entry);

        return {
            label,
            cycle,
            opportunityId,
            chartHref,
            clickable: meta.clickable !== false
        };
    }

    function buildArbDetailRowsHtml(card) {
        if (card.rows && card.rows.length) {
            return card.rows.map((row) => `
                <div class="arb-detail-leg">
                    <div class="arb-detail-leg-line">
                        <div class="arb-detail-leg-main">
                            <div class="arb-detail-leg-pair">${buildArbDetailPairHtml(row)}</div>
                            <div class="arb-detail-leg-source">${buildArbDetailSourceHtml(row)}</div>
                        </div>
                        <span class="arb-detail-leg-amount">${escapeHtml(row.amountText)}</span>
                    </div>
                </div>
            `).join('');
        }

        return `<div class="${card.error ? 'arb-detail-error' : 'arb-detail-loading'}">${escapeHtml(card.error || '等待报价...')}</div>`;
    }

    function buildArbDetailTokenHtml(symbol, address) {
        const safeSymbol = escapeHtml(symbol || '');
        if (!address) {
            return safeSymbol;
        }

        const safeAddress = escapeHtml(address);
        return `<span class="arb-detail-token" data-arb-detail-token-address="${safeAddress}" data-arb-detail-token-symbol="${safeSymbol}" title="${safeAddress}">${safeSymbol}</span>`;
    }

    function buildArbDetailPairHtml(row) {
        if (!row) return '';
        const chainText = `（${escapeHtml(row.chainLabel || '')}）`;
        const fromHtml = buildArbDetailTokenHtml(row.fromSymbol, row.fromTokenAddress);
        const toHtml = buildArbDetailTokenHtml(row.toSymbol, row.toTokenAddress);
        return `${chainText}${fromHtml} -> ${toHtml}`;
    }

    function buildArbDetailSourceHtml(row) {
        const sourceText = escapeHtml(row && row.sourceText ? row.sourceText : 'Unknown');
        const dexLink = getArbDetailUtils().buildArbDetailDexLink(row);
        if (!dexLink || !dexLink.url) {
            return sourceText;
        }

        return `${sourceText} · <button type="button" class="arb-detail-dex-link" data-arb-detail-dex-url="${escapeHtml(dexLink.url)}" data-arb-detail-dex-label="${escapeHtml(dexLink.label)}">${escapeHtml(dexLink.label)}</button>`;
    }

    function buildArbDetailSummaryHtml(card, index, bestProfitIndices, bestProfitRateIndices) {
        if (card.summary && typeof card.summary.profit === 'number') {
            const profitClass = bestProfitIndices.includes(index) ? ' arb-detail-metric-best' : '';
            const rateClass = bestProfitRateIndices.includes(index) ? ' arb-detail-metric-best' : '';
            return `
                <span class="arb-detail-metric${profitClass}">收益 ${formatDetailNumber(card.summary.profit)} ${escapeHtml(card.summary.symbol || '')}</span>
                <span class="arb-detail-metric${rateClass}">${formatDetailProfitRate(card.summary.profitRate)}</span>
            `;
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
        const cardsHtml = arbDetailState.cards.map((card, index) => {
            const ids = getArbDetailUtils().getArbDetailCardDomIds(index);
            return `
                <div class="arb-detail-card" data-arb-detail-card-index="${index}">
                    <div class="arb-detail-card-header">
                        <span class="arb-detail-badge">${index + 1}</span>
                        <div class="arb-detail-input-row">
                            <input
                                id="${ids.inputId}"
                                class="arb-detail-input"
                                type="text"
                                inputmode="decimal"
                                data-arb-detail-input-index="${index}"
                                value="${escapeHtml(card.inputAmount)}"
                            >
                            <div class="arb-detail-stepper">
                                <button type="button" class="arb-detail-step-btn" data-arb-detail-step-index="${index}" data-arb-detail-step="-0.1">－</button>
                                <button type="button" class="arb-detail-step-btn" data-arb-detail-step-index="${index}" data-arb-detail-step="0.1">＋</button>
                            </div>
                        </div>
                    </div>
                    <div id="${ids.rowsId}" class="arb-detail-path-list"></div>
                    <div id="${ids.summaryId}" class="arb-detail-summary"></div>
                </div>
            `;
        }).join('');

        arbDetailGrid.innerHTML = cardsHtml;
    }

    function syncArbDetailInputValues() {
        arbDetailState.cards.forEach((card, index) => {
            if (!getArbDetailUtils().shouldSyncArbDetailInput(index, arbDetailState.editingInputIndex)) {
                return;
            }
            const ids = getArbDetailUtils().getArbDetailCardDomIds(index);
            const inputEl = document.getElementById(ids.inputId);
            if (!inputEl) return;
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

            rowsEl.innerHTML = buildArbDetailRowsHtml(card);
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
        const previousState = quoteMonitorState.get(quote.id) || {};
        const nextState = getArbDetailUtils().buildArbDetailSnapshotMonitorState(previousState, data, {
            successSource,
            isInverseFetch
        });
        quoteMonitorState.set(quote.id, nextState);
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
        arbDetailChartPreview.innerHTML = `<div class="arb-detail-chart-message">${escapeHtml(message)}</div>`;
    }

    function buildArbDetailChartPreviewSignature(pairs) {
        return JSON.stringify((pairs || []).map((pair) => `${pair.quoteId}:${pair.direction}`));
    }

    function buildArbDetailChartPreviewCardHtml(pair, index) {
        const label = getChartsUtils().buildChartPairLabel(pair);
        return `
            <article class="arb-detail-chart-card" data-arb-detail-chart-index="${index}">
                <div class="arb-detail-chart-card-head">
                    <div>
                        <div class="arb-detail-chart-card-title">${escapeHtml(label)}</div>
                        <div class="arb-detail-chart-card-meta">等待历史图表...</div>
                    </div>
                </div>
                <div class="arb-detail-chart-canvas"></div>
            </article>
        `;
    }

    function buildArbDetailProfitPreviewCardHtml() {
        return `
            <article class="arb-detail-profit-card" data-arb-detail-profit-card="true">
                <div class="arb-detail-profit-head">
                    <div>
                        <div class="arb-detail-profit-title">组合收益图</div>
                        <div class="arb-detail-profit-meta">等待价格图表加载完成...</div>
                    </div>
                </div>
                <div class="arb-detail-profit-canvas"></div>
            </article>
        `;
    }

    function getArbDetailProfitCardEl() {
        return arbDetailChartPreview
            ? arbDetailChartPreview.querySelector('[data-arb-detail-profit-card]')
            : null;
    }

    function renderArbDetailProfitPreviewMessage(message) {
        const cardEl = getArbDetailProfitCardEl();
        if (!cardEl) return;
        cardEl.innerHTML = `
            <div class="arb-detail-profit-head">
                <div>
                    <div class="arb-detail-profit-title">组合收益图</div>
                    <div class="arb-detail-profit-meta">${escapeHtml(message)}</div>
                </div>
            </div>
            <div class="arb-detail-chart-message">${escapeHtml(message)}</div>
        `;
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

        cardEl.innerHTML = `
            <div class="arb-detail-profit-head">
                <div>
                    <div class="arb-detail-profit-title">组合收益图</div>
                    <div class="arb-detail-profit-meta">按当前 ${validSeries.length} 张价格图逐时点乘积计算，> 1.0 为正收益。</div>
                </div>
            </div>
            <div class="arb-detail-profit-canvas"></div>
        `;
        const canvasEl = cardEl.querySelector('.arb-detail-profit-canvas');
        const metaEl = cardEl ? cardEl.querySelector('.arb-detail-profit-meta') : null;
        if (!canvasEl) return;

        const chartInstance = renderer.mountProfitHistoryChart(canvasEl, {
            height: 136
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
        const chartHref = current && current.chartHref
            ? current.chartHref
            : (pairs.length ? getChartsUtils().buildChartsPageHref(pairs) : '');

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
        arbDetailChartPreview.innerHTML = `<div class="arb-detail-chart-strip">${pairs.map(buildArbDetailChartPreviewCardHtml).join('')}${buildArbDetailProfitPreviewCardHtml()}</div>`;

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
                    canvasEl.outerHTML = `<div class="arb-detail-chart-message">${escapeHtml(error.message || '图表加载失败')}</div>`;
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
        if (arbDetailFetchController) {
            arbDetailFetchController.abort();
            arbDetailFetchController = null;
        }
        arbDetailState.visible = false;
        arbDetailState.opportunityId = null;
        arbDetailState.selectedOpportunity = null;
        arbDetailState.cards = [];
        arbDetailState.loopToken += 1;
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
        arbDetailState.loopToken += 1;
        arbDetailState.isRefreshing = false;
        arbDetailState.editingInputIndex = null;
        arbDetailState.chartPreviewSignature = '';
        if (arbDetailChartAutoRefreshToggle) {
            arbDetailChartAutoRefreshToggle.checked = true;
        }
        setArbDetailDashboardPause(true);
        renderArbDetailModal(true);
        syncArbDetailChartAutoRefreshTimer();
        startArbDetailLoop(arbDetailState.loopToken);
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

    function restartArbDetailLoop() {
        if (!arbDetailState.visible) return;
        if (arbDetailFetchController) {
            arbDetailFetchController.abort();
            arbDetailFetchController = null;
        }
        arbDetailState.loopToken += 1;
        arbDetailState.isRefreshing = false;
        startArbDetailLoop(arbDetailState.loopToken);
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
        restartArbDetailLoop();
    }

    async function refreshArbDetailCards(runToken) {
        const current = arbDetailState.selectedOpportunity;
        if (!current || !current.cycle) return false;

        const executableLegs = (current.cycle.legs || []).filter(leg => !isRuleLeg(leg));
        if (!executableLegs.length) return false;

        const controller = new AbortController();
        arbDetailFetchController = controller;

        try {
            for (const [cardIndex, card] of arbDetailState.cards.entries()) {
                if (!arbDetailState.visible || arbDetailState.loopToken !== runToken) return;

                const requestVersion = Number(card.requestVersion) || 0;
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
                        skipDelay: true,
                        beforeSourceAttempt: (source) => waitForArbDetailSourceBudget(source, controller.signal)
                    });

                    if (!arbDetailState.visible || arbDetailState.loopToken !== runToken) {
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
                        chain: match.quote.chain,
                        chainLabel: formatChainLabel(match.quote.chain),
                        fromSymbol: data.symbols.from,
                        toSymbol: data.symbols.to,
                        fromTokenAddress: isInverseLeg ? match.quote.toToken : match.quote.fromToken,
                        toTokenAddress: isInverseLeg ? match.quote.fromToken : match.quote.toToken,
                        inputAmount: legInputAmount,
                        amountText: `${formatDetailNumber(data.finalAmountOut)}`,
                        sourceText: data.usedSource || match.quote.preferredSource || 'Unknown'
                    });
                }

                if (shouldSkipApply || !getArbDetailUtils().shouldApplyArbDetailRequestVersion(requestVersion, card.requestVersion)) {
                    continue;
                }

                const summary = getArbDetailUtils().summarizeDetailResult(startAmount, rollingAmount);
                card.rows = rows;
                card.summary = {
                    ...summary,
                    symbol: finalSymbol
                };
                card.error = '';
                renderArbDetailModal();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                for (const card of arbDetailState.cards) {
                    card.rows = [];
                    card.summary = null;
                    card.error = error.message || '详情报价失败';
                }
            }
        } finally {
            if (arbDetailFetchController === controller) {
                arbDetailFetchController = null;
            }
            renderArbDetailModal();
        }

        return true;
    }

    async function startArbDetailLoop(runToken) {
        if (arbDetailState.isRefreshing) return;
        arbDetailState.isRefreshing = true;

        try {
            while (arbDetailState.visible && arbDetailState.loopToken === runToken) {
                const didRefresh = await refreshArbDetailCards(runToken);
                if (!arbDetailState.visible || arbDetailState.loopToken !== runToken) break;
                if (!didRefresh) break;
            }
        } finally {
            if (arbDetailState.loopToken === runToken) {
                arbDetailState.isRefreshing = false;
            }
        }
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

    function handleArbGlobalFilterClear() {
        if (!arbGlobalExcludedSymbolsInput && !arbGlobalExcludedChainsInput) return;
        arbGlobalExcludedSymbolsInput = '';
        arbGlobalExcludedChainsInput = '';
        updateArbPanel();
        if (arbGlobalFilterInput) {
            arbGlobalFilterInput.focus();
        }
    }

    function createPathAlertId() {
        return `path-alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function getPathAlertRuleDefinitions(sourceType) {
        if (window.PathAlertRuleDefinitions && typeof window.PathAlertRuleDefinitions.getRuleDefinitions === 'function') {
            return window.PathAlertRuleDefinitions.getRuleDefinitions(sourceType);
        }
        if (sourceType === 'fixed') return FIXED_PATH_RULES;
        if (sourceType === 'special') return SPECIAL_ARB_RULES;
        return [];
    }

    function buildRuleAlertEvaluation(target) {
        const aliasRules = getAliasRules();
        const allQuotes = getActiveQuotes(dashboardState.flatMap((category) => category.quotes || []));
        const allEdges = window.ArbPaths.buildEdges(allQuotes, quoteMonitorState, null);
        const ruleEdges = window.ArbPaths.buildRuleEdges(aliasRules);
        const allEdgesWithRules = allEdges.concat(ruleEdges);
        const quoteMetaById = buildQuoteMetaById();

        if (target.ruleKind === 'fixed') {
            const rule = getFixedRuleById(target.ruleId);
            if (!rule) return { available: false };
            const cycle = window.ArbPaths.findBestFixedPath(
                (window.ArbFixedUtils && typeof window.ArbFixedUtils.filterEdgesForFixedRule === 'function')
                    ? window.ArbFixedUtils.filterEdgesForFixedRule(rule, allEdgesWithRules, quoteMetaById)
                    : allEdgesWithRules,
                rule,
                aliasRules
            );
            return cycle
                ? { available: true, profitRate: cycle.profitRate, label: rule.title, cycle }
                : { available: false };
        }

        const rule = getSpecialRuleById(target.ruleId);
        if (!rule || !window.ArbSpecialUtils || typeof window.ArbSpecialUtils.buildSpecialArbOpportunities !== 'function') {
            return { available: false };
        }

        const category = dashboardState.find((item) => item && item.name === rule.categoryName);
        if (!category) return { available: false };
        const opportunities = window.ArbSpecialUtils.buildSpecialArbOpportunities({
            rules: [rule],
            quotes: getActiveQuotes(Array.isArray(category.quotes) ? category.quotes : []),
            quoteStateById: quoteMonitorState,
            aliasRules
        });
        const best = opportunities[0];
        return best && best.cycle
            ? { available: true, profitRate: best.cycle.profitRate, label: rule.title, cycle: best.cycle }
            : { available: false };
    }

    function buildPathAlertDraftFromAlert(alert) {
        const normalized = window.PathAlertUtils
            ? window.PathAlertUtils.normalizePathAlert(alert, pathAlertConfig.settings || { defaultCooldownSec: 300 })
            : null;
        if (!normalized) return null;
        return {
            ...normalized,
            target: normalized.target.type === 'path'
                ? { type: 'path', legs: normalized.target.legs.map((leg) => ({ ...leg })) }
                : { ...normalized.target }
        };
    }

    function buildPathAlertDraftFromOpportunity(opportunityId) {
        const entry = arbOpportunityStore.get(opportunityId);
        if (!entry) return null;
        const preset = entry.alertPreset || { type: 'path' };
        const baseDraft = {
            id: '',
            name: `${entry.section || '路径'} ${entry.label || ''}`.trim(),
            enabled: true,
            thresholdBp: '',
            triggerMode: 'immediate',
            confirmDelaySec: 0,
            cooldownSec: pathAlertConfig.settings.defaultCooldownSec,
            delivery: { sound: true, log: true, webhookEnabled: false }
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
                pricingMode: 'raw',
                chain: leg.chain,
                fromSymbol: leg.from,
                toSymbol: leg.to
            }));

        return {
            ...baseDraft,
            target: {
                type: 'path',
                legs
            }
        };
    }

    function formatPathAlertEvaluationText(evaluation) {
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
            return { text: '缺报价', className: 'path-alert-status-unavailable' };
        }
        if (runtime.status === 'pending_confirm') {
            return { text: '待确认', className: 'path-alert-status-pending' };
        }
        if (runtime.status === 'cooldown') {
            return { text: '冷却中', className: 'path-alert-status-cooldown' };
        }
        return { text: '监控中', className: 'path-alert-status-monitoring' };
    }

    function buildPathAlertSummaryLines(alert) {
        if (window.PathAlertUtils && typeof window.PathAlertUtils.buildPathAlertSummaryLines === 'function') {
            return window.PathAlertUtils.buildPathAlertSummaryLines(alert, {
                formatLeg(leg) {
                    const match = findQuoteById(Number(leg.quoteId));
                    const state = match ? quoteMonitorState.get(Number(leg.quoteId)) : null;
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

    function renderPathAlertSummaryLinesHtml(alert) {
        const lines = buildPathAlertSummaryLines(alert);
        if (!lines.length) {
            return '<div class="path-alert-item-route-line">--</div>';
        }
        return lines.map((line) => `<div class="path-alert-item-route-line">${escapeHtml(line)}</div>`).join('');
    }

    function buildPathAlertEvaluationContext() {
        return {
            quoteStateById: quoteMonitorState,
            resolveRuleEvaluation: buildRuleAlertEvaluation
        };
    }

    function formatPathAlertNotificationTitle(evaluation) {
        if (!evaluation || !Number.isFinite(evaluation.profitBp)) {
            return '收益 -- bp';
        }
        return `收益 ${evaluation.profitBp >= 0 ? '+' : ''}${evaluation.profitBp.toFixed(2)} bp`;
    }

    function buildPathAlertNotificationBody(alert) {
        return buildPathAlertSummary(alert) || (alert && alert.name) || '路径报警';
    }

    async function sendPathAlertWebhookNotification(alert, evaluation) {
        if (!pathAlertConfig.settings || pathAlertConfig.settings.webhookEnabled !== true) return;
        try {
            const response = await fetch(`${BACKEND_URL}/api/send-path-alert-webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formatPathAlertNotificationTitle(evaluation),
                    body: buildPathAlertNotificationBody(alert)
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

    function evaluatePathAlertsOnce() {
        if (!window.PathAlertUtils) return;
        const context = buildPathAlertEvaluationContext();
        const activeIds = new Set();
        const nowMs = Date.now();

        for (const alert of (pathAlertConfig.alerts || [])) {
            activeIds.add(alert.id);
            const evaluation = window.PathAlertUtils.evaluatePathAlert(alert, context);
            const previous = pathAlertRuntimeState.get(alert.id) || null;
            const next = window.PathAlertUtils.advancePathAlertRuntime(alert, previous, evaluation, nowMs);
            next.evaluation = evaluation;
            next.isSoundActive = Boolean(next.shouldTrigger && pathAlertConfig.settings && pathAlertConfig.settings.localSoundEnabled !== false);
            if (next.shouldTrigger) {
                const thresholdText = Number.isFinite(Number(alert.thresholdBp)) ? Number(alert.thresholdBp) : 0;
                appendAlertLogEntry(
                    `[路径报警] ${alert.name || '未命名路径'}`,
                    `收益 ${formatPathAlertEvaluationText(evaluation)}，阈值 ${thresholdText}bp`,
                    buildPathAlertSummary(alert)
                );
                sendPathAlertWebhookNotification(alert, evaluation);
            }
            pathAlertRuntimeState.set(alert.id, next);
        }

        for (const alertId of Array.from(pathAlertRuntimeState.keys())) {
            if (!activeIds.has(alertId)) {
                pathAlertRuntimeState.delete(alertId);
            }
        }

        updateAlertSoundState();
        renderPathAlertPanel();
    }

    function restartPathAlertScheduler() {
        if (pathAlertEvalTimer) clearInterval(pathAlertEvalTimer);
        pathAlertEvalTimer = null;
        const intervalMs = Number(pathAlertConfig?.settings?.pathAlertEvalIntervalMs);
        if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;
        pathAlertEvalTimer = setInterval(evaluatePathAlertsOnce, intervalMs);
        evaluatePathAlertsOnce();
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

    function openPathAlertModal(prefill = null) {
        pathAlertEditorState.visible = true;
        const draft = prefill ? buildPathAlertDraftFromAlert(prefill) : null;
        const nextDraft = draft || {
            id: '',
            name: '',
            enabled: true,
            thresholdBp: '',
            triggerMode: 'immediate',
            confirmDelaySec: 0,
            cooldownSec: pathAlertConfig.settings.defaultCooldownSec,
            delivery: { sound: true, log: true, webhookEnabled: false },
            target: { type: 'path', legs: [] }
        };
        pathAlertEditorState.editingId = nextDraft.id || '';
        pathAlertEditorState.sourceType = nextDraft.target.type === 'rule' ? nextDraft.target.ruleKind : 'path';
        pathAlertEditorState.selectedRuleId = nextDraft.target.type === 'rule' ? nextDraft.target.ruleId : '';
        pathAlertEditorState.searchQuery = '';
        pathAlertEditorState.draftLegs = nextDraft.target.type === 'path'
            ? nextDraft.target.legs.map((leg) => ({ ...leg }))
            : [];

        pathAlertModalTitle.textContent = nextDraft.id ? '编辑路径报警' : '添加路径报警';
        pathAlertNameInput.value = nextDraft.name || '';
        pathAlertThresholdBpInput.value = nextDraft.thresholdBp === '' ? '' : nextDraft.thresholdBp;
        pathAlertTriggerModeSelect.value = nextDraft.triggerMode || 'immediate';
        pathAlertConfirmDelayInput.value = nextDraft.confirmDelaySec || 0;
        pathAlertCooldownInput.value = nextDraft.cooldownSec || pathAlertConfig.settings.defaultCooldownSec;
        pathAlertEnabledInput.checked = nextDraft.enabled !== false;
        renderPathAlertModal();
        pathAlertModal.classList.add('visible');
    }

    function closePathAlertModal() {
        pathAlertEditorState.visible = false;
        pathAlertModal.classList.remove('visible');
    }

    function renderPathAlertRuleChoices() {
        if (!pathAlertRuleList) return;
        const rules = getPathAlertRuleDefinitions(pathAlertEditorState.sourceType);
        pathAlertRuleList.innerHTML = rules.length
            ? rules.map((rule) => `
                <button
                    type="button"
                    class="path-alert-rule-chip${pathAlertEditorState.selectedRuleId === rule.id ? ' active' : ''}"
                    data-path-alert-rule-id="${escapeHtml(rule.id)}"
                >${escapeHtml(rule.title)}</button>
            `).join('')
            : '<div class="path-alert-empty">暂无可选规则</div>';
    }

    function renderPathAlertCandidateList() {
        if (!pathAlertCandidateList) return;
        const selectedKeys = new Set(pathAlertEditorState.draftLegs.map((leg) => `${leg.quoteId}:${leg.direction}:${leg.pricingMode}`));
        const candidates = buildPathAlertQuoteCandidates()
            .filter((candidate) => matchesPathAlertCandidate(candidate, pathAlertEditorState.searchQuery))
            .slice(0, 80);
        pathAlertCandidateList.innerHTML = candidates.length
            ? candidates.map((candidate) => {
                const key = `${candidate.quoteId}:${candidate.direction}:${candidate.pricingMode}`;
                return `
                    <div class="path-alert-candidate-item">
                        <div class="path-alert-candidate-text">${escapeHtml(candidate.label)}</div>
                        <button
                            type="button"
                            class="path-alert-candidate-add"
                            data-path-alert-candidate-key="${escapeHtml(candidate.key)}"
                            ${selectedKeys.has(key) ? 'disabled' : ''}
                        >添加</button>
                    </div>
                `;
            }).join('')
            : '<div class="path-alert-empty">没有匹配的报价腿</div>';
    }

    function renderPathAlertSelectedLegs() {
        if (!pathAlertSelectedLegs) return;
        if (pathAlertEditorState.sourceType === 'path') {
            pathAlertSelectedLegs.innerHTML = pathAlertEditorState.draftLegs.length
                ? pathAlertEditorState.draftLegs.map((leg, index) => `
                    <div class="path-alert-leg-item">
                        <div class="path-alert-leg-text">${escapeHtml(buildLiveQuoteLabel(leg.chain, leg.fromSymbol, leg.toSymbol))}</div>
                        <div class="path-alert-leg-actions">
                            <button type="button" class="path-alert-leg-action" data-path-alert-leg-move="up" data-path-alert-leg-index="${index}">↑</button>
                            <button type="button" class="path-alert-leg-action" data-path-alert-leg-move="down" data-path-alert-leg-index="${index}">↓</button>
                            <button type="button" class="path-alert-leg-action" data-path-alert-leg-remove="${index}">删</button>
                        </div>
                    </div>
                `).join('')
                : '<div class="path-alert-empty">还没有添加路径腿</div>';
        } else {
            const rule = getPathAlertRuleDefinitions(pathAlertEditorState.sourceType)
                .find((item) => item.id === pathAlertEditorState.selectedRuleId);
            pathAlertSelectedLegs.innerHTML = rule
                ? `<div class="path-alert-rule-item"><div class="path-alert-rule-text">${escapeHtml(rule.title)}</div></div>`
                : '<div class="path-alert-empty">请选择一条规则</div>';
        }

        const previewAlert = collectPathAlertFromEditor(false);
        if (!previewAlert || !window.PathAlertUtils) {
            pathAlertPreview.textContent = '当前收益: --';
            return;
        }
        const evaluation = window.PathAlertUtils.evaluatePathAlert(previewAlert, buildPathAlertEvaluationContext());
        pathAlertPreview.textContent = `当前收益: ${formatPathAlertEvaluationText(evaluation)} | ${buildPathAlertSummary(previewAlert) || '--'}`;
    }

    function renderPathAlertModal() {
        if (!pathAlertModal) return;
        const isPath = pathAlertEditorState.sourceType === 'path';
        if (pathAlertPathEditor) pathAlertPathEditor.style.display = isPath ? '' : 'none';
        if (pathAlertRuleEditor) pathAlertRuleEditor.style.display = isPath ? 'none' : '';
        if (pathAlertSearchInput && pathAlertSearchInput.value !== pathAlertEditorState.searchQuery) {
            pathAlertSearchInput.value = pathAlertEditorState.searchQuery;
        }
        if (pathAlertConfirmDelayInput) {
            pathAlertConfirmDelayInput.disabled = window.PathAlertUtils
                ? window.PathAlertUtils.isPathAlertConfirmDelayDisabled(pathAlertTriggerModeSelect && pathAlertTriggerModeSelect.value)
                : !(pathAlertTriggerModeSelect && pathAlertTriggerModeSelect.value === 'delayed');
        }
        document.querySelectorAll('.path-alert-type-tab').forEach((button) => {
            button.classList.toggle('active', button.dataset.pathAlertType === pathAlertEditorState.sourceType);
        });
        renderPathAlertCandidateList();
        renderPathAlertRuleChoices();
        renderPathAlertSelectedLegs();
    }

    function collectPathAlertFromEditor(strict = true) {
        const sourceType = pathAlertEditorState.sourceType;
        const baseAlert = {
            id: pathAlertEditorState.editingId || createPathAlertId(),
            name: pathAlertNameInput.value.trim(),
            enabled: pathAlertEnabledInput.checked,
            thresholdBp: pathAlertThresholdBpInput.value === '' ? '' : Number(pathAlertThresholdBpInput.value),
            triggerMode: pathAlertTriggerModeSelect.value === 'delayed' ? 'delayed' : 'immediate',
            confirmDelaySec: Number(pathAlertConfirmDelayInput.value || 0),
            cooldownSec: Number(pathAlertCooldownInput.value || pathAlertConfig.settings.defaultCooldownSec),
            delivery: { sound: true, log: true, webhookEnabled: false },
            target: null
        };

        if (sourceType === 'path') {
            if (!pathAlertEditorState.draftLegs.length) return null;
            baseAlert.target = {
                type: 'path',
                legs: pathAlertEditorState.draftLegs.map((leg) => ({ ...leg }))
            };
        } else {
            if (!pathAlertEditorState.selectedRuleId) return null;
            baseAlert.target = {
                type: 'rule',
                ruleKind: sourceType,
                ruleId: pathAlertEditorState.selectedRuleId
            };
        }

        return window.PathAlertUtils
            ? window.PathAlertUtils.normalizePathAlert(baseAlert, pathAlertConfig.settings)
            : baseAlert;
    }

    function renderPathAlertPanel() {
        if (!pathAlertContent) return;
        const alerts = Array.isArray(pathAlertConfig.alerts) ? pathAlertConfig.alerts : [];
        const settings = pathAlertConfig.settings || {};
        const toolbar = `
            <div class="path-alert-toolbar">
                <button type="button" id="path-alert-reload-btn" ${pathAlertReloading ? 'disabled' : ''}>${pathAlertReloading ? '重新加载中...' : '重新加载'}</button>
                <div class="path-alert-toolbar-meta">
                    <label class="path-alert-toolbar-toggle">
                        <input type="checkbox" data-path-alert-global-toggle="localSoundEnabled" ${settings.localSoundEnabled !== false ? 'checked' : ''}>
                        <span>音效</span>
                    </label>
                    <label class="path-alert-toolbar-toggle">
                        <input type="checkbox" data-path-alert-global-toggle="webhookEnabled" ${settings.webhookEnabled === true ? 'checked' : ''}>
                        <span>远程</span>
                    </label>
                    <div class="path-alert-toolbar-cycle">周期 ${settings.pathAlertEvalIntervalMs}ms</div>
                </div>
            </div>
        `;
        if (!alerts.length) {
            pathAlertContent.innerHTML = `${toolbar}<div class="path-alert-empty">暂无路径报警</div>`;
            return;
        }

        const items = alerts.map((alert) => {
            const runtime = pathAlertRuntimeState.get(alert.id) || null;
            const evaluation = runtime && runtime.evaluation ? runtime.evaluation : null;
            const statusInfo = getPathAlertStatusInfo(alert, runtime);
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
                            <div class="path-alert-item-title">${escapeHtml(alert.name || '未命名路径')}</div>
                            <div class="path-alert-item-route">${renderPathAlertSummaryLinesHtml(alert)}</div>
                            <div class="path-alert-item-meta">阈值 ${escapeHtml(String(alert.thresholdBp))}bp | ${alert.triggerMode === 'delayed' ? `延迟 ${escapeHtml(String(alert.confirmDelaySec))}s` : '立即'} | 冷却 ${escapeHtml(String(alert.cooldownSec))}s</div>
                        </div>
                        <div class="path-alert-item-actions">
                            <a
                                class="path-alert-item-link"
                                href="${escapeHtml(editHref)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                data-path-alert-edit-link="${escapeHtml(alert.id)}"
                            >编辑</a>
                        </div>
                    </div>
                    <div class="path-alert-status-row">
                        <span class="path-alert-status-tag ${statusInfo.className}">${statusInfo.text}</span>
                        <span class="path-alert-profit">${formatPathAlertEvaluationText(evaluation)}</span>
                    </div>
                    <div class="path-alert-item-meta">上次报警: ${escapeHtml(lastTriggeredText)}</div>
                </div>
            `;
        }).join('');

        pathAlertContent.innerHTML = `${toolbar}<div class="path-alert-list">${items}</div>`;
    }

    function togglePathAlertPanel() {
        if (!pathAlertWindow) return;
        pathAlertPanelHidden = !pathAlertPanelHidden;
        pathAlertWindow.style.display = pathAlertPanelHidden ? 'none' : 'flex';
    }

    function togglePathAlertPanelCollapsed() {
        if (!pathAlertWindow || pathAlertPanelHidden) return;
        pathAlertPanelCollapsed = !pathAlertPanelCollapsed;
        pathAlertWindow.classList.toggle('collapsed', pathAlertPanelCollapsed);
        if (pathAlertMinBtn) {
            pathAlertMinBtn.textContent = pathAlertPanelCollapsed ? '＋' : '－';
            pathAlertMinBtn.title = pathAlertPanelCollapsed ? '展开' : '折叠';
        }
    }

    function handlePathAlertPanelChange(event) {
        const toggle = event.target.closest('[data-path-alert-global-toggle]');
        if (!toggle || !pathAlertConfig.settings) return;
        const key = toggle.dataset.pathAlertGlobalToggle;
        if (!key) return;
        pathAlertConfig.settings[key] = toggle.checked;
        queuePathAlertConfigSave();
        updateAlertSoundState();
    }

    function handlePathAlertPanelClick(event) {
        const reloadBtn = event.target.closest('#path-alert-reload-btn');
        if (!reloadBtn) return;
        reloadPathAlertConfigFromServer().catch((error) => {
            console.error('重新加载路径报警配置失败:', error);
        });
    }

    async function reloadPathAlertConfigFromServer() {
        if (pathAlertReloading) return;
        pathAlertReloading = true;
        renderPathAlertPanel();
        try {
            await loadPathAlertConfig({ fallbackToDefault: false });
            pathAlertRuntimeState = new Map();
            restartPathAlertScheduler();
        } finally {
            pathAlertReloading = false;
            renderPathAlertPanel();
        }
    }

    function handlePathAlertTypeTabClick(event) {
        const tabBtn = event.target.closest('[data-path-alert-type]');
        if (!tabBtn) return;
        pathAlertEditorState.sourceType = tabBtn.dataset.pathAlertType;
        pathAlertEditorState.selectedRuleId = '';
        renderPathAlertModal();
    }

    function handlePathAlertModalClick(event) {
        const candidateBtn = event.target.closest('[data-path-alert-candidate-key]');
        if (candidateBtn) {
            const candidate = buildPathAlertQuoteCandidates()
                .find((item) => item.key === candidateBtn.dataset.pathAlertCandidateKey);
            if (!candidate) return;
            pathAlertEditorState.draftLegs.push({
                quoteId: candidate.quoteId,
                direction: candidate.direction,
                pricingMode: candidate.pricingMode,
                chain: candidate.chain,
                fromSymbol: candidate.fromSymbol,
                toSymbol: candidate.toSymbol
            });
            renderPathAlertModal();
            return;
        }

        const removeBtn = event.target.closest('[data-path-alert-leg-remove]');
        if (removeBtn) {
            const index = Number(removeBtn.dataset.pathAlertLegRemove);
            if (Number.isFinite(index)) {
                pathAlertEditorState.draftLegs.splice(index, 1);
                renderPathAlertModal();
            }
            return;
        }

        const moveBtn = event.target.closest('[data-path-alert-leg-move]');
        if (moveBtn) {
            const index = Number(moveBtn.dataset.pathAlertLegIndex);
            const direction = moveBtn.dataset.pathAlertLegMove;
            if (!Number.isFinite(index)) return;
            const nextIndex = direction === 'up' ? index - 1 : index + 1;
            if (nextIndex < 0 || nextIndex >= pathAlertEditorState.draftLegs.length) return;
            const legs = pathAlertEditorState.draftLegs;
            [legs[index], legs[nextIndex]] = [legs[nextIndex], legs[index]];
            renderPathAlertModal();
            return;
        }

        const ruleBtn = event.target.closest('[data-path-alert-rule-id]');
        if (ruleBtn) {
            pathAlertEditorState.selectedRuleId = ruleBtn.dataset.pathAlertRuleId;
            if (!pathAlertNameInput.value.trim()) {
                const rule = getPathAlertRuleDefinitions(pathAlertEditorState.sourceType)
                    .find((item) => item.id === pathAlertEditorState.selectedRuleId);
                if (rule) {
                    pathAlertNameInput.value = rule.title;
                }
            }
            renderPathAlertModal();
            return;
        }

        if (event.target === pathAlertModal || event.target === pathAlertCancelBtn) {
            closePathAlertModal();
            return;
        }

        if (event.target === pathAlertSaveBtn) {
            const nextAlert = collectPathAlertFromEditor(true);
            if (!nextAlert) {
                window.alert(pathAlertEditorState.sourceType === 'path' ? '请至少添加一条路径腿' : '请选择一条规则');
                return;
            }
            if (!nextAlert.name) {
                window.alert('请填写路径报警名称');
                return;
            }
            const existingIndex = pathAlertConfig.alerts.findIndex((item) => item.id === nextAlert.id);
            if (existingIndex >= 0) pathAlertConfig.alerts.splice(existingIndex, 1, nextAlert);
            else pathAlertConfig.alerts.push(nextAlert);
            closePathAlertModal();
            queuePathAlertConfigSave();
            evaluatePathAlertsOnce();
        }
    }

    function updateArbPanel() {
        if (!arbPathContent) return;
        if (!window.ArbPaths) {
            arbPathContent.textContent = '路径模块未加载';
            return;
        }
        if (!window.ArbPanelRenderer || typeof window.ArbPanelRenderer.renderArbGrid !== 'function') {
            arbPathContent.textContent = '路径渲染模块未加载';
            return;
        }

        const targetNames = ['WBTC监控', 'LBTC监控', 'TBTC监控'];
        const targetCategories = dashboardState.filter(c => targetNames.includes(c.name));
        if (!targetCategories.length) {
            arbPathContent.textContent = '暂无可用路径';
            return;
        }

        const aliasRules = getAliasRules();
        const preferredCycleStartSymbols = buildPreferredCycleStartSymbols(aliasRules, 'cbBTC');
        const allQuotes = getActiveQuotes(dashboardState.flatMap(c => c.quotes || []));
        const allEdges = window.ArbPaths.buildEdges(allQuotes, quoteMonitorState, null);
        const ruleEdges = window.ArbPaths.buildRuleEdges(aliasRules);
        const allEdgesWithRules = allEdges.concat(ruleEdges);
        const nextOpportunityMap = new Map();
        const quoteMetaById = buildQuoteMetaById();

        const fixedSections = [{
            title: '固定路径',
            opportunities: FIXED_PATH_RULES
                .map(rule => createArbOpportunityEntry(
                    nextOpportunityMap,
                    window.ArbPaths.findBestFixedPath(
                        (window.ArbFixedUtils && typeof window.ArbFixedUtils.filterEdgesForFixedRule === 'function')
                            ? window.ArbFixedUtils.filterEdgesForFixedRule(rule, allEdgesWithRules, quoteMetaById)
                            : allEdgesWithRules,
                        rule,
                        aliasRules
                    ),
                    rule.title,
                    { section: 'fixed', alertPreset: { type: 'rule', ruleKind: 'fixed', ruleId: rule.id } }
                ))
                .filter(Boolean)
        }];
        const wbtcCategory = targetCategories.find((category) => category && category.name === 'WBTC监控');
        const specialSections = [{
            title: '特殊规则',
            opportunities: (window.ArbSpecialUtils && typeof window.ArbSpecialUtils.buildSpecialArbOpportunities === 'function' && wbtcCategory)
                ? window.ArbSpecialUtils.buildSpecialArbOpportunities({
                    rules: SPECIAL_ARB_RULES.filter((rule) => rule.categoryName === wbtcCategory.name),
                    quotes: getActiveQuotes(Array.isArray(wbtcCategory.quotes) ? wbtcCategory.quotes : []),
                    quoteStateById: quoteMonitorState,
                    aliasRules
                }).filter((opportunity) => opportunity && opportunity.cycle && opportunity.cycle.profitRate > 0)
                .map((opportunity) => createArbOpportunityEntry(
                    nextOpportunityMap,
                    opportunity.cycle,
                    opportunity.label,
                    {
                        section: `special:${wbtcCategory.name}`,
                        clickable: false,
                        alertPreset: { type: 'rule', ruleKind: 'special', ruleId: opportunity.ruleId || '' }
                    }
                )).filter(Boolean)
                : [],
            emptyText: '暂无可用规则'
        }];

        const categorySections = [];
        let lbtcSection = null;
        for (const category of targetCategories) {
            const quotes = getActiveQuotes(Array.isArray(category.quotes) ? category.quotes : []);
            const edges = window.ArbPaths.buildEdges(quotes, quoteMonitorState, null);
            const sectionKey = buildArbSectionKey('category', category.id || category.name);
            const cycles = window.ArbPaths.findTopCycles(edges.concat(ruleEdges), {
                maxDepth: 3,
                limit: Number.MAX_SAFE_INTEGER,
                acceptCycle: window.ArbPaths.isMeaningfulPath,
                preferredStartSymbols: preferredCycleStartSymbols
            });
            const cycleDisplayState = getCycleDisplayState(cycles, 4, arbExpandedSections.has(sectionKey));
            const footerHtml = buildArbSectionToggleHtml(sectionKey, cycleDisplayState);
            const sectionDef = {
                title: category.name,
                opportunities: cycleDisplayState.displayCycles
                    .map((cycle, index) => createArbOpportunityEntry(
                        nextOpportunityMap,
                        cycle,
                        `机会 ${index + 1}`,
                        { section: category.name, alertPreset: { type: 'path' } }
                    ))
                    .filter(Boolean),
                footerHtml
            };
            if (category.name === 'LBTC监控') {
                lbtcSection = sectionDef;
            } else {
                categorySections.push(sectionDef);
            }
        }

        const globalSectionKey = buildArbSectionKey('global', 'all');
        const globalCycles = window.ArbPaths.findTopCycles(allEdgesWithRules, {
            maxDepth: 3,
            limit: Number.MAX_SAFE_INTEGER,
            acceptCycle: window.ArbPaths.isMeaningfulPath,
            preferredStartSymbols: preferredCycleStartSymbols
        });
        const excludedSymbols = parseArbFilterInput(arbGlobalExcludedSymbolsInput);
        const excludedChains = Array.from(new Set(
            parseArbFilterInput(arbGlobalExcludedChainsInput)
                .map(normalizeArbChainFilterToken)
                .filter(Boolean)
        ));
        const hasGlobalFilter = excludedSymbols.length || excludedChains.length;
        const filteredGlobalCycles = hasGlobalFilter
            ? globalCycles.filter(cycle =>
                !cycleContainsAnySymbols(cycle, excludedSymbols) &&
                !cycleContainsAnyChains(cycle, excludedChains)
            )
            : globalCycles;
        updateGlobalArbFilterBar();
        const globalCycleDisplayState = getCycleDisplayState(filteredGlobalCycles, 8, arbExpandedSections.has(globalSectionKey));
        const globalFooterHtml = buildArbSectionToggleHtml(globalSectionKey, globalCycleDisplayState);
        const globalEmptyText = hasGlobalFilter ? '过滤后暂无路径' : '等待数据...';
        const columns = [
            lbtcSection ? fixedSections.concat(specialSections, [lbtcSection]) : fixedSections.concat(specialSections),
            categorySections,
            [{
                title: '全局路径',
                opportunities: globalCycleDisplayState.displayCycles
                    .map((cycle, index) => createArbOpportunityEntry(
                        nextOpportunityMap,
                        cycle,
                        `机会 ${index + 1}`,
                        { section: '全局路径', alertPreset: { type: 'path' } }
                    ))
                    .filter(Boolean),
                footerHtml: globalFooterHtml,
                emptyText: globalEmptyText
            }]
        ];

        arbOpportunityMap = nextOpportunityMap;

        arbPathContent.innerHTML = window.ArbPanelRenderer.renderArbGrid({
            columns,
            isMeaningfulPath: cycle => cycle && window.ArbPaths.isMeaningfulPath(cycle.legs),
            shouldIncludeLeg: leg => !isRuleLeg(leg),
            formatChainLabel,
            formatLegLine: formatArbPathLegLine,
            formatProfit: profitRate => window.ArbPaths.formatProfitWanfen(profitRate)
        });
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
        const requestQuote = isInverseFetch
            ? { ...quote, fromToken: quote.toToken, toToken: quote.fromToken, amount: requestedAmount }
            : { ...quote, amount: requestedAmount };
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
            const previousState = quoteMonitorState.get(quote.id) || {};
            applyPausedQuoteUiState(quote, previousState, previousState);
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

            const previousState = quoteMonitorState.get(quote.id) || {};
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
                        inverseFromSymbol: data.symbols.from,
                        inverseToSymbol: data.symbols.to
                    };
                    quoteMonitorState.set(quote.id, inverseState);
                    bindCopyHandler(
                        inverseEl,
                        () => inverseEl.textContent,
                        () => ({
                            chain: quote.chain,
                            fromSymbol: (quoteMonitorState.get(quote.id) || {}).inverseFromSymbol || '',
                            toSymbol: (quoteMonitorState.get(quote.id) || {}).inverseToSymbol || '',
                            normalizedPrice: (quoteMonitorState.get(quote.id) || {}).inverseRawPrice
                        })
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
                    cexOrderbook: data.cexOrderbook || null,
                    usedSource: data.usedSource,
                    usedSourceReal: successSource
                };

                quoteTextEl.textContent = data.resultText;
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
                    newState.inverseFromSymbol = null;
                    newState.inverseToSymbol = null;
                }

                quoteMonitorState.set(quote.id, newState);
                scheduleArbUpdate();
                
                if (currentlyEditingQuote && currentlyEditingQuote.quote.id === quote.id && alertModal.classList.contains('visible')) {
                     const modalPriceEl = document.getElementById('alert-current-price-value');
                     if (modalPriceEl) {
                         modalPriceEl.textContent = data.rawPrice.toFixed(6);
                     }
                }

                updateTrendArrow(quote.id, data.rawPrice, oldPrice, successSource, oldSource);
                checkPriceForAlerts(quote, data.rawPrice, data.finalAmountOut);
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
        if (window.QuoteCalculator && typeof window.QuoteCalculator.extractPriceFromText === 'function') {
            return window.QuoteCalculator.extractPriceFromText(text);
        }
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

    function formatCalculatorProduct(product, count) {
        if (typeof product !== 'number' || Number.isNaN(product)) return '--';
        if (count <= 1) return product.toFixed(6);
        return product.toFixed(10).replace(/\.?0+$/, '');
    }

    function renderCalculatorPanel() {
        if (!calcContent) return;
        if (!calculatorEntries.length) {
            calcContent.innerHTML = '<div class="calc-empty">点击报价价格后会显示在这里</div>';
            return;
        }

        const entryLines = calculatorEntries.map((entry) => {
            const lineText = window.QuoteCalculator
                ? window.QuoteCalculator.formatCalculatorEntry(entry)
                : `${entry.chainLabel} ${entry.fromSymbol} -> ${entry.toSymbol} ${entry.price.toFixed(6)}`;
            return `<div class="calc-line">${lineText}</div>`;
        }).join('');

        const product = window.QuoteCalculator
            ? window.QuoteCalculator.calculateProduct(calculatorEntries)
            : calculatorEntries.reduce((acc, item) => acc * item.price, 1);

        calcContent.innerHTML = `${entryLines}<div class="calc-footer">乘积: ${formatCalculatorProduct(product, calculatorEntries.length)}</div>`;
    }

    function addToCalculator(details, clickedPrice) {
        if (!details) return;
        const normalizedPrice = Number(details.normalizedPrice);
        const calculatorPrice = Number.isFinite(normalizedPrice) ? normalizedPrice : clickedPrice;
        if (typeof calculatorPrice !== 'number' || Number.isNaN(calculatorPrice)) return;
        const entryInput = {
            chainLabel: formatChainLabel(details.chain),
            fromSymbol: details.fromSymbol || '',
            toSymbol: details.toSymbol || '',
            price: calculatorPrice
        };
        const entry = (window.QuoteCalculator && window.QuoteCalculator.buildCalculatorEntry)
            ? window.QuoteCalculator.buildCalculatorEntry(entryInput)
            : entryInput;
        if (!entry || !entry.fromSymbol || !entry.toSymbol) return;

        calculatorEntries.push(entry);
        if (calcWindow && calcWindow.style.display === 'none') {
            calcWindow.style.display = 'flex';
        }
        renderCalculatorPanel();
    }

    function copyPriceFromText(text, details) {
        const price = extractPriceFromText(text);
        if (typeof price !== 'number' || Number.isNaN(price)) return;
        copyTextToClipboard(String(price));
        showCopyToast(`已复制: ${price}`);
        addToCalculator(details, price);
    }

    function bindCopyHandler(targetEl, getText, getDetails) {
        if (!targetEl || targetEl.dataset.copyBound) return;
        targetEl.dataset.copyBound = '1';
        targetEl.addEventListener('click', (event) => {
            event.stopPropagation();
            const text = typeof getText === 'function' ? getText() : targetEl.textContent;
            const details = typeof getDetails === 'function' ? getDetails() : null;
            copyPriceFromText(text, details);
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
        const state = quoteMonitorState.get(quoteId);
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

        const state = quoteMonitorState.get(quoteId) || {};
        
        if (state.trendTimer) clearTimeout(state.trendTimer);

        arrowEl.classList.remove('visible');
        
        void arrowEl.offsetWidth; 

        if (currentPrice > oldPrice) {
            arrowEl.innerHTML = '&#8593;&#8593;&#8593;'; 
            arrowEl.className = 'trend-arrow trend-up visible';
        } else {
            arrowEl.innerHTML = '&#8595;&#8595;&#8595;'; 
            arrowEl.className = 'trend-arrow trend-down visible';
        }

        state.trendTimer = setTimeout(() => {
            arrowEl.classList.remove('visible');
        }, 30000);
        
        quoteMonitorState.set(quoteId, state);
    }

    function toggleArbPanel() {
        if (!arbPathWindow) return;
        const isHidden = window.getComputedStyle(arbPathWindow).display === 'none';
        arbPathWindow.style.display = isHidden ? 'flex' : 'none';
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
        if (key === 'a') {
            event.preventDefault();
            togglePathAlertPanel();
            return;
        }
        if (key === 'c') {
            event.preventDefault();
            toggleCalcPanel();
            return;
        }
        if (key === 'r') {
            event.preventDefault();
            resetCalculator();
        }
    }

    function toggleCalcPanel() {
        if (!calcWindow) return;
        const isHidden = window.getComputedStyle(calcWindow).display === 'none';
        calcWindow.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) renderCalculatorPanel();
    }

    function resetCalculator() {
        calculatorEntries = [];
        renderCalculatorPanel();
    }

    function setArbPanelMaxHeight() {
        if (!arbPathWindow) return;
        const topBar = document.getElementById('top-bar');
        const bannerHeight = topBar ? topBar.getBoundingClientRect().height : 0;
        const padding = 20 * 2;
        const maxHeight = Math.max(200, window.innerHeight - bannerHeight - padding);
        arbPathWindow.style.height = `${maxHeight}px`;
    }

    function checkPriceForAlerts(quote, newRawPrice, newTotalAmountOut) {
        if (isQuotePaused(quote)) return;
        if (!quote.alerts || typeof newRawPrice !== 'number') return; 

        const basePrice = quote.alerts.basePrice;
        const state = quoteMonitorState.get(quote.id) || {};
        let alertMessage = null;
        let isNowTriggered = false;

        if (typeof basePrice === 'number' && basePrice > 0) {
            const percentageChange = ((newRawPrice - basePrice) / basePrice) * 100;
            if (quote.alerts.percentUp && percentageChange >= quote.alerts.percentUp) {
                alertMessage = `价格相比基准(${basePrice.toFixed(6)}) 上涨 ${percentageChange.toFixed(3)}% (>${quote.alerts.percentUp}%)`;
                isNowTriggered = true;
            } else if (quote.alerts.percentDown && percentageChange <= -quote.alerts.percentDown) {
                alertMessage = `价格相比基准(${basePrice.toFixed(6)}) 下跌 ${Math.abs(percentageChange).toFixed(3)}% (>${quote.alerts.percentDown}%)`;
                isNowTriggered = true;
            }
        }
       
        if (typeof newTotalAmountOut === 'number') {
            if (quote.alerts.targetAbove) {
                if (newTotalAmountOut >= quote.alerts.targetAbove) {
                    if (!alertMessage) alertMessage = `总价已达到或超过目标 ${quote.alerts.targetAbove}`;
                    isNowTriggered = true;
                }
            }
            if (quote.alerts.targetBelow) {
                if (newTotalAmountOut <= quote.alerts.targetBelow) {
                    if (!alertMessage) alertMessage = `总价已达到或低于目标 ${quote.alerts.targetBelow}`;
                    isNowTriggered = true;
                }
            }
        }

        const itemEl = document.getElementById(`quote-item-${quote.id}`);
        const resultDiv = itemEl ? itemEl.querySelector('.quote-result') : null;

        if (isNowTriggered) {
            state.hasUnreadAlert = true;
            state.isSoundActive = true;
            
            if (itemEl) {
                itemEl.classList.add('highlight');
                itemEl.classList.remove('highlight-past');
            }

            if (!state.logShown && alertMessage) {
                triggerAlert(quote, alertMessage);
                state.logShown = true;
            }
        } else {
            state.isSoundActive = false;
            
            if (itemEl) {
                itemEl.classList.remove('highlight');
                if (state.hasUnreadAlert) {
                    itemEl.classList.add('highlight-past');
                } else {
                    itemEl.classList.remove('highlight-past');
                }
            }
            state.logShown = false;
        }

        if (resultDiv && !resultDiv.querySelector('.dismiss-highlight-btn')) {
            if (state.hasUnreadAlert) {
                const dismissBtn = document.createElement('button');
                dismissBtn.className = 'icon-btn dismiss-highlight-btn';
                dismissBtn.title = '确认报警/清除状态';
                dismissBtn.dataset.dismissHighlightId = quote.id;
                dismissBtn.innerHTML = '✔️';
                const settingsBtn = resultDiv.querySelector('[data-edit-alert-id]');
                if (settingsBtn) settingsBtn.parentElement.insertBefore(dismissBtn, settingsBtn);
            }
        } else if (resultDiv && !state.hasUnreadAlert) {
            const dismissBtn = resultDiv.querySelector('.dismiss-highlight-btn');
            if (dismissBtn) dismissBtn.remove();
        }

        quoteMonitorState.set(quote.id, state);
        updateAlertSoundState();
    }

    function triggerAlert(quote, message) {
        const displayName = CHAIN_DISPLAY_NAMES[quote.chain] || quote.chain;
        const monitorState = quoteMonitorState.get(quote.id) || {};
        let label = isCexOrderbookChain(quote.chain) ? quote.symbol : 
                    (monitorState.fromSymbol && monitorState.toSymbol ? `${monitorState.fromSymbol}/${monitorState.toSymbol}` : 
                    `${quote.fromToken.slice(0,4)}.../${quote.toToken.slice(0,4)}...`);
        appendAlertLogEntry(displayName, message, label);
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
        const displayName = CHAIN_DISPLAY_NAMES[quote.chain] || quote.chain;
        const monitorState = quoteMonitorState.get(quote.id) || {};
        const lastResultText = getQuoteDisplayText(quote, monitorState);
        const itemEl = document.createElement('li');
        itemEl.id = `quote-item-${quote.id}`;
        itemEl.className = isQuotePaused(quote) ? 'quote-item quote-item-paused' : 'quote-item';
        const initialAmount = quote.amount || 1;
        const amountInputHTML = !isCexOrderbookChain(quote.chain) ? `<input type="number" class="amount-input" value="${initialAmount}" step="any" min="0" data-category-id="${categoryId}" data-quote-id="${quote.id}">` : '';
        const quoteTextClassName = isCexOrderbookChain(quote.chain) ? 'quote-text cex-orderbook-summary' : 'quote-text';
        const pairLabelHtml = `<span class="quote-pair-label" id="quote-pair-label-${quote.id}">${escapeHtml(getQuotePairLabel(quote, monitorState))}</span>`;
        const pauseButtonTitle = isQuotePaused(quote) ? '恢复' : '暂停';
        const pauseButtonIcon = isQuotePaused(quote) ? '▶️' : '⏸️';
        
        itemEl.innerHTML = `
            <div class="quote-left-container">
                <span class="quote-label-stack">
                    <span class="quote-label">${displayName}</span>
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
        
        const textWrapper = itemEl.querySelector('.quote-text-wrapper');
        if (textWrapper) {
            textWrapper.addEventListener('mouseenter', (e) => handleQuoteHover(e, quote.id));
            textWrapper.addEventListener('mousedown', (e) => e.stopPropagation());
            textWrapper.setAttribute('draggable', 'false'); 
            const quoteTextEl = itemEl.querySelector(`#quote-text-${quote.id}`);
            bindCopyHandler(
                textWrapper,
                () => (quoteTextEl ? quoteTextEl.textContent : textWrapper.textContent),
                () => {
                    const state = quoteMonitorState.get(quote.id) || {};
                    return {
                        chain: quote.chain,
                        fromSymbol: state.fromSymbol || '',
                        toSymbol: state.toSymbol || '',
                        normalizedPrice: state.lastRawPrice
                    };
                }
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
                <div class="quote-actions">
                    <button class="icon-btn" title="${categoryPauseTitle}" aria-label="${categoryPauseTitle}" aria-pressed="${categoryPauseAction === 'resume' ? 'true' : 'false'}" data-toggle-category-pause-id="${category.id}" data-category-id="${category.id}">${categoryPauseIcon}</button>
                    <button class="icon-btn delete-btn" title="删除分区" data-category-id="${category.id}">×</button>
                </div>
            </div>
            <ul class="quote-list" id="quote-list-${category.id}"></ul>
            <button class="add-quote-btn" data-category-id="${category.id}">+ 添加报价</button>`;
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

    function buildPriceSnapshotPayload() {
        return window.PriceSnapshotPayloadUtils
            ? window.PriceSnapshotPayloadUtils.buildPriceSnapshotPayload({
                dashboardState,
                quoteStateById: quoteMonitorState,
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

    manualSaveBtn.addEventListener('click', () => { performSave(true); });
    
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        themeToggleBtn.innerHTML = isDarkMode ? '☀️' : '🌙';
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
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
                    if (!isQuotePaused(quote)) {
                        fetchSingleQuote(quote);
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

        quoteMonitorState.delete(quoteId);
        updateCategoryPauseButtonState(categoryId);
        updateAlertSoundState();
        saveData();
        return true;
    }

    function syncPauseLinkedViews() {
        updateArbPanel();
        evaluatePathAlertsOnce();
        if (pathAlertEditorState.visible) {
            renderPathAlertModal();
        }
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
            const previousState = quoteMonitorState.get(quoteId) || {};
            removeFromQueue(quoteId);
            abortQuoteFetch(quoteId);
            quoteMonitorState.set(quoteId, buildPausedMonitorState(previousState));
            applyPausedQuoteUiState(quote, quoteMonitorState.get(quoteId) || {}, previousState);
            if (doesArbDetailUseQuote(quoteId)) {
                closeArbDetailModal();
            }
        } else {
            applyActiveQuoteUiState(quote, { text: '刷新中...', loading: true, clearInverse: true });
            addToQueue(quote);
            if (!activeFetchControllers.has(quoteId)) {
                fetchSingleQuote(quote);
            }
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
        if (!quote || isCexOrderbookChain(quote.chain)) return false;

        [quote.fromToken, quote.toToken] = [quote.toToken, quote.fromToken];

        const state = quoteMonitorState.get(quoteId);
        if (state) {
            state.lastRawPrice = null;
            state.isSoundActive = false;
            state.logShown = false;
            state.hasUnreadAlert = false;

            const arrowEl = document.getElementById(`trend-arrow-${quoteId}`);
            if (arrowEl) {
                arrowEl.className = 'trend-arrow';
                if (state.trendTimer) clearTimeout(state.trendTimer);
            }

            if (state.fromSymbol && state.toSymbol) {
                const temp = state.fromSymbol;
                state.fromSymbol = state.toSymbol;
                state.toSymbol = temp;
            }

            const quoteItemEl = document.getElementById(`quote-item-${quoteId}`);
            if (quoteItemEl) {
                quoteItemEl.classList.remove('highlight');
                quoteItemEl.classList.remove('highlight-past');
                const dismissBtn = quoteItemEl.querySelector('.dismiss-highlight-btn');
                if (dismissBtn) dismissBtn.remove();
            }
        }
        updateAlertSoundState();

        if (quote.alerts && quote.alerts.basePrice) quote.alerts.basePrice = 1 / quote.alerts.basePrice;

        const quoteTextEl = document.getElementById(`quote-text-${quoteId}`);
        const quoteTextWrapperEl = document.getElementById(`quote-text-wrapper-${quoteId}`);
        if (quoteTextEl && quoteTextWrapperEl) {
            quoteTextEl.textContent = '切换中...';
            quoteTextWrapperEl.classList.add('loading-text');
            const inverseEl = document.getElementById(`inverse-quote-${quoteId}`);
            if (inverseEl) inverseEl.textContent = '刷新中...';
        }

        saveData();
        fetchSingleQuote(quote);
        return true;
    }

    dashboardEl.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const categoryId = target.dataset.categoryId;
        const quoteId = parseInt(target.dataset.quoteId);
        
        if (target.matches('.dismiss-highlight-btn')) {
            const quoteIdToDismiss = parseInt(target.dataset.dismissHighlightId);
            const state = quoteMonitorState.get(quoteIdToDismiss);
            if(state) {
                state.hasUnreadAlert = false;
                state.isSoundActive = false;
                
                const quoteItemEl = document.getElementById(`quote-item-${quoteIdToDismiss}`);
                if(quoteItemEl) {
                    quoteItemEl.classList.remove('highlight');
                    quoteItemEl.classList.remove('highlight-past');
                }
                target.remove();
            }
            updateAlertSoundState();
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
            const currentAlerts = quote.alerts || {};
            const monitorState = quoteMonitorState.get(quote.id) || {};
            
            let pairLabel = quote.symbol;
            if(!pairLabel && monitorState.fromSymbol && monitorState.toSymbol){
                pairLabel = `${monitorState.fromSymbol}/${monitorState.toSymbol}`;
            }
            document.getElementById('modal-title').textContent = `设置: ${CHAIN_DISPLAY_NAMES[quote.chain] || quote.chain} (${pairLabel || '...'})`;

            const fromSymbolLabel = monitorState.fromSymbol || 'From Token';
            const toSymbolLabel = monitorState.toSymbol || 'To Token';
            if (quoteTokenAddressesEl && quoteFromTokenLineEl && quoteToTokenLineEl) {
                if (isCexOrderbookChain(quote.chain) || !quote.fromToken || !quote.toToken) {
                    quoteTokenAddressesEl.style.display = 'none';
                } else {
                    quoteFromTokenLineEl.textContent = `${fromSymbolLabel} ${quote.fromToken}`;
                    quoteToTokenLineEl.textContent = `${toSymbolLabel} ${quote.toToken}`;
                    quoteTokenAddressesEl.style.display = 'block';
                }
            }
            
            const sourceGroup = document.getElementById('source-select-group');
            const sourceSelect = document.getElementById('quote-source-pref');
            if (isEvmChain(quote.chain)) {
                if (quote.chain.toLowerCase() === 'plasma') {
                    sourceGroup.style.display = 'none';
                } else {
                    sourceGroup.style.display = 'block';
                    const pref = quote.preferredSource || 'Kyber';
                    sourceSelect.value = pref;
                }
            } else {
                sourceGroup.style.display = 'none';
            }

            const inverseCheckbox = document.getElementById('show-inverse-quote');
            if (isCexOrderbookChain(quote.chain)) {
                 document.getElementById('inverse-toggle-group').style.display = 'none';
            } else {
                 document.getElementById('inverse-toggle-group').style.display = 'flex';
                 inverseCheckbox.checked = !!quote.showInverse;
            }

            if (modalSwapQuoteBtn) {
                modalSwapQuoteBtn.style.display = isCexOrderbookChain(quote.chain) ? 'none' : 'block';
            }
            if (modalDeleteQuoteBtn) {
                modalDeleteQuoteBtn.style.display = 'block';
            }
            
            document.getElementById('reset-base-price').checked = false;

            document.getElementById('alert-percent-up').value = currentAlerts.percentUp || '';
            document.getElementById('alert-percent-down').value = currentAlerts.percentDown || '';
            document.getElementById('alert-target-above').value = currentAlerts.targetAbove || '';
            document.getElementById('alert-target-below').value = currentAlerts.targetBelow || '';
            
            const basePriceEl = document.getElementById('alert-current-price-value');
            const currentRaw = monitorState.lastRawPrice;
            basePriceEl.textContent = (typeof currentRaw === 'number') ? currentRaw.toFixed(6) : '获取中...';
            
            const savedBasePrice = currentAlerts.basePrice;
            const basePriceText = (typeof savedBasePrice === 'number') ? `(基准: ${savedBasePrice.toFixed(6)})` : '';
            
            document.getElementById('alert-up-base-display').textContent = basePriceText;
            document.getElementById('alert-down-base-display').textContent = basePriceText;

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
                           quoteMonitorState.delete(q.id);
                        });
                        updateAlertSoundState();
                        dashboardState.splice(categoryIndex, 1);
                        document.getElementById(`module-${categoryId}`).remove();
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
        } else if (e.target.id === 'modal-save') {
            if (currentlyEditingQuote && currentlyEditingQuote.quote) {
                const { quote } = currentlyEditingQuote;
                
                if (isEvmChain(quote.chain)) {
                    if (quote.chain.toLowerCase() !== 'plasma') {
                        const newSource = document.getElementById('quote-source-pref').value;
                        if (quote.preferredSource !== newSource) {
                            removeFromQueue(quote.id);
                            quote.preferredSource = newSource;
                            addToQueue(quote);
                            
                            setTimeout(() => fetchSingleQuote(quote), 0); 
                        }
                    }
                }

                const showInverse = document.getElementById('show-inverse-quote').checked;
                if (quote.showInverse !== showInverse) {
                    removeFromQueue(quote.id);
                    quote.showInverse = showInverse;
                    addToQueue(quote);
                    setTimeout(() => fetchSingleQuote(quote), 0); 
                }

                const pUp = parseFloat(document.getElementById('alert-percent-up').value);
                const pDown = parseFloat(document.getElementById('alert-percent-down').value);
                const tAbove = parseFloat(document.getElementById('alert-target-above').value);
                const tBelow = parseFloat(document.getElementById('alert-target-below').value);
                const resetBasePrice = document.getElementById('reset-base-price').checked;

                const newAlerts = {
                    percentUp: pUp || null,
                    percentDown: pDown || null,
                    targetAbove: tAbove || null,
                    targetBelow: tBelow || null,
                };

                if (newAlerts.percentUp || newAlerts.percentDown) {
                    const monitorState = quoteMonitorState.get(quote.id) || {};
                    const currentRawPrice = monitorState.lastRawPrice;
                    const oldBasePrice = quote.alerts && quote.alerts.basePrice;

                    if (resetBasePrice || typeof oldBasePrice !== 'number') {
                         if (typeof currentRawPrice === 'number') {
                             newAlerts.basePrice = currentRawPrice;
                         }
                    } else {
                         newAlerts.basePrice = oldBasePrice;
                    }
                }

                Object.keys(newAlerts).forEach(key => { if (newAlerts[key] === null) delete newAlerts[key]; });
                
                if(Object.keys(newAlerts).length === 0) delete quote.alerts;
                else quote.alerts = newAlerts;

                const state = quoteMonitorState.get(quote.id);
                if (state) {
                    state.hasUnreadAlert = false; 
                    state.isSoundActive = false;
                    state.logShown = false;
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
        addQuoteFromInput.value = '';
        addQuoteToInput.value = '';
        addQuoteSymbolInput.value = '';
        addQuotePairFields.style.display = 'none';
        addQuoteSymbolField.style.display = 'none';
        addQuoteSaveBtn.disabled = true;
        addQuoteModal.classList.remove('visible');
        currentCategoryIdToAdd = null;
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
        if (chain && !isCexOrderbookChain(chain)) {
            const placeholder = CHAIN_ADDRESS_PLACEHOLDERS[chain.toLowerCase()] || 'Enter token address';
            addQuoteFromInput.placeholder = placeholder;
            addQuoteToInput.placeholder = placeholder;
        }
        validateAddQuoteForm();
    });
    [addQuoteFromInput, addQuoteToInput, addQuoteSymbolInput].forEach(input => {
        input.addEventListener('input', validateAddQuoteForm);
    });

    addQuoteModal.addEventListener('click', (e) => {
         if (e.target.id === 'add-quote-cancel' || (e.target === addQuoteModal && !e.target.closest('.modal-box'))) {
            resetAndCloseAddQuoteModal();
        } else if (e.target.id === 'add-quote-save') {
            if (currentCategoryIdToAdd === null) return;
            const chain = addQuoteChainSelect.value;
            const defaultSource = defaultSourceResolver(chain);
            const newQuote = { id: Date.now(), chain: chain.toLowerCase(), amount: 1, preferredSource: defaultSource }; 
            if (isCexOrderbookChain(chain)) {
                newQuote.chain = chain;
                newQuote.symbol = addQuoteSymbolInput.value.trim().toUpperCase();
            } else {
                newQuote.fromToken = addQuoteFromInput.value.trim();
                newQuote.toToken = addQuoteToInput.value.trim();
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
            fetchSingleQuote(newQuote);
            
            addToQueue(newQuote);
            
            resetAndCloseAddQuoteModal();
        }
    });

    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;
        function dragMouseDown(e) { e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; document.onmouseup = closeDragElement; document.onmousemove = elementDrag; }
        function elementDrag(e) { e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; element.style.top = (element.offsetTop - pos2) + "px"; element.style.left = (element.offsetLeft - pos1) + "px"; }
        function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
    }
    
    async function init() {
        audioNoticeEl.style.display = 'block';
        await loadPriceSnapshotConfig();
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleBtn.innerHTML = '☀️';
        }
        
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

            await loadPathAlertConfig();
            
            renderDashboard();
            updateArbPanel();
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
            restartPathAlertScheduler();
            
            makeDraggable(alertLogWindow, document.getElementById('alert-log-header'));
            if (pathAlertWindow && pathAlertHeader) {
                makeDraggable(pathAlertWindow, pathAlertHeader);
            }
            if (arbPathWindow && arbPathHeader) {
                makeDraggable(arbPathWindow, arbPathHeader);
            }
            if (calcWindow && calcHeader) {
                makeDraggable(calcWindow, calcHeader);
                renderCalculatorPanel();
            }

            if (toggleArbBtn) {
                toggleArbBtn.addEventListener('click', toggleArbPanel);
            }
            if (togglePathAlertBtn) {
                togglePathAlertBtn.addEventListener('click', () => {
                    openPathAlertsManagementPage();
                });
            }
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
                    const stepBtn = event.target.closest('[data-arb-detail-step-index]');
                    if (stepBtn) {
                        event.preventDefault();
                    }
                });
                arbDetailGrid.addEventListener('click', (event) => {
                    const tokenEl = event.target.closest('[data-arb-detail-token-address]');
                    if (tokenEl) {
                        const tokenAddress = tokenEl.dataset.arbDetailTokenAddress;
                        const tokenSymbol = tokenEl.dataset.arbDetailTokenSymbol || 'Token';
                        if (!tokenAddress) return;
                        copyTextToClipboard(tokenAddress)
                            .then(() => showCopyToast(`已复制 ${tokenSymbol} 地址`))
                            .catch(() => showCopyToast('复制失败'));
                        return;
                    }

                    const dexLinkEl = event.target.closest('[data-arb-detail-dex-url]');
                    if (dexLinkEl) {
                        const dexUrl = dexLinkEl.dataset.arbDetailDexUrl;
                        const dexLabel = dexLinkEl.dataset.arbDetailDexLabel || 'DEX';
                        if (!dexUrl) return;
                        copyTextToClipboard(dexUrl)
                            .then(() => showCopyToast(`已复制 ${dexLabel} 链接`))
                            .catch(() => showCopyToast('复制失败'));
                        return;
                    }

                    const stepBtn = event.target.closest('[data-arb-detail-step-index]');
                    if (!stepBtn) return;
                    const index = Number(stepBtn.dataset.arbDetailStepIndex);
                    const step = Number(stepBtn.dataset.arbDetailStep);
                    if (!Number.isFinite(index) || !Number.isFinite(step)) return;
                    nudgeArbDetailInput(index, step);
                });
                arbDetailGrid.addEventListener('focusin', (event) => {
                    const input = event.target.closest('[data-arb-detail-input-index]');
                    if (!input) return;
                    arbDetailState.editingInputIndex = Number(input.dataset.arbDetailInputIndex);
                    input.dataset.arbDetailJustFocused = '1';
                    setTimeout(() => {
                        if (document.activeElement === input) {
                            input.select();
                        }
                    }, 0);
                });
                arbDetailGrid.addEventListener('mouseup', (event) => {
                    const input = event.target.closest('[data-arb-detail-input-index]');
                    if (!input) return;
                    if (input.dataset.arbDetailJustFocused !== '1') return;
                    delete input.dataset.arbDetailJustFocused;
                    event.preventDefault();
                });
                arbDetailGrid.addEventListener('focusout', (event) => {
                    const input = event.target.closest('[data-arb-detail-input-index]');
                    if (!input) return;
                    delete input.dataset.arbDetailJustFocused;
                    arbDetailState.editingInputIndex = null;
                    commitArbDetailInput(Number(input.dataset.arbDetailInputIndex), input.value);
                });
                arbDetailGrid.addEventListener('keydown', (event) => {
                    const input = event.target.closest('[data-arb-detail-input-index]');
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
            }
            if (arbGlobalChainFilterInput) {
                arbGlobalChainFilterInput.addEventListener('input', handleArbGlobalChainFilterInput);
            }
            if (arbGlobalFilterClearBtn) {
                arbGlobalFilterClearBtn.addEventListener('click', handleArbGlobalFilterClear);
            }
            if (pathAlertModal) {
                pathAlertModal.addEventListener('click', handlePathAlertModalClick);
            }
            if (pathAlertSearchInput) {
                pathAlertSearchInput.addEventListener('input', (event) => {
                    pathAlertEditorState.searchQuery = event.target.value || '';
                    renderPathAlertModal();
                });
            }
            document.querySelectorAll('.path-alert-type-tab').forEach((button) => {
                button.addEventListener('click', handlePathAlertTypeTabClick);
            });
            [pathAlertNameInput, pathAlertThresholdBpInput, pathAlertConfirmDelayInput, pathAlertCooldownInput, pathAlertEnabledInput].forEach((input) => {
                if (!input) return;
                input.addEventListener('input', () => renderPathAlertSelectedLegs());
                input.addEventListener('change', () => renderPathAlertSelectedLegs());
            });
            if (pathAlertTriggerModeSelect) {
                pathAlertTriggerModeSelect.addEventListener('input', () => renderPathAlertModal());
                pathAlertTriggerModeSelect.addEventListener('change', () => renderPathAlertModal());
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
                    togglePathAlertPanelCollapsed();
                });
            }
            if (arbPathMaxBtn) {
                arbPathMaxBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    setArbPanelMaxHeight();
                });
            }
            if (toggleCalcBtn) {
                toggleCalcBtn.addEventListener('click', toggleCalcPanel);
            }
            if (calcMinBtn) {
                calcMinBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleCalcPanel();
                });
            }
            if (calcResetBtn) {
                calcResetBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    resetCalculator();
                });
            }
        } catch (error) {
            dashboardEl.innerHTML = `<div class="module"><h2 style="color: var(--error-color);">加载配置失败</h2><p>${error.message}。请确保后端服务已启动并刷新页面。</p></div>`;
        }
    }
    
    init();
