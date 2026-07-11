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
  const snapshotOpportunityStore = new Map();

  const FIXED_PATH_RULES = (window.PathAlertRuleDefinitions && Array.isArray(window.PathAlertRuleDefinitions.FIXED_PATH_RULES))
    ? window.PathAlertRuleDefinitions.FIXED_PATH_RULES
    : [
    {
      title: 'WBTC eth <-> arb',
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
  const arbEquivalenceUtils = window.ArbEquivalenceUtils || null;
  const ASSET_EQUIVALENCE_GROUPS = arbEquivalenceUtils
    ? arbEquivalenceUtils.DEFAULT_ASSET_EQUIVALENCE_GROUPS
    : {};
  const ALIAS_RULES = arbEquivalenceUtils && typeof arbEquivalenceUtils.buildAliasRulesFromGroups === 'function'
    ? arbEquivalenceUtils.buildAliasRulesFromGroups(ASSET_EQUIVALENCE_GROUPS)
    : {};
  const DEFAULT_ARB_CYCLE_START_PRIORITY = window.ArbCyclePriorityUtils
    ? window.ArbCyclePriorityUtils.DEFAULT_ARB_CYCLE_START_PRIORITY
    : ['cbBTC', 'WBTC', 'ETH'];
  let arbCycleStartPriority = Array.from(DEFAULT_ARB_CYCLE_START_PRIORITY);

  function formatChainLabel(chain) {
    if (window.ChainDefaults && typeof window.ChainDefaults.getChainDisplayName === 'function') {
      return window.ChainDefaults.getChainDisplayName(chain);
    }
    return chain || '';
  }

  function buildPreferredCycleStartSymbols(aliasRules, canonicalSymbol) {
    const configuredPriority = Array.isArray(arbCycleStartPriority) && arbCycleStartPriority.length
      ? arbCycleStartPriority
      : [canonicalSymbol];
    if (window.ArbCyclePriorityUtils && typeof window.ArbCyclePriorityUtils.buildPreferredCycleStartSymbols === 'function') {
      return window.ArbCyclePriorityUtils.buildPreferredCycleStartSymbols(aliasRules, configuredPriority);
    }
    if (arbEquivalenceUtils && typeof arbEquivalenceUtils.expandAliasSymbols === 'function') {
      return arbEquivalenceUtils.expandAliasSymbols(aliasRules, configuredPriority);
    }
    return configuredPriority;
  }

  async function loadArbSettings() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/get-arb-settings`);
      if (!response.ok) throw new Error('获取套利路径配置失败');
      const data = await response.json();
      arbCycleStartPriority = window.ArbCyclePriorityUtils && typeof window.ArbCyclePriorityUtils.normalizeArbCycleStartPriority === 'function'
        ? window.ArbCyclePriorityUtils.normalizeArbCycleStartPriority(data && data.cycleStartPriority)
        : Array.from(DEFAULT_ARB_CYCLE_START_PRIORITY);
    } catch (error) {
      console.warn('加载套利路径配置失败:', error);
      arbCycleStartPriority = Array.from(DEFAULT_ARB_CYCLE_START_PRIORITY);
    }
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

  function buildOpportunityChartHref(cycle) {
    const utils = window.ChartsUtils;
    if (!utils || typeof utils.buildChartsPageHref !== 'function') {
      return '/charts';
    }

    const chartPairs = (Array.isArray(cycle && cycle.legs) ? cycle.legs : [])
      .filter((leg) => !(leg && (leg.rule || leg.chain === '规则')) && Number.isFinite(Number(leg && leg.quoteId)))
      .map((leg) => ({
        quoteId: Number(leg.quoteId),
        direction: leg.inverse ? 'inverse' : 'forward'
      }));

    return utils.buildChartsPageHref(chartPairs);
  }

  function buildPathAlertsManagementHref(options = {}) {
    if (window.PathAlertPageUtils && typeof window.PathAlertPageUtils.buildPathAlertsPageHref === 'function') {
      return window.PathAlertPageUtils.buildPathAlertsPageHref(options);
    }
    return '/path-alerts';
  }

  function openPathAlertsManagementPage(options = {}) {
    window.open(buildPathAlertsManagementHref(options), '_blank', 'noopener');
  }

  function buildOpportunityEntry(cycle, label, alertPreset = null) {
    if (!cycle) return null;
    const opportunityId = `snapshot-opportunity-${snapshotOpportunityStore.size + 1}`;
    const entry = {
      label,
      cycle,
      chartHref: buildOpportunityChartHref(cycle),
      opportunityId,
      alertPreset
    };
    snapshotOpportunityStore.set(opportunityId, entry);
    return entry;
  }

  function buildPathAlertDraftFromOpportunity(opportunityId) {
    const entry = snapshotOpportunityStore.get(opportunityId);
    if (!entry) return null;

    if (entry.alertPreset && entry.alertPreset.type === 'rule') {
      return {
        name: entry.label || '路径报警',
        target: {
          type: 'rule',
          ruleKind: entry.alertPreset.ruleKind,
          ruleId: entry.alertPreset.ruleId
        }
      };
    }

    const legs = (entry.cycle?.legs || [])
      .filter((leg) => !(leg && (leg.rule || leg.chain === '规则')) && Number.isFinite(Number(leg.quoteId)))
      .map((leg) => ({
        quoteId: Number(leg.quoteId),
        direction: leg.inverse ? 'inverse' : 'forward',
        pricingMode: 'raw',
        chain: leg.chain,
        fromSymbol: leg.from,
        toSymbol: leg.to
      }));
    if (!legs.length) return null;
    return {
      name: entry.label || '路径报警',
      target: {
        type: 'path',
        legs
      }
    };
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
    snapshotOpportunityStore.clear();

    const allQuotes = Array.isArray(snapshotQuotes) ? snapshotQuotes : [];
    const preferredStartSymbols = buildPreferredCycleStartSymbols(ALIAS_RULES, 'cbBTC');
    const ruleEdges = window.ArbPaths.buildRuleEdges(ALIAS_RULES);
    const allEdges = buildEdgesFromQuotes(allQuotes);
    const allEdgesWithRules = allEdges.concat(ruleEdges);
    const quoteMetaById = new Map(allQuotes.map((quote) => [quote.quoteId, { categoryName: quote.categoryName }]));

    const fixedSections = [
      {
        renderKey: 'snapshot:fixed',
        title: '固定路径',
        opportunities: FIXED_PATH_RULES
          .map((rule) => buildOpportunityEntry(
            window.ArbPaths.findBestFixedPath(
              (window.ArbFixedUtils && typeof window.ArbFixedUtils.filterEdgesForFixedRule === 'function')
                ? window.ArbFixedUtils.filterEdgesForFixedRule(rule, allEdgesWithRules, quoteMetaById)
                : allEdgesWithRules,
              rule,
              ALIAS_RULES
            ),
            rule.title,
            {
              type: 'rule',
              ruleKind: 'fixed',
              ruleId: rule.id
            }
          ))
          .filter(Boolean)
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
        maxDepth: 3,
        limit: Number.MAX_SAFE_INTEGER,
        acceptCycle: window.ArbPaths.isMeaningfulPath,
        preferredStartSymbols
      });
      const displayCycles = (cycles || []).filter((cycle) => cycle && cycle.profitRate > 0).slice(0, 4);
      const opportunities = displayCycles.length
        ? displayCycles
          .map((cycle, index) => buildOpportunityEntry(cycle, `机会 ${index + 1}`))
          .filter(Boolean)
        : ((cycles && cycles[0]) ? [buildOpportunityEntry(cycles[0], '机会 1')].filter(Boolean) : []);
      return {
        renderKey: `snapshot:category:${category.name}`,
        title: category.name,
        opportunities
      };
    });

    const globalCycles = window.ArbPaths.findTopCycles(allEdgesWithRules, {
      maxDepth: 3,
      limit: Number.MAX_SAFE_INTEGER,
      acceptCycle: window.ArbPaths.isMeaningfulPath,
      preferredStartSymbols
    });
    const globalPositive = (globalCycles || []).filter((cycle) => cycle && cycle.profitRate > 0).slice(0, 8);
    const globalOps = globalPositive.length
      ? globalPositive
        .map((cycle, index) => buildOpportunityEntry(cycle, `机会 ${index + 1}`))
        .filter(Boolean)
      : ((globalCycles && globalCycles[0]) ? [buildOpportunityEntry(globalCycles[0], '机会 1')].filter(Boolean) : []);

    return [
      fixedSections,
      categorySections,
      [
        {
          renderKey: 'snapshot:global',
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
      columnKeys: ['snapshot:fixed', 'snapshot:categories', 'snapshot:global'],
      isMeaningfulPath: (cycle) => cycle && Array.isArray(cycle.legs) && window.ArbPaths.isMeaningfulPath(cycle.legs),
      shouldIncludeLeg: (leg) => !(leg && (leg.rule || leg.chain === '规则')),
      formatChainLabel,
      formatLegLine: ({ from, to, rawFrom, rawTo, rate, chainLabel }) => window.ArbPaths.formatLegLine({
        from: rawFrom || from,
        to: rawTo || to,
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

  async function init() {
    const params = new URLSearchParams(location.search);
    timeInput.value = params.get('time') || getDefaultTime();
    modeSelect.value = params.get('mode') || 'floor';
    maxGapInput.value = params.get('maxGapSec') || '';
    await loadArbSettings();

    loadBtn.addEventListener('click', () => loadSnapshot(true));
    arbContentEl.addEventListener('click', (event) => {
      const addAlertBtn = event.target.closest('[data-arb-opportunity-alert-id]');
      if (!addAlertBtn) return;
      const draft = buildPathAlertDraftFromOpportunity(addAlertBtn.dataset.arbOpportunityAlertId);
      if (!draft) return;
      openPathAlertsManagementPage({
        mode: 'create',
        draft
      });
    });
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
