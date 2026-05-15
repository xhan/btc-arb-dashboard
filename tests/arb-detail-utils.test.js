const assert = require('assert');

const {
  buildDetailInputAmounts,
  summarizeDetailResult,
  getQuoteRunState,
  buildArbDetailChartPairs,
  findBestSummaryIndices,
  getArbDetailCardDomIds,
  shouldSyncArbDetailInput,
  parseCommittedArbDetailInput,
  shouldCommitArbDetailInputOnKey,
  getArbDetailIntervalKey,
  getArbDetailRateLimitDelay,
  getArbDetailBudgetTimestamp,
  recordArbDetailBudgetTimestamp,
  buildArbOpportunityStableId,
  buildUniqueArbOpportunityId,
  getNextArbDetailRequestVersion,
  shouldApplyArbDetailRequestVersion,
  applyArbDetailCardError,
  shouldSyncArbDetailSnapshotForCard,
  buildArbDetailSnapshotMonitorState,
  buildArbDetailDexLink,
  buildArbDetailRateText,
  buildArbDetailRateDeltaText,
  buildArbDetailTokenHtml,
  buildArbDetailPairHtml,
  buildArbDetailRowsHtml,
  buildArbDetailSummaryHtml,
  buildArbDetailShellHtml
} = require('../arb-detail-utils');

assert.deepStrictEqual(
  buildDetailInputAmounts(10),
  [10, 5, 15, 30]
);

assert.deepStrictEqual(
  buildDetailInputAmounts(undefined),
  [1, 0.5, 1.5, 3]
);

assert.deepStrictEqual(
  buildDetailInputAmounts(3),
  [3, 1.5, 4.5, 9]
);

assert.strictEqual(
  buildArbDetailRateText(0.9981234, 'cbBTC', 'WBTC'),
  '1 cbBTC ≈ 0.998123 WBTC'
);

assert.strictEqual(
  buildArbDetailRateText(null, 'cbBTC', 'WBTC'),
  '--'
);

assert.strictEqual(
  buildArbDetailRateDeltaText(1.0, 1.0001),
  '+1.0bp'
);

assert.strictEqual(
  buildArbDetailRateDeltaText(1.0, 0.9998),
  '-2.0bp'
);

assert.strictEqual(
  buildArbDetailRateDeltaText(null, 1.0001),
  '--'
);

assert.strictEqual(
  buildArbDetailTokenHtml('cb<BTC>', ''),
  'cb&lt;BTC&gt;'
);

assert.strictEqual(
  buildArbDetailTokenHtml('cb<BTC>', '0x"abc'),
  '<span class="arb-detail-token" data-arb-detail-token-address="0x&quot;abc" data-arb-detail-token-symbol="cb&lt;BTC&gt;" title="0x&quot;abc">cb&lt;BTC&gt;</span>'
);

assert.strictEqual(
  buildArbDetailPairHtml({
    chainLabel: 'Ethereum <Main>',
    fromSymbol: 'cb<BTC>',
    fromTokenAddress: '0xfrom',
    toSymbol: 'WBTC & ETH',
    toTokenAddress: '0xto'
  }),
  '（Ethereum &lt;Main&gt;）<span class="arb-detail-token" data-arb-detail-token-address="0xfrom" data-arb-detail-token-symbol="cb&lt;BTC&gt;" title="0xfrom">cb&lt;BTC&gt;</span> -> <span class="arb-detail-token" data-arb-detail-token-address="0xto" data-arb-detail-token-symbol="WBTC &amp; ETH" title="0xto">WBTC &amp; ETH</span>'
);

const detailRowsHtml = buildArbDetailRowsHtml(
  {
    rows: [
      {
        chainLabel: 'Ethereum',
        fromSymbol: 'cbBTC',
        fromTokenAddress: '0xfrom',
        toSymbol: 'WBTC',
        toTokenAddress: '0xto',
        rateText: '1 cbBTC ≈ 1.001 WBTC',
        rateDeltaText: '+1.2bp',
        rateDeltaTone: 'positive'
      }
    ]
  },
  {
    cardIndex: 0,
    buildSourceHtml: (row, options) => `<span data-source="${options.cardIndex}:${options.rowIndex}">${row.fromSymbol}</span>`
  }
);

assert.ok(detailRowsHtml.includes('arb-detail-leg'));
assert.ok(detailRowsHtml.includes('arb-detail-leg-pair'));
assert.ok(detailRowsHtml.includes('data-arb-detail-token-address="0xfrom"'));
assert.ok(detailRowsHtml.includes('<span data-source="0:0">cbBTC</span>'));
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
assert.strictEqual(buildArbDetailSummaryHtml({ summary: null }, {}), '<span class="arb-detail-metric">收益 --</span>');

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

assert.strictEqual(
  parseCommittedArbDetailInput('1.5'),
  1.5
);

assert.strictEqual(
  parseCommittedArbDetailInput('0'),
  null
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

assert.strictEqual(
  buildArbOpportunityStableId('固定路径', '机会 1', stableCycleA),
  buildArbOpportunityStableId('固定路径', '机会 1', stableCycleB)
);

assert.notStrictEqual(
  buildArbOpportunityStableId('固定路径', '机会 1', stableCycleA),
  buildArbOpportunityStableId('固定路径', '机会 1', stableCycleC)
);

const uniqueIdA = buildUniqueArbOpportunityId(new Set(), '固定路径', '机会 1', stableCycleA);
const uniqueIdB = buildUniqueArbOpportunityId(new Set([uniqueIdA]), '固定路径', '机会 1', stableCycleA);
const uniqueIdC = buildUniqueArbOpportunityId(new Set([uniqueIdA, uniqueIdB]), '固定路径', '机会 2', stableCycleA);

assert.notStrictEqual(uniqueIdA, uniqueIdB);
assert.notStrictEqual(uniqueIdA, uniqueIdC);
assert.ok(uniqueIdA.includes(':机会 1:'));
assert.ok(uniqueIdC.includes(':机会 2:'));

assert.strictEqual(
  getNextArbDetailRequestVersion(0),
  1
);

assert.strictEqual(
  getNextArbDetailRequestVersion(3),
  4
);

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
