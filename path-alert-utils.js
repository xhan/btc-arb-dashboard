(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.PathAlertUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_PATH_ALERT_WEBHOOK_URL = 'https://api.day.app/45xWAiD79Rn8DPXw6Beudh/[title]/[body]?sound=ladder';
  const DEFAULT_PATH_ALERT_THRESHOLD_BP = 1.1;
  const DEFAULT_PATH_ALERT_SETTINGS = Object.freeze({
    pathAlertEvalIntervalMs: 1000,
    defaultCooldownSec: 300,
    localSoundEnabled: true,
    webhookEnabled: false,
    webhookUrl: DEFAULT_PATH_ALERT_WEBHOOK_URL,
    webhookSecret: ''
  });

  const DEFAULT_ALERT_DELIVERY = Object.freeze({
    sound: true,
    log: true,
    webhookEnabled: false
  });

  function toFiniteNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toPositiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function toNonNegativeInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function cloneDefaultSettings() {
    return { ...DEFAULT_PATH_ALERT_SETTINGS };
  }

  function cloneDefaultDelivery() {
    return { ...DEFAULT_ALERT_DELIVERY };
  }

  function normalizePathAlertLeg(leg) {
    if (!leg || typeof leg !== 'object') return null;
    const quoteId = Number(leg.quoteId);
    if (!Number.isFinite(quoteId)) return null;
    const direction = leg.direction === 'inverse' ? 'inverse' : 'forward';
    const pricingMode = ['raw', 'cex-bid1', 'cex-ask1-inverse'].includes(leg.pricingMode)
      ? leg.pricingMode
      : 'raw';
    return {
      quoteId,
      direction,
      pricingMode,
      chain: String(leg.chain || ''),
      fromSymbol: String(leg.fromSymbol || ''),
      toSymbol: String(leg.toSymbol || '')
    };
  }

  function normalizePathAlert(alert, settings) {
    if (!alert || typeof alert !== 'object') return null;
    const target = alert.target || {};
    if (target.type !== 'path' && target.type !== 'rule') return null;

    const normalized = {
      id: String(alert.id || ''),
      name: String(alert.name || ''),
      enabled: alert.enabled !== false,
      thresholdBp: toFiniteNumber(alert.thresholdBp, 0),
      triggerMode: alert.triggerMode === 'delayed' ? 'delayed' : 'immediate',
      confirmDelaySec: toNonNegativeInteger(alert.confirmDelaySec, 0),
      cooldownSec: toPositiveInteger(alert.cooldownSec, settings.defaultCooldownSec),
      delivery: {
        ...cloneDefaultDelivery(),
        ...(alert.delivery && typeof alert.delivery === 'object' ? alert.delivery : {})
      },
      target: null
    };

    if (target.type === 'path') {
      const legs = Array.isArray(target.legs)
        ? target.legs.map(normalizePathAlertLeg).filter(Boolean)
        : [];
      normalized.target = {
        type: 'path',
        legs
      };
      return normalized;
    }

    normalized.target = {
      type: 'rule',
      ruleKind: target.ruleKind === 'special' ? 'special' : 'fixed',
      ruleId: String(target.ruleId || '')
    };
    return normalized;
  }

  function normalizeAlertConfig(input) {
    const source = input && typeof input === 'object' ? input : {};
    const settings = {
      pathAlertEvalIntervalMs: toPositiveInteger(
        source.settings && source.settings.pathAlertEvalIntervalMs,
        DEFAULT_PATH_ALERT_SETTINGS.pathAlertEvalIntervalMs
      ),
      defaultCooldownSec: toPositiveInteger(
        source.settings && source.settings.defaultCooldownSec,
        DEFAULT_PATH_ALERT_SETTINGS.defaultCooldownSec
      ),
      localSoundEnabled: source.settings ? source.settings.localSoundEnabled !== false : true,
      webhookEnabled: Boolean(source.settings && source.settings.webhookEnabled === true),
      webhookUrl: String((source.settings && source.settings.webhookUrl) || DEFAULT_PATH_ALERT_SETTINGS.webhookUrl),
      webhookSecret: String((source.settings && source.settings.webhookSecret) || '')
    };

    const alerts = Array.isArray(source.alerts)
      ? source.alerts.map((alert) => normalizePathAlert(alert, settings)).filter(Boolean)
      : [];

    return {
      version: 1,
      settings,
      alerts
    };
  }

  function isPathAlertConfirmDelayDisabled(triggerMode) {
    return triggerMode !== 'delayed';
  }

  function buildPathAlertWebhookUrl(template, title, body) {
    const rawTemplate = String(template || DEFAULT_PATH_ALERT_SETTINGS.webhookUrl || '').trim();
    if (!rawTemplate) return '';
    return rawTemplate
      .replace(/\[title\]/gu, encodeURIComponent(String(title || '')))
      .replace(/\[body\]/gu, encodeURIComponent(String(body || '')));
  }

  function buildPathAlertSummaryLines(alert, options = {}) {
    if (!alert || !alert.target) return [];
    const formatLeg = typeof options.formatLeg === 'function'
      ? options.formatLeg
      : (leg) => `(${leg.chain || '--'}) ${leg.fromSymbol || '--'} -> ${leg.toSymbol || '--'}`;
    const findRule = typeof options.findRule === 'function' ? options.findRule : () => null;

    if (alert.target.type === 'rule') {
      const rule = findRule(alert.target.ruleKind, alert.target.ruleId);
      return [rule && rule.title ? rule.title : String(alert.target.ruleId || '--')];
    }

    return Array.isArray(alert.target.legs)
      ? alert.target.legs.map((leg) => formatLeg(leg)).filter(Boolean)
      : [];
  }

  function getLegRate(leg, state) {
    if (!leg || !state) return null;
    if (leg.pricingMode === 'cex-bid1') {
      return state.cexOrderbook && Number.isFinite(state.cexOrderbook.bestBidPrice)
        ? state.cexOrderbook.bestBidPrice
        : null;
    }
    if (leg.pricingMode === 'cex-ask1-inverse') {
      const ask = state.cexOrderbook && state.cexOrderbook.bestAskPrice;
      return Number.isFinite(ask) && ask > 0 ? 1 / ask : null;
    }
    if (leg.direction === 'inverse') {
      return Number.isFinite(state.inverseRawPrice) ? state.inverseRawPrice : null;
    }
    return Number.isFinite(state.lastRawPrice) ? state.lastRawPrice : null;
  }

  function unavailableEvaluation(targetType) {
    return {
      available: false,
      status: 'unavailable',
      targetType,
      profitRate: null,
      profitBp: null
    };
  }

  function evaluatePathAlert(alert, options = {}) {
    const target = alert && alert.target ? alert.target : null;
    if (!target) return unavailableEvaluation('');

    if (target.type === 'rule') {
      if (typeof options.resolveRuleEvaluation !== 'function') {
        return unavailableEvaluation('rule');
      }
      const resolved = options.resolveRuleEvaluation(target, alert);
      if (!resolved || resolved.available !== true || !Number.isFinite(resolved.profitRate)) {
        return unavailableEvaluation('rule');
      }
      return {
        available: true,
        status: 'ok',
        targetType: 'rule',
        profitRate: resolved.profitRate,
        profitBp: resolved.profitRate * 10000
      };
    }

    const quoteStateById = options.quoteStateById instanceof Map ? options.quoteStateById : new Map();
    let product = 1;

    for (const leg of (target.legs || [])) {
      const state = quoteStateById.get(leg.quoteId);
      const rate = getLegRate(leg, state);
      if (!Number.isFinite(rate)) {
        return unavailableEvaluation('path');
      }
      product *= rate;
    }

    const profitRate = product - 1;
    return {
      available: true,
      status: 'ok',
      targetType: 'path',
      profitRate,
      profitBp: profitRate * 10000
    };
  }

  function normalizeRuntimeState(runtimeState, evaluation, nowMs) {
    return {
      status: runtimeState && runtimeState.status ? runtimeState.status : 'idle',
      eligibleSince: runtimeState && Number.isFinite(runtimeState.eligibleSince) ? runtimeState.eligibleSince : null,
      cooldownUntil: runtimeState && Number.isFinite(runtimeState.cooldownUntil) ? runtimeState.cooldownUntil : 0,
      lastTriggeredAt: runtimeState && Number.isFinite(runtimeState.lastTriggeredAt) ? runtimeState.lastTriggeredAt : null,
      lastEvaluatedProfitBp: evaluation && Number.isFinite(evaluation.profitBp) ? evaluation.profitBp : null,
      lastAvailableAt: evaluation && evaluation.available ? nowMs : (runtimeState && Number.isFinite(runtimeState.lastAvailableAt) ? runtimeState.lastAvailableAt : null),
      shouldTrigger: false
    };
  }

  function advancePathAlertRuntime(alert, runtimeState, evaluation, nowMs = Date.now()) {
    const next = normalizeRuntimeState(runtimeState, evaluation, nowMs);
    if (!alert || alert.enabled === false) {
      next.status = 'disabled';
      next.eligibleSince = null;
      return next;
    }

    if (!evaluation || evaluation.available !== true || !Number.isFinite(evaluation.profitBp)) {
      next.status = 'unavailable';
      next.eligibleSince = null;
      return next;
    }

    const thresholdBp = toFiniteNumber(alert.thresholdBp, 0);
    const meetsThreshold = evaluation.profitBp >= thresholdBp;
    if (!meetsThreshold) {
      next.status = 'idle';
      next.eligibleSince = null;
      return next;
    }

    if (!Number.isFinite(next.eligibleSince)) {
      next.eligibleSince = nowMs;
    }

    if (nowMs < next.cooldownUntil) {
      next.status = 'cooldown';
      return next;
    }

    if (alert.triggerMode === 'delayed') {
      const confirmDelayMs = toNonNegativeInteger(alert.confirmDelaySec, 0) * 1000;
      if ((nowMs - next.eligibleSince) < confirmDelayMs) {
        next.status = 'pending_confirm';
        return next;
      }
    }

    next.status = 'cooldown';
    next.shouldTrigger = true;
    next.lastTriggeredAt = nowMs;
    next.cooldownUntil = nowMs + (toPositiveInteger(alert.cooldownSec, DEFAULT_PATH_ALERT_SETTINGS.defaultCooldownSec) * 1000);
    return next;
  }

  return {
    DEFAULT_PATH_ALERT_WEBHOOK_URL,
    DEFAULT_PATH_ALERT_THRESHOLD_BP,
    DEFAULT_ALERT_DELIVERY,
    DEFAULT_PATH_ALERT_SETTINGS,
    advancePathAlertRuntime,
    buildPathAlertSummaryLines,
    buildPathAlertWebhookUrl,
    evaluatePathAlert,
    isPathAlertConfirmDelayDisabled,
    normalizeAlertConfig,
    normalizePathAlert
  };
}));
