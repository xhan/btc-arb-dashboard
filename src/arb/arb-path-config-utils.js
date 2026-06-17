(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbPathConfigUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeDirection(value) {
    return value === 'inverse' ? 'inverse' : 'forward';
  }

  function normalizeQuotePriceWatchItem(item) {
    if (!item || typeof item !== 'object') return null;
    if (item.type !== 'quote-price') return null;
    const quoteId = Number(item.quoteId);
    if (!Number.isFinite(quoteId) || quoteId <= 0) return null;
    const title = String(item.title || '').trim();
    if (!title) return null;
    return {
      title,
      type: 'quote-price',
      quoteId,
      direction: normalizeDirection(item.direction)
    };
  }

  function normalizeOptionalNumber(value) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }

  function normalizeQuoteWatchAlert(alert) {
    if (!alert || typeof alert !== 'object') return null;
    const target = alert.target || {};
    if (target.type !== 'quote') return null;
    const quoteId = normalizeOptionalNumber(target.quoteId);
    if (!quoteId || quoteId <= 0) return null;
    const ruleKind = ['targetAbove', 'targetBelow', 'percentUp', 'percentDown'].includes(target.ruleKind)
      ? target.ruleKind
      : '';
    if (!ruleKind) return null;
    const value = normalizeOptionalNumber(target.value);
    const normalized = {
      enabled: alert.enabled !== false,
      direction: normalizeDirection(target.direction),
      quoteId,
      ruleKind
    };
    const id = String(alert.id || '').trim();
    const name = String(alert.name || '').trim();
    const triggerMode = ['immediate', 'delayed'].includes(alert.triggerMode) ? alert.triggerMode : '';
    const confirmDelaySec = normalizeOptionalNumber(alert.confirmDelaySec);
    const cooldownSec = normalizeOptionalNumber(alert.cooldownSec);
    const basePrice = normalizeOptionalNumber(target.basePrice);
    if (id) normalized.id = id;
    if (name) normalized.name = name;
    if (triggerMode) normalized.triggerMode = triggerMode;
    if (confirmDelaySec !== null) normalized.confirmDelaySec = confirmDelaySec;
    if (cooldownSec !== null) normalized.cooldownSec = cooldownSec;
    if (value !== null) normalized.value = value;
    if (basePrice !== null) normalized.basePrice = basePrice;
    return normalized;
  }

  function buildWatchAlertMeta(alert) {
    if (!alert) return null;
    const { quoteId, direction, ...meta } = alert;
    return meta;
  }

  function findQuoteAlertForWatchItem(alertConfig, watchItem) {
    const alerts = Array.isArray(alertConfig && alertConfig.alerts) ? alertConfig.alerts : [];
    const matches = alerts
      .map(normalizeQuoteWatchAlert)
      .filter((alert) => (
        alert
        && alert.quoteId === watchItem.quoteId
        && alert.direction === watchItem.direction
      ));
    if (!matches.length) return null;
    return buildWatchAlertMeta(matches.find((alert) => alert.enabled) || matches[0]);
  }

  function getQuotePriceWatchItems(config, options = {}) {
    const items = Array.isArray(config && config.watchItems) ? config.watchItems : [];
    return items
      .map(normalizeQuotePriceWatchItem)
      .filter(Boolean)
      .map((item) => {
        const alert = findQuoteAlertForWatchItem(options.alertConfig, item);
        return alert ? { ...item, alert } : item;
      });
  }

  function resolveQuotePriceValue(item, quoteState) {
    if (!item || !quoteState || typeof quoteState !== 'object') return null;
    const value = item.direction === 'inverse'
      ? Number(quoteState.inverseRawPrice)
      : Number(quoteState.lastRawPrice);
    return Number.isFinite(value) ? value : null;
  }

  return {
    normalizeDirection,
    normalizeQuotePriceWatchItem,
    findQuoteAlertForWatchItem,
    getQuotePriceWatchItems,
    resolveQuotePriceValue
  };
}));
