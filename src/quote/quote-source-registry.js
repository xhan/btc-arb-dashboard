(function (root, factory) {
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('../shared/chain-defaults')
    : root.ChainDefaults;
  const api = factory(chainDefaults);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.QuoteSourceRegistry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (chainDefaults) {
  const KYBER_SUPPORTED_CHAINS = [
    'ethereum', 'bsc', 'arbitrum', 'polygon', 'optimism', 'avalanche',
    'base', 'linea', 'mantle', 'sonic', 'berachain', 'ronin',
    'unichain', 'hyperevm', 'plasma', 'etherlink', 'monad', 'megaeth',
    'cronos', 'zksync', 'fantom', 'polygon-zkevm', 'scroll', 'blast',
    'moonbeam', 'boba', 'gnosis', 'celo', 'mode'
  ];
  const ZEROX_SUPPORTED_CHAINS = [
    'ethereum', 'optimism', 'bsc', 'polygon', 'base', 'arbitrum',
    'avalanche', 'linea', 'scroll', 'mantle', 'blast', 'mode'
  ];

  function defineSource(source) {
    return Object.freeze({
      ...source,
      supportedChains: Object.freeze([...(source.supportedChains || [])]),
      defaultChains: Object.freeze([...(source.defaultChains || [])])
    });
  }

  const QUOTE_SOURCES = Object.freeze([
    defineSource({
      id: 'zerox', displayName: '0x', requestType: 'market', endpoint: '/api/get-0x-quote',
      providerKey: 'zerox', sourceKey: 'zerox', logSource: 'ZEROX', defaultIntervalMs: 110,
      channelAware: true, browserRequest: true, evmSelectable: true,
      errorMessage: '0x API Request Failed', supportedChains: ZEROX_SUPPORTED_CHAINS
    }),
    defineSource({
      id: 'lifi', displayName: 'LI.FI', requestType: 'market', endpoint: '/api/get-lifi-quote',
      providerKey: 'lifi', sourceKey: 'lifi', logSource: 'LIFI', defaultIntervalMs: 170,
      channelAware: true, browserRequest: true, evmSelectable: true, errorContextKind: 'cross-chain',
      errorMessage: 'LI.FI API Request Failed', includeRouteMeta: true
    }),
    defineSource({
      id: 'ekubo', displayName: 'Ekubo', requestType: 'market', endpoint: '/api/get-ekubo-quote',
      providerKey: 'ekubo', sourceKey: 'starknet', logSource: 'EKUBO', defaultIntervalMs: 1000,
      channelAware: true, browserRequest: true, defaultChains: ['starknet'],
      errorMessage: 'Ekubo API Request Failed'
    }),
    defineSource({
      id: 'jupiter', displayName: 'Jupiter', requestType: 'market', endpoint: '/api/get-jupiter-quote',
      providerKey: 'jupiter', sourceKey: 'solana', logSource: 'JUPITER', defaultIntervalMs: 3500,
      channelAware: true, browserRequest: true, defaultChains: ['solana'], errorContextKind: 'solana',
      errorMessage: 'Jupiter API Request Failed'
    }),
    defineSource({
      id: 'kyber', displayName: 'Kyber', requestType: 'market', endpoint: '/api/get-kyber-quote',
      providerKey: 'kyber', sourceKey: 'kyber', logSource: 'KYBER', defaultIntervalMs: 170,
      channelAware: true, supportedChains: KYBER_SUPPORTED_CHAINS
    }),
    defineSource({
      id: 'velora', displayName: 'Velora', requestType: 'market', endpoint: '/api/get-velora-quote',
      providerKey: 'velora', sourceKey: 'velora', logSource: 'VELORA', defaultIntervalMs: 700,
      channelAware: true, browserRequest: true, evmSelectable: true,
      errorMessage: 'Velora API Request Failed'
    }),
    defineSource({
      id: 'llamaParaSwap', displayName: 'Llama-ParaSwap', requestType: 'market',
      endpoint: '/api/get-llama-paraswap-quote', providerKey: 'llamaParaSwap',
      sourceKey: 'llamaparaswap', logSource: 'LLAMA_PARASWAP', defaultIntervalMs: 800,
      channelAware: true, browserRequest: true, evmSelectable: true,
      errorMessage: 'Llama-ParaSwap API Request Failed'
    }),
    defineSource({
      id: 'cetus', displayName: 'Cetus', requestType: 'market', endpoint: '/api/get-cetus-quote',
      providerKey: 'cetus', sourceKey: 'sui', logSource: 'CETUS', defaultIntervalMs: 500,
      defaultChains: ['sui']
    }),
    defineSource({
      id: 'bybit', displayName: 'Bybit', requestType: 'cex', endpoint: '/api/get-bybit-quote',
      providerKey: 'bybit', sourceKey: 'bybit', logSource: 'BYBIT', defaultIntervalMs: 1000,
      defaultChains: ['bybit'], chainLabel: 'Bybit'
    }),
    defineSource({
      id: 'binance', displayName: 'Binance', requestType: 'cex', endpoint: '/api/get-binance-quote',
      providerKey: 'binance', sourceKey: 'binance', logSource: 'BINANCE', defaultIntervalMs: 1000,
      defaultChains: ['binance'], chainLabel: 'Binance'
    })
  ]);

  const SOURCE_BY_ID = new Map(QUOTE_SOURCES.map((source) => [source.id, source]));
  const SOURCE_BY_DISPLAY_NAME = new Map(QUOTE_SOURCES.map((source) => [source.displayName, source]));
  const DEFAULT_INTERVAL_SOURCE_ORDER = Object.freeze([
    'kyber', 'zerox', 'velora', 'llamaparaswap', 'lifi',
    'bybit', 'binance', 'solana', 'sui', 'starknet'
  ]);

  function normalizeChain(chain) {
    if (chainDefaults && typeof chainDefaults.normalizeChain === 'function') {
      return chainDefaults.normalizeChain(chain);
    }
    return String(chain || '').trim().toLowerCase();
  }

  function getQuoteSource(id) {
    return SOURCE_BY_ID.get(String(id || '')) || null;
  }

  function getQuoteSourceByDisplayName(displayName) {
    return SOURCE_BY_DISPLAY_NAME.get(String(displayName || '')) || null;
  }

  function getRouteSources(requestType) {
    return QUOTE_SOURCES.filter((source) => source.requestType === requestType);
  }

  function getBrowserRequestSources(requestType) {
    return getRouteSources(requestType).filter((source) => source.browserRequest === true || requestType === 'cex');
  }

  function getChannelAwareSourceKeys() {
    const channelAwareKeys = new Set(
      QUOTE_SOURCES.filter((source) => source.channelAware === true).map((source) => source.sourceKey)
    );
    return DEFAULT_INTERVAL_SOURCE_ORDER.filter((sourceKey) => channelAwareKeys.has(sourceKey));
  }

  function buildDefaultIntervals() {
    const intervalBySourceKey = new Map(QUOTE_SOURCES.map((source) => [source.sourceKey, source.defaultIntervalMs]));
    return Object.fromEntries(DEFAULT_INTERVAL_SOURCE_ORDER.map((sourceKey) => [sourceKey, intervalBySourceKey.get(sourceKey)]));
  }

  function supportsChain(sourceId, chain) {
    const source = getQuoteSource(sourceId);
    return Boolean(source && source.supportedChains.includes(normalizeChain(chain)));
  }

  function assertProviderRegistry(providers) {
    const registry = providers && typeof providers === 'object' ? providers : {};
    const missingProviderKeys = QUOTE_SOURCES
      .map((source) => source.providerKey)
      .filter((providerKey) => !registry[providerKey]);
    if (missingProviderKeys.length > 0) {
      throw new Error(`Missing quote providers: ${missingProviderKeys.join(', ')}`);
    }
    return registry;
  }

  function resolveQueueSourceKeyForQuote(quote) {
    if (chainDefaults && typeof chainDefaults.isCrossChainQuote === 'function' && chainDefaults.isCrossChainQuote(quote)) {
      return getQuoteSource('lifi').sourceKey;
    }

    const chain = normalizeChain(quote && quote.chain);
    const chainDefault = QUOTE_SOURCES.find((source) => source.defaultChains.includes(chain));
    if (chainDefault) return chainDefault.sourceKey;

    const preferredSource = getQuoteSourceByDisplayName(quote && quote.preferredSource);
    if (preferredSource && preferredSource.evmSelectable === true) {
      return preferredSource.sourceKey;
    }
    return getQuoteSource('kyber').sourceKey;
  }

  return {
    QUOTE_SOURCES,
    assertProviderRegistry,
    buildDefaultIntervals,
    getBrowserRequestSources,
    getChannelAwareSourceKeys,
    getQuoteSource,
    getQuoteSourceByDisplayName,
    getRouteSources,
    resolveQueueSourceKeyForQuote,
    supportsChain
  };
});
