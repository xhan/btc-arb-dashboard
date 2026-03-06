    const BACKEND_URL = `${location.protocol}//${location.hostname}:3000`;
    let dashboardState = [];
    let quoteMonitorState = new Map();
    let globalSymbolCache = new Map(); 
    
    let isAudioUnlocked = false; 
    let onConfirmAction = null;

    let queues = {
        kyber: [],
        zerox: [],
        lifi: [],
        bybit: [],
        solana: [],
        sui: [],
        starknet: []
    };

    let indices = {
        kyber: 0,
        zerox: 0,
        lifi: 0,
        bybit: 0,
        solana: 0,
        sui: 0,
        starknet: 0
    };

    let timers = {
        kyber: null,
        zerox: null,
        lifi: null,
        bybit: null,
        solana: null,
        sui: null,
        starknet: null
    };

    const DEFAULT_INTERVALS = {
        kyber: 170, 
        zerox: 110, 
        lifi: 170,
        bybit: 1000,
        solana: 3500, 
        sui: 500,
        starknet: 1000
    };

    let apiIntervals = { ...DEFAULT_INTERVALS };

    let activeFetchControllers = new Map(); 
    let saveTimeout = null;
    let priceSnapshotTimer = null;
    let priceSnapshotConfig = { enabled: false, intervalSec: 10 };
    let arbUpdateTimer = null;
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
        editingInputIndex: null
    };
    let arbDetailFetchController = null;
    let arbDetailLastRequestAtBySource = new Map();
    
    let hoverTimeout = null;        
    let currentHoveredQuoteId = null; 
    let currentlyEditingQuote = null; 

    const dashboardEl = document.getElementById('dashboard');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const alertLogWindow = document.getElementById('alert-log-window');
    const alertLogContent = document.getElementById('alert-log-content');
    const alertSound = document.getElementById('alert-sound');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const audioNoticeEl = document.getElementById('audio-notice');
    const alertModal = document.getElementById('alert-modal');
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
    const arbDetailSubtitle = document.getElementById('arb-detail-subtitle');
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
        avalanche: 'Avalanche', base: 'Base', Bybit: 'Bybit',
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
        bsc: '0x...', avalanche: '0x...', base: '0x...', hemi: '0x...', katana: '0x...', starknet: '0x...', Bybit: 'N/A'
    };
    
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
        const nonEvm = ['solana', 'sui', 'starknet', 'bybit'];
        return !nonEvm.includes(chain.toLowerCase());
    }

    function is0xSupported(chain) {
        return ZEROX_SUPPORTED_CHAINS.includes(chain.toLowerCase());
    }

    function isKyberSupported(chain) {
        return KYBER_SUPPORTED_CHAINS.includes(chain.toLowerCase());
    }

    function shouldQueueInverseFetch(quote) {
        return !!quote && !!quote.showInverse && quote.chain !== 'Bybit';
    }

    function getQueueTypeForQuote(quote) {
        let type = 'kyber';
        if (quote.chain === 'Bybit') type = 'bybit';
        else if (quote.chain === 'solana') type = 'solana';
        else if (quote.chain === 'sui') type = 'sui';
        else if (quote.chain === 'starknet') type = 'starknet';
        else if (isEvmChain(quote.chain)) {
            if (quote.preferredSource === '0x' || quote.preferredSource === 'Velora') {
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
        document.getElementById('setting-lifi-interval').value = apiIntervals.lifi;
        document.getElementById('setting-bybit-interval').value = apiIntervals.bybit;
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
            lifi: parseInt(document.getElementById('setting-lifi-interval').value) || DEFAULT_INTERVALS.lifi,
            bybit: parseInt(document.getElementById('setting-bybit-interval').value) || DEFAULT_INTERVALS.bybit,
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
    
    function updateAlertSoundState() {
        if (!isAudioUnlocked) return;
        
        let shouldPlay = false;
        for (const state of quoteMonitorState.values()) {
            if (state.isSoundActive) {
                shouldPlay = true;
                break;
            }
        }

        if (shouldPlay) {
            if (alertSound.paused) {
                alertSound.loop = true;
                alertSound.play().catch(e => console.error("Play failed", e));
            }
        } else {
            if (!alertSound.paused) {
                alertSound.pause();
                alertSound.currentTime = 0;
            }
        }
    }

    function unlockAudio() {
        if (isAudioUnlocked) return;
        audioNoticeEl.style.display = 'none';
        alertSound.muted = true;
        alertSound.play().then(() => {
            alertSound.pause();
            alertSound.currentTime = 0;
            alertSound.muted = false;
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
        }, 300);
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

    const FIXED_PATH_RULES = [
        {
            title: 'WBTC ETH <-> ARB',
            base: 'cbBTC',
            quote: 'WBTC',
            categoryNames: ['WBTC监控'],
            chains: ['ethereum', 'arbitrum'],
            steps: 2
        },
        {
            title: 'GHO <-> USDC',
            base: 'GHO',
            quote: 'USDC',
            steps: 2,
            crossChain: true
        }
    ];

    function buildLegLines(legs) {
        return legs.map((leg) => window.ArbPaths.formatLegLine({
            from: leg.from,
            to: leg.to,
            rate: leg.rate,
            chainLabel: formatChainLabel(leg.chain)
        }));
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
                return [Number.isFinite(amount) && amount > 0 ? amount : 1, 0.2, 1, 2];
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
            }
        };
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
        const opportunityId = getArbDetailUtils().buildArbOpportunityStableId(meta.section || '', '', cycle);
        const chartPairs = (Array.isArray(cycle.legs) ? cycle.legs : [])
            .filter((leg) => !isRuleLeg(leg) && leg && Number.isFinite(Number(leg.quoteId)))
            .map((leg) => ({
                quoteId: Number(leg.quoteId),
                direction: leg.inverse ? 'inverse' : 'forward'
            }));
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
            chartHref
        };
    }

    function buildArbDetailRowsHtml(card) {
        if (card.rows && card.rows.length) {
            return card.rows.map((row) => `
                <div class="arb-detail-leg">
                    <div class="arb-detail-leg-line">
                        <div class="arb-detail-leg-main">
                            <div class="arb-detail-leg-pair">${buildArbDetailPairHtml(row)}</div>
                            <div class="arb-detail-leg-source">${escapeHtml(row.sourceText)}</div>
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

    async function waitForArbDetailSourceBudget(source, signal) {
        const intervalKey = getArbDetailUtils().getArbDetailIntervalKey(source);
        if (!intervalKey) return;
        if (signal && signal.aborted) {
            const aborted = new Error('Aborted');
            aborted.name = 'AbortError';
            throw aborted;
        }

        const waitMs = getArbDetailUtils().getArbDetailRateLimitDelay(
            arbDetailLastRequestAtBySource.get(intervalKey),
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

        arbDetailLastRequestAtBySource.set(intervalKey, Date.now());
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
            arbDetailGrid.innerHTML = '<div class="arb-detail-error">当前套利机会已失效，请关闭后重新选择。</div>';
            arbDetailModal.classList.add('visible');
            return;
        }

        const legLines = buildLegLines((current.cycle.legs || []).filter(leg => !isRuleLeg(leg)));
        arbDetailSubtitle.textContent = `${current.label || '套利机会'} | ${legLines.join(' | ')}`;
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
            error: ''
        }));
        arbDetailState.loopToken += 1;
        arbDetailState.isRefreshing = false;
        arbDetailState.editingInputIndex = null;
        setArbDetailDashboardPause(true);
        renderArbDetailModal(true);
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
    }

    async function refreshArbDetailCards(runToken) {
        const current = arbDetailState.selectedOpportunity;
        if (!current || !current.cycle) return false;

        const executableLegs = (current.cycle.legs || []).filter(leg => !isRuleLeg(leg));
        if (!executableLegs.length) return false;

        const controller = new AbortController();
        arbDetailFetchController = controller;

        try {
            for (const card of arbDetailState.cards) {
                if (!arbDetailState.visible || arbDetailState.loopToken !== runToken) return;

                const startAmount = Number(card.inputAmount);
                let rollingAmount = startAmount;
                const rows = [];
                let finalSymbol = '';

                for (const leg of executableLegs) {
                    const match = findQuoteById(leg.quoteId);
                    if (!match || !match.quote) {
                        throw new Error('报价配置不存在');
                    }

                    const { data } = await fetchQuoteByStrategy(match.quote, {
                        signal: controller.signal,
                        isInverseFetch: Boolean(leg.inverse),
                        amount: rollingAmount,
                        skipDelay: true,
                        beforeSourceAttempt: (source) => waitForArbDetailSourceBudget(source, controller.signal)
                    });

                    rollingAmount = data.finalAmountOut;
                    finalSymbol = data.symbols.to || finalSymbol;
                    const isInverseLeg = Boolean(leg.inverse);
                    rows.push({
                        chainLabel: formatChainLabel(match.quote.chain),
                        fromSymbol: data.symbols.from,
                        toSymbol: data.symbols.to,
                        fromTokenAddress: isInverseLeg ? match.quote.toToken : match.quote.fromToken,
                        toTokenAddress: isInverseLeg ? match.quote.fromToken : match.quote.toToken,
                        amountText: `${formatDetailNumber(data.finalAmountOut)}`,
                        sourceText: data.usedSource || match.quote.preferredSource || 'Unknown'
                    });
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

        const assetEquivalenceGroups = (window.ArbEquivalenceUtils && window.ArbEquivalenceUtils.DEFAULT_ASSET_EQUIVALENCE_GROUPS)
            ? window.ArbEquivalenceUtils.DEFAULT_ASSET_EQUIVALENCE_GROUPS
            : {
                cbBTC: ['cbBTC', 'xBTC', 'BTCB', 'BTC.b', 'BTC.B'],
                tBTC: ['tBTC', 'TBTC']
            };
        const aliasRules = (window.ArbEquivalenceUtils && typeof window.ArbEquivalenceUtils.buildAliasRulesFromGroups === 'function')
            ? window.ArbEquivalenceUtils.buildAliasRulesFromGroups(assetEquivalenceGroups)
            : {
                xBTC: 'cbBTC',
                BTCB: 'cbBTC',
                'BTC.b': 'cbBTC',
                'BTC.B': 'cbBTC',
                TBTC: 'tBTC'
            };
        const preferredCycleStartSymbols = buildPreferredCycleStartSymbols(aliasRules, 'cbBTC');
        const allQuotes = dashboardState.flatMap(c => c.quotes || []);
        const allEdges = window.ArbPaths.buildEdges(allQuotes, quoteMonitorState, null);
        const ruleEdges = window.ArbPaths.buildRuleEdges(aliasRules);
        const allEdgesWithRules = allEdges.concat(ruleEdges);
        const nextOpportunityMap = new Map();
        const quoteMetaById = new Map();
        for (const category of dashboardState) {
            for (const quote of (category.quotes || [])) {
                quoteMetaById.set(quote.id, { categoryName: category.name });
            }
        }

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
                    { section: 'fixed' }
                ))
                .filter(Boolean)
        }];

        const categorySections = [];
        let lbtcSection = null;
        for (const category of targetCategories) {
            const quotes = Array.isArray(category.quotes) ? category.quotes : [];
            const edges = window.ArbPaths.buildEdges(quotes, quoteMonitorState, null);
            const sectionKey = buildArbSectionKey('category', category.id || category.name);
            const cycles = window.ArbPaths.findTopCycles(edges.concat(ruleEdges), {
                maxDepth: 4,
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
                        { section: category.name }
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
            maxDepth: 4,
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
            lbtcSection ? fixedSections.concat([lbtcSection]) : fixedSections,
            categorySections,
            [{
                title: '全局路径',
                opportunities: globalCycleDisplayState.displayCycles
                    .map((cycle, index) => createArbOpportunityEntry(
                        nextOpportunityMap,
                        cycle,
                        `机会 ${index + 1}`,
                        { section: '全局路径' }
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
            formatLegLine: ({ from, to, rate, chainLabel }) => window.ArbPaths.formatLegLine({
                from,
                to,
                rate,
                chainLabel
            }),
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

    async function apiGetQuote(quote, signal, targetSource) {
        const amountToFetch = quote.amount || 1;
        const fetchOptions = { signal };
        
        let result = { resultText: '', rawPrice: 0, finalAmountOut: 0, symbols: {from:null, to:null}, usedSource: '' };

        try {
            if (targetSource === '0x' || targetSource === 'Velora') {
                 result = await get0xQuote(quote, signal);
            } else if (targetSource === 'LI.FI') {
                result = await getLifiQuote(quote, signal);
            } else if (targetSource === 'Ekubo') {
                result = await getEkuboQuote(quote, signal);
            } else if (targetSource === 'Jupiter') {
                const [resFrom, resTo] = await Promise.all([
                     fetch(`${BACKEND_URL}/api/solana-metadata?mint=${quote.fromToken}`, fetchOptions).then(res => res.ok ? res.json() : {}),
                     fetch(`${BACKEND_URL}/api/solana-metadata?mint=${quote.toToken}`, fetchOptions).then(res => res.ok ? res.json() : {})
                ]);
                const inDecimals = resFrom.decimals || 0;
                const outDecimals = resTo.decimals || 0;
                const amountInSmallestUnit = Math.floor(amountToFetch * (10 ** inDecimals));
                const apiUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${quote.fromToken}&outputMint=${quote.toToken}&amount=${amountInSmallestUnit}`;
                const response = await fetch(apiUrl, fetchOptions);
                const data = await response.json();
                result.symbols = { from: resFrom.symbol || '???', to: resTo.symbol || '???' };
                result.finalAmountOut = Number(data.outAmount) / (10 ** outDecimals);
                result.rawPrice = result.finalAmountOut / amountToFetch;
                result.resultText = `${result.symbols.from} ≈ ${result.finalAmountOut.toFixed(6)} ${result.symbols.to}`;
                result.usedSource = 'Jupiter';

            } else if (targetSource === 'Bybit') {
                const parsedPair = window.QuoteCalculator && window.QuoteCalculator.splitCompactTradingPairSymbol
                    ? window.QuoteCalculator.splitCompactTradingPairSymbol(quote.symbol)
                    : null;
                result.symbols = parsedPair
                    ? { from: parsedPair.fromSymbol, to: parsedPair.toSymbol }
                    : { from: quote.symbol, to: 'QUOTE' };
                const apiUrl = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${quote.symbol}`;
                const response = await fetch(apiUrl, fetchOptions);
                const data = await response.json();
                if (data.retCode !== 0) throw new Error(data.retMsg);
                const price = parseFloat(data.result.list[0].lastPrice);
                result.rawPrice = price;
                result.finalAmountOut = price;
                result.resultText = `${quote.symbol}: ${parseFloat(price.toFixed(10))}`;
                result.usedSource = 'Bybit';
            } else {
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
            if (pref === '0x' || pref === 'Velora') {
                return ['0x', '0x'];
            }
            if (pref === 'LI.FI') {
                return ['LI.FI', 'LI.FI'];
            }
            return ['Kyber', 'Kyber'];
        }

        if (quote.chain === 'sui') return ['Cetus'];
        if (quote.chain === 'solana') return ['Jupiter'];
        if (quote.chain === 'starknet') return ['Ekubo'];
        if (quote.chain === 'Bybit') return ['Bybit'];
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
                    usedSource: data.usedSource,
                    usedSourceReal: successSource
                };

                quoteTextEl.textContent = data.resultText;
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
        if (!text) return;
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return;
            } catch (error) {
                console.warn('Clipboard write failed', error);
            }
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
        } catch (error) {
            console.warn('Clipboard fallback failed', error);
        }
        textarea.remove();
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
            
            let content = '';
            let sourceInfo = state ? (state.usedSource || '未知') : '等待数据...';
            
            if (isEvmChain(quote.chain)) {
                let pref = quote.preferredSource || 'Kyber';
                if (pref === 'Velora') pref = '0x'; 
                content += `<div>来源：<strong>${sourceInfo}</strong></div>`;
                content += `<div>偏好：${pref}</div>`;
            } else {
                content += `<div>来源：<strong>${sourceInfo}</strong></div>`;
            }
            
            showGlobalTooltip(content, textWrapper);
        }, 100); 
    }

    function showGlobalTooltip(htmlContent, targetEl) {
        globalTooltip.innerHTML = htmlContent;
        globalTooltip.classList.add('visible');
        
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
        alertLogWindow.style.display = 'flex';
        const now = new Date();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        const displayName = CHAIN_DISPLAY_NAMES[quote.chain] || quote.chain;
         const monitorState = quoteMonitorState.get(quote.id) || {};
        let label = quote.chain === 'Bybit' ? quote.symbol : 
                    (monitorState.fromSymbol && monitorState.toSymbol ? `${monitorState.fromSymbol}/${monitorState.toSymbol}` : 
                    `${quote.fromToken.slice(0,4)}.../${quote.toToken.slice(0,4)}...`);
        logEntry.innerHTML = `<div><strong>${displayName}</strong>: ${label}</div><div>${message}</div><span class="log-time">${now.toLocaleTimeString()}</span>`;
        alertLogContent.prepend(logEntry);
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
        const lastResultText = monitorState.lastResultText || '...';
        const itemEl = document.createElement('li');
        itemEl.id = `quote-item-${quote.id}`;
        itemEl.className = 'quote-item';
        const initialAmount = quote.amount || 1;
        const amountInputHTML = quote.chain !== 'Bybit' ? `<input type="number" class="amount-input" value="${initialAmount}" step="any" min="0" data-category-id="${categoryId}" data-quote-id="${quote.id}">` : '';
        
        itemEl.innerHTML = `
            <div class="quote-left-container">
                <span class="quote-label">${displayName}</span>
                <span id="trend-arrow-${quote.id}" class="trend-arrow"></span>
            </div>
            <div class="quote-result">
                <div id="quote-data-${quote.id}" class="quote-data">
                    <div style="display:flex; align-items:center;">
                        ${amountInputHTML}
                        <span class="quote-text-wrapper" id="quote-text-wrapper-${quote.id}">
                            <span class="quote-text" id="quote-text-${quote.id}">${lastResultText}</span>
                        </span>
                    </div>
                </div>
                <div class="quote-actions">
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
        moduleEl.innerHTML = `
            <div class="module-header">
                <h2>${category.name}</h2>
                <button class="icon-btn delete-btn" title="删除分区" data-category-id="${category.id}">×</button>
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
        const quotes = [];

        for (const category of dashboardState) {
            const categoryId = category?.id ?? null;
            const categoryName = category?.name || '';
            for (const quote of (category?.quotes || [])) {
                const state = quoteMonitorState.get(quote.id) || {};
                const fromSymbol = state.fromSymbol || '';
                const toSymbol = state.toSymbol || '';
                const inverseFromSymbol = state.inverseFromSymbol || '';
                const inverseToSymbol = state.inverseToSymbol || '';
                const size = quote.amount || 1;
                const pair = fromSymbol && toSymbol
                    ? `${fromSymbol}/${toSymbol}`
                    : (quote.symbol || '');
                const inversePair = inverseFromSymbol && inverseToSymbol
                    ? `${inverseFromSymbol}/${inverseToSymbol}`
                    : '';

                quotes.push({
                    quoteId: quote.id,
                    categoryId,
                    categoryName,
                    chain: quote.chain,
                    pair,
                    size,
                    preferredSource: quote.preferredSource || 'Kyber',
                    usedSource: state.usedSource || '',
                    fromToken: quote.fromToken || '',
                    toToken: quote.toToken || '',
                    fromSymbol,
                    toSymbol,
                    price: typeof state.lastRawPrice === 'number' ? state.lastRawPrice : null,
                    inversePrice: typeof state.inverseRawPrice === 'number' ? state.inverseRawPrice : null,
                    resultText: state.lastResultText || '',
                    inversePair,
                    inverseResultText: inversePair && typeof state.inverseRawPrice === 'number' && size
                        ? `${size} ${inverseFromSymbol} ≈ ${(size * state.inverseRawPrice).toFixed(6)} ${inverseToSymbol}`
                        : ''
                });
            }
        }

        return {
            clientCapturedAt: new Date().toISOString(),
            quotes
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
                    fetchSingleQuote(quote); 
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
        updateAlertSoundState();
        saveData();
        return true;
    }

    function swapQuoteTokens(categoryId, quoteId) {
        const category = dashboardState.find(c => c.id == categoryId);
        if (!category) return false;
        const quote = category.quotes.find(q => q.id == quoteId);
        if (!quote || quote.chain === 'Bybit') return false;

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

                globalSymbolCache.set(`${quote.chain}-${quote.fromToken}`, state.fromSymbol);
                globalSymbolCache.set(`${quote.chain}-${quote.toToken}`, state.toSymbol);
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
                if (quote.chain === 'Bybit' || !quote.fromToken || !quote.toToken) {
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
                    sourceSelect.value = pref === 'Velora' ? '0x' : pref; 
                }
            } else {
                sourceGroup.style.display = 'none';
            }

            const inverseCheckbox = document.getElementById('show-inverse-quote');
            if (quote.chain === 'Bybit') {
                 document.getElementById('inverse-toggle-group').style.display = 'none';
            } else {
                 document.getElementById('inverse-toggle-group').style.display = 'flex';
                 inverseCheckbox.checked = !!quote.showInverse;
            }

            if (modalSwapQuoteBtn) {
                modalSwapQuoteBtn.style.display = quote.chain === 'Bybit' ? 'none' : 'block';
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
        if (chain === 'Bybit') { addQuoteSaveBtn.disabled = !addQuoteSymbolInput.value.trim(); } 
        else { addQuoteSaveBtn.disabled = !addQuoteFromInput.value.trim() || !addQuoteToInput.value.trim(); }
    }

    addQuoteChainSelect.addEventListener('change', () => {
        const chain = addQuoteChainSelect.value;
        addQuotePairFields.style.display = (chain && chain !== 'Bybit') ? 'block' : 'none';
        addQuoteSymbolField.style.display = (chain === 'Bybit') ? 'block' : 'none';
        if (chain && chain !== 'Bybit') {
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
            if (chain === 'Bybit') {
                newQuote.chain = 'Bybit';
                newQuote.symbol = addQuoteSymbolInput.value.trim();
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
            
            renderDashboard();
            updateArbPanel();
            
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
            
            makeDraggable(alertLogWindow, document.getElementById('alert-log-header'));
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
            document.addEventListener('keydown', handleGlobalShortcuts);
            if (arbPathMinBtn) {
                arbPathMinBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleArbPanel();
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
