const assert = require('assert');

const {
  DEFAULT_ARB_CYCLE_START_PRIORITY,
  normalizeArbCycleStartPriority,
  buildPreferredCycleStartSymbols
} = require('../src/arb/arb-cycle-priority-utils');

assert.deepStrictEqual(DEFAULT_ARB_CYCLE_START_PRIORITY, ['cbBTC', 'WBTC', 'ETH']);

assert.deepStrictEqual(
  normalizeArbCycleStartPriority([' cbBTC ', 'WBTC', '', 'ETH', 'WBTC']),
  ['cbBTC', 'WBTC', 'ETH']
);

assert.deepStrictEqual(
  normalizeArbCycleStartPriority([]),
  ['cbBTC', 'WBTC', 'ETH']
);

assert.deepStrictEqual(
  buildPreferredCycleStartSymbols(
    { xBTC: 'cbBTC', BTCB: 'cbBTC', 'BTC.b': 'cbBTC', wBTC: 'WBTC' },
    ['cbBTC', 'WBTC', 'ETH']
  ),
  ['cbBTC', 'xBTC', 'BTCB', 'BTC.b', 'WBTC', 'wBTC', 'ETH']
);
