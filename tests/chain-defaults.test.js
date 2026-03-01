const assert = require('assert');

const { getDefaultSourceForChain } = require('../chain-defaults');

assert.strictEqual(getDefaultSourceForChain('katana'), 'LI.FI');
assert.strictEqual(getDefaultSourceForChain('hemi'), 'LI.FI');
assert.strictEqual(getDefaultSourceForChain(' HEMI '), 'LI.FI');
assert.strictEqual(getDefaultSourceForChain('starknet'), 'Ekubo');
assert.strictEqual(getDefaultSourceForChain(' StarkNet '), 'Ekubo');
assert.strictEqual(getDefaultSourceForChain('ethereum'), 'Kyber');
assert.strictEqual(getDefaultSourceForChain('Bybit'), 'Kyber');
