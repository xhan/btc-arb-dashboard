const assert = require('assert');

const {
  formatPathAlertEvaluationText,
  buildPathAlertNotificationTitle,
  buildPathAlertNotificationBody,
  buildPathAlertAggregatedLog,
  buildPathAlertLegKey,
  buildQuoteAlertDirectionLabel,
  buildQuoteAlertCurrentValueText,
  buildQuoteAlertRuleLine,
  buildQuoteAlertMessage,
  buildQuoteAlertThresholdLine,
  buildQuoteAlertActionLink,
  buildQuoteAlertTriggeredEntry,
  buildQuoteAlertRemotePayload,
  getQuoteAlertDirection
} = require('../path-alert-notification-utils');

assert.strictEqual(formatPathAlertEvaluationText({ profitBp: 2.05 }), '📈 +2.05bp');
assert.strictEqual(formatPathAlertEvaluationText({ profitBp: -1.23 }), '📈 -1.23bp');
assert.strictEqual(formatPathAlertEvaluationText(null), '--');
assert.strictEqual(
  buildPathAlertLegKey({ quoteId: '101', inverse: true, pricingMode: 'cex-ask1-inverse' }),
  '101|inverse|cex-ask1-inverse'
);
assert.strictEqual(
  buildPathAlertLegKey({ quoteId: 102, direction: 'forward', pricingMode: 'unknown' }),
  '102|forward|raw'
);
assert.strictEqual(buildPathAlertLegKey({ quoteId: 'bad' }), '');

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

assert.strictEqual(getQuoteAlertDirection({ direction: 'inverse' }), 'inverse');
assert.strictEqual(getQuoteAlertDirection({ direction: 'forward' }), 'forward');
assert.strictEqual(getQuoteAlertDirection({}), 'forward');
assert.strictEqual(buildQuoteAlertDirectionLabel({ direction: 'inverse' }), '反向');
assert.strictEqual(
  buildQuoteAlertThresholdLine({ type: 'quote', direction: 'inverse', ruleKind: 'targetAbove', value: 1.01 }),
  '反向 · 汇率阈值 1.01'
);
assert.strictEqual(
  buildQuoteAlertThresholdLine({ type: 'quote', direction: 'forward', ruleKind: 'percentDown', value: 0.2, basePrice: 1 }),
  '正向 · 阈值 0.2% | 基准汇率 1'
);
assert.strictEqual(
  buildQuoteAlertRuleLine({ type: 'quote', ruleKind: 'targetBelow', value: 0.99 }),
  '汇率 <= 0.99'
);
assert.strictEqual(
  buildQuoteAlertRuleLine({ type: 'quote', ruleKind: 'percentUp', value: 0.1, basePrice: 1.0001 }),
  '相对基准上涨 >= 0.1%（基准 1.0001）'
);

assert.strictEqual(
  buildQuoteAlertMessage(
    { target: { ruleKind: 'targetAbove', value: 1.00017 } },
    { currentValue: 1.0002 }
  ),
  '汇率已达到或超过目标 1.00017'
);

assert.strictEqual(
  buildQuoteAlertMessage(
    { target: { ruleKind: 'percentUp', value: 0.1 } },
    { basePrice: 100, currentValue: 100.25, changePercent: 0.25 }
  ),
  '汇率相比基准(100) 上涨 0.250% (>0.1%)'
);

assert.strictEqual(
  buildQuoteAlertMessage(
    { target: { ruleKind: 'percentDown', value: 0.2 } },
    { basePrice: 100, currentValue: 99.75, changePercent: -0.25 }
  ),
  '汇率相比基准(100) 下跌 0.250% (>0.2%)'
);

assert.strictEqual(
  buildQuoteAlertCurrentValueText(
    { target: { ruleKind: 'targetBelow' } },
    { currentValue: 0.9987654321 },
    { formatNumber: (value) => Number(value.toFixed(4)) }
  ),
  '当前汇率 0.9988'
);

assert.strictEqual(
  buildQuoteAlertCurrentValueText(
    { target: { ruleKind: 'percentDown' } },
    { basePrice: 1.0001, currentValue: 0.9997 }
  ),
  '基准汇率 1.0001 -> 0.9997'
);

assert.deepStrictEqual(
  buildQuoteAlertActionLink({ label: 'swap.defillama', url: 'https://example.test/swap' }),
  { label: 'swap.defillama', url: 'https://example.test/swap' }
);
assert.deepStrictEqual(
  buildQuoteAlertActionLink({ url: 'https://example.test/swap' }),
  { label: '交易链接', url: 'https://example.test/swap' }
);
assert.strictEqual(buildQuoteAlertActionLink({ label: 'swap.defillama' }), null);
assert.strictEqual(buildQuoteAlertActionLink(null), null);

const quoteAlertEntry = buildQuoteAlertTriggeredEntry({
  alert: {
    id: 'quote-1',
    target: { type: 'quote', quoteId: 101, ruleKind: 'targetAbove', value: 1.01 }
  },
  quote: { id: 101 },
  displayName: 'Arbitrum',
  label: 'cbBTC/WBTC',
  message: '汇率已达到或超过目标 1.01',
  currentValueText: '当前汇率 1.011',
  actionLink: {
    label: '交易链接',
    url: 'https://example.test/swap'
  }
});
assert.deepStrictEqual(quoteAlertEntry, {
  alert: {
    id: 'quote-1',
    target: { type: 'quote', quoteId: 101, ruleKind: 'targetAbove', value: 1.01 }
  },
  quote: { id: 101 },
  displayName: 'Arbitrum',
  label: 'cbBTC/WBTC',
  message: '汇率已达到或超过目标 1.01',
  currentValueText: '当前汇率 1.011',
  actionLink: {
    label: '交易链接',
    url: 'https://example.test/swap'
  },
  summaryLines: ['Arbitrum cbBTC/WBTC', '汇率已达到或超过目标 1.01'],
  mutedTargetCandidate: {
    id: 'quote-1',
    target: { type: 'quote', quoteId: 101, ruleKind: 'targetAbove', value: 1.01 }
  }
});
assert.deepStrictEqual(
  buildQuoteAlertTriggeredEntry({
    alert: { id: 'path-1', target: { type: 'path', legs: [] } },
    message: '路径命中'
  }).mutedTargetCandidate,
  null
);

assert.deepStrictEqual(
  buildQuoteAlertRemotePayload({
    chainName: 'Arbitrum',
    label: 'BTCB/syBTC',
    currentValueText: '0.1 -> 0.100115',
    message: '价格相比基准(100.000000) 上涨 0.250% (>0.1%)'
  }),
  {
    title: 'Arbitrum BTCB/syBTC  0.1 -> 0.100115',
    body: '价格相比基准(100.000000) 上涨 0.250% (>0.1%)',
    telegramHtmlBody: '价格相比基准(100.000000) 上涨 0.250% (&gt;0.1%)'
  }
);

assert.deepStrictEqual(
  buildQuoteAlertRemotePayload({
    chainName: 'Bybit',
    label: 'BTCB/syBTC',
    currentValueText: '0.1 -> 0.100115',
    message: '总价已达到或超过目标 70000'
  }),
  {
    title: 'Bybit BTCB/syBTC  0.1 -> 0.100115',
    body: '总价已达到或超过目标 70000',
    telegramHtmlBody: '总价已达到或超过目标 70000'
  }
);

assert.deepStrictEqual(
  buildQuoteAlertRemotePayload({
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
    title: 'ETH cbBTC/BTC.b  1 -> 1.000224',
    body: '总价已达到或超过目标 1.00017\nswap.defillama: https://swap.defillama.com/?chain=ethereum&from=0x1&tab=swap&to=0x2',
    telegramHtmlBody: '总价已达到或超过目标 1.00017\n<a href="https://swap.defillama.com/?chain=ethereum&amp;from=0x1&amp;tab=swap&amp;to=0x2">swap.defillama</a>'
  }
);

assert.strictEqual(
  Object.prototype.hasOwnProperty.call(require('../path-alert-notification-utils'), 'buildLegacyQuoteAlertRemotePayload'),
  false
);
