const assert = require('assert');

const {
  buildQuoteSpreadRows,
  buildQuoteSpreadPanelHtml,
  formatQuoteSpreadNumber,
  formatQuoteSpreadBp
} = require('../src/quote/quote-spread-utils');

const dashboardState = [
  {
    name: 'Main',
    quotes: [
      { id: 1, chain: 'ethereum' },
      { id: 2, chain: 'base' },
      { id: 3, chain: 'arbitrum' },
      { id: 4, chain: 'solana' }
    ]
  }
];

const quoteStateById = new Map([
  [1, {
    fromSymbol: 'WBTC',
    toSymbol: 'cbBTC',
    lastRawPrice: 1.01,
    inverseRawPrice: 0.995
  }],
  [2, {
    fromSymbol: 'USDC',
    toSymbol: 'USDT',
    lastRawPrice: 1.001,
    inverseRawPrice: 1.0005
  }],
  [3, {
    fromSymbol: 'ETH',
    toSymbol: 'WETH',
    lastRawPrice: 1.0
  }],
  [4, {
    fromSymbol: 'SOL',
    toSymbol: 'USDC',
    lastRawPrice: 'bad',
    inverseRawPrice: 0.1
  }]
]);

const rows = buildQuoteSpreadRows(dashboardState, quoteStateById, {
  limit: 20,
  formatChainLabel: (chain) => chain.toUpperCase()
});

assert.strictEqual(rows.length, 2);
assert.deepStrictEqual(rows.map((row) => row.quoteId), [1, 2]);
assert.strictEqual(rows[0].pairLabel, 'WBTC/cbBTC');
assert.strictEqual(rows[0].chainLabel, 'ETHEREUM');
assert.ok(Math.abs(rows[0].product - 1.00495) < 1e-12);
assert.ok(Math.abs(rows[0].spreadBp - 49.5) < 1e-9);
assert.ok(Math.abs(rows[1].product - 1.0015005) < 1e-12);

const defaultRows = buildQuoteSpreadRows(dashboardState, quoteStateById, { limit: 2 });
assert.deepStrictEqual(defaultRows.map((row) => row.chainLabel), ['eth', 'base']);
assert.strictEqual(buildQuoteSpreadRows(dashboardState, quoteStateById, { limit: 1 }).length, 1);
assert.strictEqual(formatQuoteSpreadNumber(1.23456789), '1.234568');
assert.strictEqual(formatQuoteSpreadNumber(NaN), '--');
assert.strictEqual(formatQuoteSpreadBp(49.5), '+49.50bp');
assert.strictEqual(formatQuoteSpreadBp(-1.2), '-1.20bp');
assert.strictEqual(formatQuoteSpreadBp(null), '--');

const html = buildQuoteSpreadPanelHtml(rows);
assert.ok(html.includes('WBTC/cbBTC'));
assert.ok(html.includes('+49.50bp'));
assert.ok(html.includes('1.004950'));
assert.ok(html.includes('USDC/USDT'));
assert.ok(buildQuoteSpreadPanelHtml([]).includes('暂无可计算的买/卖 spread'));
