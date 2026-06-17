const assert = require('assert');

const {
  buildQuoteStrategy,
  CHAIN_DISPLAY_NAMES,
  buildQuoteChainDisplayName,
  getDefaultSourceForChain,
  getChainDisplayName,
  isCexOrderbookChain,
  isCrossChainQuote,
  isEvmChain,
  normalizeChain,
  normalizeChainFilterToken
} = require('../src/shared/chain-defaults');

assert.strictEqual(normalizeChain(' Ethereum '), 'ethereum');
assert.strictEqual(CHAIN_DISPLAY_NAMES.ethereum, 'eth');
assert.strictEqual(CHAIN_DISPLAY_NAMES.arbitrum, 'arb');
assert.strictEqual(getChainDisplayName('ethereum'), 'eth');
assert.strictEqual(getChainDisplayName(' Ethereum '), 'eth');
assert.strictEqual(getChainDisplayName('Bybit'), 'bybit');
assert.strictEqual(getChainDisplayName('unknown'), 'unknown');
assert.strictEqual(buildQuoteChainDisplayName(null), '');
assert.strictEqual(buildQuoteChainDisplayName({ chain: 'arbitrum' }), 'arb');
assert.strictEqual(buildQuoteChainDisplayName({ chain: 'arbitrum', toChain: ' Arbitrum ' }), 'arb');
assert.strictEqual(buildQuoteChainDisplayName({ chain: 'arbitrum', toChain: 'ethereum' }), 'arb -> eth');
assert.strictEqual(buildQuoteChainDisplayName({ chain: 'unknown', toChain: 'ethereum' }), 'unknown -> eth');
assert.strictEqual(normalizeChainFilterToken('ETH'), 'ethereum');
assert.strictEqual(normalizeChainFilterToken('eth'), 'ethereum');
assert.strictEqual(normalizeChainFilterToken('ARB'), 'arbitrum');
assert.strictEqual(normalizeChainFilterToken('arb'), 'arbitrum');
assert.strictEqual(normalizeChainFilterToken('Arbitrum'), 'arbitrum');
assert.strictEqual(normalizeChainFilterToken('MEGA'), 'megaeth');
assert.strictEqual(normalizeChainFilterToken('Bybit'), 'bybit');
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
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'ethereum', preferredSource: 'Llama-ParaSwap' }), ['Llama-ParaSwap', 'Llama-ParaSwap']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'ethereum' }), ['Kyber', 'Kyber']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'sui' }), ['Cetus']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'solana' }), ['Jupiter']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'starknet' }), ['Ekubo']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'Bybit' }), ['Bybit']);
assert.deepStrictEqual(buildQuoteStrategy({ chain: 'Binance' }), ['Binance']);
