function createCetusClient(deps) {
  return {
    async getQuote(input) {
      const fromToken = input.fromToken;
      const toToken = input.toToken;
      const finalAmount = Number(input.amount) || 1;

      const [fromMeta, toMeta] = await Promise.all([
        deps.getSuiTokenMeta(fromToken),
        deps.getSuiTokenMeta(toToken)
      ]);

      const amountInRaw = deps.toRawAmount(finalAmount, fromMeta.decimals);
      const amountIn = new deps.BNLib(amountInRaw);
      const quoteData = await deps.cetusAggregator.findRouters({
        from: fromToken,
        target: toToken,
        amount: amountIn,
        byAmountIn: true
      });

      if (quoteData.error) {
        throw new Error(quoteData.error.msg);
      }

      const amountOut = deps.fromRawAmount(quoteData.amountOut.toString(), toMeta.decimals);
      return {
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        amountOut,
        raw_price: amountOut / finalAmount,
        source: 'Cetus'
      };
    }
  };
}

module.exports = {
  createCetusClient
};
