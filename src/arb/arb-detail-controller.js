(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.ArbDetailController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createAbortError() {
    const aborted = new Error('Aborted');
    aborted.name = 'AbortError';
    return aborted;
  }

  function createArbDetailController(deps = {}) {
    const arbDetailUtils = deps.arbDetailUtils;
    const arbDetailRefreshUtils = deps.arbDetailRefreshUtils;
    const arbPanelLayoutUtils = deps.arbPanelLayoutUtils;
    const domRenderUtils = deps.domRenderUtils;
    const documentImpl = deps.documentImpl;
    const windowImpl = deps.windowImpl || {};
    const fetchImpl = deps.fetchImpl;
    const setTimer = deps.setTimeout || setTimeout;
    const clearTimer = deps.clearTimeout || clearTimeout;
    const promptImpl = deps.promptImpl || (windowImpl.prompt ? windowImpl.prompt.bind(windowImpl) : null);

    let state = arbDetailUtils.buildDefaultArbDetailState();
    let fetchController = null;
    let chartPreviewCharts = [];
    let chartPreviewRunId = 0;

    const sourceBudgetRuntime = arbDetailUtils.createArbDetailSourceBudgetRuntime();
    const refreshScheduler = arbDetailRefreshUtils.createArbDetailRefreshScheduler({
      intervalMs: deps.detailRefreshIntervalMs,
      isActive: (refreshToken) => state.visible && state.refreshToken === refreshToken,
      isRefreshing: () => state.isRefreshing,
      setRefreshing: (refreshing, refreshToken) => {
        if (refreshing || state.refreshToken === refreshToken) {
          state.isRefreshing = Boolean(refreshing);
        }
      },
      refresh: refreshCards,
      logError: deps.logRefreshError
    });
    const chartAutoRefreshRuntime = arbDetailRefreshUtils.createArbDetailChartAutoRefreshRuntime({
      intervalMs: deps.chartAutoRefreshIntervalMs,
      isVisible: () => state.visible,
      isEnabled: () => Boolean(deps.refs.chartAutoRefreshToggle && deps.refs.chartAutoRefreshToggle.checked),
      refresh: () => {
        void syncChartPreview(state.selectedOpportunity, {
          forceReload: true
        });
      }
    });

    function getState() {
      return state;
    }

    function isVisible() {
      return Boolean(state.visible);
    }

    function isDashboardPaused() {
      return Boolean(state.pausedDashboard);
    }

    function recordSourceAttempt(source) {
      sourceBudgetRuntime.recordTimestamp(source);
    }

    function getRetainedOpportunities(getOpportunity) {
      const retainedEntries = [];
      if (state && state.selectedOpportunity && state.selectedOpportunity.id) {
        retainedEntries.push(state.selectedOpportunity);
      }
      const activeOpportunity = state && state.opportunityId && typeof getOpportunity === 'function'
        ? getOpportunity(state.opportunityId)
        : null;
      if (activeOpportunity) {
        retainedEntries.push(activeOpportunity);
      }
      return retainedEntries;
    }

    function syncQuoteRunStateTag() {
      domRenderUtils.applyQuoteRunStateTagDomState(
        deps.refs.quoteRunStateTag,
        arbDetailUtils.getQuoteRunState(state.pausedDashboard)
      );
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimer(resolve, ms));
    }

    function formatDetailNumber(value, precision = 6) {
      return typeof deps.formatDetailNumber === 'function'
        ? deps.formatDetailNumber(value, precision)
        : arbDetailUtils.formatDetailNumber(value, precision);
    }

    function buildRowsHtml(card, cardIndex) {
      return arbDetailUtils.buildArbDetailRowsHtml(card, {
        cardIndex,
        buildSourceHtml: (row, options) => arbDetailUtils.buildArbDetailSourceHtml(row, options)
      });
    }

    function buildSummaryHtml(card, index, bestProfitIndices, bestProfitRateIndices) {
      return arbDetailUtils.buildArbDetailSummaryHtml(card, {
        index,
        bestProfitIndices,
        bestProfitRateIndices,
        formatNumber: formatDetailNumber
      });
    }

    function syncInputValues() {
      arbDetailUtils.syncArbDetailInputValues(state.cards, {
        editingInputIndex: state.editingInputIndex,
        getElementById: (id) => documentImpl.getElementById(id)
      });
    }

    function renderCardContents() {
      const { bestProfitIndices, bestProfitRateIndices } = arbDetailUtils.findBestSummaryIndices(state.cards);
      arbDetailUtils.applyArbDetailCardContents(state.cards, {
        getElementById: (id) => documentImpl.getElementById(id),
        buildRowsHtml: (card, index) => buildRowsHtml(card, index),
        buildSummaryHtml: (card, index) => buildSummaryHtml(card, index, bestProfitIndices, bestProfitRateIndices)
      });
    }

    function syncPrimaryCardQuoteState(quote, data, successSource, isInverseFetch) {
      if (!quote) return;
      const previousState = deps.getQuoteMarketState(quote.id) || {};
      const nextState = arbDetailUtils.buildArbDetailSnapshotMonitorState(previousState, data, {
        successSource,
        isInverseFetch
      });
      deps.setQuoteMarketState(quote.id, nextState);
    }

    async function waitForSourceBudget(source, signal) {
      const intervalKey = arbDetailUtils.getArbDetailIntervalKey(source);
      if (!intervalKey) return;
      if (signal && signal.aborted) throw createAbortError();

      const waitMs = arbDetailUtils.getArbDetailRateLimitDelay(
        sourceBudgetRuntime.getTimestamp(source),
        arbDetailUtils.resolveArbDetailIntervalMs(source, deps.getApiIntervals())
      );

      if (waitMs > 0) {
        await sleep(waitMs);
        if (signal && signal.aborted) throw createAbortError();
      }
    }

    function destroyChartPreview() {
      chartPreviewCharts.forEach((chart) => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      });
      chartPreviewCharts = [];
      arbDetailUtils.clearArbDetailPreviewContainers({
        chartPreview: deps.refs.chartPreview,
        profitPreview: deps.refs.profitPreview
      });
    }

    function syncProfitPreview(seriesList, renderer) {
      const cardEl = arbDetailUtils.getArbDetailProfitCardElement(deps.refs.chartPreview);
      if (!cardEl) return;

      const chartsUtils = deps.getChartsUtils();
      const previewState = arbDetailUtils.buildArbDetailProfitPreviewState(seriesList, {
        buildProfitChartPoints: chartsUtils && chartsUtils.buildProfitChartPoints,
        canMountProfitHistoryChart: Boolean(renderer && typeof renderer.mountProfitHistoryChart === 'function')
      });
      if (!previewState.ready) {
        arbDetailUtils.applyArbDetailProfitPreviewMessage(cardEl, previewState.message);
        return;
      }

      arbDetailUtils.applyArbDetailProfitPreviewReady(cardEl, previewState.seriesCount);
      const profitRefs = arbDetailUtils.getArbDetailProfitPreviewElements(cardEl);
      if (!profitRefs.canvasEl) return;

      const chartInstance = renderer.mountProfitHistoryChart(profitRefs.canvasEl, {
        mini: true,
        height: 104,
        showRightPriceScale: true
      });
      chartInstance.update(previewState.points);
      chartPreviewCharts.push(chartInstance);

      arbDetailUtils.applyArbDetailProfitPreviewMeta(profitRefs.metaEl, previewState.metaText);
    }

    async function syncChartPreview(current, options = {}) {
      const chartPreview = deps.refs.chartPreview;
      if (!chartPreview) return;
      const forceReload = options.forceReload === true;

      const pairs = current && current.cycle
        ? arbDetailUtils.buildArbDetailChartPairs(current.cycle)
        : [];
      const signature = arbDetailUtils.buildArbDetailChartPreviewSignature(pairs);
      const chartsUtils = deps.getChartsUtils();
      const chartHref = chartsUtils && typeof chartsUtils.buildChartsPageHref === 'function'
        ? arbDetailUtils.buildArbOpportunityChartHref(
          current,
          (chartPairs) => chartsUtils.buildChartsPageHref(chartPairs)
        )
        : '';

      arbDetailUtils.applyArbDetailChartLinkState(deps.refs.chartLink, chartHref);

      if (!pairs.length) {
        state.chartPreviewSignature = '';
        destroyChartPreview();
        const message = '当前路径暂无可用历史图表。';
        arbDetailUtils.applyArbDetailChartPreviewMessage(chartPreview, message);
        arbDetailUtils.applyArbDetailProfitPreviewMessage(
          arbDetailUtils.getArbDetailProfitCardElement(chartPreview),
          message
        );
        return;
      }

      if (!forceReload && state.chartPreviewSignature === signature && arbDetailUtils.hasArbDetailChartPreviewContent(chartPreview)) {
        return;
      }

      chartPreviewRunId += 1;
      const runId = chartPreviewRunId;
      state.chartPreviewSignature = signature;
      destroyChartPreview();
      arbDetailUtils.applyArbDetailChartPreviewStrip(chartPreview, pairs, {
        buildChartPairLabel: (pair) => deps.getChartsUtils().buildChartPairLabel(pair)
      });

      const renderer = typeof deps.getChartsRenderer === 'function'
        ? deps.getChartsRenderer()
        : null;
      if (!renderer || typeof renderer.mountPriceHistoryChart !== 'function') {
        const message = '图表模块未就绪，请刷新页面后重试。';
        arbDetailUtils.applyArbDetailChartPreviewMessage(chartPreview, message);
        arbDetailUtils.applyArbDetailProfitPreviewMessage(
          arbDetailUtils.getArbDetailProfitCardElement(chartPreview),
          message
        );
        return;
      }

      const loadedSeries = new Array(pairs.length).fill(null);
      await Promise.all(pairs.map(async (pair, index) => {
        const chartRefs = arbDetailUtils.getArbDetailChartCardElements(chartPreview, index);
        if (!chartRefs.cardEl) return;

        try {
          const params = new URLSearchParams({
            quoteId: String(pair.quoteId),
            direction: pair.direction,
            windowSec: '3600'
          });
          const response = await fetchImpl(`/api/chart-series?${params.toString()}`);
          if (!response.ok) {
            const body = await response.text();
            throw new Error(body || '图表加载失败');
          }

          const series = await response.json();
          if (!state.visible || chartPreviewRunId !== runId) {
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
          chartPreviewCharts.push(chartInstance);

          arbDetailUtils.applyArbDetailChartLoadedMeta(chartRefs.metaEl, series.source);
        } catch (error) {
          if (chartPreviewRunId !== runId) return;
          arbDetailUtils.applyArbDetailChartCardError(chartRefs.canvasEl, chartRefs.metaEl, error.message || '图表加载失败');
        }
      }));

      if (!state.visible || chartPreviewRunId !== runId) {
        return;
      }
      syncProfitPreview(loadedSeries, renderer);
    }

    function render(forceShellRebuild = false) {
      const { modal, grid, subtitle, chartLink } = deps.refs;
      if (!grid || !modal) return;
      if (!state.visible) {
        arbDetailUtils.applyArbDetailModalVisibility(modal, false);
        return;
      }

      const current = state.selectedOpportunity;
      if (!current || !current.cycle) {
        arbDetailUtils.applyArbDetailSubtitleText(
          subtitle,
          arbDetailUtils.buildArbDetailSubtitleText(current)
        );
        arbDetailUtils.applyArbDetailChartLinkState(chartLink, '');
        destroyChartPreview();
        arbDetailUtils.applyArbDetailErrorHtml(grid, '当前套利机会已失效，请关闭后重新选择。');
        arbDetailUtils.applyArbDetailModalVisibility(modal, true);
        return;
      }

      const visibleLegs = (current.cycle.legs || []).filter((leg) => !deps.isRuleLeg(leg));
      const legLines = arbPanelLayoutUtils.buildArbPathLegLines(visibleLegs, deps.buildArbPathLegLineOptions());
      arbDetailUtils.applyArbDetailSubtitleText(
        subtitle,
        arbDetailUtils.buildArbDetailSubtitleText(current, legLines)
      );
      void syncChartPreview(current);
      if (forceShellRebuild || arbDetailUtils.shouldRebuildArbDetailShellDom(state.cards, {
        gridEl: grid,
        getElementById: (id) => documentImpl.getElementById(id)
      })) {
        arbDetailUtils.applyArbDetailShellHtml(grid, state.cards);
      }
      syncInputValues();
      renderCardContents();
      arbDetailUtils.applyArbDetailModalVisibility(modal, true);
    }

    function setDashboardPause(paused) {
      const nextPaused = Boolean(paused);
      if (state.pausedDashboard === nextPaused) return;
      state.pausedDashboard = nextPaused;
      if (nextPaused) {
        deps.abortActiveFetchControllers();
      }
      deps.updateSchedulers();
      syncQuoteRunStateTag();
    }

    function abortRefresh() {
      if (fetchController) {
        fetchController.abort();
        fetchController = null;
      }
    }

    function close() {
      refreshScheduler.clear();
      abortRefresh();
      state = arbDetailUtils.buildClosedArbDetailState(state);
      chartPreviewRunId += 1;
      destroyChartPreview();
      chartAutoRefreshRuntime.clear();
      arbDetailUtils.applyArbDetailChartLinkState(deps.refs.chartLink, '');
      arbDetailUtils.applyArbDetailModalVisibility(deps.refs.modal, false);
      setDashboardPause(false);
    }

    function copyMultiLinks() {
      const rows = Array.isArray(state.cards[0]?.rows) ? state.cards[0].rows : [];
      const url = arbDetailUtils.buildArbDetailMultiLinksUrl(rows, {
        name: ''
      });
      if (!url) {
        deps.showCopyToast('暂无可复制多链接');
        return;
      }
      deps.copyTextToClipboard(url)
        .then(() => deps.showCopyToast('已复制多链接'))
        .catch(() => deps.showCopyToast('复制失败'));
    }

    function open(opportunityId) {
      refreshScheduler.clear();
      let current = deps.getOpportunity(opportunityId);
      if (!current) {
        deps.refreshOpportunities();
        current = deps.getOpportunity(opportunityId);
      }
      if (!current || !current.cycle) return;

      abortRefresh();

      const baseAmount = arbDetailUtils.resolveArbOpportunityBaseAmount(
        current.cycle,
        deps.findQuoteById,
        deps.isRuleLeg
      );
      state = arbDetailUtils.buildOpenArbDetailState(state, {
        opportunityId,
        opportunity: current,
        baseAmount
      });
      if (deps.refs.chartAutoRefreshToggle) {
        deps.refs.chartAutoRefreshToggle.checked = true;
      }
      setDashboardPause(true);
      render(true);
      chartAutoRefreshRuntime.sync();
      refreshScheduler.start(state.refreshToken);
    }

    function restartRefresh() {
      if (!state.visible) return;
      refreshScheduler.clear();
      abortRefresh();
      state.refreshToken += 1;
      state.isRefreshing = false;
      refreshScheduler.start(state.refreshToken);
    }

    function nudgeInput(index, delta) {
      const card = state.cards[index];
      if (!card) return;
      const nextValue = arbDetailUtils.buildNudgedArbDetailInputAmount(card.inputAmount, delta);
      state.editingInputIndex = null;
      arbDetailUtils.applyArbDetailInputUpdate(state.cards, index, nextValue);
      render();
    }

    function commitInput(index, rawValue) {
      const card = state.cards[index];
      if (!card) return;

      const parsed = arbDetailUtils.parseCommittedArbDetailInput(rawValue);
      if (parsed === null) {
        render();
        return;
      }

      if (parsed === card.inputAmount) {
        render();
        return;
      }

      arbDetailUtils.applyArbDetailInputUpdate(state.cards, index, parsed);
      render();
      restartRefresh();
    }

    async function refreshCards(refreshToken) {
      const current = state.selectedOpportunity;
      if (!current || !current.cycle) return false;

      const executableLegs = (current.cycle.legs || []).filter((leg) => !deps.isRuleLeg(leg));
      if (!executableLegs.length) return false;

      const controller = new AbortController();
      fetchController = controller;

      try {
        for (const [cardIndex, card] of state.cards.entries()) {
          if (!state.visible || state.refreshToken !== refreshToken) return;

          const requestVersion = Number(card.requestVersion) || 0;

          try {
            const startAmount = Number(card.inputAmount);
            let rollingAmount = startAmount;
            let rows = [];
            let finalSymbol = '';
            let shouldSkipApply = false;

            for (const leg of executableLegs) {
              const match = deps.findQuoteById(leg.quoteId);
              if (!match || !match.quote) {
                throw new Error('报价配置不存在');
              }
              const legInputAmount = rollingAmount;

              const { data, successSource } = await deps.fetchQuoteByStrategy(match.quote, {
                signal: controller.signal,
                isInverseFetch: Boolean(leg.inverse),
                amount: legInputAmount,
                requestChannelId: 'default',
                skipDelay: true,
                beforeSourceAttempt: (source) => waitForSourceBudget(source, controller.signal)
              });

              if (!state.visible || state.refreshToken !== refreshToken) {
                return;
              }
              if (!arbDetailUtils.shouldApplyArbDetailRequestVersion(requestVersion, card.requestVersion)) {
                shouldSkipApply = true;
                break;
              }

              if (arbDetailUtils.shouldSyncArbDetailSnapshotForCard(cardIndex)) {
                syncPrimaryCardQuoteState(
                  match.quote,
                  data,
                  successSource,
                  Boolean(leg.inverse)
                );
              }

              rollingAmount = data.finalAmountOut;
              finalSymbol = data.symbols.to || finalSymbol;
              rows.push(arbDetailUtils.buildArbDetailRow(match.quote, data, {
                inputAmount: legInputAmount,
                isInverseFetch: Boolean(leg.inverse),
                formatChainLabel: deps.formatChainLabel,
                formatAmount: (value) => `${formatDetailNumber(value)}`
              }));
            }

            if (shouldSkipApply || !arbDetailUtils.shouldApplyArbDetailRequestVersion(requestVersion, card.requestVersion)) {
              continue;
            }

            const summary = arbDetailUtils.summarizeDetailResult(startAmount, rollingAmount);
            if (cardIndex === 3) {
              const baseRows = Array.isArray(state.cards[0]?.rows) ? state.cards[0].rows : [];
              rows = arbDetailUtils.applyArbDetailRateDeltas(rows, baseRows);
            }
            card.rows = rows;
            card.summary = {
              ...summary,
              symbol: finalSymbol
            };
            card.error = '';
            renderCardContents();
          } catch (error) {
            if (error.name === 'AbortError') {
              throw error;
            }
            if (!arbDetailUtils.shouldApplyArbDetailRequestVersion(requestVersion, card.requestVersion)) {
              continue;
            }
            arbDetailUtils.applyArbDetailCardError(
              state.cards,
              cardIndex,
              error.message || '详情报价失败'
            );
            renderCardContents();
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          return false;
        }
        throw error;
      } finally {
        if (fetchController === controller) {
          fetchController = null;
        }
        renderCardContents();
      }

      return true;
    }

    function bindGridEvents() {
      const grid = deps.refs.grid;
      if (!grid) return false;

      grid.addEventListener('mousedown', (event) => {
        const action = arbDetailUtils.resolveArbDetailGridMouseDownAction(event, { closestEventTarget: deps.closestEventTarget });
        if (action.type === 'prevent-step-default') {
          event.preventDefault();
        }
      });
      grid.addEventListener('click', (event) => {
        const action = arbDetailUtils.resolveArbDetailGridClickAction(event, { closestEventTarget: deps.closestEventTarget });
        if (action.type === 'copy-token-address') {
          deps.copyTextToClipboard(action.tokenAddress)
            .then(() => deps.showCopyToast(`已复制 ${action.tokenSymbol} 地址`))
            .catch(() => deps.showCopyToast('复制失败'));
          return;
        }
        if (action.type === 'copy-dex-link') {
          void deps.copyDexLinkFromElement(action.element);
          return;
        }
        if (action.type === 'mute-leg') {
          const row = state.cards[action.cardIndex] && Array.isArray(state.cards[action.cardIndex].rows)
            ? state.cards[action.cardIndex].rows[action.rowIndex]
            : null;
          if (!row) return;
          const durationHours = deps.promptMutedPathLegDurationHours(promptImpl);
          if (!durationHours) return;
          deps.muteLeg(row, durationHours, Date.now());
          return;
        }
        if (action.type === 'nudge-input') {
          nudgeInput(action.index, action.step);
        }
      });
      grid.addEventListener('focusin', (event) => {
        const action = arbDetailUtils.resolveArbDetailGridInputAction(event, { closestEventTarget: deps.closestEventTarget });
        if (action.type !== 'input') return;
        state.editingInputIndex = action.index;
      });
      grid.addEventListener('focusout', (event) => {
        const action = arbDetailUtils.resolveArbDetailGridInputAction(event, { closestEventTarget: deps.closestEventTarget });
        if (action.type !== 'input') return;
        state.editingInputIndex = null;
        commitInput(action.index, action.value);
      });
      grid.addEventListener('keydown', (event) => {
        const action = arbDetailUtils.resolveArbDetailGridKeydownAction(event, { closestEventTarget: deps.closestEventTarget });
        if (action.type !== 'commit-input') return;
        event.preventDefault();
        action.input.blur();
      });
      return true;
    }

    function bindChromeEvents() {
      if (deps.refs.closeButton) {
        deps.refs.closeButton.addEventListener('click', close);
      }
      if (deps.refs.multiLinksButton) {
        deps.refs.multiLinksButton.addEventListener('click', copyMultiLinks);
      }
      if (deps.refs.chartAutoRefreshToggle) {
        deps.refs.chartAutoRefreshToggle.addEventListener('change', () => {
          chartAutoRefreshRuntime.sync();
        });
      }
      if (deps.refs.modal) {
        deps.refs.modal.addEventListener('click', (event) => {
          if (event.target === deps.refs.modal) {
            close();
          }
        });
      }
    }

    return {
      bindChromeEvents,
      bindGridEvents,
      close,
      getRetainedOpportunities,
      getState,
      isDashboardPaused,
      isVisible,
      open,
      recordSourceAttempt,
      render,
      restartRefresh,
      syncQuoteRunStateTag
    };
  }

  return {
    createArbDetailController
  };
});
