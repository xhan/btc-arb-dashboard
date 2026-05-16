(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbRuntimeMemoryUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildRetainedArbOpportunityStore(currentOpportunities, retainedEntries) {
    const nextStore = currentOpportunities instanceof Map
      ? new Map(currentOpportunities)
      : new Map();

    for (const entry of Array.isArray(retainedEntries) ? retainedEntries : []) {
      if (!entry || !entry.id || nextStore.has(entry.id)) continue;
      nextStore.set(entry.id, entry);
    }

    return nextStore;
  }

  function trimContainerChildren(container, maxEntries) {
    const limit = Number.isFinite(Number(maxEntries)) ? Math.max(0, Math.floor(Number(maxEntries))) : 0;
    if (!container || !container.children || typeof container.children.length !== 'number') return 0;

    let removedCount = 0;
    while (container.children.length > limit) {
      const child = container.children[container.children.length - 1];
      if (!child || typeof child.remove !== 'function') break;
      child.remove();
      removedCount += 1;
    }

    return removedCount;
  }

  function pruneExpiredArbOpportunityHighlights(highlightedUntilById, nowMs = Date.now()) {
    const map = highlightedUntilById instanceof Map ? highlightedUntilById : new Map();
    if (!map.size) return map;
    for (const [opportunityId, expiresAt] of map.entries()) {
      if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) {
        map.delete(opportunityId);
      }
    }
    return map;
  }

  function getNextArbOpportunityHighlightExpiry(highlightedUntilById) {
    const map = highlightedUntilById instanceof Map ? highlightedUntilById : new Map();
    let nextExpiresAt = Number.POSITIVE_INFINITY;
    for (const expiresAt of map.values()) {
      if (Number.isFinite(expiresAt) && expiresAt < nextExpiresAt) {
        nextExpiresAt = expiresAt;
      }
    }
    return Number.isFinite(nextExpiresAt) ? nextExpiresAt : null;
  }

  function isArbOpportunityHighlighted(highlightedUntilById, opportunityId, nowMs = Date.now()) {
    if (!opportunityId) return false;
    const map = pruneExpiredArbOpportunityHighlights(highlightedUntilById, nowMs);
    const expiresAt = map.get(String(opportunityId));
    return Number.isFinite(expiresAt) && expiresAt > nowMs;
  }

  function markArbOpportunityHighlights(highlightedUntilById, opportunityIds, options = {}) {
    const map = highlightedUntilById instanceof Map ? highlightedUntilById : new Map();
    const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
    const durationMs = Number.isFinite(Number(options.durationMs)) && Number(options.durationMs) > 0
      ? Number(options.durationMs)
      : 0;
    const nextExpiresAt = nowMs + durationMs;
    let changed = false;

    for (const opportunityId of (Array.isArray(opportunityIds) ? opportunityIds : [])) {
      const normalizedId = String(opportunityId || '').trim();
      if (!normalizedId) continue;
      const previousExpiresAt = map.get(normalizedId) || 0;
      if (previousExpiresAt >= nextExpiresAt) continue;
      map.set(normalizedId, nextExpiresAt);
      changed = true;
    }

    return {
      changed,
      expiresAt: nextExpiresAt,
      highlightedUntilById: map
    };
  }

  function createArbOpportunityHighlightRuntime(options = {}) {
    const highlightedUntilById = new Map();
    const durationMs = Number.isFinite(Number(options.durationMs)) && Number(options.durationMs) > 0
      ? Number(options.durationMs)
      : 0;
    const nowProvider = typeof options.now === 'function' ? options.now : Date.now;
    const setTimer = typeof options.setTimer === 'function'
      ? options.setTimer
      : (typeof setTimeout === 'function' ? setTimeout : null);
    const clearTimer = typeof options.clearTimer === 'function'
      ? options.clearTimer
      : (typeof clearTimeout === 'function' ? clearTimeout : null);
    const onExpired = typeof options.onExpired === 'function' ? options.onExpired : null;
    let cleanupTimer = null;

    function getNowMs() {
      const nowMs = Number(nowProvider());
      return Number.isFinite(nowMs) ? nowMs : Date.now();
    }

    function clearCleanupTimer() {
      if (cleanupTimer !== null && clearTimer) {
        clearTimer(cleanupTimer);
      }
      cleanupTimer = null;
    }

    function prune(nowMs = getNowMs()) {
      return pruneExpiredArbOpportunityHighlights(highlightedUntilById, nowMs);
    }

    function scheduleCleanup(nowMs = getNowMs()) {
      clearCleanupTimer();
      prune(nowMs);
      if (!highlightedUntilById.size || !setTimer) return;

      const nextExpiresAt = getNextArbOpportunityHighlightExpiry(highlightedUntilById);
      if (!Number.isFinite(Number(nextExpiresAt))) return;

      const delayMs = Math.max(0, nextExpiresAt - nowMs);
      cleanupTimer = setTimer(() => {
        cleanupTimer = null;
        const previousSize = highlightedUntilById.size;
        prune(getNowMs());
        if (highlightedUntilById.size !== previousSize && onExpired) {
          onExpired();
        }
        scheduleCleanup(getNowMs());
      }, delayMs + 10);
    }

    function isHighlighted(opportunityId, nowMs = getNowMs()) {
      return isArbOpportunityHighlighted(highlightedUntilById, opportunityId, nowMs);
    }

    function mark(opportunityIds, nowMs = getNowMs()) {
      const { changed } = markArbOpportunityHighlights(highlightedUntilById, opportunityIds, {
        nowMs,
        durationMs
      });
      if (changed) {
        scheduleCleanup(nowMs);
      }
      return changed;
    }

    function clear() {
      clearCleanupTimer();
      highlightedUntilById.clear();
    }

    return {
      clear,
      getHighlightedUntilById: () => highlightedUntilById,
      isHighlighted,
      mark,
      prune,
      scheduleCleanup
    };
  }

  function createArbOpportunityRuntime() {
    let opportunityMap = new Map();
    let opportunityStore = new Map();
    let opportunityIdsByTargetKey = new Map();

    function setPanelOpportunities(nextOpportunityMap, nextOpportunityIdsByTargetKey, retainedEntries = []) {
      opportunityMap = nextOpportunityMap instanceof Map ? nextOpportunityMap : new Map();
      opportunityIdsByTargetKey = nextOpportunityIdsByTargetKey instanceof Map
        ? nextOpportunityIdsByTargetKey
        : new Map();
      opportunityStore = buildRetainedArbOpportunityStore(opportunityMap, retainedEntries);
      return opportunityStore;
    }

    function getOpportunity(opportunityId) {
      if (!opportunityId) return null;
      return opportunityMap.get(opportunityId) || opportunityStore.get(opportunityId) || null;
    }

    function getOpportunityIdsForTarget(targetKey) {
      const opportunityIds = opportunityIdsByTargetKey.get(targetKey);
      return Array.isArray(opportunityIds) ? opportunityIds : [];
    }

    return {
      getOpportunity,
      getOpportunityIdsForTarget,
      getOpportunityMap: () => opportunityMap,
      getOpportunityStore: () => opportunityStore,
      setPanelOpportunities
    };
  }

  return {
    buildRetainedArbOpportunityStore,
    createArbOpportunityHighlightRuntime,
    createArbOpportunityRuntime,
    getNextArbOpportunityHighlightExpiry,
    isArbOpportunityHighlighted,
    markArbOpportunityHighlights,
    pruneExpiredArbOpportunityHighlights,
    trimContainerChildren
  };
}));
