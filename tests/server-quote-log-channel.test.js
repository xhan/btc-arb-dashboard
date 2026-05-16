const assert = require('assert');

const {
  createQuoteLogger,
  getQuoteLogChannelLabel,
  getQuoteLogPairLabel,
  withQuoteLogRequestChannel
} = require('../src/server/quote-log-utils');

assert.strictEqual(
  getQuoteLogPairLabel('base', 'GHO', '', '0xfrom', '0xabcdef1234567890'),
  'base GHO/0xabcd...7890'
);

assert.strictEqual(getQuoteLogChannelLabel({ channelId: 'HK-1', channelName: '香港 1' }), '香港 1/HK-1');
assert.strictEqual(getQuoteLogChannelLabel({ channelId: 'default', channelName: 'default' }), 'default');
assert.strictEqual(getQuoteLogChannelLabel({}), 'default');

assert.deepStrictEqual(
  withQuoteLogRequestChannel(
    { chain: 'base' },
    { requestContext: { channelId: 'HK-1', channelName: '香港 1' } }
  ),
  { chain: 'base', channelId: 'HK-1', channelName: '香港 1' }
);

const logMessages = [];
const verboseMessages = [];
const logger = createQuoteLogger({
  logMessage: (...args) => logMessages.push(args),
  verboseLog: (...args) => verboseMessages.push(args)
});

logger.logQuoteRequest('KYBER', {
  chain: 'base',
  fromSymbol: 'GHO',
  toSymbol: 'USDC',
  amount: 2,
  url: 'https://quote.example'
});
assert.deepStrictEqual(verboseMessages[0], ['KYBER_REQ', 'base GHO/USDC amount=2 url=https://quote.example']);

logger.logQuoteError('KYBER', {
  chain: 'base',
  fromSymbol: 'GHO',
  toSymbol: 'USDC',
  channelId: 'HK-1',
  channelName: '香港 1'
}, new Error('quote failed'));
assert.deepStrictEqual(logMessages[0], ['KYBER_ERR', '[channel=香港 1/HK-1] base GHO/USDC quote failed', 'warn']);
