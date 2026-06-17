(function (root, factory) {
  const config = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = config;
  }
  root.ArbPathConfig = config;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
    watchItems: [
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
