const assert = require('assert');

const {
  buildAlertLogAppendPlan,
  resolveAlertLogCardPlacement,
  buildAlertLogMutedStatusState,
  buildRestoredMutedAlertLogPlan,
  buildMutedAlertStatePanelHtml,
  buildRestoredMutedAlertLogHtml,
  buildPathAlertLogCardHtml,
  buildQuoteAlertLogHtml
} = require('../alert-log-ui-utils');

const appendPlan = buildAlertLogAppendPlan([
  { id: 'first', mutedEntry: null },
  { id: 'second', mutedEntry: { expiresAt: 123 } },
  { id: 'third', mutedEntry: null }
]);
assert.strictEqual(appendPlan.shouldAutoOpen, true);
assert.deepStrictEqual(appendPlan.entries.map((entry) => entry.id), ['third', 'second', 'first']);

assert.deepStrictEqual(
  buildAlertLogAppendPlan([]),
  { entries: [], shouldAutoOpen: false }
);

assert.deepStrictEqual(
  buildAlertLogAppendPlan([{ id: 'muted-only', mutedEntry: { expiresAt: 123 } }]),
  {
    entries: [{ id: 'muted-only', mutedEntry: { expiresAt: 123 } }],
    shouldAutoOpen: false
  }
);

assert.deepStrictEqual(
  resolveAlertLogCardPlacement({ mutedEntry: { expiresAt: 123 } }, { targetKey: 'target-1' }),
  { destination: 'muted', removeRestoredTargetKey: '' }
);

assert.deepStrictEqual(
  resolveAlertLogCardPlacement({ mutedEntry: null }, { targetKey: 'target-1' }),
  { destination: 'active', removeRestoredTargetKey: 'target-1' }
);

assert.deepStrictEqual(
  buildAlertLogMutedStatusState({ expiresAt: 123 }, { statusText: '沉默中 · 59:59' }),
  {
    statusText: '沉默中 · 59:59',
    statusClassName: 'path-alert-log-tag path-alert-log-tag-muted',
    buttonText: '延长 2 小时',
    buttonDisabled: false
  }
);

assert.deepStrictEqual(
  buildAlertLogMutedStatusState(null),
  {
    statusText: '已触发',
    statusClassName: 'path-alert-log-tag',
    buttonText: '忽略 1 小时',
    buttonDisabled: false
  }
);

assert.deepStrictEqual(
  buildRestoredMutedAlertLogPlan([
    { id: 'new', mutedAt: 3000 },
    { id: '', mutedAt: 2000 },
    { id: 'old', mutedAt: 1000 }
  ], {
    buildTargetKey: (entry) => entry.id,
    buildStatusText: (entry) => `status ${entry.id}`
  }).map((item) => ({
    id: item.entry.id,
    targetKey: item.targetKey,
    statusText: item.statusText
  })),
  [
    { id: 'old', targetKey: 'old', statusText: 'status old' },
    { id: 'new', targetKey: 'new', statusText: 'status new' }
  ]
);

const mutedStatePanelHtml = buildMutedAlertStatePanelHtml({
  mutedPathTargets: [
    { id: 'old-path', mutedAt: 1000, summaryLinesSnapshot: ['old line'] },
    { id: 'new"path', mutedAt: 3000, logTitleSnapshot: 'New <Path>', summaryLinesSnapshot: ['new line & more', '', null] }
  ],
  mutedPathLegs: [
    { key: 'old-leg', mutedAt: 1000, titleSnapshot: 'Old Leg' },
    { key: 'new-leg', mutedAt: 4000, chain: 'Base', fromSymbol: 'A', toSymbol: 'B' }
  ],
  buildPathTargetKey: (entry) => entry.id,
  buildPathStatusText: (entry) => `path <${entry.id}>`,
  buildLegKey: (entry) => entry.key,
  buildLegTitle: (entry) => entry.titleSnapshot || `${entry.chain}:${entry.fromSymbol}->${entry.toSymbol}`,
  buildLegStatusText: (entry) => `leg ${entry.key}`
});

assert.ok(mutedStatePanelHtml.includes('沉默的路径'));
assert.ok(mutedStatePanelHtml.includes('屏蔽的腿'));
assert.ok(mutedStatePanelHtml.indexOf('New &lt;Path&gt;') < mutedStatePanelHtml.indexOf('old line'));
assert.ok(mutedStatePanelHtml.indexOf('Base:A-&gt;B') < mutedStatePanelHtml.indexOf('Old Leg'));
assert.ok(mutedStatePanelHtml.includes('new line &amp; more'));
assert.ok(!mutedStatePanelHtml.includes('<div></div>'));
assert.ok(mutedStatePanelHtml.includes('path &lt;new&quot;path&gt;'));
assert.ok(mutedStatePanelHtml.includes('data-muted-path-target-extend="new&quot;path"'));
assert.ok(mutedStatePanelHtml.includes('data-muted-path-leg-restore="old-leg"'));
assert.ok(mutedStatePanelHtml.includes('延长 2 小时'));
assert.ok(mutedStatePanelHtml.includes('恢复'));

const emptyMutedStatePanelHtml = buildMutedAlertStatePanelHtml();
assert.ok(emptyMutedStatePanelHtml.includes('当前没有沉默中的路径'));
assert.ok(emptyMutedStatePanelHtml.includes('当前没有屏蔽中的腿'));

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

const quoteLogHtml = buildQuoteAlertLogHtml(
  {
    alert: { id: 'quote"1' },
    quote: {
      chain: 'Ethereum',
      fromToken: '0x<from>',
      toToken: '0x>to',
      amount: '1 & 2'
    },
    label: 'ETH < USDC',
    currentValueText: '+1.2bp & rising',
    displayName: 'ETH/USDC',
    message: 'hit <threshold>',
    mutedTargetCandidate: { type: 'quote' }
  },
  {
    nowMs: 2000,
    actionLink: { url: 'https://dex.example/swap?a=1&b=2', label: 'Open <Dex>' },
    targetKey: 'quote<target>',
    statusText: '已触发'
  }
);

assert.ok(quoteLogHtml.includes('quote-alert-log-entry'));
assert.ok(quoteLogHtml.includes('data-quote-alert-log-entry="quote&quot;1"'));
assert.ok(quoteLogHtml.includes('data-muted-target-key="quote&lt;target&gt;"'));
assert.ok(quoteLogHtml.includes('ETH &lt; USDC'));
assert.ok(quoteLogHtml.includes('+1.2bp &amp; rising'));
assert.ok(quoteLogHtml.includes('hit &lt;threshold&gt;'));
assert.ok(quoteLogHtml.includes('href="https://dex.example/swap?a=1&amp;b=2"'));
assert.ok(quoteLogHtml.includes('data-quote-alert-dex-link-copy="1"'));
assert.ok(quoteLogHtml.includes('data-dex-link-label="Open &lt;Dex&gt;"'));
assert.ok(quoteLogHtml.includes('data-dex-link-from-token-address="0x&lt;from&gt;"'));
assert.ok(quoteLogHtml.includes('data-dex-link-to-token-address="0x&gt;to"'));
assert.ok(quoteLogHtml.includes('data-dex-link-input-amount="1 &amp; 2"'));
assert.ok(quoteLogHtml.includes('忽略 1 小时'));

const mutedQuoteLogHtml = buildQuoteAlertLogHtml(
  {
    alert: { id: 'quote-2' },
    label: 'cbBTC',
    currentValueText: '+2bp',
    displayName: 'cbBTC/syBTC',
    mutedTargetCandidate: { type: 'quote' }
  },
  {
    mutedEntry: { expiresAt: 123 },
    statusText: '还剩 2 小时'
  }
);

assert.ok(mutedQuoteLogHtml.includes('alert-log-entry-muted'));
assert.ok(mutedQuoteLogHtml.includes('alert-log-entry-collapsed'));
assert.ok(mutedQuoteLogHtml.includes('data-alert-log-collapsed="1"'));
assert.ok(mutedQuoteLogHtml.includes('cbBTC/syBTC  cbBTC  +2bp'));
assert.ok(mutedQuoteLogHtml.includes('延长 2 小时'));
