const assert = require('assert');

const {
  DEFAULT_REQUEST_CHANNEL_ID,
  DEFAULT_INTERVALS,
  buildMultiChannelToggleState,
  buildQueueKey,
  buildRequestChannelOptionsHtml,
  formatMultiChannelEnabledStorageValue,
  getEffectiveRequestChannelIdForQuote,
  getEffectiveIntervalForQueue,
  getQueueKeyForQuote,
  getRequestChannelDisplayForQuote,
  getRequestChannelOptions,
  parseMultiChannelEnabledStorageValue,
  resolveRequestChannelIdForQuote,
  supportsRequestChannelForQuote
} = require('../src/request-channel/request-channel-utils');

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
assert.deepStrictEqual(
  buildMultiChannelToggleState(true),
  {
    text: '多渠道: 开',
    title: '已开启多渠道，点击后临时并入默认渠道',
    ariaPressed: 'true',
    active: true
  }
);
assert.deepStrictEqual(
  buildMultiChannelToggleState(false),
  {
    text: '多渠道: 关',
    title: '已关闭多渠道，点击后恢复按交易对渠道请求',
    ariaPressed: 'false',
    active: false
  }
);
assert.strictEqual(parseMultiChannelEnabledStorageValue(null), true);
assert.strictEqual(parseMultiChannelEnabledStorageValue(null, false), false);
assert.strictEqual(parseMultiChannelEnabledStorageValue('false'), false);
assert.strictEqual(parseMultiChannelEnabledStorageValue('true'), true);
assert.strictEqual(parseMultiChannelEnabledStorageValue('unexpected'), true);
assert.strictEqual(formatMultiChannelEnabledStorageValue(true), 'true');
assert.strictEqual(formatMultiChannelEnabledStorageValue(false), 'false');

assert.strictEqual(
  getQueueKeyForQuote({ chain: 'ethereum', preferredSource: 'Kyber' }, channels),
  'kyber:default'
);
assert.strictEqual(
  getQueueKeyForQuote({ chain: 'arbitrum', toChain: 'ethereum', preferredSource: 'Kyber' }, channels),
  'lifi:default'
);
assert.strictEqual(
  getQueueKeyForQuote({ chain: 'ethereum', preferredSource: '0x' }, channels),
  'zerox:default'
);
assert.strictEqual(
  getQueueKeyForQuote({ chain: 'solana', preferredSource: 'Jupiter' }, channels),
  'solana:default'
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
  buildRequestChannelOptionsHtml([
    { id: 'default', name: '默认 <通道>', isDefault: true },
    { id: 'HK-1', name: 'HK & 1', isDefault: false }
  ]),
  '<option value="default">默认 &lt;通道&gt; (默认)</option><option value="HK-1">HK &amp; 1</option>'
);

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
