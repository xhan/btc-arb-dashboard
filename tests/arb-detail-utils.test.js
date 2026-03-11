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
  buildArbOpportunityStableId,
  buildUniqueArbOpportunityId,
  getNextArbDetailRequestVersion,
  shouldApplyArbDetailRequestVersion
} = require('../arb-detail-utils');

assert.deepStrictEqual(
  buildDetailInputAmounts(10),
  [10, 5, 15, 20]
);

assert.deepStrictEqual(
  buildDetailInputAmounts(undefined),
  [1, 1, 2, 2]
);

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
      { chain: 'arbitrum', from: 'cbBTC', to: 'WBTC', quoteId: '12', inverse: false },
      { chain: '规则', rule: 'spread-limit' },
      { chain: 'ethereum', from: 'WBTC', to: 'cbBTC', quoteId: 18, inverse: true },
      { chain: 'base', from: 'cbBTC', to: 'WBTC', quoteId: 'oops', inverse: false }
    ]
  }),
  [
    { quoteId: 12, direction: 'forward', chain: 'arbitrum', fromSymbol: 'cbBTC', toSymbol: 'WBTC' },
    { quoteId: 18, direction: 'inverse', chain: 'ethereum', fromSymbol: 'WBTC', toSymbol: 'cbBTC' }
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
