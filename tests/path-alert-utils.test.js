const assert = require('assert');

const {
  DEFAULT_PATH_ALERT_SETTINGS,
  DEFAULT_PATH_ALERT_THRESHOLD_BP,
  normalizeAlertConfig,
  normalizePathAlert,
  normalizeDismissedTarget,
  evaluatePathAlert,
  advancePathAlertRuntime,
  isPathAlertConfirmDelayDisabled,
  buildPathAlertWebhookUrl,
  buildPathAlertSummaryLines,
  buildPathAlertTargetDuplicateKey,
  countPathAlertRealLegs,
  createDismissedTargetEntry,
  findDuplicatePathAlert,
  findDismissedPathAlert,
  buildAllLegSnapshots,
  resolvePathAlertSnapshotState,
  buildChangedLegs,
  sortTriggeredPathAlerts
} = require('../path-alert-utils');

const emptyConfig = normalizeAlertConfig();
assert.strictEqual(emptyConfig.version, 1);
assert.deepStrictEqual(emptyConfig.settings, DEFAULT_PATH_ALERT_SETTINGS);
assert.deepStrictEqual(emptyConfig.alerts, []);
assert.strictEqual(DEFAULT_PATH_ALERT_SETTINGS.localSoundEnabled, true);
assert.strictEqual(DEFAULT_PATH_ALERT_SETTINGS.webhookEnabled, false);
assert.strictEqual(DEFAULT_PATH_ALERT_THRESHOLD_BP, 1.1);
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
    }
  ]
});

assert.strictEqual(normalizedConfig.settings.pathAlertEvalIntervalMs, 2000);
assert.strictEqual(normalizedConfig.settings.defaultCooldownSec, 120);
assert.strictEqual(normalizedConfig.settings.localSoundEnabled, false);
assert.strictEqual(normalizedConfig.settings.webhookEnabled, true);
assert.strictEqual(normalizedConfig.alerts[0].thresholdBp, 3.5);
assert.strictEqual(normalizedConfig.alerts[0].confirmDelaySec, 8);
assert.strictEqual(normalizedConfig.alerts[0].cooldownSec, 90);
assert.strictEqual(normalizedConfig.alerts[0].target.legs[0].quoteId, 11);

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
  }]
]);

const pathAlert = {
  id: 'path-wbtc',
  name: '路径报警',
  enabled: true,
  thresholdBp: 2,
  triggerMode: 'immediate',
  confirmDelaySec: 0,
  cooldownSec: 300,
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
  null,
  { status: 'pending_confirm' },
  switchedRuleEvaluation,
  currentAllLegSnapshots
);
assert.strictEqual(delayedSnapshotState.baselineSnapshots.length, currentAllLegSnapshots.length);

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
  buildPathAlertTargetDuplicateKey(duplicateAlerts[1].target),
  'rule:fixed:fixed:gho-usdc'
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
    ruleId: 'special:dex-cex-wbtc'
  }
}, ['DEX <-> CEX'], 789);
assert.strictEqual(createdDismissed.dismissedAt, 789);
assert.deepStrictEqual(createdDismissed.summaryLinesSnapshot, ['DEX <-> CEX']);
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
