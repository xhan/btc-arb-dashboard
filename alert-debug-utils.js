(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.AlertDebugUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function padNumber(value, length = 2) {
    return String(value).padStart(length, '0');
  }

  function defaultFormatTime(value) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp)) return 'null';
    const date = new Date(timestamp);
    return [
      padNumber(date.getHours()),
      ':',
      padNumber(date.getMinutes()),
      ':',
      padNumber(date.getSeconds()),
      '.',
      Math.floor(date.getMilliseconds() / 100)
    ].join('');
  }

  function normalizeLogger(logger) {
    return typeof logger === 'function'
      ? logger
      : function defaultLogger(message) {
        console.info(message);
      };
  }

  function normalizeOptionalTimestamp(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
    return numericValue;
  }

  function buildSignature(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return '';
    const data = {
      status: snapshot.status || '',
      reason: snapshot.reason || '',
      eligibleSince: normalizeOptionalTimestamp(snapshot.eligibleSince),
      lastTriggeredAt: normalizeOptionalTimestamp(snapshot.lastTriggeredAt),
      cooldownUntil: normalizeOptionalTimestamp(snapshot.cooldownUntil),
      comparison: snapshot.comparison && typeof snapshot.comparison === 'object'
        ? {
          netProfit: Number.isFinite(Number(snapshot.comparison.netProfit)) ? Number(snapshot.comparison.netProfit) : null,
          minNetProfit: Number.isFinite(Number(snapshot.comparison.minNetProfit)) ? Number(snapshot.comparison.minNetProfit) : null,
          netProfitBp: Number.isFinite(Number(snapshot.comparison.netProfitBp)) ? Number(snapshot.comparison.netProfitBp) : null,
          minNetProfitBp: Number.isFinite(Number(snapshot.comparison.minNetProfitBp)) ? Number(snapshot.comparison.minNetProfitBp) : null,
          meetsTriggerCondition: snapshot.comparison.meetsTriggerCondition === true
        }
        : null
    };
    return JSON.stringify(data);
  }

  function buildComparisonText(comparison) {
    if (!comparison || typeof comparison !== 'object') return '';
    const netProfit = Number(comparison.netProfit);
    const minNetProfit = Number(comparison.minNetProfit);
    const netProfitBp = Number(comparison.netProfitBp);
    const minNetProfitBp = Number(comparison.minNetProfitBp);
    if (
      !Number.isFinite(netProfit)
      || !Number.isFinite(minNetProfit)
      || !Number.isFinite(netProfitBp)
      || !Number.isFinite(minNetProfitBp)
    ) {
      return '';
    }
    return [
      `net=${netProfit}/${minNetProfit}`,
      `bp=${netProfitBp}/${minNetProfitBp}`,
      `meets=${comparison.meetsTriggerCondition === true ? 'true' : 'false'}`
    ].join(' | ');
  }

  function inferRuntimeDebugReason(previous, next) {
    if (!next || typeof next !== 'object') return 'skip';
    if (next.shouldTrigger) return 'trigger';
    const previousEligibleSince = Number(previous && previous.eligibleSince);
    const nextEligibleSince = Number(next.eligibleSince);
    const hadEligibleSince = Number.isFinite(previousEligibleSince);
    const hasEligibleSince = Number.isFinite(nextEligibleSince);
    if (!hadEligibleSince && hasEligibleSince) return 'condition_on';
    if (hadEligibleSince && !hasEligibleSince) return 'condition_off';
    if (next.status === 'cooldown') return 'cooldown_block';
    return next.status || 'idle';
  }

  function buildRuntimeDebugSnapshot(previous, next, evaluation, options = {}) {
    if (!next || typeof next !== 'object') return null;
    const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
    return {
      now: nowMs,
      status: next.shouldTrigger ? 'trigger' : (next.status || 'idle'),
      reason: inferRuntimeDebugReason(previous, next),
      eligibleSince: next.eligibleSince,
      lastTriggeredAt: next.lastTriggeredAt,
      cooldownUntil: next.cooldownUntil,
      comparison: evaluation && evaluation.debugComparison && typeof evaluation.debugComparison === 'object'
        ? { ...evaluation.debugComparison }
        : null
    };
  }

  function createAlertDebugController(options = {}) {
    const logger = normalizeLogger(options.logger);
    const formatTime = typeof options.formatTime === 'function' ? options.formatTime : defaultFormatTime;
    const state = {
      enabled: false,
      signatures: new Map()
    };

    function formatTimestamp(value) {
      const numericValue = normalizeOptionalTimestamp(value);
      if (!Number.isFinite(numericValue)) return 'null';
      return `${formatTime(numericValue)} (${numericValue})`;
    }

    function formatStatus(status) {
      switch (String(status || '').trim()) {
        case 'pending_confirm':
          return 'pending';
        case 'trigger':
          return 'trigger';
        case 'cooldown':
          return 'cooldown';
        case 'idle':
          return 'idle';
        case 'unavailable':
          return 'unavailable';
        case 'monitoring':
          return 'monitoring';
        case 'disappeared':
          return 'disappeared';
        default:
          return String(status || 'unknown');
      }
    }

    function formatReason(reason) {
      const normalized = String(reason || '').trim();
      return normalized || 'unknown';
    }

    function buildLogLine(kind, id, snapshot) {
      const parts = [
        `[alert-debug][${kind}] ${id}`,
        formatStatus(snapshot.status),
        `reason=${formatReason(snapshot.reason)}`,
        `now=${formatTimestamp(snapshot.now)}`,
        `eligible_since=${formatTimestamp(snapshot.eligibleSince)}`,
        `last_triggered_at=${formatTimestamp(snapshot.lastTriggeredAt)}`,
        `cooldown_until=${formatTimestamp(snapshot.cooldownUntil)}`
      ];
      const comparisonText = buildComparisonText(snapshot.comparison);
      if (comparisonText) parts.push(comparisonText);
      return parts.join(' | ');
    }

    function isEnabled() {
      return state.enabled;
    }

    function enable(enabled) {
      state.enabled = enabled === true;
      state.signatures.clear();
      logger(`[alert-debug] ${state.enabled ? 'enabled' : 'disabled'}`);
      return state.enabled;
    }

    function record(kind, id, snapshot) {
      if (!state.enabled) return;
      const normalizedKind = String(kind || 'unknown').trim() || 'unknown';
      const normalizedId = String(id || '').trim() || 'unknown';
      const signatureKey = `${normalizedKind}:${normalizedId}`;
      const nextSignature = buildSignature(snapshot);
      if (!nextSignature) return;
      if (state.signatures.get(signatureKey) === nextSignature) return;
      state.signatures.set(signatureKey, nextSignature);
      logger(buildLogLine(normalizedKind, normalizedId, snapshot));
    }

    return {
      enable,
      isEnabled,
      record
    };
  }

  return {
    buildRuntimeDebugSnapshot,
    createAlertDebugController
  };
}));
