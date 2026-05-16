const { createCexOrderbookClient } = require('./cex-orderbook');

function createBinanceClient(deps) {
  return createCexOrderbookClient({
    apiBaseUrl: deps.apiBaseUrl || 'https://api.binance.com/api/v3/depth',
    source: 'Binance',
    feeRate: 0.001,
    fetchOnce: deps.fetchOnce,
    splitTradingPairSymbol: deps.splitTradingPairSymbol,
    buildParams(symbol) {
      return new URLSearchParams({
        symbol,
        limit: '5'
      });
    },
    assertResponseOk(data) {
      if (data && typeof data === 'object' && !Array.isArray(data) && data.code && data.msg) {
        throw new Error(data.msg);
      }
    },
    getBidLevels(data) {
      return data?.bids;
    },
    getAskLevels(data) {
      return data?.asks;
    }
  });
}

module.exports = {
  createBinanceClient
};
