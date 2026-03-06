(function () {
  const BACKEND_URL = `${location.protocol}//${location.hostname}:3000`;
  const timeInput = document.getElementById('snapshot-time-input');
  const modeSelect = document.getElementById('snapshot-mode-select');
  const maxGapInput = document.getElementById('snapshot-max-gap-input');
  const loadBtn = document.getElementById('snapshot-load-btn');
  const openSnapshotJsonBtn = document.getElementById('snapshot-open-snapshot-json-btn');
  const openReplayJsonBtn = document.getElementById('snapshot-open-replay-json-btn');
  const statusEl = document.getElementById('snapshot-status');
  const dashboardEl = document.getElementById('snapshot-dashboard');
  const arbContentEl = document.getElementById('snapshot-arb-content');

  const CHAIN_DISPLAY_NAMES = {
    ethereum: 'ETH',
    arbitrum: 'Arbitrum',
    optimism: 'Optimism',
    bsc: 'BSC',
    polygon: 'Polygon',
    avalanche: 'Avalanche',
    base: 'Base',
    linea: 'Linea',
    mantle: 'Mantle',
    sonic: 'Sonic',
    berachain: 'Berachain',
    ronin: 'Ronin',
    unichain: 'Unichain',
    hyperevm: 'HyperEVM',
    plasma: 'Plasma',
    scroll: 'Scroll',
    blast: 'Blast',
    mode: 'Mode',
    monad: 'Monad',
    etherlink: 'Etherlink',
    fantom: 'Fantom',
    cronos: 'Cronos',
    moonbeam: 'Moonbeam',
    boba: 'Boba',
    gnosis: 'Gnosis',
    celo: 'Celo',
    katana: 'Katana',
    hemi: 'Hemi',
    solana: 'SOL',
    sui: 'SUI',
    Bybit: 'Bybit'
  };

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

  const TARGET_CATEGORY_NAMES = ['WBTC监控', 'LBTC监控', 'TBTC监控'];
  const ASSET_EQUIVALENCE_GROUPS = (window.ArbEquivalenceUtils && window.ArbEquivalenceUtils.DEFAULT_ASSET_EQUIVALENCE_GROUPS)
    ? window.ArbEquivalenceUtils.DEFAULT_ASSET_EQUIVALENCE_GROUPS
    : {
      cbBTC: ['cbBTC', 'xBTC', 'BTCB', 'BTC.b', 'BTC.B'],
      tBTC: ['tBTC', 'TBTC']
    };
  const ALIAS_RULES = (window.ArbEquivalenceUtils && typeof window.ArbEquivalenceUtils.buildAliasRulesFromGroups === 'function')
    ? window.ArbEquivalenceUtils.buildAliasRulesFromGroups(ASSET_EQUIVALENCE_GROUPS)
    : {
      xBTC: 'cbBTC',
      BTCB: 'cbBTC',
      'BTC.b': 'cbBTC',
      'BTC.B': 'cbBTC',
      TBTC: 'tBTC'
    };

  function formatChainLabel(chain) {
    return CHAIN_DISPLAY_NAMES[chain] || chain || '';
  }

  function buildPreferredCycleStartSymbols(aliasRules, canonicalSymbol) {
    const symbols = new Set([canonicalSymbol]);
    for (const [alias, mapped] of Object.entries(aliasRules || {})) {
      if (mapped === canonicalSymbol) {
        symbols.add(alias);
        symbols.add(mapped);
      }
    }
    return Array.from(symbols);
  }

  function buildEdgesFromQuotes(quotes) {
    const edges = [];
    for (const quote of quotes || []) {
      if (quote.fromSymbol && quote.toSymbol && typeof quote.price === 'number') {
        edges.push({
          from: quote.fromSymbol,
          to: quote.toSymbol,
          rate: quote.price,
          chain: quote.chain,
          quoteId: quote.quoteId
        });
      }
      if (quote.fromSymbol && quote.toSymbol && typeof quote.inversePrice === 'number') {
        edges.push({
          from: quote.toSymbol,
          to: quote.fromSymbol,
          rate: quote.inversePrice,
          chain: quote.chain,
          quoteId: quote.quoteId,
          inverse: true
        });
      }
    }
    return edges;
  }

  function renderStatus(selection) {
    if (!selection) {
      statusEl.innerHTML = '<div class="snapshot-empty">未找到满足条件的快照</div>';
      return;
    }

    const requested = selection.requestedAtLocal || selection.requestedAt || '--';
    const captured = selection.snapshot?.capturedAtLocal || selection.snapshot?.capturedAt || '--';
    const matchType = selection.matchType || '--';
    const deltaSec = typeof selection.deltaMs === 'number' ? (selection.deltaMs / 1000).toFixed(3) : '--';
    const quoteCount = selection.snapshot?.quoteCount ?? 0;

    statusEl.innerHTML = `
      <div class="status-item"><strong>请求时间</strong><span>${requested}</span></div>
      <div class="status-item"><strong>命中快照</strong><span>${captured}</span></div>
      <div class="status-item"><strong>匹配方式</strong><span>${matchType}</span></div>
      <div class="status-item"><strong>时间偏差</strong><span>${deltaSec}s</span></div>
      <div class="status-item"><strong>报价数量</strong><span>${quoteCount}</span></div>
    `;
  }

  function renderDashboard(quotes) {
    if (!Array.isArray(quotes) || !quotes.length) {
      dashboardEl.innerHTML = '<div class="snapshot-empty">该快照没有报价数据</div>';
      return;
    }

    const grouped = new Map();
    for (const quote of quotes) {
      const key = String(quote.categoryId ?? quote.categoryName ?? 'default');
      if (!grouped.has(key)) {
        grouped.set(key, {
          name: quote.categoryName || '未分组',
          items: []
        });
      }
      grouped.get(key).items.push(quote);
    }

    const categoryHtml = Array.from(grouped.values()).map((group) => {
      const itemsHtml = group.items.map((quote) => {
        const resultText = quote.resultText || (quote.size && quote.pair && typeof quote.price === 'number'
          ? `${quote.size} ${quote.pair.split('/')[0]} ≈ ${(quote.size * quote.price).toFixed(6)} ${quote.pair.split('/')[1]}`
          : '无报价');
        const inverseText = quote.inverseResultText || '';
        const sourceText = quote.usedSource || quote.preferredSource || '--';
        const pairText = quote.pair || `${quote.fromSymbol || '--'}/${quote.toSymbol || '--'}`;

        return `
          <li class="snapshot-quote-item">
            <div class="snapshot-quote-top">
              <span class="snapshot-chain">${formatChainLabel(quote.chain)}</span>
              <span class="snapshot-source">${pairText}<br>Source: ${sourceText}</span>
            </div>
            <div class="snapshot-result">${resultText}</div>
            ${inverseText ? `<div class="snapshot-inverse">${inverseText}</div>` : ''}
          </li>
        `;
      }).join('');

      return `
        <section class="snapshot-category">
          <div class="snapshot-category-header">
            <div class="snapshot-category-title">
              ${group.name}
              <span class="snapshot-category-meta">${group.items.length} 个报价</span>
            </div>
          </div>
          <div class="snapshot-category-divider"></div>
          <ul class="snapshot-quote-list">${itemsHtml}</ul>
        </section>
      `;
    }).join('');

    dashboardEl.innerHTML = `<div class="snapshot-categories">${categoryHtml}</div>`;
  }

  function buildArbColumns(snapshotQuotes) {
    if (!window.ArbPaths || !window.ArbPanelRenderer) {
      return null;
    }

    const allQuotes = Array.isArray(snapshotQuotes) ? snapshotQuotes : [];
    const preferredStartSymbols = buildPreferredCycleStartSymbols(ALIAS_RULES, 'cbBTC');
    const ruleEdges = window.ArbPaths.buildRuleEdges(ALIAS_RULES);
    const allEdges = buildEdgesFromQuotes(allQuotes);
    const allEdgesWithRules = allEdges.concat(ruleEdges);
    const quoteMetaById = new Map(allQuotes.map((quote) => [quote.quoteId, { categoryName: quote.categoryName }]));

    const fixedSections = [
      {
        title: '固定路径',
        opportunities: FIXED_PATH_RULES
          .map((rule) => ({
            label: rule.title,
            cycle: window.ArbPaths.findBestFixedPath(
              (window.ArbFixedUtils && typeof window.ArbFixedUtils.filterEdgesForFixedRule === 'function')
                ? window.ArbFixedUtils.filterEdgesForFixedRule(rule, allEdgesWithRules, quoteMetaById)
                : allEdgesWithRules,
              rule,
              ALIAS_RULES
            )
          }))
          .filter((item) => item.cycle)
      }
    ];

    const targetCategories = TARGET_CATEGORY_NAMES
      .map((name) => ({
        name,
        quotes: allQuotes.filter((quote) => quote.categoryName === name)
      }))
      .filter((category) => category.quotes.length);

    const categorySections = targetCategories.map((category) => {
      const cycles = window.ArbPaths.findTopCycles(buildEdgesFromQuotes(category.quotes).concat(ruleEdges), {
        maxDepth: 4,
        limit: Number.MAX_SAFE_INTEGER,
        acceptCycle: window.ArbPaths.isMeaningfulPath,
        preferredStartSymbols
      });
      const displayCycles = (cycles || []).filter((cycle) => cycle && cycle.profitRate > 0).slice(0, 4);
      const opportunities = displayCycles.length
        ? displayCycles.map((cycle, index) => ({ label: `机会 ${index + 1}`, cycle }))
        : ((cycles && cycles[0]) ? [{ label: '机会 1', cycle: cycles[0] }] : []);
      return {
        title: category.name,
        opportunities
      };
    });

    const globalCycles = window.ArbPaths.findTopCycles(allEdgesWithRules, {
      maxDepth: 4,
      limit: Number.MAX_SAFE_INTEGER,
      acceptCycle: window.ArbPaths.isMeaningfulPath,
      preferredStartSymbols
    });
    const globalPositive = (globalCycles || []).filter((cycle) => cycle && cycle.profitRate > 0).slice(0, 8);
    const globalOps = globalPositive.length
      ? globalPositive.map((cycle, index) => ({ label: `机会 ${index + 1}`, cycle }))
      : ((globalCycles && globalCycles[0]) ? [{ label: '机会 1', cycle: globalCycles[0] }] : []);

    return [
      fixedSections,
      categorySections,
      [
        {
          title: '全局路径',
          opportunities: globalOps,
          emptyText: '暂无可用路径'
        }
      ]
    ];
  }

  function renderArbPanel(snapshotQuotes) {
    const columns = buildArbColumns(snapshotQuotes);
    if (!columns) {
      arbContentEl.innerHTML = '<div class="snapshot-error">套利模块未加载</div>';
      return;
    }

    const html = window.ArbPanelRenderer.renderArbGrid({
      columns,
      isMeaningfulPath: (cycle) => cycle && Array.isArray(cycle.legs) && window.ArbPaths.isMeaningfulPath(cycle.legs),
      shouldIncludeLeg: (leg) => !(leg && (leg.rule || leg.chain === '规则')),
      formatChainLabel,
      formatLegLine: ({ from, to, rate, chainLabel }) => window.ArbPaths.formatLegLine({
        from,
        to,
        rate,
        chainLabel
      }),
      formatProfit: (profitRate) => window.ArbPaths.formatProfitWanfen(profitRate)
    });

    arbContentEl.innerHTML = html;
  }

  function renderError(message) {
    statusEl.innerHTML = `<div class="snapshot-error">${message}</div>`;
    dashboardEl.innerHTML = '';
    arbContentEl.innerHTML = '';
  }

  function buildQueryParams() {
    const params = new URLSearchParams();
    params.set('at', timeInput.value.trim());
    params.set('mode', modeSelect.value);

    const maxGap = maxGapInput.value.trim();
    if (maxGap) {
      params.set('maxGapSec', maxGap);
    }

    return params;
  }

  function buildSnapshotApiUrl() {
    return `${BACKEND_URL}/api/get-price-snapshot?${buildQueryParams().toString()}`;
  }

  function buildReplayApiUrl() {
    const params = buildQueryParams();
    params.set('format', 'json');
    return `${BACKEND_URL}/api/replay-arb-snapshot?${params.toString()}`;
  }

  async function loadSnapshot(pushUrl = false) {
    const timeValue = timeInput.value.trim();
    if (!timeValue) {
      renderError('缺少 time 参数');
      return;
    }

    loadBtn.disabled = true;
    loadBtn.textContent = '加载中...';

    try {
      const response = await fetch(buildSnapshotApiUrl());
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || '获取快照失败');
      }

      const selection = await response.json();
      if (!selection || !selection.snapshot) {
        renderStatus(null);
        dashboardEl.innerHTML = '<div class="snapshot-empty">未找到满足条件的快照</div>';
        arbContentEl.innerHTML = '<div class="snapshot-empty">暂无可用路径</div>';
      } else {
        renderStatus(selection);
        renderDashboard(selection.snapshot.quotes || []);
        renderArbPanel(selection.snapshot.quotes || []);
      }

      if (pushUrl) {
        const next = new URL(location.href);
        next.searchParams.set('time', timeValue);
        next.searchParams.set('mode', modeSelect.value);
        const maxGap = maxGapInput.value.trim();
        if (maxGap) next.searchParams.set('maxGapSec', maxGap);
        else next.searchParams.delete('maxGapSec');
        history.replaceState(null, '', next.toString());
      }
    } catch (error) {
      renderError(error.message || '加载快照失败');
    } finally {
      loadBtn.disabled = false;
      loadBtn.textContent = '加载快照';
    }
  }

  function getDefaultTime() {
    const now = new Date();
    const local = new Date(now.getTime() + (8 * 60 * 60 * 1000)).toISOString().slice(0, 19).replace('T', ' ');
    return local;
  }

  function init() {
    const params = new URLSearchParams(location.search);
    timeInput.value = params.get('time') || getDefaultTime();
    modeSelect.value = params.get('mode') || 'floor';
    maxGapInput.value = params.get('maxGapSec') || '';

    loadBtn.addEventListener('click', () => loadSnapshot(true));
    if (openSnapshotJsonBtn) {
      openSnapshotJsonBtn.addEventListener('click', () => {
        window.open(buildSnapshotApiUrl(), '_blank', 'noopener');
      });
    }
    if (openReplayJsonBtn) {
      openReplayJsonBtn.addEventListener('click', () => {
        window.open(buildReplayApiUrl(), '_blank', 'noopener');
      });
    }
    timeInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        loadSnapshot(true);
      }
    });

    loadSnapshot(false);
  }

  init();
}());
