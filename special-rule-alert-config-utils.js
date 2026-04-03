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

  return {
    normalizeSpecialRuleAlertConfig
  };
}));
