const fetchLib = require('node-fetch');
const { ethers } = require('ethers');

const DEFAULT_API_BASE_URL = 'https://api.paraswap.io';
const NATIVE_ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

const TOKENS = {
  ETH: {
    symbol: 'ETH',
    address: NATIVE_ETH,
    decimals: 18
  },
  USDT: {
    symbol: 'USDT',
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    decimals: 6
  },
  USDC: {
    symbol: 'USDC',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6
  },
  CBBTC: {
    symbol: 'cbBTC',
    address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
    decimals: 8
  },
  WBTC: {
    symbol: 'WBTC',
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    decimals: 8
  }
};

const DEFAULT_QUOTE_REQUESTS = [
  {
    label: 'ETH -> USDT',
    srcToken: TOKENS.ETH,
    destToken: TOKENS.USDT,
    amount: ethers.parseUnits('1', TOKENS.ETH.decimals).toString()
  },
  {
    label: 'USDT -> ETH',
    srcToken: TOKENS.USDT,
    destToken: TOKENS.ETH,
    amount: ethers.parseUnits('1000', TOKENS.USDT.decimals).toString()
  },
  {
    label: 'ETH -> USDC',
    srcToken: TOKENS.ETH,
    destToken: TOKENS.USDC,
    amount: ethers.parseUnits('1', TOKENS.ETH.decimals).toString()
  },
  {
    label: 'USDC -> ETH',
    srcToken: TOKENS.USDC,
    destToken: TOKENS.ETH,
    amount: ethers.parseUnits('1000', TOKENS.USDC.decimals).toString()
  },
  {
    label: 'WBTC -> USDC',
    srcToken: TOKENS.WBTC,
    destToken: TOKENS.USDC,
    amount: ethers.parseUnits('0.1', TOKENS.WBTC.decimals).toString()
  },
  {
    label: 'USDC -> WBTC',
    srcToken: TOKENS.USDC,
    destToken: TOKENS.WBTC,
    amount: ethers.parseUnits('10000', TOKENS.USDC.decimals).toString()
  },
  {
    label: 'WBTC -> USDT',
    srcToken: TOKENS.WBTC,
    destToken: TOKENS.USDT,
    amount: ethers.parseUnits('0.1', TOKENS.WBTC.decimals).toString()
  },
  {
    label: 'USDT -> WBTC',
    srcToken: TOKENS.USDT,
    destToken: TOKENS.WBTC,
    amount: ethers.parseUnits('10000', TOKENS.USDT.decimals).toString()
  }
].map((item) => ({
  chainId: 1,
  side: 'SELL',
  version: '6.2',
  ...item,
  srcDecimals: item.srcToken.decimals,
  destDecimals: item.destToken.decimals
}));

function buildPriceUrl(request, options = {}) {
  const apiBaseUrl = options.apiBaseUrl || DEFAULT_API_BASE_URL;
  const params = new URLSearchParams({
    srcToken: request.srcToken.address,
    destToken: request.destToken.address,
    amount: String(request.amount),
    srcDecimals: String(request.srcDecimals),
    destDecimals: String(request.destDecimals),
    side: request.side || 'SELL',
    network: String(request.chainId || 1),
    version: request.version || '6.2'
  });
  if (typeof options.partner === 'string' && options.partner.trim()) {
    params.set('partner', options.partner.trim());
  }
  if (Array.isArray(options.includeDEXS) && options.includeDEXS.length > 0) {
    params.set('includeDEXS', options.includeDEXS.join(','));
  }
  if (typeof options.otherExchangePrices === 'boolean') {
    params.set('otherExchangePrices', String(options.otherExchangePrices));
  }
  return `${apiBaseUrl}/prices/?${params.toString()}`;
}

function buildDefaultQuoteRequests() {
  return DEFAULT_QUOTE_REQUESTS.map((item) => ({
    ...item,
    srcToken: { ...item.srcToken },
    destToken: { ...item.destToken }
  }));
}

function getFetchImpl(customFetch, options = {}) {
  if (typeof customFetch === 'function') return customFetch;
  if (options.agent) return fetchLib;
  if (typeof fetch === 'function') return fetch.bind(globalThis);
  return fetchLib;
}

function parseResponseMessage(data, text) {
  if (data && typeof data === 'object') {
    return data.error || data.message || data.code || '';
  }
  return String(text || '').slice(0, 160);
}

function formatTokenAmount(rawAmount, decimals) {
  if (!rawAmount) return '';
  try {
    const formatted = ethers.formatUnits(String(rawAmount), decimals);
    const num = Number(formatted);
    if (!Number.isFinite(num)) return formatted;
    if (Math.abs(num) >= 1000) return num.toLocaleString('en-US', { maximumFractionDigits: 4 });
    return num.toLocaleString('en-US', { maximumFractionDigits: 8 });
  } catch {
    return String(rawAmount);
  }
}

function formatRequestAmountDisplay(request) {
  const srcAmount = formatTokenAmount(request.amount, request.srcDecimals);
  return `${srcAmount} ${request.srcToken.symbol} -> ${request.destToken.symbol}`;
}

async function fetchPriceQuote(request, options = {}) {
  const fetchImpl = getFetchImpl(options.fetchImpl, options);
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 10000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  const headers = { ...(options.headers || {}) };
  const url = buildPriceUrl(request, options);

  try {
    const response = await fetchImpl(url, {
      headers,
      signal: controller.signal,
      agent: options.agent
    });
    const text = await response.text();
    let data = null;

    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    const priceRoute = data && data.priceRoute ? data.priceRoute : null;
    const destAmountRaw = priceRoute && priceRoute.destAmount ? priceRoute.destAmount : '';

    return {
      ok: response.ok,
      status: response.status,
      ms: Date.now() - startedAt,
      label: request.label,
      url,
      request,
      data,
      destAmountRaw,
      destAmountDisplay: formatTokenAmount(destAmountRaw, request.destDecimals),
      errorMessage: response.ok ? '' : parseResponseMessage(data, text)
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - startedAt,
      label: request.label,
      url,
      request,
      data: null,
      destAmountRaw: '',
      destAmountDisplay: '',
      errorMessage: error && error.name === 'AbortError' ? 'timeout' : error.message
    };
  } finally {
    clearTimeout(timer);
  }
}

function summarizeResults(results) {
  const list = Array.isArray(results) ? results : [];
  const total = list.length;
  const successList = list.filter((item) => item && item.ok);
  const successCount = successList.length;
  const failCount = total - successCount;
  const successRate = total > 0 ? Number((successCount / total).toFixed(4)) : 0;
  const successAvgMs = successCount > 0
    ? Math.round(successList.reduce((sum, item) => sum + (item.ms || 0), 0) / successCount)
    : 0;
  const byLabelMap = new Map();

  for (const item of list) {
    const label = item && item.label ? item.label : 'unknown';
    const current = byLabelMap.get(label) || {
      label,
      count: 0,
      successCount: 0,
      failCount: 0,
      successMsTotal: 0
    };

    current.count += 1;
    if (item && item.ok) {
      current.successCount += 1;
      current.successMsTotal += item.ms || 0;
    } else {
      current.failCount += 1;
    }

    byLabelMap.set(label, current);
  }

  const byLabel = Array.from(byLabelMap.values())
    .map((item) => ({
      label: item.label,
      count: item.count,
      ratio: total > 0 ? Number((item.count / total).toFixed(4)) : 0,
      successCount: item.successCount,
      failCount: item.failCount,
      successRate: item.count > 0 ? Number((item.successCount / item.count).toFixed(4)) : 0,
      successAvgMs: item.successCount > 0 ? Math.round(item.successMsTotal / item.successCount) : 0
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });

  return {
    total,
    successCount,
    failCount,
    successRate,
    successAvgMs,
    labelShare: byLabel.map(({ label, count, ratio }) => ({ label, count, ratio })),
    byLabel
  };
}

module.exports = {
  DEFAULT_API_BASE_URL,
  DEFAULT_QUOTE_REQUESTS,
  TOKENS,
  buildDefaultQuoteRequests,
  buildPriceUrl,
  fetchPriceQuote,
  formatRequestAmountDisplay,
  formatTokenAmount,
  summarizeResults
};
