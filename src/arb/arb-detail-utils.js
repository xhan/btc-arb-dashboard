(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../ui/dex-link-utils'), require('./arb-paths'));
    return;
  }
  root.ArbDetailUtils = factory(root.DexLinkUtils, root.ArbPaths);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (dexLinkUtils, arbPaths) {
  const buildDexLink = dexLinkUtils && typeof dexLinkUtils.buildDexLink === 'function'
    ? dexLinkUtils.buildDexLink
    : () => null;
  const buildDexLinkCopyButtonHtml = dexLinkUtils && typeof dexLinkUtils.buildDexLinkCopyButtonHtml === 'function'
    ? dexLinkUtils.buildDexLinkCopyButtonHtml
    : () => '';
  const getDexLinkLabel = dexLinkUtils && typeof dexLinkUtils.getDexLinkLabel === 'function'
    ? dexLinkUtils.getDexLinkLabel
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

  function formatDetailNumber(value, precision = 6) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue)
      ? Number(numericValue.toFixed(precision))
      : '--';
  }

  function formatDetailProfitRate(profitRate) {
    if (arbPaths && typeof arbPaths.formatProfitWanfen === 'function') {
      return arbPaths.formatProfitWanfen(profitRate);
    }
    return typeof profitRate === 'number' && Number.isFinite(profitRate)
      ? String(profitRate)
      : '--';
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

  function buildArbDetailCards(baseAmount) {
    return buildDetailInputAmounts(baseAmount).map((amount) => ({
      inputAmount: amount,
      rows: [],
      summary: null,
      error: '',
      requestVersion: 0
    }));
  }

  function cloneArbDetailOpportunity(opportunity) {
    if (!opportunity || !opportunity.cycle) return null;
    return {
      ...opportunity,
      cycle: {
        ...opportunity.cycle,
        legs: Array.isArray(opportunity.cycle.legs)
          ? opportunity.cycle.legs.map((leg) => ({ ...leg }))
          : []
      }
    };
  }

  function buildDefaultArbDetailState() {
    return {
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
  }

  function buildOpenArbDetailState(previousState, options = {}) {
    return {
      ...buildDefaultArbDetailState(),
      ...(previousState && typeof previousState === 'object' ? previousState : {}),
      visible: true,
      opportunityId: options.opportunityId,
      selectedOpportunity: cloneArbDetailOpportunity(options.opportunity),
      cards: buildArbDetailCards(options.baseAmount),
      refreshToken: Number(previousState && previousState.refreshToken) + 1 || 1,
      isRefreshing: false,
      editingInputIndex: null,
      chartPreviewSignature: ''
    };
  }

  function buildClosedArbDetailState(previousState) {
    const baseState = {
      ...buildDefaultArbDetailState(),
      ...(previousState && typeof previousState === 'object' ? previousState : {})
    };
    return {
      ...baseState,
      visible: false,
      opportunityId: null,
      selectedOpportunity: null,
      cards: [],
      refreshToken: Number(baseState.refreshToken) + 1 || 1,
      isRefreshing: false,
      editingInputIndex: null,
      chartPreviewSignature: ''
    };
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

  function getArbDetailRateDeltaTone(rateDeltaText) {
    const value = Number.parseFloat(String(rateDeltaText || ''));
    if (!Number.isFinite(value)) return 'neutral';
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }

  function buildArbDetailRow(quote, quoteData, options = {}) {
    const isInverseFetch = options.isInverseFetch === true;
    const symbols = quoteData && quoteData.symbols && typeof quoteData.symbols === 'object'
      ? quoteData.symbols
      : {};
    const formatChainLabel = typeof options.formatChainLabel === 'function'
      ? options.formatChainLabel
      : (chain) => String(chain || '');
    const formatAmount = typeof options.formatAmount === 'function'
      ? options.formatAmount
      : (value) => String(formatDetailNumber(value));
    return {
      quoteId: Number(quote && quote.id),
      direction: isInverseFetch ? 'inverse' : 'forward',
      pricingMode: 'raw',
      chain: quote && quote.chain,
      chainLabel: formatChainLabel(quote && quote.chain),
      fromSymbol: symbols.from,
      toSymbol: symbols.to,
      fromTokenAddress: isInverseFetch ? quote && quote.toToken : quote && quote.fromToken,
      toTokenAddress: isInverseFetch ? quote && quote.fromToken : quote && quote.toToken,
      inputAmount: options.inputAmount,
      rawPrice: quoteData && quoteData.rawPrice,
      rateText: buildArbDetailRateText(
        quoteData && quoteData.rawPrice,
        symbols.from,
        symbols.to
      ),
      amountText: formatAmount(quoteData && quoteData.finalAmountOut),
      sourceText: (quoteData && quoteData.usedSource) || (quote && quote.preferredSource) || 'Unknown'
    };
  }

  function applyArbDetailRateDeltas(rows, baseRows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeBaseRows = Array.isArray(baseRows) ? baseRows : [];
    return safeRows.map((row, rowIndex) => {
      const baseRow = safeBaseRows[rowIndex];
      const rateDeltaText = buildArbDetailRateDeltaText(
        baseRow && baseRow.rawPrice,
        row && row.rawPrice
      );
      return {
        ...row,
        rateDeltaText,
        rateDeltaTone: getArbDetailRateDeltaTone(rateDeltaText)
      };
    });
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

  function isArbRuleLeg(leg) {
    return Boolean(leg && (leg.rule || leg.chain === '规则'));
  }

  function doesArbDetailUseQuote(selectedOpportunity, quoteId) {
    if (!selectedOpportunity || !selectedOpportunity.cycle) return false;
    const targetQuoteId = Number(quoteId);
    if (!Number.isFinite(targetQuoteId)) return false;
    const legs = Array.isArray(selectedOpportunity.cycle.legs)
      ? selectedOpportunity.cycle.legs
      : [];
    return legs.some((leg) => !isArbRuleLeg(leg) && Number(leg && leg.quoteId) === targetQuoteId);
  }

  function buildArbDetailChartPairs(cycle) {
    const legs = Array.isArray(cycle?.legs) ? cycle.legs : [];
    return legs
      .filter((leg) => !isArbRuleLeg(leg))
      .map((leg) => ({
        quoteId: Number(leg?.quoteId),
        direction: leg?.inverse ? 'inverse' : 'forward',
        chain: String(leg?.chain || ''),
        fromSymbol: String(leg?.rawFrom || leg?.from || ''),
        toSymbol: String(leg?.rawTo || leg?.to || '')
      }))
      .filter((item) => Number.isFinite(item.quoteId) && item.quoteId > 0);
  }

  function buildArbDetailChartPreviewSignature(pairs) {
    return JSON.stringify((pairs || []).map((pair) => `${pair.quoteId}:${pair.direction}`));
  }

  function buildArbOpportunityChartHref(entry, buildChartsPageHref) {
    const cycle = entry && entry.cycle ? entry.cycle : entry;
    if (!cycle || typeof buildChartsPageHref !== 'function') return '';
    const chartPairs = buildArbDetailChartPairs(cycle);
    return chartPairs.length ? buildChartsPageHref(chartPairs) : '';
  }

  function resolveArbOpportunityBaseAmount(cycle, findQuoteById, isRuleLeg = () => false) {
    const legs = Array.isArray(cycle?.legs) ? cycle.legs : [];
    const firstLeg = legs.find((leg) => !isRuleLeg(leg) && leg && leg.quoteId !== undefined && leg.quoteId !== null);
    if (!firstLeg || typeof findQuoteById !== 'function') return 1;
    const match = findQuoteById(firstLeg.quoteId);
    const amount = match && match.quote ? Number(match.quote.amount) : NaN;
    return Number.isFinite(amount) && amount > 0 ? amount : 1;
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

  function shouldRebuildArbDetailShell(cards, options = {}) {
    const list = Array.isArray(cards) ? cards : [];
    const getCardCount = typeof options.getCardCount === 'function'
      ? options.getCardCount
      : () => Number(options.cardCount);
    const hasElement = typeof options.hasElement === 'function'
      ? options.hasElement
      : () => false;

    if (getCardCount() !== list.length) return true;

    return list.some((_, index) => {
      const ids = getArbDetailCardDomIds(index);
      return !hasElement(ids.inputId) || !hasElement(ids.rowsId) || !hasElement(ids.summaryId);
    });
  }

  function shouldRebuildArbDetailShellDom(cards, options = {}) {
    const gridEl = options.gridEl;
    if (!gridEl || typeof gridEl.querySelectorAll !== 'function') return false;
    const getElementById = typeof options.getElementById === 'function'
      ? options.getElementById
      : () => null;
    return shouldRebuildArbDetailShell(cards, {
      getCardCount: () => gridEl.querySelectorAll('[data-arb-detail-card-index]').length,
      hasElement: (id) => Boolean(getElementById(id))
    });
  }

  function shouldSyncArbDetailInput(index, editingInputIndex) {
    return index !== editingInputIndex;
  }

  function syncArbDetailInputValues(cards = [], options = {}) {
    const getElementById = typeof options.getElementById === 'function'
      ? options.getElementById
      : () => null;
    const editingInputIndex = options.editingInputIndex;
    const result = {
      syncedCount: 0,
      skippedCount: 0,
      unchangedCount: 0
    };

    (Array.isArray(cards) ? cards : []).forEach((card, index) => {
      if (!shouldSyncArbDetailInput(index, editingInputIndex)) {
        result.skippedCount += 1;
        return;
      }
      const ids = getArbDetailCardDomIds(index);
      const inputEl = getElementById(ids.inputId);
      if (!inputEl) {
        result.skippedCount += 1;
        return;
      }
      const nextValue = String(card && card.inputAmount);
      if (inputEl.value === nextValue) {
        result.unchangedCount += 1;
        return;
      }
      inputEl.value = nextValue;
      result.syncedCount += 1;
    });

    return result;
  }

  function buildNudgedArbDetailInputAmount(currentAmount, delta) {
    const currentValue = Number(currentAmount);
    const base = Number.isFinite(currentValue) && currentValue > 0 ? currentValue : 1;
    return Math.max(0.1, Number((base + Number(delta)).toFixed(4)));
  }

  function parseCommittedArbDetailInput(rawValue) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }

  function applyArbDetailInputUpdate(cards, cardIndex, rawValue) {
    if (!Array.isArray(cards)) return null;
    const card = cards[cardIndex];
    if (!card || typeof card !== 'object') return null;

    const parsed = parseCommittedArbDetailInput(rawValue);
    if (parsed === null) return null;

    card.inputAmount = parsed;
    card.rows = [];
    card.summary = null;
    card.error = '';
    card.requestVersion = getNextArbDetailRequestVersion(card.requestVersion);
    return parsed;
  }

  function shouldCommitArbDetailInputOnKey(key) {
    return key === 'Enter';
  }

  function readDatasetValue(element, key) {
    return String(element && element.dataset && element.dataset[key] || '').trim();
  }

  function readDatasetNumber(element, key) {
    return Number(readDatasetValue(element, key));
  }

  function resolveClosest(event, selector, options) {
    const closestEventTarget = typeof options.closestEventTarget === 'function'
      ? options.closestEventTarget
      : () => null;
    return closestEventTarget(event, selector);
  }

  function resolveArbDetailGridMouseDownAction(event, options = {}) {
    const stepBtn = resolveClosest(event, '[data-arb-detail-step-index]', options);
    return stepBtn
      ? { type: 'prevent-step-default' }
      : { type: 'none' };
  }

  function resolveArbDetailGridClickAction(event, options = {}) {
    const tokenEl = resolveClosest(event, '[data-arb-detail-token-address]', options);
    if (tokenEl) {
      const tokenAddress = readDatasetValue(tokenEl, 'arbDetailTokenAddress');
      return tokenAddress
        ? {
            type: 'copy-token-address',
            tokenAddress,
            tokenSymbol: readDatasetValue(tokenEl, 'arbDetailTokenSymbol') || 'Token'
          }
        : { type: 'none' };
    }

    const dexLinkEl = resolveClosest(event, '[data-dex-link-copy]', options);
    if (dexLinkEl) {
      return { type: 'copy-dex-link', element: dexLinkEl };
    }

    const muteLegBtn = resolveClosest(event, '[data-arb-detail-leg-mute]', options);
    if (muteLegBtn) {
      const cardIndex = readDatasetNumber(muteLegBtn, 'arbDetailCardIndex');
      const rowIndex = readDatasetNumber(muteLegBtn, 'arbDetailRowIndex');
      return Number.isFinite(cardIndex) && Number.isFinite(rowIndex)
        ? { type: 'mute-leg', cardIndex, rowIndex }
        : { type: 'none' };
    }

    const stepBtn = resolveClosest(event, '[data-arb-detail-step-index]', options);
    if (stepBtn) {
      const index = readDatasetNumber(stepBtn, 'arbDetailStepIndex');
      const step = readDatasetNumber(stepBtn, 'arbDetailStep');
      return Number.isFinite(index) && Number.isFinite(step)
        ? { type: 'nudge-input', index, step }
        : { type: 'none' };
    }

    return { type: 'none' };
  }

  function resolveArbDetailGridInputAction(event, options = {}) {
    const input = resolveClosest(event, '[data-arb-detail-input-index]', options);
    if (!input) return { type: 'none' };
    return {
      type: 'input',
      index: readDatasetNumber(input, 'arbDetailInputIndex'),
      input,
      value: input.value
    };
  }

  function resolveArbDetailGridKeydownAction(event, options = {}) {
    const action = resolveArbDetailGridInputAction(event, options);
    if (action.type !== 'input') return { type: 'none' };
    if (!shouldCommitArbDetailInputOnKey(event && event.key)) return { type: 'none' };
    return {
      type: 'commit-input',
      index: action.index,
      input: action.input
    };
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

  function createArbDetailSourceBudgetRuntime() {
    const budgetState = new Map();

    return {
      getState: () => budgetState,
      getTimestamp(source) {
        return getArbDetailBudgetTimestamp(budgetState, source);
      },
      recordTimestamp(source, requestedAt = Date.now()) {
        return recordArbDetailBudgetTimestamp(budgetState, source, requestedAt);
      }
    };
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
    return buildArbDetailMuteButtonHtml(options.cardIndex, options.rowIndex, row && row.quoteId);
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
        : formatDetailProfitRate;
      const profitClass = bestProfitIndices.includes(options.index) ? ' arb-detail-metric-best' : '';
      const rateClass = bestProfitRateIndices.includes(options.index) ? ' arb-detail-metric-best' : '';
      return `
                <span class="arb-detail-metric${profitClass}">收益 ${formatNumber(card.summary.profit)} ${escapeHtml(card.summary.symbol || '')}</span>
                <span class="arb-detail-metric${rateClass}">${formatProfitRate(card.summary.profitRate)}</span>
            `;
    }

    return '<span class="arb-detail-metric">收益 --</span>';
  }

  function applyArbDetailCardContents(cards = [], options = {}) {
    const getElementById = typeof options.getElementById === 'function'
      ? options.getElementById
      : () => null;
    const buildRowsHtml = typeof options.buildRowsHtml === 'function'
      ? options.buildRowsHtml
      : (card, index) => buildArbDetailRowsHtml(card, { cardIndex: index });
    const buildSummaryHtml = typeof options.buildSummaryHtml === 'function'
      ? options.buildSummaryHtml
      : (card, index) => buildArbDetailSummaryHtml(card, { index });
    const result = {
      renderedCount: 0,
      skippedCount: 0
    };

    (Array.isArray(cards) ? cards : []).forEach((card, index) => {
      const ids = getArbDetailCardDomIds(index);
      const rowsEl = getElementById(ids.rowsId);
      const summaryEl = getElementById(ids.summaryId);
      if (!rowsEl || !summaryEl) {
        result.skippedCount += 1;
        return;
      }
      setElementHtml(rowsEl, buildRowsHtml(card, index));
      setElementHtml(summaryEl, buildSummaryHtml(card, index));
      result.renderedCount += 1;
    });

    return result;
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

  function setElementHtml(element, html) {
    if (!element) return false;
    element.innerHTML = html;
    return true;
  }

  function setElementText(element, text) {
    if (!element) return false;
    element.textContent = String(text == null ? '' : text);
    return true;
  }

  function replaceElementHtml(element, html) {
    if (!element) return false;
    element.outerHTML = html;
    return true;
  }

  function applyArbDetailShellHtml(gridEl, cards = []) {
    return setElementHtml(gridEl, buildArbDetailShellHtml(cards));
  }

  function buildArbDetailErrorHtml(message) {
    return `<div class="arb-detail-error">${escapeHtml(message)}</div>`;
  }

  function applyArbDetailErrorHtml(gridEl, message) {
    return setElementHtml(gridEl, buildArbDetailErrorHtml(message));
  }

  function buildArbDetailSubtitleText(opportunity, legLines = []) {
    if (!opportunity || !opportunity.cycle) return '当前套利机会不可用';
    const label = String(opportunity.label || '套利机会');
    const lines = Array.isArray(legLines) ? legLines : [];
    return `${label} | ${lines.join(' | ')}`;
  }

  function applyArbDetailSubtitleText(subtitleEl, text) {
    return setElementText(subtitleEl, text);
  }

  function applyArbDetailModalVisibility(modalEl, visible) {
    if (!modalEl || !modalEl.classList) return false;
    if (visible === true) {
      modalEl.classList.add('visible');
      return true;
    }
    modalEl.classList.remove('visible');
    return false;
  }

  function buildArbDetailChartMessageHtml(message) {
    return `<div class="arb-detail-chart-message">${escapeHtml(message)}</div>`;
  }

  function clearArbDetailPreviewContainers(refs = {}) {
    return {
      chartPreviewCleared: setElementHtml(refs.chartPreview, ''),
      profitPreviewCleared: setElementHtml(refs.profitPreview, '')
    };
  }

  function applyArbDetailChartPreviewMessage(containerEl, message) {
    return setElementHtml(containerEl, buildArbDetailChartMessageHtml(message));
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

  function getArbDetailProfitCardElement(chartPreviewEl) {
    if (!chartPreviewEl || typeof chartPreviewEl.querySelector !== 'function') return null;
    return chartPreviewEl.querySelector('[data-arb-detail-profit-card]');
  }

  function getArbDetailProfitPreviewElements(cardEl) {
    if (!cardEl || typeof cardEl.querySelector !== 'function') {
      return {
        canvasEl: null,
        metaEl: null
      };
    }
    return {
      canvasEl: cardEl.querySelector('.arb-detail-profit-canvas'),
      metaEl: cardEl.querySelector('.arb-detail-profit-meta')
    };
  }

  function applyArbDetailProfitPreviewMessage(cardEl, message) {
    return setElementHtml(cardEl, buildArbDetailProfitPreviewMessageHtml(message));
  }

  function applyArbDetailProfitPreviewReady(cardEl, seriesCount) {
    return setElementHtml(cardEl, buildArbDetailProfitPreviewReadyHtml(seriesCount));
  }

  function applyArbDetailProfitPreviewMeta(metaEl, metaText) {
    return setElementText(metaEl, metaText);
  }

  function buildArbDetailProfitPreviewState(seriesList, options = {}) {
    const validSeries = (Array.isArray(seriesList) ? seriesList : [])
      .filter((series) => Array.isArray(series) && series.length);
    if (validSeries.length < 2) {
      return {
        ready: false,
        message: '至少需要 2 张价格图表。',
        validSeries,
        points: [],
        seriesCount: validSeries.length,
        metaText: ''
      };
    }

    if (typeof options.buildProfitChartPoints !== 'function') {
      return {
        ready: false,
        message: '收益图算法未就绪，请刷新页面后重试。',
        validSeries,
        points: [],
        seriesCount: validSeries.length,
        metaText: ''
      };
    }

    if (options.canMountProfitHistoryChart !== true) {
      return {
        ready: false,
        message: '图表模块未就绪，请刷新页面后重试。',
        validSeries,
        points: [],
        seriesCount: validSeries.length,
        metaText: ''
      };
    }

    const points = options.buildProfitChartPoints(validSeries);
    if (!Array.isArray(points) || !points.length) {
      return {
        ready: false,
        message: '当前价格图表缺少对齐时间点，暂时无法计算收益。',
        validSeries,
        points: [],
        seriesCount: validSeries.length,
        metaText: ''
      };
    }

    return {
      ready: true,
      message: '',
      validSeries,
      points,
      seriesCount: validSeries.length,
      metaText: `按当前 ${validSeries.length} 张价格图逐时点乘积计算，> 1.0 为正收益。`
    };
  }

  function buildArbDetailChartPreviewStripHtml(pairs = [], options = {}) {
    const list = Array.isArray(pairs) ? pairs : [];
    const cardsHtml = list.map((pair, index) => buildArbDetailChartPreviewCardHtml(pair, index, options)).join('');
    return `<div class="arb-detail-chart-strip">${cardsHtml}${buildArbDetailProfitPreviewCardHtml()}</div>`;
  }

  function applyArbDetailChartPreviewStrip(containerEl, pairs = [], options = {}) {
    return setElementHtml(containerEl, buildArbDetailChartPreviewStripHtml(pairs, options));
  }

  function getArbDetailChartCardElements(chartPreviewEl, index) {
    if (!chartPreviewEl || typeof chartPreviewEl.querySelector !== 'function') {
      return {
        cardEl: null,
        canvasEl: null,
        metaEl: null
      };
    }
    const cardEl = chartPreviewEl.querySelector(`[data-arb-detail-chart-index="${index}"]`);
    if (!cardEl || typeof cardEl.querySelector !== 'function') {
      return {
        cardEl: cardEl || null,
        canvasEl: null,
        metaEl: null
      };
    }
    return {
      cardEl,
      canvasEl: cardEl.querySelector('.arb-detail-chart-canvas'),
      metaEl: cardEl.querySelector('.arb-detail-chart-card-meta')
    };
  }

  function buildArbDetailChartLoadedMetaText(source) {
    return `${source || '历史快照'} · 最近 1 小时`;
  }

  function applyArbDetailChartLoadedMeta(metaEl, source) {
    return setElementText(metaEl, buildArbDetailChartLoadedMetaText(source));
  }

  function applyArbDetailChartCardError(canvasEl, metaEl, message) {
    return {
      canvasReplaced: replaceElementHtml(canvasEl, buildArbDetailChartMessageHtml(message || '图表加载失败')),
      metaUpdated: setElementText(metaEl, '加载失败')
    };
  }

  function buildArbDetailChartLinkState(chartHref) {
    const hasChartHref = Boolean(chartHref);
    return {
      href: hasChartHref ? String(chartHref) : '/charts',
      ariaDisabled: hasChartHref ? 'false' : 'true'
    };
  }

  function applyArbDetailChartLinkState(linkEl, chartHref) {
    if (!linkEl) return null;
    const state = buildArbDetailChartLinkState(chartHref);
    linkEl.href = state.href;
    if (typeof linkEl.setAttribute === 'function') {
      linkEl.setAttribute('aria-disabled', state.ariaDisabled);
    }
    return state;
  }

  function hasArbDetailChartPreviewContent(containerEl) {
    return Boolean(containerEl && Number(containerEl.childElementCount) > 0);
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
    buildDefaultArbDetailState,
    buildOpenArbDetailState,
    buildClosedArbDetailState,
    buildArbDetailRow,
    applyArbDetailRateDeltas,
    formatDetailNumber,
    formatDetailProfitRate,
    summarizeDetailResult,
    getQuoteRunState,
    isArbRuleLeg,
    doesArbDetailUseQuote,
    buildArbDetailChartPairs,
    buildArbDetailChartPreviewSignature,
    buildArbOpportunityChartHref,
    resolveArbOpportunityBaseAmount,
    findBestSummaryIndices,
    getArbDetailCardDomIds,
    shouldRebuildArbDetailShell,
    shouldRebuildArbDetailShellDom,
    shouldSyncArbDetailInput,
    syncArbDetailInputValues,
    buildNudgedArbDetailInputAmount,
    parseCommittedArbDetailInput,
    applyArbDetailInputUpdate,
    shouldCommitArbDetailInputOnKey,
    resolveArbDetailGridClickAction,
    resolveArbDetailGridInputAction,
    resolveArbDetailGridKeydownAction,
    resolveArbDetailGridMouseDownAction,
    getArbDetailIntervalKey,
    getArbDetailRateLimitDelay,
    getArbDetailBudgetTimestamp,
    recordArbDetailBudgetTimestamp,
    createArbDetailSourceBudgetRuntime,
    shouldSyncArbDetailSnapshotForCard,
    buildArbDetailSnapshotMonitorState,
    buildArbDetailDexLink,
    buildArbDetailSourceHtml,
    buildArbDetailRowsHtml,
    buildArbDetailSummaryHtml,
    applyArbDetailCardContents,
    buildArbDetailShellHtml,
    applyArbDetailShellHtml,
    buildArbDetailErrorHtml,
    applyArbDetailErrorHtml,
    buildArbDetailSubtitleText,
    applyArbDetailSubtitleText,
    applyArbDetailModalVisibility,
    buildArbDetailChartMessageHtml,
    clearArbDetailPreviewContainers,
    applyArbDetailChartPreviewMessage,
    buildArbDetailProfitPreviewMessageHtml,
    buildArbDetailProfitPreviewReadyHtml,
    getArbDetailProfitCardElement,
    getArbDetailProfitPreviewElements,
    applyArbDetailProfitPreviewMessage,
    applyArbDetailProfitPreviewReady,
    applyArbDetailProfitPreviewMeta,
    buildArbDetailProfitPreviewState,
    buildArbDetailChartPreviewStripHtml,
    applyArbDetailChartPreviewStrip,
    getArbDetailChartCardElements,
    buildArbDetailChartLoadedMetaText,
    applyArbDetailChartLoadedMeta,
    applyArbDetailChartCardError,
    buildArbDetailChartLinkState,
    applyArbDetailChartLinkState,
    hasArbDetailChartPreviewContent,
    buildUniqueArbOpportunityId,
    shouldApplyArbDetailRequestVersion,
    applyArbDetailCardError
  };
}));
