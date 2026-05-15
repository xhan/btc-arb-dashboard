const assert = require('assert');

const {
  buildQuoteStrategy,
  CHAIN_DISPLAY_NAMES,
  getDefaultSourceForChain,
  getChainDisplayName,
  isCexOrderbookChain,
  isCrossChainQuote,
  isEvmChain,
  normalizeChain,
  normalizeChainFilterToken
} = require('../chain-defaults');

assert.strictEqual(normalizeChain(' Ethereum '), 'ethereum');
assert.strictEqual(CHAIN_DISPLAY_NAMES.ethereum, 'ETH');
assert.strictEqual(getChainDisplayName('ethereum'), 'ETH');
assert.strictEqual(getChainDisplayName(' Ethereum '), 'ETH');
assert.strictEqual(getChainDisplayName('Bybit'), 'Bybit');
assert.strictEqual(getChainDisplayName('unknown'), 'unknown');
assert.strictEqual(normalizeChainFilterToken('ETH'), 'ethereum');
assert.strictEqual(normalizeChainFilterToken('Arbitrum'), 'arbitrum');
assert.strictEqual(normalizeChainFilterToken('MEGA'), 'megaeth');
assert.strictEqual(normalizeChainFilterToken('Bybit'), 'Bybit');
assert.strictEqual(normalizeChainFilterToken(''), '');
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
