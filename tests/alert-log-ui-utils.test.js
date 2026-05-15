const assert = require('assert');

const {
  shouldAutoOpenAlertLogEntries,
  buildAlertLogEntryDisplayState,
  buildMutedStateItemHtml,
  buildMutedStateSectionHtml,
  buildRestoredMutedAlertLogHtml
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

const restoredLogHtml = buildRestoredMutedAlertLogHtml(
  {
    logTitleSnapshot: '路径 <A>',
    summaryLinesSnapshot: ['USDC -> ETH & back'],
    mutedAt: 1000
  },
  {
    nowMs: 2000,
    targetKey: 'target"1',
    statusText: '还剩 <2 小时>'
  }
);

assert.ok(restoredLogHtml.includes('data-muted-restored="1"'));
assert.ok(restoredLogHtml.includes('data-muted-target-key="target&quot;1"'));
assert.ok(restoredLogHtml.includes('data-alert-log-collapsed="1"'));
assert.ok(restoredLogHtml.includes('路径 &lt;A&gt;'));
assert.ok(restoredLogHtml.includes('USDC -&gt; ETH &amp; back'));
assert.ok(restoredLogHtml.includes('还剩 &lt;2 小时&gt;'));

const fallbackRestoredLogHtml = buildRestoredMutedAlertLogHtml(
  { summaryLinesSnapshot: ['fallback title'] },
  { statusText: 'still muted' }
);
assert.ok(fallbackRestoredLogHtml.includes('fallback title'));
