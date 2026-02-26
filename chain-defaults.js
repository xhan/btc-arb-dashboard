(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.ChainDefaults = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const LIFI_DEFAULT_CHAINS = new Set(['katana', 'hemi']);

  function normalizeChain(chain) {
    return typeof chain === 'string' ? chain.trim().toLowerCase() : '';
  }

  function getDefaultSourceForChain(chain) {
    const normalized = normalizeChain(chain);
    if (LIFI_DEFAULT_CHAINS.has(normalized)) return 'LI.FI';
    return 'Kyber';
  }

  return {
    getDefaultSourceForChain
  };
});

