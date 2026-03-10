const assert = require('assert');

const ekuboUtils = require('../market-clients/providers/ekubo-utils');
const lifiUtils = require('../market-clients/providers/lifi-utils');
const lifiQuoteUtils = require('../market-clients/providers/lifi-quote-utils');

assert.strictEqual(typeof ekuboUtils.buildEkuboQuoteUrl, 'function');
assert.strictEqual(typeof lifiUtils.buildLifiChainIdMap, 'function');
assert.strictEqual(typeof lifiQuoteUtils.getDisplayedToAmountRaw, 'function');
