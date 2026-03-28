const ZEROX_API_KEY = '7e3d32e8-2cf8-413a-9cbe-24b8b0779588';
const ZEROX_CHAIN_IDS = {
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

function createZeroXClient(deps) {
  return {
    async getQuote(input) {
      const requestContext = input && input.requestContext ? input.requestContext : undefined;
      const chain = String(input.chain || '').toLowerCase();
      const fromToken = input.fromToken;
      const toToken = input.toToken;
      const finalAmount = Number(input.amount) || 1;
      const chainId = ZEROX_CHAIN_IDS[chain];

      if (!chainId) {
        throw new Error(`0x 不支持此链: ${chain}`);
      }

      const provider = deps.getEvmProvider(chain);
      if (!provider) {
        throw new Error(`不支持的EVM链或Provider未初始化: ${chain}`);
      }

      const [fromMeta, toMeta] = await Promise.all([
        deps.getEvmTokenMeta(chain, fromToken, provider),
        deps.getEvmTokenMeta(chain, toToken, provider)
      ]);

      const sellAmount = deps.toRawAmount(finalAmount, fromMeta.decimals);
      const params = new URLSearchParams({
        chainId: String(chainId),
        sellToken: fromToken,
        buyToken: toToken,
        sellAmount
      });
      const apiUrl = `https://api.0x.org/swap/permit2/price?${params.toString()}`;

      deps.logQuoteRequest('ZEROX', {
        chain,
        fromToken,
        toToken,
        amount: finalAmount,
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        url: apiUrl
      });

      const response = await deps.fetchWithRetry(apiUrl, {
        headers: {
          '0x-api-key': ZEROX_API_KEY,
          '0x-version': 'v2',
          'Content-Type': 'application/json'
        }
      }, requestContext);
      const resultData = await response.json();

      if (resultData.liquidityAvailable === false) {
        throw new Error('流动性不足 (0x: Liquidity Unavailable)');
      }

      let destAmountRaw = BigInt(resultData.buyAmount);
      if (!destAmountRaw) {
        throw new Error('0x未返回有效购买数量');
      }

      if (resultData.fees && resultData.fees.zeroExFee) {
        const fee = resultData.fees.zeroExFee;
        const feeAmount = BigInt(fee.amount);
        const feeTokenLower = String(fee.token || '').toLowerCase();

        if (feeTokenLower === String(toToken || '').toLowerCase()) {
          destAmountRaw += feeAmount;
        } else if (feeTokenLower === String(fromToken || '').toLowerCase()) {
          const sellAmountBigInt = BigInt(sellAmount);
          if (sellAmountBigInt > feeAmount) {
            const effectiveSellAmount = sellAmountBigInt - feeAmount;
            destAmountRaw = (destAmountRaw * sellAmountBigInt) / effectiveSellAmount;
          }
        }
      }

      const amountOut = deps.fromRawAmount(destAmountRaw.toString(), toMeta.decimals);
      const result = {
        fromSymbol: fromMeta.symbol,
        toSymbol: toMeta.symbol,
        amountOut,
        raw_price: amountOut / finalAmount,
        source: '0x'
      };

      deps.logQuoteResult('ZEROX', {
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
  ZEROX_API_KEY,
  ZEROX_CHAIN_IDS,
  createZeroXClient
};
