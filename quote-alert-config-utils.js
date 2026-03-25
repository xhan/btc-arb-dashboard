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

  function buildQuoteAlertId(quoteId, ruleKind) {
    const normalizedQuoteId = Number.parseInt(quoteId, 10);
    const slug = toSlug(ruleKind);
    if (!Number.isFinite(normalizedQuoteId) || normalizedQuoteId <= 0 || !slug) return '';
    return `quote-alert-${normalizedQuoteId}-${slug}`;
  }

  function isQuoteAlertId(id) {
    return /^quote-alert-\d+-[a-z-]+$/u.test(String(id || '').trim());
  }

  function buildQuoteAlertName(quoteLabel, ruleKind) {
    const label = String(quoteLabel || '').trim() || '报价提醒';
    const suffix = ruleKind === 'targetAbove'
      ? '价格高于'
      : ruleKind === 'targetBelow'
        ? '价格低于'
        : ruleKind === 'percentUp'
          ? '上涨提醒'
          : ruleKind === 'percentDown'
            ? '下跌提醒'
            : '提醒';
    return `${label} ${suffix}`;
  }

  function buildQuoteAlertsFromLegacyConfig(options = {}) {
    const quoteId = Number.parseInt(options.quoteId, 10);
    if (!Number.isFinite(quoteId) || quoteId <= 0) return [];
    const quoteLabel = String(options.quoteLabel || '').trim();
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
        id: buildQuoteAlertId(quoteId, ruleKind),
        name: buildQuoteAlertName(quoteLabel, ruleKind),
        enabled: true,
        triggerMode,
        confirmDelaySec: Number.isFinite(confirmDelaySec) && confirmDelaySec >= 0 ? confirmDelaySec : 13,
        cooldownSec: Number.isFinite(cooldownSec) && cooldownSec > 0 ? cooldownSec : 180,
        delivery: { sound: true, log: true, webhookEnabled: false },
        target
      });
    }

    return result;
  }

  function buildLegacyQuoteAlertFields(alerts) {
    const items = Array.isArray(alerts) ? alerts : [];
    const result = {};
    for (const alert of items) {
      const target = alert && alert.target;
      if (!target || target.type !== 'quote') continue;
      const legacyField = LEGACY_FIELD_BY_RULE_KIND[target.ruleKind];
      if (!legacyField) continue;
      const value = Number(target.value);
      if (!Number.isFinite(value)) continue;
      result[legacyField] = value;
      if ((target.ruleKind === 'percentUp' || target.ruleKind === 'percentDown') && Number.isFinite(Number(target.basePrice))) {
        result.basePrice = Number(target.basePrice);
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
