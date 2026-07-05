const assert = require('assert');

const {
  buildDefaultArbDetailState,
  buildOpenArbDetailState,
  buildClosedArbDetailState,
  summarizeDetailResult,
  getQuoteRunState,
  isArbRuleLeg,
  doesArbDetailUseQuote,
  buildArbDetailChartPairs,
  buildArbDetailChartPreviewSignature,
  buildArbOpportunityChartHref,
  buildOpenMultiLinksUrl,
  resolveOpenMultiLinksGroupName,
  resolveOpenMultiLinksColorForGroupName,
  resolveOpenMultiLinksColorForChain,
  buildArbDetailMultiLinksUrl,
  resolveArbOpportunityBaseAmount,
  findBestSummaryIndices,
  getArbDetailCardDomIds,
  shouldRebuildArbDetailShell,
  shouldRebuildArbDetailShellDom,
  shouldSyncArbDetailInput,
  syncArbDetailInputValues,
  buildNudgedArbDetailInputAmount,
  parseCommittedArbDetailInput,
  applyArbDetailInputUpdate,
  shouldCommitArbDetailInputOnKey,
  resolveArbDetailGridClickAction,
  resolveArbDetailGridInputAction,
  resolveArbDetailGridKeydownAction,
  resolveArbDetailGridMouseDownAction,
  getArbDetailIntervalKey,
  resolveArbDetailIntervalMs,
  getArbDetailRateLimitDelay,
  getArbDetailBudgetTimestamp,
  recordArbDetailBudgetTimestamp,
  createArbDetailSourceBudgetRuntime,
  buildUniqueArbOpportunityId,
  shouldApplyArbDetailRequestVersion,
  applyArbDetailCardError,
  shouldSyncArbDetailSnapshotForCard,
  buildArbDetailSnapshotMonitorState,
  buildArbDetailDexLink,
  buildArbDetailRow,
  applyArbDetailRateDeltas,
  formatDetailNumber,
  buildArbDetailSourceHtml,
  buildArbDetailRowsHtml,
  buildArbDetailSummaryHtml,
  applyArbDetailCardContents,
  formatDetailProfitRate,
  buildArbDetailShellHtml,
  applyArbDetailShellHtml,
  buildArbDetailErrorHtml,
  applyArbDetailErrorHtml,
  buildArbDetailSubtitleText,
  applyArbDetailSubtitleText,
  applyArbDetailModalVisibility,
  buildArbDetailChartMessageHtml,
  clearArbDetailPreviewContainers,
  applyArbDetailChartPreviewMessage,
  buildArbDetailProfitPreviewMessageHtml,
  buildArbDetailProfitPreviewReadyHtml,
  getArbDetailProfitCardElement,
  getArbDetailProfitPreviewElements,
  applyArbDetailProfitPreviewMessage,
  applyArbDetailProfitPreviewReady,
  applyArbDetailProfitPreviewMeta,
  buildArbDetailProfitPreviewState,
  buildArbDetailChartPreviewStripHtml,
  applyArbDetailChartPreviewStrip,
  getArbDetailChartCardElements,
  buildArbDetailChartLoadedMetaText,
  applyArbDetailChartLoadedMeta,
  applyArbDetailChartCardError,
  buildArbDetailChartLinkState,
  applyArbDetailChartLinkState,
  hasArbDetailChartPreviewContent
} = require('../src/arb/arb-detail-utils');

function decodeOpenMultiLinksPayload(url) {
  const payload = String(url).split('payload=')[1] || '';
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - payload.length % 4) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

function resolveGridActionFor(resolver, matches, event = { type: 'click' }) {
  return resolver(event, {
    closestEventTarget: (sourceEvent, selector) => matches[selector] || null
  });
}

const detailStepButton = {
  dataset: {
    arbDetailStepIndex: '2',
    arbDetailStep: '0.1'
  }
};
const detailInput = {
  value: '1.25',
  dataset: {
    arbDetailInputIndex: '2'
  },
  blurCalled: false,
  blur() {
    this.blurCalled = true;
  }
};
const detailDexLinkEl = {};

assert.deepStrictEqual(
  resolveGridActionFor(resolveArbDetailGridMouseDownAction, { '[data-arb-detail-step-index]': detailStepButton }),
  { type: 'prevent-step-default' }
);
assert.deepStrictEqual(resolveGridActionFor(resolveArbDetailGridMouseDownAction, {}), { type: 'none' });
assert.deepStrictEqual(
  resolveGridActionFor(resolveArbDetailGridClickAction, {
    '[data-arb-detail-token-address]': {
      dataset: {
        arbDetailTokenAddress: '0xtoken',
        arbDetailTokenSymbol: 'WBTC'
      }
    }
  }),
  { type: 'copy-token-address', tokenAddress: '0xtoken', tokenSymbol: 'WBTC' }
);
assert.deepStrictEqual(
  resolveGridActionFor(resolveArbDetailGridClickAction, {
    '[data-arb-detail-token-address]': {
      dataset: {
        arbDetailTokenAddress: ''
      }
    }
  }),
  { type: 'none' }
);
assert.deepStrictEqual(
  resolveGridActionFor(resolveArbDetailGridClickAction, { '[data-dex-link-copy]': detailDexLinkEl }),
  { type: 'copy-dex-link', element: detailDexLinkEl }
);
assert.deepStrictEqual(
  resolveGridActionFor(resolveArbDetailGridClickAction, {
    '[data-arb-detail-leg-mute]': {
      dataset: {
        arbDetailCardIndex: '1',
        arbDetailRowIndex: '3'
      }
    }
  }),
  { type: 'mute-leg', cardIndex: 1, rowIndex: 3 }
);
assert.deepStrictEqual(
  resolveGridActionFor(resolveArbDetailGridClickAction, { '[data-arb-detail-step-index]': detailStepButton }),
  { type: 'nudge-input', index: 2, step: 0.1 }
);
assert.deepStrictEqual(resolveGridActionFor(resolveArbDetailGridClickAction, {}), { type: 'none' });
assert.deepStrictEqual(
  resolveGridActionFor(resolveArbDetailGridInputAction, { '[data-arb-detail-input-index]': detailInput }, { type: 'focusin' }),
  { type: 'input', index: 2, input: detailInput, value: '1.25' }
);
assert.deepStrictEqual(resolveGridActionFor(resolveArbDetailGridInputAction, {}, { type: 'focusin' }), { type: 'none' });
assert.deepStrictEqual(
  resolveGridActionFor(resolveArbDetailGridKeydownAction, { '[data-arb-detail-input-index]': detailInput }, { type: 'keydown', key: 'Enter' }),
  { type: 'commit-input', index: 2, input: detailInput }
);
assert.deepStrictEqual(
  resolveGridActionFor(resolveArbDetailGridKeydownAction, { '[data-arb-detail-input-index]': detailInput }, { type: 'keydown', key: 'Escape' }),
  { type: 'none' }
);

const expectedDetailCardsForBase2 = [
  { inputAmount: 2, rows: [], summary: null, error: '', requestVersion: 0 },
  { inputAmount: 1, rows: [], summary: null, error: '', requestVersion: 0 },
  { inputAmount: 3, rows: [], summary: null, error: '', requestVersion: 0 },
  { inputAmount: 6, rows: [], summary: null, error: '', requestVersion: 0 }
];

const expectedDetailCardsForDefaultBase = [
  { inputAmount: 1, rows: [], summary: null, error: '', requestVersion: 0 },
  { inputAmount: 0.5, rows: [], summary: null, error: '', requestVersion: 0 },
  { inputAmount: 1.5, rows: [], summary: null, error: '', requestVersion: 0 },
  { inputAmount: 3, rows: [], summary: null, error: '', requestVersion: 0 }
];

const detailOpportunitySource = {
  id: 'op-1',
  label: '机会 1',
  cycle: {
    profitRate: 0.01,
    legs: [
      { quoteId: 1, chain: 'ethereum' },
      { quoteId: 2, chain: 'arbitrum' }
    ]
  }
};

assert.deepStrictEqual(
  buildDefaultArbDetailState(),
  {
    visible: false,
    opportunityId: null,
    selectedOpportunity: null,
    cards: [],
    pausedDashboard: false,
    refreshToken: 0,
    isRefreshing: false,
    editingInputIndex: null,
    chartPreviewSignature: ''
  }
);

const openedDetailState = buildOpenArbDetailState(
  {
    ...buildDefaultArbDetailState(),
    refreshToken: 3,
    pausedDashboard: true,
    editingInputIndex: 1,
    chartPreviewSignature: 'old'
  },
  {
    opportunityId: 'op-1',
    opportunity: detailOpportunitySource,
    baseAmount: 2
  }
);
assert.deepStrictEqual(
  openedDetailState,
  {
    visible: true,
    opportunityId: 'op-1',
    selectedOpportunity: detailOpportunitySource,
    cards: expectedDetailCardsForBase2,
    pausedDashboard: true,
    refreshToken: 4,
    isRefreshing: false,
    editingInputIndex: null,
    chartPreviewSignature: ''
  }
);
assert.notStrictEqual(openedDetailState.selectedOpportunity, detailOpportunitySource);
assert.notStrictEqual(openedDetailState.selectedOpportunity.cycle, detailOpportunitySource.cycle);
assert.notStrictEqual(openedDetailState.selectedOpportunity.cycle.legs[0], detailOpportunitySource.cycle.legs[0]);
assert.deepStrictEqual(
  buildOpenArbDetailState({}, { opportunityId: 'default-base' }).cards,
  expectedDetailCardsForDefaultBase
);

assert.deepStrictEqual(
  buildClosedArbDetailState({
    ...buildDefaultArbDetailState(),
    visible: true,
    opportunityId: 'op-1',
    selectedOpportunity: detailOpportunitySource,
    cards: expectedDetailCardsForBase2,
    pausedDashboard: true,
    refreshToken: 7,
    isRefreshing: true,
    editingInputIndex: 0,
    chartPreviewSignature: 'charts'
  }),
  {
    visible: false,
    opportunityId: null,
    selectedOpportunity: null,
    cards: [],
    pausedDashboard: true,
    refreshToken: 8,
    isRefreshing: false,
    editingInputIndex: null,
    chartPreviewSignature: ''
  }
);

assert.strictEqual(isArbRuleLeg({ rule: true }), true);
assert.strictEqual(isArbRuleLeg({ chain: '规则' }), true);
assert.strictEqual(isArbRuleLeg({ chain: 'ethereum', quoteId: 1 }), false);
assert.strictEqual(isArbRuleLeg(null), false);

assert.strictEqual(
  doesArbDetailUseQuote(
    {
      cycle: {
        legs: [
          { quoteId: '12', chain: 'ethereum' },
          { quoteId: 13, rule: true },
          { quoteId: 14, chain: '规则' }
        ]
      }
    },
    12
  ),
  true
);

assert.strictEqual(
  doesArbDetailUseQuote(
    {
      cycle: {
        legs: [
          { quoteId: 13, rule: true },
          { quoteId: 14, chain: '规则' }
        ]
      }
    },
    13
  ),
  false
);

assert.strictEqual(doesArbDetailUseQuote(null, 12), false);

assert.strictEqual(formatDetailNumber(1.2345678), 1.234568);
assert.strictEqual(formatDetailNumber('1.2345678', 4), 1.2346);
assert.strictEqual(formatDetailNumber('bad'), '--');

assert.deepStrictEqual(
  buildArbDetailRow(
    {
      id: 12,
      chain: 'arbitrum',
      fromToken: '0xfrom',
      toToken: '0xto',
      preferredSource: 'Kyber'
    },
    {
      symbols: { from: 'cbBTC', to: 'WBTC' },
      rawPrice: 1.00123,
      finalAmountOut: 2.502,
      usedSource: ''
    },
    {
      inputAmount: 2.5,
      isInverseFetch: false,
      formatChainLabel: (chain) => `Chain:${chain}`,
      formatAmount: (value) => `Amount:${value}`
    }
  ),
  {
    quoteId: 12,
    direction: 'forward',
    pricingMode: 'raw',
    chain: 'arbitrum',
    chainLabel: 'Chain:arbitrum',
    fromSymbol: 'cbBTC',
    toSymbol: 'WBTC',
    fromTokenAddress: '0xfrom',
    toTokenAddress: '0xto',
    inputAmount: 2.5,
    rawPrice: 1.00123,
    rateText: '1 cbBTC ≈ 1.00123 WBTC',
    amountText: 'Amount:2.502',
    sourceText: 'Kyber'
  }
);

assert.deepStrictEqual(
  buildArbDetailRow(
    {
      id: 18,
      chain: 'ethereum',
      fromToken: '0xfrom',
      toToken: '0xto'
    },
    {
      symbols: { from: 'WBTC', to: 'cbBTC' },
      rawPrice: 0.9998,
      finalAmountOut: 1.5,
      usedSource: '0x'
    },
    {
      inputAmount: 1.499,
      isInverseFetch: true,
      formatChainLabel: String,
      formatAmount: String
    }
  ),
  {
    quoteId: 18,
    direction: 'inverse',
    pricingMode: 'raw',
    chain: 'ethereum',
    chainLabel: 'ethereum',
    fromSymbol: 'WBTC',
    toSymbol: 'cbBTC',
    fromTokenAddress: '0xto',
    toTokenAddress: '0xfrom',
    inputAmount: 1.499,
    rawPrice: 0.9998,
    rateText: '1 WBTC ≈ 0.9998 cbBTC',
    amountText: '1.5',
    sourceText: '0x'
  }
);

assert.strictEqual(
  buildArbDetailRow(
    { id: 19, chain: 'arbitrum' },
    { symbols: { from: 'WBTC', to: 'cbBTC' }, rawPrice: 1, finalAmountOut: 1 }
  ).chainLabel,
  'arb'
);

assert.deepStrictEqual(
  applyArbDetailRateDeltas(
    [{ rawPrice: 1.001 }, { rawPrice: 0.9998 }, { rawPrice: 1 }, { rawPrice: 1.0001 }],
    [{ rawPrice: 1 }, { rawPrice: 1 }, { rawPrice: 1 }, { rawPrice: null }]
  ),
  [
    { rawPrice: 1.001, rateDeltaText: '+10.0bp', rateDeltaTone: 'positive' },
    { rawPrice: 0.9998, rateDeltaText: '-2.0bp', rateDeltaTone: 'negative' },
    { rawPrice: 1, rateDeltaText: '+0.0bp', rateDeltaTone: 'neutral' },
    { rawPrice: 1.0001, rateDeltaText: '--', rateDeltaTone: 'neutral' }
  ]
);

const sourceHtml = buildArbDetailSourceHtml(
  {
    chain: 'arbitrum',
    fromTokenAddress: '0xaaa',
    toTokenAddress: '0xbbb',
    inputAmount: 1.25,
    sourceText: 'Kyber',
    quoteId: 12
  },
  { cardIndex: 0, rowIndex: 1 }
);
assert.ok(sourceHtml.includes('arb-detail-leg-source-main'));
assert.ok(sourceHtml.includes('arb-detail-leg-source-actions'));
assert.ok(sourceHtml.includes('arb-detail-leg-mute-btn'));
assert.ok(sourceHtml.includes('Kyber'));
assert.ok(sourceHtml.includes('data-dex-link-copy="1"'));
assert.ok(sourceHtml.includes('data-arb-detail-row-index="1"'));

const detailRowsHtml = buildArbDetailRowsHtml(
  {
    rows: [
      {
        chainLabel: 'Ethereum <Main>',
        fromSymbol: 'cb<BTC>',
        fromTokenAddress: '0xfrom',
        toSymbol: 'WBTC & ETH',
        toTokenAddress: '0xto',
        rateText: '1 cbBTC ≈ 1.001 WBTC',
        rateDeltaText: '+1.2bp',
        rateDeltaTone: 'positive'
      }
    ]
  },
  {
    cardIndex: 0,
    buildSourceHtml: (row, options) => `<span data-source="${options.cardIndex}:${options.rowIndex}">${String(row.fromSymbol).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`
  }
);

assert.ok(detailRowsHtml.includes('arb-detail-leg'));
assert.ok(detailRowsHtml.includes('arb-detail-leg-pair'));
assert.ok(detailRowsHtml.includes('Ethereum &lt;Main&gt;'));
assert.ok(detailRowsHtml.includes('data-arb-detail-token-address="0xfrom"'));
assert.ok(detailRowsHtml.includes('data-arb-detail-token-symbol="cb&lt;BTC&gt;"'));
assert.ok(detailRowsHtml.includes('WBTC &amp; ETH'));
assert.ok(detailRowsHtml.includes('<span data-source="0:0">cb&lt;BTC&gt;</span>'));
assert.ok(detailRowsHtml.includes('1 cbBTC ≈ 1.001 WBTC'));
assert.ok(detailRowsHtml.includes('arb-detail-leg-rate-delta positive'));
assert.ok(detailRowsHtml.includes('+1.2bp'));

assert.strictEqual(
  buildArbDetailRowsHtml({ rows: [], error: '失败 <原因>' }, {}),
  '<div class="arb-detail-error">失败 &lt;原因&gt;</div>'
);

assert.strictEqual(
  buildArbDetailRowsHtml({ rows: [] }, {}),
  '<div class="arb-detail-loading">等待报价...</div>'
);

const detailSummaryHtml = buildArbDetailSummaryHtml(
  { summary: { profit: 0.123456, profitRate: 0.0123, symbol: 'cb<BTC>' } },
  {
    index: 1,
    bestProfitIndices: [1],
    bestProfitRateIndices: [],
    formatNumber: (value) => `N:${value}`,
    formatProfitRate: (value) => `R:${value}`
  }
);

assert.ok(detailSummaryHtml.includes('arb-detail-metric arb-detail-metric-best'));
assert.ok(detailSummaryHtml.includes('收益 N:0.123456 cb&lt;BTC&gt;'));
assert.ok(detailSummaryHtml.includes('R:0.0123'));
assert.ok(buildArbDetailSummaryHtml(
  { summary: { profit: 0.123456, profitRate: 0.0123, symbol: 'cbBTC' } },
  { formatNumber: (value) => value }
).includes('+123.00‱'));
assert.strictEqual(formatDetailProfitRate(0.0123), '+123.00‱');
assert.strictEqual(formatDetailProfitRate('bad'), '--');
assert.strictEqual(buildArbDetailSummaryHtml({ summary: null }, {}), '<span class="arb-detail-metric">收益 --</span>');

const contentElements = {
  'arb-detail-rows-0': { innerHTML: '' },
  'arb-detail-summary-0': { innerHTML: '' },
  'arb-detail-rows-1': { innerHTML: '' }
};
assert.deepStrictEqual(applyArbDetailCardContents([{ inputAmount: 1 }, { inputAmount: 2 }], {
  getElementById: (id) => contentElements[id] || null,
  buildRowsHtml: (card, index) => `rows:${index}:${card.inputAmount}`,
  buildSummaryHtml: (card, index) => `summary:${index}:${card.inputAmount}`
}), {
  renderedCount: 1,
  skippedCount: 1
});
assert.strictEqual(contentElements['arb-detail-rows-0'].innerHTML, 'rows:0:1');
assert.strictEqual(contentElements['arb-detail-summary-0'].innerHTML, 'summary:0:1');
assert.strictEqual(contentElements['arb-detail-rows-1'].innerHTML, '');

const detailShellHtml = buildArbDetailShellHtml([
  { inputAmount: '1.25 <bad>' },
  { inputAmount: 2 }
]);

assert.ok(detailShellHtml.includes('data-arb-detail-card-index="0"'));
assert.ok(detailShellHtml.includes('id="arb-detail-input-0"'));
assert.ok(detailShellHtml.includes('data-arb-detail-input-index="0"'));
assert.ok(detailShellHtml.includes('value="1.25 &lt;bad&gt;"'));
assert.ok(detailShellHtml.includes('data-arb-detail-step-index="1"'));
assert.ok(detailShellHtml.includes('id="arb-detail-rows-1"'));
assert.ok(detailShellHtml.includes('id="arb-detail-summary-1"'));

const detailGridEl = { innerHTML: '' };
assert.strictEqual(applyArbDetailShellHtml(detailGridEl, [
  { inputAmount: '1.25 <bad>' },
  { inputAmount: 2 }
]), true);
assert.strictEqual(detailGridEl.innerHTML, detailShellHtml);
assert.strictEqual(
  buildArbDetailErrorHtml('失败 <原因>'),
  '<div class="arb-detail-error">失败 &lt;原因&gt;</div>'
);
assert.strictEqual(applyArbDetailErrorHtml(detailGridEl, '已失效 <x>'), true);
assert.strictEqual(detailGridEl.innerHTML, '<div class="arb-detail-error">已失效 &lt;x&gt;</div>');
assert.strictEqual(applyArbDetailShellHtml(null, []), false);

assert.strictEqual(buildArbDetailSubtitleText(null), '当前套利机会不可用');
assert.strictEqual(
  buildArbDetailSubtitleText({ label: '机会 1', cycle: {} }, ['ETH -> USDC', 'USDC -> WBTC']),
  '机会 1 | ETH -> USDC | USDC -> WBTC'
);
assert.strictEqual(buildArbDetailSubtitleText({ cycle: {} }, []), '套利机会 | ');
const detailSubtitleEl = { textContent: '' };
assert.strictEqual(applyArbDetailSubtitleText(detailSubtitleEl, '机会 1 | ETH -> USDC'), true);
assert.strictEqual(detailSubtitleEl.textContent, '机会 1 | ETH -> USDC');
assert.strictEqual(applyArbDetailSubtitleText(null, 'x'), false);

function createDetailClassList() {
  const values = new Set();
  return {
    add(value) {
      values.add(value);
    },
    remove(value) {
      values.delete(value);
    },
    contains(value) {
      return values.has(value);
    }
  };
}

const detailModalEl = { classList: createDetailClassList() };
assert.strictEqual(applyArbDetailModalVisibility(detailModalEl, true), true);
assert.strictEqual(detailModalEl.classList.contains('visible'), true);
assert.strictEqual(applyArbDetailModalVisibility(detailModalEl, false), false);
assert.strictEqual(detailModalEl.classList.contains('visible'), false);
assert.strictEqual(applyArbDetailModalVisibility(null, true), false);

assert.strictEqual(
  buildArbDetailChartMessageHtml('加载 <失败>'),
  '<div class="arb-detail-chart-message">加载 &lt;失败&gt;</div>'
);

const chartPreviewEl = { innerHTML: 'old chart' };
const profitPreviewEl = { innerHTML: 'old profit' };
assert.deepStrictEqual(clearArbDetailPreviewContainers({
  chartPreview: chartPreviewEl,
  profitPreview: profitPreviewEl
}), {
  chartPreviewCleared: true,
  profitPreviewCleared: true
});
assert.strictEqual(chartPreviewEl.innerHTML, '');
assert.strictEqual(profitPreviewEl.innerHTML, '');
assert.deepStrictEqual(clearArbDetailPreviewContainers({}), {
  chartPreviewCleared: false,
  profitPreviewCleared: false
});
assert.strictEqual(applyArbDetailChartPreviewMessage(chartPreviewEl, '加载 <失败>'), true);
assert.strictEqual(chartPreviewEl.innerHTML, '<div class="arb-detail-chart-message">加载 &lt;失败&gt;</div>');
assert.strictEqual(applyArbDetailChartPreviewMessage(null, 'x'), false);

const chartStripHtml = buildArbDetailChartPreviewStripHtml(
  [{ quoteId: 1, direction: 'forward', fromSymbol: 'cbBTC', toSymbol: 'WBTC' }],
  { buildChartPairLabel: () => 'cb<BTC> -> W&BTC' }
);
assert.ok(chartStripHtml.includes('data-arb-detail-chart-index="0"'));
assert.ok(chartStripHtml.includes('cb&lt;BTC&gt; -&gt; W&amp;BTC'));
assert.ok(chartStripHtml.includes('等待历史图表...'));
assert.ok(chartStripHtml.includes('arb-detail-chart-canvas'));
assert.ok(chartStripHtml.includes('data-arb-detail-profit-card="true"'));
assert.ok(chartStripHtml.includes('等待价格图表加载完成...'));

const profitMessageHtml = buildArbDetailProfitPreviewMessageHtml('至少 <2> 张');
assert.ok(profitMessageHtml.includes('arb-detail-profit-meta">至少 &lt;2&gt; 张'));
assert.ok(profitMessageHtml.includes('arb-detail-chart-message">至少 &lt;2&gt; 张'));

const readyProfitHtml = buildArbDetailProfitPreviewReadyHtml(3);
assert.ok(readyProfitHtml.includes('按当前 3 张价格图逐时点乘积计算'));
assert.ok(readyProfitHtml.includes('arb-detail-profit-canvas'));

const profitCardEl = { innerHTML: '' };
assert.strictEqual(applyArbDetailProfitPreviewMessage(profitCardEl, '至少 <2> 张'), true);
assert.strictEqual(profitCardEl.innerHTML, profitMessageHtml);
assert.strictEqual(applyArbDetailProfitPreviewReady(profitCardEl, 3), true);
assert.strictEqual(profitCardEl.innerHTML, readyProfitHtml);
assert.strictEqual(applyArbDetailProfitPreviewReady(null, 3), false);
const previewMetaEl = { textContent: '' };
assert.strictEqual(applyArbDetailProfitPreviewMeta(previewMetaEl, '收益 meta'), true);
assert.strictEqual(previewMetaEl.textContent, '收益 meta');
assert.strictEqual(applyArbDetailProfitPreviewMeta(null, '收益 meta'), false);
const queryProfitCard = { dataset: { profit: 'card' } };
assert.strictEqual(getArbDetailProfitCardElement({
  querySelector(selector) {
    assert.strictEqual(selector, '[data-arb-detail-profit-card]');
    return queryProfitCard;
  }
}), queryProfitCard);
assert.strictEqual(getArbDetailProfitCardElement(null), null);
const profitCanvasEl = {};
const profitMetaEl = {};
assert.deepStrictEqual(getArbDetailProfitPreviewElements({
  querySelector(selector) {
    return {
      '.arb-detail-profit-canvas': profitCanvasEl,
      '.arb-detail-profit-meta': profitMetaEl
    }[selector] || null;
  }
}), {
  canvasEl: profitCanvasEl,
  metaEl: profitMetaEl
});
assert.deepStrictEqual(getArbDetailProfitPreviewElements(null), {
  canvasEl: null,
  metaEl: null
});

assert.deepStrictEqual(
  buildArbDetailProfitPreviewState([[], [{ time: 1, value: 1 }]], {
    buildProfitChartPoints: () => [{ time: 1, value: 1 }],
    canMountProfitHistoryChart: true
  }),
  {
    ready: false,
    message: '至少需要 2 张价格图表。',
    validSeries: [[{ time: 1, value: 1 }]],
    points: [],
    seriesCount: 1,
    metaText: ''
  }
);

assert.deepStrictEqual(
  buildArbDetailProfitPreviewState([[{ time: 1, value: 1 }], [{ time: 1, value: 2 }]], {
    buildProfitChartPoints: null,
    canMountProfitHistoryChart: true
  }).message,
  '收益图算法未就绪，请刷新页面后重试。'
);

assert.deepStrictEqual(
  buildArbDetailProfitPreviewState([[{ time: 1, value: 1 }], [{ time: 1, value: 2 }]], {
    buildProfitChartPoints: () => [{ time: 1, value: 2 }],
    canMountProfitHistoryChart: false
  }).message,
  '图表模块未就绪，请刷新页面后重试。'
);

assert.deepStrictEqual(
  buildArbDetailProfitPreviewState([[{ time: 1, value: 1 }], [{ time: 2, value: 2 }]], {
    buildProfitChartPoints: () => [],
    canMountProfitHistoryChart: true
  }).message,
  '当前价格图表缺少对齐时间点，暂时无法计算收益。'
);

assert.deepStrictEqual(
  buildArbDetailProfitPreviewState([[{ time: 1, value: 1 }], [{ time: 1, value: 2 }]], {
    buildProfitChartPoints: () => [{ time: 1, value: 2 }],
    canMountProfitHistoryChart: true
  }),
  {
    ready: true,
    message: '',
    validSeries: [[{ time: 1, value: 1 }], [{ time: 1, value: 2 }]],
    points: [{ time: 1, value: 2 }],
    seriesCount: 2,
    metaText: '按当前 2 张价格图逐时点乘积计算，> 1.0 为正收益。'
  }
);

const stripHtml = buildArbDetailChartPreviewStripHtml(
  [{ quoteId: 1, direction: 'forward' }],
  { buildChartPairLabel: () => 'Pair <1>' }
);
assert.ok(stripHtml.includes('arb-detail-chart-strip'));
assert.ok(stripHtml.includes('Pair &lt;1&gt;'));
assert.ok(stripHtml.includes('data-arb-detail-profit-card="true"'));
assert.strictEqual(applyArbDetailChartPreviewStrip(chartPreviewEl, [{ quoteId: 1, direction: 'forward' }], {
  buildChartPairLabel: () => 'Pair <1>'
}), true);
assert.strictEqual(chartPreviewEl.innerHTML, stripHtml);
assert.strictEqual(applyArbDetailChartPreviewStrip(null, []), false);

const chartCanvasEl = {};
const chartMetaEl = {};
const chartCardEl = {
  querySelector(selector) {
    return {
      '.arb-detail-chart-canvas': chartCanvasEl,
      '.arb-detail-chart-card-meta': chartMetaEl
    }[selector] || null;
  }
};
assert.deepStrictEqual(getArbDetailChartCardElements({
  querySelector(selector) {
    assert.strictEqual(selector, '[data-arb-detail-chart-index="2"]');
    return chartCardEl;
  }
}, 2), {
  cardEl: chartCardEl,
  canvasEl: chartCanvasEl,
  metaEl: chartMetaEl
});
assert.deepStrictEqual(getArbDetailChartCardElements(null, 0), {
  cardEl: null,
  canvasEl: null,
  metaEl: null
});

assert.strictEqual(buildArbDetailChartLoadedMetaText('快照源'), '快照源 · 最近 1 小时');
assert.strictEqual(buildArbDetailChartLoadedMetaText(''), '历史快照 · 最近 1 小时');
assert.strictEqual(applyArbDetailChartLoadedMeta(previewMetaEl, '快照源'), true);
assert.strictEqual(previewMetaEl.textContent, '快照源 · 最近 1 小时');
const chartErrorCanvas = { outerHTML: '' };
const chartErrorMeta = { textContent: '' };
assert.deepStrictEqual(applyArbDetailChartCardError(chartErrorCanvas, chartErrorMeta, '坏 <图>'), {
  canvasReplaced: true,
  metaUpdated: true
});
assert.strictEqual(chartErrorCanvas.outerHTML, '<div class="arb-detail-chart-message">坏 &lt;图&gt;</div>');
assert.strictEqual(chartErrorMeta.textContent, '加载失败');
assert.deepStrictEqual(applyArbDetailChartCardError(null, null, ''), {
  canvasReplaced: false,
  metaUpdated: false
});

assert.deepStrictEqual(buildArbDetailChartLinkState('/charts?x=1'), {
  href: '/charts?x=1',
  ariaDisabled: 'false'
});
assert.deepStrictEqual(buildArbDetailChartLinkState(''), {
  href: '/charts',
  ariaDisabled: 'true'
});
const chartLinkEl = {
  href: '',
  attrs: {},
  setAttribute(name, value) {
    this.attrs[name] = value;
  }
};
assert.deepStrictEqual(applyArbDetailChartLinkState(chartLinkEl, '/charts?pair=1'), {
  href: '/charts?pair=1',
  ariaDisabled: 'false'
});
assert.strictEqual(chartLinkEl.href, '/charts?pair=1');
assert.strictEqual(chartLinkEl.attrs['aria-disabled'], 'false');
assert.strictEqual(applyArbDetailChartLinkState(null, '/charts'), null);
assert.strictEqual(hasArbDetailChartPreviewContent({ childElementCount: 1 }), true);
assert.strictEqual(hasArbDetailChartPreviewContent({ childElementCount: 0 }), false);
assert.strictEqual(hasArbDetailChartPreviewContent(null), false);

assert.deepStrictEqual(
  summarizeDetailResult(0.2, 0.201),
  {
    profit: 0.001,
    profitRate: 0.005
  }
);

assert.deepStrictEqual(
  getQuoteRunState(false),
  {
    text: '报价中',
    tone: 'running'
  }
);

assert.deepStrictEqual(
  getQuoteRunState(true),
  {
    text: '暂停中',
    tone: 'paused'
  }
);

assert.deepStrictEqual(
  buildArbDetailChartPairs({
    legs: [
      { chain: 'arbitrum', from: 'cbBTC', to: 'WBTC', rawFrom: 'xBTC', rawTo: 'WBTC', quoteId: '12', inverse: false },
      { chain: '规则', rule: 'spread-limit' },
      { chain: 'ethereum', from: 'WBTC', to: 'cbBTC', rawFrom: 'WBTC', rawTo: 'BTCB', quoteId: 18, inverse: true },
      { chain: 'base', from: 'cbBTC', to: 'WBTC', quoteId: 'oops', inverse: false }
    ]
  }),
  [
    { quoteId: 12, direction: 'forward', chain: 'arbitrum', fromSymbol: 'xBTC', toSymbol: 'WBTC' },
    { quoteId: 18, direction: 'inverse', chain: 'ethereum', fromSymbol: 'WBTC', toSymbol: 'BTCB' }
  ]
);

assert.strictEqual(
  buildArbDetailChartPreviewSignature([
    { quoteId: 12, direction: 'forward' },
    { quoteId: 18, direction: 'inverse' }
  ]),
  '["12:forward","18:inverse"]'
);

assert.strictEqual(
  buildArbOpportunityChartHref({
    cycle: {
      legs: [
        { chain: 'arbitrum', from: 'cbBTC', to: 'WBTC', quoteId: 12, inverse: false },
        { chain: 'ethereum', from: 'WBTC', to: 'cbBTC', quoteId: 18, inverse: true }
      ]
    }
  }, (pairs) => `/charts?count=${pairs.length}&first=${pairs[0].quoteId}:${pairs[0].direction}`),
  '/charts?count=2&first=12:forward'
);

assert.strictEqual(
  buildArbOpportunityChartHref({ cycle: { legs: [{ chain: '规则', rule: true }] } }, () => '/charts'),
  ''
);

assert.strictEqual(
  buildArbOpportunityChartHref({ cycle: { legs: [] } }, null),
  ''
);

const multiLinksUrl = buildOpenMultiLinksUrl({
  name: '机会 7',
  color: 'green',
  links: ['https://a.example/swap', 'chrome-extension://skip', 'http://b.example/path']
});
assert.ok(multiLinksUrl.startsWith('chrome-extension://kopjcgdfdbflnmmjplaefilbjjagiakb/open.html?payload='));
assert.deepStrictEqual(
  decodeOpenMultiLinksPayload(multiLinksUrl),
  {
    name: '机会 7',
    color: 'green',
    links: ['https://a.example/swap', 'http://b.example/path']
  }
);
assert.strictEqual(buildOpenMultiLinksUrl({ links: ['chrome-extension://skip'] }), '');
assert.deepStrictEqual(
  decodeOpenMultiLinksPayload(buildOpenMultiLinksUrl({
    color: 'orange',
    links: ['https://a.example/swap']
  })),
  {
    color: 'orange',
    links: ['https://a.example/swap']
  }
);

assert.strictEqual(resolveOpenMultiLinksColorForChain('arbitrum'), 'cyan');
assert.strictEqual(resolveOpenMultiLinksColorForChain('starknet'), 'orange');
assert.strictEqual(resolveOpenMultiLinksColorForChain('unknown'), 'blue');
assert.strictEqual(resolveOpenMultiLinksGroupName(' WBTC eth <-> arb '), 'WBTC');
assert.strictEqual(resolveOpenMultiLinksGroupName('PYUSD - USDC'), 'PYUSD');
assert.strictEqual(resolveOpenMultiLinksGroupName('   '), '');
assert.strictEqual(resolveOpenMultiLinksColorForGroupName('WBTC eth <-> arb'), 'yellow');
assert.strictEqual(resolveOpenMultiLinksColorForGroupName('PYUSD - USDC'), 'blue');
assert.strictEqual(resolveOpenMultiLinksColorForGroupName('   '), 'blue');

const detailMultiLinksUrl = buildArbDetailMultiLinksUrl([
  {
    chain: 'arbitrum',
    fromTokenAddress: '0xaaa',
    toTokenAddress: '0xbbb',
    inputAmount: 1
  },
  {
    chain: 'solana',
    fromTokenAddress: 'So11111111111111111111111111111111111111112',
    toTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    inputAmount: 2
  }
], {
  name: 'WBTC eth <-> arb'
});
assert.deepStrictEqual(
  decodeOpenMultiLinksPayload(detailMultiLinksUrl),
  {
    name: 'WBTC',
    color: 'yellow',
    links: [
      'https://swap.defillama.com/?chain=arbitrum&from=0xaaa&tab=swap&to=0xbbb',
      'https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    ]
  }
);

assert.deepStrictEqual(
  decodeOpenMultiLinksPayload(buildArbDetailMultiLinksUrl([
    {
      chain: 'ethereum',
      fromTokenAddress: '0xaaa',
      toTokenAddress: '0xbbb',
      inputAmount: 1
    }
  ], {
    name: '   '
  })),
  {
    color: 'blue',
    links: [
      'https://swap.defillama.com/?chain=ethereum&from=0xaaa&tab=swap&to=0xbbb'
    ]
  }
);

assert.strictEqual(
  resolveArbOpportunityBaseAmount(
    {
      legs: [
        { chain: '规则', rule: true, quoteId: 1 },
        { chain: 'ethereum', quoteId: 12 }
      ]
    },
    (quoteId) => ({ quote: { id: quoteId, amount: '2.5' } }),
    (leg) => leg && leg.rule === true
  ),
  2.5
);

assert.strictEqual(
  resolveArbOpportunityBaseAmount(
    {
      legs: [
        { chain: 'ethereum', quoteId: 12 },
        { chain: 'arbitrum', quoteId: 13 },
        { chain: 'base', quoteId: 14 },
        { chain: '规则', rule: true, quoteId: 15 }
      ]
    },
    (quoteId) => ({
      quote: {
        id: quoteId,
        amount: {
          12: '5',
          13: '1.5',
          14: '3',
          15: '0.2'
        }[quoteId]
      }
    }),
    (leg) => leg && leg.rule === true
  ),
  1.5
);

assert.strictEqual(
  resolveArbOpportunityBaseAmount(
    { legs: [{ chain: 'ethereum', quoteId: 99 }] },
    () => ({ quote: { amount: 0 } })
  ),
  1
);

assert.deepStrictEqual(
  findBestSummaryIndices([
    { summary: { profit: 0.1, profitRate: 0.01 } },
    { summary: { profit: 0.2, profitRate: 0.005 } },
    { summary: { profit: 0.15, profitRate: 0.02 } }
  ]),
  {
    bestProfitIndices: [1],
    bestProfitRateIndices: [2]
  }
);

assert.strictEqual(
  getArbDetailCardDomIds(2).inputId,
  'arb-detail-input-2'
);

assert.strictEqual(
  getArbDetailCardDomIds(2).rowsId,
  'arb-detail-rows-2'
);

assert.strictEqual(
  getArbDetailCardDomIds(2).summaryId,
  'arb-detail-summary-2'
);

assert.strictEqual(
  shouldRebuildArbDetailShell([{}, {}], {
    getCardCount: () => 1,
    hasElement: () => true
  }),
  true
);

assert.strictEqual(
  shouldRebuildArbDetailShell([{}], {
    getCardCount: () => 1,
    hasElement: (id) => id !== 'arb-detail-summary-0'
  }),
  true
);

assert.strictEqual(
  shouldRebuildArbDetailShell([{}], {
    getCardCount: () => 1,
    hasElement: () => true
  }),
  false
);

assert.strictEqual(shouldRebuildArbDetailShellDom([{}], {
  gridEl: {
    querySelectorAll(selector) {
      assert.strictEqual(selector, '[data-arb-detail-card-index]');
      return [{}];
    }
  },
  getElementById: () => ({})
}), false);

assert.strictEqual(shouldRebuildArbDetailShellDom([{}], {
  gridEl: {
    querySelectorAll() {
      return [];
    }
  },
  getElementById: () => ({})
}), true);

assert.strictEqual(shouldRebuildArbDetailShellDom([{}], { gridEl: null }), false);

assert.strictEqual(
  shouldSyncArbDetailInput(1, null),
  true
);

assert.strictEqual(
  shouldSyncArbDetailInput(1, 1),
  false
);

assert.strictEqual(
  shouldSyncArbDetailInput(1, null),
  true
);

const inputElements = {
  'arb-detail-input-0': { value: 'old' },
  'arb-detail-input-1': { value: '2' },
  'arb-detail-input-2': { value: 'stale' }
};
assert.deepStrictEqual(syncArbDetailInputValues([
  { inputAmount: 1 },
  { inputAmount: 2 },
  { inputAmount: 3 },
  { inputAmount: 4 }
], {
  editingInputIndex: 2,
  getElementById: (id) => inputElements[id] || null
}), {
  syncedCount: 1,
  skippedCount: 2,
  unchangedCount: 1
});
assert.strictEqual(inputElements['arb-detail-input-0'].value, '1');
assert.strictEqual(inputElements['arb-detail-input-1'].value, '2');
assert.strictEqual(inputElements['arb-detail-input-2'].value, 'stale');

assert.strictEqual(
  buildNudgedArbDetailInputAmount(1, 0.23456),
  1.2346
);

assert.strictEqual(
  buildNudgedArbDetailInputAmount(0.12, -1),
  0.1
);

assert.strictEqual(
  buildNudgedArbDetailInputAmount('bad', 0.5),
  1.5
);

assert.strictEqual(
  parseCommittedArbDetailInput('1.5'),
  1.5
);

assert.strictEqual(
  parseCommittedArbDetailInput('0'),
  null
);

const updatedInputCards = [
  {
    inputAmount: 1,
    rows: [{ quoteId: 1 }],
    summary: { profit: 0.1 },
    error: 'old',
    requestVersion: 2
  }
];

assert.strictEqual(
  applyArbDetailInputUpdate(updatedInputCards, 0, '2.5'),
  2.5
);

assert.deepStrictEqual(
  updatedInputCards,
  [
    {
      inputAmount: 2.5,
      rows: [],
      summary: null,
      error: '',
      requestVersion: 3
    }
  ]
);

assert.strictEqual(
  applyArbDetailInputUpdate(updatedInputCards, 0, 'bad'),
  null
);

assert.strictEqual(
  updatedInputCards[0].requestVersion,
  3
);

assert.strictEqual(
  shouldCommitArbDetailInputOnKey('Enter'),
  true
);

assert.strictEqual(
  shouldCommitArbDetailInputOnKey('Tab'),
  false
);

assert.strictEqual(
  getArbDetailIntervalKey('Kyber'),
  'kyber'
);

assert.strictEqual(
  getArbDetailIntervalKey('Jupiter'),
  'solana'
);

assert.strictEqual(
  getArbDetailIntervalKey('Velora'),
  'velora'
);

assert.strictEqual(
  getArbDetailIntervalKey('Binance'),
  'binance'
);

assert.strictEqual(
  getArbDetailIntervalKey('Unknown'),
  null
);

assert.strictEqual(
  resolveArbDetailIntervalMs('Kyber', { kyber: 170 }),
  170
);

assert.strictEqual(
  resolveArbDetailIntervalMs('Jupiter', { solana: '3500' }),
  3500
);

assert.strictEqual(
  resolveArbDetailIntervalMs('Kyber', { kyber: 0 }),
  0
);

assert.strictEqual(
  resolveArbDetailIntervalMs('Unknown', { kyber: 170 }),
  0
);

assert.strictEqual(
  getArbDetailRateLimitDelay(1000, 170, 1100),
  70
);

assert.strictEqual(
  getArbDetailRateLimitDelay(1000, 170, 1200),
  0
);

const detailBudgetState = new Map();
assert.strictEqual(
  getArbDetailBudgetTimestamp(detailBudgetState, 'Kyber'),
  null
);

assert.strictEqual(
  recordArbDetailBudgetTimestamp(detailBudgetState, 'Kyber', 1000),
  1000
);

assert.strictEqual(
  getArbDetailBudgetTimestamp(detailBudgetState, 'Kyber'),
  1000
);

assert.strictEqual(
  recordArbDetailBudgetTimestamp(detailBudgetState, 'Kyber', 900),
  1000
);

assert.strictEqual(
  recordArbDetailBudgetTimestamp(detailBudgetState, 'Velora', 1200),
  1200
);

assert.strictEqual(
  getArbDetailBudgetTimestamp(detailBudgetState, 'Velora'),
  1200
);

const detailBudgetRuntime = createArbDetailSourceBudgetRuntime();
assert.strictEqual(detailBudgetRuntime.getTimestamp('Kyber'), null);
assert.strictEqual(detailBudgetRuntime.recordTimestamp('Kyber', 1500), 1500);
assert.strictEqual(detailBudgetRuntime.recordTimestamp('Kyber', 1400), 1500);
assert.strictEqual(detailBudgetRuntime.getTimestamp('Kyber'), 1500);
assert.ok(detailBudgetRuntime.getState() instanceof Map);

const stableCycleA = {
  legs: [
    { chain: 'ethereum', from: 'cbBTC', to: 'WBTC', quoteId: '1', inverse: false, rate: 1.0022 },
    { chain: 'arbitrum', from: 'WBTC', to: 'cbBTC', quoteId: '2', inverse: false, rate: 0.9978 }
  ]
};
const stableCycleB = {
  legs: [
    { chain: 'ethereum', from: 'cbBTC', to: 'WBTC', quoteId: '1', inverse: false, rate: 1.1234 },
    { chain: 'arbitrum', from: 'WBTC', to: 'cbBTC', quoteId: '2', inverse: false, rate: 0.8888 }
  ]
};
const stableCycleC = {
  legs: [
    { chain: 'ethereum', from: 'cbBTC', to: 'WBTC', quoteId: '1', inverse: false, rate: 1.0022 },
    { chain: 'arbitrum', from: 'WBTC', to: 'xBTC', quoteId: '9', inverse: false, rate: 0.9978 }
  ]
};

const uniqueIdA = buildUniqueArbOpportunityId(new Set(), '固定路径', '机会 1', stableCycleA);
const uniqueIdRateChanged = buildUniqueArbOpportunityId(new Set(), '固定路径', '机会 1', stableCycleB);
const uniqueIdDifferentLeg = buildUniqueArbOpportunityId(new Set(), '固定路径', '机会 1', stableCycleC);
const uniqueIdB = buildUniqueArbOpportunityId(new Set([uniqueIdA]), '固定路径', '机会 1', stableCycleA);
const uniqueIdC = buildUniqueArbOpportunityId(new Set([uniqueIdA, uniqueIdB]), '固定路径', '机会 2', stableCycleA);

assert.strictEqual(uniqueIdA, uniqueIdRateChanged);
assert.notStrictEqual(uniqueIdA, uniqueIdDifferentLeg);
assert.notStrictEqual(uniqueIdA, uniqueIdB);
assert.notStrictEqual(uniqueIdA, uniqueIdC);
assert.ok(uniqueIdA.includes(':机会 1:'));
assert.ok(uniqueIdC.includes(':机会 2:'));

assert.strictEqual(
  shouldApplyArbDetailRequestVersion(2, 2),
  true
);

assert.strictEqual(
  shouldApplyArbDetailRequestVersion(2, 3),
  false
);

const detailCards = [
  { rows: [{ quoteId: 1 }], summary: { profit: 1 }, error: '' },
  { rows: [{ quoteId: 2 }], summary: { profit: 2 }, error: '' },
  { rows: [{ quoteId: 3 }], summary: { profit: 3 }, error: '' },
  { rows: [{ quoteId: 4 }], summary: { profit: 4 }, error: '' }
];

applyArbDetailCardError(detailCards, 1, '流动性不足');

assert.deepStrictEqual(
  detailCards,
  [
    { rows: [{ quoteId: 1 }], summary: { profit: 1 }, error: '' },
    { rows: [], summary: null, error: '流动性不足' },
    { rows: [{ quoteId: 3 }], summary: { profit: 3 }, error: '' },
    { rows: [{ quoteId: 4 }], summary: { profit: 4 }, error: '' }
  ]
);

assert.strictEqual(
  shouldSyncArbDetailSnapshotForCard(0),
  true
);

assert.strictEqual(
  shouldSyncArbDetailSnapshotForCard(1),
  false
);

assert.deepStrictEqual(
  buildArbDetailSnapshotMonitorState(
    {
      inverseRawPrice: 1.02,
      inverseFromSymbol: 'WBTC',
      inverseToSymbol: 'cbBTC'
    },
    {
      symbols: { from: 'cbBTC', to: 'WBTC' },
      resultText: '1 cbBTC ≈ 0.998 WBTC',
      rawPrice: 0.998,
      cexOrderbook: null,
      usedSource: 'Kyber'
    },
    {
      successSource: 'Kyber',
      isInverseFetch: false
    }
  ),
  {
    inverseRawPrice: 1.02,
    inverseFromSymbol: 'WBTC',
    inverseToSymbol: 'cbBTC',
    fromSymbol: 'cbBTC',
    toSymbol: 'WBTC',
    lastResultText: '1 cbBTC ≈ 0.998 WBTC',
    lastRawPrice: 0.998,
    cexOrderbook: null,
    usedSource: 'Kyber',
    usedSourceReal: 'Kyber'
  }
);

assert.deepStrictEqual(
  buildArbDetailSnapshotMonitorState(
    {
      fromSymbol: 'cbBTC',
      toSymbol: 'WBTC',
      lastResultText: '1 cbBTC ≈ 0.999 WBTC',
      lastRawPrice: 0.999
    },
    {
      symbols: { from: 'WBTC', to: 'cbBTC' },
      resultText: '0.998 WBTC ≈ 1.001 cbBTC',
      rawPrice: 1.001,
      cexOrderbook: null,
      usedSource: 'Ekubo'
    },
    {
      successSource: 'Ekubo',
      isInverseFetch: true
    }
  ),
  {
    fromSymbol: 'cbBTC',
    toSymbol: 'WBTC',
    lastResultText: '1 cbBTC ≈ 0.999 WBTC',
    lastRawPrice: 0.999,
    inverseRawPrice: 1.001,
    inverseFromSymbol: 'WBTC',
    inverseToSymbol: 'cbBTC'
  }
);

assert.deepStrictEqual(
  buildArbDetailDexLink({
    chain: 'sui',
    fromTokenAddress: '0x2::sui::SUI',
    toTokenAddress: '0x123::usdc::USDC'
  }),
  {
    label: 'cetus',
    url: 'https://app.cetus.zone/swap/0x2%3A%3Asui%3A%3ASUI/0x123%3A%3Ausdc%3A%3AUSDC'
  }
);

assert.deepStrictEqual(
  buildArbDetailDexLink({
    chain: 'solana',
    fromTokenAddress: 'So11111111111111111111111111111111111111112',
    toTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  }),
  {
    label: 'jup.ag',
    url: 'https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  }
);

assert.deepStrictEqual(
  buildArbDetailDexLink({
    chain: 'starknet',
    fromTokenAddress: '0x111',
    toTokenAddress: '0x222',
    inputAmount: 1.25
  }),
  {
    label: 'ekubo',
    url: 'https://ekubo.org/swap?inputCurrency=0x111&amount=1.25&outputCurrency=0x222&chainId=0x534e5f4d41494e'
  }
);

assert.deepStrictEqual(
  buildArbDetailDexLink({
    chain: 'arbitrum',
    fromTokenAddress: '0xaaa',
    toTokenAddress: '0xbbb'
  }),
  {
    label: 'swap.defillama',
    url: 'https://swap.defillama.com/?chain=arbitrum&from=0xaaa&tab=swap&to=0xbbb'
  }
);

assert.strictEqual(
  buildArbDetailDexLink({
    chain: 'Binance',
    fromTokenAddress: 'BTC',
    toTokenAddress: 'USDT'
  }),
  null
);
