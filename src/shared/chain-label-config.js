(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.ChainLabelConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CHAIN_LABEL_CONFIG = Object.freeze({
    ethereum: { label: 'eth', aliases: ['ethereum', 'eth'] },
    solana: { label: 'sol', aliases: ['solana', 'sol'] },
    sui: { label: 'sui', aliases: ['sui'] },
    polygon: { label: 'poly', aliases: ['polygon', 'poly', 'matic'] },
    arbitrum: { label: 'arb', aliases: ['arbitrum', 'arb'] },
    optimism: { label: 'op', aliases: ['optimism', 'op'] },
    bsc: { label: 'bsc', aliases: ['bsc', 'bnb'] },
    avalanche: { label: 'avax', aliases: ['avalanche', 'avax'] },
    base: { label: 'base', aliases: ['base'] },
    linea: { label: 'linea', aliases: ['linea'] },
    mantle: { label: 'mnt', aliases: ['mantle', 'mnt'] },
    sonic: { label: 'sonic', aliases: ['sonic'] },
    berachain: { label: 'bera', aliases: ['berachain', 'bera'] },
    ronin: { label: 'ronin', aliases: ['ronin', 'ron'] },
    unichain: { label: 'uni', aliases: ['unichain', 'uni'] },
    hyperevm: { label: 'hype', aliases: ['hyperevm', 'hype'] },
    plasma: { label: 'plasma', aliases: ['plasma'] },
    scroll: { label: 'scroll', aliases: ['scroll'] },
    blast: { label: 'blast', aliases: ['blast'] },
    mode: { label: 'mode', aliases: ['mode'] },
    monad: { label: 'monad', aliases: ['monad'] },
    etherlink: { label: 'etherlink', aliases: ['etherlink'] },
    fantom: { label: 'ftm', aliases: ['fantom', 'ftm'] },
    cronos: { label: 'cro', aliases: ['cronos', 'cro'] },
    moonbeam: { label: 'glmr', aliases: ['moonbeam', 'glmr'] },
    boba: { label: 'boba', aliases: ['boba'] },
    gnosis: { label: 'gno', aliases: ['gnosis', 'gno'] },
    celo: { label: 'celo', aliases: ['celo'] },
    megaeth: { label: 'mega', aliases: ['megaeth', 'mega'] },
    hemi: { label: 'hemi', aliases: ['hemi'] },
    katana: { label: 'katana', aliases: ['katana'] },
    starknet: { label: 'strk', aliases: ['starknet', 'strk'] },
    bybit: { label: 'bybit', aliases: ['bybit'] },
    binance: { label: 'binance', aliases: ['binance'] }
  });

  function normalizeChainKey(chain) {
    return typeof chain === 'string' ? chain.trim().toLowerCase() : '';
  }

  function resolveChainKey(chain) {
    const normalized = normalizeChainKey(chain);
    if (!normalized) return '';
    if (CHAIN_LABEL_CONFIG[normalized]) return normalized;
    for (const [chainKey, config] of Object.entries(CHAIN_LABEL_CONFIG)) {
      const aliases = [config.label].concat(config.aliases || []);
      if (aliases.some((alias) => normalizeChainKey(alias) === normalized)) {
        return chainKey;
      }
    }
    return '';
  }

  function getChainConfig(chain) {
    const chainKey = resolveChainKey(chain);
    return chainKey ? CHAIN_LABEL_CONFIG[chainKey] : null;
  }

  function uniqueStrings(values) {
    return Array.from(new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    ));
  }

  function getChainLabel(chain) {
    const config = getChainConfig(chain);
    return config ? config.label : String(chain || '');
  }

  function getChainSearchAliases(chain) {
    const chainKey = resolveChainKey(chain);
    if (!chainKey) {
      const normalized = normalizeChainKey(chain);
      return normalized ? [normalized] : [];
    }
    const config = CHAIN_LABEL_CONFIG[chainKey];
    return uniqueStrings([chainKey, config.label].concat(config.aliases || []));
  }

  function buildChainSearchText(chain) {
    return getChainSearchAliases(chain).join(' ');
  }

  function normalizeChainSearchToken(token) {
    return resolveChainKey(token);
  }

  function buildChainLabelMap() {
    return Object.freeze(Object.fromEntries(
      Object.entries(CHAIN_LABEL_CONFIG).map(([chainKey, config]) => [chainKey, config.label])
    ));
  }

  function buildChainFilterAliasMap() {
    const result = {};
    for (const chainKey of Object.keys(CHAIN_LABEL_CONFIG)) {
      for (const alias of getChainSearchAliases(chainKey)) {
        result[alias.toUpperCase()] = chainKey;
      }
    }
    return Object.freeze(result);
  }

  return {
    CHAIN_LABEL_CONFIG,
    buildChainFilterAliasMap,
    buildChainLabelMap,
    buildChainSearchText,
    getChainLabel,
    getChainSearchAliases,
    normalizeChainKey,
    normalizeChainSearchToken,
    resolveChainKey
  };
});
