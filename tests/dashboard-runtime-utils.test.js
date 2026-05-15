const assert = require('assert');

const {
  buildDataTerminalRecordsCacheKey,
  buildQuoteMarketStateSignature,
  hasQuoteMarketStateChanged,
  hasActivePathAlertEvaluationTarget,
  isPanelVisible,
  resolveMutedStateRefreshDelay
} = require('../dashboard-runtime-utils');

assert.strictEqual(isPanelVisible(null), false);
assert.strictEqual(isPanelVisible({}), true);
assert.strictEqual(
  isPanelVisible({}, () => ({ display: 'none' })),
  false
);
assert.strictEqual(
  isPanelVisible({}, () => ({ display: 'flex' })),
  true
);
assert.strictEqual(
  isPanelVisible({}, () => {
    throw new Error('style unavailable');
  }),
  true
);

assert.strictEqual(hasActivePathAlertEvaluationTarget(null), false);
assert.strictEqual(
  hasActivePathAlertEvaluationTarget({
    alerts: [
      { id: 'quote-1', enabled: true, target: { type: 'quote', quoteId: 1 } },
      { id: 'disabled-path', enabled: false, target: { type: 'path', legs: [] } }
    ]
  }),
  false
);
assert.strictEqual(
  hasActivePathAlertEvaluationTarget({
    alerts: [
      { id: 'path-1', enabled: true, target: { type: 'path', legs: [{ quoteId: 1 }] } }
    ]
  }),
  true
);
assert.strictEqual(
  hasActivePathAlertEvaluationTarget({
    alerts: [
      { id: 'rule-1', target: { type: 'rule', ruleKind: 'fixed', ruleId: 'fixed:wbtc-eth-arb' } }
    ]
  }),
  true
);

assert.strictEqual(resolveMutedStateRefreshDelay({ nowMs: 1000 }), null);
assert.strictEqual(
  resolveMutedStateRefreshDelay({
    mutedPathTargets: [{ expiresAt: 5000 }],
    nowMs: 1000,
    visible: true
  }),
  1000
);
assert.strictEqual(
  resolveMutedStateRefreshDelay({
    mutedPathTargets: [{ expiresAt: 1500 }],
    nowMs: 1000,
    hiddenMinRefreshMs: 1000,
    hiddenMaxRefreshMs: 60 * 1000
  }),
  1000
);
assert.strictEqual(
  resolveMutedStateRefreshDelay({
    mutedPathTargets: [{ expiresAt: 2500 }],
    nowMs: 1000,
    hiddenMinRefreshMs: 1000,
    hiddenMaxRefreshMs: 60 * 1000
  }),
  1550
);
assert.strictEqual(
  resolveMutedStateRefreshDelay({
    mutedPathTargets: [{ expiresAt: 10 * 60 * 1000 }],
    nowMs: 1000,
    hiddenMaxRefreshMs: 60 * 1000
  }),
  60 * 1000
);
assert.strictEqual(
  resolveMutedStateRefreshDelay({
    mutedPathTargets: [{ expiresAt: null }],
    nowMs: 1000,
    hiddenMinRefreshMs: 1000
  }),
  1000
);

const dashboard = [
  {
    id: 10,
    name: 'WBTC监控',
    quotes: [
      {
        id: 101,
        chain: 'ethereum',
        toChain: '',
        fromToken: '0xaaa',
        toToken: '0xbbb',
        symbol: '',
        amount: 1,
        showInverse: true,
        paused: false
      }
    ]
  }
];

const firstKey = buildDataTerminalRecordsCacheKey(dashboard, 1);
assert.strictEqual(firstKey, buildDataTerminalRecordsCacheKey(dashboard, 1));
assert.notStrictEqual(firstKey, buildDataTerminalRecordsCacheKey(dashboard, 2));

const pausedDashboard = JSON.parse(JSON.stringify(dashboard));
pausedDashboard[0].quotes[0].paused = true;
assert.notStrictEqual(firstKey, buildDataTerminalRecordsCacheKey(pausedDashboard, 1));

const retokenizedDashboard = JSON.parse(JSON.stringify(dashboard));
retokenizedDashboard[0].quotes[0].toToken = '0xccc';
assert.notStrictEqual(firstKey, buildDataTerminalRecordsCacheKey(retokenizedDashboard, 1));

const marketState = {
  fromSymbol: 'cbBTC',
  toSymbol: 'WBTC',
  lastResultText: 'cbBTC ≈ 1.001 WBTC',
  lastRawPrice: 1.001,
  lastTotalAmountOut: 1.001,
  inverseRawPrice: 0.999,
  inverseTotalAmountOut: 0.999,
  inverseFromSymbol: 'WBTC',
  inverseToSymbol: 'cbBTC',
  usedSource: 'Kyber',
  usedSourceReal: 'Kyber',
  cexOrderbook: null,
  hasUnreadAlert: false,
  logShown: false,
  trendTimer: 123
};

const sameMarketStateWithUiChanges = {
  ...marketState,
  hasUnreadAlert: true,
  logShown: true,
  trendTimer: 456
};

assert.strictEqual(
  buildQuoteMarketStateSignature(marketState),
  buildQuoteMarketStateSignature(sameMarketStateWithUiChanges)
);
assert.strictEqual(hasQuoteMarketStateChanged(marketState, sameMarketStateWithUiChanges), false);
assert.strictEqual(
  hasQuoteMarketStateChanged(marketState, { ...marketState, lastRawPrice: 1.002 }),
  true
);
assert.strictEqual(
  hasQuoteMarketStateChanged(marketState, {
    ...marketState,
    cexOrderbook: { bestBidPrice: 100, bestAskPrice: 101 }
  }),
  true
);
