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

  function resolveItemsBySelectors(items, selectors) {
    const safeItems = Array.isArray(items) ? items : [];
    const safeSelectors = Array.isArray(selectors) ? selectors : [];
    const usedIndexes = new Set();
    const matches = [];

    for (const selector of safeSelectors) {
      let matchIndex = -1;
      if (Number.isInteger(selector) && selector >= 0 && selector < safeItems.length) {
        matchIndex = selector;
      } else {
        const normalizedSelector = String(selector ?? '').trim();
        if (!normalizedSelector) continue;
        matchIndex = safeItems.findIndex((item) => (
          String(item && item.name || '') === normalizedSelector
          || String(item && item.id || '') === normalizedSelector
        ));
      }
      if (matchIndex < 0 || usedIndexes.has(matchIndex)) continue;
      usedIndexes.add(matchIndex);
      matches.push(safeItems[matchIndex]);
    }

    return matches;
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

  function normalizeFixedRuleWatchItem(item) {
    if (!item || typeof item !== 'object') return null;
    if (item.type !== 'fixed-rule') return null;
    const ruleId = String(item.ruleId || '').trim();
    if (!ruleId) return null;
    const displayMinProfitBp = normalizeOptionalNumber(item.displayMinProfitBp);
    const normalized = {
      title: String(item.title || '').trim(),
      type: 'fixed-rule',
      ruleId
    };
    if (displayMinProfitBp !== null) {
      normalized.displayMinProfitBp = displayMinProfitBp;
    }
    return normalized;
  }

  function normalizeSpecialRuleWatchItem(item) {
    if (!item || typeof item !== 'object') return null;
    if (item.type !== 'special-rule') return null;
    const ruleId = String(item.ruleId || '').trim();
    if (!ruleId) return null;
    return {
      title: String(item.title || '').trim(),
      type: 'special-rule',
      ruleId
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

  function getFixedRuleWatchItems(config) {
    const items = Array.isArray(config && config.watchItems) ? config.watchItems : [];
    return items.map(normalizeFixedRuleWatchItem).filter(Boolean);
  }

  function applyFixedRuleWatchItemsToResults(fixedResults, watchItems) {
    const results = Array.isArray(fixedResults) ? fixedResults : [];
    const fixedWatchItems = Array.isArray(watchItems) ? watchItems.filter(Boolean) : [];
    if (!fixedWatchItems.length) return results;
    const resultsByRuleId = new Map(
      results
        .filter((result) => result && result.rule && result.rule.id)
        .map((result) => [result.rule.id, result])
    );
    return fixedWatchItems
      .map((item) => {
        const result = resultsByRuleId.get(item.ruleId);
        if (!result) return null;
        const rule = { ...result.rule };
        if (item.title) rule.title = item.title;
        if (Number.isFinite(Number(item.displayMinProfitBp))) {
          rule.displayMinProfitBp = Number(item.displayMinProfitBp);
        }
        return { ...result, rule };
      })
      .filter(Boolean);
  }

  function getSpecialRuleWatchItems(config) {
    const items = Array.isArray(config && config.watchItems) ? config.watchItems : [];
    return items.map(normalizeSpecialRuleWatchItem).filter(Boolean);
  }

  function applySpecialRuleWatchItemsToRules(rules, watchItems) {
    const sourceRules = Array.isArray(rules) ? rules : [];
    const specialWatchItems = Array.isArray(watchItems) ? watchItems.filter(Boolean) : [];
    if (!specialWatchItems.length) return sourceRules;
    const rulesById = new Map(
      sourceRules
        .filter((rule) => rule && rule.id)
        .map((rule) => [rule.id, rule])
    );
    return specialWatchItems
      .map((item) => rulesById.get(item.ruleId))
      .filter(Boolean);
  }

  function isWatchedRuleTarget(config, target) {
    if (!target || target.type !== 'rule') return false;
    const ruleKind = String(target.ruleKind || '').trim();
    const ruleId = String(target.ruleId || '').trim();
    if (!ruleKind || !ruleId) return false;
    if (ruleKind === 'fixed') {
      return getFixedRuleWatchItems(config).some((item) => item.ruleId === ruleId);
    }
    if (ruleKind === 'special') {
      return getSpecialRuleWatchItems(config).some((item) => item.ruleId === ruleId);
    }
    return false;
  }

  function filterWatchedRuleAlerts(alerts, config) {
    const list = Array.isArray(alerts) ? alerts : [];
    return list.filter((alert) => {
      const target = alert && alert.target;
      if (!target || target.type !== 'rule') return true;
      return isWatchedRuleTarget(config, target);
    });
  }

  function isWatchedQuoteTarget(config, target) {
    if (!target || target.type !== 'quote') return false;
    const quoteId = Number(target.quoteId);
    if (!Number.isFinite(quoteId) || quoteId <= 0) return false;
    const direction = normalizeDirection(target.direction);
    return getQuotePriceWatchItems(config).some((item) => (
      item.quoteId === quoteId
      && item.direction === direction
    ));
  }

  function filterWatchedQuoteAlerts(alerts, config) {
    const list = Array.isArray(alerts) ? alerts : [];
    return list.filter((alert) => {
      const target = alert && alert.target;
      if (!target || target.type !== 'quote') return true;
      return isWatchedQuoteTarget(config, target);
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
    resolveItemsBySelectors,
    normalizeFixedRuleWatchItem,
    normalizeQuotePriceWatchItem,
    normalizeSpecialRuleWatchItem,
    applyFixedRuleWatchItemsToResults,
    applySpecialRuleWatchItemsToRules,
    filterWatchedQuoteAlerts,
    filterWatchedRuleAlerts,
    findQuoteAlertForWatchItem,
    getFixedRuleWatchItems,
    getQuotePriceWatchItems,
    getSpecialRuleWatchItems,
    isWatchedQuoteTarget,
    isWatchedRuleTarget,
    resolveQuotePriceValue
  };
}));
