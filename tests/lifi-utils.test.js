const assert = require('assert');

const { buildLifiChainIdMap, resolveLifiChainId } = require('../lifi-utils');

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
  }
];

const chainMap = buildLifiChainIdMap(sampleChains);

assert.strictEqual(resolveLifiChainId('ethereum', chainMap), 1);
assert.strictEqual(resolveLifiChainId('eth', chainMap), 1);
assert.strictEqual(resolveLifiChainId('katana', chainMap), 747474);
assert.strictEqual(resolveLifiChainId('kat', chainMap), 747474);
assert.strictEqual(resolveLifiChainId('  KaTaNa  ', chainMap), 747474);
assert.strictEqual(resolveLifiChainId('unknown', chainMap), null);
