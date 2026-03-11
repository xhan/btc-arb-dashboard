function createJupiterClient(deps) {
  const apiBaseUrl = deps.apiBaseUrl || 'https://api.jup.ag/swap/v1/quote';

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
      const configMore = deps.getConfigMore ? await deps.getConfigMore() : {};
      const jupiterApiKey = typeof configMore.jupiterApiKey === 'string' ? configMore.jupiterApiKey.trim() : '';
      if (!jupiterApiKey) {
        throw new Error('未配置 Jupiter API Key');
      }

      deps.logQuoteRequest('JUPITER', {
        chain: 'solana',
        fromToken,
        toToken,
        amount: finalAmount,
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        url: apiUrl
      });

      const response = await deps.fetchWithRetry(apiUrl, {
        headers: { 'x-api-key': jupiterApiKey }
      });
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
