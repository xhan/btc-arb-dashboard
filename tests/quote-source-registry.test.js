const assert = require('assert');

const quoteSourceRegistry = require('../src/quote/quote-source-registry');
const { DEFAULT_EVM_RPC_URLS } = require('../src/server/evm-provider-utils');

const kyber = quoteSourceRegistry.getQuoteSource('kyber');
const zerox = quoteSourceRegistry.getQuoteSourceByDisplayName('0x');

assert.strictEqual(kyber.endpoint, '/api/get-kyber-quote');
assert.strictEqual(kyber.providerKey, 'kyber');
assert.strictEqual(kyber.sourceKey, 'kyber');
assert.strictEqual(zerox.id, 'zerox');
assert.strictEqual(quoteSourceRegistry.supportsChain('kyber', 'arb'), true);
assert.strictEqual(quoteSourceRegistry.supportsChain('kyber', 'oasis'), false);
assert.throws(
  () => quoteSourceRegistry.assertProviderRegistry({ kyber: {} }),
  /Missing quote providers:/
);
const providerRegistry = Object.fromEntries(
  quoteSourceRegistry.QUOTE_SOURCES.map((source) => [source.providerKey, {}])
);
assert.strictEqual(quoteSourceRegistry.assertProviderRegistry(providerRegistry), providerRegistry);

for (const chain of kyber.supportedChains) {
  assert.ok(DEFAULT_EVM_RPC_URLS[chain], `Kyber 支持链 ${chain} 必须配置 EVM RPC`);
}

assert.deepStrictEqual(quoteSourceRegistry.buildDefaultIntervals(), {
  kyber: 170,
  zerox: 110,
  velora: 700,
  llamaparaswap: 800,
  lifi: 170,
  bybit: 1000,
  binance: 1000,
  solana: 3500,
  sui: 500,
  starknet: 1000
});
assert.deepStrictEqual(quoteSourceRegistry.getChannelAwareSourceKeys(), [
  'kyber', 'zerox', 'velora', 'llamaparaswap', 'lifi', 'solana', 'starknet'
]);
assert.strictEqual(
  quoteSourceRegistry.resolveQueueSourceKeyForQuote({ chain: 'base', preferredSource: 'Velora' }),
  'velora'
);
assert.strictEqual(
  quoteSourceRegistry.resolveQueueSourceKeyForQuote({ chain: 'solana', preferredSource: 'Auto' }),
  'solana'
);
assert.strictEqual(
  quoteSourceRegistry.resolveQueueSourceKeyForQuote({ chain: 'base', toChain: 'arbitrum' }),
  'lifi'
);
