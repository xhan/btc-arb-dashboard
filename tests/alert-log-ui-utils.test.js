const assert = require('assert');

const {
  shouldAutoOpenAlertLogEntries,
  buildAlertLogEntryDisplayState
} = require('../alert-log-ui-utils');

assert.strictEqual(shouldAutoOpenAlertLogEntries([]), false);
assert.strictEqual(
  shouldAutoOpenAlertLogEntries([{ mutedEntry: { expiresAt: 123 } }]),
  false
);
assert.strictEqual(
  shouldAutoOpenAlertLogEntries([{ mutedEntry: { expiresAt: 123 } }, { mutedEntry: null }]),
  true
);

assert.deepStrictEqual(
  buildAlertLogEntryDisplayState({ mutedEntry: { expiresAt: 123 } }),
  { muted: true, collapsed: true }
);

assert.deepStrictEqual(
  buildAlertLogEntryDisplayState({ mutedEntry: { expiresAt: 123 } }, { expanded: true }),
  { muted: true, collapsed: false }
);

assert.deepStrictEqual(
  buildAlertLogEntryDisplayState({ mutedEntry: null }),
  { muted: false, collapsed: false }
);
