const assert = require('assert');

const {
  buildKyberUrlsFromQuotes,
  normalizeUrlList
} = require('../scripts/kyber-url-list');

const metadataCache = {
  'ethereum-0xaaa': { decimals: 8 },
  'ethereum-0xbbb': { decimals: 18 },
  'arbitrum-0x111': { decimals: 6 },
  'arbitrum-0x222': { decimals: 18 }
};

const quotes = [
  {
    chain: 'ethereum',
    amount: 1,
    fromToken: '0xAAA',
    toToken: '0xBBB',
    preferredSource: 'Kyber',
    showInverse: true
  },
  {
    chain: 'solana',
    amount: 1,
    fromToken: 'So111',
    toToken: 'USDC',
    preferredSource: 'Kyber',
    showInverse: true
  },
  {
    chain: 'arbitrum',
    amount: 2.5,
    fromToken: '0x111',
    toToken: '0x222',
    preferredSource: '0x',
    showInverse: true
  }
];

const urls = buildKyberUrlsFromQuotes(quotes, metadataCache, { includeInverse: true });
assert.strictEqual(urls.length, 2, '只应为可用的 Kyber EVM quote 生成正反向 URL');
assert.strictEqual(
  urls[0],
  'https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?tokenIn=0xAAA&tokenOut=0xBBB&amountIn=100000000'
);
assert.strictEqual(
  urls[1],
  'https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?tokenIn=0xBBB&tokenOut=0xAAA&amountIn=1000000000000000000'
);

assert.deepStrictEqual(
  normalizeUrlList(['', ' https://a ', 'https://a', null, 'https://b ']),
  ['https://a', 'https://b']
);

