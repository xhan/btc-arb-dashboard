const assert = require('assert');

const {
  EKUBO_STARKNET_CHAIN_ID,
  EKUBO_STARKNET_QUOTER_CHAIN_ID,
  buildEkuboQuoteUrl,
  extractEkuboAmountOutRaw,
  buildEkuboQuoteResult
} = require('../ekubo-utils');

assert.strictEqual(EKUBO_STARKNET_CHAIN_ID, '0x534e5f4d41494e');
assert.strictEqual(EKUBO_STARKNET_QUOTER_CHAIN_ID, '23448594291968334');

assert.strictEqual(
  buildEkuboQuoteUrl({
    amountInRaw: '100000000',
    fromToken: '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac',
    toToken: '0x036834a40984312f7f7de8d31e3f6305b325389eaeea5b1c0664b2fb936461a4'
  }),
  'https://prod-api-quoter.ekubo.org/23448594291968334/100000000/0x3fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac/0x36834a40984312f7f7de8d31e3f6305b325389eaeea5b1c0664b2fb936461a4'
);

const amountOutRaw = extractEkuboAmountOutRaw({
  total_calculated: '99571357',
  estimated_gas_cost: 4000000,
  price_impact: 0.000036503817229775625
});

assert.strictEqual(amountOutRaw, '99571357');

const quote = buildEkuboQuoteResult({
  amount: 1,
  amountOutRaw,
  toMeta: { symbol: 'LBTC', decimals: 8 },
  fromMeta: { symbol: 'WBTC' }
});

assert.strictEqual(quote.fromSymbol, 'WBTC');
assert.strictEqual(quote.toSymbol, 'LBTC');
assert.strictEqual(quote.amountOut, 0.99571357);
assert.strictEqual(quote.raw_price, 0.99571357);
assert.strictEqual(quote.source, 'Ekubo');

const quoteWithMissingAmount = buildEkuboQuoteResult({
  amountOutRaw,
  toMeta: { symbol: 'LBTC', decimals: 8 },
  fromMeta: { symbol: 'WBTC' }
});

assert.strictEqual(quoteWithMissingAmount.amountOut, 0.99571357);
assert.strictEqual(quoteWithMissingAmount.raw_price, 0.99571357);

assert.throws(
  () => extractEkuboAmountOutRaw({ total_calculated: '0' }),
  /Ekubo 未返回有效报价/
);
