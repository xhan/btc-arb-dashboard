const { ethers } = require('ethers');

function normalizeChainKey(chain) {
  return String(chain || '').trim().toLowerCase();
}

function normalizeTokenKey(token) {
  const raw = String(token || '').trim();
  if (/^0x[0-9a-fA-F]+$/.test(raw)) {
    return raw.toLowerCase();
  }
  return raw;
}

function normalizeTokenMetaCacheKey(chain, token) {
  return `${normalizeChainKey(chain)}-${normalizeTokenKey(token)}`;
}

function normalizeCacheEntries(input) {
  const out = {};
  for (const [key, value] of Object.entries(input || {})) {
    const separatorIndex = key.indexOf('-');
    if (separatorIndex <= 0) {
      out[key] = value;
      continue;
    }

    const chain = key.slice(0, separatorIndex);
    const token = key.slice(separatorIndex + 1);
    out[normalizeTokenMetaCacheKey(chain, token)] = value;
  }
  return out;
}

function toRawAmount(amount, decimals) {
  return ethers.parseUnits(String(amount), decimals).toString();
}

function fromRawAmount(rawAmount, decimals) {
  return Number(ethers.formatUnits(String(rawAmount), decimals));
}

function createTokenMetaStore({ cachePath, readJsonFile, writeFile }) {
  let cache = {};
  let loaded = false;
  let saveQueue = Promise.resolve();

  async function load() {
    if (loaded) return cache;

    try {
      cache = normalizeCacheEntries(await readJsonFile(cachePath));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      cache = {};
    }

    loaded = true;
    return cache;
  }

  async function save() {
    saveQueue = saveQueue.then(() => writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8'));
    await saveQueue;
  }

  function get(chain, token) {
    return cache[normalizeTokenMetaCacheKey(chain, token)] || null;
  }

  async function remember(chain, token, loader) {
    await load();

    const key = normalizeTokenMetaCacheKey(chain, token);
    if (cache[key]) {
      return cache[key];
    }

    const metadata = await loader();
    cache[key] = metadata;
    await save();
    return metadata;
  }

  function snapshot() {
    return { ...cache };
  }

  return {
    get,
    load,
    remember,
    snapshot
  };
}

module.exports = {
  createTokenMetaStore,
  fromRawAmount,
  normalizeChainKey,
  normalizeTokenKey,
  normalizeTokenMetaCacheKey,
  toRawAmount
};
