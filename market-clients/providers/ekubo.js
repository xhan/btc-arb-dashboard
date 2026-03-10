function createEkuboClient(deps) {
  return {
    async getQuote(input) {
      const chain = String(input.chain || '').trim().toLowerCase();
      const fromToken = input.fromToken;
      const toToken = input.toToken;
      const finalAmount = Number(input.amount) || 1;

      if (chain !== 'starknet') {
        throw new Error(`Ekubo 仅支持 Starknet: ${input.chain}`);
      }

      const [fromMeta, toMeta] = await Promise.all([
        deps.getEkuboTokenMeta(fromToken),
        deps.getEkuboTokenMeta(toToken)
      ]);

      const amountInRaw = deps.toRawAmount(finalAmount, fromMeta.decimals);
      const quoteUrl = deps.buildEkuboQuoteUrl({ amountInRaw, fromToken, toToken });

      deps.logQuoteRequest('EKUBO', {
        chain,
        fromToken,
        toToken,
        amount: finalAmount,
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        url: quoteUrl
      });

      const response = await deps.fetchWithRetry(quoteUrl);
      const quoteData = await response.json();
      const amountOutRaw = deps.extractEkuboAmountOutRaw(quoteData);
      const result = deps.buildEkuboQuoteResult({
        amount: finalAmount,
        amountOutRaw,
        fromMeta,
        toMeta
      });

      deps.logQuoteResult('EKUBO', {
        chain,
        fromToken,
        toToken,
        amount: finalAmount,
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        amountOut: result.amountOut,
        rawPrice: result.raw_price
      });

      return result;
    }
  };
}

module.exports = {
  createEkuboClient
};
