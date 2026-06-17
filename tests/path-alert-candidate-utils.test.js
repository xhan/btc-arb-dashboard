const assert = require('assert');

const {
  buildPathAlertCandidates,
  buildPathAlertCandidatesFromDashboard,
  filterPathAlertCandidates
} = require('../src/path-alerts/path-alert-candidate-utils');

const dashboard = [
  {
    name: 'Dashboard A',
    quotes: [
      {
        id: 201,
        chain: 'arbitrum',
        fromToken: '0x1234567890abcdef123456',
        toToken: 'USDC',
        showInverse: true
      },
      {
        id: 203,
        chain: 'ethereum',
        fromToken: 'PAUSED',
        toToken: 'USDT',
        paused: true,
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

const candidates = buildPathAlertCandidatesFromDashboard(dashboard, {
  parseCexTradingPairSymbol(symbol) {
    return symbol === 'WBTCBTC' ? { fromSymbol: 'WBTC', toSymbol: 'BTC' } : null;
  },
  buildLabel(chain, fromSymbol, toSymbol, suffix = '') {
    return `${chain}:${fromSymbol}->${toSymbol}${suffix}`;
  }
});

assert.deepStrictEqual(
  candidates.map((item) => item.key),
  ['201:forward', '201:inverse', '202:cex-bid1', '202:cex-ask1-inverse']
);
assert.deepStrictEqual(
  candidates.map((item) => ({
    key: item.key,
    fromSymbol: item.fromSymbol,
    toSymbol: item.toSymbol,
    label: item.label
  })),
  [
    {
      key: '201:forward',
      fromSymbol: '0x123456...123456',
      toSymbol: 'USDC',
      label: 'arbitrum:0x123456...123456->USDC'
    },
    {
      key: '201:inverse',
      fromSymbol: 'USDC',
      toSymbol: '0x123456...123456',
      label: 'arbitrum:USDC->0x123456...123456'
    },
    {
      key: '202:cex-bid1',
      fromSymbol: 'WBTC',
      toSymbol: 'BTC',
      label: 'Bybit:WBTC->BTC [bid1]'
    },
    {
      key: '202:cex-ask1-inverse',
      fromSymbol: 'BTC',
      toSymbol: 'WBTC',
      label: 'Bybit:BTC->WBTC [ask1]'
    }
  ]
);
assert.ok(!candidates.some((item) => item.key.startsWith('203:')));
assert.deepStrictEqual(
  filterPathAlertCandidates(candidates, 'Dashboard 0x123456', 2).map((item) => item.key),
  ['201:forward', '201:inverse']
);
assert.deepStrictEqual(
  filterPathAlertCandidates(candidates, 'arb 0x123456', 2).map((item) => item.key),
  ['201:forward', '201:inverse']
);
const aliasSearchCandidates = buildPathAlertCandidates([{
  categoryName: 'Alias Search',
  quote: { id: 301, chain: 'avalanche' },
  fromSymbol: 'BTC.b',
  toSymbol: 'USDC'
}]);
assert.deepStrictEqual(
  filterPathAlertCandidates(aliasSearchCandidates, 'avax BTC.b').map((item) => item.key),
  ['301:forward']
);
assert.deepStrictEqual(filterPathAlertCandidates(candidates, 'missing'), []);
