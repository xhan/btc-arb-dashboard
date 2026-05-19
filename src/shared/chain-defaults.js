(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.ChainDefaults = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CHAIN_DEFAULT_SOURCES = new Map([
    ['katana', 'LI.FI'],
    ['hemi', 'LI.FI'],
    ['starknet', 'Ekubo'],
    ['bybit', 'Bybit'],
    ['binance', 'Binance']
  ]);
  const CHAIN_DISPLAY_NAMES = Object.freeze({
    ethereum: 'ETH',
    solana: 'SOL',
    sui: 'SUI',
    polygon: 'Polygon',
    arbitrum: 'Arbitrum',
    optimism: 'Optimism',
    bsc: 'BSC',
    avalanche: 'Avalanche',
    base: 'Base',
    Bybit: 'Bybit',
    bybit: 'Bybit',
    Binance: 'Binance',
    binance: 'Binance',
    linea: 'Linea',
    mantle: 'Mantle',
    sonic: 'Sonic',
    berachain: 'Berachain',
    ronin: 'Ronin',
    unichain: 'Unichain',
    hyperevm: 'HyperEVM',
    plasma: 'Plasma',
    scroll: 'Scroll',
    blast: 'Blast',
    mode: 'Mode',
    monad: 'Monad',
    etherlink: 'Etherlink',
    fantom: 'Fantom',
    cronos: 'Cronos',
    moonbeam: 'Moonbeam',
    boba: 'Boba',
    gnosis: 'Gnosis',
    celo: 'Celo',
    megaeth: 'MegaETH',
    hemi: 'Hemi',
    katana: 'Katana',
    starknet: 'Starknet'
  });
  const CHAIN_FILTER_ALIASES = Object.freeze({
    ETH: 'ethereum',
    SOL: 'solana',
    SUI: 'sui',
    POLY: 'polygon',
    MATIC: 'polygon',
    ARB: 'arbitrum',
    OP: 'optimism',
    BSC: 'bsc',
    BNB: 'bsc',
    AVAX: 'avalanche',
    BASE: 'base',
    LINEA: 'linea',
    MNT: 'mantle',
    MANTLE: 'mantle',
    SONIC: 'sonic',
    BERA: 'berachain',
    RON: 'ronin',
    UNI: 'unichain',
    HYPE: 'hyperevm',
    SCROLL: 'scroll',
    BLAST: 'blast',
    MODE: 'mode',
    MONAD: 'monad',
    FTM: 'fantom',
    CRO: 'cronos',
    GLMR: 'moonbeam',
    BOBA: 'boba',
    GNO: 'gnosis',
    CELO: 'celo',
    MEGA: 'megaeth',
    MEGAETH: 'megaeth'
  });

  function normalizeChain(chain) {
    return typeof chain === 'string' ? chain.trim().toLowerCase() : '';
  }

  function getChainDisplayName(chain) {
    const raw = String(chain || '');
    if (Object.prototype.hasOwnProperty.call(CHAIN_DISPLAY_NAMES, raw)) {
      return CHAIN_DISPLAY_NAMES[raw];
    }
    const normalized = normalizeChain(chain);
    return CHAIN_DISPLAY_NAMES[normalized] || raw;
  }

  function buildQuoteChainDisplayName(quote) {
    if (!quote) return '';
    const fromChain = normalizeChain(quote.chain);
    const toChain = normalizeChain(quote.toChain);
    const fromLabel = getChainDisplayName(quote.chain);
    if (!fromChain || !toChain || fromChain === toChain) return fromLabel;
    return `${fromLabel} -> ${getChainDisplayName(quote.toChain)}`;
  }

  function normalizeChainFilterToken(chainToken) {
    const token = String(chainToken || '').trim();
    if (!token) return '';
    if (Object.prototype.hasOwnProperty.call(CHAIN_DISPLAY_NAMES, token)) {
      return token;
    }

    for (const [chainKey, displayName] of Object.entries(CHAIN_DISPLAY_NAMES)) {
      if (displayName === token) {
        return chainKey;
      }
    }

    return CHAIN_FILTER_ALIASES[token.toUpperCase()] || '';
  }

  function isCrossChainQuote(quote) {
    const fromChain = normalizeChain(quote && quote.chain);
    const toChain = normalizeChain(quote && quote.toChain);
    return Boolean(fromChain && toChain && fromChain !== toChain);
  }

  function isCexOrderbookChain(chain) {
    const normalized = normalizeChain(chain);
    return normalized === 'bybit' || normalized === 'binance';
  }

  function isEvmChain(chain) {
    const normalized = normalizeChain(chain);
    const nonEvm = new Set(['solana', 'sui', 'starknet', 'bybit', 'binance']);
    return Boolean(normalized && !nonEvm.has(normalized));
  }

  function getDefaultSourceForChain(chain) {
    const normalized = normalizeChain(chain);
    const defaultSource = CHAIN_DEFAULT_SOURCES.get(normalized);
    if (defaultSource) return defaultSource;
    return 'Kyber';
  }

  function buildQuoteStrategy(quote) {
    if (isCrossChainQuote(quote)) return ['LI.FI'];
    const chain = quote && quote.chain;
    const normalizedChain = normalizeChain(chain);
    if (isEvmChain(chain)) {
      const preferredSource = quote && quote.preferredSource || 'Kyber';
      if (preferredSource === 'Auto') return ['Kyber', '0x', 'Kyber'];
      if (preferredSource === '0x') return ['0x', '0x'];
      if (preferredSource === 'Velora') return ['Velora', 'Velora'];
      if (preferredSource === 'Llama-ParaSwap') return ['Llama-ParaSwap', 'Llama-ParaSwap'];
      if (preferredSource === 'LI.FI') return ['LI.FI', 'LI.FI'];
      return ['Kyber', 'Kyber'];
    }
    if (normalizedChain === 'sui') return ['Cetus'];
    if (normalizedChain === 'solana') return ['Jupiter'];
    if (normalizedChain === 'starknet') return ['Ekubo'];
    if (isCexOrderbookChain(chain)) {
      return [normalizedChain === 'binance' ? 'Binance' : 'Bybit'];
    }
    return [];
  }

  return {
    CHAIN_DISPLAY_NAMES,
    CHAIN_FILTER_ALIASES,
    normalizeChain,
    normalizeChainFilterToken,
    getChainDisplayName,
    buildQuoteChainDisplayName,
    isCrossChainQuote,
    isCexOrderbookChain,
    isEvmChain,
    buildQuoteStrategy,
    getDefaultSourceForChain
  };
});
