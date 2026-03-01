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
    ['starknet', 'Ekubo']
  ]);

  function normalizeChain(chain) {
    return typeof chain === 'string' ? chain.trim().toLowerCase() : '';
  }

  function getDefaultSourceForChain(chain) {
    const normalized = normalizeChain(chain);
    const defaultSource = CHAIN_DEFAULT_SOURCES.get(normalized);
    if (defaultSource) return defaultSource;
    return 'Kyber';
  }

  return {
    getDefaultSourceForChain
  };
});
