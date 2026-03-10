const assert = require('assert');

const {
  buildPriceUrl,
  buildDefaultQuoteRequests,
  formatRequestAmountDisplay,
  summarizeResults
} = require('../scripts/velora-market-api');

const requests = buildDefaultQuoteRequests();

assert.strictEqual(requests.length, 8, '默认应生成 8 个双向交易对请求');
assert.strictEqual(requests[0].chainId, 1);
assert.strictEqual(requests[0].side, 'SELL');

const firstUrl = buildPriceUrl(requests[0]);
assert.ok(firstUrl.startsWith('https://api.paraswap.io/prices/?'));
assert.ok(firstUrl.includes('version=6.2'));
assert.ok(firstUrl.includes('srcToken='));
assert.ok(firstUrl.includes('destToken='));
const optionUrl = new URL(buildPriceUrl(requests[0], {
  partner: 'xh-dashboard',
  includeDEXS: ['UniswapV3', 'SushiSwap'],
  otherExchangePrices: true
}));
assert.strictEqual(optionUrl.searchParams.get('partner'), 'xh-dashboard');
assert.strictEqual(optionUrl.searchParams.get('includeDEXS'), 'UniswapV3,SushiSwap');
assert.strictEqual(optionUrl.searchParams.get('otherExchangePrices'), 'true');
assert.strictEqual(requests[2].destToken.address, requests[2].destToken.address.toLowerCase());
assert.strictEqual(requests[4].srcToken.address, requests[4].srcToken.address.toLowerCase());
assert.strictEqual(formatRequestAmountDisplay(requests[4]), '0.1 WBTC -> USDC');
assert.strictEqual(formatRequestAmountDisplay(requests[1]), '1,000 USDT -> ETH');

const summary = summarizeResults([
  { ok: true, ms: 100, label: 'ETH -> USDT' },
  { ok: false, ms: 220, label: 'ETH -> USDT' },
  { ok: true, ms: 300, label: 'USDC -> ETH' },
  { ok: true, ms: 500, label: 'WBTC -> USDT' }
]);

assert.strictEqual(summary.total, 4);
assert.strictEqual(summary.successCount, 3);
assert.strictEqual(summary.successRate, 0.75);
assert.strictEqual(summary.successAvgMs, 300);
assert.deepStrictEqual(summary.labelShare, [
  { label: 'ETH -> USDT', count: 2, ratio: 0.5 },
  { label: 'USDC -> ETH', count: 1, ratio: 0.25 },
  { label: 'WBTC -> USDT', count: 1, ratio: 0.25 }
]);
