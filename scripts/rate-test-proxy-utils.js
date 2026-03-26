function parseProxyList(value) {
  if (typeof value !== 'string' || !value.trim()) return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => {
      const eqIndex = item.indexOf('=');
      if (eqIndex > 0) {
        const label = item.slice(0, eqIndex).trim();
        const url = item.slice(eqIndex + 1).trim();
        return { id: label, label, url };
      }

      const label = `proxy-${index + 1}`;
      return { id: label, label, url: item };
    });
}

function selectProxyByIndex(proxies, index) {
  if (!Array.isArray(proxies) || proxies.length === 0) return null;
  return proxies[index % proxies.length] || null;
}

async function createProxyAgentCache(proxies) {
  const { HttpsProxyAgent } = await import('https-proxy-agent');
  const cache = new Map();

  for (const proxy of proxies || []) {
    if (!proxy || !proxy.id || !proxy.url) continue;
    cache.set(proxy.id, new HttpsProxyAgent(proxy.url));
  }

  return cache;
}

function getAgentForProxy(proxy, cache) {
  if (!proxy || !cache) return undefined;
  return cache.get(proxy.id);
}

module.exports = {
  createProxyAgentCache,
  getAgentForProxy,
  parseProxyList,
  selectProxyByIndex
};
