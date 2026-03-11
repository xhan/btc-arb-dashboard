const assert = require('assert');

const {
  DEFILLAMA_TOKENS,
  buildDefaultDefiLlamaRateRequests,
  buildDefiLlamaHttpRequest,
  summarizeResponseText,
  summarizeRateResults
} = require('../scripts/defillama-rate-test-utils');

const requests = buildDefaultDefiLlamaRateRequests();

assert.strictEqual(requests.length, 6, '默认应生成 6 个双向交易对请求');
assert.deepStrictEqual(
  requests.map((item) => item.label),
  [
    'cbBTC -> WBTC',
    'WBTC -> cbBTC',
    'cbBTC -> USDC',
    'USDC -> cbBTC',
    'WBTC -> USDC',
    'USDC -> WBTC'
  ]
);
assert.strictEqual(requests[0].srcToken.address, DEFILLAMA_TOKENS.CBBTC.address);
assert.strictEqual(requests[5].destToken.address, DEFILLAMA_TOKENS.WBTC.address);

const directKyber = buildDefiLlamaHttpRequest(requests[0], {
  provider: 'kyberswap',
  hideIp: false,
  userAgent: 'Mozilla/5.0 Test',
  gasPrice: '300000000'
});
assert.ok(
  directKyber.url.startsWith('https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?'),
  '关闭 hide ip 时，Kyber 应直连聚合器'
);
assert.strictEqual(directKyber.method, 'GET');
assert.strictEqual(directKyber.headers['x-client-id'], 'llamaswap');
assert.strictEqual(directKyber.headers['user-agent'], 'Mozilla/5.0 Test');
assert.strictEqual(directKyber.body, null);
const directKyberUrl = new URL(directKyber.url);
assert.strictEqual(directKyberUrl.searchParams.get('gasInclude'), 'true');

const directParaswap = buildDefiLlamaHttpRequest(requests[3], {
  provider: 'paraswap',
  hideIp: false
});
assert.ok(
  directParaswap.url.startsWith('https://apiv5.paraswap.io/prices/?'),
  '关闭 hide ip 时，ParaSwap 应直连 apiv5'
);
const directParaswapUrl = new URL(directParaswap.url);
assert.strictEqual(directParaswapUrl.searchParams.get('partner'), 'llamaswap');
assert.strictEqual(
  directParaswapUrl.searchParams.get('excludeDEXS'),
  'ParaSwapPool,ParaSwapLimitOrders'
);

const kyberSummary = summarizeResponseText(
  'kyberswap',
  JSON.stringify({ data: { routeSummary: { amountOut: '123456', gasUsd: '1.25' } } })
);
assert.strictEqual(kyberSummary, 'amountOut=123456 gasUsd=1.25');

const paraswapSummary = summarizeResponseText(
  'paraswap',
  JSON.stringify({ priceRoute: { destAmount: '654321', gasCostUSD: '0.88' } })
);
assert.strictEqual(paraswapSummary, 'destAmount=654321 gasUsd=0.88');

const summary = summarizeRateResults([
  { ok: true, status: 200, ms: 120, label: 'cbBTC -> WBTC', provider: 'paraswap' },
  { ok: false, status: 429, ms: 220, label: 'cbBTC -> WBTC', provider: 'paraswap', errorMessage: 'rate limited' },
  { ok: true, status: 200, ms: 320, label: 'USDC -> WBTC', provider: 'kyberswap' },
  { ok: false, status: 403, ms: 180, label: 'USDC -> WBTC', provider: 'kyberswap', errorMessage: 'forbidden' }
]);
assert.strictEqual(summary.total, 4);
assert.strictEqual(summary.successCount, 2);
assert.strictEqual(summary.failCount, 2);
assert.deepStrictEqual(summary.statusCount, { 200: 2, 403: 1, 429: 1 });
assert.deepStrictEqual(summary.byProvider, {
  paraswap: { total: 2, successCount: 1, failCount: 1 },
  kyberswap: { total: 2, successCount: 1, failCount: 1 }
});
assert.strictEqual(summary.byMode, undefined);
