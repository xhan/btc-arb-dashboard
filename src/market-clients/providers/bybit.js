const { createCexOrderbookClient } = require('./cex-orderbook');

const DEFAULT_BYBIT_ORDERBOOK_BASE_URL = 'https://api.bybitglobal.com/v5/market/orderbook';

function createBybitClient(deps = {}) {
  return createCexOrderbookClient({
    apiBaseUrl: deps.apiBaseUrl || DEFAULT_BYBIT_ORDERBOOK_BASE_URL,
    source: 'Bybit',
    feeRate: 0,
    fetchOnce: deps.fetchOnce,
    splitTradingPairSymbol: deps.splitTradingPairSymbol,
    buildParams(symbol) {
      return new URLSearchParams({
        category: 'spot',
        symbol,
        limit: '10'
      });
    },
    assertResponseOk(data) {
      if (data.retCode !== 0) {
        throw new Error(data.retMsg || 'Bybit 返回错误');
      }
    },
    getBidLevels(data) {
      return data?.result?.b;
    },
    getAskLevels(data) {
      return data?.result?.a;
    }
  });
}

module.exports = {
  createBybitClient
};
