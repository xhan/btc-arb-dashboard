const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { buildDexLink, getDexLinkLabel } = require('../dex-link-utils');

assert.strictEqual(getDexLinkLabel({ chain: 'sui' }), 'cetus');
assert.strictEqual(getDexLinkLabel({ chain: 'solana' }), 'jup.ag');
assert.strictEqual(getDexLinkLabel({ chain: 'starknet' }), 'ekubo');
assert.strictEqual(getDexLinkLabel({ chain: 'arbitrum' }), 'swap.defillama');
assert.strictEqual(getDexLinkLabel({ chain: 'mantle' }), 'jumper');
assert.strictEqual(getDexLinkLabel({ chain: 'binance' }), null);

assert.deepStrictEqual(
  buildDexLink({
    chain: 'sui',
    fromTokenAddress: '0x2::sui::SUI',
    toTokenAddress: '0x123::usdc::USDC'
  }),
  {
    label: 'cetus',
    url: 'https://app.cetus.zone/swap/0x2%3A%3Asui%3A%3ASUI/0x123%3A%3Ausdc%3A%3AUSDC'
  }
);

assert.deepStrictEqual(
  buildDexLink({
    chain: 'solana',
    fromTokenAddress: 'So11111111111111111111111111111111111111112',
    toTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  }),
  {
    label: 'jup.ag',
    url: 'https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  }
);

assert.deepStrictEqual(
  buildDexLink({
    chain: 'starknet',
    fromTokenAddress: '0x111',
    toTokenAddress: '0x222',
    inputAmount: 1.25
  }),
  {
    label: 'ekubo',
    url: 'https://ekubo.org/swap?inputCurrency=0x111&amount=1.25&outputCurrency=0x222&chainId=0x534e5f4d41494e'
  }
);

assert.deepStrictEqual(
  buildDexLink({
    chain: 'arbitrum',
    fromTokenAddress: '0xaaa',
    toTokenAddress: '0xbbb'
  }),
  {
    label: 'swap.defillama',
    url: 'https://swap.defillama.com/?chain=arbitrum&from=0xaaa&tab=swap&to=0xbbb'
  }
);

assert.deepStrictEqual(
  buildDexLink({
    chain: 'mantle',
    fromTokenAddress: '0x779Ded0c9e1022225f8E0630b35a9b54bE713736',
    toTokenAddress: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34'
  }),
  {
    label: 'jumper',
    url: 'https://jumper.xyz/zh?fromChain=5000&fromToken=0x779Ded0c9e1022225f8E0630b35a9b54bE713736&toChain=5000&toToken=0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34'
  }
);

assert.strictEqual(
  buildDexLink({
    chain: 'Binance',
    fromTokenAddress: 'BTC',
    toTokenAddress: 'USDT'
  }),
  null
);

const browserCode = fs.readFileSync(path.join(__dirname, '..', 'dex-link-utils.js'), 'utf8');
const browserSandbox = { window: {} };
vm.createContext(browserSandbox);
assert.doesNotThrow(() => vm.runInContext(browserCode, browserSandbox));
assert.ok(browserSandbox.window.DexLinkUtils, 'expected DexLinkUtils to attach to window');
