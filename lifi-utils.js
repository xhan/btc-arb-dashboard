function normalizeChainKey(chain) {
  if (typeof chain !== 'string') return '';
  return chain.trim().toLowerCase();
}

function buildLifiChainIdMap(chains) {
  const chainIdMap = {};
  if (!Array.isArray(chains)) return chainIdMap;

  for (const chain of chains) {
    if (!chain || !Number.isFinite(Number(chain.id))) continue;
    const chainId = Number(chain.id);
    const aliases = [chain.key, chain.name, chain?.metamask?.chainName];

    for (const alias of aliases) {
      const normalized = normalizeChainKey(alias);
      if (!normalized) continue;
      chainIdMap[normalized] = chainId;
    }
  }

  return chainIdMap;
}

function resolveLifiChainId(chain, chainIdMap) {
  if (!chainIdMap || typeof chainIdMap !== 'object') return null;
  const normalized = normalizeChainKey(chain);
  if (!normalized) return null;
  return Number.isFinite(chainIdMap[normalized]) ? chainIdMap[normalized] : null;
}

module.exports = {
  buildLifiChainIdMap,
  resolveLifiChainId
};
