(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./dex-link-utils'));
    return;
  }
  root.ArbDetailUtils = factory(root.DexLinkUtils);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (dexLinkUtils) {
  const buildDexLink = dexLinkUtils && typeof dexLinkUtils.buildDexLink === 'function'
    ? dexLinkUtils.buildDexLink
    : () => null;

  function normalizePositiveAmount(value, fallback = 1) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return fallback;
    return amount;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeRoundedDetailAmount(value, fallback = 1) {
    const roundedToOneDecimal = Math.round(Number(value) * 10) / 10;
    return normalizePositiveAmount(roundedToOneDecimal, fallback);
  }

  function buildDetailInputAmounts(baseAmount) {
    const safeBaseAmount = normalizePositiveAmount(baseAmount, 1);
    return [
      safeBaseAmount,
      normalizeRoundedDetailAmount(safeBaseAmount * 0.5, 1),
      normalizeRoundedDetailAmount(safeBaseAmount * 1.5, 1),
      normalizeRoundedDetailAmount(safeBaseAmount * 3, 1)
    ];
  }

  function buildArbDetailRateText(rawPrice, fromSymbol, toSymbol, precision = 6) {
    if (rawPrice === null || rawPrice === undefined || rawPrice === '') return '--';
    const numericRate = Number(rawPrice);
    if (!Number.isFinite(numericRate)) return '--';
    const safeFromSymbol = String(fromSymbol || '').trim();
    const safeToSymbol = String(toSymbol || '').trim();
    const formattedRate = Number(numericRate.toFixed(precision));
    if (!safeFromSymbol || !safeToSymbol) {
      return String(formattedRate);
    }
    return `1 ${safeFromSymbol} ≈ ${formattedRate} ${safeToSymbol}`;
  }

  function buildArbDetailRateDeltaText(baseRate, nextRate, decimals = 1) {
    const safeBaseRate = Number(baseRate);
    const safeNextRate = Number(nextRate);
    if (!Number.isFinite(safeBaseRate) || safeBaseRate <= 0) return '--';
    if (!Number.isFinite(safeNextRate) || safeNextRate <= 0) return '--';
    const bpDelta = ((safeNextRate / safeBaseRate) - 1) * 10000;
    const safeDecimals = Number.isInteger(decimals) && decimals >= 0 ? decimals : 1;
    const roundedDelta = Number(bpDelta.toFixed(safeDecimals));
    const sign = roundedDelta >= 0 ? '+' : '';
    return `${sign}${roundedDelta.toFixed(safeDecimals)}bp`;
  }

  function summarizeDetailResult(startAmount, finalAmount) {
    const safeStart = normalizePositiveAmount(startAmount, 1);
    const safeFinal = Number(finalAmount);
    if (!Number.isFinite(safeFinal)) {
      return { profit: null, profitRate: null };
    }

    const profit = Number((safeFinal - safeStart).toFixed(12));
    return {
      profit,
      profitRate: safeStart > 0 ? Number((profit / safeStart).toFixed(12)) : null
    };
  }

  function getQuoteRunState(isPaused) {
    return isPaused
      ? { text: '暂停中', tone: 'paused' }
      : { text: '报价中', tone: 'running' };
  }

  function buildArbDetailChartPairs(cycle) {
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
  }

  function collectBestIndices(items, selector) {
    let bestValue = null;
    const indices = [];

    (items || []).forEach((item, index) => {
      const value = selector(item, index);
      if (typeof value !== 'number' || Number.isNaN(value)) return;

      if (bestValue === null || value > bestValue) {
        bestValue = value;
        indices.length = 0;
        indices.push(index);
        return;
      }

      if (value === bestValue) {
        indices.push(index);
      }
    });

    return indices;
  }

  function findBestSummaryIndices(cards) {
    return {
      bestProfitIndices: collectBestIndices(cards, (card) => card?.summary?.profit),
      bestProfitRateIndices: collectBestIndices(cards, (card) => card?.summary?.profitRate)
    };
  }

  function getArbDetailCardDomIds(index) {
    const suffix = String(index);
    return {
      inputId: `arb-detail-input-${suffix}`,
      rowsId: `arb-detail-rows-${suffix}`,
      summaryId: `arb-detail-summary-${suffix}`
    };
  }

  function shouldSyncArbDetailInput(index, editingInputIndex) {
    return index !== editingInputIndex;
  }

  function parseCommittedArbDetailInput(rawValue) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }

  function shouldCommitArbDetailInputOnKey(key) {
    return key === 'Enter';
  }

  function getArbDetailIntervalKey(source) {
    switch (source) {
      case 'Kyber':
        return 'kyber';
      case '0x':
        return 'zerox';
      case 'Velora':
        return 'velora';
      case 'LI.FI':
        return 'lifi';
      case 'Bybit':
        return 'bybit';
      case 'Binance':
        return 'binance';
      case 'Jupiter':
        return 'solana';
      case 'Cetus':
        return 'sui';
      case 'Ekubo':
        return 'starknet';
      default:
        return null;
    }
  }

  function getArbDetailRateLimitDelay(lastRequestAt, intervalMs, now = Date.now()) {
    const safeInterval = Number(intervalMs);
    if (!Number.isFinite(safeInterval) || safeInterval <= 0) return 0;
    const safeLast = Number(lastRequestAt);
    if (!Number.isFinite(safeLast) || safeLast <= 0) return 0;
    return Math.max(0, Math.ceil(safeLast + safeInterval - now));
  }

  function getArbDetailBudgetTimestamp(budgetState, source) {
    if (!(budgetState instanceof Map)) return null;
    const intervalKey = getArbDetailIntervalKey(source);
    if (!intervalKey) return null;
    const timestamp = Number(budgetState.get(intervalKey));
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
  }

  function recordArbDetailBudgetTimestamp(budgetState, source, requestedAt = Date.now()) {
    if (!(budgetState instanceof Map)) return null;
    const intervalKey = getArbDetailIntervalKey(source);
    if (!intervalKey) return null;

    const nextTimestamp = Number(requestedAt);
    if (!Number.isFinite(nextTimestamp) || nextTimestamp <= 0) {
      return getArbDetailBudgetTimestamp(budgetState, source);
    }

    const currentTimestamp = getArbDetailBudgetTimestamp(budgetState, source);
    const appliedTimestamp = currentTimestamp && currentTimestamp > nextTimestamp
      ? currentTimestamp
      : nextTimestamp;
    budgetState.set(intervalKey, appliedTimestamp);
    return appliedTimestamp;
  }

  function shouldSyncArbDetailSnapshotForCard(cardIndex) {
    return Number(cardIndex) === 0;
  }

  function buildArbDetailSnapshotMonitorState(previousState, quoteResult, options = {}) {
    const baseState = previousState && typeof previousState === 'object'
      ? { ...previousState }
      : {};
    const symbols = quoteResult && quoteResult.symbols && typeof quoteResult.symbols === 'object'
      ? quoteResult.symbols
      : {};
    const isInverseFetch = Boolean(options.isInverseFetch);

    if (isInverseFetch) {
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
  }

  function buildArbDetailDexLink(config = {}) {
    return buildDexLink(config);
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

  function buildArbDetailRowsHtml(card = {}, options = {}) {
    if (card.rows && card.rows.length) {
      const buildPairHtml = typeof options.buildPairHtml === 'function'
        ? options.buildPairHtml
        : buildArbDetailPairHtml;
      const buildSourceHtml = typeof options.buildSourceHtml === 'function'
        ? options.buildSourceHtml
        : () => '';

      return card.rows.map((row, rowIndex) => `
                <div class="arb-detail-leg">
                    <div class="arb-detail-leg-line">
                        <div class="arb-detail-leg-main">
                            <div class="arb-detail-leg-pair">${buildPairHtml(row)}</div>
                            <div class="arb-detail-leg-source">${buildSourceHtml(row, { cardIndex: options.cardIndex, rowIndex })}</div>
                        </div>
                        <div class="arb-detail-leg-amount-wrap">
                            <span class="arb-detail-leg-amount">${escapeHtml(row.rateText || row.amountText || '--')}</span>
                            ${row.rateDeltaText ? `<span class="arb-detail-leg-rate-delta ${escapeHtml(row.rateDeltaTone || 'neutral')}">${escapeHtml(row.rateDeltaText)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
    }

    return `<div class="${card.error ? 'arb-detail-error' : 'arb-detail-loading'}">${escapeHtml(card.error || '等待报价...')}</div>`;
  }

  function buildArbDetailSummaryHtml(card = {}, options = {}) {
    if (card.summary && typeof card.summary.profit === 'number') {
      const bestProfitIndices = Array.isArray(options.bestProfitIndices) ? options.bestProfitIndices : [];
      const bestProfitRateIndices = Array.isArray(options.bestProfitRateIndices) ? options.bestProfitRateIndices : [];
      const formatNumber = typeof options.formatNumber === 'function'
        ? options.formatNumber
        : (value) => String(value);
      const formatProfitRate = typeof options.formatProfitRate === 'function'
        ? options.formatProfitRate
        : (value) => String(value);
      const profitClass = bestProfitIndices.includes(options.index) ? ' arb-detail-metric-best' : '';
      const rateClass = bestProfitRateIndices.includes(options.index) ? ' arb-detail-metric-best' : '';
      return `
                <span class="arb-detail-metric${profitClass}">收益 ${formatNumber(card.summary.profit)} ${escapeHtml(card.summary.symbol || '')}</span>
                <span class="arb-detail-metric${rateClass}">${formatProfitRate(card.summary.profitRate)}</span>
            `;
    }

    return '<span class="arb-detail-metric">收益 --</span>';
  }

  function buildArbDetailShellHtml(cards = []) {
    return (Array.isArray(cards) ? cards : []).map((card, index) => {
      const ids = getArbDetailCardDomIds(index);
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
                                value="${escapeHtml(card && card.inputAmount)}"
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
  }

  function buildArbDetailChartMessageHtml(message) {
    return `<div class="arb-detail-chart-message">${escapeHtml(message)}</div>`;
  }

  function buildArbDetailChartPreviewCardHtml(pair, index, options = {}) {
    const buildChartPairLabel = typeof options.buildChartPairLabel === 'function'
      ? options.buildChartPairLabel
      : () => '';
    const label = buildChartPairLabel(pair);
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
            <article class="arb-detail-chart-card arb-detail-profit-card" data-arb-detail-profit-card="true">
                <div class="arb-detail-chart-card-head arb-detail-profit-head">
                    <div>
                        <div class="arb-detail-chart-card-title arb-detail-profit-title">组合收益图</div>
                        <div class="arb-detail-chart-card-meta arb-detail-profit-meta">等待价格图表加载完成...</div>
                    </div>
                </div>
                <div class="arb-detail-chart-canvas arb-detail-profit-canvas"></div>
            </article>
        `;
  }

  function buildArbDetailProfitPreviewMessageHtml(message) {
    const safeMessage = escapeHtml(message);
    return `
            <div class="arb-detail-chart-card-head arb-detail-profit-head">
                <div>
                    <div class="arb-detail-chart-card-title arb-detail-profit-title">组合收益图</div>
                    <div class="arb-detail-chart-card-meta arb-detail-profit-meta">${safeMessage}</div>
                </div>
            </div>
            <div class="arb-detail-chart-message">${safeMessage}</div>
        `;
  }

  function buildArbDetailProfitPreviewReadyHtml(seriesCount) {
    const safeCount = Number(seriesCount);
    const countText = Number.isFinite(safeCount) ? String(safeCount) : '0';
    return `
            <div class="arb-detail-chart-card-head arb-detail-profit-head">
                <div>
                    <div class="arb-detail-chart-card-title arb-detail-profit-title">组合收益图</div>
                    <div class="arb-detail-chart-card-meta arb-detail-profit-meta">按当前 ${countText} 张价格图逐时点乘积计算，> 1.0 为正收益。</div>
                </div>
            </div>
            <div class="arb-detail-chart-canvas arb-detail-profit-canvas"></div>
        `;
  }

  function buildArbDetailChartPreviewStripHtml(pairs = [], options = {}) {
    const list = Array.isArray(pairs) ? pairs : [];
    const cardsHtml = list.map((pair, index) => buildArbDetailChartPreviewCardHtml(pair, index, options)).join('');
    return `<div class="arb-detail-chart-strip">${cardsHtml}${buildArbDetailProfitPreviewCardHtml()}</div>`;
  }

  function buildArbOpportunityStableId(section, label, cycle) {
    const safeSection = String(section || '');
    const safeLabel = String(label || '');
    const legs = Array.isArray(cycle?.legs) ? cycle.legs : [];
    const legSignature = legs
      .filter((leg) => !(leg && (leg.rule || leg.chain === '规则')))
      .map((leg) => [
        String(leg.chain || ''),
        String(leg.from || ''),
        String(leg.to || ''),
        String(leg.quoteId ?? ''),
        leg.inverse ? '1' : '0'
      ].join(':'))
      .join('|');
    return `arb-opportunity:${safeSection}:${safeLabel}:${legSignature}`;
  }

  function buildUniqueArbOpportunityId(existingIds, section, label, cycle) {
    const usedIds = existingIds instanceof Set ? existingIds : new Set(existingIds || []);
    const baseId = buildArbOpportunityStableId(section, label, cycle);
    if (!usedIds.has(baseId)) {
      return baseId;
    }

    let suffix = 2;
    while (usedIds.has(`${baseId}:${suffix}`)) {
      suffix += 1;
    }
    return `${baseId}:${suffix}`;
  }

  function getNextArbDetailRequestVersion(currentVersion) {
    const safeCurrent = Number(currentVersion);
    if (!Number.isFinite(safeCurrent) || safeCurrent < 0) return 1;
    return safeCurrent + 1;
  }

  function shouldApplyArbDetailRequestVersion(expectedVersion, currentVersion) {
    return Number(expectedVersion) === Number(currentVersion);
  }

  function applyArbDetailCardError(cards, cardIndex, errorMessage) {
    if (!Array.isArray(cards)) return;
    const card = cards[cardIndex];
    if (!card || typeof card !== 'object') return;
    card.rows = [];
    card.summary = null;
    card.error = errorMessage || '详情报价失败';
  }

  return {
    buildDetailInputAmounts,
    buildArbDetailRateText,
    buildArbDetailRateDeltaText,
    summarizeDetailResult,
    getQuoteRunState,
    buildArbDetailChartPairs,
    findBestSummaryIndices,
    getArbDetailCardDomIds,
    shouldSyncArbDetailInput,
    parseCommittedArbDetailInput,
    shouldCommitArbDetailInputOnKey,
    getArbDetailIntervalKey,
    getArbDetailRateLimitDelay,
    getArbDetailBudgetTimestamp,
    recordArbDetailBudgetTimestamp,
    shouldSyncArbDetailSnapshotForCard,
    buildArbDetailSnapshotMonitorState,
    buildArbDetailDexLink,
    buildArbDetailTokenHtml,
    buildArbDetailPairHtml,
    buildArbDetailRowsHtml,
    buildArbDetailSummaryHtml,
    buildArbDetailShellHtml,
    buildArbDetailChartMessageHtml,
    buildArbDetailChartPreviewCardHtml,
    buildArbDetailProfitPreviewCardHtml,
    buildArbDetailProfitPreviewMessageHtml,
    buildArbDetailProfitPreviewReadyHtml,
    buildArbDetailChartPreviewStripHtml,
    buildArbOpportunityStableId,
    buildUniqueArbOpportunityId,
    getNextArbDetailRequestVersion,
    shouldApplyArbDetailRequestVersion,
    applyArbDetailCardError
  };
}));
