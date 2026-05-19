function trimTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function createDefiLlamaProxyClient(deps) {
  return {
    async getQuote(input) {
      const requestContext = input && input.requestContext ? input.requestContext : undefined;
      const configMore = requestContext && requestContext.configMore
        ? requestContext.configMore
        : await deps.getConfigMore();
      const providerSettings = configMore.providerSettings && typeof configMore.providerSettings === 'object'
        ? configMore.providerSettings
        : configMore;
      const proxyUrl = trimTrailingSlash(
        providerSettings.llamaParaSwapProxyUrl
        || configMore.llamaParaSwapProxyUrl
        || configMore.defillamaProxyUrl
        || deps.defaultProxyUrl
      );
      if (!proxyUrl) {
        throw new Error('未配置 Llama-ParaSwap proxy URL');
      }

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
      const amountRaw = deps.toRawAmount(finalAmount, fromMeta.decimals);
      const body = {
        protocol: 'ParaSwap',
        chain,
        fromToken,
        fromDecimals: fromMeta.decimals,
        fromSymbol: fromMeta.symbol,
        toToken,
        toDecimals: toMeta.decimals,
        toSymbol: toMeta.symbol,
        amountRaw,
        slippage: String(
          providerSettings.llamaParaSwapSlippage
          || configMore.llamaParaSwapSlippage
          || configMore.defillamaProxySlippage
          || deps.defaultSlippage
          || '0.5'
        ).trim() || '0.5'
      };
      const apiUrl = `${proxyUrl}/quote`;

      deps.logQuoteRequest('LLAMA_PARASWAP', {
        chain,
        fromToken,
        toToken,
        amount: finalAmount,
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        url: apiUrl
      });

      // 不传 requestContext，避免本地 daemon 请求被 request channel 的 HTTP proxy 改写。
      const response = await deps.fetchOnce(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (data?.ok !== true || !data.amountReturned) {
        throw new Error(data?.error || data?.message || 'Llama-ParaSwap proxy 未返回有效报价');
      }

      const amountOut = deps.fromRawAmount(data.amountReturned, toMeta.decimals);
      const result = {
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        amountOut,
        raw_price: amountOut / finalAmount,
        source: 'Llama-ParaSwap',
        estimatedGas: data.estimatedGas,
        latencyMs: data.ms
      };

      deps.logQuoteResult('LLAMA_PARASWAP', {
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
  createDefiLlamaProxyClient
};
