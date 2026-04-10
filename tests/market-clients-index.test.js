const assert = require('assert');
const fs = require('fs/promises');
const ethersModule = require('ethers');

(async () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(ethersModule.ethers, 'Contract');
  try {
    let decimalsCalls = 0;
    let symbolCalls = 0;

    class RetryableDecimalsContract {
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
      value: RetryableDecimalsContract,
      configurable: true,
      enumerable: true,
      writable: true
    });
    delete require.cache[require.resolve('../market-clients')];
    delete require.cache[require.resolve('../market-clients/index.js')];
    let { createMarketClients } = require('../market-clients');

    const retryClients = createMarketClients({
      cachePath: '/tmp/market-diff-test-metadata-cache.json',
      readJsonFile: async () => ({}),
      writeFile: fs.writeFile,
      fetchOnce: async () => {
        throw new Error('unexpected fetch');
      },
      evmProviders: { ethereum: { call: async () => '0x' } },
      getConfigMore: async () => ({}),
      solanaRpc: '',
      suiClient: { getCoinMetadata: async () => null }
    });

    const retryMeta = await retryClients.getEvmTokenMeta('ethereum', '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3');
    assert.deepStrictEqual(retryMeta, { decimals: 18, symbol: 'USDe' });
    assert.strictEqual(decimalsCalls, 2, 'CALL_EXCEPTION 后应重试 decimals');
    assert.ok(symbolCalls >= 1, '应成功读取 symbol');

    const symbolCallRequests = [];
    class SymbolFallbackContract {
      constructor() {}

      async decimals() {
        return 6;
      }

      async symbol() {
        const error = new Error('missing revert data');
        error.code = 'CALL_EXCEPTION';
        throw error;
      }
    }

    Object.defineProperty(ethersModule.ethers, 'Contract', {
      value: SymbolFallbackContract,
      configurable: true,
      enumerable: true,
      writable: true
    });
    delete require.cache[require.resolve('../market-clients')];
    delete require.cache[require.resolve('../market-clients/index.js')];
    ({ createMarketClients } = require('../market-clients'));

    const fallbackClients = createMarketClients({
      cachePath: '/tmp/market-diff-test-metadata-cache.json',
      readJsonFile: async () => ({}),
      writeFile: fs.writeFile,
      fetchOnce: async () => {
        throw new Error('unexpected fetch');
      },
      evmProviders: {
        ethereum: {
          async call(request) {
            symbolCallRequests.push(request);
            return '0x0000000000000000000000000000000000000000000000000000000000000020'
              + '0000000000000000000000000000000000000000000000000000000000000005'
              + '5553447462000000000000000000000000000000000000000000000000000000';
          }
        }
      },
      getConfigMore: async () => ({}),
      solanaRpc: '',
      suiClient: { getCoinMetadata: async () => null }
    });

    const fallbackMeta = await fallbackClients.getEvmTokenMeta('ethereum', '0xC139190F447e929f090Edeb554D95AbB8b18aC1C');
    assert.deepStrictEqual(fallbackMeta, { decimals: 6, symbol: 'USDtb' });
    assert.strictEqual(symbolCallRequests.length, 1, 'symbol 读取失败后应回退到原始 eth_call');
    assert.strictEqual(symbolCallRequests[0].data, '0x95d89b41');

    class MonadFallbackContract {
      constructor() {}

      async decimals() {
        const error = new Error('missing revert data');
        error.code = 'CALL_EXCEPTION';
        throw error;
      }

      async symbol() {
        const error = new Error('missing revert data');
        error.code = 'CALL_EXCEPTION';
        throw error;
      }
    }

    Object.defineProperty(ethersModule.ethers, 'Contract', {
      value: MonadFallbackContract,
      configurable: true,
      enumerable: true,
      writable: true
    });
    delete require.cache[require.resolve('../market-clients')];
    delete require.cache[require.resolve('../market-clients/index.js')];
    ({ createMarketClients } = require('../market-clients'));

    const monadTokenListRequests = [];
    const monadFallbackClients = createMarketClients({
      cachePath: '/tmp/market-diff-test-metadata-cache.json',
      readJsonFile: async () => ({}),
      writeFile: fs.writeFile,
      fetchOnce: async (url) => {
        monadTokenListRequests.push(url);
        return {
          async json() {
            return {
              tokens: [
                {
                  chainId: 143,
                  address: '0x10Aeaf63194db8d453d4D85a06E5eFE1dd0b5417',
                  symbol: 'wstETH',
                  decimals: 18
                }
              ]
            };
          }
        };
      },
      evmProviders: {
        monad: {
          async call() {
            const error = new Error('missing revert data');
            error.code = 'CALL_EXCEPTION';
            throw error;
          }
        }
      },
      getConfigMore: async () => ({}),
      solanaRpc: '',
      suiClient: { getCoinMetadata: async () => null }
    });

    const monadFallbackMeta = await monadFallbackClients.getEvmTokenMeta('monad', '0x10Aeaf63194db8d453d4D85a06E5eFE1dd0b5417');
    assert.deepStrictEqual(monadFallbackMeta, { decimals: 18, symbol: 'wstETH' });
    assert.strictEqual(monadTokenListRequests.length, 1, 'Monad 元数据失败后应回退到官方 token list');
    assert.strictEqual(
      monadTokenListRequests[0],
      'https://raw.githubusercontent.com/monad-crypto/token-list/main/tokenlist-mainnet.json'
    );
  } finally {
    Object.defineProperty(ethersModule.ethers, 'Contract', originalDescriptor);
    await fs.rm('/tmp/market-diff-test-metadata-cache.json', { force: true }).catch(() => {});
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
