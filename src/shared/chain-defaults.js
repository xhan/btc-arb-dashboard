(function (root, factory) {
  const chainLabelConfig = typeof module !== 'undefined' && module.exports
    ? require('./chain-label-config')
    : root.ChainLabelConfig;
  const api = factory(chainLabelConfig);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.ChainDefaults = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (chainLabelConfig) {
  const CHAIN_DEFAULT_SOURCES = new Map([
    ['katana', 'LI.FI'],
    ['hemi', 'LI.FI'],
    ['starknet', 'Ekubo'],
    ['bybit', 'Bybit'],
    ['binance', 'Binance']
  ]);
  const CHAIN_DISPLAY_NAMES = chainLabelConfig.buildChainLabelMap();
  const CHAIN_FILTER_ALIASES = chainLabelConfig.buildChainFilterAliasMap();

  function normalizeChain(chain) {
    return chainLabelConfig.normalizeChainKey(chain);
  }

  function getChainDisplayName(chain) {
    const normalized = normalizeChain(chain);
    return CHAIN_DISPLAY_NAMES[normalized] || String(chain || '');
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
    return chainLabelConfig.normalizeChainSearchToken(token);
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
    buildChainSearchText: chainLabelConfig.buildChainSearchText,
    getChainSearchAliases: chainLabelConfig.getChainSearchAliases,
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
