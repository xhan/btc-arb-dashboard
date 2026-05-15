const assert = require('assert');

const {
  buildQuoteStrategy,
  getDefaultSourceForChain,
  isCexOrderbookChain,
  isCrossChainQuote,
  isEvmChain,
  normalizeChain
} = require('../chain-defaults');

assert.strictEqual(normalizeChain(' Ethereum '), 'ethereum');
assert.strictEqual(isEvmChain('ethereum'), true);
assert.strictEqual(isEvmChain('solana'), false);
assert.strictEqual(isCexOrderbookChain(' Bybit '), true);
assert.strictEqual(isCexOrderbookChain('ethereum'), false);
assert.strictEqual(isCrossChainQuote({ chain: 'arbitrum', toChain: 'ethereum' }), true);
assert.strictEqual(isCrossChainQuote({ chain: 'arbitrum', toChain: ' Arbitrum ' }), false);

assert.strictEqual(getDefaultSourceForChain('katana'), 'LI.FI');
assert.strictEqual(getDefaultSourceForChain('hemi'), 'LI.FI');
assert.strictEqual(getDefaultSourceForChain(' HEMI '), 'LI.FI');
assert.strictEqual(getDefaultSourceForChain('starknet'), 'Ekubo');
assert.strictEqual(getDefaultSourceForChain(' StarkNet '), 'Ekubo');
assert.strictEqual(getDefaultSourceForChain('ethereum'), 'Kyber');
assert.strictEqual(getDefaultSourceForChain('megaeth'), 'Kyber');
assert.strictEqual(getDefaultSourceForChain('Bybit'), 'Bybit');
assert.strictEqual(getDefaultSourceForChain(' Binance '), 'Binance');

assert.deepStrictEqual(buildQuoteStrategy({ chain: 'arbitrum', toChain: 'ethereum' }), ['LI.FI']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'ethereum', preferredSource: 'Auto' }), ['Kyber', '0x', 'Kyber']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'ethereum', preferredSource: '0x' }), ['0x', '0x']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'ethereum', preferredSource: 'Velora' }), ['Velora', 'Velora']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'ethereum', preferredSource: 'LI.FI' }), ['LI.FI', 'LI.FI']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'ethereum' }), ['Kyber', 'Kyber']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'sui' }), ['Cetus']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'solana' }), ['Jupiter']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'starknet' }), ['Ekubo']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'Bybit' }), ['Bybit']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'Binance' }), ['Binance']);
