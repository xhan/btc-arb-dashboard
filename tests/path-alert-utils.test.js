const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  DEFAULT_PATH_ALERT_SETTINGS,
  DEFAULT_PATH_ALERT_THRESHOLD_BP,
  normalizeAlertConfig,
  normalizePathAlert,
  normalizeDismissedTarget,
  evaluatePathAlert,
  advancePathAlertRuntime,
  advanceQuoteAlertRuntime,
  shouldActivatePathAlertSound,
  isPathAlertConfirmDelayDisabled,
  buildPathAlertWebhookUrl,
  buildPathAlertSummaryLines,
  buildPathAlertTargetDuplicateKey,
  countPathAlertRealLegs,
  createDismissedTargetEntry,
  findDuplicatePathAlert,
  findDismissedPathAlert,
  getQuoteAlertsForQuoteId,
  buildAllLegSnapshots,
  buildTriggeredPathAlertChangedLegs,
  resolvePathAlertSnapshotState,
  buildChangedLegs,
  buildMutedPathLogTitleSnapshot,
  buildMutedPathLegStatusText,
  buildMutedPathStatusText,
  buildMutedPathTargetKey,
  findMutedPathTargetByKey,
  removeMutedPathTargetByKey,
  upsertMutedPathTargetEntry,
  sortTriggeredPathAlerts,
  PATH_ALERT_MUTE_DURATION_MS,
  PATH_ALERT_MUTE_EXTEND_DURATION_MS,
  createMutedPathTargetEntry,
  extendMutedPathTargetEntry,
  findMutedPathAlert,
  pruneExpiredMutedPathTargets,
  formatMutedCountdown,
  buildEffectiveRuntimeAlert
} = require('../path-alert-utils');

const emptyConfig = normalizeAlertConfig();
assert.strictEqual(emptyConfig.version, 1);
assert.deepStrictEqual(emptyConfig.settings, DEFAULT_PATH_ALERT_SETTINGS);
assert.deepStrictEqual(emptyConfig.alerts, []);
assert.strictEqual(DEFAULT_PATH_ALERT_SETTINGS.localSoundEnabled, true);
assert.strictEqual(DEFAULT_PATH_ALERT_SETTINGS.webhookEnabled, false);
assert.strictEqual(DEFAULT_PATH_ALERT_THRESHOLD_BP, 1.1);
assert.strictEqual(DEFAULT_PATH_ALERT_SETTINGS.defaultCooldownSec, 180);
assert.strictEqual(DEFAULT_PATH_ALERT_SETTINGS.changedLegMinBp, 0.1);
assert.strictEqual(DEFAULT_PATH_ALERT_SETTINGS.dayAppEnabled, false);
assert.strictEqual(DEFAULT_PATH_ALERT_SETTINGS.telegramEnabled, true);
assert.strictEqual(
  DEFAULT_PATH_ALERT_SETTINGS.webhookUrl,
  'https://api.day.app/45xWAiD79Rn8DPXw6Beudh/[title]/[body]?sound=ladder'
);

const normalizedConfig = normalizeAlertConfig({
  settings: {
    pathAlertEvalIntervalMs: '2000',
    defaultCooldownSec: '120',
    localSoundEnabled: false,
    webhookEnabled: true
  },
  alerts: [
    {
      id: 'path-1',
      name: '测试路径',
      enabled: true,
      thresholdBp: '3.5',
      triggerMode: 'delayed',
      confirmDelaySec: '8',
      cooldownSec: '90',
      target: {
        type: 'path',
        legs: [
          {
            quoteId: '11',
            direction: 'forward',
            pricingMode: 'raw',
            chain: 'ethereum',
            fromSymbol: 'GHO',
            toSymbol: 'USDC'
          }
        ]
      }
    },
    {
      id: 'quote-1',
      name: '报价高于',
      enabled: true,
      triggerMode: 'delayed',
      confirmDelaySec: '5',
      cooldownSec: '180',
      target: {
        type: 'quote',
        quoteId: '101',
        ruleKind: 'targetAbove',
        value: '0.100113'
      }
    }
  ]
});

assert.strictEqual(normalizedConfig.settings.pathAlertEvalIntervalMs, 2000);
assert.strictEqual(normalizedConfig.settings.defaultCooldownSec, 120);
assert.strictEqual(normalizedConfig.settings.localSoundEnabled, false);
assert.strictEqual(normalizedConfig.settings.webhookEnabled, true);
assert.strictEqual(normalizedConfig.settings.changedLegMinBp, 0.1);
assert.strictEqual(normalizedConfig.settings.dayAppEnabled, false);
assert.strictEqual(normalizedConfig.settings.telegramEnabled, true);
assert.strictEqual(normalizedConfig.alerts[0].thresholdBp, 3.5);
assert.strictEqual(normalizedConfig.alerts[0].confirmDelaySec, 8);
assert.strictEqual(normalizedConfig.alerts[0].cooldownSec, 90);
assert.strictEqual(normalizedConfig.alerts[0].target.legs[0].quoteId, 11);
assert.strictEqual(Object.prototype.hasOwnProperty.call(normalizedConfig.alerts[0], 'delivery'), false);
assert.strictEqual(normalizedConfig.alerts[1].target.type, 'quote');
assert.strictEqual(normalizedConfig.alerts[1].target.quoteId, 101);
assert.strictEqual(normalizedConfig.alerts[1].target.ruleKind, 'targetAbove');
assert.strictEqual(normalizedConfig.alerts[1].target.value, 0.100113);
assert.strictEqual(Object.prototype.hasOwnProperty.call(normalizedConfig.alerts[1], 'delivery'), false);
assert.deepStrictEqual(
  getQuoteAlertsForQuoteId({
    alerts: [
      normalizedConfig.alerts[0],
      normalizedConfig.alerts[1],
      { id: 'quote-disabled', enabled: false, target: { type: 'quote', quoteId: 101, direction: 'forward', ruleKind: 'targetBelow', value: 0.1 } },
      { id: 'quote-other', target: { type: 'quote', quoteId: 102, direction: 'forward', ruleKind: 'targetAbove', value: 0.2 } }
    ]
  }, '101').map((alert) => alert.id),
  ['quote-1', 'quote-disabled']
);

const normalizedDismissedConfig = normalizeAlertConfig({
  dismissedTargets: [
    {
      target: {
        type: 'path',
        legs: [
          {
            quoteId: 31,
            direction: 'forward',
            pricingMode: 'raw',
            chain: 'ethereum',
            fromSymbol: 'A',
            toSymbol: 'B'
          },
          {
            quoteId: 32,
            direction: 'forward',
            pricingMode: 'raw',
            chain: 'arbitrum',
            fromSymbol: 'B',
            toSymbol: 'A'
          }
        ]
      },
      summaryLinesSnapshot: ['(ETH) A -> B', '(ARB) B -> A'],
      dismissedAt: 123456
    }
  ]
});
assert.strictEqual(normalizedDismissedConfig.dismissedTargets.length, 1);
assert.strictEqual(normalizedDismissedConfig.dismissedTargets[0].dismissedAt, 123456);
assert.deepStrictEqual(
  normalizedDismissedConfig.dismissedTargets[0].summaryLinesSnapshot,
  ['(ETH) A -> B', '(ARB) B -> A']
);

const normalizedSpecialRuleConfig = normalizeAlertConfig({
  settings: { defaultCooldownSec: 180 },
  alerts: [
    {
      id: 'rule-alert-special-usde-bybit',
      name: 'USDe <-> BYBIT',
      enabled: true,
      thresholdBp: 0,
      triggerMode: 'delayed',
      confirmDelaySec: 15,
      cooldownSec: 120,
      target: {
        type: 'rule',
        ruleKind: 'special',
        ruleId: 'special:usde-bybit'
      },
      specialRuleConfig: {
        minNetProfit: 8,
        minNetProfitBp: 0.5
      }
    }
  ]
});
assert.deepStrictEqual(normalizedSpecialRuleConfig.alerts[0].specialRuleConfig, {
  minNetProfit: 8,
  minNetProfitBp: 0.5
});

const browserLikeContext = {
  console,
  globalThis: {},
  setTimeout,
  clearTimeout
};
browserLikeContext.globalThis = browserLikeContext;
vm.createContext(browserLikeContext);
const browserLikePathAlertUtilsSource = fs.readFileSync(path.join(__dirname, '..', 'path-alert-utils.js'), 'utf8');
vm.runInContext(browserLikePathAlertUtilsSource, browserLikeContext);
browserLikeContext.SpecialRuleAlertConfigUtils = {
  normalizeSpecialRuleAlertConfig(input) {
    return {
      minNetProfit: Number(input && input.minNetProfit),
      minNetProfitBp: Number(input && input.minNetProfitBp)
    };
  }
};
const browserNormalizedSpecialRuleConfig = browserLikeContext.PathAlertUtils.normalizeAlertConfig({
  settings: { defaultCooldownSec: 180 },
  alerts: [
    {
      id: 'rule-alert-special-usdtb-bybit',
      name: 'USDtb <-> BYBIT',
      enabled: true,
      target: {
        type: 'rule',
        ruleKind: 'special',
        ruleId: 'special:usdtb-bybit'
      },
      specialRuleConfig: {
        minNetProfit: 8,
        minNetProfitBp: 0.5
      }
    }
  ]
});
assert.deepStrictEqual(browserNormalizedSpecialRuleConfig.alerts[0].specialRuleConfig, {
  minNetProfit: 8,
  minNetProfitBp: 0.5
});

assert.strictEqual(PATH_ALERT_MUTE_DURATION_MS, 60 * 60 * 1000);
assert.strictEqual(PATH_ALERT_MUTE_EXTEND_DURATION_MS, 2 * 60 * 60 * 1000);

const mutedPathEntry = createMutedPathTargetEntry(
  {
    target: {
      type: 'path',
      legs: [
        { quoteId: 21, direction: 'forward', pricingMode: 'raw', chain: 'ethereum', fromSymbol: 'tBTC', toSymbol: 'BTC.b' },
        { quoteId: 22, direction: 'forward', pricingMode: 'raw', chain: 'base', fromSymbol: 'cbBTC', toSymbol: 'tBTC' }
      ]
    }
  },
  ['(ETH) tBTC -> BTC.b', '(Base) cbBTC -> tBTC'],
  1000,
  PATH_ALERT_MUTE_DURATION_MS,
  { logTitleSnapshot: '🚨 [路径报警] tBTC - BTC' }
);
assert.strictEqual(mutedPathEntry.mutedAt, 1000);
assert.strictEqual(mutedPathEntry.expiresAt, 1000 + PATH_ALERT_MUTE_DURATION_MS);
assert.strictEqual(mutedPathEntry.logTitleSnapshot, '🚨 [路径报警] tBTC - BTC');
assert.deepStrictEqual(
  mutedPathEntry.summaryLinesSnapshot,
  ['(ETH) tBTC -> BTC.b', '(Base) cbBTC -> tBTC']
);

assert.ok(findMutedPathAlert([mutedPathEntry], {
  target: {
    type: 'path',
    legs: [
      { quoteId: 21, direction: 'forward', pricingMode: 'raw', chain: 'ethereum', fromSymbol: 'tBTC', toSymbol: 'BTC.b' },
      { quoteId: 22, direction: 'forward', pricingMode: 'raw', chain: 'base', fromSymbol: 'cbBTC', toSymbol: 'tBTC' }
    ]
  }
}, 2000));
assert.strictEqual(findMutedPathAlert([mutedPathEntry], mutedPathEntry, 1000 + PATH_ALERT_MUTE_DURATION_MS + 1), null);
assert.deepStrictEqual(pruneExpiredMutedPathTargets([mutedPathEntry], 1000 + PATH_ALERT_MUTE_DURATION_MS + 1), []);
assert.strictEqual(formatMutedCountdown(59 * 60 * 1000 + 9000), '59:09');
assert.strictEqual(buildMutedPathStatusText({ expiresAt: 1000 + 59 * 1000 }, 1000), '沉默中 · 00:59');
assert.strictEqual(buildMutedPathLegStatusText({ expiresAt: 1000 + 2 * 60 * 1000 }, 1000), '屏蔽中 · 02:00');
assert.strictEqual(buildMutedPathStatusText(null, 1000), '');
assert.strictEqual(buildMutedPathLegStatusText(null, 1000), '');
assert.strictEqual(
  buildMutedPathLogTitleSnapshot({ logTitleSnapshot: '自定义标题' }),
  '自定义标题'
);
assert.strictEqual(
  buildMutedPathLogTitleSnapshot({ quote: { id: 101 }, displayName: 'Ethereum', alert: { name: '报价提醒名' } }),
  'Ethereum'
);
assert.strictEqual(
  buildMutedPathLogTitleSnapshot({ quote: { id: 101 }, alert: { name: '报价提醒名' } }),
  '报价提醒名'
);
assert.strictEqual(
  buildMutedPathLogTitleSnapshot({ alert: { name: 'tBTC - BTC' } }),
  '🚨 [路径报警] tBTC - BTC'
);
assert.strictEqual(buildMutedPathLogTitleSnapshot({}), '🚨 [路径报警]');
assert.strictEqual(buildMutedPathLogTitleSnapshot(null), '');
const extendedMutedPathEntry = extendMutedPathTargetEntry(mutedPathEntry, 2000, PATH_ALERT_MUTE_EXTEND_DURATION_MS);
assert.ok(extendedMutedPathEntry);
assert.strictEqual(extendedMutedPathEntry.mutedAt, 1000);
assert.strictEqual(extendedMutedPathEntry.expiresAt, 1000 + PATH_ALERT_MUTE_DURATION_MS + PATH_ALERT_MUTE_EXTEND_DURATION_MS);
assert.strictEqual(extendedMutedPathEntry.logTitleSnapshot, '🚨 [路径报警] tBTC - BTC');
assert.deepStrictEqual(
  extendedMutedPathEntry.summaryLinesSnapshot,
  ['(ETH) tBTC -> BTC.b', '(Base) cbBTC -> tBTC']
);

const mutedQuoteEntry = createMutedPathTargetEntry(
  {
    target: {
      type: 'quote',
      quoteId: 101,
      direction: 'forward',
      ruleKind: 'targetAbove',
      value: 1.00025
    }
  },
  ['ETH tBTC/cbBTC']
);
assert.ok(mutedQuoteEntry);
assert.strictEqual(mutedQuoteEntry.target.type, 'quote');
assert.ok(findMutedPathAlert([mutedQuoteEntry], {
  target: {
    type: 'quote',
    quoteId: 101,
    direction: 'forward',
    ruleKind: 'targetAbove',
    value: 1.00025
  }
}, 2000));
const otherMutedQuoteEntry = createMutedPathTargetEntry(
  {
    target: {
      type: 'quote',
      quoteId: 102,
      direction: 'forward',
      ruleKind: 'targetBelow',
      value: 0.999
    }
  },
  ['ETH BTCB/syBTC']
);
const replacedMutedQuoteEntry = createMutedPathTargetEntry(
  mutedQuoteEntry.target,
  ['Updated BTCB/syBTC'],
  3000,
  PATH_ALERT_MUTE_DURATION_MS
);
assert.strictEqual(
  findMutedPathTargetByKey([mutedQuoteEntry, otherMutedQuoteEntry], buildMutedPathTargetKey(mutedQuoteEntry)).summaryLinesSnapshot[0],
  'ETH tBTC/cbBTC'
);
assert.deepStrictEqual(
  upsertMutedPathTargetEntry([mutedQuoteEntry, otherMutedQuoteEntry], replacedMutedQuoteEntry)
    .map((entry) => entry.summaryLinesSnapshot[0]),
  ['ETH BTCB/syBTC', 'Updated BTCB/syBTC']
);
assert.deepStrictEqual(
  removeMutedPathTargetByKey([mutedQuoteEntry, otherMutedQuoteEntry], buildMutedPathTargetKey(mutedQuoteEntry))
    .map((entry) => entry.summaryLinesSnapshot[0]),
  ['ETH BTCB/syBTC']
);

const quoteStateById = new Map([
  [11, {
    fromSymbol: 'WBTC',
    toSymbol: 'BTC',
    lastRawPrice: 1.0012,
    inverseRawPrice: 0.9988,
    cexOrderbook: {
      bestBidPrice: 0.9997,
      bestAskPrice: 1.0003,
      bestBidSize: 1.2,
      bestAskSize: 0.8
    }
  }],
  [12, {
    fromSymbol: 'BTC',
    toSymbol: 'cbBTC',
    lastRawPrice: 0.9996,
    inverseRawPrice: 1.0004
  }],
  [101, {
    fromSymbol: 'BTCB',
    toSymbol: 'syBTC',
    lastRawPrice: 1.00115,
    inverseRawPrice: 0.998851320788,
    lastTotalAmountOut: 0.100115
  }]
]);

const forwardQuoteAlert = normalizePathAlert({
  id: 'quote-forward',
  enabled: true,
  triggerMode: 'delayed',
  confirmDelaySec: 5,
  cooldownSec: 180,
  target: {
    type: 'quote',
    quoteId: 101,
    direction: 'forward',
    ruleKind: 'targetAbove',
    value: 1.001
  }
}, DEFAULT_PATH_ALERT_SETTINGS);
const forwardQuoteEval = evaluatePathAlert(forwardQuoteAlert, { quoteStateById });
assert.strictEqual(forwardQuoteEval.available, true);
assert.strictEqual(forwardQuoteEval.currentValue, 1.00115);
assert.strictEqual(forwardQuoteEval.meetsTriggerCondition, true);

const inverseQuoteAlert = normalizePathAlert({
  id: 'quote-inverse',
  enabled: true,
  triggerMode: 'delayed',
  confirmDelaySec: 5,
  cooldownSec: 180,
  target: {
    type: 'quote',
    quoteId: 101,
    direction: 'inverse',
    ruleKind: 'targetBelow',
    value: 0.999
  }
}, DEFAULT_PATH_ALERT_SETTINGS);
const inverseQuoteEval = evaluatePathAlert(inverseQuoteAlert, { quoteStateById });
assert.strictEqual(inverseQuoteEval.available, true);
assert.strictEqual(inverseQuoteEval.currentValue, 0.998851320788);
assert.strictEqual(inverseQuoteEval.meetsTriggerCondition, true);
assert.strictEqual(
  buildPathAlertTargetDuplicateKey(inverseQuoteAlert.target),
  'quote:101:inverse:targetBelow'
);

const pathAlert = {
  id: 'path-wbtc',
  name: '路径报警',
  enabled: true,
  thresholdBp: 2,
  triggerMode: 'delayed',
  confirmDelaySec: 13,
  cooldownSec: 180,
  target: {
    type: 'path',
    legs: [
      {
        quoteId: 11,
        direction: 'forward',
        pricingMode: 'raw',
        chain: 'arbitrum',
        fromSymbol: 'cbBTC',
        toSymbol: 'WBTC'
      },
      {
        quoteId: 11,
        direction: 'forward',
        pricingMode: 'cex-bid1',
        chain: 'Bybit',
        fromSymbol: 'WBTC',
        toSymbol: 'BTC'
      },
      {
        quoteId: 12,
        direction: 'inverse',
        pricingMode: 'raw',
        chain: 'ethereum',
        fromSymbol: 'BTC',
        toSymbol: 'cbBTC'
      }
    ]
  }
};

const pathEval = evaluatePathAlert(pathAlert, { quoteStateById });
assert.strictEqual(pathEval.available, true);
assert.strictEqual(pathEval.targetType, 'path');
assert.ok(Math.abs(pathEval.profitRate - ((1.0012 * 0.9997 * 1.0004) - 1)) < 1e-12);
assert.ok(Math.abs(pathEval.profitBp - (((1.0012 * 0.9997 * 1.0004) - 1) * 10000)) < 1e-8);

const allLegSnapshots = buildAllLegSnapshots([
  { id: 11, chain: 'Bybit', showInverse: true },
  { id: 12, chain: 'ethereum', showInverse: true }
], quoteStateById);
assert.ok(allLegSnapshots.some((leg) => leg.quoteId === 11 && leg.pricingMode === 'raw' && leg.direction === 'forward'));
assert.ok(allLegSnapshots.some((leg) => leg.quoteId === 11 && leg.pricingMode === 'cex-bid1'));
assert.ok(allLegSnapshots.some((leg) => leg.quoteId === 11 && leg.pricingMode === 'cex-ask1-inverse'));
assert.ok(allLegSnapshots.some((leg) => leg.quoteId === 12 && leg.direction === 'inverse'));

const previousAllLegSnapshots = [
  { quoteId: 21, direction: 'forward', pricingMode: 'raw', chain: 'base', fromSymbol: 'GHO', toSymbol: 'USDC', rate: 1.0001 },
  { quoteId: 22, direction: 'forward', pricingMode: 'raw', chain: 'ethereum', fromSymbol: 'USDC', toSymbol: 'GHO', rate: 1.0000 },
  { quoteId: 23, direction: 'forward', pricingMode: 'raw', chain: 'arbitrum', fromSymbol: 'GHO', toSymbol: 'USDC', rate: 1.0002 }
];
const currentAllLegSnapshots = [
  { quoteId: 21, direction: 'forward', pricingMode: 'raw', chain: 'base', fromSymbol: 'GHO', toSymbol: 'USDC', rate: 1.0001 },
  { quoteId: 22, direction: 'forward', pricingMode: 'raw', chain: 'ethereum', fromSymbol: 'USDC', toSymbol: 'GHO', rate: 1.0000 },
  { quoteId: 23, direction: 'forward', pricingMode: 'raw', chain: 'arbitrum', fromSymbol: 'GHO', toSymbol: 'USDC', rate: 1.0015 }
];
const switchedRuleEvaluation = {
  available: true,
  profitRate: 0.00015,
  profitBp: 1.5,
  cycle: {
    legs: [
      { quoteId: 23, direction: 'forward', pricingMode: 'raw', chain: 'arbitrum', fromSymbol: 'GHO', toSymbol: 'USDC', rate: 1.0015 },
      { quoteId: 22, direction: 'forward', pricingMode: 'raw', chain: 'ethereum', fromSymbol: 'USDC', toSymbol: 'GHO', rate: 1.0000 }
    ]
  },
  legSnapshots: [
    { quoteId: 23, direction: 'forward', pricingMode: 'raw', chain: 'arbitrum', fromSymbol: 'GHO', toSymbol: 'USDC', rate: 1.0015 },
    { quoteId: 22, direction: 'forward', pricingMode: 'raw', chain: 'ethereum', fromSymbol: 'USDC', toSymbol: 'GHO', rate: 1.0000 }
  ]
};
const immediateSnapshotState = resolvePathAlertSnapshotState(
  { enabled: true, triggerMode: 'immediate' },
  { status: 'monitoring', currentLegSnapshots: previousAllLegSnapshots },
  { status: 'cooldown' },
  switchedRuleEvaluation,
  currentAllLegSnapshots
);
const immediateChangedLegs = buildChangedLegs(
  immediateSnapshotState.currentSnapshots,
  immediateSnapshotState.baselineSnapshots,
  1
);
assert.strictEqual(immediateChangedLegs.length, 1);
assert.strictEqual(immediateChangedLegs[0].quoteId, 23);

const delayedSnapshotState = resolvePathAlertSnapshotState(
  { enabled: true, triggerMode: 'delayed' },
  { status: 'idle', currentLegSnapshots: previousAllLegSnapshots },
  { status: 'pending_confirm' },
  switchedRuleEvaluation,
  currentAllLegSnapshots
);
assert.deepStrictEqual(delayedSnapshotState.baselineSnapshots, previousAllLegSnapshots);

assert.deepStrictEqual(
  buildPathAlertSummaryLines(pathAlert, {
    formatLeg(leg) {
      return `(${leg.chain}) ${leg.fromSymbol} -> ${leg.toSymbol}`;
    },
    findRule() {
      return null;
    }
  }),
  [
    '(arbitrum) cbBTC -> WBTC',
    '(Bybit) WBTC -> BTC',
    '(ethereum) BTC -> cbBTC'
  ]
);

assert.deepStrictEqual(
  buildPathAlertSummaryLines({
    target: {
      type: 'rule',
      ruleKind: 'fixed',
      ruleId: 'fixed:gho-usdc'
    }
  }, {
    formatLeg() {
      return '';
    },
    findRule(ruleKind, ruleId) {
      assert.strictEqual(ruleKind, 'fixed');
      assert.strictEqual(ruleId, 'fixed:gho-usdc');
      return { title: 'GHO <-> USDC' };
    }
  }),
  ['GHO <-> USDC']
);

const duplicateAlerts = [
  normalizePathAlert({
    id: 'path-1',
    name: '路径一',
    enabled: true,
    thresholdBp: 1.1,
    triggerMode: 'immediate',
    confirmDelaySec: 0,
    cooldownSec: 300,
    target: {
      type: 'path',
      legs: [
        {
          quoteId: 101,
          direction: 'forward',
          pricingMode: 'raw',
          chain: 'ethereum',
          fromSymbol: 'GHO',
          toSymbol: 'USDC'
        },
        {
          quoteId: 202,
          direction: 'inverse',
          pricingMode: 'raw',
          chain: 'arbitrum',
          fromSymbol: 'USDC',
          toSymbol: 'GHO'
        }
      ]
    }
  }, DEFAULT_PATH_ALERT_SETTINGS),
  normalizePathAlert({
    id: 'rule-1',
    name: '规则一',
    enabled: true,
    thresholdBp: 2,
    triggerMode: 'immediate',
    confirmDelaySec: 0,
    cooldownSec: 300,
    target: {
      type: 'rule',
      ruleKind: 'fixed',
      ruleId: 'fixed:gho-usdc'
    }
  }, DEFAULT_PATH_ALERT_SETTINGS)
];

assert.strictEqual(
  buildPathAlertTargetDuplicateKey(duplicateAlerts[0].target),
  'path:101|forward|raw>202|inverse|raw'
);
assert.strictEqual(
  buildMutedPathTargetKey(duplicateAlerts[0]),
  'path:101|forward|raw>202|inverse|raw'
);
assert.strictEqual(
  buildMutedPathTargetKey(duplicateAlerts[0].target),
  'path:101|forward|raw>202|inverse|raw'
);
assert.strictEqual(
  buildPathAlertTargetDuplicateKey(duplicateAlerts[1].target),
  'rule:fixed:fixed:gho-usdc'
);
assert.strictEqual(
  buildMutedPathTargetKey(null),
  ''
);
assert.strictEqual(
  buildPathAlertTargetDuplicateKey({
    type: 'path',
    legs: []
  }),
  ''
);

assert.strictEqual(
  buildPathAlertTargetDuplicateKey({
    type: 'path',
    legs: [
      {
        quoteId: 301,
        direction: 'forward',
        pricingMode: 'raw',
        chain: 'ethereum',
        fromSymbol: 'A',
        toSymbol: 'B'
      },
      {
        quoteId: 302,
        direction: 'forward',
        pricingMode: 'raw',
        chain: 'arbitrum',
        fromSymbol: 'B',
        toSymbol: 'A'
      }
    ]
  }),
  buildPathAlertTargetDuplicateKey({
    type: 'path',
    legs: [
      {
        quoteId: 302,
        direction: 'forward',
        pricingMode: 'raw',
        chain: 'arbitrum',
        fromSymbol: 'B',
        toSymbol: 'A'
      },
      {
        quoteId: 301,
        direction: 'forward',
        pricingMode: 'raw',
        chain: 'ethereum',
        fromSymbol: 'A',
        toSymbol: 'B'
      }
    ]
  })
);

assert.notStrictEqual(
  buildPathAlertTargetDuplicateKey({
    type: 'path',
    legs: [
      {
        quoteId: 301,
        direction: 'forward',
        pricingMode: 'raw',
        chain: 'ethereum',
        fromSymbol: 'A',
        toSymbol: 'B'
      },
      {
        quoteId: 302,
        direction: 'forward',
        pricingMode: 'raw',
        chain: 'arbitrum',
        fromSymbol: 'B',
        toSymbol: 'A'
      }
    ]
  }),
  buildPathAlertTargetDuplicateKey({
    type: 'path',
    legs: [
      {
        quoteId: 302,
        direction: 'inverse',
        pricingMode: 'raw',
        chain: 'arbitrum',
        fromSymbol: 'A',
        toSymbol: 'B'
      },
      {
        quoteId: 301,
        direction: 'inverse',
        pricingMode: 'raw',
        chain: 'ethereum',
        fromSymbol: 'B',
        toSymbol: 'A'
      }
    ]
  })
);

assert.strictEqual(
  findDuplicatePathAlert(duplicateAlerts, {
    id: 'path-new',
    target: {
      type: 'path',
      legs: [
        {
          quoteId: 101,
          direction: 'forward',
          pricingMode: 'raw'
        },
        {
          quoteId: 202,
          direction: 'inverse',
          pricingMode: 'raw'
        }
      ]
    }
  }).id,
  'path-1'
);

assert.strictEqual(
  findDuplicatePathAlert(duplicateAlerts, {
    id: 'path-new',
    target: {
      type: 'path',
      legs: [
        {
          quoteId: 202,
          direction: 'inverse',
          pricingMode: 'raw'
        },
        {
          quoteId: 101,
          direction: 'forward',
          pricingMode: 'raw'
        }
      ]
    }
  }),
  null
);

const dismissedTargets = [
  normalizeDismissedTarget({
    target: {
      type: 'path',
      legs: [
        {
          quoteId: 301,
          direction: 'forward',
          pricingMode: 'raw',
          chain: 'ethereum',
          fromSymbol: 'A',
          toSymbol: 'B'
        },
        {
          quoteId: 302,
          direction: 'forward',
          pricingMode: 'raw',
          chain: 'arbitrum',
          fromSymbol: 'B',
          toSymbol: 'A'
        }
      ]
    },
    summaryLinesSnapshot: ['(ETH) A -> B', '(ARB) B -> A'],
    dismissedAt: 456
  })
];

assert.strictEqual(
  findDismissedPathAlert(dismissedTargets, {
    target: {
      type: 'path',
      legs: [
        {
          quoteId: 302,
          direction: 'forward',
          pricingMode: 'raw',
          chain: 'arbitrum',
          fromSymbol: 'B',
          toSymbol: 'A'
        },
        {
          quoteId: 301,
          direction: 'forward',
          pricingMode: 'raw',
          chain: 'ethereum',
          fromSymbol: 'A',
          toSymbol: 'B'
        }
      ]
    }
  }).dismissedAt,
  456
);

assert.strictEqual(
  findDismissedPathAlert(dismissedTargets, {
    target: {
      type: 'path',
      legs: [
        {
          quoteId: 302,
          direction: 'inverse',
          pricingMode: 'raw',
          chain: 'arbitrum',
          fromSymbol: 'A',
          toSymbol: 'B'
        },
        {
          quoteId: 301,
          direction: 'inverse',
          pricingMode: 'raw',
          chain: 'ethereum',
          fromSymbol: 'B',
          toSymbol: 'A'
        }
      ]
    }
  }),
  null
);

const createdDismissed = createDismissedTargetEntry({
  target: {
    type: 'rule',
    ruleKind: 'special',
    ruleId: 'special:wbtc-bybit'
  }
}, ['WBTC <-> BYBIT'], 789);
assert.strictEqual(createdDismissed.dismissedAt, 789);
assert.deepStrictEqual(createdDismissed.summaryLinesSnapshot, ['WBTC <-> BYBIT']);
assert.strictEqual(createdDismissed.target.ruleKind, 'special');

assert.strictEqual(countPathAlertRealLegs(pathAlert, pathEval), 3);
assert.strictEqual(countPathAlertRealLegs({
  target: { type: 'rule', ruleKind: 'fixed', ruleId: 'fixed:gho-usdc' }
}, {
  cycle: {
    legs: [
      { quoteId: 1 },
      { quoteId: 2 },
      { chain: '规则' }
    ]
  }
}), 2);

assert.deepStrictEqual(
  sortTriggeredPathAlerts([
    {
      alert: { target: { type: 'path', legs: [{ quoteId: 1 }, { quoteId: 2 }, { quoteId: 3 }] } },
      evaluation: { profitBp: 10 }
    },
    {
      alert: { target: { type: 'path', legs: [{ quoteId: 1 }, { quoteId: 2 }] } },
      evaluation: { profitBp: 1 }
    },
    {
      alert: { target: { type: 'path', legs: [{ quoteId: 1 }, { quoteId: 2 }] } },
      evaluation: { profitBp: 9 }
    }
  ]).map((item) => item.evaluation.profitBp),
  [9, 1, 10]
);

assert.deepStrictEqual(
  buildChangedLegs([
    {
      quoteId: 11,
      direction: 'forward',
      pricingMode: 'raw',
      chain: 'arbitrum',
      fromSymbol: 'cbBTC',
      toSymbol: 'WBTC',
      rate: 1.0013
    },
    {
      quoteId: 11,
      direction: 'forward',
      pricingMode: 'cex-bid1',
      chain: 'Bybit',
      fromSymbol: 'WBTC',
      toSymbol: 'BTC',
      rate: 0.9997
    },
    {
      quoteId: 12,
      direction: 'inverse',
      pricingMode: 'raw',
      chain: 'ethereum',
      fromSymbol: 'BTC',
      toSymbol: 'cbBTC',
      rate: 1.0001
    }
  ], [
    {
      quoteId: 11,
      direction: 'forward',
      pricingMode: 'raw',
      rate: 1.0010
    },
    {
      quoteId: 11,
      direction: 'forward',
      pricingMode: 'cex-bid1',
      rate: 0.99968
    },
    {
      quoteId: 12,
      direction: 'inverse',
      pricingMode: 'raw',
      rate: 1.0004
    }
  ], 1).map((item) => ({
    chain: item.chain,
    fromSymbol: item.fromSymbol,
    toSymbol: item.toSymbol,
    deltaBp: Number(item.deltaBp.toFixed(2))
  })).sort((left, right) => left.chain.localeCompare(right.chain)),
  [
    { chain: 'arbitrum', fromSymbol: 'cbBTC', toSymbol: 'WBTC', deltaBp: 3 },
    { chain: 'ethereum', fromSymbol: 'BTC', toSymbol: 'cbBTC', deltaBp: -3 }
  ]
);
assert.deepStrictEqual(
  buildTriggeredPathAlertChangedLegs({
    currentSnapshots: [{ key: 'a', quoteId: 1, label: 'A', rate: 1.0002 }],
    baselineSnapshots: [{ key: 'a', quoteId: 1, label: 'A', rate: 1 }]
  }, { changedLegMinBp: '1' }).map((item) => Number(item.deltaBp.toFixed(2))),
  [2]
);
assert.deepStrictEqual(
  buildTriggeredPathAlertChangedLegs({
    currentLegSnapshots: [{ key: 'a', quoteId: 1, label: 'A', rate: 1.000005 }],
    baselineLegSnapshots: [{ key: 'a', quoteId: 1, label: 'A', rate: 1 }]
  }, { changedLegMinBp: 'bad' }),
  []
);

assert.strictEqual(
  findDuplicatePathAlert(duplicateAlerts, {
    id: 'rule-new',
    target: {
      type: 'rule',
      ruleKind: 'fixed',
      ruleId: 'fixed:gho-usdc'
    }
  }).id,
  'rule-1'
);

assert.strictEqual(
  findDuplicatePathAlert(duplicateAlerts, {
    id: 'path-1',
    target: duplicateAlerts[0].target
  }, {
    excludeId: 'path-1'
  }),
  null
);

const askInverseAlert = {
  ...pathAlert,
  target: {
    type: 'path',
    legs: [
      {
        quoteId: 11,
        direction: 'forward',
        pricingMode: 'cex-ask1-inverse',
        chain: 'Binance',
        fromSymbol: 'BTC',
        toSymbol: 'WBTC'
      }
    ]
  }
};
const askInverseEval = evaluatePathAlert(askInverseAlert, { quoteStateById });
assert.ok(Math.abs(askInverseEval.profitRate - ((1 / 1.0003) - 1)) < 1e-12);

const unavailableEval = evaluatePathAlert({
  ...pathAlert,
  target: {
    type: 'path',
    legs: [{ quoteId: 999, direction: 'forward', pricingMode: 'raw' }]
  }
}, { quoteStateById });
assert.strictEqual(unavailableEval.available, false);
assert.strictEqual(unavailableEval.status, 'unavailable');

const ruleEval = evaluatePathAlert({
  id: 'fixed-gho',
  name: '固定规则',
  enabled: true,
  thresholdBp: 1,
  triggerMode: 'immediate',
  confirmDelaySec: 0,
  cooldownSec: 300,
  target: {
    type: 'rule',
    ruleKind: 'fixed',
    ruleId: 'fixed:gho-usdc'
  }
}, {
  resolveRuleEvaluation(target) {
    assert.strictEqual(target.ruleKind, 'fixed');
    assert.strictEqual(target.ruleId, 'fixed:gho-usdc');
    return {
      available: true,
      profitRate: 0.00034
    };
  }
});
assert.strictEqual(ruleEval.available, true);
assert.strictEqual(ruleEval.targetType, 'rule');
assert.ok(Math.abs(ruleEval.profitBp - 3.4) < 1e-12);

const quoteAboveEval = evaluatePathAlert({
  id: 'quote-above',
  name: '报价高于',
  enabled: true,
  triggerMode: 'immediate',
  confirmDelaySec: 0,
  cooldownSec: 300,
  target: {
    type: 'quote',
    quoteId: 101,
    ruleKind: 'targetAbove',
    value: 0.100113
  }
}, { quoteStateById });
assert.strictEqual(quoteAboveEval.available, true);
assert.strictEqual(quoteAboveEval.targetType, 'quote');
assert.strictEqual(quoteAboveEval.meetsTriggerCondition, true);
assert.strictEqual(quoteAboveEval.currentValue, 1.00115);

const quoteBelowEval = evaluatePathAlert({
  id: 'quote-below',
  name: '报价低于',
  enabled: true,
  triggerMode: 'immediate',
  confirmDelaySec: 0,
  cooldownSec: 300,
  target: {
    type: 'quote',
    quoteId: 101,
    ruleKind: 'targetBelow',
    value: 0.1002
  }
}, { quoteStateById });
assert.strictEqual(quoteBelowEval.available, true);
assert.strictEqual(quoteBelowEval.meetsTriggerCondition, false);
assert.strictEqual(quoteBelowEval.currentValue, 1.00115);

const quotePercentUpEval = evaluatePathAlert({
  id: 'quote-percent-up',
  name: '上涨提醒',
  enabled: true,
  triggerMode: 'immediate',
  confirmDelaySec: 0,
  cooldownSec: 300,
  target: {
    type: 'quote',
    quoteId: 101,
    ruleKind: 'percentUp',
    value: 0.1,
    basePrice: 1
  }
}, { quoteStateById });
assert.strictEqual(quotePercentUpEval.available, true);
assert.strictEqual(quotePercentUpEval.meetsTriggerCondition, true);
assert.ok(Math.abs(quotePercentUpEval.changePercent - 0.115) < 1e-12);
assert.strictEqual(quotePercentUpEval.currentValue, 1.00115);

const quotePercentMissingBaseEval = evaluatePathAlert({
  id: 'quote-percent-missing-base',
  name: '上涨提醒',
  enabled: true,
  triggerMode: 'immediate',
  confirmDelaySec: 0,
  cooldownSec: 300,
  target: {
    type: 'quote',
    quoteId: 101,
    ruleKind: 'percentUp',
    value: 0.1
  }
}, { quoteStateById });
assert.strictEqual(quotePercentMissingBaseEval.available, false);
assert.strictEqual(quotePercentMissingBaseEval.status, 'unavailable');

const immediateAlert = {
  id: 'immediate',
  name: '立即报警',
  enabled: true,
  thresholdBp: 2,
  triggerMode: 'immediate',
  confirmDelaySec: 0,
  cooldownSec: 300,
  target: { type: 'path', legs: [] }
};

let runtime = advancePathAlertRuntime(immediateAlert, null, {
  available: true,
  profitBp: 3,
  profitRate: 0.0003
}, 1_000);
assert.strictEqual(runtime.status, 'cooldown');
assert.strictEqual(runtime.shouldTrigger, true);
assert.strictEqual(runtime.cooldownUntil, 301_000);

runtime = advancePathAlertRuntime(immediateAlert, runtime, {
  available: true,
  profitBp: 3,
  profitRate: 0.0003
}, 2_000);
assert.strictEqual(runtime.shouldTrigger, false);
assert.strictEqual(runtime.status, 'cooldown');

runtime = advancePathAlertRuntime(immediateAlert, runtime, {
  available: true,
  profitBp: 3,
  profitRate: 0.0003
}, 302_000);
assert.strictEqual(runtime.shouldTrigger, true);
assert.strictEqual(runtime.status, 'cooldown');

const delayedAlert = {
  id: 'delayed',
  name: '延迟报警',
  enabled: true,
  thresholdBp: 2,
  triggerMode: 'delayed',
  confirmDelaySec: 5,
  cooldownSec: 300,
  target: { type: 'path', legs: [] }
};

const forcedImmediateAlert = buildEffectiveRuntimeAlert(delayedAlert, { forceImmediate: true });
assert.notStrictEqual(forcedImmediateAlert, delayedAlert);
assert.strictEqual(forcedImmediateAlert.triggerMode, 'immediate');
assert.strictEqual(forcedImmediateAlert.confirmDelaySec, 0);
assert.strictEqual(forcedImmediateAlert.cooldownSec, delayedAlert.cooldownSec);
assert.strictEqual(buildEffectiveRuntimeAlert(delayedAlert, { forceImmediate: false }), delayedAlert);

let delayedRuntime = advancePathAlertRuntime(delayedAlert, null, {
  available: true,
  profitBp: 2.5,
  profitRate: 0.00025
}, 10_000);
assert.strictEqual(delayedRuntime.shouldTrigger, false);
assert.strictEqual(delayedRuntime.status, 'pending_confirm');
assert.strictEqual(delayedRuntime.eligibleSince, 10_000);

delayedRuntime = advancePathAlertRuntime(delayedAlert, delayedRuntime, {
  available: true,
  profitBp: 2.5,
  profitRate: 0.00025
}, 14_000);
assert.strictEqual(delayedRuntime.shouldTrigger, false);
assert.strictEqual(delayedRuntime.status, 'pending_confirm');

delayedRuntime = advancePathAlertRuntime(delayedAlert, delayedRuntime, {
  available: true,
  profitBp: 2.5,
  profitRate: 0.00025
}, 15_000);
assert.strictEqual(delayedRuntime.shouldTrigger, true);
assert.strictEqual(delayedRuntime.status, 'cooldown');

delayedRuntime = advancePathAlertRuntime(delayedAlert, delayedRuntime, {
  available: true,
  profitBp: 1,
  profitRate: 0.0001
}, 16_000);
assert.strictEqual(delayedRuntime.shouldTrigger, false);
assert.strictEqual(delayedRuntime.status, 'idle');
assert.strictEqual(delayedRuntime.eligibleSince, null);

const quoteRuntimeAlert = {
  id: 'quote-runtime',
  name: '报价高于',
  enabled: true,
  triggerMode: 'immediate',
  confirmDelaySec: 0,
  cooldownSec: 300,
  target: {
    type: 'quote',
    quoteId: 101,
    ruleKind: 'targetAbove',
    value: 0.100113
  }
};
let quoteRuntime = advancePathAlertRuntime(quoteRuntimeAlert, null, {
  available: true,
  targetType: 'quote',
  meetsTriggerCondition: true,
  currentValue: 0.100115
}, 20_000);
assert.strictEqual(quoteRuntime.shouldTrigger, true);
assert.strictEqual(quoteRuntime.status, 'cooldown');
assert.strictEqual(quoteRuntime.cooldownUntil, 320_000);
const advancedQuoteRuntime = advanceQuoteAlertRuntime(quoteRuntimeAlert, null, {
  available: true,
  targetType: 'quote',
  meetsTriggerCondition: true,
  currentValue: 0.100115
}, {
  forceImmediate: true,
  nowMs: 21_000
});
assert.strictEqual(advancedQuoteRuntime.shouldTrigger, true);
assert.strictEqual(advancedQuoteRuntime.status, 'cooldown');
assert.strictEqual(advancedQuoteRuntime.cooldownUntil, 321_000);
assert.strictEqual(advancedQuoteRuntime.isSoundActive, false);
assert.deepStrictEqual(advancedQuoteRuntime.evaluation, {
  available: true,
  targetType: 'quote',
  meetsTriggerCondition: true,
  currentValue: 0.100115
});
assert.strictEqual(shouldActivatePathAlertSound({ shouldTrigger: true }, { settings: { localSoundEnabled: true } }), true);
assert.strictEqual(shouldActivatePathAlertSound({ shouldTrigger: true }, { muted: true, settings: { localSoundEnabled: true } }), false);
assert.strictEqual(shouldActivatePathAlertSound({ shouldTrigger: true }, { settings: { localSoundEnabled: false } }), false);
assert.strictEqual(shouldActivatePathAlertSound({ shouldTrigger: false }, { settings: { localSoundEnabled: true } }), false);

assert.strictEqual(isPathAlertConfirmDelayDisabled('immediate'), true);
assert.strictEqual(isPathAlertConfirmDelayDisabled('delayed'), false);
assert.strictEqual(
  buildPathAlertWebhookUrl(
    'https://api.day.app/key/[title]/[body]?sound=ladder',
    '收益 +2.50 bp',
    'ETH WBTC -> tBTC | SUI TBTC -> WBTC'
  ),
  'https://api.day.app/key/%E6%94%B6%E7%9B%8A%20%2B2.50%20bp/ETH%20WBTC%20-%3E%20tBTC%20%7C%20SUI%20TBTC%20-%3E%20WBTC?sound=ladder'
);

const specialRuleEvaluation = evaluatePathAlert(
  {
    id: 'special-usde',
    enabled: true,
    thresholdBp: 0,
    triggerMode: 'delayed',
    confirmDelaySec: 15,
    cooldownSec: 120,
    target: {
      type: 'rule',
      ruleKind: 'special',
      ruleId: 'special:usde-bybit'
    }
  },
  {
    resolveRuleEvaluation() {
      return {
        available: true,
        profitRate: 0.0003,
        meetsTriggerCondition: true,
        cycle: {
          legs: [
            { quoteId: 1, rate: 1.0003 }
          ]
        },
        displayMessage: 'display line',
        alertMessage: 'alert line'
      };
    }
  }
);
assert.strictEqual(specialRuleEvaluation.available, true);
assert.strictEqual(specialRuleEvaluation.profitBp, 3);
assert.strictEqual(specialRuleEvaluation.meetsTriggerCondition, true);
assert.strictEqual(specialRuleEvaluation.displayMessage, 'display line');
assert.strictEqual(specialRuleEvaluation.alertMessage, 'alert line');
