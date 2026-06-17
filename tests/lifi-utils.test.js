const assert = require('assert');

const { buildLifiChainIdMap, resolveLifiChainId } = require('../src/market-clients/providers/lifi-utils');

const sampleChains = [
  {
    key: 'eth',
    name: 'Ethereum',
    id: 1,
    metamask: { chainName: 'Ethereum Mainnet' }
  },
  {
    key: 'kat',
    name: 'Katana',
    id: 747474,
    metamask: { chainName: 'Katana' }
  },
  {
    key: 'meg',
    name: 'MegaETH',
    id: 4326,
    metamask: { chainName: 'MegaETH' }
  },
  {
    key: 'arbitrum',
    name: 'Arbitrum',
    id: 42161,
    metamask: { chainName: 'Arbitrum One' }
  }
];

const chainMap = buildLifiChainIdMap(sampleChains);

assert.strictEqual(resolveLifiChainId('ethereum', chainMap), 1);
assert.strictEqual(resolveLifiChainId('eth', chainMap), 1);
assert.strictEqual(resolveLifiChainId('katana', chainMap), 747474);
assert.strictEqual(resolveLifiChainId('kat', chainMap), 747474);
assert.strictEqual(resolveLifiChainId('  KaTaNa  ', chainMap), 747474);
assert.strictEqual(resolveLifiChainId('megaeth', chainMap), 4326);
assert.strictEqual(resolveLifiChainId('meg', chainMap), 4326);
assert.strictEqual(resolveLifiChainId('arb', chainMap), 42161);
assert.strictEqual(resolveLifiChainId('unknown', chainMap), null);
