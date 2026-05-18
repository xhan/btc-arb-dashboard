const assert = require('assert');

const {
  buildDefiLlamaProxyRequest,
  normalizeBrowserProxyOptions,
  summarizeBrowserProxyResults
} = require('../scripts/defillama-browser-proxy-test-utils');

const defaults = normalizeBrowserProxyOptions({});

assert.strictEqual(defaults.intervalMs, 500);
assert.strictEqual(defaults.durationMs, 30 * 60 * 1000);
assert.strictEqual(defaults.total, 3600);
assert.strictEqual(defaults.timeoutMs, 10000);
assert.strictEqual(defaults.protocol, 'ParaSwap');
assert.strictEqual(defaults.chain, 'ethereum');

const custom = normalizeBrowserProxyOptions({
  intervalMs: '250',
  durationMs: '1000',
  timeoutMs: '3000',
  protocol: 'KyberSwap'
});

assert.strictEqual(custom.intervalMs, 250);
assert.strictEqual(custom.durationMs, 1000);
assert.strictEqual(custom.total, 4);
assert.strictEqual(custom.timeoutMs, 3000);
assert.strictEqual(custom.protocol, 'KyberSwap');

const request = buildDefiLlamaProxyRequest({
  protocol: 'ParaSwap',
  chain: 'ethereum',
  fromToken: {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    decimals: 6,
    symbol: 'USDT'
  },
  toToken: {
    address: '0xc139190f447e929f090edeb554d95abb8b18ac1c',
    decimals: 18,
    symbol: 'USDtb'
  },
  amountRaw: '100000000000',
  slippage: '0.5',
  userAddress: '0x0000000000000000000000000000000000000000'
});

const requestUrl = new URL(request.url);
assert.strictEqual(requestUrl.origin, 'https://swap-api.defillama.com');
assert.strictEqual(requestUrl.pathname, '/dexAggregatorQuote');
assert.strictEqual(requestUrl.searchParams.get('protocol'), 'ParaSwap');
assert.strictEqual(requestUrl.searchParams.get('chain'), 'ethereum');
assert.strictEqual(requestUrl.searchParams.get('from'), '0xdac17f958d2ee523a2206206994597c13d831ec7');
assert.strictEqual(requestUrl.searchParams.get('to'), '0xc139190f447e929f090edeb554d95abb8b18ac1c');
assert.strictEqual(requestUrl.searchParams.get('amount'), '100000000000');
assert.ok(requestUrl.searchParams.get('api_key'));
assert.strictEqual(request.method, 'POST');
assert.deepStrictEqual(JSON.parse(request.body), {
  isPrivacyEnabled: true,
  userAddress: '0x0000000000000000000000000000000000000000',
  slippage: '0.5',
  amountOut: '0',
  fromToken: {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    decimals: 6,
    symbol: 'USDT'
  },
  toToken: {
    address: '0xc139190f447e929f090edeb554d95abb8b18ac1c',
    decimals: 18,
    symbol: 'USDtb'
  }
});

const summary = summarizeBrowserProxyResults([
  { ok: true, status: 200, ms: 100 },
  { ok: true, status: 200, ms: 300 },
  { ok: false, status: 403, ms: 200, errorMessage: 'challenge' }
]);

assert.deepStrictEqual(summary.statusCount, { 200: 2, 403: 1 });
assert.strictEqual(summary.total, 3);
assert.strictEqual(summary.successCount, 2);
assert.strictEqual(summary.failCount, 1);
assert.strictEqual(summary.successRate, 0.6667);
assert.strictEqual(summary.avgMs, 200);
assert.strictEqual(summary.p95Ms, 300);
