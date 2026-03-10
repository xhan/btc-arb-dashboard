function createJupiterClient(deps) {
  const apiBaseUrl = deps.apiBaseUrl || 'https://lite-api.jup.ag/swap/v1/quote';

  return {
    async getQuote(input) {
      const fromToken = input.fromToken;
      const toToken = input.toToken;
      const finalAmount = Number(input.amount) || 1;

      const [fromMeta, toMeta] = await Promise.all([
        deps.getSolanaTokenMeta(fromToken),
        deps.getSolanaTokenMeta(toToken)
      ]);

      const amountInRaw = deps.toRawAmount(finalAmount, fromMeta.decimals);
      const params = new URLSearchParams({
        inputMint: fromToken,
        outputMint: toToken,
        amount: amountInRaw
      });
      const apiUrl = `${apiBaseUrl}?${params.toString()}`;

      deps.logQuoteRequest('JUPITER', {
        chain: 'solana',
        fromToken,
        toToken,
        amount: finalAmount,
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        url: apiUrl
      });

      const response = await deps.fetchWithRetry(apiUrl);
      const data = await response.json();
      if (!data || !data.outAmount) {
        throw new Error(data?.error || 'Jupiter 未返回有效报价');
      }

      const amountOut = deps.fromRawAmount(data.outAmount, toMeta.decimals);
      const result = {
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        amountOut,
        raw_price: amountOut / finalAmount,
        source: 'Jupiter'
      };

      deps.logQuoteResult('JUPITER', {
        chain: 'solana',
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
  createJupiterClient
};
