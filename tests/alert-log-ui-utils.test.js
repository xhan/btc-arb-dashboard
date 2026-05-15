const assert = require('assert');

const {
  shouldAutoOpenAlertLogEntries,
  buildAlertLogEntryDisplayState,
  buildMutedStateItemHtml,
  buildMutedStateSectionHtml
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

const itemHtml = buildMutedStateItemHtml({
  title: 'A <B>',
  lines: ['line & one', '', null],
  status: '还剩 <1 分钟>',
  actions: [
    { label: '恢复 <now>', dataAttr: 'data-muted-restore', value: 'a"b' }
  ]
});

assert.ok(itemHtml.includes('A &lt;B&gt;'));
assert.ok(itemHtml.includes('line &amp; one'));
assert.ok(!itemHtml.includes('<div></div>'));
assert.ok(itemHtml.includes('还剩 &lt;1 分钟&gt;'));
assert.ok(itemHtml.includes('data-muted-restore="a&quot;b"'));
assert.ok(itemHtml.includes('恢复 &lt;now&gt;'));

const emptySectionHtml = buildMutedStateSectionHtml('沉默 <路径>', [], '当前为空 & 可恢复');
assert.ok(emptySectionHtml.includes('沉默 &lt;路径&gt;'));
assert.ok(emptySectionHtml.includes('当前为空 &amp; 可恢复'));

const listSectionHtml = buildMutedStateSectionHtml('屏蔽的腿', ['<div class="muted-state-item">A</div>'], '空');
assert.ok(listSectionHtml.includes('<div class="muted-state-item">A</div>'));
assert.ok(!listSectionHtml.includes('muted-state-empty'));
