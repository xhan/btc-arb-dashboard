(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.TokenAliasConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_TOKEN_ALIAS_GROUPS = Object.freeze({
    ETH: ['ETH', 'WETH'],
    cbBTC: ['cbBTC', 'xBTC', 'BTCB', 'BTC.b', 'BTC.B'],
    WBTC: ['WBTC', 'wBTC'],
    tBTC: ['tBTC', 'TBTC'],
    USDe: ['USDe', 'USDE'],
    USDtb: ['USDtb', 'USDTB'],
    USDT: ['USDT', 'USD₮0', 'USDT0']
  });

  return {
    DEFAULT_TOKEN_ALIAS_GROUPS
  };
});
