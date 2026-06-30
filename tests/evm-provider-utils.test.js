const assert = require('assert');

const {
  DEFAULT_EVM_RPC_URLS,
  createEvmProviders
} = require('../src/server/evm-provider-utils');

assert.strictEqual(DEFAULT_EVM_RPC_URLS.ethereum, 'https://ethereum-rpc.publicnode.com');
assert.strictEqual(DEFAULT_EVM_RPC_URLS.arbitrum, 'https://arbitrum-one-rpc.publicnode.com');

function createLogger() {
  return {
    logs: [],
    warnings: [],
    log(...args) {
      this.logs.push(args);
    },
    warn(...args) {
      this.warnings.push(args);
    }
  };
}

function FakeProvider(url) {
  if (url === 'bad-url') {
    throw new Error('bad rpc');
  }
  this.url = url;
}

const logger = createLogger();
const providers = createEvmProviders({
  rpcUrls: {
    ethereum: 'eth-url',
    broken: 'bad-url',
    arbitrum: 'arb-url'
  },
  ProviderClass: FakeProvider,
  logger
});

assert.deepStrictEqual(Object.keys(providers), ['ethereum', 'arbitrum']);
assert.strictEqual(providers.ethereum.url, 'eth-url');
assert.strictEqual(providers.arbitrum.url, 'arb-url');
assert.deepStrictEqual(logger.warnings, [['⚠️ broken Provider 初始化失败:', 'bad rpc']]);
assert.deepStrictEqual(logger.logs, [['所有 EVM Provider 初始化尝试完成']]);
