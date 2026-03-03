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

  return {
    buildDetailInputAmounts,
    summarizeDetailResult,
    getQuoteRunState,
    findBestSummaryIndices
  };
}));
