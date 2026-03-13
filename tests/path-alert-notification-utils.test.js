const assert = require('assert');

const {
  formatPathAlertEvaluationText,
  buildPathAlertNotificationTitle,
  buildPathAlertNotificationBody,
  buildPathAlertAggregatedLog
} = require('../path-alert-notification-utils');

assert.strictEqual(formatPathAlertEvaluationText({ profitBp: 2.05 }), '📈 +2.05bp');
assert.strictEqual(formatPathAlertEvaluationText({ profitBp: -1.23 }), '📈 -1.23bp');
assert.strictEqual(formatPathAlertEvaluationText(null), '--');

const singleEntry = {
  alert: { name: 'WBTC ETH <-> ARB' },
  evaluation: { profitBp: 2.05 },
  summaryLines: [
    '（Arbitrum）cbBTC -> WBTC @1.002688',
    '（ETH）WBTC -> cbBTC @0.997524'
  ],
  summaryLegKeys: ['101|forward|raw', '102|forward|raw'],
  changedLegs: [
    { quoteId: 101, direction: 'forward', pricingMode: 'raw', deltaBp: 1.5 }
  ],
  changedLegLines: [
    '（Arbitrum）cbBTC -> WBTC @1.002688 +1.50bp'
  ]
};

assert.strictEqual(buildPathAlertNotificationTitle([singleEntry]), 'WBTC ETH <-> ARB');
assert.strictEqual(
  buildPathAlertNotificationBody([singleEntry]),
  [
    '📈 +2.05bp',
    '⚡ （Arbitrum）cbBTC -> WBTC @1.002688',
    '（ETH）WBTC -> cbBTC @0.997524',
    '',
    '⚡ 异动腿:',
    '（Arbitrum）cbBTC -> WBTC @1.002688 +1.50bp'
  ].join('\n')
);

const multiEntries = [
  singleEntry,
  {
    alert: { name: 'WBTC ETH <-> ARB (第二条路径)' },
    evaluation: { profitBp: 1.88 },
    summaryLines: [
      '（Base）cbBTC -> WBTC @1.002188',
      '（ETH）WBTC -> cbBTC @0.997992'
    ],
    summaryLegKeys: ['201|forward|raw', '202|forward|raw'],
    changedLegs: [],
    changedLegLines: []
  }
];

assert.strictEqual(buildPathAlertNotificationTitle(multiEntries), '2 条');
assert.strictEqual(
  buildPathAlertNotificationBody(multiEntries),
  [
    'WBTC ETH <-> ARB',
    '📈 +2.05bp',
    '⚡ （Arbitrum）cbBTC -> WBTC @1.002688',
    '（ETH）WBTC -> cbBTC @0.997524',
    '',
    '⚡ 异动腿:',
    '（Arbitrum）cbBTC -> WBTC @1.002688 +1.50bp',
    '',
    'WBTC ETH <-> ARB (第二条路径)',
    '📈 +1.88bp',
    '（Base）cbBTC -> WBTC @1.002188',
    '（ETH）WBTC -> cbBTC @0.997992'
  ].join('\n')
);

assert.deepStrictEqual(
  buildPathAlertAggregatedLog([singleEntry]),
  {
    title: '🚨 [路径报警] WBTC ETH <-> ARB',
    subtitle: '',
    message: [
      '📈 +2.05bp',
      '⚡ （Arbitrum）cbBTC -> WBTC @1.002688',
      '（ETH）WBTC -> cbBTC @0.997524',
      '',
      '⚡ 异动腿:',
      '（Arbitrum）cbBTC -> WBTC @1.002688 +1.50bp'
    ].join('\n')
  }
);

assert.deepStrictEqual(
  buildPathAlertAggregatedLog(multiEntries),
  {
    title: '🚨 [路径报警] 2 条命中',
    subtitle: '',
    message: [
      'WBTC ETH <-> ARB',
      '📈 +2.05bp',
      '⚡ （Arbitrum）cbBTC -> WBTC @1.002688',
      '（ETH）WBTC -> cbBTC @0.997524',
      '',
      '⚡ 异动腿:',
      '（Arbitrum）cbBTC -> WBTC @1.002688 +1.50bp',
      '',
      'WBTC ETH <-> ARB (第二条路径)',
      '📈 +1.88bp',
      '（Base）cbBTC -> WBTC @1.002188',
      '（ETH）WBTC -> cbBTC @0.997992'
    ].join('\n')
  }
);
