const { ethers } = require('ethers');
const BN = require('bn.js');
const { createBinanceClient } = require('./providers/binance');
const { splitCompactTradingPairSymbol } = require('../quote-calculator');
const { createBybitClient } = require('./providers/bybit');
const { buildLifiChainIdMap, resolveLifiChainId } = require('./providers/lifi-utils');
const { getDisplayedToAmountRaw } = require('./providers/lifi-quote-utils');
const {
  EKUBO_STARKNET_CHAIN_ID,
  buildEkuboQuoteUrl,
  extractEkuboAmountOutRaw,
  buildEkuboQuoteResult
} = require('./providers/ekubo-utils');
const { createTokenMetaStore, fromRawAmount, toRawAmount } = require('./token-meta');
const { createCetusClient } = require('./providers/cetus');
const { createEkuboClient } = require('./providers/ekubo');
const { createJupiterClient } = require('./providers/jupiter');
const { createKyberClient } = require('./providers/kyber');
const { createLifiClient } = require('./providers/lifi');
const { createVeloraClient } = require('./providers/velora');
const { createZeroXClient } = require('./providers/zerox');

const ERC20_ABI = ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'];
const LIFI_API_BASE_URL = 'https://li.quest/v1';
const LIFI_DEFAULT_FROM_ADDRESS = '0x1111111111111111111111111111111111111111';
const LIFI_DEFAULT_SLIPPAGE = '0.005';
const LIFI_CHAIN_MAP_TTL_MS = 10 * 60 * 1000;
const EVM_TOKEN_META_MAX_ATTEMPTS = 2;

function isRetryableEvmTokenMetaError(error) {
  const code = String(error && error.code || '').toUpperCase();
  return code === 'CALL_EXCEPTION' || code === 'NETWORK_ERROR' || code === 'SERVER_ERROR' || code === 'TIMEOUT';
}

function createMarketClients(options) {
  const tokenMetaStore = createTokenMetaStore({
    cachePath: options.cachePath,
    readJsonFile: options.readJsonFile,
    writeFile: options.writeFile
  });

  let lifiChainIdMapCache = null;
  let lifiChainIdMapFetchedAt = 0;

  function getEvmProvider(chain) {
    return options.evmProviders[String(chain || '').toLowerCase()];
  }

  function getLifiHeaders(configMore = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (configMore.lifiApiKey) {
      headers['x-lifi-api-key'] = configMore.lifiApiKey;
    }
    return headers;
  }

  async function getEvmTokenMeta(chain, tokenAddress, providerOverride) {
    const provider = providerOverride || getEvmProvider(chain);
    if (!provider) {
      throw new Error(`不支持的EVM链: ${chain}`);
    }

    return tokenMetaStore.remember(chain, tokenAddress, async () => {
      let lastError = null;
      for (let attempt = 1; attempt <= EVM_TOKEN_META_MAX_ATTEMPTS; attempt += 1) {
        try {
          const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const [decimals, symbol] = await Promise.all([contract.decimals(), contract.symbol()]);
          return { decimals: Number(decimals), symbol };
        } catch (error) {
          lastError = error;
          if (attempt >= EVM_TOKEN_META_MAX_ATTEMPTS || !isRetryableEvmTokenMetaError(error)) {
            throw error;
          }
        }
      }
      throw lastError;
    });
  }

  async function getLifiChainIdMap(configMore = {}, requestContext) {
    const now = Date.now();
    if (lifiChainIdMapCache && (now - lifiChainIdMapFetchedAt) < LIFI_CHAIN_MAP_TTL_MS) {
      return lifiChainIdMapCache;
    }

    const response = await options.fetchWithRetry(`${LIFI_API_BASE_URL}/chains`, {
      headers: getLifiHeaders(configMore)
    }, requestContext);
    const data = await response.json();

    lifiChainIdMapCache = buildLifiChainIdMap(data?.chains);
    lifiChainIdMapFetchedAt = now;
    return lifiChainIdMapCache;
  }

  async function getLifiTokenMeta(chain, chainId, tokenAddress, configMore = {}, requestContext) {
    return tokenMetaStore.remember(chain, tokenAddress, async () => {
      const params = new URLSearchParams({
        chain: String(chainId),
        token: tokenAddress
      });
      const response = await options.fetchWithRetry(`${LIFI_API_BASE_URL}/token?${params.toString()}`, {
        headers: getLifiHeaders(configMore)
      }, requestContext);
      const data = await response.json();
      if (!data || !Number.isFinite(Number(data.decimals))) {
        throw new Error(`LI.FI 无法识别代币: ${tokenAddress}`);
      }
      return {
        decimals: Number(data.decimals),
        symbol: data.symbol || '???'
      };
    });
  }

  async function getEkuboTokenMeta(tokenAddress, requestContext) {
    const normalizedToken = String(tokenAddress || '').trim().toLowerCase();
    if (!normalizedToken) {
      throw new Error('缺少 Starknet 代币地址');
    }

    return tokenMetaStore.remember('starknet', normalizedToken, async () => {
      const response = await options.fetchWithRetry(
        `https://prod-api.ekubo.org/tokens/${EKUBO_STARKNET_CHAIN_ID}/${normalizedToken}`
      , undefined, requestContext);
      const data = await response.json();
      return {
        symbol: data?.symbol || '???',
        decimals: Number(data?.decimals) || 0
      };
    });
  }

  async function getSuiTokenMeta(tokenAddress) {
    return tokenMetaStore.remember('sui', tokenAddress, async () => {
      const meta = await options.suiClient.getCoinMetadata({ coinType: tokenAddress });
      if (!meta) {
        throw new Error(`无法获取SUI元数据: ${tokenAddress}`);
      }
      return {
        decimals: meta.decimals,
        symbol: meta.symbol
      };
    });
  }

  async function getSolanaTokenMeta(mint, requestContext) {
    return tokenMetaStore.remember('solana', mint, async () => {
      const response = await options.fetchWithRetry(options.solanaRpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'getAsset',
          params: { id: mint }
        })
      }, requestContext);
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      let symbol = data.result?.content?.metadata?.symbol;
      if (!symbol) symbol = data.result?.token_info?.symbol;
      if (!symbol) symbol = 'UNKNOWN';

      return {
        decimals: data.result?.token_info?.decimals || 0,
        symbol
      };
    });
  }

  const providerDeps = {
    fetchWithRetry: options.fetchWithRetry,
    fromRawAmount,
    getConfigMore: options.getConfigMore,
    getEvmProvider,
    getEvmTokenMeta,
    logQuoteRequest: options.logQuoteRequest,
    logQuoteResult: options.logQuoteResult,
    toRawAmount
  };

  return {
    loadTokenMetaCache: tokenMetaStore.load,
    getEvmTokenMeta,
    getSuiTokenMeta,
    getSolanaTokenMeta,
    getStarknetTokenMeta: getEkuboTokenMeta,
    providers: {
      kyber: createKyberClient(providerDeps),
      zerox: createZeroXClient(providerDeps),
      velora: createVeloraClient({
        apiBaseUrl: 'https://api.paraswap.io/prices/',
        fetchWithRetry: options.fetchWithRetry,
        fromRawAmount,
        getConfigMore: options.getConfigMore,
        getEvmProvider,
        getEvmTokenMeta,
        logQuoteRequest: options.logQuoteRequest,
        logQuoteResult: options.logQuoteResult,
        toRawAmount
      }),
      lifi: createLifiClient({
        apiBaseUrl: LIFI_API_BASE_URL,
        defaultFromAddress: LIFI_DEFAULT_FROM_ADDRESS,
        defaultSlippage: LIFI_DEFAULT_SLIPPAGE,
        fetchWithRetry: options.fetchWithRetry,
        fromRawAmount,
        getConfigMore: options.getConfigMore,
        getDisplayedToAmountRaw,
        getLifiChainIdMap,
        getLifiHeaders,
        getLifiTokenMeta,
        logQuoteRequest: options.logQuoteRequest,
        logQuoteResult: options.logQuoteResult,
        resolveLifiChainId,
        toRawAmount
      }),
      ekubo: createEkuboClient({
        buildEkuboQuoteResult,
        buildEkuboQuoteUrl,
        extractEkuboAmountOutRaw,
        fetchWithRetry: options.fetchWithRetry,
        getEkuboTokenMeta,
        logQuoteRequest: options.logQuoteRequest,
        logQuoteResult: options.logQuoteResult,
        toRawAmount
      }),
      cetus: createCetusClient({
        BNLib: BN,
        cetusAggregator: options.cetusAggregator,
        fromRawAmount,
        getSuiTokenMeta,
        toRawAmount
      }),
      jupiter: createJupiterClient({
        apiBaseUrl: 'https://api.jup.ag/swap/v1/quote',
        fetchWithRetry: options.fetchWithRetry,
        fromRawAmount,
        getConfigMore: options.getConfigMore,
        getSolanaTokenMeta,
        logQuoteRequest: options.logQuoteRequest,
        logQuoteResult: options.logQuoteResult,
        toRawAmount
      }),
      bybit: createBybitClient({
        apiBaseUrl: 'https://api.bybit.com/v5/market/orderbook',
        fetchWithRetry: options.fetchWithRetry,
        splitTradingPairSymbol: splitCompactTradingPairSymbol
      }),
      binance: createBinanceClient({
        apiBaseUrl: 'https://api.binance.com/api/v3/depth',
        fetchWithRetry: options.fetchWithRetry,
        splitTradingPairSymbol: splitCompactTradingPairSymbol
      })
    }
  };
}

module.exports = {
  createMarketClients
};
