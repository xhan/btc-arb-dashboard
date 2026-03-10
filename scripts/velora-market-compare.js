#!/usr/bin/env node

const fetchLib = require('node-fetch');
const { ethers } = require('ethers');
const {
  TOKENS,
  fetchPriceQuote,
  formatRequestAmountDisplay,
  formatTokenAmount
} = require('./velora-market-api');

const KYBER_API_BASE_URL = 'https://aggregator-api.kyberswap.com';
const VELORA_ADAPTER_LIST_URL = 'https://api.paraswap.io/adapters/list/1';

function parseArgs(argv) {
  const result = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      result[key] = 'true';
      continue;
    }

    result[key] = next;
    i += 1;
  }
  return result;
}

function toInt(value, defaultValue) {
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) ? num : defaultValue;
}

function getFetchImpl(customFetch) {
  if (typeof customFetch === 'function') return customFetch;
  if (typeof fetch === 'function') return fetch.bind(globalThis);
  return fetchLib;
}

function buildPairRequest({ label, srcToken, destToken, amountDisplay }) {
  return {
    label,
    chainId: 1,
    side: 'SELL',
    version: '6.2',
    srcToken,
    destToken,
    srcDecimals: srcToken.decimals,
    destDecimals: destToken.decimals,
    amount: ethers.parseUnits(String(amountDisplay), srcToken.decimals).toString()
  };
}

function buildCbBtcWbtcRequests() {
  return [
    buildPairRequest({
      label: 'cbBTC -> WBTC',
      srcToken: TOKENS.CBBTC,
      destToken: TOKENS.WBTC,
      amountDisplay: '1'
    }),
    buildPairRequest({
      label: 'WBTC -> cbBTC',
      srcToken: TOKENS.WBTC,
      destToken: TOKENS.CBBTC,
      amountDisplay: '1'
    })
  ];
}

function buildScenarioMatrix(adapterNames) {
  const allAdapters = Array.isArray(adapterNames) ? adapterNames.filter(Boolean) : [];
  return [
    { name: 'kyber', kind: 'kyber' },
    { name: 'velora-default', kind: 'velora', veloraOptions: {} },
    { name: 'velora-include-empty', kind: 'velora', veloraOptions: { includeDEXS: [] } },
    { name: 'velora-include-all', kind: 'velora', veloraOptions: { includeDEXS: allAdapters } },
    { name: 'velora-other-off', kind: 'velora', veloraOptions: { otherExchangePrices: false } },
    { name: 'velora-other-on', kind: 'velora', veloraOptions: { otherExchangePrices: true } }
  ];
}

async function fetchAdapterList(chainId = 1, options = {}) {
  const fetchImpl = getFetchImpl(options.fetchImpl);
  const response = await fetchImpl(`https://api.paraswap.io/adapters/list/${chainId}`);
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Velora adapters list 返回格式异常');
  }
  return data.map((item) => String(item || '').trim()).filter(Boolean);
}

async function fetchKyberQuote(request, options = {}) {
  const fetchImpl = getFetchImpl(options.fetchImpl);
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  const params = new URLSearchParams({
    tokenIn: request.srcToken.address,
    tokenOut: request.destToken.address,
    amountIn: String(request.amount)
  });
  const url = `${KYBER_API_BASE_URL}/ethereum/api/v1/routes?${params.toString()}`;
  const headers = {};

  if (options.clientId) {
    headers['X-Client-Id'] = options.clientId;
  }

  try {
    const response = await fetchImpl(url, {
      headers,
      signal: controller.signal
    });
    const text = await response.text();
    let data = null;

    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    const rawAmountOut = data?.data?.routeSummary?.amountOut || '';
    return {
      ok: response.ok && !!rawAmountOut,
      source: 'Kyber',
      scenario: 'kyber',
      url,
      ms: Date.now() - startedAt,
      status: response.status,
      request,
      rawAmountOut,
      amountOut: rawAmountOut ? Number(ethers.formatUnits(rawAmountOut, request.destDecimals)) : NaN,
      amountOutDisplay: rawAmountOut ? formatTokenAmount(rawAmountOut, request.destDecimals) : '',
      errorMessage: response.ok ? '' : text.slice(0, 160)
    };
  } catch (error) {
    return {
      ok: false,
      source: 'Kyber',
      scenario: 'kyber',
      url,
      ms: Date.now() - startedAt,
      status: 0,
      request,
      rawAmountOut: '',
      amountOut: NaN,
      amountOutDisplay: '',
      errorMessage: error && error.name === 'AbortError' ? 'timeout' : error.message
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildDiffText(result, kyberResult) {
  if (!result.ok || !kyberResult.ok) return '-';
  const diff = result.amountOut - kyberResult.amountOut;
  const bps = kyberResult.amountOut !== 0 ? ((result.amountOut / kyberResult.amountOut) - 1) * 10000 : 0;
  const diffText = diff >= 0 ? `+${diff}` : `${diff}`;
  const bpsText = bps >= 0 ? `+${bps.toFixed(2)}bps` : `${bps.toFixed(2)}bps`;
  return `${diffText} (${bpsText})`;
}

function formatScenarioLine(result, kyberResult) {
  const amountText = result.ok ? result.amountOutDisplay : result.errorMessage || '-';
  const diffText = result.scenario === 'kyber' ? '-' : buildDiffText(result, kyberResult);
  return `${result.scenario.padEnd(21)} | ${String(result.status).padStart(3)} | ${String(result.ms).padStart(5)}ms | ${amountText.padStart(14)} | diffVsKyber=${diffText}`;
}

async function runComparison(options = {}) {
  const adapterNames = await fetchAdapterList(1, options);
  const requests = buildCbBtcWbtcRequests();
  const scenarios = buildScenarioMatrix(adapterNames);
  const output = [];

  for (const request of requests) {
    const kyberResult = await fetchKyberQuote(request, options);
    const rows = [kyberResult];

    for (const scenario of scenarios.slice(1)) {
      const veloraResult = await fetchPriceQuote(request, {
        timeoutMs: options.timeoutMs,
        partner: options.partner,
        includeDEXS: scenario.veloraOptions.includeDEXS,
        otherExchangePrices: scenario.veloraOptions.otherExchangePrices
      });
      rows.push({
        ...veloraResult,
        source: 'Velora',
        scenario: scenario.name,
        amountOut: veloraResult.destAmountRaw
          ? Number(ethers.formatUnits(veloraResult.destAmountRaw, request.destDecimals))
          : NaN,
        amountOutDisplay: veloraResult.destAmountDisplay
      });
    }

    output.push({
      request,
      adapterCount: adapterNames.length,
      scenarios: rows
    });
  }

  return output;
}

async function main() {
  const args = parseArgs(process.argv);
  const timeoutMs = toInt(args['timeout-ms'], 10000);
  const partner = typeof args.partner === 'string' ? args.partner.trim() : '';
  const clientId = typeof args['x-client-id'] === 'string' ? args['x-client-id'].trim() : 'xh-quote-dashboard';
  const results = await runComparison({
    timeoutMs,
    partner,
    clientId
  });

  console.log('--- Velora vs Kyber cbBTC/WBTC ---');
  console.log('adapterList:', VELORA_ADAPTER_LIST_URL);
  console.log('timeoutMs:', timeoutMs);
  if (partner) {
    console.log('veloraPartner:', partner);
  }
  console.log('kyberClientId:', clientId);

  for (const item of results) {
    console.log(`\n== ${formatRequestAmountDisplay(item.request)} ==`);
    console.log(`adapterCount: ${item.adapterCount}`);
    console.log('scenario               | sts |    ms |      amountOut | diff');
    item.scenarios.forEach((scenario) => {
      console.log(formatScenarioLine(scenario, item.scenarios[0]));
    });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('ERROR:', error.message);
    process.exit(1);
  });
}

module.exports = {
  buildCbBtcWbtcRequests,
  buildScenarioMatrix,
  fetchAdapterList,
  fetchKyberQuote,
  runComparison
};
