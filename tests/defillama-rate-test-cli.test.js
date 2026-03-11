const assert = require('assert');

const {
  parseArgs,
  formatResultLine,
  runScenario
} = require('../scripts/defillama-rate-test');

assert.deepStrictEqual(
  parseArgs(['node', 'script', '-cnt', '200', '--interval-ms', '500', '--provider', 'paraswap']),
  {
    cnt: '200',
    'interval-ms': '500',
    provider: 'paraswap'
  }
);

const successLine = formatResultLine(
  {
    provider: 'paraswap',
    label: 'cbBTC -> WBTC',
    ok: true,
    status: 200,
    ms: 123,
    responseSummary: 'destAmount=99999999'
  },
  1,
  3
);
assert.match(successLine, /\[1\/3\] \| paraswap \| cbBTC -> WBTC \| OK \| status=200 \| ms=123 \| destAmount=99999999/);

const failureLine = formatResultLine(
  {
    provider: 'paraswap',
    label: 'cbBTC -> WBTC',
    ok: false,
    status: 429,
    ms: 222,
    errorMessage: 'rate limited'
  },
  2,
  3
);
assert.match(failureLine, /\[2\/3\] \| paraswap \| cbBTC -> WBTC \| FAIL \| status=429 \| ms=222 \| rate limited/);

(async () => {
  const callStarts = [];
  let inFlight = 0;
  let maxInFlight = 0;

  const results = await runScenario({
    total: 3,
    intervalMs: 40,
    timeoutMs: 1000,
    providers: ['paraswap'],
    requests: [{ label: 'cbBTC -> WBTC' }],
    userAgent: 'Mozilla/5.0 Test',
    buildRequest: () => ({ provider: 'paraswap', label: 'cbBTC -> WBTC' }),
    sendRequest: async () => {
      callStarts.push(Date.now());
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return {
        ok: true,
        status: 200,
        ms: 5,
        provider: 'paraswap',
        label: 'cbBTC -> WBTC',
        responseSummary: 'destAmount=1'
      };
    },
    logger: () => {}
  });

  assert.strictEqual(results.length, 3);
  assert.strictEqual(maxInFlight, 1, '请求应串行发送，不能并发');
  assert.ok(callStarts[1] - callStarts[0] >= 30, '相邻请求的启动时间应接近 intervalMs');
  assert.ok(callStarts[2] - callStarts[1] >= 30, '相邻请求的启动时间应接近 intervalMs');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
