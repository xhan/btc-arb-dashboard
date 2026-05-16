(function (root, factory) {
  const quotePauseUtils = typeof module !== 'undefined' && module.exports
    ? require('./quote-pause-utils')
    : root.QuotePauseUtils;
  const requestChannelUtils = typeof module !== 'undefined' && module.exports
    ? require('./request-channel-utils')
    : root.RequestChannelUtils;
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('./chain-defaults')
    : root.ChainDefaults;
  const api = factory(quotePauseUtils, requestChannelUtils, chainDefaults);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.QueueStatsUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (quotePauseUtils, requestChannelUtils, chainDefaults) {
  const DEFAULT_INTERVALS = requestChannelUtils && requestChannelUtils.DEFAULT_INTERVALS
    ? { ...requestChannelUtils.DEFAULT_INTERVALS }
    : {
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
    if (chainDefaults && typeof chainDefaults.normalizeChain === 'function') {
      return chainDefaults.normalizeChain(chain);
    }
    return typeof chain === 'string' ? chain.trim().toLowerCase() : '';
  }

  function isEvmChain(chain) {
    if (chainDefaults && typeof chainDefaults.isEvmChain === 'function') {
      return chainDefaults.isEvmChain(chain);
    }
    const normalized = normalizeChain(chain);
    const nonEvm = new Set(['solana', 'sui', 'starknet', 'bybit', 'binance']);
    return !!normalized && !nonEvm.has(normalized);
  }

  function isCrossChainQuote(quote) {
    if (chainDefaults && typeof chainDefaults.isCrossChainQuote === 'function') {
      return chainDefaults.isCrossChainQuote(quote);
    }
    const fromChain = normalizeChain(quote && quote.chain);
    const toChain = normalizeChain(quote && quote.toChain);
    return Boolean(fromChain && toChain && fromChain !== toChain);
  }

  function shouldQueueInverseFetch(quote) {
    if (isCrossChainQuote(quote)) return false;
    const normalized = normalizeChain(quote && quote.chain ? quote.chain : '');
    return !!quote && !!quote.showInverse && normalized !== 'bybit' && normalized !== 'binance';
  }

  function buildQueueTasksForQuote(quote) {
    if (!quote || quote.id == null) return [];
    const tasks = [{ quoteId: quote.id, mode: 'main' }];
    if (shouldQueueInverseFetch(quote)) {
      tasks.push({ quoteId: quote.id, mode: 'inverse' });
    }
    return tasks;
  }

  function getQueueTaskKey(task) {
    return `${task && task.quoteId}:${task && task.mode}`;
  }

  function appendQuoteQueueTasks(queue, quote) {
    if (!Array.isArray(queue)) return 0;
    const taskKeys = new Set(queue.map(getQueueTaskKey));
    let addedCount = 0;

    for (const task of buildQueueTasksForQuote(quote)) {
      const key = getQueueTaskKey(task);
      if (taskKeys.has(key)) continue;
      queue.push(task);
      taskKeys.add(key);
      addedCount += 1;
    }

    return addedCount;
  }

  function removeQuoteTasksFromQueues(queues, quoteId) {
    if (!queues || typeof queues !== 'object') return 0;
    let removedCount = 0;
    Object.keys(queues).forEach((type) => {
      const queue = Array.isArray(queues[type]) ? queues[type] : [];
      const nextQueue = queue.filter((task) => task && task.quoteId !== quoteId);
      removedCount += queue.length - nextQueue.length;
      queues[type] = nextQueue;
    });
    return removedCount;
  }

  function deferQueueTask(queue, currentIndex) {
    if (!Array.isArray(queue) || queue.length <= 1) return currentIndex;
    const normalizedIndex = Number(currentIndex);
    if (!Number.isInteger(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= queue.length) {
      return currentIndex;
    }

    const [task] = queue.splice(normalizedIndex, 1);
    queue.push(task);
    return (normalizedIndex - 1 + queue.length) % queue.length;
  }

  function buildManagedQueueKeys(options = {}) {
    const keys = new Set();
    const intervals = options.defaultIntervals && typeof options.defaultIntervals === 'object'
      ? options.defaultIntervals
      : DEFAULT_INTERVALS;
    const requestChannels = options.requestChannels || null;
    const defaultChannelId = requestChannels && requestChannels.defaultChannelId
      ? requestChannels.defaultChannelId
      : 'default';
    const buildQueueKey = requestChannels && requestChannelUtils && typeof requestChannelUtils.buildQueueKey === 'function'
      ? requestChannelUtils.buildQueueKey
      : (sourceKey) => sourceKey;

    Object.keys(intervals).forEach((sourceKey) => {
      keys.add(buildQueueKey(sourceKey, defaultChannelId));
    });

    const quotes = Array.isArray(options.quotes) ? options.quotes : [];
    for (const quote of quotes) {
      if (isQuotePaused(quote)) continue;
      keys.add(getQueueTypeForQuote(quote, requestChannels, {
        multiChannelEnabled: options.multiChannelEnabled !== false
      }));
    }

    return keys;
  }

  function getQueueTaskStatus(task, queueKey, quote, requestChannels, options = {}) {
    if (!task || !quote) {
      return { action: 'remove', reason: 'missing_quote' };
    }
    if (isQuotePaused(quote)) {
      return { action: 'remove', reason: 'paused_quote' };
    }

    const currentQueueKey = getQueueTypeForQuote(quote, requestChannels, options);
    if (currentQueueKey !== queueKey) {
      return { action: 'requeue', reason: 'queue_changed', queueKey: currentQueueKey };
    }
    if (task.mode === 'inverse' && !shouldQueueInverseFetch(quote)) {
      return { action: 'requeue', reason: 'inverse_disabled', queueKey: currentQueueKey };
    }

    return { action: 'fetch', reason: 'ready', queueKey: currentQueueKey };
  }

  function isQuotePaused(quote) {
    if (quotePauseUtils && typeof quotePauseUtils.isQuotePaused === 'function') {
      return quotePauseUtils.isQuotePaused(quote);
    }
    return !!quote && quote.paused === true;
  }

  function getQueueTypeForQuote(quote, requestChannels, options) {
    if (requestChannels && requestChannelUtils && typeof requestChannelUtils.getQueueKeyForQuote === 'function') {
      return requestChannelUtils.getQueueKeyForQuote(quote, requestChannels, options);
    }
    const chain = String(quote && quote.chain ? quote.chain : '');
    const normalized = normalizeChain(chain);
    let type = 'kyber';

    if (isCrossChainQuote(quote)) return 'lifi';
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
    if (requestChannelUtils && typeof requestChannelUtils.normalizeIntervals === 'function') {
      return requestChannelUtils.normalizeIntervals(settings);
    }
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

  function getRequestChannelOptions(rawRequestChannels, defaultIntervals) {
    if (!requestChannelUtils || typeof requestChannelUtils.getRequestChannelOptions !== 'function') {
      return null;
    }
    return requestChannelUtils.getRequestChannelOptions(rawRequestChannels, defaultIntervals);
  }

  function createQueueBucket(key, intervals, requestChannels) {
    const parsed = requestChannelUtils && typeof requestChannelUtils.parseQueueKey === 'function'
      ? requestChannelUtils.parseQueueKey(key)
      : {
        sourceKey: key,
        channelId: 'default'
      };
    const channel = requestChannels && requestChannels.byId instanceof Map
      ? requestChannels.byId.get(parsed.channelId)
      : null;
    const intervalMs = requestChannelUtils && typeof requestChannelUtils.getEffectiveIntervalForQueue === 'function'
      ? requestChannelUtils.getEffectiveIntervalForQueue(key, intervals, requestChannels)
      : intervals[key];

    return {
      key,
      sourceKey: parsed.sourceKey || key,
      channelId: parsed.channelId || 'default',
      channelName: channel ? channel.name : (parsed.channelId || 'default'),
      intervalMs,
      quoteCount: 0,
      mainTasks: 0,
      inverseTasks: 0,
      taskCount: 0,
      nominalLapMs: 0,
      disabled: intervalMs <= 0
    };
  }

  function buildDefaultQueueKeys(requestChannels) {
    return Object.keys(DEFAULT_INTERVALS).map((sourceKey) => {
      if (requestChannelUtils && typeof requestChannelUtils.isChannelAwareSourceKey === 'function' && requestChannelUtils.isChannelAwareSourceKey(sourceKey)) {
        return requestChannelUtils.buildQueueKey(
          sourceKey,
          requestChannels ? requestChannels.defaultChannelId : 'default'
        );
      }
      return sourceKey;
    });
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

  function buildQueueSummary(rawData, rawRequestChannels) {
    const normalized = normalizeConfigData(rawData);
    const intervals = normalizeIntervals(normalized.settings);
    const requestChannels = getRequestChannelOptions(rawRequestChannels, intervals);
    const useChannelAwareQueue = !!rawRequestChannels && !!requestChannels;
    const queues = (useChannelAwareQueue ? buildDefaultQueueKeys(requestChannels) : Object.keys(DEFAULT_INTERVALS))
      .map((key) => createQueueBucket(key, intervals, requestChannels));
    const queueMap = new Map(queues.map((item) => [item.key, item]));

    for (const category of normalized.dashboard) {
      const quotes = Array.isArray(category && category.quotes) ? category.quotes : [];
      for (const quote of quotes) {
        if (isQuotePaused(quote)) continue;
        const type = getQueueTypeForQuote(quote, useChannelAwareQueue ? requestChannels : null);
        if (!queueMap.has(type)) {
          const bucket = createQueueBucket(type, intervals, requestChannels);
          queues.push(bucket);
          queueMap.set(type, bucket);
        }
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
      requestChannels,
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
    appendQuoteQueueTasks,
    buildManagedQueueKeys,
    buildQueueSummary,
    deferQueueTask,
    formatDurationMs,
    getQueueTaskStatus,
    getQueueTypeForQuote,
    removeQuoteTasksFromQueues,
    shouldQueueInverseFetch
  };
});
