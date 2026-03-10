function createBybitClient(deps) {
  const apiBaseUrl = deps.apiBaseUrl || 'https://api.bybit.com/v5/market/tickers';

  return {
    async getQuote(input) {
      const symbol = String(input.symbol || '').trim().toUpperCase();
      if (!symbol) {
        throw new Error('缺少 Bybit symbol');
      }

      const parsedPair = deps.splitTradingPairSymbol(symbol);
      const fromSymbol = parsedPair?.fromSymbol || symbol;
      const toSymbol = parsedPair?.toSymbol || 'QUOTE';
      const params = new URLSearchParams({
        category: 'spot',
        symbol
      });
      const apiUrl = `${apiBaseUrl}?${params.toString()}`;

      const response = await deps.fetchWithRetry(apiUrl);
      const data = await response.json();
      if (data.retCode !== 0) {
        throw new Error(data.retMsg || 'Bybit 返回错误');
      }

      const price = Number.parseFloat(data?.result?.list?.[0]?.lastPrice);
      if (!Number.isFinite(price)) {
        throw new Error('Bybit 未返回有效价格');
      }

      return {
        fromSymbol,
        toSymbol,
        amountOut: price,
        raw_price: price,
        source: 'Bybit'
      };
    }
  };
}

module.exports = {
  createBybitClient
};
