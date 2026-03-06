(function () {
  const utils = window.ChartsUtils;
  const searchInput = document.getElementById('chart-search-input');
  const addBtn = document.getElementById('chart-add-btn');
  const refreshBtn = document.getElementById('chart-refresh-btn');
  const suggestionsEl = document.getElementById('chart-suggestions');
  const statusEl = document.getElementById('chart-page-status');
  const panelsEl = document.getElementById('chart-panels');

  const state = {
    pairs: [],
    filteredPairs: [],
    activeIndex: -1,
    panels: new Map(),
    profitPanel: null,
    prefillApplied: false
  };

  function setStatus(message, tone) {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.style.color = tone === 'error' ? '#b91c1c' : '';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getFilteredPairs(query) {
    if (!utils) return [];
    const safeQuery = String(query || '').trim();
    return state.pairs
      .filter((pair) => utils.matchesChartSearch(pair, safeQuery))
      .slice(0, 12);
  }

  function hideSuggestions() {
    if (!suggestionsEl) return;
    suggestionsEl.classList.remove('visible');
    state.activeIndex = -1;
  }

  function renderSuggestions() {
    if (!suggestionsEl) return;

    state.filteredPairs = getFilteredPairs(searchInput ? searchInput.value : '');
    const shouldShow = Boolean(searchInput && (document.activeElement === searchInput || searchInput.value.trim()));
    if (!state.filteredPairs.length || !shouldShow) {
      suggestionsEl.innerHTML = '';
      hideSuggestions();
      return;
    }

    if (state.activeIndex >= state.filteredPairs.length) {
      state.activeIndex = 0;
    }

    suggestionsEl.innerHTML = state.filteredPairs.map((pair, index) => `
      <button
        type="button"
        class="chart-suggestion${index === state.activeIndex ? ' active' : ''}"
        data-chart-pair-key="${escapeHtml(pair.key)}"
      >
        <span class="chart-suggestion-label">${escapeHtml(pair.label)}</span>
        <span class="chart-suggestion-meta">${escapeHtml(pair.source || '历史快照')}</span>
      </button>
    `).join('');
    suggestionsEl.classList.add('visible');
  }

  function getSelectedPair() {
    if (state.activeIndex >= 0 && state.activeIndex < state.filteredPairs.length) {
      return state.filteredPairs[state.activeIndex];
    }
    if (!searchInput || !searchInput.value.trim()) {
      return null;
    }
    return state.filteredPairs[0] || null;
  }

  function focusExistingPanel(panel) {
    if (!panel || !panel.root) return;
    panel.root.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (typeof panel.root.animate === 'function') {
      panel.root.animate([
        { boxShadow: '0 0 0 rgba(15,118,110,0)' },
        { boxShadow: '0 0 0 6px rgba(15,118,110,0.14)' },
        { boxShadow: '0 18px 48px rgba(15, 23, 42, 0.10)' }
      ], { duration: 650, easing: 'ease-out' });
    }
  }

  function renderEmptyState() {
    if (!panelsEl || state.panels.size || state.profitPanel) return;
    panelsEl.innerHTML = '<div class="chart-empty">暂无图表。先在上方输入交易对并添加，例如 <strong>(ETH) GHO -> USDC</strong>。</div>';
  }

  function syncRefreshButtonState() {
    if (!refreshBtn) return;
    refreshBtn.disabled = state.panels.size === 0;
  }

  function destroyPanelChart(panel) {
    if (!panel) return;
    if (panel.resizeObserver) {
      panel.resizeObserver.disconnect();
      panel.resizeObserver = null;
    }
    if (panel.chart && typeof panel.chart.remove === 'function') {
      panel.chart.remove();
    }
    panel.chart = null;
    panel.series = null;
    panel.chartEl = null;
  }

  function resizeChart(panel) {
    if (!panel || !panel.chart || !panel.chartEl) return;
    const width = Math.max(280, panel.chartEl.clientWidth);
    panel.chart.applyOptions({ width, height: 320 });
    panel.chart.timeScale().fitContent();
  }

  function normalizeChartTimeValue(time) {
    if (typeof time === 'number') return time;
    if (time && typeof time.timestamp === 'number') return time.timestamp;
    return NaN;
  }

  function formatChartTick(time) {
    const value = normalizeChartTimeValue(time);
    return utils ? utils.formatUtc8ChartTime(value) : String(value);
  }

  function getPriceFormatter() {
    return (price) => (utils ? utils.formatChartPrice(price) : String(price));
  }

  function createChartInstance(container) {
    return window.LightweightCharts.createChart(container, {
      width: Math.max(280, container.clientWidth),
      height: 320,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#334155'
      },
      localization: {
        priceFormatter: getPriceFormatter(),
        timeFormatter: formatChartTick
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.16)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.16)' }
      },
      rightPriceScale: {
        borderColor: 'rgba(148, 163, 184, 0.22)'
      },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.22)',
        timeVisible: true,
        secondsVisible: true,
        tickMarkFormatter: formatChartTick
      },
      crosshair: {
        vertLine: { color: 'rgba(15, 118, 110, 0.2)' },
        horzLine: { color: 'rgba(15, 118, 110, 0.2)' }
      }
    });
  }

  function createPriceSeries(chart, color) {
    const options = {
      color,
      lineWidth: 2,
      lastValueVisible: true,
      priceLineVisible: true,
      crosshairMarkerVisible: true,
      priceFormat: {
        type: 'custom',
        minMove: 0.00001,
        formatter: getPriceFormatter()
      }
    };

    if (chart && typeof chart.addSeries === 'function' && window.LightweightCharts && window.LightweightCharts.LineSeries) {
      return chart.addSeries(window.LightweightCharts.LineSeries, options);
    }

    if (chart && typeof chart.addLineSeries === 'function') {
      return chart.addLineSeries(options);
    }

    throw new Error('Lightweight Charts 未加载');
  }

  function createProfitSeries(chart) {
    const options = {
      baseValue: { type: 'price', price: 1 },
      topLineColor: '#0f766e',
      topFillColor1: 'rgba(15, 118, 110, 0.26)',
      topFillColor2: 'rgba(15, 118, 110, 0.05)',
      bottomLineColor: '#b91c1c',
      bottomFillColor1: 'rgba(185, 28, 28, 0.22)',
      bottomFillColor2: 'rgba(185, 28, 28, 0.05)',
      lineWidth: 2,
      priceLineVisible: true,
      crosshairMarkerVisible: true,
      lastValueVisible: true,
      priceFormat: {
        type: 'custom',
        minMove: 0.00001,
        formatter: getPriceFormatter()
      }
    };

    if (chart && typeof chart.addSeries === 'function' && window.LightweightCharts && window.LightweightCharts.BaselineSeries) {
      return chart.addSeries(window.LightweightCharts.BaselineSeries, options);
    }

    if (chart && typeof chart.addBaselineSeries === 'function') {
      return chart.addBaselineSeries(options);
    }

    return createPriceSeries(chart, '#0f766e');
  }

  function renderPanelMessage(panel, message) {
    if (!panel || !panel.bodyEl) return;
    panel.bodyEl.innerHTML = `<div class="chart-message">${escapeHtml(message)}</div>`;
  }

  function prepareChartCanvas(panel) {
    if (!panel || !panel.bodyEl) return null;
    destroyPanelChart(panel);
    panel.bodyEl.innerHTML = '<div class="chart-canvas"></div>';
    panel.chartEl = panel.bodyEl.querySelector('.chart-canvas');
    return panel.chartEl;
  }

  function attachResizeObserver(panel) {
    if (!panel || !panel.chartEl || typeof ResizeObserver !== 'function') return;
    panel.resizeObserver = new ResizeObserver(() => resizeChart(panel));
    panel.resizeObserver.observe(panel.chartEl);
  }

  function renderPricePanelChart(panel, series) {
    if (!panel || !utils) return;
    const shiftedPoints = utils.shiftChartPointsToUtc8(series.points || []);
    const canvas = prepareChartCanvas(panel);
    if (!canvas) return;

    const chart = createChartInstance(canvas);
    const lineSeries = createPriceSeries(chart, '#0f766e');
    lineSeries.setData(shiftedPoints);

    panel.chart = chart;
    panel.series = lineSeries;
    panel.shiftedPoints = shiftedPoints;
    panel.seriesData = series;

    attachResizeObserver(panel);
    resizeChart(panel);
  }

  function ensureProfitPanel() {
    if (state.profitPanel) {
      panelsEl.appendChild(state.profitPanel.root);
      return state.profitPanel;
    }

    const root = document.createElement('article');
    root.className = 'chart-panel chart-panel-profit';
    root.innerHTML = `
      <div class="chart-panel-header">
        <div>
          <h2 class="chart-panel-title">组合收益图</h2>
          <div class="chart-panel-meta">等待价格图表加载完成...</div>
        </div>
      </div>
      <div class="chart-panel-body">
        <div class="chart-message">至少需要 2 张价格图表。</div>
      </div>
    `;
    panelsEl.appendChild(root);

    state.profitPanel = {
      root,
      metaEl: root.querySelector('.chart-panel-meta'),
      bodyEl: root.querySelector('.chart-panel-body'),
      chart: null,
      series: null,
      chartEl: null,
      resizeObserver: null
    };
    return state.profitPanel;
  }

  function removeProfitPanel() {
    if (!state.profitPanel) return;
    destroyPanelChart(state.profitPanel);
    if (state.profitPanel.root) {
      state.profitPanel.root.remove();
    }
    state.profitPanel = null;
  }

  function renderProfitPanel() {
    if (!utils) return;

    const readyPanels = Array.from(state.panels.values())
      .filter((panel) => Array.isArray(panel.shiftedPoints) && panel.shiftedPoints.length);

    if (readyPanels.length < 2) {
      removeProfitPanel();
      renderEmptyState();
      return;
    }

    const points = utils.buildProfitChartPoints(readyPanels.map((panel) => panel.shiftedPoints));
    if (!points.length) {
      removeProfitPanel();
      return;
    }

    const panel = ensureProfitPanel();
    panel.metaEl.textContent = `按当前 ${readyPanels.length} 张价格图逐时点乘积计算，> 1.0 为正收益。`;
    const canvas = prepareChartCanvas(panel);
    if (!canvas) return;

    const chart = createChartInstance(canvas);
    const series = createProfitSeries(chart);
    series.setData(points);

    panel.chart = chart;
    panel.series = series;
    attachResizeObserver(panel);
    resizeChart(panel);
  }

  async function loadPanelSeries(panel, options = {}) {
    if (!panel) return null;
    panel.metaEl.textContent = '正在加载最近两小时数据...';
    panel.shiftedPoints = [];
    panel.seriesData = null;
    destroyPanelChart(panel);
    renderPanelMessage(panel, '加载中...');

    try {
      const params = new URLSearchParams({
        quoteId: String(panel.pair.quoteId),
        direction: panel.pair.direction
      });
      const response = await fetch(`/api/chart-series?${params.toString()}`);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || '图表数据加载失败');
      }

      const series = await response.json();
      if (!window.LightweightCharts || typeof window.LightweightCharts.createChart !== 'function') {
        throw new Error('图表库加载失败，请刷新页面重试');
      }

      renderPricePanelChart(panel, series);
      panel.metaEl.textContent = `${series.source || '历史快照'} · 最近 2 小时 · ${series.points.length} 个点`;
      if (!options.silentStatus) {
        setStatus(`已刷新 ${panel.pair.label}`);
      }
      return series;
    } catch (error) {
      panel.metaEl.textContent = '加载失败';
      renderPanelMessage(panel, error.message || '图表数据加载失败');
      if (!options.silentStatus) {
        setStatus(error.message || '图表数据加载失败', 'error');
      }
      return null;
    } finally {
      renderProfitPanel();
    }
  }

  function removePanel(key) {
    const panel = state.panels.get(key);
    if (!panel) return;

    destroyPanelChart(panel);
    if (panel.root) {
      panel.root.remove();
    }
    state.panels.delete(key);
    renderProfitPanel();
    syncRefreshButtonState();
    renderEmptyState();
  }

  function addPanel(pair, options = {}) {
    if (!pair || !panelsEl) return Promise.resolve(null);

    const existing = state.panels.get(pair.key);
    if (existing) {
      focusExistingPanel(existing);
      if (!options.silentStatus) {
        setStatus(`已存在 ${pair.label}，已定位到当前图表。`);
      }
      return Promise.resolve(existing.seriesData || null);
    }

    if (!state.panels.size && !state.profitPanel) {
      panelsEl.innerHTML = '';
    }

    const root = document.createElement('article');
    root.className = 'chart-panel';
    root.innerHTML = `
      <div class="chart-panel-header">
        <div>
          <h2 class="chart-panel-title">${escapeHtml(pair.label)}</h2>
          <div class="chart-panel-meta">等待加载...</div>
        </div>
        <div class="chart-panel-actions">
          <button type="button" class="chart-panel-action-btn chart-panel-action-btn-refresh" aria-label="刷新图表">刷新</button>
          <button type="button" class="chart-panel-action-btn chart-panel-action-btn-remove" aria-label="删除图表">×</button>
        </div>
      </div>
      <div class="chart-panel-body">
        <div class="chart-message">准备加载图表...</div>
      </div>
    `;
    panelsEl.appendChild(root);

    const panel = {
      pair,
      root,
      metaEl: root.querySelector('.chart-panel-meta'),
      bodyEl: root.querySelector('.chart-panel-body'),
      chart: null,
      series: null,
      chartEl: null,
      resizeObserver: null,
      shiftedPoints: [],
      seriesData: null
    };
    state.panels.set(pair.key, panel);
    syncRefreshButtonState();

    root.querySelector('.chart-panel-action-btn-remove').addEventListener('click', () => {
      removePanel(pair.key);
    });
    root.querySelector('.chart-panel-action-btn-refresh').addEventListener('click', () => {
      loadPanelSeries(panel);
    });

    const loadPromise = loadPanelSeries(panel, { silentStatus: options.silentStatus });
    if (!options.silentStatus) {
      setStatus(`已添加 ${pair.label}`);
    }
    return loadPromise;
  }

  function commitSelection() {
    const pair = getSelectedPair();
    if (!pair) {
      setStatus(searchInput && searchInput.value.trim()
        ? '没有匹配的交易对，请换个关键词。'
        : '先输入关键词或从候选里选一个交易对。', 'error');
      return;
    }

    addPanel(pair);
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    hideSuggestions();
  }

  async function refreshAllPanels() {
    const panels = Array.from(state.panels.values());
    if (!panels.length) {
      setStatus('当前没有可刷新的图表。', 'error');
      return;
    }

    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = '刷新中...';
    }

    try {
      setStatus(`正在刷新 ${panels.length} 张图表...`);
      await Promise.all(panels.map((panel) => loadPanelSeries(panel, { silentStatus: true })));
      setStatus(`已刷新 ${panels.length} 张图表。`);
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '刷新全部';
      }
    }
  }

  async function applyPrefillPairs() {
    if (state.prefillApplied || !utils) return;
    state.prefillApplied = true;

    const prefillPairs = utils.parseChartsPagePrefill(location.href);
    if (!prefillPairs.length) return;

    const pairMap = new Map(state.pairs.map((pair) => [pair.key, pair]));
    const matched = [];
    const missing = [];

    for (const item of prefillPairs) {
      const key = utils.buildChartPairKey(item.quoteId, item.direction);
      if (pairMap.has(key)) {
        matched.push(pairMap.get(key));
      } else {
        missing.push(key);
      }
    }

    for (const pair of matched) {
      // 保持按套利腿顺序依次添加，避免状态提示来回跳。
      // eslint-disable-next-line no-await-in-loop
      await addPanel(pair, { silentStatus: true });
    }

    if (matched.length && missing.length) {
      setStatus(`已预加载 ${matched.length} 张图表，另有 ${missing.length} 条腿在最近两小时内没有快照。`, 'error');
      return;
    }

    if (matched.length) {
      setStatus(`已从套利机会预加载 ${matched.length} 张图表。`);
      return;
    }

    setStatus('URL 中的套利图表参数未命中最近两小时快照。', 'error');
  }

  async function loadPairs() {
    try {
      const response = await fetch('/api/chart-pairs');
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || '候选交易对加载失败');
      }

      const pairs = await response.json();
      state.pairs = Array.isArray(pairs) ? pairs : [];
      addBtn.disabled = state.pairs.length === 0;
      syncRefreshButtonState();
      setStatus(state.pairs.length ? `已加载 ${state.pairs.length} 个可选交易对。` : '最近两小时暂无可用历史数据。');
      renderSuggestions();
      await applyPrefillPairs();
    } catch (error) {
      addBtn.disabled = true;
      if (refreshBtn) {
        refreshBtn.disabled = true;
      }
      setStatus(error.message || '候选交易对加载失败', 'error');
    }
  }

  function bindEvents() {
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.activeIndex = -1;
        renderSuggestions();
      });
      searchInput.addEventListener('focus', () => {
        renderSuggestions();
      });
      searchInput.addEventListener('keydown', (event) => {
        if (!state.filteredPairs.length && event.key !== 'Escape') return;

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          state.activeIndex = Math.min(state.filteredPairs.length - 1, state.activeIndex + 1);
          renderSuggestions();
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          state.activeIndex = Math.max(0, state.activeIndex - 1);
          renderSuggestions();
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          commitSelection();
          return;
        }

        if (event.key === 'Escape') {
          hideSuggestions();
        }
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        renderSuggestions();
        commitSelection();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshAllPanels();
      });
    }

    if (suggestionsEl) {
      suggestionsEl.addEventListener('click', (event) => {
        const button = event.target.closest('[data-chart-pair-key]');
        if (!button) return;
        const pair = state.filteredPairs.find((item) => item.key === button.dataset.chartPairKey);
        if (!pair) return;
        addPanel(pair);
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        hideSuggestions();
      });
    }

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (searchInput && (target === searchInput || searchInput.contains(target))) return;
      if (suggestionsEl && suggestionsEl.contains(target)) return;
      hideSuggestions();
    });
  }

  bindEvents();
  loadPairs();
  syncRefreshButtonState();
  renderEmptyState();
}());
