const assert = require('assert');

const {
  createTokenMetaStore,
  fromRawAmount,
  normalizeTokenMetaCacheKey,
  toRawAmount
} = require('../market-clients/token-meta');

(async () => {
  const writes = [];
  let readCalls = 0;
  const store = createTokenMetaStore({
    cachePath: 'metadata-cache.json',
    readJsonFile: async () => {
      readCalls += 1;
      return {
        'ethereum-0xAbCd': { symbol: 'WBTC', decimals: 8 }
      };
    },
    writeFile: async (filePath, content) => {
      writes.push({ filePath, content });
    }
  });

  assert.strictEqual(
    normalizeTokenMetaCacheKey(' Ethereum ', '0xAbCd'),
    'ethereum-0xabcd'
  );
  assert.strictEqual(
    normalizeTokenMetaCacheKey('solana', 'So11111111111111111111111111111111111111112'),
    'solana-So11111111111111111111111111111111111111112'
  );

  await store.load();
  assert.strictEqual(readCalls, 1);
  assert.deepStrictEqual(
    store.get('ethereum', '0xabcd'),
    { symbol: 'WBTC', decimals: 8 }
  );

  let loaderCalls = 0;
  const hit = await store.remember('ethereum', '0xABCD', async () => {
    loaderCalls += 1;
    return { symbol: 'FAIL', decimals: 18 };
  });
  assert.deepStrictEqual(hit, { symbol: 'WBTC', decimals: 8 });
  assert.strictEqual(loaderCalls, 0);

  const miss = await store.remember('base', '0x1234', async () => {
    loaderCalls += 1;
    return { symbol: 'USDC', decimals: 6 };
  });
  assert.deepStrictEqual(miss, { symbol: 'USDC', decimals: 6 });
  assert.strictEqual(loaderCalls, 1);
  assert.strictEqual(writes.length, 1);
  assert.strictEqual(writes[0].filePath, 'metadata-cache.json');
  assert.ok(writes[0].content.includes('"base-0x1234"'));

  let concurrentWriteDetected = false;
  let activeWrites = 0;
  const concurrentStore = createTokenMetaStore({
    cachePath: 'metadata-cache.json',
    readJsonFile: async () => ({}),
    writeFile: async () => {
      activeWrites += 1;
      if (activeWrites > 1) {
        concurrentWriteDetected = true;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
      activeWrites -= 1;
    }
  });
  await Promise.all([
    concurrentStore.remember('ethereum', '0x1111', async () => ({ symbol: 'AAA', decimals: 18 })),
    concurrentStore.remember('ethereum', '0x2222', async () => ({ symbol: 'BBB', decimals: 18 }))
  ]);
  assert.strictEqual(concurrentWriteDetected, false, 'cache 写入应串行，避免 JSON 文件被并发写坏');

  assert.strictEqual(toRawAmount('1.5', 6), '1500000');
  assert.strictEqual(fromRawAmount('1500000', 6), 1.5);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
