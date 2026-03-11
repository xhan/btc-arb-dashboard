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

  function buildDetailInputAmounts(baseAmount) {
    return [
      normalizePositiveAmount(baseAmount, 1),
      0.2,
      1,
      2
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
    buildArbOpportunityStableId,
    buildUniqueArbOpportunityId,
    getNextArbDetailRequestVersion,
    shouldApplyArbDetailRequestVersion
  };
}));
