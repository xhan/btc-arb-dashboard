const assert = require('assert');

const {
  buildRetainedArbOpportunityStore,
  createArbOpportunityHighlightRuntime,
  getNextArbOpportunityHighlightExpiry,
  isArbOpportunityHighlighted,
  markArbOpportunityHighlights,
  pruneExpiredArbOpportunityHighlights,
  trimContainerChildren
} = require('../arb-runtime-memory-utils');

const nextOpportunityMap = new Map([
  ['a', { id: 'a', label: 'A' }],
  ['b', { id: 'b', label: 'B' }]
]);

const retainedStore = buildRetainedArbOpportunityStore(nextOpportunityMap, [
  { id: 'detail-1', label: 'detail' },
  { id: 'a', label: 'old-a' },
  null
]);

assert.deepStrictEqual(
  Array.from(retainedStore.keys()),
  ['a', 'b', 'detail-1'],
  'should keep current opportunities and append retained entries without duplicating ids'
);
assert.strictEqual(retainedStore.get('a').label, 'A');
assert.strictEqual(retainedStore.get('detail-1').label, 'detail');

const nodes = Array.from({ length: 5 }, (_, index) => {
  const node = { index };
  node.remove = () => {
    const currentIndex = container.children.indexOf(node);
    if (currentIndex >= 0) {
      container.children.splice(currentIndex, 1);
    }
  };
  return node;
});

const container = {
  children: [...nodes]
};

assert.strictEqual(trimContainerChildren(container, 3), 2);
assert.deepStrictEqual(container.children.map((node) => node.index), [0, 1, 2]);
assert.strictEqual(trimContainerChildren(container, 3), 0);

const highlights = new Map([
  ['expired', 900],
  ['active', 1500],
  ['bad', NaN]
]);
assert.strictEqual(pruneExpiredArbOpportunityHighlights(highlights, 1000), highlights);
assert.deepStrictEqual(Array.from(highlights.keys()), ['active']);
assert.strictEqual(isArbOpportunityHighlighted(highlights, 'active', 1200), true);
assert.strictEqual(isArbOpportunityHighlighted(highlights, 'active', 1500), false);
assert.strictEqual(isArbOpportunityHighlighted(highlights, '', 1200), false);
assert.strictEqual(getNextArbOpportunityHighlightExpiry(highlights), null);

const markResult = markArbOpportunityHighlights(highlights, ['active', 'new', '', null], {
  nowMs: 2000,
  durationMs: 8000
});
assert.strictEqual(markResult.changed, true);
assert.strictEqual(markResult.expiresAt, 10000);
assert.strictEqual(markResult.highlightedUntilById, highlights);
assert.strictEqual(highlights.get('active'), 10000);
assert.strictEqual(highlights.get('new'), 10000);
assert.strictEqual(getNextArbOpportunityHighlightExpiry(highlights), 10000);
assert.strictEqual(
  markArbOpportunityHighlights(highlights, ['active'], { nowMs: 1500, durationMs: 1000 }).changed,
  false
);

let nowMs = 1000;
let latestTimer = null;
let clearedTimerCount = 0;
let expiredCallbackCount = 0;
const highlightRuntime = createArbOpportunityHighlightRuntime({
  durationMs: 8000,
  now: () => nowMs,
  setTimer(callback, delayMs) {
    latestTimer = { callback, delayMs };
    return latestTimer;
  },
  clearTimer(timer) {
    if (timer) {
      clearedTimerCount += 1;
    }
  },
  onExpired() {
    expiredCallbackCount += 1;
  }
});

assert.strictEqual(highlightRuntime.isHighlighted('target-a'), false, 'runtime should start without highlights');
assert.strictEqual(highlightRuntime.mark(['target-a']), true, 'runtime should mark new highlight ids');
assert.strictEqual(highlightRuntime.isHighlighted('target-a', 1001), true);
assert.strictEqual(latestTimer.delayMs, 8010, 'runtime should schedule cleanup after the next expiry');
assert.strictEqual(highlightRuntime.mark(['target-a'], 1500), true, 'runtime should extend existing highlight expiry');
assert.strictEqual(clearedTimerCount, 1, 'runtime should clear the previous cleanup timer when rescheduling');
assert.strictEqual(latestTimer.delayMs, 8010);
nowMs = 9511;
latestTimer.callback();
assert.strictEqual(highlightRuntime.isHighlighted('target-a', nowMs), false, 'expired highlight should be pruned');
assert.strictEqual(expiredCallbackCount, 1, 'runtime should notify when cleanup removes visible highlights');
assert.strictEqual(highlightRuntime.getHighlightedUntilById().size, 0);
highlightRuntime.mark(['target-b'], 10000);
highlightRuntime.clear();
assert.strictEqual(highlightRuntime.getHighlightedUntilById().size, 0, 'clear should remove all highlight state');
