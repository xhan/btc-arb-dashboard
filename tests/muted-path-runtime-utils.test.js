const assert = require('assert');

const { createMutedPathRuntime } = require('../src/path-alerts/muted-path-runtime-utils');

let nowMs = 1000;
const scheduled = [];
const cleared = [];
const runtime = createMutedPathRuntime({
  now: () => nowMs,
  pruneTargets: (entries, now) => entries.filter((entry) => Number(entry.expiresAt) > now),
  pruneLegs: (entries, now) => entries.filter((entry) => Number(entry.expiresAt) > now),
  resolveRefreshDelay: ({ mutedPathTargets, mutedPathLegs, nowMs: currentNow }) => {
    const expiries = mutedPathTargets.concat(mutedPathLegs)
      .map((entry) => Number(entry.expiresAt))
      .filter((expiresAt) => Number.isFinite(expiresAt) && expiresAt > currentNow);
    if (!expiries.length) return null;
    return Math.min(...expiries) - currentNow;
  },
  setTimeout: (handler, delayMs) => {
    const timerId = `timer-${scheduled.length + 1}`;
    scheduled.push({ handler, delayMs, timerId });
    return timerId;
  },
  clearTimeout: (timerId) => cleared.push(timerId)
});

assert.deepStrictEqual(runtime.getTargets(), []);
assert.deepStrictEqual(runtime.getLegs(), []);
assert.strictEqual(runtime.hasEntries(), false);

runtime.setTargets([
  { id: 'expired-target', expiresAt: 900 },
  { id: 'live-target', expiresAt: 1300 }
]);
runtime.setLegs([
  { quoteId: 1, expiresAt: 1200 },
  { quoteId: 2, expiresAt: 800 }
]);

assert.deepStrictEqual(runtime.pruneTargets(1000), [{ id: 'live-target', expiresAt: 1300 }]);
assert.deepStrictEqual(runtime.pruneLegs(1000), [{ quoteId: 1, expiresAt: 1200 }]);
assert.strictEqual(runtime.getLegKeySnapshot((entry) => String(entry.quoteId)), '1');
assert.strictEqual(runtime.hasEntries(), true);

let refreshCalls = 0;
runtime.scheduleRefresh(1000, () => {
  refreshCalls += 1;
  return false;
});
assert.strictEqual(runtime.getTimer(), 'timer-1');
assert.deepStrictEqual(scheduled.map((item) => item.delayMs), [200]);

runtime.scheduleRefresh(1000, () => false);
assert.deepStrictEqual(cleared, ['timer-1']);
assert.strictEqual(runtime.getTimer(), 'timer-2');

nowMs = 1200;
scheduled[1].handler();
assert.strictEqual(refreshCalls, 0);
assert.strictEqual(runtime.getTimer(), null);
assert.strictEqual(scheduled.length, 2);

runtime.syncRefresh(() => false);
assert.strictEqual(runtime.getTimer(), null);

runtime.syncRefresh(() => true);
assert.strictEqual(runtime.getTimer(), 'timer-3');
