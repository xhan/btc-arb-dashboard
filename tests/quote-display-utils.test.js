const assert = require('assert');

const {
  applyQuoteDisplayToggleButtonState,
  buildCexOrderbookSummary,
  buildCexOrderbookTooltipHtml,
  buildInverseQuoteDisplayTextForState,
  buildQuoteAlertDisplayLabel,
  buildQuotePairLabelHtml,
  buildQuoteDisplayTextForState,
  buildQuoteDisplayToggleState,
  buildQuoteHoverTooltipState,
  buildQuoteTrendArrowState,
  createQuoteHoverRuntime,
  extractPriceFromText,
  formatCexBookValue,
  getNextQuoteDisplayMode
} = require('../src/quote/quote-display-utils');

assert.deepStrictEqual(
  buildQuoteDisplayToggleState('rate'),
  {
    text: '价格: 汇率',
    title: '切换看板报价显示为数量 (P)',
    mode: 'rate'
  }
);
assert.deepStrictEqual(
  buildQuoteDisplayToggleState('amount'),
  {
    text: '价格: 数量',
    title: '切换看板报价显示为汇率 (P)',
    mode: 'amount'
  }
);
assert.strictEqual(buildQuoteDisplayToggleState('bad').mode, 'rate');
assert.strictEqual(getNextQuoteDisplayMode('rate'), 'amount');
assert.strictEqual(getNextQuoteDisplayMode('amount'), 'rate');
assert.strictEqual(getNextQuoteDisplayMode('bad'), 'amount');

const quoteDisplayToggleButton = { textContent: '', title: '' };
assert.strictEqual(applyQuoteDisplayToggleButtonState(quoteDisplayToggleButton, 'amount'), true);
assert.deepStrictEqual(quoteDisplayToggleButton, {
  textContent: '价格: 数量',
  title: '切换看板报价显示为汇率 (P)'
});
assert.strictEqual(applyQuoteDisplayToggleButtonState(null, 'rate'), false);

let hoverTimerId = 0;
const hoverTimers = [];
const clearedHoverTimers = [];
const shownQuoteIds = [];
const hiddenQuoteIds = [];
const hoverRuntime = createQuoteHoverRuntime({
  delayMs: 100,
  setTimeout(callback, delayMs) {
    const id = `hover-${hoverTimerId += 1}`;
    hoverTimers.push({ id, callback, delayMs });
    return id;
  },
  clearTimeout(id) {
    clearedHoverTimers.push(id);
  }
});

assert.strictEqual(hoverRuntime.schedule('quote-a', (quoteId) => shownQuoteIds.push(quoteId)), true);
assert.strictEqual(hoverRuntime.hasTimer(), true);
assert.strictEqual(hoverRuntime.getCurrentQuoteId(), 'quote-a');
assert.deepStrictEqual(hoverTimers.map((entry) => entry.delayMs), [100]);

assert.strictEqual(hoverRuntime.schedule('quote-b', (quoteId) => shownQuoteIds.push(quoteId), 50), true);
assert.deepStrictEqual(clearedHoverTimers, ['hover-1']);
assert.strictEqual(hoverTimers.at(-1).delayMs, 50);

hoverTimers[0].callback();
assert.deepStrictEqual(shownQuoteIds, []);
assert.strictEqual(hoverRuntime.hasTimer(), true);
hoverTimers[1].callback();
assert.deepStrictEqual(shownQuoteIds, ['quote-b']);
assert.strictEqual(hoverRuntime.hasTimer(), false);

assert.strictEqual(hoverRuntime.hide('quote-b', (quoteId) => hiddenQuoteIds.push(quoteId)), true);
assert.deepStrictEqual(hiddenQuoteIds, ['quote-b']);
assert.strictEqual(hoverRuntime.getCurrentQuoteId(), null);
assert.strictEqual(hoverRuntime.hide('quote-b'), false);

assert.strictEqual(
  buildQuoteDisplayTextForState({ chain: 'ethereum' }, {}, { mode: 'amount', fallbackText: '等待报价...' }),
  '等待报价...'
);

assert.strictEqual(
  buildQuoteDisplayTextForState(
    { chain: 'ethereum', amount: 2 },
    { fromSymbol: 'ETH', toSymbol: 'USDC', lastTotalAmountOut: 6.5, lastRawPrice: 3.25, lastResultText: '旧报价' },
    { mode: 'amount' }
  ),
  'ETH ≈ 6.500000 USDC'
);

assert.strictEqual(
  buildQuoteDisplayTextForState(
    { chain: 'ethereum', amount: 2 },
    { fromSymbol: 'ETH', toSymbol: 'USDC', lastTotalAmountOut: 6.5, lastRawPrice: 3.25 },
    { mode: 'rate' }
  ),
  '1 ETH ≈ 3.250000 USDC'
);

assert.strictEqual(
  buildQuoteDisplayTextForState(
    { chain: 'Bybit' },
    { lastResultText: 'bid 1 / ask 2' },
    { mode: 'rate' }
  ),
  'bid 1 / ask 2'
);

assert.strictEqual(
  buildQuoteDisplayTextForState({}, {}, { paused: true }),
  '已暂停'
);

assert.strictEqual(
  buildInverseQuoteDisplayTextForState(
    { chain: 'ethereum', amount: 3 },
    { inverseFromSymbol: 'USDC', inverseToSymbol: 'ETH', inverseTotalAmountOut: 1.5, inverseRawPrice: 0.5 },
    { mode: 'amount' }
  ),
  '3 USDC ≈ 1.500000 ETH'
);

assert.strictEqual(formatCexBookValue(1234.56789), '1234.57');
assert.strictEqual(formatCexBookValue(1.23456789), '1.234568');
assert.strictEqual(formatCexBookValue(0.0123456789), '0.01234568');
assert.strictEqual(formatCexBookValue(null), '--');

assert.strictEqual(extractPriceFromText('1 ETH ≈ 3456.789123 USDC'), 3456.789123);
assert.strictEqual(extractPriceFromText('BTCUSDT: 100200.12'), 100200.12);
assert.strictEqual(extractPriceFromText('raw 1.23e-4'), 0.000123);
assert.strictEqual(extractPriceFromText('等待报价...'), null);

assert.strictEqual(
  buildCexOrderbookSummary('BTCUSDT', {
    bestAskPrice: 101.1234567,
    bestAskSize: 0.1234567,
    bestBidPrice: 100.9876543,
    bestBidSize: 0.7654321
  }),
  'ASK 101.123457 × 0.123457\nBID 100.987654 × 0.765432'
);

assert.ok(
  buildCexOrderbookTooltipHtml({
    feeRate: 0.001,
    asksTop5: [{ price: 101.1234567, size: 0.1234567 }],
    bidsTop5: [{ price: 100.9876543, size: 0.7654321 }]
  }).includes('已计入手续费 0.10%')
);

assert.ok(
  buildCexOrderbookTooltipHtml(null).includes('盘口等待数据...')
);

assert.strictEqual(
  buildQuotePairLabelHtml({ chain: 'Bybit', symbol: 'btcusdt' }, {}),
  'BTCUSDT'
);

assert.strictEqual(
  buildQuotePairLabelHtml({ chain: 'Binance', symbol: 'ETHUSDT' }, { fromSymbol: 'ETH', toSymbol: 'USDT' }),
  'ETH/USDT'
);

assert.strictEqual(
  buildQuotePairLabelHtml({ chain: 'ethereum', symbol: 'ETHUSDT' }, {}),
  ''
);

assert.strictEqual(
  buildQuotePairLabelHtml({ chain: 'ethereum' }, { fromSymbol: 'cb<BTC>', toSymbol: 'WBTC' }),
  'cb&lt;BTC&gt;/WBTC'
);

assert.strictEqual(
  buildQuotePairLabelHtml(
    { chain: 'ethereum', kyberOnlyDirectPools: true, preferredSource: 'Auto' },
    { fromSymbol: 'cb<BTC>', toSymbol: 'WBTC' }
  ),
  'cb&lt;BTC&gt;/WBTC<span class="quote-direct-badge" title="Kyber 仅直连池"></span>'
);

assert.strictEqual(
  buildQuotePairLabelHtml(
    { chain: 'ethereum', kyberOnlyDirectPools: true, preferredSource: '0x' },
    { fromSymbol: 'cb<BTC>', toSymbol: 'WBTC' }
  ),
  'cb&lt;BTC&gt;/WBTC'
);

assert.deepStrictEqual(
  buildQuoteHoverTooltipState(
    { chain: 'ethereum', preferredSource: '0x' },
    { usedSource: 'Kyber' },
    { isEvmChain: true }
  ),
  {
    html: '<div>来源：<strong>Kyber</strong></div><div>偏好：0x</div>',
    className: ''
  }
);

assert.deepStrictEqual(
  buildQuoteHoverTooltipState(
    { chain: 'sui' },
    null,
    { isEvmChain: false }
  ),
  {
    html: '<div>来源：<strong>等待数据...</strong></div>',
    className: ''
  }
);

const cexHoverTooltipState = buildQuoteHoverTooltipState(
  { chain: 'Bybit', symbol: 'BTCUSDT' },
  { cexOrderbook: { asksTop5: [{ price: 1, size: 2 }], bidsTop5: [] } }
);
assert.strictEqual(cexHoverTooltipState.className, 'cex-orderbook-tooltip-host');
assert.ok(cexHoverTooltipState.html.includes('cex-orderbook-tooltip'));

assert.deepStrictEqual(
  buildQuoteTrendArrowState(1.2, 1, 'Kyber', 'Kyber'),
  {
    action: 'show',
    html: '&#8593;&#8593;&#8593;',
    className: 'trend-arrow trend-up visible'
  }
);

assert.deepStrictEqual(
  buildQuoteTrendArrowState(0.8, 1, 'Kyber', 'Kyber'),
  {
    action: 'show',
    html: '&#8595;&#8595;&#8595;',
    className: 'trend-arrow trend-down visible'
  }
);

assert.deepStrictEqual(
  buildQuoteTrendArrowState(1.2, 1, '0x', 'Kyber'),
  { action: 'hide' }
);
assert.strictEqual(buildQuoteTrendArrowState(1.00001, 1, 'Kyber', 'Kyber'), null);
assert.strictEqual(buildQuoteTrendArrowState(1.1, null, 'Kyber', 'Kyber'), null);

assert.strictEqual(
  buildQuoteAlertDisplayLabel({ chain: 'Bybit', symbol: 'BTCUSDT' }, {}, 'forward'),
  'BTC/USDT'
);

assert.strictEqual(
  buildQuoteAlertDisplayLabel({ chain: 'Bybit', symbol: 'BTCUSDT' }, {}, 'inverse'),
  'USDT/BTC'
);

assert.strictEqual(
  buildQuoteAlertDisplayLabel({ chain: 'Bybit', symbol: '' }, {}, 'forward'),
  '--'
);

assert.strictEqual(
  buildQuoteAlertDisplayLabel(
    { chain: 'ethereum', fromToken: '0xabc12345', toToken: '0xdef67890' },
    { fromSymbol: 'WBTC', toSymbol: 'cbBTC' },
    'inverse'
  ),
  'cbBTC/WBTC'
);

assert.strictEqual(
  buildQuoteAlertDisplayLabel(
    { chain: 'ethereum', fromToken: '0xabc12345', toToken: '0xdef67890' },
    {},
    'forward'
  ),
  '0xab.../0xde...'
);

assert.strictEqual(buildQuoteAlertDisplayLabel(null), '--');
