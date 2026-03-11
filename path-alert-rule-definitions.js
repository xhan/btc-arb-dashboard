(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.PathAlertRuleDefinitions = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const FIXED_PATH_RULES = Object.freeze([
    {
      id: 'fixed:wbtc-eth-arb',
      title: 'WBTC ETH <-> ARB',
      base: 'cbBTC',
      quote: 'WBTC',
      categoryNames: ['WBTC监控'],
      chains: ['ethereum', 'arbitrum'],
      steps: 2
    },
    {
      id: 'fixed:gho-usdc',
      title: 'GHO <-> USDC',
      base: 'GHO',
      quote: 'USDC',
      steps: 2,
      crossChain: true
    }
  ]);

  const SPECIAL_ARB_RULES = Object.freeze([
    {
      id: 'special:dex-cex-wbtc',
      title: 'DEX <-> CEX',
      type: 'dex-cex',
      categoryName: 'WBTC监控',
      dexBase: 'cbBTC',
      dexQuote: 'WBTC',
      cexQuote: 'BTC',
      cexChains: ['Bybit', 'Binance']
    }
  ]);

  function getRuleDefinitions(kind) {
    if (kind === 'fixed') return FIXED_PATH_RULES;
    if (kind === 'special') return SPECIAL_ARB_RULES;
    return [];
  }

  function findRule(kind, ruleId) {
    return getRuleDefinitions(kind).find((rule) => rule.id === ruleId) || null;
  }

  return {
    FIXED_PATH_RULES,
    SPECIAL_ARB_RULES,
    getRuleDefinitions,
    findRule
  };
}));
