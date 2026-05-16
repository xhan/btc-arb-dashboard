const assert = require('assert');

const {
  QUOTE_DISPLAY_MODE_AMOUNT,
  QUOTE_DISPLAY_MODE_RATE,
  buildCexOrderbookSummary,
  buildCexOrderbookTooltipHtml,
  buildInverseQuoteDisplayTextForState,
  buildQuoteAlertDisplayLabel,
  buildQuotePairLabelHtml,
  buildQuoteDisplayText,
  buildQuoteDisplayTextForState,
  buildQuoteDisplayToggleState,
  buildQuoteRequestChannelTagHtml,
  extractPriceFromText,
  formatCexBookValue,
  getCexPairLabel,
  getNextQuoteDisplayMode,
  getQuotePairLabel,
  shouldShowKyberDirectPoolsBadge,
  normalizeQuoteDisplayMode
} = require('../quote-display-utils');

assert.strictEqual(normalizeQuoteDisplayMode(), QUOTE_DISPLAY_MODE_RATE);
assert.strictEqual(normalizeQuoteDisplayMode('amount'), QUOTE_DISPLAY_MODE_AMOUNT);
assert.strictEqual(normalizeQuoteDisplayMode('unknown'), QUOTE_DISPLAY_MODE_RATE);
assert.deepStrictEqual(
  buildQuoteDisplayToggleState(QUOTE_DISPLAY_MODE_RATE),
  {
    text: '价格: 汇率',
    title: '切换看板报价显示为数量 (P)',
    mode: QUOTE_DISPLAY_MODE_RATE
  }
);
assert.deepStrictEqual(
  buildQuoteDisplayToggleState(QUOTE_DISPLAY_MODE_AMOUNT),
  {
    text: '价格: 数量',
    title: '切换看板报价显示为汇率 (P)',
    mode: QUOTE_DISPLAY_MODE_AMOUNT
  }
);
assert.strictEqual(getNextQuoteDisplayMode(QUOTE_DISPLAY_MODE_RATE), QUOTE_DISPLAY_MODE_AMOUNT);
assert.strictEqual(getNextQuoteDisplayMode(QUOTE_DISPLAY_MODE_AMOUNT), QUOTE_DISPLAY_MODE_RATE);
assert.strictEqual(getNextQuoteDisplayMode('bad'), QUOTE_DISPLAY_MODE_AMOUNT);

assert.strictEqual(
  buildQuoteDisplayText({
    mode: QUOTE_DISPLAY_MODE_RATE,
    fromSymbol: 'WBTC',
    toSymbol: 'cbBTC',
    rate: 0.99912,
    fallbackText: '...'
  }),
  '1 WBTC ≈ 0.999120 cbBTC'
);

assert.strictEqual(
  buildQuoteDisplayText({
    mode: QUOTE_DISPLAY_MODE_AMOUNT,
    amount: 0.5,
    fromSymbol: 'WBTC',
    toSymbol: 'cbBTC',
    totalAmountOut: 0.49956,
    hideAmountPrefix: true,
    fallbackText: '...'
  }),
  'WBTC ≈ 0.499560 cbBTC'
);

assert.strictEqual(
  buildQuoteDisplayText({
    mode: QUOTE_DISPLAY_MODE_AMOUNT,
    amount: 1,
    fromSymbol: '',
    toSymbol: 'cbBTC',
    totalAmountOut: 0.49956,
    fallbackText: '等待报价...'
  }),
  '等待报价...'
);

assert.strictEqual(
  buildQuoteDisplayTextForState(
    { chain: 'ethereum', amount: 2 },
    { fromSymbol: 'ETH', toSymbol: 'USDC', lastTotalAmountOut: 6.5, lastRawPrice: 3.25, lastResultText: '旧报价' },
    { mode: QUOTE_DISPLAY_MODE_AMOUNT }
  ),
  'ETH ≈ 6.500000 USDC'
);

assert.strictEqual(
  buildQuoteDisplayTextForState(
    { chain: 'ethereum', amount: 2 },
    { fromSymbol: 'ETH', toSymbol: 'USDC', lastTotalAmountOut: 6.5, lastRawPrice: 3.25 },
    { mode: QUOTE_DISPLAY_MODE_RATE }
  ),
  '1 ETH ≈ 3.250000 USDC'
);

assert.strictEqual(
  buildQuoteDisplayTextForState(
    { chain: 'Bybit' },
    { lastResultText: 'bid 1 / ask 2' },
    { mode: QUOTE_DISPLAY_MODE_RATE }
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
    { mode: QUOTE_DISPLAY_MODE_AMOUNT }
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
  getCexPairLabel({ chain: 'Bybit', symbol: 'btcusdt' }, {}),
  'BTCUSDT'
);

assert.strictEqual(
  getCexPairLabel({ chain: 'Binance', symbol: 'ETHUSDT' }, { fromSymbol: 'ETH', toSymbol: 'USDT' }),
  'ETH/USDT'
);

assert.strictEqual(
  getCexPairLabel({ chain: 'ethereum', symbol: 'ETHUSDT' }, {}),
  ''
);

assert.strictEqual(
  getQuotePairLabel({ chain: 'ethereum' }, { fromSymbol: 'cb<BTC>', toSymbol: 'WBTC' }),
  'cb<BTC>/WBTC'
);

assert.strictEqual(
  shouldShowKyberDirectPoolsBadge({ kyberOnlyDirectPools: true, preferredSource: 'Kyber' }),
  true
);

assert.strictEqual(
  shouldShowKyberDirectPoolsBadge({ kyberOnlyDirectPools: true, preferredSource: '0x' }),
  false
);

assert.strictEqual(
  buildQuotePairLabelHtml(
    { chain: 'ethereum', kyberOnlyDirectPools: true, preferredSource: 'Auto' },
    { fromSymbol: 'cb<BTC>', toSymbol: 'WBTC' }
  ),
  'cb&lt;BTC&gt;/WBTC<span class="quote-direct-badge" title="Kyber 仅直连池"></span>'
);

assert.strictEqual(
  buildQuoteRequestChannelTagHtml({ id: 'quote-1' }, { name: '主通道 <A>' }),
  '<span class="quote-channel-tag" id="quote-channel-tag-quote-1">主通道 &lt;A&gt;</span>'
);

assert.strictEqual(
  buildQuoteRequestChannelTagHtml({ id: 'quote-1' }, null),
  ''
);

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
