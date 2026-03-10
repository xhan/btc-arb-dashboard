function createLifiClient(deps) {
  return {
    async getQuote(input) {
      const chain = String(input.chain || '').trim();
      const fromToken = input.fromToken;
      const toToken = input.toToken;
      const finalAmount = Number(input.amount) || 1;

      if (!chain || !fromToken || !toToken) {
        throw new Error('缺少 chain/fromToken/toToken 参数');
      }

      const configMore = await deps.getConfigMore();
      const chainIdMap = await deps.getLifiChainIdMap(configMore);
      const chainId = deps.resolveLifiChainId(chain, chainIdMap);
      if (!chainId) {
        throw new Error(`LI.FI 不支持此链: ${chain}`);
      }

      const [fromMeta, toMeta] = await Promise.all([
        deps.getLifiTokenMeta(chain, chainId, fromToken, configMore),
        deps.getLifiTokenMeta(chain, chainId, toToken, configMore)
      ]);

      const fromAmount = deps.toRawAmount(finalAmount, fromMeta.decimals);
      const quoteParams = new URLSearchParams({
        fromChain: String(chainId),
        toChain: String(chainId),
        fromToken,
        toToken,
        fromAmount,
        fromAddress: deps.defaultFromAddress,
        toAddress: deps.defaultFromAddress,
        slippage: deps.defaultSlippage
      });

      if (configMore.lifiIntegrator) {
        quoteParams.set('integrator', configMore.lifiIntegrator);
      }

      const quoteUrl = `${deps.apiBaseUrl}/quote?${quoteParams.toString()}`;
      deps.logQuoteRequest('LIFI', {
        chain,
        fromToken,
        toToken,
        amount: finalAmount,
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        url: quoteUrl
      });

      const response = await deps.fetchWithRetry(quoteUrl, {
        headers: deps.getLifiHeaders(configMore)
      });
      const quoteData = await response.json();
      const toAmountRaw = deps.getDisplayedToAmountRaw(quoteData);
      if (!toAmountRaw) {
        throw new Error(quoteData?.message || 'LI.FI 未返回有效报价');
      }

      const amountOut = deps.fromRawAmount(toAmountRaw, toMeta.decimals);
      const result = {
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        amountOut,
        raw_price: amountOut / finalAmount,
        source: 'LI.FI'
      };

      deps.logQuoteResult('LIFI', {
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
  createLifiClient
};
