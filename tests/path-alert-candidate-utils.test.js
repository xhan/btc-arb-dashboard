const assert = require('assert');

const {
  buildPathAlertCandidateRecordsFromDashboard,
  buildPathAlertCandidates,
  buildPathAlertCandidatesFromDashboard,
  filterPathAlertCandidates,
  matchesPathAlertCandidate
} = require('../path-alert-candidate-utils');

const candidates = buildPathAlertCandidates([
  {
    categoryName: '测试监控',
    quote: {
      id: 101,
      chain: 'ethereum',
      showInverse: true
    },
    fromSymbol: 'GHO',
    toSymbol: 'USDC'
  },
  {
    categoryName: '测试监控',
    quote: {
      id: 102,
      chain: 'ethereum',
      paused: true,
      showInverse: true
    },
    fromSymbol: 'PAUSED',
    toSymbol: 'USDT'
  },
  {
    categoryName: '测试监控',
    quote: {
      id: 103,
      chain: 'Bybit',
      symbol: 'WBTCBTC'
    },
    fromSymbol: 'WBTC',
    toSymbol: 'BTC'
  }
]);

assert.ok(candidates.some((item) => item.key === '101:forward'));
assert.ok(candidates.some((item) => item.key === '101:inverse'));
assert.ok(!candidates.some((item) => item.key.startsWith('102:')));
assert.ok(candidates.some((item) => item.key === '103:cex-bid1'));
assert.ok(candidates.some((item) => item.key === '103:cex-ask1-inverse'));

assert.strictEqual(matchesPathAlertCandidate(candidates[0], '测试 GHO'), true);
assert.strictEqual(matchesPathAlertCandidate(candidates[0], 'missing'), false);
assert.deepStrictEqual(
  filterPathAlertCandidates(candidates, '测试', 2).map((item) => item.key),
  ['101:forward', '101:inverse']
);
assert.deepStrictEqual(filterPathAlertCandidates(candidates, 'missing'), []);

const dashboard = [
  {
    name: 'Dashboard A',
    quotes: [
      {
        id: 201,
        chain: 'ethereum',
        fromToken: '0x1234567890abcdef123456',
        toToken: 'USDC',
        showInverse: true
      },
      {
        id: 202,
        chain: 'Bybit',
        symbol: 'WBTCBTC'
      }
    ]
  }
];
const dashboardRecords = buildPathAlertCandidateRecordsFromDashboard(dashboard, {
  parseCexTradingPairSymbol(symbol) {
    return symbol === 'WBTCBTC' ? { fromSymbol: 'WBTC', toSymbol: 'BTC' } : null;
  }
});
assert.deepStrictEqual(
  dashboardRecords.map((item) => ({
    quoteId: item.quote.id,
    fromSymbol: item.fromSymbol,
    toSymbol: item.toSymbol
  })),
  [
    { quoteId: 201, fromSymbol: '0x123456...123456', toSymbol: 'USDC' },
    { quoteId: 202, fromSymbol: 'WBTC', toSymbol: 'BTC' }
  ]
);

assert.deepStrictEqual(
  buildPathAlertCandidatesFromDashboard(dashboard, {
    parseCexTradingPairSymbol(symbol) {
      return symbol === 'WBTCBTC' ? { fromSymbol: 'WBTC', toSymbol: 'BTC' } : null;
    },
    buildLabel(chain, fromSymbol, toSymbol, suffix = '') {
      return `${chain}:${fromSymbol}->${toSymbol}${suffix}`;
    }
  }).map((item) => item.key),
  ['201:forward', '201:inverse', '202:cex-bid1', '202:cex-ask1-inverse']
);
