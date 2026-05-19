const assert = require('assert');

const {
  handleQuoteRequest,
  normalizeDaemonOptions,
  normalizeQuoteBody
} = require('../scripts/defillama-browser-proxy-daemon');

assert.deepStrictEqual(normalizeDaemonOptions({}), {
  host: '127.0.0.1',
  port: 18081,
  timeoutMs: 10000,
  headless: false,
  verbose: false
});

assert.deepStrictEqual(normalizeDaemonOptions({
  port: '18082',
  timeoutMs: '12000',
  headless: true,
  verbose: true
}), {
  host: '127.0.0.1',
  port: 18082,
  timeoutMs: 12000,
  headless: true,
  verbose: true
});

assert.deepStrictEqual(
  normalizeQuoteBody({
    protocol: ' ParaSwap ',
    chain: ' ethereum ',
    fromToken: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    fromDecimals: 6,
    fromSymbol: ' USDT ',
    toToken: '0xc139190f447e929f090edeb554d95abb8b18ac1c',
    toDecimals: 18,
    toSymbol: ' USDtb ',
    amountRaw: '100000000000',
    slippage: '0.3'
  }),
  {
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
    slippage: '0.3',
    userAddress: '0x0000000000000000000000000000000000000000'
  }
);

assert.throws(
  () => normalizeQuoteBody({
    chain: 'ethereum',
    fromToken: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    fromDecimals: 6,
    amountRaw: '1'
  }),
  /缺少 toToken/
);

(async () => {
  const calls = [];
  const state = {
    inFlight: 0,
    stats: { total: 0, success: 0, fail: 0 },
    lastError: ''
  };
  const okResponse = await handleQuoteRequest({
    body: {
      chain: 'ethereum',
      fromToken: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      fromDecimals: 6,
      fromSymbol: 'USDT',
      toToken: '0xc139190f447e929f090edeb554d95abb8b18ac1c',
      toDecimals: 18,
      toSymbol: 'USDtb',
      amountRaw: '100000000000'
    },
    state,
    runQuote: async (request) => {
      calls.push(request);
      return {
        ok: true,
        status: 200,
        amountReturned: '99900000000000000000000',
        estimatedGas: '123456',
        ms: 456
      };
    }
  });

  assert.strictEqual(okResponse.statusCode, 200);
  assert.strictEqual(okResponse.payload.ok, true);
  assert.strictEqual(okResponse.payload.amountReturned, '99900000000000000000000');
  assert.strictEqual(okResponse.payload.source, 'Llama-ParaSwap');
  assert.strictEqual(state.inFlight, 0);
  assert.deepStrictEqual(state.stats, { total: 1, success: 1, fail: 0 });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].url.startsWith('https://swap-api.defillama.com/dexAggregatorQuote?'), true);
})();
