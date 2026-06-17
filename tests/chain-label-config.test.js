const assert = require('assert');

const {
  CHAIN_LABEL_CONFIG,
  buildChainSearchText,
  getChainLabel,
  getChainSearchAliases,
  normalizeChainKey,
  normalizeChainSearchToken
} = require('../src/shared/chain-label-config');

assert.strictEqual(CHAIN_LABEL_CONFIG.arbitrum.label, 'arb');
assert.deepStrictEqual(getChainSearchAliases('arbitrum'), ['arbitrum', 'arb']);
assert.deepStrictEqual(getChainSearchAliases(' Arb '), ['arbitrum', 'arb']);
assert.strictEqual(getChainLabel('arbitrum'), 'arb');
assert.strictEqual(getChainLabel('ethereum'), 'eth');
assert.strictEqual(getChainLabel('Bybit'), 'bybit');
assert.strictEqual(getChainLabel('unknown'), 'unknown');
assert.strictEqual(normalizeChainKey(' Arbitrum '), 'arbitrum');
assert.strictEqual(normalizeChainSearchToken('ARB'), 'arbitrum');
assert.strictEqual(normalizeChainSearchToken('arbitrum'), 'arbitrum');
assert.strictEqual(normalizeChainSearchToken('Bybit'), 'bybit');
assert.strictEqual(normalizeChainSearchToken('missing'), '');
assert.strictEqual(buildChainSearchText('arbitrum'), 'arbitrum arb');
