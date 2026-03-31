(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.QuoteAlertConfigUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const RULE_KIND_BY_LEGACY_FIELD = Object.freeze({
    percentUp: 'percentUp',
    percentDown: 'percentDown',
    targetAbove: 'targetAbove',
    targetBelow: 'targetBelow'
  });

  const LEGACY_FIELD_BY_RULE_KIND = Object.freeze({
    percentUp: 'percentUp',
    percentDown: 'percentDown',
    targetAbove: 'targetAbove',
    targetBelow: 'targetBelow'
  });

  function toSlug(ruleKind) {
    return String(ruleKind || '')
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }

  function normalizeDirection(direction) {
    return direction === 'inverse' ? 'inverse' : 'forward';
  }

  function buildQuoteAlertId(quoteId, ruleKind, direction = 'forward') {
    const normalizedQuoteId = Number.parseInt(quoteId, 10);
    const slug = toSlug(ruleKind);
    const normalizedDirection = normalizeDirection(direction);
    if (!Number.isFinite(normalizedQuoteId) || normalizedQuoteId <= 0 || !slug) return '';
    return normalizedDirection === 'inverse'
      ? `quote-alert-${normalizedQuoteId}-inverse-${slug}`
      : `quote-alert-${normalizedQuoteId}-forward-${slug}`;
  }

  function isQuoteAlertId(id) {
    return /^quote-alert-\d+-(forward|inverse)-[a-z-]+$/u.test(String(id || '').trim());
  }

  function buildQuoteAlertName(quoteLabel, ruleKind, direction = 'forward') {
    const label = String(quoteLabel || '').trim() || '报价提醒';
    const directionLabel = normalizeDirection(direction) === 'inverse' ? '反向' : '正向';
    const suffix = ruleKind === 'targetAbove'
      ? '汇率高于'
      : ruleKind === 'targetBelow'
        ? '汇率低于'
        : ruleKind === 'percentUp'
          ? '上涨提醒'
          : ruleKind === 'percentDown'
            ? '下跌提醒'
            : '提醒';
    return `${label} ${directionLabel}${suffix}`;
  }

  function buildQuoteAlertsFromLegacyConfig(options = {}) {
    const quoteId = Number.parseInt(options.quoteId, 10);
    if (!Number.isFinite(quoteId) || quoteId <= 0) return [];
    const quoteLabel = String(options.quoteLabel || '').trim();
    const direction = normalizeDirection(options.direction);
    const oldAlerts = options.oldAlerts && typeof options.oldAlerts === 'object' ? options.oldAlerts : {};
    const triggerMode = options.triggerMode === 'immediate' ? 'immediate' : 'delayed';
    const confirmDelaySec = Number.parseInt(options.confirmDelaySec, 10);
    const cooldownSec = Number.parseInt(options.cooldownSec, 10);
    const result = [];

    for (const [legacyField, ruleKind] of Object.entries(RULE_KIND_BY_LEGACY_FIELD)) {
      const value = Number(oldAlerts[legacyField]);
      if (!Number.isFinite(value)) continue;
      const target = {
        type: 'quote',
        quoteId,
        direction,
        ruleKind,
        value
      };
      if (ruleKind === 'percentUp' || ruleKind === 'percentDown') {
        const basePrice = Number(oldAlerts.basePrice);
        if (Number.isFinite(basePrice)) {
          target.basePrice = basePrice;
        }
      }
      result.push({
        id: buildQuoteAlertId(quoteId, ruleKind, direction),
        name: buildQuoteAlertName(quoteLabel, ruleKind, direction),
        enabled: true,
        triggerMode,
        confirmDelaySec: Number.isFinite(confirmDelaySec) && confirmDelaySec >= 0 ? confirmDelaySec : 13,
        cooldownSec: Number.isFinite(cooldownSec) && cooldownSec > 0 ? cooldownSec : 180,
        target
      });
    }

    return result;
  }

  function buildLegacyQuoteAlertFields(alerts) {
    const items = Array.isArray(alerts) ? alerts : [];
    const result = {
      forward: {},
      inverse: {}
    };
    for (const alert of items) {
      const target = alert && alert.target;
      if (!target || target.type !== 'quote') continue;
      const direction = normalizeDirection(target.direction);
      const legacyField = LEGACY_FIELD_BY_RULE_KIND[target.ruleKind];
      if (!legacyField) continue;
      const value = Number(target.value);
      if (!Number.isFinite(value)) continue;
      result[direction][legacyField] = value;
      if ((target.ruleKind === 'percentUp' || target.ruleKind === 'percentDown') && Number.isFinite(Number(target.basePrice))) {
        result[direction].basePrice = Number(target.basePrice);
      }
    }
    return result;
  }

  return {
    buildQuoteAlertId,
    isQuoteAlertId,
    buildQuoteAlertsFromLegacyConfig,
    buildLegacyQuoteAlertFields
  };
}));
