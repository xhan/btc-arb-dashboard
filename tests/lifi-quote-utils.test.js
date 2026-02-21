const assert = require('assert');

const { getDisplayedToAmountRaw } = require('../lifi-quote-utils');

const quoteWithProtocolFee = {
  action: {
    fromAmount: '100000000'
  },
  estimate: {
    toAmount: '99217947'
  },
  includedSteps: [
    {
      type: 'protocol',
      tool: 'feeCollection',
      action: { fromAmount: '100000000' },
      estimate: { toAmount: '99750000' }
    },
    {
      type: 'swap',
      tool: 'sushiswap',
      action: { fromAmount: '99750000' },
      estimate: { toAmount: '99217947' }
    }
  ]
};

const quoteWithoutProtocolFee = {
  action: {
    fromAmount: '100000000'
  },
  estimate: {
    toAmount: '99466538'
  },
  includedSteps: [
    {
      type: 'swap',
      tool: 'sushiswap',
      action: { fromAmount: '100000000' },
      estimate: { toAmount: '99466538' }
    }
  ]
};

assert.strictEqual(
  getDisplayedToAmountRaw(quoteWithProtocolFee),
  '99466613'
);

assert.strictEqual(
  getDisplayedToAmountRaw(quoteWithoutProtocolFee),
  '99466538'
);

assert.strictEqual(
  getDisplayedToAmountRaw({ estimate: { toAmount: '123' } }),
  '123'
);
