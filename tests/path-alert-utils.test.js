const assert = require('assert');

const {
  DEFAULT_PATH_ALERT_SETTINGS,
  DEFAULT_PATH_ALERT_THRESHOLD_BP,
  normalizeAlertConfig,
  evaluatePathAlert,
  advancePathAlertRuntime,
  isPathAlertConfirmDelayDisabled,
  buildPathAlertWebhookUrl,
  buildPathAlertSummaryLines
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

const quoteStateById = new Map([
  [11, {
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
