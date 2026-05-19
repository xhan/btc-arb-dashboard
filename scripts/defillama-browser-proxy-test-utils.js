const DEFILLAMA_PROXY_API_KEY = 'nsr_UYWxuvj1hOCgHxJhDEKZ0g30c4Be3I5fOMBtFAA';
const DEFAULT_USER_ADDRESS = '0x0000000000000000000000000000000000000000';

const DEFAULT_FROM_TOKEN = Object.freeze({
  address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  decimals: 6,
  symbol: 'USDT'
});

const DEFAULT_TO_TOKEN = Object.freeze({
  address: '0xc139190f447e929f090edeb554d95abb8b18ac1c',
  decimals: 18,
  symbol: 'USDtb'
});

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeAddress(value, fallback) {
  const text = String(value || '').trim();
  return /^0x[0-9a-fA-F]{40}$/.test(text) ? text.toLowerCase() : fallback;
}

function normalizeBrowserProxyOptions(options = {}) {
  const intervalMs = toPositiveInt(options.intervalMs, 800);
  const durationMs = toPositiveInt(options.durationMs, 30 * 60 * 1000);
  return {
    intervalMs,
    durationMs,
    total: Math.ceil(durationMs / intervalMs),
    timeoutMs: toPositiveInt(options.timeoutMs, 10000),
    protocol: String(options.protocol || 'ParaSwap').trim() || 'ParaSwap',
    chain: String(options.chain || 'ethereum').trim() || 'ethereum',
    slippage: String(options.slippage || '0.5'),
    userAddress: normalizeAddress(options.userAddress, DEFAULT_USER_ADDRESS),
    fromToken: {
      ...DEFAULT_FROM_TOKEN,
      ...(options.fromToken || {})
    },
    toToken: {
      ...DEFAULT_TO_TOKEN,
      ...(options.toToken || {})
    },
    amountRaw: String(options.amountRaw || '100000000000')
  };
}

function buildDefiLlamaProxyRequest(options = {}) {
  const params = new URLSearchParams({
    protocol: options.protocol,
    chain: options.chain,
    from: options.fromToken.address,
    to: options.toToken.address,
    amount: options.amountRaw,
    api_key: options.apiKey || DEFILLAMA_PROXY_API_KEY
  });

  return {
    method: 'POST',
    url: `https://swap-api.defillama.com/dexAggregatorQuote?${params.toString()}`,
    body: JSON.stringify({
      isPrivacyEnabled: true,
      userAddress: options.userAddress || DEFAULT_USER_ADDRESS,
      slippage: String(options.slippage || '0.5'),
      amountOut: '0',
      fromToken: {
        address: options.fromToken.address,
        decimals: Number(options.fromToken.decimals),
        symbol: options.fromToken.symbol
      },
      toToken: {
        address: options.toToken.address,
        decimals: Number(options.toToken.decimals),
        symbol: options.toToken.symbol
      }
    })
  };
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index];
}

function summarizeBrowserProxyResults(results) {
  const list = Array.isArray(results) ? results : [];
  const successList = list.filter((item) => item.ok);
  const failList = list.filter((item) => !item.ok);
  const statusCount = {};

  for (const item of list) {
    const key = String(item.status || 0);
    statusCount[key] = (statusCount[key] || 0) + 1;
  }

  const latencies = list
    .map((item) => Number(item.ms))
    .filter((value) => Number.isFinite(value));

  return {
    total: list.length,
    successCount: successList.length,
    failCount: failList.length,
    successRate: list.length ? Number((successList.length / list.length).toFixed(4)) : 0,
    avgMs: latencies.length
      ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
      : 0,
    p95Ms: percentile(latencies, 0.95),
    statusCount,
    failSample: failList.slice(0, 8)
  };
}

module.exports = {
  DEFAULT_FROM_TOKEN,
  DEFAULT_TO_TOKEN,
  buildDefiLlamaProxyRequest,
  normalizeBrowserProxyOptions,
  summarizeBrowserProxyResults
};
