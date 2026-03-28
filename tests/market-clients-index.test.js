const assert = require('assert');
const fs = require('fs/promises');
const ethersModule = require('ethers');

(async () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(ethersModule.ethers, 'Contract');
  let decimalsCalls = 0;
  let symbolCalls = 0;

  class FakeContract {
    constructor() {}

    async decimals() {
      decimalsCalls += 1;
      if (decimalsCalls === 1) {
        const error = new Error('missing revert data');
        error.code = 'CALL_EXCEPTION';
        throw error;
      }
      return 18;
    }

    async symbol() {
      symbolCalls += 1;
      return 'USDe';
    }
  }

  Object.defineProperty(ethersModule.ethers, 'Contract', {
    value: FakeContract,
    configurable: true,
    enumerable: true,
    writable: true
  });
  delete require.cache[require.resolve('../market-clients')];
  delete require.cache[require.resolve('../market-clients/index.js')];
  const { createMarketClients } = require('../market-clients');

  try {
    const clients = createMarketClients({
      cachePath: '/tmp/market-diff-test-metadata-cache.json',
      readJsonFile: async () => ({}),
      writeFile: fs.writeFile,
      fetchOnce: async () => {
        throw new Error('unexpected fetch');
      },
      evmProviders: { ethereum: {} },
      getConfigMore: async () => ({}),
      solanaRpc: '',
      suiClient: { getCoinMetadata: async () => null }
    });

    const meta = await clients.getEvmTokenMeta('ethereum', '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3');
    assert.deepStrictEqual(meta, { decimals: 18, symbol: 'USDe' });
    assert.strictEqual(decimalsCalls, 2, 'CALL_EXCEPTION 后应重试 decimals');
    assert.ok(symbolCalls >= 1, '应成功读取 symbol');
  } finally {
    Object.defineProperty(ethersModule.ethers, 'Contract', originalDescriptor);
    await fs.rm('/tmp/market-diff-test-metadata-cache.json', { force: true }).catch(() => {});
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
