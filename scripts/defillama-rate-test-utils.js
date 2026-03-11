const fetchLib = require('node-fetch');
const { ethers } = require('ethers');

const SWAP_PAGE_ORIGIN = 'https://swap.defillama.com';
const DEFAULT_USER_AGENT = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  'AppleWebKit/537.36 (KHTML, like Gecko)',
  'Chrome/145.0.0.0 Safari/537.36'
].join(' ');

const DEFILLAMA_TOKENS = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6
  },
  CBBTC: {
    symbol: 'cbBTC',
    name: 'Coinbase Wrapped BTC',
    address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
    decimals: 8
  },
  WBTC: {
    symbol: 'WBTC',
    name: 'Wrapped BTC',
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    decimals: 8
  }
};

const DEFAULT_PAIRS = [
  { label: 'cbBTC -> WBTC', srcToken: DEFILLAMA_TOKENS.CBBTC, destToken: DEFILLAMA_TOKENS.WBTC, amountDisplay: '1' },
  { label: 'WBTC -> cbBTC', srcToken: DEFILLAMA_TOKENS.WBTC, destToken: DEFILLAMA_TOKENS.CBBTC, amountDisplay: '1' },
  { label: 'cbBTC -> USDC', srcToken: DEFILLAMA_TOKENS.CBBTC, destToken: DEFILLAMA_TOKENS.USDC, amountDisplay: '1' },
  { label: 'USDC -> cbBTC', srcToken: DEFILLAMA_TOKENS.USDC, destToken: DEFILLAMA_TOKENS.CBBTC, amountDisplay: '10000' },
  { label: 'WBTC -> USDC', srcToken: DEFILLAMA_TOKENS.WBTC, destToken: DEFILLAMA_TOKENS.USDC, amountDisplay: '1' },
  { label: 'USDC -> WBTC', srcToken: DEFILLAMA_TOKENS.USDC, destToken: DEFILLAMA_TOKENS.WBTC, amountDisplay: '10000' }
];

function buildTokenMeta(token) {
  const address = token.address.toLowerCase();
  return {
    chainId: 1,
    address,
    decimals: token.decimals,
    symbol: token.symbol,
    name: token.name,
    logoURI: `https://token-icons.llamao.fi/icons/tokens/1/${address}?h=48&w=48`,
    eip2612: true,
    tags: [],
    label: token.symbol,
    value: address,
    logoURI2: `https://tokens.1inch.io/${address}.png`,
    volume24h: 0
  };
}

function buildDefaultDefiLlamaRateRequests() {
  return DEFAULT_PAIRS.map((item) => ({
    chain: 'ethereum',
    chainId: 1,
    label: item.label,
    srcToken: buildTokenMeta(item.srcToken),
    destToken: buildTokenMeta(item.destToken),
    amountDisplay: item.amountDisplay,
    amountRaw: ethers.parseUnits(item.amountDisplay, item.srcToken.decimals).toString()
  }));
}

function buildBaseHeaders(options = {}) {
  return {
    accept: '*/*',
    'accept-encoding': options.acceptEncoding || 'gzip, deflate, br, zstd',
    'accept-language': options.acceptLanguage || 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    origin: SWAP_PAGE_ORIGIN,
    pragma: 'no-cache',
    priority: 'u=1, i',
    referer: `${SWAP_PAGE_ORIGIN}/`,
    'sec-ch-ua': options.secChUa || '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': options.secChUaPlatform || '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'user-agent': options.userAgent || DEFAULT_USER_AGENT
  };
}

function buildDirectParaswapUrl(request) {
  const params = new URLSearchParams({
    srcToken: request.srcToken.address,
    destToken: request.destToken.address,
    amount: request.amountRaw,
    srcDecimals: String(request.srcToken.decimals),
    destDecimals: String(request.destToken.decimals),
    partner: 'llamaswap',
    side: 'SELL',
    network: '1',
    excludeDEXS: 'ParaSwapPool,ParaSwapLimitOrders',
    version: '6.2'
  });
  return `https://apiv5.paraswap.io/prices/?${params.toString()}`;
}

function buildDirectKyberUrl(request) {
  const params = new URLSearchParams({
    tokenIn: request.srcToken.address,
    tokenOut: request.destToken.address,
    amountIn: request.amountRaw,
    gasInclude: 'true'
  });
  return `https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?${params.toString()}`;
}

function buildDefiLlamaHttpRequest(request, options = {}) {
  const provider = String(options.provider || '').toLowerCase();
  const hideIp = options.hideIp === true;
  const headers = buildBaseHeaders(options);

  if (provider !== 'paraswap' && provider !== 'kyberswap') {
    throw new Error(`unsupported provider: ${provider}`);
  }

  if (hideIp) {
    throw new Error('hide-ip on is not supported in the server-side rate test');
  }

  if (provider === 'paraswap') {
    return {
      provider,
      hideIp,
      label: request.label,
      method: 'GET',
      url: buildDirectParaswapUrl(request),
      headers,
      body: null
    };
  }

  return {
    provider,
    hideIp,
    label: request.label,
    method: 'GET',
    url: buildDirectKyberUrl(request),
    headers: {
      ...headers,
      'x-client-id': options.clientId || 'llamaswap'
    },
    body: null
  };
}

function getFetchImpl(customFetch) {
  if (typeof customFetch === 'function') return customFetch;
  if (typeof fetch === 'function') return fetch.bind(globalThis);
  return fetchLib;
}

function parseResponseMessage(text) {
  try {
    const data = JSON.parse(text);
    if (data && typeof data === 'object') {
      return data.error || data.message || data.code || text.slice(0, 160);
    }
  } catch {
    return text.slice(0, 160);
  }
  return text.slice(0, 160);
}

function summarizeResponseText(provider, text) {
  try {
    const data = JSON.parse(text);
    if (provider === 'paraswap') {
      const destAmount = data?.priceRoute?.destAmount;
      const gasUsd = data?.priceRoute?.gasCostUSD;
      const parts = [];
      if (destAmount) parts.push(`destAmount=${destAmount}`);
      if (gasUsd) parts.push(`gasUsd=${gasUsd}`);
      return parts.join(' ') || text.slice(0, 160);
    }

    if (provider === 'kyberswap') {
      const amountOut = data?.data?.routeSummary?.amountOut;
      const gasUsd = data?.data?.routeSummary?.gasUsd;
      const parts = [];
      if (amountOut) parts.push(`amountOut=${amountOut}`);
      if (gasUsd) parts.push(`gasUsd=${gasUsd}`);
      return parts.join(' ') || text.slice(0, 160);
    }
  } catch {
    return text.slice(0, 160);
  }

  return text.slice(0, 160);
}

async function sendRateRequest(httpRequest, options = {}) {
  const fetchImpl = getFetchImpl(options.fetchImpl);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 10000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(httpRequest.url, {
      method: httpRequest.method,
      headers: httpRequest.headers,
      body: httpRequest.body,
      signal: controller.signal
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      ms: Date.now() - startedAt,
      provider: httpRequest.provider,
      hideIp: httpRequest.hideIp,
      label: httpRequest.label,
      url: httpRequest.url,
      errorMessage: response.ok ? '' : parseResponseMessage(text),
      responseText: text.slice(0, 300),
      responseSummary: response.ok ? summarizeResponseText(httpRequest.provider, text) : ''
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - startedAt,
      provider: httpRequest.provider,
      hideIp: httpRequest.hideIp,
      label: httpRequest.label,
      url: httpRequest.url,
      errorMessage: error && error.name === 'AbortError' ? 'timeout' : error.message,
      responseText: ''
    };
  } finally {
    clearTimeout(timer);
  }
}

function summarizeRateResults(results) {
  const list = Array.isArray(results) ? results : [];
  const statusCount = {};
  const byProvider = {};

  for (const item of list) {
    const statusKey = String(item.status);
    statusCount[statusKey] = (statusCount[statusKey] || 0) + 1;

    const providerKey = item.provider || 'unknown';
    if (!byProvider[providerKey]) {
      byProvider[providerKey] = { total: 0, successCount: 0, failCount: 0 };
    }
    byProvider[providerKey].total += 1;
    byProvider[providerKey][item.ok ? 'successCount' : 'failCount'] += 1;
  }

  const successList = list.filter((item) => item.ok);
  const failList = list.filter((item) => !item.ok);

  return {
    total: list.length,
    successCount: successList.length,
    failCount: failList.length,
    successRate: list.length ? Number((successList.length / list.length).toFixed(4)) : 0,
    avgMs: list.length ? Math.round(list.reduce((sum, item) => sum + item.ms, 0) / list.length) : 0,
    statusCount,
    byProvider,
    failSample: failList.slice(0, 8)
  };
}

module.exports = {
  DEFAULT_USER_AGENT,
  DEFILLAMA_TOKENS,
  buildDefaultDefiLlamaRateRequests,
  buildDefiLlamaHttpRequest,
  summarizeResponseText,
  sendRateRequest,
  summarizeRateResults
};
