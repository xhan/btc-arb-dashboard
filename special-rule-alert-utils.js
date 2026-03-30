(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SpecialRuleAlertUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_CONFIRM_DELAY_SEC = 10;
  const DEFAULT_COOLDOWN_SEC = 120;
  const DEFAULT_RUNTIME_TTL_MS = 30 * 60 * 1000;

  function toNonNegativeNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function toPositiveNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function normalizeRuntimeState(previousState, nowMs) {
    const previous = previousState && typeof previousState === 'object' ? previousState : {};
    const rawEligibleSince = previous.eligibleSince;
    const eligibleSince = (
      rawEligibleSince === null
      || typeof rawEligibleSince === 'undefined'
      || rawEligibleSince === ''
    )
      ? null
      : Number(rawEligibleSince);
    const lastTriggeredAt = Number(previous.lastTriggeredAt);
    const lastSeenAt = Number(previous.lastSeenAt);
    return {
      eligibleSince: eligibleSince === null ? null : (Number.isFinite(eligibleSince) ? eligibleSince : null),
      lastTriggeredAt: Number.isFinite(lastTriggeredAt) ? lastTriggeredAt : 0,
      lastSeenAt: Number.isFinite(lastSeenAt) ? lastSeenAt : nowMs
    };
  }

  function resolveAlertMessage(opportunity) {
    return String(opportunity && (opportunity.alert_message || opportunity.display_message) || '').trim();
  }

  function advanceSpecialRuleAlertRuntime(previousState, opportunity, nowMs = Date.now()) {
    const next = normalizeRuntimeState(previousState, nowMs);
    next.lastSeenAt = nowMs;

    if (!opportunity || typeof opportunity !== 'object' || opportunity.alert !== true) {
      next.eligibleSince = null;
      return { shouldTrigger: false, state: next };
    }

    if (!resolveAlertMessage(opportunity)) {
      next.eligibleSince = null;
      return { shouldTrigger: false, state: next };
    }

    if (!Number.isFinite(next.eligibleSince)) {
      next.eligibleSince = nowMs;
    }

    const confirmDelaySec = toNonNegativeNumber(opportunity.alert_confirm_delay_sec, DEFAULT_CONFIRM_DELAY_SEC);
    if ((nowMs - next.eligibleSince) < (confirmDelaySec * 1000)) {
      return { shouldTrigger: false, state: next };
    }

    const cooldownSec = toPositiveNumber(opportunity.alert_cooldown_sec, DEFAULT_COOLDOWN_SEC);
    if (next.lastTriggeredAt > 0 && (nowMs - next.lastTriggeredAt) < (cooldownSec * 1000)) {
      return { shouldTrigger: false, state: next };
    }

    next.lastTriggeredAt = nowMs;
    return { shouldTrigger: true, state: next };
  }

  function pruneSpecialRuleAlertRuntimeState(runtimeMap, activeKeys, nowMs = Date.now(), ttlMs = DEFAULT_RUNTIME_TTL_MS) {
    if (!(runtimeMap instanceof Map)) return runtimeMap;
    const activeSet = activeKeys instanceof Set ? activeKeys : new Set();
    const safeTtlMs = toPositiveNumber(ttlMs, DEFAULT_RUNTIME_TTL_MS);
    for (const key of Array.from(runtimeMap.keys())) {
      if (activeSet.has(key)) continue;
      const next = normalizeRuntimeState(runtimeMap.get(key), nowMs);
      if (next.lastSeenAt <= 0 || (nowMs - next.lastSeenAt) >= safeTtlMs) {
        runtimeMap.delete(key);
        continue;
      }
      if (next.eligibleSince !== null) {
        next.eligibleSince = null;
        runtimeMap.set(key, next);
      }
    }
    return runtimeMap;
  }

  return {
    DEFAULT_CONFIRM_DELAY_SEC,
    DEFAULT_COOLDOWN_SEC,
    DEFAULT_RUNTIME_TTL_MS,
    advanceSpecialRuleAlertRuntime,
    pruneSpecialRuleAlertRuntimeState
  };
}));
