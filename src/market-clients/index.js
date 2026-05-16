const { ethers } = require('ethers');
const BN = require('bn.js');
const { createBinanceClient } = require('./providers/binance');
const { splitCompactTradingPairSymbol } = require('../shared/trading-pair-utils');
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
const ERC20_DECIMALS_SELECTOR = '0x313ce567';
const ERC20_SYMBOL_SELECTOR = '0x95d89b41';
const LIFI_API_BASE_URL = 'https://li.quest/v1';
const LIFI_DEFAULT_FROM_ADDRESS = '0x1111111111111111111111111111111111111111';
const LIFI_DEFAULT_SLIPPAGE = '0.0001';
const LIFI_CHAIN_MAP_TTL_MS = 10 * 60 * 1000;
const EVM_TOKEN_META_MAX_ATTEMPTS = 2;
const OFFICIAL_EVM_TOKEN_LIST_FALLBACKS = {
  monad: {
    chainId: 143,
    url: 'https://raw.githubusercontent.com/monad-crypto/token-list/main/tokenlist-mainnet.json'
  }
};

function isRetryableEvmTokenMetaError(error) {
  const code = String(error && error.code || '').toUpperCase();
  return code === 'CALL_EXCEPTION' || code === 'NETWORK_ERROR' || code === 'SERVER_ERROR' || code === 'TIMEOUT';
}

function decodeRawUint8Result(rawValue) {
  const [decoded] = ethers.AbiCoder.defaultAbiCoder().decode(['uint8'], rawValue);
  return Number(decoded);
}

function decodeRawStringResult(rawValue) {
  try {
    const [decoded] = ethers.AbiCoder.defaultAbiCoder().decode(['string'], rawValue);
    return String(decoded || '').trim();
  } catch (stringError) {
    const [bytes32Value] = ethers.AbiCoder.defaultAbiCoder().decode(['bytes32'], rawValue);
    return ethers.decodeBytes32String(bytes32Value).trim();
  }
}

function normalizeAddress(value) {
  const raw = String(value || '').trim();
  return /^0x[0-9a-fA-F]+$/.test(raw) ? raw.toLowerCase() : raw;
}

function createMarketClients(options) {
  const tokenMetaStore = createTokenMetaStore({
    cachePath: options.cachePath,
    ensureDir: options.ensureDir,
    readJsonFile: options.readJsonFile,
    writeFile: options.writeFile
  });
  const officialTokenListCache = new Map();

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

  async function callEvmTokenField(provider, tokenAddress, selector, decoder, label) {
    const rawValue = await provider.call({
      to: tokenAddress,
      data: selector
    });
    const decodedValue = decoder(rawValue);

    if (label === 'decimals') {
      if (!Number.isFinite(decodedValue)) {
        throw new Error(`无法解析代币 ${tokenAddress} 的 decimals`);
      }
      return decodedValue;
    }

    if (!decodedValue) {
      throw new Error(`无法解析代币 ${tokenAddress} 的 ${label}`);
    }
    return decodedValue;
  }

  async function readEvmTokenMetaField({ readPrimary, readFallback }) {
    let lastError = null;

    for (let attempt = 1; attempt <= EVM_TOKEN_META_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await readPrimary();
      } catch (error) {
        lastError = error;
        if (attempt >= EVM_TOKEN_META_MAX_ATTEMPTS || !isRetryableEvmTokenMetaError(error)) {
          break;
        }
      }
    }

    if (lastError && isRetryableEvmTokenMetaError(lastError)) {
      return readFallback();
    }
    throw lastError;
  }

  async function getOfficialTokenListFallback(chain, requestContext) {
    const fallback = OFFICIAL_EVM_TOKEN_LIST_FALLBACKS[String(chain || '').toLowerCase()];
    if (!fallback) {
      return null;
    }

    if (officialTokenListCache.has(fallback.url)) {
      return officialTokenListCache.get(fallback.url);
    }

    const response = await options.fetchOnce(fallback.url, undefined, requestContext);
    const tokenList = await response.json();
    officialTokenListCache.set(fallback.url, tokenList);
    return tokenList;
  }

  async function getOfficialEvmTokenMetaFallback(chain, tokenAddress, requestContext) {
    const fallback = OFFICIAL_EVM_TOKEN_LIST_FALLBACKS[String(chain || '').toLowerCase()];
    if (!fallback) {
      return null;
    }

    const tokenList = await getOfficialTokenListFallback(chain, requestContext);
    const normalizedToken = normalizeAddress(tokenAddress);
    const match = Array.isArray(tokenList?.tokens)
      ? tokenList.tokens.find((token) => {
        if (!token || !Number.isFinite(Number(token.decimals))) {
          return false;
        }
        if (Number(token.chainId) !== fallback.chainId) {
          return false;
        }
        return normalizeAddress(token.address) === normalizedToken;
      })
      : null;

    if (!match) {
      return null;
    }

    return {
      decimals: Number(match.decimals),
      symbol: String(match.symbol || '').trim() || '???'
    };
  }

  async function getEvmTokenMeta(chain, tokenAddress, providerOverride, requestContext) {
    const provider = providerOverride || getEvmProvider(chain);
    if (!provider) {
      throw new Error(`不支持的EVM链: ${chain}`);
    }

    return tokenMetaStore.remember(chain, tokenAddress, async () => {
      try {
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const decimals = await readEvmTokenMetaField({
          readPrimary: () => contract.decimals(),
          readFallback: () => callEvmTokenField(
            provider,
            tokenAddress,
            ERC20_DECIMALS_SELECTOR,
            decodeRawUint8Result,
            'decimals'
          )
        });
        const symbol = await readEvmTokenMetaField({
          readPrimary: () => contract.symbol(),
          readFallback: () => callEvmTokenField(
            provider,
            tokenAddress,
            ERC20_SYMBOL_SELECTOR,
            decodeRawStringResult,
            'symbol'
          )
        });
        return { decimals: Number(decimals), symbol };
      } catch (error) {
        try {
          const fallbackMeta = await getOfficialEvmTokenMetaFallback(chain, tokenAddress, requestContext);
          if (fallbackMeta) {
            return fallbackMeta;
          }
        } catch {}
        throw error;
      }
    });
  }

  async function getLifiChainIdMap(configMore = {}, requestContext) {
    const now = Date.now();
    if (lifiChainIdMapCache && (now - lifiChainIdMapFetchedAt) < LIFI_CHAIN_MAP_TTL_MS) {
      return lifiChainIdMapCache;
    }

    const response = await options.fetchOnce(`${LIFI_API_BASE_URL}/chains`, {
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
      const response = await options.fetchOnce(`${LIFI_API_BASE_URL}/token?${params.toString()}`, {
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
      const response = await options.fetchOnce(
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
      const response = await options.fetchOnce(options.solanaRpc, {
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
    fetchOnce: options.fetchOnce,
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
        fetchOnce: options.fetchOnce,
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
        fetchOnce: options.fetchOnce,
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
        fetchOnce: options.fetchOnce,
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
        fetchOnce: options.fetchOnce,
        fromRawAmount,
        getConfigMore: options.getConfigMore,
        getSolanaTokenMeta,
        logQuoteRequest: options.logQuoteRequest,
        logQuoteResult: options.logQuoteResult,
        toRawAmount
      }),
      bybit: createBybitClient({
        apiBaseUrl: 'https://api.bybit.com/v5/market/orderbook',
        fetchOnce: options.fetchOnce,
        splitTradingPairSymbol: splitCompactTradingPairSymbol
      }),
      binance: createBinanceClient({
        apiBaseUrl: 'https://api.binance.com/api/v3/depth',
        fetchOnce: options.fetchOnce,
        splitTradingPairSymbol: splitCompactTradingPairSymbol
      })
    }
  };
}

module.exports = {
  createMarketClients
};
