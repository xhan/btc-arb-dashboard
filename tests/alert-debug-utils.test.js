const assert = require('assert');

const {
  buildRuntimeDebugSnapshot,
  createAlertDebugController
} = require('../alert-debug-utils');

assert.deepStrictEqual(
  buildRuntimeDebugSnapshot(
    { eligibleSince: 1000 },
    {
      status: 'cooldown',
      eligibleSince: 1000,
      lastTriggeredAt: 1200,
      cooldownUntil: 2200
    },
    {
      debugComparison: {
        netProfit: 1,
        minNetProfit: 2
      }
    },
    { nowMs: 1500 }
  ),
  {
    now: 1500,
    status: 'cooldown',
    reason: 'cooldown_block',
    eligibleSince: 1000,
    lastTriggeredAt: 1200,
    cooldownUntil: 2200,
    comparison: {
      netProfit: 1,
      minNetProfit: 2
    }
  }
);
assert.strictEqual(
  buildRuntimeDebugSnapshot(null, { shouldTrigger: true }, null, { nowMs: 1500 }).reason,
  'trigger'
);
assert.strictEqual(
  buildRuntimeDebugSnapshot({}, { eligibleSince: 1000, status: 'pending_confirm' }, null, { nowMs: 1500 }).reason,
  'condition_on'
);
assert.strictEqual(
  buildRuntimeDebugSnapshot({ eligibleSince: 1000 }, { status: 'idle' }, null, { nowMs: 1500 }).reason,
  'condition_off'
);
assert.strictEqual(
  buildRuntimeDebugSnapshot(
    { eligibleSince: 1000 },
    { eligibleSince: 1000, status: 'pending_confirm' },
    null,
    { nowMs: 1500 }
  ).reason,
  'pending_confirm'
);
assert.strictEqual(buildRuntimeDebugSnapshot(null, null, null, { nowMs: 1500 }), null);

const logs = [];
const controller = createAlertDebugController({
  logger(message) {
    logs.push(message);
  },
  formatTime(value) {
    return `T${value}`;
  }
});

assert.strictEqual(controller.isEnabled(), false);
controller.record('special', 'special:wbtc-bybit', {
  status: 'pending_confirm',
  reason: 'condition_on',
  eligibleSince: 1000,
  comparison: {
    netProfit: 7.95,
    minNetProfit: 8,
    netProfitBp: 0.57,
    minNetProfitBp: 0.6,
    meetsTriggerCondition: false
  }
});
assert.strictEqual(logs.length, 0);

assert.strictEqual(controller.enable(true), true);
assert.strictEqual(controller.isEnabled(), true);
assert.strictEqual(logs.length, 1);
assert.strictEqual(logs[0], '[alert-debug] enabled');

controller.record('special', 'special:wbtc-bybit', {
  now: 1500,
  status: 'pending_confirm',
  reason: 'condition_on',
  eligibleSince: 1000,
  comparison: {
    netProfit: 7.95,
    minNetProfit: 8,
    netProfitBp: 0.57,
    minNetProfitBp: 0.6,
    meetsTriggerCondition: false
  }
});
assert.strictEqual(logs.length, 2);
assert.ok(logs[1].includes('[alert-debug][special] special:wbtc-bybit'));
assert.ok(logs[1].includes('pending'));
assert.ok(logs[1].includes('reason=condition_on'));
assert.ok(logs[1].includes('now=T1500 (1500)'));
assert.ok(logs[1].includes('eligible_since=T1000 (1000)'));
assert.ok(logs[1].includes('last_triggered_at=null'));
assert.ok(logs[1].includes('cooldown_until=null'));
assert.ok(logs[1].includes('net=7.95/8'));
assert.ok(logs[1].includes('bp=0.57/0.6'));
assert.ok(logs[1].includes('meets=false'));

controller.record('special', 'special:wbtc-bybit', {
  status: 'pending_confirm',
  reason: 'condition_on',
  eligibleSince: 1000,
  comparison: {
    netProfit: 7.95,
    minNetProfit: 8,
    netProfitBp: 0.57,
    minNetProfitBp: 0.6,
    meetsTriggerCondition: false
  }
});
assert.strictEqual(logs.length, 2);

controller.record('special', 'special:wbtc-bybit', {
  now: 11000,
  status: 'trigger',
  reason: 'trigger',
  eligibleSince: 1000,
  lastTriggeredAt: 11000
});
assert.strictEqual(logs.length, 3);
assert.ok(logs[2].includes('trigger'));
assert.ok(logs[2].includes('last_triggered_at=T11000 (11000)'));

controller.record('special', 'special:wbtc-bybit', {
  now: 12000,
  status: 'idle',
  reason: 'condition_off',
  eligibleSince: 0,
  lastTriggeredAt: 0,
  cooldownUntil: 0
});
assert.strictEqual(logs.length, 4);
assert.ok(logs[3].includes('idle'));
assert.ok(logs[3].includes('reason=condition_off'));
assert.ok(logs[3].includes('eligible_since=null'));
assert.ok(logs[3].includes('last_triggered_at=null'));
assert.ok(logs[3].includes('cooldown_until=null'));

assert.strictEqual(controller.enable(false), false);
assert.strictEqual(controller.isEnabled(), false);
assert.strictEqual(logs.length, 5);
assert.strictEqual(logs[4], '[alert-debug] disabled');

controller.record('quote', 'quote-runtime', {
  now: 120000,
  status: 'cooldown',
  reason: 'cooldown_block',
  cooldownUntil: 130000
});
assert.strictEqual(logs.length, 5);
