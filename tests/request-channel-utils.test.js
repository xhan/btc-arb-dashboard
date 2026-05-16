const assert = require('assert');

const {
  DEFAULT_REQUEST_CHANNEL_ID,
  DEFAULT_INTERVALS,
  applyMultiChannelToggleButtonState,
  applyRequestChannelTagForQuote,
  applyRequestChannelTagsVisibility,
  buildMultiChannelToggleState,
  buildQueueKey,
  buildRequestChannelTagHtml,
  buildRequestChannelTagPatch,
  buildRequestChannelOptionsHtml,
  createMultiChannelToggleRuntime,
  formatMultiChannelEnabledStorageValue,
  getBrowserLocalStorage,
  getEffectiveRequestChannelIdForQuote,
  getEffectiveIntervalForQueue,
  getQueueKeyForQuote,
  getRequestChannelDisplayForQuote,
  getRequestChannelOptions,
  loadMultiChannelEnabledFromStorage,
  parseMultiChannelEnabledStorageValue,
  persistMultiChannelEnabledToStorage,
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

const multiChannelStorage = {
  values: new Map([['dashboard-multi-channel-enabled', 'false']]),
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  },
  setItem(key, value) {
    this.values.set(key, value);
  }
};
assert.strictEqual(loadMultiChannelEnabledFromStorage(multiChannelStorage), false);
assert.strictEqual(persistMultiChannelEnabledToStorage(multiChannelStorage, true), true);
assert.strictEqual(multiChannelStorage.values.get('dashboard-multi-channel-enabled'), 'true');
assert.strictEqual(loadMultiChannelEnabledFromStorage(null), true);
assert.strictEqual(persistMultiChannelEnabledToStorage(null, false), false);

let multiChannelStorageError = null;
assert.strictEqual(
  loadMultiChannelEnabledFromStorage({
    getItem() {
      throw new Error('denied');
    }
  }, {
    onError(error) {
      multiChannelStorageError = error;
    }
  }),
  true
);
assert.strictEqual(multiChannelStorageError.message, 'denied');

const multiChannelToggleClasses = new Set();
const multiChannelToggleEl = {
  textContent: '',
  title: '',
  attributes: {},
  setAttribute(name, value) {
    this.attributes[name] = value;
  },
  classList: {
    toggle(className, active) {
      if (active) multiChannelToggleClasses.add(className);
      else multiChannelToggleClasses.delete(className);
    }
  }
};
assert.strictEqual(applyMultiChannelToggleButtonState(multiChannelToggleEl, true), true);
assert.strictEqual(multiChannelToggleEl.textContent, '多渠道: 开');
assert.strictEqual(multiChannelToggleEl.attributes['aria-pressed'], 'true');
assert.strictEqual(multiChannelToggleClasses.has('active'), true);
assert.strictEqual(applyMultiChannelToggleButtonState(multiChannelToggleEl, false), true);
assert.strictEqual(multiChannelToggleEl.textContent, '多渠道: 关');
assert.strictEqual(multiChannelToggleClasses.has('active'), false);
assert.strictEqual(applyMultiChannelToggleButtonState(null, true), false);

const multiChannelRuntimeStorage = {
  values: new Map([['dashboard-multi-channel-enabled', 'false']]),
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  },
  setItem(key, value) {
    this.values.set(key, value);
  }
};
const multiChannelRuntimeButton = {
  textContent: '',
  title: '',
  attributes: {},
  setAttribute(name, value) {
    this.attributes[name] = value;
  },
  classList: {
    toggle(className, active) {
      if (active) multiChannelToggleClasses.add(className);
      else multiChannelToggleClasses.delete(className);
    }
  }
};
const multiChannelRuntime = createMultiChannelToggleRuntime({
  button: multiChannelRuntimeButton,
  storage: multiChannelRuntimeStorage
});
assert.strictEqual(multiChannelRuntime.load(), false);
assert.strictEqual(multiChannelRuntime.get(), false);
assert.strictEqual(multiChannelRuntimeButton.textContent, '多渠道: 关');
assert.deepStrictEqual(multiChannelRuntime.set(true), {
  previousEnabled: false,
  nextEnabled: true,
  changed: true
});
assert.strictEqual(multiChannelRuntimeStorage.values.get('dashboard-multi-channel-enabled'), 'true');
assert.strictEqual(multiChannelRuntimeButton.textContent, '多渠道: 开');
assert.deepStrictEqual(multiChannelRuntime.set(true), {
  previousEnabled: true,
  nextEnabled: true,
  changed: false
});

assert.strictEqual(
  buildRequestChannelTagHtml({ id: 'quote-1' }, { name: '主通道 <A>' }),
  '<span class="quote-channel-tag" id="quote-channel-tag-quote-1">主通道 &lt;A&gt;</span>'
);
assert.strictEqual(buildRequestChannelTagHtml({ id: 'quote-1' }, null), '');
assert.deepStrictEqual(
  buildRequestChannelTagPatch({ id: 'quote-1' }, { name: '主通道 <A>' }, { hasExistingTag: false }),
  {
    action: 'insert',
    html: '<span class="quote-channel-tag" id="quote-channel-tag-quote-1">主通道 &lt;A&gt;</span>'
  }
);
assert.deepStrictEqual(
  buildRequestChannelTagPatch({ id: 'quote-1' }, { name: '备用通道' }, { hasExistingTag: true }),
  {
    action: 'update',
    text: '备用通道'
  }
);
assert.deepStrictEqual(
  buildRequestChannelTagPatch({ id: 'quote-1' }, null, { hasExistingTag: true }),
  { action: 'remove' }
);
assert.strictEqual(
  buildRequestChannelTagPatch({ id: 'quote-1' }, null, { hasExistingTag: false }),
  null
);
assert.strictEqual(
  buildRequestChannelTagPatch({}, { name: '主通道' }, { hasExistingTag: false }),
  null
);

function createRequestChannelTagFixture(existingTag = null) {
  const calls = [];
  const labelEl = {
    insertAdjacentHTML(position, html) {
      calls.push(['insertAdjacentHTML', position, html]);
    }
  };
  const labelRow = {
    querySelector(selector) {
      if (selector === '.quote-label') return labelEl;
      return null;
    }
  };
  const itemEl = {
    querySelector(selector) {
      if (selector === '.quote-label-row') return labelRow;
      if (selector === '#quote-channel-tag-quote-1') return existingTag;
      return null;
    }
  };
  return { calls, existingTag, itemEl };
}

const insertedTagFixture = createRequestChannelTagFixture();
assert.strictEqual(
  applyRequestChannelTagForQuote(
    { id: 'quote-1', chain: 'ethereum', preferredSource: 'Kyber', requestChannelId: 'HK-1' },
    channels,
    { getElementById: () => insertedTagFixture.itemEl }
  ),
  true
);
assert.deepStrictEqual(insertedTagFixture.calls, [
  ['insertAdjacentHTML', 'afterend', '<span class="quote-channel-tag" id="quote-channel-tag-quote-1">HK-1</span>']
]);

const updatedExistingTag = { textContent: 'old' };
const updatedTagFixture = createRequestChannelTagFixture(updatedExistingTag);
assert.strictEqual(
  applyRequestChannelTagForQuote(
    { id: 'quote-1', chain: 'ethereum', preferredSource: 'Kyber', requestChannelId: 'HK-1' },
    channels,
    { getElementById: () => updatedTagFixture.itemEl }
  ),
  true
);
assert.strictEqual(updatedExistingTag.textContent, 'HK-1');

const removedExistingTag = {
  removed: false,
  remove() {
    this.removed = true;
  }
};
const removedTagFixture = createRequestChannelTagFixture(removedExistingTag);
assert.strictEqual(
  applyRequestChannelTagForQuote(
    { id: 'quote-1', chain: 'ethereum', preferredSource: 'Kyber', requestChannelId: 'default' },
    channels,
    { getElementById: () => removedTagFixture.itemEl }
  ),
  true
);
assert.strictEqual(removedExistingTag.removed, true);
assert.strictEqual(
  applyRequestChannelTagForQuote({ id: 'quote-1' }, channels, { getElementById: () => null }),
  false
);

const requestChannelVisibilityClasses = new Set();
const requestChannelVisibilityBody = {
  classList: {
    toggle(className, enabled) {
      if (enabled) requestChannelVisibilityClasses.add(className);
      else requestChannelVisibilityClasses.delete(className);
    }
  }
};
assert.strictEqual(applyRequestChannelTagsVisibility(requestChannelVisibilityBody, true), true);
assert.strictEqual(requestChannelVisibilityClasses.has('show-request-channel-tags'), true);
assert.strictEqual(applyRequestChannelTagsVisibility(requestChannelVisibilityBody, false), true);
assert.strictEqual(requestChannelVisibilityClasses.has('show-request-channel-tags'), false);
assert.strictEqual(applyRequestChannelTagsVisibility(null, true), false);

const browserStorage = {};
assert.strictEqual(getBrowserLocalStorage({ window: { localStorage: browserStorage } }), browserStorage);
let browserStorageError = null;
assert.strictEqual(
  getBrowserLocalStorage({
    window: Object.defineProperty({}, 'localStorage', {
      get() {
        throw new Error('blocked');
      }
    })
  }, {
    onError(error) {
      browserStorageError = error;
    }
  }),
  null
);
assert.strictEqual(browserStorageError.message, 'blocked');

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
