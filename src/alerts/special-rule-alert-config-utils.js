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

  function normalizeSpecialRuleAlertConfig(input, fallback = null) {
    const source = input && typeof input === 'object' ? input : {};
    const fallbackConfig = fallback && typeof fallback === 'object' ? fallback : {};
    const normalized = {};

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

  function evaluateSpecialRuleTrigger(stats, config) {
    const sourceStats = stats && typeof stats === 'object' ? stats : {};
    const primary = sourceStats.primary && typeof sourceStats.primary === 'object'
      ? sourceStats.primary
      : {};
    const targetResults = Array.isArray(sourceStats.targetResults) ? sourceStats.targetResults : [];
    const sourceConfig = config && typeof config === 'object' ? config : {};

    const minNetProfit = toNonNegativeNumber(sourceConfig.minNetProfit, null);
    const minNetProfitBp = toNonNegativeNumber(sourceConfig.minNetProfitBp, null);
    const triggerReference = targetResults.length ? targetResults[0] : primary;
    const netProfit = Number(triggerReference && (triggerReference.profit != null ? triggerReference.profit : triggerReference.netProfit));
    const netProfitBp = Number(triggerReference && (triggerReference.profitBp != null ? triggerReference.profitBp : triggerReference.netProfitBp));

    const meetsTriggerCondition = Number.isFinite(netProfit)
      && Number.isFinite(minNetProfit)
      && Number.isFinite(netProfitBp)
      && Number.isFinite(minNetProfitBp)
      && netProfit > minNetProfit
      && netProfitBp > minNetProfitBp;

    return {
      meetsTriggerCondition,
      netProfit,
      minNetProfit,
      netProfitBp,
      minNetProfitBp
    };
  }

  return {
    normalizeSpecialRuleAlertConfig,
    evaluateSpecialRuleTrigger
  };
}));
