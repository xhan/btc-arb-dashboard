function createKyberClient(deps) {
  return {
    async getQuote(input) {
      const requestContext = input && input.requestContext ? input.requestContext : undefined;
      const chain = String(input.chain || '').toLowerCase();
      const fromToken = input.fromToken;
      const toToken = input.toToken;
      const finalAmount = Number(input.amount) || 1;

      const provider = deps.getEvmProvider(chain);
      if (!provider) {
        throw new Error(`不支持的EVM链或Provider未初始化: ${chain}`);
      }

      const [fromMeta, toMeta] = await Promise.all([
        deps.getEvmTokenMeta(chain, fromToken, provider),
        deps.getEvmTokenMeta(chain, toToken, provider)
      ]);

      const amountInRaw = deps.toRawAmount(finalAmount, fromMeta.decimals);
      const apiUrl = `https://aggregator-api.kyberswap.com/${chain}/api/v1/routes?tokenIn=${fromToken}&tokenOut=${toToken}&amountIn=${amountInRaw}`;
      const configMore = requestContext && requestContext.configMore
        ? requestContext.configMore
        : await deps.getConfigMore();

      deps.logQuoteRequest('KYBER', {
        chain,
        fromToken,
        toToken,
        amount: finalAmount,
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        url: apiUrl
      });

      const response = await deps.fetchOnce(apiUrl, {
        headers: { 'X-Client-Id': configMore.kyberClientId }
      }, requestContext);
      const resultData = await response.json();

      if (resultData.code !== 0) {
        throw new Error(resultData.message || 'Kyber API返回错误');
      }

      const amountOut = deps.fromRawAmount(resultData.data.routeSummary.amountOut, toMeta.decimals);
      const result = {
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        amountOut,
        raw_price: amountOut / finalAmount,
        source: 'Kyber'
      };

      deps.logQuoteResult('KYBER', {
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
  createKyberClient
};
