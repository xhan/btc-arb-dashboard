const assert = require('assert');

const {
  DEFAULT_REQUEST_CHANNEL_ID,
  DEFAULT_INTERVALS,
  buildQueueKey,
  getEffectiveRequestChannelIdForQuote,
  getEffectiveIntervalForQueue,
  getQueueKeyForQuote,
  getRequestChannelDisplayForQuote,
  getQueueSourceKeyForQuote,
  getRequestChannelOptions,
  resolveRequestChannelIdForQuote,
  supportsRequestChannelForQuote
} = require('../request-channel-utils');

const channels = getRequestChannelOptions({
  channels: [
    {
      id: 'HK-1',
      name: 'HK-1',
      intervals: {
        kyber: 120,
        solana: 2400
      }
    }
  ]
});

assert.strictEqual(DEFAULT_REQUEST_CHANNEL_ID, 'default');
assert.strictEqual(channels.channels[0].id, 'default');
assert.strictEqual(channels.channels[1].id, 'HK-1');

assert.strictEqual(
  getQueueSourceKeyForQuote({ chain: 'ethereum', preferredSource: 'Kyber' }),
  'kyber'
);
assert.strictEqual(
  getQueueSourceKeyForQuote({ chain: 'arbitrum', toChain: 'ethereum', preferredSource: 'Kyber' }),
  'lifi'
);
assert.strictEqual(
  getQueueSourceKeyForQuote({ chain: 'ethereum', preferredSource: '0x' }),
  'zerox'
);
assert.strictEqual(
  getQueueSourceKeyForQuote({ chain: 'solana', preferredSource: 'Jupiter' }),
  'solana'
);

assert.strictEqual(
  supportsRequestChannelForQuote({ chain: 'ethereum', preferredSource: 'Kyber' }),
  true
);
assert.strictEqual(
  supportsRequestChannelForQuote({ chain: 'sui', preferredSource: 'Cetus' }),
  false
);
assert.strictEqual(
  supportsRequestChannelForQuote({ chain: 'Bybit', preferredSource: 'Bybit' }),
  false
);

assert.strictEqual(
  resolveRequestChannelIdForQuote(
    { chain: 'ethereum', preferredSource: 'Kyber', requestChannelId: 'hk-1' },
    channels
  ),
  'default'
);
assert.strictEqual(
  resolveRequestChannelIdForQuote(
    { chain: 'ethereum', preferredSource: 'Kyber', requestChannelId: 'HK-1' },
    channels
  ),
  'HK-1'
);
assert.strictEqual(
  resolveRequestChannelIdForQuote(
    { chain: 'ethereum', preferredSource: 'Kyber', requestChannelId: 'missing' },
    channels
  ),
  DEFAULT_REQUEST_CHANNEL_ID
);
assert.strictEqual(
  resolveRequestChannelIdForQuote(
    { chain: 'sui', preferredSource: 'Cetus', requestChannelId: 'hk-1' },
    channels
  ),
  DEFAULT_REQUEST_CHANNEL_ID
);
assert.strictEqual(
  getEffectiveRequestChannelIdForQuote(
    { chain: 'ethereum', preferredSource: 'Kyber', requestChannelId: 'HK-1' },
    channels
  ),
  'HK-1'
);
assert.strictEqual(
  getEffectiveRequestChannelIdForQuote(
    { chain: 'ethereum', preferredSource: 'Kyber', requestChannelId: 'HK-1' },
    channels,
    { multiChannelEnabled: false }
  ),
  DEFAULT_REQUEST_CHANNEL_ID
);
assert.strictEqual(
  getQueueKeyForQuote(
    { chain: 'ethereum', preferredSource: 'Kyber', requestChannelId: 'HK-1' },
    channels,
    { multiChannelEnabled: false }
  ),
  'kyber:default'
);

assert.strictEqual(
  getRequestChannelDisplayForQuote(
    { chain: 'ethereum', preferredSource: 'Kyber', requestChannelId: 'HK-1' },
    channels
  ).name,
  'HK-1'
);
assert.strictEqual(
  getRequestChannelDisplayForQuote(
    { chain: 'ethereum', preferredSource: 'Kyber', requestChannelId: 'default' },
    channels
  ),
  null
);
assert.strictEqual(
  getRequestChannelDisplayForQuote(
    { chain: 'sui', preferredSource: 'Cetus', requestChannelId: 'HK-1' },
    channels
  ),
  null
);

assert.strictEqual(buildQueueKey('kyber', 'HK-1'), 'kyber:HK-1');
assert.strictEqual(buildQueueKey('kyber', DEFAULT_REQUEST_CHANNEL_ID), 'kyber:default');
assert.strictEqual(buildQueueKey('sui', 'hk-1'), 'sui');

assert.strictEqual(
  getEffectiveIntervalForQueue('kyber:HK-1', DEFAULT_INTERVALS, channels),
  120
);
assert.strictEqual(
  getEffectiveIntervalForQueue('solana:HK-1', DEFAULT_INTERVALS, channels),
  2400
);
assert.strictEqual(
  getEffectiveIntervalForQueue('zerox:HK-1', DEFAULT_INTERVALS, channels),
  DEFAULT_INTERVALS.zerox
);
assert.strictEqual(
  getEffectiveIntervalForQueue('sui', DEFAULT_INTERVALS, channels),
  DEFAULT_INTERVALS.sui
);
