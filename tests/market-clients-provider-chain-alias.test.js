const assert = require('assert');

const { createDefiLlamaProxyClient } = require('../src/market-clients/providers/defillama-proxy');
const { createEkuboClient } = require('../src/market-clients/providers/ekubo');
const { createKyberClient } = require('../src/market-clients/providers/kyber');
const { createLifiClient } = require('../src/market-clients/providers/lifi');
const { createVeloraClient } = require('../src/market-clients/providers/velora');
const { createZeroXClient } = require('../src/market-clients/providers/zerox');

function createEvmDeps(overrides = {}) {
  const calls = [];
  return {
    calls,
    deps: {
      getEvmProvider: (chain) => {
        calls.push(['provider', chain]);
        return chain === 'arbitrum' || chain === 'ethereum' ? { chain } : null;
      },
      getEvmTokenMeta: async (chain, token) => {
        calls.push(['meta', chain, token]);
        return { symbol: token, decimals: 6 };
      },
      toRawAmount: () => '1000000',
      fromRawAmount: () => 2,
      getConfigMore: async () => ({}),
      fetchOnce: async (url, options, requestContext) => {
        calls.push(['fetch', url, options || null, requestContext || null]);
        return {
          json: async () => ({
            code: 0,
            data: { routeSummary: { amountOut: '2000000' } },
            buyAmount: '2000000',
            priceRoute: { destAmount: '2000000' },
            ok: true,
            amountReturned: '2000000'
          })
        };
      },
      logQuoteRequest: () => {},
      logQuoteResult: () => {},
      ...overrides
    }
  };
}

async function testKyberAlias() {
  const { calls, deps } = createEvmDeps({
    getConfigMore: async () => ({ kyberClientId: 'test-client' })
  });
  const client = createKyberClient(deps);
  await client.getQuote({ chain: 'arb', fromToken: '0xfrom', toToken: '0xto', amount: 1 });
  assert.deepStrictEqual(calls.filter((call) => call[0] === 'provider'), [['provider', 'arbitrum']]);
  assert.ok(calls.some((call) => call[0] === 'fetch' && call[1].startsWith('https://aggregator-api.kyberswap.com/arbitrum/')));
}

async function testZeroXAlias() {
  const { calls, deps } = createEvmDeps();
  const client = createZeroXClient(deps);
  await client.getQuote({ chain: 'eth', fromToken: '0xfrom', toToken: '0xto', amount: 1 });
  assert.deepStrictEqual(calls.filter((call) => call[0] === 'provider'), [['provider', 'ethereum']]);
  assert.ok(calls.some((call) => call[0] === 'fetch' && call[1].includes('chainId=1')));
}

async function testVeloraAlias() {
  const { calls, deps } = createEvmDeps();
  const client = createVeloraClient(deps);
  await client.getQuote({ chain: 'arb', fromToken: '0xfrom', toToken: '0xto', amount: 1 });
  assert.deepStrictEqual(calls.filter((call) => call[0] === 'provider'), [['provider', 'arbitrum']]);
  assert.ok(calls.some((call) => call[0] === 'fetch' && call[1].includes('network=42161')));
}

async function testDefiLlamaAlias() {
  const { calls, deps } = createEvmDeps({
    getConfigMore: async () => ({ llamaParaSwapProxyUrl: 'http://127.0.0.1:18082' })
  });
  const client = createDefiLlamaProxyClient(deps);
  await client.getQuote({ chain: 'arb', fromToken: '0xfrom', toToken: '0xto', amount: 1 });
  const fetchCall = calls.find((call) => call[0] === 'fetch');
  assert.deepStrictEqual(calls.filter((call) => call[0] === 'provider'), [['provider', 'arbitrum']]);
  assert.strictEqual(JSON.parse(fetchCall[2].body).chain, 'arbitrum');
}

async function testEkuboAlias() {
  const client = createEkuboClient({
    buildEkuboQuoteResult: () => ({ source: 'Ekubo', amountOut: 2, raw_price: 2 }),
    buildEkuboQuoteUrl: () => 'https://prod-api.ekubo.org/quote',
    extractEkuboAmountOutRaw: () => '2000000',
    fetchOnce: async () => ({ json: async () => ({ total: '2000000' }) }),
    getEkuboTokenMeta: async (token) => ({ symbol: token, decimals: 6 }),
    logQuoteRequest: () => {},
    logQuoteResult: () => {},
    toRawAmount: () => '1000000'
  });
  const result = await client.getQuote({ chain: 'strk', fromToken: '0xfrom', toToken: '0xto', amount: 1 });
  assert.strictEqual(result.source, 'Ekubo');
}

async function testLifiAlias() {
  const calls = [];
  const client = createLifiClient({
    apiBaseUrl: 'https://li.quest/v1',
    defaultFromAddress: '0x1111111111111111111111111111111111111111',
    defaultSlippage: '0.0001',
    fetchOnce: async (url, options, requestContext) => {
      calls.push(['fetch', url, options || null, requestContext || null]);
      return { json: async () => ({ estimate: { toAmount: '2000000' } }) };
    },
    fromRawAmount: () => 2,
    getConfigMore: async () => ({}),
    getDisplayedToAmountRaw: (data) => data.estimate && data.estimate.toAmount,
    getLifiChainIdMap: async () => ({ arbitrum: 42161 }),
    getLifiHeaders: () => ({}),
    getLifiTokenMeta: async (chain, chainId, token) => {
      calls.push(['meta', chain, chainId, token]);
      return { symbol: token, decimals: 6 };
    },
    logQuoteRequest: (source, context) => calls.push(['request', source, context.chain, context.toChain]),
    logQuoteResult: (source, context) => calls.push(['result-log', source, context.chain, context.toChain]),
    resolveLifiChainId: (chain, chainMap) => chainMap[chain] || null,
    toRawAmount: () => '1000000'
  });

  const result = await client.getQuote({
    chain: 'arb',
    toChain: 'Arbitrum',
    fromToken: '0xfrom',
    toToken: '0xto',
    amount: 1
  });

  assert.deepStrictEqual(
    calls.filter((call) => call[0] === 'meta').map((call) => call.slice(1)),
    [
      ['arbitrum', 42161, '0xfrom'],
      ['arbitrum', 42161, '0xto']
    ]
  );
  assert.strictEqual(result.fromChain, 'arbitrum');
  assert.strictEqual(result.toChain, 'arbitrum');
  assert.strictEqual(result.isCrossChain, false);
}

Promise.resolve()
  .then(testKyberAlias)
  .then(testZeroXAlias)
  .then(testVeloraAlias)
  .then(testDefiLlamaAlias)
  .then(testEkuboAlias)
  .then(testLifiAlias)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
