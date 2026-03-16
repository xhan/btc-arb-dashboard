function createCexOrderbookClient(config) {
  const apiBaseUrl = config.apiBaseUrl;
  const source = config.source;
  const feeRate = Number(config.feeRate) || 0;
  const maxDepthLevels = Number.isFinite(Number(config.maxDepthLevels)) && Number(config.maxDepthLevels) > 0
    ? Math.floor(Number(config.maxDepthLevels))
    : 10;

  function parseBookLevel(entry, side) {
    const rawPrice = Number.parseFloat(entry?.[0]);
    const size = Number.parseFloat(entry?.[1]);
    if (!Number.isFinite(rawPrice) || !Number.isFinite(size)) {
      return null;
    }

    const price = side === 'bid'
      ? rawPrice * (1 - feeRate)
      : rawPrice * (1 + feeRate);

    return { price, size };
  }

  function parseBookSide(levels, side, limit) {
    return Array.isArray(levels)
      ? levels.map((entry) => parseBookLevel(entry, side)).filter(Boolean).slice(0, limit)
      : [];
  }

  return {
    async getQuote(input) {
      const symbol = String(input.symbol || '').trim().toUpperCase();
      if (!symbol) {
        throw new Error(`缺少 ${source} symbol`);
      }

      const parsedPair = config.splitTradingPairSymbol(symbol);
      const fromSymbol = parsedPair?.fromSymbol || symbol;
      const toSymbol = parsedPair?.toSymbol || 'QUOTE';
      const params = config.buildParams(symbol);
      const apiUrl = `${apiBaseUrl}?${params.toString()}`;

      const response = await config.fetchWithRetry(apiUrl);
      const data = await response.json();

      if (typeof config.assertResponseOk === 'function') {
        config.assertResponseOk(data);
      }

      const bidLevels = config.getBidLevels(data);
      const askLevels = config.getAskLevels(data);
      const bidsTopDepth = parseBookSide(bidLevels, 'bid', maxDepthLevels);
      const asksTopDepth = parseBookSide(askLevels, 'ask', maxDepthLevels);
      const bidsTop5 = bidsTopDepth.slice(0, 5);
      const asksTop5 = asksTopDepth.slice(0, 5);
      const bestBid = bidsTop5[0];
      const bestAsk = asksTop5[0];
      if (!bestBid || !bestAsk) {
        throw new Error(`${source} 未返回有效盘口`);
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
        bidsTopDepth,
        asksTopDepth,
        feeRate,
        source
      };
    }
  };
}

module.exports = {
  createCexOrderbookClient
};
