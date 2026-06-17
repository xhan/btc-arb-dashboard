const chainDefaults = require('../../shared/chain-defaults');

function createKyberClient(deps) {
  function parseExcludedSources(value) {
    const rawItems = Array.isArray(value)
      ? value
      : String(value || '').split(/[\s,]+/);
    const seen = new Set();
    const sources = [];

    rawItems.forEach((item) => {
      const source = String(item || '').trim();
      if (!source || seen.has(source)) return;
      seen.add(source);
      sources.push(source);
    });

    return sources;
  }

  function buildKyberRouteUrl(input) {
    const params = new URLSearchParams({
      tokenIn: input.fromToken,
      tokenOut: input.toToken,
      amountIn: input.amountInRaw
    });
    const excludedSources = parseExcludedSources(input.excludedSources);

    if (excludedSources.length > 0) {
      params.set('excludedSources', excludedSources.join(','));
    }

    return `https://aggregator-api.kyberswap.com/${input.chain}/api/v1/routes?${params.toString()}`;
  }

  return {
    async getQuote(input) {
      const requestContext = input && input.requestContext ? input.requestContext : undefined;
      const chain = chainDefaults.normalizeChain(input.chain);
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
      const apiUrl = buildKyberRouteUrl({
        chain,
        fromToken,
        toToken,
        amountInRaw,
        excludedSources: input && input.kyberExcludedSources
      });
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
