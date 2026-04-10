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
      id: 'fixed:wbtc-btc-no-arb',
      title: 'WBTC - BTC (-arb)',
      base: 'cbBTC',
      quote: 'WBTC',
      categoryNames: ['WBTC监控'],
      excludeChains: ['arbitrum'],
      steps: 2,
      crossChain: true
    },
    {
      id: 'fixed:lbtc-btc',
      title: 'LBTC - BTC',
      base: 'cbBTC',
      quote: 'LBTC',
      categoryNames: ['LBTC监控'],
      steps: 2,
      crossChain: true
    },
    {
      id: 'fixed:wbtc-lbtc',
      title: 'WBTC - LBTC',
      base: 'WBTC',
      quote: 'LBTC',
      categoryNames: ['LBTC监控'],
      steps: 2,
      crossChain: true
    },
    {
      id: 'fixed:tbtc-wbtc',
      title: 'tBTC - WBTC',
      base: 'tBTC',
      quote: 'WBTC',
      categoryNames: ['TBTC监控'],
      steps: 2,
      crossChain: true
    },
    {
      id: 'fixed:tbtc-btc',
      title: 'tBTC - BTC',
      base: 'tBTC',
      quote: 'cbBTC',
      categoryNames: ['TBTC监控'],
      steps: 2,
      crossChain: true
    },
    {
      id: 'fixed:gho-usd',
      title: 'GHO - USD',
      base: 'GHO',
      quote: 'USDC',
      categoryNames: ['USD监控'],
      steps: 2,
      crossChain: true,
      resultLimit: 2
    },
    {
      id: 'fixed:usde-usdt',
      title: 'USDE - USDT',
      base: 'USDe',
      quote: 'USDT',
      categoryNames: ['USD监控'],
      steps: 2,
      crossChain: true,
      excludeChains: ['Bybit', 'Binance'],
      resultLimit: 1
    },
    {
      id: 'fixed:susde-usdt',
      title: 'sUSDE - USDT',
      base: 'sUSDe',
      quote: 'USDT',
      categoryNames: ['USD监控'],
      steps: 2,
      chains: ['ethereum', 'plasma'],
      resultLimit: 1
    },
    {
      id: 'fixed:mseth',
      title: 'msETH',
      base: 'msETH',
      quote: 'WETH',
      categoryNames: ['ETH监控'],
      steps: 2,
      crossChain: true,
      resultLimit: 2
    },
    {
      id: 'fixed:weeth',
      title: 'weETH',
      base: 'weETH',
      quote: 'WETH',
      categoryNames: ['ETH监控'],
      steps: 2,
      crossChain: true,
      resultLimit: 2
    },
    {
      id: 'fixed:wsteth',
      title: 'wstETH',
      base: 'wstETH',
      quote: 'WETH',
      categoryNames: ['ETH监控'],
      steps: 2,
      crossChain: true,
      resultLimit: 2
    }
  ]);

  const SPECIAL_ARB_RULES = Object.freeze([
    {
      id: 'special:wbtc-bybit',
      title: 'WBTC <-> BYBIT',
      type: 'pair-bybit',
      categoryName: 'WBTC监控',
      dexBase: 'cbBTC',
      dexQuote: 'WBTC',
      cexQuote: 'BTC',
      cexChain: 'Bybit',
      displayTargets: [1, 2, 3],
      withdrawFee: 0.0001,
      depthSizeDecimals: 5,
      targetAmountDecimals: 5,
      profitDecimals: 5,
      bpDecimals: 1
    },
    {
      id: 'special:usde-bybit',
      title: 'USDe <-> BYBIT',
      type: 'pair-bybit',
      categoryName: 'USD监控',
      dexBase: 'USDT',
      dexQuote: 'USDe',
      cexQuote: 'USDT',
      cexChain: 'Bybit',
      displayTargets: [100000, 200000],
      withdrawFee: 0,
      depthSizeDecimals: 1,
      targetAmountDecimals: 1,
      profitDecimals: 1,
      bpDecimals: 1
    },
    {
      id: 'special:usdtb-bybit',
      title: 'USDtb <-> BYBIT',
      type: 'pair-bybit',
      categoryName: 'USD监控',
      dexBase: 'USDT',
      dexQuote: 'USDtb',
      cexQuote: 'USDT',
      cexChain: 'Bybit',
      displayTargets: [100000, 200000],
      withdrawFee: 0,
      depthSizeDecimals: 1,
      targetAmountDecimals: 1,
      profitDecimals: 1,
      bpDecimals: 1
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
