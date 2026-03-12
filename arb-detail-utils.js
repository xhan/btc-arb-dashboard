(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbDetailUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizePositiveAmount(value, fallback = 1) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return fallback;
    return amount;
  }

  function normalizeRoundedDetailAmount(value, fallback = 1) {
    return normalizePositiveAmount(Math.round(Number(value)), fallback);
  }

  function buildDetailInputAmounts(baseAmount) {
    const safeBaseAmount = normalizePositiveAmount(baseAmount, 1);
    return [
      safeBaseAmount,
      normalizeRoundedDetailAmount(safeBaseAmount * 0.5, 1),
      normalizeRoundedDetailAmount(safeBaseAmount * 1.5, 1),
      normalizeRoundedDetailAmount(safeBaseAmount * 2, 1)
    ];
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
        fromSymbol: String(leg?.from || ''),
        toSymbol: String(leg?.to || '')
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
    const chain = String(config.chain || '').trim();
    const normalizedChain = chain.toLowerCase();
    const fromTokenAddress = String(config.fromTokenAddress || '').trim();
    const toTokenAddress = String(config.toTokenAddress || '').trim();
    if (!fromTokenAddress || !toTokenAddress) return null;

    if (normalizedChain === 'bybit' || normalizedChain === 'binance') {
      return null;
    }

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

  return {
    buildDetailInputAmounts,
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
    buildArbOpportunityStableId,
    buildUniqueArbOpportunityId,
    getNextArbDetailRequestVersion,
    shouldApplyArbDetailRequestVersion
  };
}));
