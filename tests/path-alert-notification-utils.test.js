const assert = require('assert');

const {
  formatPathAlertEvaluationText,
  buildPathAlertNotificationTitle,
  buildPathAlertNotificationBody,
  buildPathAlertAggregatedLog,
  buildLegacyQuoteAlertRemotePayload
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

assert.deepStrictEqual(
  buildLegacyQuoteAlertRemotePayload({
    chainName: 'Arbitrum',
    label: 'BTCB/syBTC',
    currentValueText: '0.1 -> 0.100115',
    message: '价格相比基准(100.000000) 上涨 0.250% (>0.1%)'
  }),
  {
    title: '[监控提醒] Arbitrum',
    body: 'BTCB/syBTC  0.1 -> 0.100115\n价格相比基准(100.000000) 上涨 0.250% (>0.1%)',
    telegramHtmlBody: 'BTCB/syBTC  0.1 -&gt; 0.100115\n价格相比基准(100.000000) 上涨 0.250% (&gt;0.1%)'
  }
);

assert.deepStrictEqual(
  buildLegacyQuoteAlertRemotePayload({
    chainName: 'Bybit',
    label: 'BTCB/syBTC',
    currentValueText: '0.1 -> 0.100115',
    message: '总价已达到或超过目标 70000'
  }),
  {
    title: '[监控提醒] Bybit',
    body: 'BTCB/syBTC  0.1 -> 0.100115\n总价已达到或超过目标 70000',
    telegramHtmlBody: 'BTCB/syBTC  0.1 -&gt; 0.100115\n总价已达到或超过目标 70000'
  }
);

assert.deepStrictEqual(
  buildLegacyQuoteAlertRemotePayload({
    chainName: 'ETH',
    label: 'cbBTC/BTC.b',
    currentValueText: '1 -> 1.000224',
    message: '总价已达到或超过目标 1.00017',
    actionLink: {
      label: 'swap.defillama',
      url: 'https://swap.defillama.com/?chain=ethereum&from=0x1&tab=swap&to=0x2'
    }
  }),
  {
    title: '[监控提醒] ETH',
    body: 'cbBTC/BTC.b  1 -> 1.000224\n总价已达到或超过目标 1.00017\nswap.defillama: https://swap.defillama.com/?chain=ethereum&from=0x1&tab=swap&to=0x2',
    telegramHtmlBody: 'cbBTC/BTC.b  1 -&gt; 1.000224\n总价已达到或超过目标 1.00017\n<a href="https://swap.defillama.com/?chain=ethereum&amp;from=0x1&amp;tab=swap&amp;to=0x2">swap.defillama</a>'
  }
);
