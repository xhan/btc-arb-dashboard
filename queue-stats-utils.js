(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.QueueStatsUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_INTERVALS = {
    kyber: 170,
    zerox: 110,
    velora: 700,
    lifi: 170,
    bybit: 1000,
    binance: 1000,
    solana: 3500,
    sui: 500,
    starknet: 1000
  };

  function normalizeChain(chain) {
    return typeof chain === 'string' ? chain.trim().toLowerCase() : '';
  }

  function isEvmChain(chain) {
    const normalized = normalizeChain(chain);
    const nonEvm = new Set(['solana', 'sui', 'starknet', 'bybit', 'binance']);
    return !!normalized && !nonEvm.has(normalized);
  }

  function shouldQueueInverseFetch(quote) {
    const normalized = normalizeChain(quote && quote.chain ? quote.chain : '');
    return !!quote && !!quote.showInverse && normalized !== 'bybit' && normalized !== 'binance';
  }

  function getQueueTypeForQuote(quote) {
    const chain = String(quote && quote.chain ? quote.chain : '');
    const normalized = normalizeChain(chain);
    let type = 'kyber';

    if (normalized === 'bybit') return 'bybit';
    if (normalized === 'binance') return 'binance';
    if (normalized === 'solana') return 'solana';
    if (normalized === 'sui') return 'sui';
    if (normalized === 'starknet') return 'starknet';

    if (isEvmChain(chain)) {
      if (quote.preferredSource === 'Velora') {
        type = 'velora';
      } else if (quote.preferredSource === '0x') {
        type = 'zerox';
      } else if (quote.preferredSource === 'LI.FI') {
        type = 'lifi';
      }
    }

    return type;
  }

  function normalizeIntervals(settings) {
    const intervals = { ...DEFAULT_INTERVALS };
    const source = settings && typeof settings === 'object' ? settings : {};

    Object.keys(intervals).forEach((key) => {
      const value = Number(source[key]);
      if (Number.isFinite(value) && value >= 0) {
        intervals[key] = value;
      }
    });

    return intervals;
  }

  function normalizeConfigData(rawData) {
    if (Array.isArray(rawData)) {
      return {
        dashboard: rawData,
        settings: {}
      };
    }

    if (rawData && typeof rawData === 'object') {
      return {
        dashboard: Array.isArray(rawData.dashboard) ? rawData.dashboard : [],
        settings: rawData.settings && typeof rawData.settings === 'object' ? rawData.settings : {}
      };
    }

    return {
      dashboard: [],
      settings: {}
    };
  }

  function buildQueueSummary(rawData) {
    const normalized = normalizeConfigData(rawData);
    const intervals = normalizeIntervals(normalized.settings);
    const queues = Object.keys(DEFAULT_INTERVALS).map((key) => ({
      key,
      intervalMs: intervals[key],
      quoteCount: 0,
      mainTasks: 0,
      inverseTasks: 0,
      taskCount: 0,
      nominalLapMs: 0,
      disabled: intervals[key] <= 0
    }));
    const queueMap = new Map(queues.map((item) => [item.key, item]));

    for (const category of normalized.dashboard) {
      const quotes = Array.isArray(category && category.quotes) ? category.quotes : [];
      for (const quote of quotes) {
        const type = getQueueTypeForQuote(quote);
        const bucket = queueMap.get(type);
        if (!bucket) continue;

        bucket.quoteCount += 1;
        bucket.mainTasks += 1;
        bucket.taskCount += 1;

        if (shouldQueueInverseFetch(quote)) {
          bucket.inverseTasks += 1;
          bucket.taskCount += 1;
        }
      }
    }

    queues.forEach((item) => {
      item.nominalLapMs = item.intervalMs > 0 ? item.taskCount * item.intervalMs : 0;
    });

    return {
      intervals,
      queues,
      totalQuoteCount: queues.reduce((sum, item) => sum + item.quoteCount, 0),
      totalTaskCount: queues.reduce((sum, item) => sum + item.taskCount, 0)
    };
  }

  function formatDurationMs(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value)) return '--';
    if (value < 1000) return `${Math.round(value)}ms`;
    if (value < 60000) return `${(value / 1000).toFixed(2)}s`;
    return `${(value / 60000).toFixed(2)}m`;
  }

  return {
    DEFAULT_INTERVALS,
    buildQueueSummary,
    formatDurationMs,
    getQueueTypeForQuote,
    shouldQueueInverseFetch
  };
});
