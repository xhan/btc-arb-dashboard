(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SpecialRuleAlertConfigUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function toNonNegativeNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function buildSpecialRuleAlertId(ruleId) {
    const normalizedRuleId = String(ruleId || '')
      .trim()
      .replace(/[^a-z0-9]+/giu, '-')
      .replace(/^-+|-+$/gu, '')
      .toLowerCase();
    return `rule-alert-${normalizedRuleId}`;
  }

  function normalizeSpecialRuleAlertConfig(input, fallback = null) {
    const source = input && typeof input === 'object' ? input : {};
    const normalized = {};
    const fallbackConfig = fallback && typeof fallback === 'object' ? fallback : {};

    const minNetProfit = toNonNegativeNumber(source.minNetProfit, toNonNegativeNumber(fallbackConfig.minNetProfit, null));
    if (Number.isFinite(minNetProfit)) {
      normalized.minNetProfit = minNetProfit;
    }

    const minNetProfitBp = toNonNegativeNumber(source.minNetProfitBp, toNonNegativeNumber(fallbackConfig.minNetProfitBp, null));
    if (Number.isFinite(minNetProfitBp)) {
      normalized.minNetProfitBp = minNetProfitBp;
    }

    return normalized;
  }

  function buildSpecialRuleAlertDefaults(rule, settings = {}) {
    const safeRule = rule && typeof rule === 'object' ? rule : {};
    return {
      id: buildSpecialRuleAlertId(safeRule.id),
      name: String(safeRule.title || safeRule.id || '特殊规则'),
      enabled: true,
      thresholdBp: 0,
      triggerMode: 'delayed',
      confirmDelaySec: Number.isFinite(Number(safeRule.alertConfirmDelaySec))
        ? Number(safeRule.alertConfirmDelaySec)
        : 10,
      cooldownSec: Number.isFinite(Number(safeRule.alertCooldownSec))
        ? Number(safeRule.alertCooldownSec)
        : Number(settings.defaultCooldownSec || 180),
      target: {
        type: 'rule',
        ruleKind: 'special',
        ruleId: String(safeRule.id || '')
      },
      specialRuleConfig: normalizeSpecialRuleAlertConfig(safeRule)
    };
  }

  function mergeSpecialRuleAlerts(alertConfig, rules = []) {
    const normalizedConfig = alertConfig && typeof alertConfig === 'object'
      ? alertConfig
      : { version: 1, settings: {}, alerts: [], dismissedTargets: [] };
    const alerts = Array.isArray(normalizedConfig.alerts) ? [...normalizedConfig.alerts] : [];
    const nextAlerts = alerts.map((alert) => {
      if (!alert || !alert.target || alert.target.type !== 'rule' || alert.target.ruleKind !== 'special') {
        return alert;
      }
      const rule = rules.find((item) => item && item.id === alert.target.ruleId) || null;
      const fallbackConfig = rule ? normalizeSpecialRuleAlertConfig(rule) : null;
      return {
        ...alert,
        name: String(alert.name || (rule && rule.title) || alert.target.ruleId || '特殊规则'),
        specialRuleConfig: normalizeSpecialRuleAlertConfig(alert.specialRuleConfig, fallbackConfig)
      };
    });

    const existingRuleIds = new Set(
      nextAlerts
        .filter((alert) => alert && alert.target && alert.target.type === 'rule' && alert.target.ruleKind === 'special')
        .map((alert) => String(alert.target.ruleId || ''))
        .filter(Boolean)
    );

    for (const rule of rules) {
      if (!rule || !rule.id || existingRuleIds.has(rule.id)) continue;
      nextAlerts.push(buildSpecialRuleAlertDefaults(rule, normalizedConfig.settings || {}));
    }

    return {
      ...normalizedConfig,
      alerts: nextAlerts
    };
  }

  return {
    buildSpecialRuleAlertId,
    normalizeSpecialRuleAlertConfig,
    mergeSpecialRuleAlerts
  };
}));
