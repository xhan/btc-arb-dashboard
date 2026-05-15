const assert = require('assert');

const {
  QUOTE_DISPLAY_MODE_AMOUNT,
  QUOTE_DISPLAY_MODE_RATE,
  buildInverseQuoteDisplayTextForState,
  buildQuotePairLabelHtml,
  buildQuoteDisplayText,
  buildQuoteDisplayTextForState,
  getCexPairLabel,
  getQuotePairLabel,
  shouldShowKyberDirectPoolsBadge,
  normalizeQuoteDisplayMode
} = require('../quote-display-utils');

assert.strictEqual(normalizeQuoteDisplayMode(), QUOTE_DISPLAY_MODE_RATE);
assert.strictEqual(normalizeQuoteDisplayMode('amount'), QUOTE_DISPLAY_MODE_AMOUNT);
assert.strictEqual(normalizeQuoteDisplayMode('unknown'), QUOTE_DISPLAY_MODE_RATE);

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
