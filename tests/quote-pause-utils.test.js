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

const pausedFromExistingState = quotePauseUtils.buildPausedQuoteState({
  fromSymbol: 'WBTC',
  toSymbol: 'cbBTC',
  lastRawPrice: 1.001,
  lastTotalAmountOut: 0.999,
  lastResultText: 'WBTC ≈ 1.001 cbBTC',
  inverseRawPrice: 0.999,
  inverseTotalAmountOut: 1.001,
  inverseFromSymbol: 'cbBTC',
  inverseToSymbol: 'WBTC',
  usedSource: 'Kyber',
  usedSourceReal: 'KyberSwap',
  cexOrderbook: { bids: [['1', '2']] },
  hasUnreadAlert: true,
  logShown: true,
  isSoundActive: true
});
assert.deepStrictEqual(
  pausedFromExistingState,
  {
    fromSymbol: 'WBTC',
    toSymbol: 'cbBTC',
    lastRawPrice: null,
    lastTotalAmountOut: null,
    lastResultText: '',
    inverseRawPrice: null,
    inverseTotalAmountOut: null,
    inverseFromSymbol: '',
    inverseToSymbol: '',
    usedSource: '',
    usedSourceReal: '',
    cexOrderbook: null
  }
);
assert.deepStrictEqual(
  Object.keys(pausedFromExistingState).filter((field) => ['hasUnreadAlert', 'logShown', 'isSoundActive'].includes(field)),
  []
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
    lastTotalAmountOut: null,
    lastResultText: '',
    inverseRawPrice: null,
    inverseTotalAmountOut: null,
    inverseFromSymbol: '',
    inverseToSymbol: '',
    usedSource: '',
    usedSourceReal: '',
    cexOrderbook: null
  }
);

assert.deepStrictEqual(
  quotePauseUtils.buildPausedQuoteState(null),
  {
    fromSymbol: '',
    toSymbol: '',
    lastRawPrice: null,
    lastTotalAmountOut: null,
    lastResultText: '',
    inverseRawPrice: null,
    inverseTotalAmountOut: null,
    inverseFromSymbol: '',
    inverseToSymbol: '',
    usedSource: '',
    usedSourceReal: '',
    cexOrderbook: null
  }
);

assert.deepStrictEqual(
  quotePauseUtils.buildQuotePauseButtonState({ paused: true }),
  {
    title: '恢复',
    ariaLabel: '恢复',
    ariaPressed: 'true',
    icon: '▶️'
  }
);

assert.deepStrictEqual(
  quotePauseUtils.buildQuotePauseButtonState({ paused: false }),
  {
    title: '暂停',
    ariaLabel: '暂停',
    ariaPressed: 'false',
    icon: '⏸️'
  }
);

assert.deepStrictEqual(
  quotePauseUtils.buildCategoryPauseButtonState([
    { id: 1, paused: true },
    { id: 2, paused: true }
  ]),
  {
    action: 'resume',
    title: '恢复分区',
    ariaLabel: '恢复分区',
    ariaPressed: 'true',
    icon: '▶️'
  }
);

assert.deepStrictEqual(
  quotePauseUtils.buildCategoryPauseButtonState([
    { id: 1, paused: true },
    { id: 2, paused: false }
  ]),
  {
    action: 'pause',
    title: '暂停分区',
    ariaLabel: '暂停分区',
    ariaPressed: 'false',
    icon: '⏸️'
  }
);

const browserCode = fs.readFileSync(path.join(__dirname, '..', 'quote-pause-utils.js'), 'utf8');
const browserSandbox = { window: {} };
vm.createContext(browserSandbox);
assert.doesNotThrow(() => vm.runInContext(browserCode, browserSandbox));
assert.ok(browserSandbox.window.QuotePauseUtils, 'expected QuotePauseUtils to attach to window');
