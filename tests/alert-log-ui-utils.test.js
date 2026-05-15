const assert = require('assert');

const {
  shouldAutoOpenAlertLogEntries,
  buildAlertLogEntryDisplayState,
  buildMutedStateItemHtml,
  buildMutedStateSectionHtml,
  buildRestoredMutedAlertLogHtml,
  buildPathAlertLogCardHtml
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

const pathLogHtml = buildPathAlertLogCardHtml(
  {
    alert: { id: 'path"1', name: 'ARB <A>' },
    summaryLines: ['USDC -> ETH & back'],
    mutedTargetCandidate: { type: 'path' }
  },
  {
    nowMs: 2000,
    targetKey: 'target<1>',
    statusText: '已触发',
    profitText: '📈 +1.23bp'
  }
);

assert.ok(pathLogHtml.includes('path-alert-log-entry'));
assert.ok(pathLogHtml.includes('data-path-alert-log-entry="path&quot;1"'));
assert.ok(pathLogHtml.includes('data-muted-target-key="target&lt;1&gt;"'));
assert.ok(pathLogHtml.includes('🚨 [路径报警] ARB &lt;A&gt;'));
assert.ok(pathLogHtml.includes('📈 +1.23bp'));
assert.ok(pathLogHtml.includes('USDC -&gt; ETH &amp; back'));
assert.ok(pathLogHtml.includes('data-path-alert-log-mute="path&quot;1"'));
assert.ok(pathLogHtml.includes('忽略 1 小时'));

const mutedPathLogHtml = buildPathAlertLogCardHtml(
  {
    alert: { id: 'path-2', name: 'Muted path' },
    summaryLines: [],
    mutedTargetCandidate: { type: 'path' }
  },
  {
    mutedEntry: { expiresAt: 123 },
    statusText: '还剩 2 小时'
  }
);

assert.ok(mutedPathLogHtml.includes('alert-log-entry-muted'));
assert.ok(mutedPathLogHtml.includes('alert-log-entry-collapsed'));
assert.ok(mutedPathLogHtml.includes('data-alert-log-collapsed="1"'));
assert.ok(mutedPathLogHtml.includes('延长 2 小时'));
assert.ok(mutedPathLogHtml.includes('<div class="path-alert-log-line">--</div>'));
