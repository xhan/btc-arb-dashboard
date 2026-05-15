const assert = require('assert');

const {
  QUOTE_DISPLAY_MODE_AMOUNT,
  QUOTE_DISPLAY_MODE_RATE,
  buildQuotePairLabelHtml,
  buildQuoteDisplayText,
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
