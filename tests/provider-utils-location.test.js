const assert = require('assert');

const ekuboUtils = require('../src/market-clients/providers/ekubo-utils');
const lifiUtils = require('../src/market-clients/providers/lifi-utils');
const lifiQuoteUtils = require('../src/market-clients/providers/lifi-quote-utils');

assert.strictEqual(typeof ekuboUtils.buildEkuboQuoteUrl, 'function');
assert.strictEqual(typeof lifiUtils.buildLifiChainIdMap, 'function');
assert.strictEqual(typeof lifiQuoteUtils.getDisplayedToAmountRaw, 'function');
