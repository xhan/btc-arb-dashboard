function createRequestChannelAgentCache() {
  return new Map();
}

async function getHttpsProxyAgentClass() {
  const mod = await import('https-proxy-agent');
  return mod.HttpsProxyAgent;
}

async function applyRequestChannelToFetchOptions(options = {}, requestContext = {}, agentCache = createRequestChannelAgentCache()) {
  const proxyUrl = typeof requestContext.httpProxy === 'string' ? requestContext.httpProxy.trim() : '';
  if (!proxyUrl) {
    return options;
  }

  let agent = agentCache.get(proxyUrl);
  if (!agent) {
    const HttpsProxyAgent = await getHttpsProxyAgentClass();
    agent = new HttpsProxyAgent(proxyUrl);
    agentCache.set(proxyUrl, agent);
  }

  return {
    ...options,
    agent
  };
}

module.exports = {
  applyRequestChannelToFetchOptions,
  createRequestChannelAgentCache
};
