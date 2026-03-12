const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const quotePauseUtils = require('../quote-pause-utils');

assert.strictEqual(quotePauseUtils.isQuotePaused({ paused: true }), true);
assert.strictEqual(quotePauseUtils.isQuotePaused({ paused: false }), false);
assert.strictEqual(quotePauseUtils.isQuotePaused({}), false);

assert.deepStrictEqual(
  quotePauseUtils.getActiveQuotes([
    { id: 1, paused: false },
    { id: 2, paused: true },
    { id: 3 }
  ]),
  [
    { id: 1, paused: false },
    { id: 3 }
  ]
);

assert.strictEqual(
  quotePauseUtils.getCategoryPauseAction([
    { id: 1, paused: true },
    { id: 2, paused: false }
  ]),
  'pause'
);

assert.strictEqual(
  quotePauseUtils.getCategoryPauseAction([
    { id: 1, paused: true },
    { id: 2, paused: true }
  ]),
  'resume'
);

assert.deepStrictEqual(
  quotePauseUtils.buildPausedQuoteState({
    fromSymbol: 'WBTC',
    toSymbol: 'cbBTC',
    lastRawPrice: 1.001,
    lastResultText: 'WBTC ≈ 1.001 cbBTC',
    inverseRawPrice: 0.999,
    inverseFromSymbol: 'cbBTC',
    inverseToSymbol: 'WBTC',
    usedSource: 'Kyber',
    usedSourceReal: 'KyberSwap',
    cexOrderbook: { bids: [['1', '2']] },
    hasUnreadAlert: true,
    logShown: true,
    isSoundActive: true
  }),
  {
    fromSymbol: 'WBTC',
    toSymbol: 'cbBTC',
    lastRawPrice: null,
    lastResultText: '',
    inverseRawPrice: null,
    inverseFromSymbol: '',
    inverseToSymbol: '',
    usedSource: '',
    usedSourceReal: '',
    cexOrderbook: null,
    hasUnreadAlert: false,
    logShown: false,
    isSoundActive: false
  }
);

assert.deepStrictEqual(
  quotePauseUtils.buildPausedQuoteState({
    lastRawPrice: 1.001,
    lastResultText: 'anonymous pair'
  }),
  {
    fromSymbol: '',
    toSymbol: '',
    lastRawPrice: null,
    lastResultText: '',
    inverseRawPrice: null,
    inverseFromSymbol: '',
    inverseToSymbol: '',
    usedSource: '',
    usedSourceReal: '',
    cexOrderbook: null,
    hasUnreadAlert: false,
    logShown: false,
    isSoundActive: false
  }
);

assert.deepStrictEqual(
  quotePauseUtils.buildPausedQuoteState(null),
  {
    fromSymbol: '',
    toSymbol: '',
    lastRawPrice: null,
    lastResultText: '',
    inverseRawPrice: null,
    inverseFromSymbol: '',
    inverseToSymbol: '',
    usedSource: '',
    usedSourceReal: '',
    cexOrderbook: null,
    hasUnreadAlert: false,
    logShown: false,
    isSoundActive: false
  }
);

const browserCode = fs.readFileSync(path.join(__dirname, '..', 'quote-pause-utils.js'), 'utf8');
const browserSandbox = { window: {} };
vm.createContext(browserSandbox);
assert.doesNotThrow(() => vm.runInContext(browserCode, browserSandbox));
assert.ok(browserSandbox.window.QuotePauseUtils, 'expected QuotePauseUtils to attach to window');
