function createLifiClient(deps) {
  return {
    async getQuote(input) {
      const requestContext = input && input.requestContext ? input.requestContext : undefined;
      const chain = String(input.chain || '').trim();
      const toChain = String(input.toChain || input.chain || '').trim();
      const fromToken = input.fromToken;
      const toToken = input.toToken;
      const finalAmount = Number(input.amount) || 1;

      if (!chain || !toChain || !fromToken || !toToken) {
        throw new Error('缺少 chain/toChain/fromToken/toToken 参数');
      }

      const configMore = requestContext && requestContext.configMore
        ? requestContext.configMore
        : await deps.getConfigMore();
      const chainIdMap = await deps.getLifiChainIdMap(configMore, requestContext);
      const fromChainId = deps.resolveLifiChainId(chain, chainIdMap);
      const toChainId = deps.resolveLifiChainId(toChain, chainIdMap);
      if (!fromChainId) {
        throw new Error(`LI.FI 不支持此链: ${chain}`);
      }
      if (!toChainId) {
        throw new Error(`LI.FI 不支持此链: ${toChain}`);
      }
      const isCrossChain = chain.toLowerCase() !== toChain.toLowerCase();

      const [fromMeta, toMeta] = await Promise.all([
        deps.getLifiTokenMeta(chain, fromChainId, fromToken, configMore, requestContext),
        deps.getLifiTokenMeta(toChain, toChainId, toToken, configMore, requestContext)
      ]);

      const fromAmount = deps.toRawAmount(finalAmount, fromMeta.decimals);
      const slippage = String(configMore.lifiSlippage || deps.defaultSlippage || '').trim();
      const quoteParams = new URLSearchParams({
        fromChain: String(fromChainId),
        toChain: String(toChainId),
        fromToken,
        toToken,
        fromAmount,
        fromAddress: deps.defaultFromAddress,
        toAddress: deps.defaultFromAddress,
        slippage
      });

      if (configMore.lifiIntegrator) {
        quoteParams.set('integrator', configMore.lifiIntegrator);
      }

      const quoteUrl = `${deps.apiBaseUrl}/quote?${quoteParams.toString()}`;
      deps.logQuoteRequest('LIFI', {
        chain,
        toChain,
        fromToken,
        toToken,
        amount: finalAmount,
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        url: quoteUrl
      });

      const response = await deps.fetchOnce(quoteUrl, {
        headers: deps.getLifiHeaders(configMore)
      }, requestContext);
      const quoteData = await response.json();
      const toAmountRaw = deps.getDisplayedToAmountRaw(quoteData);
      if (!toAmountRaw) {
        throw new Error(quoteData?.message || 'LI.FI 未返回有效报价');
      }

      const amountOut = deps.fromRawAmount(toAmountRaw, toMeta.decimals);
      const result = {
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        fromChain: chain,
        toChain,
        isCrossChain,
        amountOut,
        raw_price: amountOut / finalAmount,
        source: 'LI.FI'
      };

      deps.logQuoteResult('LIFI', {
        chain,
        toChain,
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
  createLifiClient
};
