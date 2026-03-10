function createBybitClient(deps) {
  const apiBaseUrl = deps.apiBaseUrl || 'https://api.bybit.com/v5/market/orderbook';

  function parseBookLevel(entry) {
    const price = Number.parseFloat(entry?.[0]);
    const size = Number.parseFloat(entry?.[1]);
    if (!Number.isFinite(price) || !Number.isFinite(size)) {
      return null;
    }
    return { price, size };
  }

  function parseBookSide(levels) {
    return Array.isArray(levels)
      ? levels.map(parseBookLevel).filter(Boolean).slice(0, 5)
      : [];
  }

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
        symbol,
        limit: '5'
      });
      const apiUrl = `${apiBaseUrl}?${params.toString()}`;

      const response = await deps.fetchWithRetry(apiUrl);
      const data = await response.json();
      if (data.retCode !== 0) {
        throw new Error(data.retMsg || 'Bybit 返回错误');
      }

      const bidsTop5 = parseBookSide(data?.result?.b);
      const asksTop5 = parseBookSide(data?.result?.a);
      const bestBid = bidsTop5[0];
      const bestAsk = asksTop5[0];
      if (!bestBid || !bestAsk) {
        throw new Error('Bybit 未返回有效盘口');
      }
      const midPrice = (bestBid.price + bestAsk.price) / 2;

      return {
        fromSymbol,
        toSymbol,
        amountOut: midPrice,
        raw_price: midPrice,
        bestBidPrice: bestBid.price,
        bestBidSize: bestBid.size,
        bestAskPrice: bestAsk.price,
        bestAskSize: bestAsk.size,
        bidsTop5,
        asksTop5,
        source: 'Bybit'
      };
    }
  };
}

module.exports = {
  createBybitClient
};
