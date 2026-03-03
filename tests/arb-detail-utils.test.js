const assert = require('assert');

const {
  buildDetailInputAmounts,
  summarizeDetailResult,
  getQuoteRunState,
  findBestSummaryIndices
} = require('../arb-detail-utils');

assert.deepStrictEqual(
  buildDetailInputAmounts(0.1),
  [0.1, 0.2, 1, 2]
);

assert.deepStrictEqual(
  buildDetailInputAmounts(undefined),
  [1, 0.2, 1, 2]
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
