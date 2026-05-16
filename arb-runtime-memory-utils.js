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

  return {
    buildRetainedArbOpportunityStore,
    getNextArbOpportunityHighlightExpiry,
    isArbOpportunityHighlighted,
    markArbOpportunityHighlights,
    pruneExpiredArbOpportunityHighlights,
    trimContainerChildren
  };
}));
