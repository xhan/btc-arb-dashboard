(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.MutedPathLegUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_MUTED_PATH_LEG_STORAGE_LIMIT = 200;
  const DEFAULT_MUTED_PATH_LEG_DURATION_MS = 2 * 60 * 60 * 1000;

  function toPositiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function normalizeDirection(value) {
    return value === 'inverse' ? 'inverse' : 'forward';
  }

  function normalizePricingMode(value) {
    return ['raw', 'cex-bid1', 'cex-ask1-inverse'].includes(value) ? value : 'raw';
  }

  function normalizeMutedPathLeg(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const quoteId = Number(entry.quoteId);
    if (!Number.isFinite(quoteId)) return null;
    const mutedAt = toPositiveInteger(entry.mutedAt, 0);
    const expiresAt = toPositiveInteger(entry.expiresAt, 0);
    if (!mutedAt || !expiresAt || expiresAt <= mutedAt) return null;
    return {
      quoteId,
      direction: normalizeDirection(entry.direction),
      pricingMode: normalizePricingMode(entry.pricingMode),
      chain: String(entry.chain || ''),
      fromSymbol: String(entry.fromSymbol || entry.from || ''),
      toSymbol: String(entry.toSymbol || entry.to || ''),
      titleSnapshot: String(entry.titleSnapshot || '').trim(),
      mutedAt,
      expiresAt
    };
  }

  function normalizeLegSignature(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const quoteId = Number(entry.quoteId);
    if (!Number.isFinite(quoteId)) return null;
    return {
      quoteId,
      direction: normalizeDirection(entry.direction === undefined && entry.inverse ? 'inverse' : entry.direction),
      pricingMode: normalizePricingMode(
        entry.pricingMode === undefined
          ? (entry.cexLevelLabel === 'bid1' ? 'cex-bid1' : entry.cexLevelLabel === 'ask1' ? 'cex-ask1-inverse' : 'raw')
          : entry.pricingMode
      )
    };
  }

  function buildMutedPathLegKey(entry) {
    const normalized = normalizeLegSignature(entry);
    return normalized ? [normalized.quoteId, normalized.direction, normalized.pricingMode].join(':') : '';
  }

  function createMutedPathLegEntry(leg, mutedAt = Date.now(), durationMs = DEFAULT_MUTED_PATH_LEG_DURATION_MS, options = {}) {
    const safeMutedAt = toPositiveInteger(mutedAt, Date.now());
    const safeDurationMs = toPositiveInteger(durationMs, DEFAULT_MUTED_PATH_LEG_DURATION_MS);
    const signature = normalizeLegSignature(leg);
    return normalizeMutedPathLeg({
      quoteId: leg && leg.quoteId,
      direction: signature && signature.direction,
      pricingMode: signature && signature.pricingMode,
      chain: leg && leg.chain,
      fromSymbol: leg && (leg.fromSymbol || leg.from),
      toSymbol: leg && (leg.toSymbol || leg.to),
      titleSnapshot: String(options && options.titleSnapshot || '').trim(),
      mutedAt: safeMutedAt,
      expiresAt: safeMutedAt + safeDurationMs
    });
  }

  function extendMutedPathLegEntry(entry, nowMs = Date.now(), durationMs = DEFAULT_MUTED_PATH_LEG_DURATION_MS) {
    const normalized = normalizeMutedPathLeg(entry);
    if (!normalized) return null;
    const safeNowMs = toPositiveInteger(nowMs, Date.now());
    const safeDurationMs = toPositiveInteger(durationMs, DEFAULT_MUTED_PATH_LEG_DURATION_MS);
    const baseExpiresAt = Math.max(normalized.expiresAt, safeNowMs);
    return normalizeMutedPathLeg({
      ...normalized,
      expiresAt: baseExpiresAt + safeDurationMs
    });
  }

  function pruneExpiredMutedPathLegs(entries, nowMs = Date.now()) {
    const items = Array.isArray(entries) ? entries : [];
    return items
      .map((entry) => normalizeMutedPathLeg(entry))
      .filter((entry) => entry && nowMs < entry.expiresAt);
  }

  function findMutedPathLegByKey(entries, legKey) {
    const normalizedLegKey = String(legKey || '').trim();
    if (!normalizedLegKey) return null;
    const items = Array.isArray(entries) ? entries : [];
    for (const entry of items) {
      const normalizedEntry = normalizeMutedPathLeg(entry);
      if (normalizedEntry && buildMutedPathLegKey(normalizedEntry) === normalizedLegKey) {
        return normalizedEntry;
      }
    }
    return null;
  }

  function removeMutedPathLegByKey(entries, legKey) {
    const normalizedLegKey = String(legKey || '').trim();
    const items = Array.isArray(entries) ? entries : [];
    if (!normalizedLegKey) return items.slice();
    return items.filter((entry) => buildMutedPathLegKey(entry) !== normalizedLegKey);
  }

  function upsertMutedPathLegEntry(entries, entry) {
    const normalizedEntry = normalizeMutedPathLeg(entry);
    if (!normalizedEntry) return Array.isArray(entries) ? entries.slice() : [];
    const legKey = buildMutedPathLegKey(normalizedEntry);
    if (!legKey) return Array.isArray(entries) ? entries.slice() : [];
    return removeMutedPathLegByKey(entries, legKey).concat(normalizedEntry);
  }

  function trimMutedPathLegsForStorage(entries, limit = DEFAULT_MUTED_PATH_LEG_STORAGE_LIMIT) {
    const items = Array.isArray(entries) ? entries.slice() : [];
    const max = Number.isFinite(Number(limit)) && Number(limit) > 0
      ? Math.floor(Number(limit))
      : DEFAULT_MUTED_PATH_LEG_STORAGE_LIMIT;
    if (items.length <= max) return items;
    return items
      .sort((left, right) => Number(left && left.mutedAt) - Number(right && right.mutedAt))
      .slice(items.length - max);
  }

  function filterMutedPathLegs(edges, mutedPathLegs, nowMs = Date.now()) {
    const items = pruneExpiredMutedPathLegs(mutedPathLegs, nowMs);
    if (!items.length) return Array.isArray(edges) ? edges.slice() : [];
    const blockedKeys = new Set(items.map((entry) => buildMutedPathLegKey(entry)).filter(Boolean));
    return (Array.isArray(edges) ? edges : []).filter((edge) => {
      const key = buildMutedPathLegKey(edge);
      if (!key) return true;
      return !blockedKeys.has(key);
    });
  }

  function filterMutedCycles(cycles, mutedPathLegs, nowMs = Date.now()) {
    const items = pruneExpiredMutedPathLegs(mutedPathLegs, nowMs);
    if (!items.length) return Array.isArray(cycles) ? cycles.slice() : [];
    const blockedKeys = new Set(items.map((entry) => buildMutedPathLegKey(entry)).filter(Boolean));
    return (Array.isArray(cycles) ? cycles : []).filter((cycle) => {
      const legs = Array.isArray(cycle && cycle.legs) ? cycle.legs : [];
      return !legs.some((leg) => {
        const key = buildMutedPathLegKey(leg);
        return key && blockedKeys.has(key);
      });
    });
  }

  return {
    DEFAULT_MUTED_PATH_LEG_STORAGE_LIMIT,
    DEFAULT_MUTED_PATH_LEG_DURATION_MS,
    normalizeMutedPathLeg,
    buildMutedPathLegKey,
    createMutedPathLegEntry,
    extendMutedPathLegEntry,
    pruneExpiredMutedPathLegs,
    findMutedPathLegByKey,
    removeMutedPathLegByKey,
    upsertMutedPathLegEntry,
    trimMutedPathLegsForStorage,
    filterMutedPathLegs,
    filterMutedCycles
  };
}));
