const chainDefaults = require('../../shared/chain-defaults');

const VELORA_NETWORK_IDS = {
  ethereum: 1,
  optimism: 10,
  bsc: 56,
  polygon: 137,
  base: 8453,
  arbitrum: 42161,
  avalanche: 43114,
  linea: 59144,
  scroll: 534352,
  mantle: 5000,
  blast: 81457,
  mode: 34443
};

function createVeloraClient(deps) {
  const apiBaseUrl = deps.apiBaseUrl || 'https://api.paraswap.io/prices/';

  return {
    async getQuote(input) {
      const requestContext = input && input.requestContext ? input.requestContext : undefined;
      const configMore = requestContext && requestContext.configMore
        ? requestContext.configMore
        : (deps.getConfigMore ? await deps.getConfigMore() : {});
      const chain = chainDefaults.normalizeChain(input.chain);
      const fromToken = input.fromToken;
      const toToken = input.toToken;
      const finalAmount = Number(input.amount) || 1;
      const network = VELORA_NETWORK_IDS[chain];

      if (!network) {
        throw new Error(`Velora 不支持此链: ${chain}`);
      }

      const provider = deps.getEvmProvider(chain);
      if (!provider) {
        throw new Error(`不支持的EVM链或Provider未初始化: ${chain}`);
      }

      const [fromMeta, toMeta] = await Promise.all([
        deps.getEvmTokenMeta(chain, fromToken, provider),
        deps.getEvmTokenMeta(chain, toToken, provider)
      ]);

      const amount = deps.toRawAmount(finalAmount, fromMeta.decimals);
      const params = new URLSearchParams({
        srcToken: fromToken,
        destToken: toToken,
        amount,
        srcDecimals: String(fromMeta.decimals),
        destDecimals: String(toMeta.decimals),
        side: 'SELL',
        network: String(network),
        version: '6.2'
      });
      if (configMore.veloraPartner) {
        params.set('partner', configMore.veloraPartner);
      }
      if (Array.isArray(configMore.veloraIncludeDEXS) && configMore.veloraIncludeDEXS.length > 0) {
        params.set('includeDEXS', configMore.veloraIncludeDEXS.join(','));
      }
      params.set('otherExchangePrices', String(configMore.veloraOtherExchangePrices === true));
      const apiUrl = `${apiBaseUrl}?${params.toString()}`;

      deps.logQuoteRequest('VELORA', {
        chain,
        fromToken,
        toToken,
        amount: finalAmount,
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        url: apiUrl
      });

      const response = await deps.fetchOnce(apiUrl, {
        headers: deps.headers || {}
      }, requestContext);
      const data = await response.json();
      const destAmountRaw = data?.priceRoute?.destAmount;
      if (!destAmountRaw) {
        throw new Error(data?.error || data?.message || 'Velora 未返回有效报价');
      }

      const amountOut = deps.fromRawAmount(destAmountRaw, toMeta.decimals);
      const result = {
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        amountOut,
        raw_price: amountOut / finalAmount,
        source: 'Velora'
      };

      deps.logQuoteResult('VELORA', {
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
  VELORA_NETWORK_IDS,
  createVeloraClient
};
