(function (root, factory) {
  const config = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = config;
  }
  root.ArbPathConfig = config;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
    watchItems: [
      // fixed path watch items
      { title: 'WBTC eth <-> arb', type: 'fixed-rule', ruleId: 'fixed:wbtc-eth-arb' },
      { title: 'WBTC - BTC (-arb)', type: 'fixed-rule', ruleId: 'fixed:wbtc-btc-no-arb' },
      { title: 'LBTC - BTC', type: 'fixed-rule', ruleId: 'fixed:lbtc-btc' },
      { title: 'WBTC - LBTC', type: 'fixed-rule', ruleId: 'fixed:wbtc-lbtc' },
      { title: 'tBTC - WBTC', type: 'fixed-rule', ruleId: 'fixed:tbtc-wbtc' },
      { title: 'tBTC - BTC', type: 'fixed-rule', ruleId: 'fixed:tbtc-btc' },
      { title: 'GHO - USD', type: 'fixed-rule', ruleId: 'fixed:gho-usd' },
      { title: 'USDE - USDT', type: 'fixed-rule', ruleId: 'fixed:usde-usdt' },
      { title: 'sUSDE - USDT', type: 'fixed-rule', ruleId: 'fixed:susde-usdt' },
      { title: 'DAI - USDT', type: 'fixed-rule', ruleId: 'fixed:dai-usdt' },
      { title: 'msETH', type: 'fixed-rule', ruleId: 'fixed:mseth' },
      { title: 'weETH', type: 'fixed-rule', ruleId: 'fixed:weeth' },
      { title: 'wstETH', type: 'fixed-rule', ruleId: 'fixed:wsteth' },
      // special rule watch items
      { title: 'WBTC <-> BYBIT', type: 'special-rule', ruleId: 'special:wbtc-bybit' },
      { title: 'USDe <-> BYBIT', type: 'special-rule', ruleId: 'special:usde-bybit' },
      { title: 'USDtb <-> BYBIT', type: 'special-rule', ruleId: 'special:usdtb-bybit' },
      // ethereum cbBTC/syBTC
      { title: 'eth cbBTC/syBTC 价格高于', type: 'quote-price', quoteId: 1774206818567, direction: 'forward' },
      // bsc BTCB/syBTC
      { title: 'bsc BTCB/syBTC 价格高于', type: 'quote-price', quoteId: 1774206874519, direction: 'forward' },
      // ethereum cbBTC/BTC.b
      { title: 'eth cbBTC/BTC.b 价格高于', type: 'quote-price', quoteId: 1774600991130, direction: 'forward' },
      // ethereum tBTC/cbBTC
      { title: 'eth tBTC/cbBTC 价格高于', type: 'quote-price', quoteId: 1760021727906, direction: 'forward' },
      // bsc BTCB/SolvBTC
      { title: 'bsc BTCB/SolvBTC 价格高于', type: 'quote-price', quoteId: 1766413776518, direction: 'forward' },
      // solana cbBTC/zBTC
      { title: 'sol cbBTC/zBTC 汇率高于', type: 'quote-price', quoteId: 1775200669932, direction: 'forward' },
      // ethereum USDT/USDe
      { title: 'eth USDT/USDe 汇率高于', type: 'quote-price', quoteId: 1766416823874, direction: 'forward' },
      // arbitrum WBTC -> ethereum WBTC
      { title: 'arb WBTC -> eth WBTC 汇率高于', type: 'quote-price', quoteId: 1778597385755, direction: 'forward' }
    ]
  };
}));
