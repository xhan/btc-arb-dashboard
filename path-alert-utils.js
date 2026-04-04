(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./special-rule-alert-config-utils'));
    return;
  }
  root.PathAlertUtils = factory(root.SpecialRuleAlertConfigUtils || null);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (specialRuleAlertConfigUtils) {
  const DEFAULT_PATH_ALERT_WEBHOOK_URL = 'https://api.day.app/45xWAiD79Rn8DPXw6Beudh/[title]/[body]?sound=ladder';
  const DEFAULT_TELEGRAM_BOT_API_BASE_URL = 'https://api.telegram.org';
  const DEFAULT_PATH_ALERT_THRESHOLD_BP = 1.1;
  const PATH_ALERT_MUTE_DURATION_MS = 60 * 60 * 1000;
  const PATH_ALERT_MUTE_EXTEND_DURATION_MS = 2 * 60 * 60 * 1000;
  const DEFAULT_PATH_ALERT_SETTINGS = Object.freeze({
    pathAlertEvalIntervalMs: 1000,
    defaultCooldownSec: 180,
    changedLegMinBp: 0.1,
    localSoundEnabled: true,
    webhookEnabled: false,
    dayAppEnabled: false,
    telegramEnabled: true,
    webhookUrl: DEFAULT_PATH_ALERT_WEBHOOK_URL,
    webhookSecret: ''
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

  function toBasisPoints(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Number((parsed * 10000).toFixed(10));
  }

  function cloneDefaultSettings() {
    return { ...DEFAULT_PATH_ALERT_SETTINGS };
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

  function normalizePathAlertTarget(target) {
    if (!target || typeof target !== 'object') return null;
    if (target.type === 'path') {
      const legs = Array.isArray(target.legs)
        ? target.legs.map(normalizePathAlertLeg).filter(Boolean)
        : [];
      return {
        type: 'path',
        legs
      };
    }
    if (target.type === 'quote') {
      const quoteId = Number(target.quoteId);
      if (!Number.isFinite(quoteId)) return null;
      const direction = target.direction === 'inverse' ? 'inverse' : 'forward';
      const ruleKind = ['targetAbove', 'targetBelow', 'percentUp', 'percentDown'].includes(target.ruleKind)
        ? target.ruleKind
        : '';
      if (!ruleKind) return null;
      const value = Number(target.value);
      if (!Number.isFinite(value)) return null;
      const normalized = {
        type: 'quote',
        quoteId,
        direction,
        ruleKind,
        value
      };
      if (ruleKind === 'percentUp' || ruleKind === 'percentDown') {
        const basePrice = Number(target.basePrice);
        if (Number.isFinite(basePrice)) {
          normalized.basePrice = basePrice;
        }
      }
      return normalized;
    }
    if (target.type !== 'rule') return null;
    return {
      type: 'rule',
      ruleKind: target.ruleKind === 'special' ? 'special' : 'fixed',
      ruleId: String(target.ruleId || '')
    };
  }

  function normalizePathAlert(alert, settings) {
    if (!alert || typeof alert !== 'object') return null;
    const target = normalizePathAlertTarget(alert.target || {});
    if (!target) return null;

    const normalized = {
      id: String(alert.id || ''),
      name: String(alert.name || ''),
      enabled: alert.enabled !== false,
      thresholdBp: toFiniteNumber(alert.thresholdBp, 0),
      triggerMode: alert.triggerMode === 'immediate' ? 'immediate' : 'delayed',
      confirmDelaySec: toNonNegativeInteger(alert.confirmDelaySec, 13),
      cooldownSec: toPositiveInteger(alert.cooldownSec, settings.defaultCooldownSec),
      target: null
    };

    normalized.target = target;
    if (
      target.type === 'rule'
      && target.ruleKind === 'special'
      && specialRuleAlertConfigUtils
      && typeof specialRuleAlertConfigUtils.normalizeSpecialRuleAlertConfig === 'function'
    ) {
      normalized.specialRuleConfig = specialRuleAlertConfigUtils.normalizeSpecialRuleAlertConfig(alert.specialRuleConfig);
    }
    return normalized;
  }

  function normalizeDismissedTarget(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const target = normalizePathAlertTarget(entry.target || {});
    if (!target) return null;
    return {
      target,
      summaryLinesSnapshot: Array.isArray(entry.summaryLinesSnapshot)
        ? entry.summaryLinesSnapshot.map((line) => String(line || '')).filter(Boolean)
        : [],
      dismissedAt: toPositiveInteger(entry.dismissedAt, 0)
    };
  }

  function normalizeMutedPathTarget(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const target = normalizePathAlertTarget(entry.target || {});
    if (!target) return null;
    const mutedAt = toPositiveInteger(entry.mutedAt, 0);
    const expiresAt = toPositiveInteger(entry.expiresAt, 0);
    if (!mutedAt || !expiresAt || expiresAt <= mutedAt) return null;
    return {
      target,
      summaryLinesSnapshot: Array.isArray(entry.summaryLinesSnapshot)
        ? entry.summaryLinesSnapshot.map((line) => String(line || '')).filter(Boolean)
        : [],
      mutedAt,
      expiresAt
    };
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
      changedLegMinBp: toFiniteNumber(
        source.settings && source.settings.changedLegMinBp,
        DEFAULT_PATH_ALERT_SETTINGS.changedLegMinBp
      ),
      localSoundEnabled: source.settings ? source.settings.localSoundEnabled !== false : true,
      webhookEnabled: Boolean(source.settings && source.settings.webhookEnabled === true),
      dayAppEnabled: source.settings ? source.settings.dayAppEnabled === true : DEFAULT_PATH_ALERT_SETTINGS.dayAppEnabled,
      telegramEnabled: source.settings ? source.settings.telegramEnabled !== false : DEFAULT_PATH_ALERT_SETTINGS.telegramEnabled,
      webhookUrl: String((source.settings && source.settings.webhookUrl) || DEFAULT_PATH_ALERT_SETTINGS.webhookUrl),
      webhookSecret: String((source.settings && source.settings.webhookSecret) || '')
    };

    const alerts = Array.isArray(source.alerts)
      ? source.alerts.map((alert) => normalizePathAlert(alert, settings)).filter(Boolean)
      : [];

    const dismissedTargets = Array.isArray(source.dismissedTargets)
      ? source.dismissedTargets.map((entry) => normalizeDismissedTarget(entry)).filter(Boolean)
      : [];

    return {
      version: 1,
      settings,
      alerts,
      dismissedTargets
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

  function buildTelegramBotApiUrl(botToken, method, baseUrl = DEFAULT_TELEGRAM_BOT_API_BASE_URL) {
    const normalizedBaseUrl = String(baseUrl || DEFAULT_TELEGRAM_BOT_API_BASE_URL).trim().replace(/\/+$/u, '');
    const normalizedBotToken = String(botToken || '').trim();
    const normalizedMethod = String(method || '').trim();
    if (!normalizedBaseUrl || !normalizedBotToken || !normalizedMethod) return '';
    return `${normalizedBaseUrl}/bot${normalizedBotToken}/${normalizedMethod}`;
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
    if (alert.target.type === 'quote') {
      return [String(alert.name || '').trim() || `Quote ${alert.target.quoteId}`];
    }

    return Array.isArray(alert.target.legs)
      ? alert.target.legs.map((leg) => formatLeg(leg)).filter(Boolean)
      : [];
  }

  function buildPathAlertLegDuplicateKey(leg) {
    if (!leg || typeof leg !== 'object') return '';
    const quoteId = Number(leg.quoteId);
    if (!Number.isFinite(quoteId) || quoteId <= 0) return '';
    const direction = leg.direction === 'inverse' ? 'inverse' : 'forward';
    const pricingMode = ['raw', 'cex-bid1', 'cex-ask1-inverse'].includes(leg.pricingMode)
      ? leg.pricingMode
      : 'raw';
    return `${quoteId}|${direction}|${pricingMode}`;
  }

  function isClosedPathCycle(legs) {
    if (!Array.isArray(legs) || legs.length < 2) return false;
    for (let index = 0; index < legs.length; index += 1) {
      const current = legs[index];
      const next = legs[(index + 1) % legs.length];
      if (!current || !next) return false;
      const currentTo = String(current.toSymbol || '');
      const nextFrom = String(next.fromSymbol || '');
      if (!currentTo || !nextFrom || currentTo !== nextFrom) {
        return false;
      }
    }
    return true;
  }

  function buildPathAlertTargetDuplicateKey(target) {
    if (!target || typeof target !== 'object') return '';
    if (target.type === 'quote') {
      const quoteId = Number(target.quoteId);
      const direction = target.direction === 'inverse' ? 'inverse' : 'forward';
      const ruleKind = String(target.ruleKind || '').trim();
      return Number.isFinite(quoteId) && ruleKind ? `quote:${quoteId}:${direction}:${ruleKind}` : '';
    }
    if (target.type === 'rule') {
      const ruleKind = target.ruleKind === 'special' ? 'special' : target.ruleKind === 'fixed' ? 'fixed' : '';
      const ruleId = String(target.ruleId || '').trim();
      return ruleKind && ruleId ? `rule:${ruleKind}:${ruleId}` : '';
    }
    if (target.type !== 'path' || !Array.isArray(target.legs) || !target.legs.length) {
      return '';
    }
    const legKeys = target.legs.map(buildPathAlertLegDuplicateKey);
    if (legKeys.some((key) => !key)) return '';
    if (!isClosedPathCycle(target.legs)) {
      return `path:${legKeys.join('>')}`;
    }
    const rotations = legKeys.map((_, index) => (
      legKeys.slice(index).concat(legKeys.slice(0, index)).join('>')
    ));
    rotations.sort();
    return `path:${rotations[0]}`;
  }

  function findDuplicatePathAlert(alerts, alertOrTarget, options = {}) {
    const items = Array.isArray(alerts) ? alerts : [];
    const target = alertOrTarget && alertOrTarget.target ? alertOrTarget.target : alertOrTarget;
    const duplicateKey = buildPathAlertTargetDuplicateKey(target);
    if (!duplicateKey) return null;
    const excludedId = String(options.excludeId || (alertOrTarget && alertOrTarget.id) || '').trim();

    for (const alert of items) {
      if (!alert || typeof alert !== 'object') continue;
      if (excludedId && String(alert.id || '').trim() === excludedId) continue;
      if (buildPathAlertTargetDuplicateKey(alert.target) === duplicateKey) {
        return alert;
      }
    }
    return null;
  }

  function findDismissedPathAlert(dismissedTargets, alertOrTarget) {
    const items = Array.isArray(dismissedTargets) ? dismissedTargets : [];
    const target = alertOrTarget && alertOrTarget.target ? alertOrTarget.target : alertOrTarget;
    const duplicateKey = buildPathAlertTargetDuplicateKey(target);
    if (!duplicateKey) return null;
    for (const entry of items) {
      if (!entry || typeof entry !== 'object') continue;
      if (buildPathAlertTargetDuplicateKey(entry.target) === duplicateKey) {
        return entry;
      }
    }
    return null;
  }

  function createDismissedTargetEntry(alertOrTarget, summaryLinesSnapshot = [], dismissedAt = Date.now()) {
    const target = alertOrTarget && alertOrTarget.target ? alertOrTarget.target : alertOrTarget;
    const normalizedTarget = normalizePathAlertTarget(target);
    if (!normalizedTarget) return null;
    return normalizeDismissedTarget({
      target: normalizedTarget,
      summaryLinesSnapshot,
      dismissedAt
    });
  }

  function createMutedPathTargetEntry(
    alertOrTarget,
    summaryLinesSnapshot = [],
    mutedAt = Date.now(),
    durationMs = PATH_ALERT_MUTE_DURATION_MS
  ) {
    const target = alertOrTarget && alertOrTarget.target ? alertOrTarget.target : alertOrTarget;
    const normalizedTarget = normalizePathAlertTarget(target);
    const safeMutedAt = toPositiveInteger(mutedAt, Date.now());
    const safeDurationMs = toPositiveInteger(durationMs, PATH_ALERT_MUTE_DURATION_MS);
    if (!normalizedTarget || (normalizedTarget.type !== 'path' && normalizedTarget.type !== 'quote')) return null;
    return normalizeMutedPathTarget({
      target: normalizedTarget,
      summaryLinesSnapshot,
      mutedAt: safeMutedAt,
      expiresAt: safeMutedAt + safeDurationMs
    });
  }

  function extendMutedPathTargetEntry(entry, nowMs = Date.now(), durationMs = PATH_ALERT_MUTE_EXTEND_DURATION_MS) {
    const normalizedEntry = normalizeMutedPathTarget(entry);
    if (!normalizedEntry) return null;
    const safeNowMs = toPositiveInteger(nowMs, Date.now());
    const safeDurationMs = toPositiveInteger(durationMs, PATH_ALERT_MUTE_EXTEND_DURATION_MS);
    const baseExpiresAt = Math.max(normalizedEntry.expiresAt, safeNowMs);
    return normalizeMutedPathTarget({
      ...normalizedEntry,
      expiresAt: baseExpiresAt + safeDurationMs
    });
  }

  function pruneExpiredMutedPathTargets(entries, nowMs = Date.now()) {
    const items = Array.isArray(entries) ? entries : [];
    return items
      .map((entry) => normalizeMutedPathTarget(entry))
      .filter((entry) => entry && nowMs < entry.expiresAt);
  }

  function findMutedPathAlert(mutedTargets, alertOrTarget, nowMs = Date.now()) {
    const items = pruneExpiredMutedPathTargets(mutedTargets, nowMs);
    const target = alertOrTarget && alertOrTarget.target ? alertOrTarget.target : alertOrTarget;
    const duplicateKey = buildPathAlertTargetDuplicateKey(target);
    if (!duplicateKey) return null;
    for (const entry of items) {
      if (!entry || typeof entry !== 'object') continue;
      if (buildPathAlertTargetDuplicateKey(entry.target) === duplicateKey) {
        return entry;
      }
    }
    return null;
  }

  function formatMutedCountdown(remainingMs) {
    const safeRemainingMs = Math.max(0, Number(remainingMs) || 0);
    const totalSeconds = Math.floor(safeRemainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function buildChangedLegs(currentLegs, baselineLegs, minAbsBp = 1) {
    if (!Array.isArray(currentLegs) || !Array.isArray(baselineLegs) || !currentLegs.length || !baselineLegs.length) {
      return [];
    }

    const baselineByKey = new Map();
    for (const leg of baselineLegs) {
      const key = buildPathAlertLegDuplicateKey(leg);
      if (!key || !Number.isFinite(leg.rate) || leg.rate <= 0) continue;
      baselineByKey.set(key, leg.rate);
    }

    const changes = [];
    for (const leg of currentLegs) {
      const key = buildPathAlertLegDuplicateKey(leg);
      if (!key || !Number.isFinite(leg.rate) || leg.rate <= 0) continue;
      const baselineRate = baselineByKey.get(key);
      if (!Number.isFinite(baselineRate) || baselineRate <= 0) continue;
      const deltaBp = ((leg.rate / baselineRate) - 1) * 10000;
      if (Math.abs(deltaBp) <= minAbsBp) continue;
      changes.push({
        ...leg,
        deltaBp
      });
    }

    return changes.sort((left, right) => {
      const absDiff = Math.abs(right.deltaBp) - Math.abs(left.deltaBp);
      if (absDiff !== 0) return absDiff;
      return right.deltaBp - left.deltaBp;
    });
  }

  function countPathAlertRealLegs(alert, evaluation) {
    if (alert && alert.target && alert.target.type === 'quote') {
      return 1;
    }
    if (alert && alert.target && alert.target.type === 'path') {
      return Array.isArray(alert.target.legs) ? alert.target.legs.length : 0;
    }
    const cycleLegs = Array.isArray(evaluation && evaluation.cycle && evaluation.cycle.legs)
      ? evaluation.cycle.legs
      : [];
    return cycleLegs.filter((leg) => Number.isFinite(Number(leg && leg.quoteId))).length;
  }

  function sortTriggeredPathAlerts(items) {
    const list = Array.isArray(items) ? [...items] : [];
    return list.sort((left, right) => {
      const leftLegCount = countPathAlertRealLegs(left && left.alert, left && left.evaluation);
      const rightLegCount = countPathAlertRealLegs(right && right.alert, right && right.evaluation);
      if (leftLegCount !== rightLegCount) {
        return leftLegCount - rightLegCount;
      }
      const leftProfitBp = Number(left && left.evaluation && left.evaluation.profitBp);
      const rightProfitBp = Number(right && right.evaluation && right.evaluation.profitBp);
      if (Number.isFinite(leftProfitBp) && Number.isFinite(rightProfitBp) && leftProfitBp !== rightProfitBp) {
        return rightProfitBp - leftProfitBp;
      }
      return 0;
    });
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

  function buildLegSnapshot(leg, rate) {
    if (!leg || !Number.isFinite(rate)) return null;
    return {
      quoteId: Number(leg.quoteId),
      direction: leg.direction === 'inverse' || leg.inverse ? 'inverse' : 'forward',
      pricingMode: ['raw', 'cex-bid1', 'cex-ask1-inverse'].includes(leg.pricingMode)
        ? leg.pricingMode
        : (leg.cexLevelLabel === 'bid1' ? 'cex-bid1' : leg.cexLevelLabel === 'ask1' ? 'cex-ask1-inverse' : 'raw'),
      chain: String(leg.chain || ''),
      fromSymbol: String(leg.fromSymbol || leg.from || ''),
      toSymbol: String(leg.toSymbol || leg.to || ''),
      inverse: Boolean(leg.inverse),
      cexLevelLabel: String(leg.cexLevelLabel || ''),
      cexLevelSize: Number.isFinite(Number(leg.cexLevelSize)) ? Number(leg.cexLevelSize) : null,
      rate
    };
  }

  function buildAllLegSnapshots(quotes, quoteStateById) {
    const items = Array.isArray(quotes) ? quotes : [];
    const stateMap = quoteStateById instanceof Map ? quoteStateById : new Map();
    const snapshots = [];

    for (const quote of items) {
      if (!quote || !Number.isFinite(Number(quote.id))) continue;
      const state = stateMap.get(Number(quote.id));
      if (!state) continue;

      if (Number.isFinite(state.lastRawPrice) && state.fromSymbol && state.toSymbol) {
        const snapshot = buildLegSnapshot({
          quoteId: Number(quote.id),
          direction: 'forward',
          pricingMode: 'raw',
          chain: quote.chain,
          fromSymbol: state.fromSymbol,
          toSymbol: state.toSymbol
        }, state.lastRawPrice);
        if (snapshot) snapshots.push(snapshot);
      }

      if (quote.showInverse && Number.isFinite(state.inverseRawPrice) && state.fromSymbol && state.toSymbol) {
        const snapshot = buildLegSnapshot({
          quoteId: Number(quote.id),
          direction: 'inverse',
          pricingMode: 'raw',
          chain: quote.chain,
          fromSymbol: state.toSymbol,
          toSymbol: state.fromSymbol,
          inverse: true
        }, state.inverseRawPrice);
        if (snapshot) snapshots.push(snapshot);
      }

      if (state.cexOrderbook && Number.isFinite(state.cexOrderbook.bestBidPrice) && state.fromSymbol && state.toSymbol) {
        const snapshot = buildLegSnapshot({
          quoteId: Number(quote.id),
          direction: 'forward',
          pricingMode: 'cex-bid1',
          chain: quote.chain,
          fromSymbol: state.fromSymbol,
          toSymbol: state.toSymbol,
          cexLevelLabel: 'bid1',
          cexLevelSize: state.cexOrderbook.bestBidSize
        }, state.cexOrderbook.bestBidPrice);
        if (snapshot) snapshots.push(snapshot);
      }

      if (state.cexOrderbook && Number.isFinite(state.cexOrderbook.bestAskPrice) && state.cexOrderbook.bestAskPrice > 0 && state.fromSymbol && state.toSymbol) {
        const snapshot = buildLegSnapshot({
          quoteId: Number(quote.id),
          direction: 'inverse',
          pricingMode: 'cex-ask1-inverse',
          chain: quote.chain,
          fromSymbol: state.toSymbol,
          toSymbol: state.fromSymbol,
          inverse: true,
          cexLevelLabel: 'ask1',
          cexLevelSize: state.cexOrderbook.bestAskSize
        }, 1 / state.cexOrderbook.bestAskPrice);
        if (snapshot) snapshots.push(snapshot);
      }
    }

    return snapshots;
  }

  function unavailableEvaluation(targetType) {
    return {
      available: false,
      status: 'unavailable',
      targetType,
      profitRate: null,
      profitBp: null,
      meetsTriggerCondition: false
    };
  }

  function evaluateQuoteAlert(target, quoteStateById) {
    const state = quoteStateById.get(target.quoteId);
    if (!state || typeof state !== 'object') {
      return unavailableEvaluation('quote');
    }
    const currentRate = target.direction === 'inverse'
      ? Number(state.inverseRawPrice)
      : Number(state.lastRawPrice);

    if (target.ruleKind === 'targetAbove' || target.ruleKind === 'targetBelow') {
      const currentValue = currentRate;
      if (!Number.isFinite(currentValue)) {
        return unavailableEvaluation('quote');
      }
      const meetsTriggerCondition = target.ruleKind === 'targetAbove'
        ? currentValue >= target.value
        : currentValue <= target.value;
      return {
        available: true,
        status: 'ok',
        targetType: 'quote',
        profitRate: null,
        profitBp: null,
        currentValue,
        thresholdValue: target.value,
        meetsTriggerCondition,
        legSnapshots: []
      };
    }

    const currentValue = currentRate;
    const basePrice = Number(target.basePrice);
    if (!Number.isFinite(currentValue) || !Number.isFinite(basePrice) || basePrice <= 0) {
      return unavailableEvaluation('quote');
    }

    const changePercent = ((currentValue - basePrice) / basePrice) * 100;
    const meetsTriggerCondition = target.ruleKind === 'percentUp'
      ? changePercent >= target.value
      : changePercent <= -target.value;
    return {
      available: true,
      status: 'ok',
      targetType: 'quote',
      profitRate: null,
      profitBp: null,
      currentValue,
      thresholdValue: target.value,
      basePrice,
      changePercent,
      meetsTriggerCondition,
      legSnapshots: []
    };
  }

  function evaluatePathAlert(alert, options = {}) {
    const target = alert && alert.target ? alert.target : null;
    if (!target) return unavailableEvaluation('');

    const quoteStateById = options.quoteStateById instanceof Map ? options.quoteStateById : new Map();
    if (target.type === 'quote') {
      return evaluateQuoteAlert(target, quoteStateById);
    }

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
        profitBp: toBasisPoints(resolved.profitRate),
        meetsTriggerCondition: typeof resolved.meetsTriggerCondition === 'boolean'
          ? resolved.meetsTriggerCondition
          : undefined,
        displayMessage: String(resolved.displayMessage || ''),
        alertMessage: String(resolved.alertMessage || ''),
        cycle: resolved.cycle || null,
        legSnapshots: Array.isArray(resolved.cycle && resolved.cycle.legs)
          ? resolved.cycle.legs
            .filter((leg) => Number.isFinite(Number(leg && leg.quoteId)) && Number.isFinite(leg && leg.rate))
            .map((leg) => buildLegSnapshot(leg, leg.rate))
            .filter(Boolean)
          : []
      };
    }

    let product = 1;
    const legSnapshots = [];

    for (const leg of (target.legs || [])) {
      const state = quoteStateById.get(leg.quoteId);
      const rate = getLegRate(leg, state);
      if (!Number.isFinite(rate)) {
        return unavailableEvaluation('path');
      }
      const snapshot = buildLegSnapshot(leg, rate);
      if (snapshot) {
        legSnapshots.push(snapshot);
      }
      product *= rate;
    }

    const profitRate = product - 1;
    return {
      available: true,
      status: 'ok',
      targetType: 'path',
      profitRate,
      profitBp: toBasisPoints(profitRate),
      legSnapshots
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
      currentLegSnapshots: runtimeState && Array.isArray(runtimeState.currentLegSnapshots)
        ? runtimeState.currentLegSnapshots.map((leg) => ({ ...leg }))
        : [],
      baselineLegSnapshots: runtimeState && Array.isArray(runtimeState.baselineLegSnapshots)
        ? runtimeState.baselineLegSnapshots.map((leg) => ({ ...leg }))
        : [],
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

    if (!evaluation || evaluation.available !== true) {
      next.status = 'unavailable';
      next.eligibleSince = null;
      return next;
    }

    const meetsTriggerCondition = typeof evaluation.meetsTriggerCondition === 'boolean'
      ? evaluation.meetsTriggerCondition
      : evaluation.profitBp >= toFiniteNumber(alert.thresholdBp, 0);
    if (!meetsTriggerCondition) {
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

  function buildEffectiveRuntimeAlert(alert, options = {}) {
    if (!alert || typeof alert !== 'object') return alert;
    if (!options || options.forceImmediate !== true) return alert;
    if (alert.triggerMode === 'immediate' && toNonNegativeInteger(alert.confirmDelaySec, 0) === 0) {
      return alert;
    }
    return {
      ...alert,
      triggerMode: 'immediate',
      confirmDelaySec: 0
    };
  }

  function resolvePathAlertSnapshotState(alert, previousRuntime, nextRuntime, evaluation, allLegSnapshots) {
    const currentSnapshots = Array.isArray(evaluation && evaluation.legSnapshots)
      ? evaluation.legSnapshots.map((leg) => ({ ...leg }))
      : [];
    const next = nextRuntime && typeof nextRuntime === 'object' ? nextRuntime : {};
    const previous = previousRuntime && typeof previousRuntime === 'object' ? previousRuntime : {};
    const currentAllSnapshots = Array.isArray(allLegSnapshots) ? allLegSnapshots.map((leg) => ({ ...leg })) : [];

    next.currentLegSnapshots = currentAllSnapshots;

    if (
      !alert
      || alert.enabled === false
      || !evaluation
      || evaluation.available !== true
      || (evaluation.targetType === 'quote')
      || (!Number.isFinite(evaluation.profitBp) && evaluation.meetsTriggerCondition !== true)
    ) {
      next.baselineLegSnapshots = [];
      return {
        currentSnapshots,
        baselineSnapshots: []
      };
    }

    if (alert.triggerMode === 'delayed') {
      const previousBaseline = Array.isArray(previous.baselineLegSnapshots)
        ? previous.baselineLegSnapshots.map((leg) => ({ ...leg }))
        : [];
      const previousCurrentSnapshots = Array.isArray(previous.currentLegSnapshots)
        ? previous.currentLegSnapshots.map((leg) => ({ ...leg }))
        : [];
      if (next.status === 'pending_confirm') {
        next.baselineLegSnapshots = previous && previous.status === 'pending_confirm' && previousBaseline.length
          ? previousBaseline
          : (previousCurrentSnapshots.length
              ? previousCurrentSnapshots
              : currentAllSnapshots.map((leg) => ({ ...leg })));
      } else if (next.status === 'cooldown' || next.status === 'monitoring') {
        next.baselineLegSnapshots = previousBaseline;
      } else {
        next.baselineLegSnapshots = [];
      }
      return {
        currentSnapshots,
        baselineSnapshots: Array.isArray(next.baselineLegSnapshots)
          ? next.baselineLegSnapshots.map((leg) => ({ ...leg }))
          : []
      };
    }

    next.baselineLegSnapshots = Array.isArray(previous.currentLegSnapshots)
      ? previous.currentLegSnapshots.map((leg) => ({ ...leg }))
      : [];
    return {
      currentSnapshots,
      baselineSnapshots: Array.isArray(next.baselineLegSnapshots)
        ? next.baselineLegSnapshots.map((leg) => ({ ...leg }))
        : []
    };
  }

  return {
    DEFAULT_TELEGRAM_BOT_API_BASE_URL,
    PATH_ALERT_MUTE_DURATION_MS,
    PATH_ALERT_MUTE_EXTEND_DURATION_MS,
    DEFAULT_PATH_ALERT_WEBHOOK_URL,
    DEFAULT_PATH_ALERT_THRESHOLD_BP,
    DEFAULT_PATH_ALERT_SETTINGS,
    advancePathAlertRuntime,
    buildEffectiveRuntimeAlert,
    buildAllLegSnapshots,
    buildChangedLegs,
    buildPathAlertTargetDuplicateKey,
    buildPathAlertSummaryLines,
    buildTelegramBotApiUrl,
    buildPathAlertWebhookUrl,
    countPathAlertRealLegs,
    createDismissedTargetEntry,
    createMutedPathTargetEntry,
    extendMutedPathTargetEntry,
    evaluatePathAlert,
    findDismissedPathAlert,
    findMutedPathAlert,
    findDuplicatePathAlert,
    formatMutedCountdown,
    isPathAlertConfirmDelayDisabled,
    normalizeAlertConfig,
    normalizeDismissedTarget,
    normalizeMutedPathTarget,
    normalizePathAlert,
    pruneExpiredMutedPathTargets,
    resolvePathAlertSnapshotState,
    sortTriggeredPathAlerts
  };
}));
