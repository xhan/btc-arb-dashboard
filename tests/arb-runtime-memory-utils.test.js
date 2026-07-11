const assert = require('assert');

const {
  buildRetainedArbOpportunityStore,
  createArbRefreshRuntime,
  createArbPanelUpdateRuntime,
  createArbOpportunityHighlightRuntime,
  createArbOpportunityRuntime,
  getNextArbOpportunityHighlightExpiry,
  isArbOpportunityHighlighted,
  markArbOpportunityHighlights,
  pruneExpiredArbOpportunityHighlights,
  trimContainerChildren
} = require('../src/arb/arb-runtime-memory-utils');

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

const opportunityRuntime = createArbOpportunityRuntime();
const targetIndex = new Map([
  ['target-a', ['a', 'detail-1']]
]);
opportunityRuntime.setPanelOpportunities(nextOpportunityMap, targetIndex, [
  { id: 'detail-1', label: 'detail' }
]);
assert.strictEqual(opportunityRuntime.getOpportunity('a').label, 'A');
assert.strictEqual(opportunityRuntime.getOpportunity('detail-1').label, 'detail');
assert.deepStrictEqual(opportunityRuntime.getOpportunityIdsForTarget('target-a'), ['a', 'detail-1']);
assert.deepStrictEqual(opportunityRuntime.getOpportunityIdsForTarget('missing'), []);
opportunityRuntime.setPanelOpportunities(new Map([
  ['c', { id: 'c', label: 'C' }]
]), null);
assert.strictEqual(opportunityRuntime.getOpportunity('a'), null, 'runtime should replace stale current opportunities');
assert.strictEqual(opportunityRuntime.getOpportunity('c').label, 'C');

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

let panelVisible = false;
let panelDirtyCount = 0;
let panelUpdateCount = 0;
let panelTimerId = 0;
const panelTimers = [];
const panelClearedTimers = [];
const panelUpdateRuntime = createArbPanelUpdateRuntime({
  delayMs: 1000,
  isVisible: () => panelVisible,
  markDirty: () => {
    panelDirtyCount += 1;
  },
  update: () => {
    panelUpdateCount += 1;
  },
  setTimer(callback, delayMs) {
    const id = `panel-${panelTimerId += 1}`;
    panelTimers.push({ id, callback, delayMs });
    return id;
  },
  clearTimer(id) {
    panelClearedTimers.push(id);
  }
});

assert.strictEqual(panelUpdateRuntime.schedule(), false);
assert.strictEqual(panelDirtyCount, 1, 'hidden panel should be marked dirty instead of scheduling');
assert.strictEqual(panelUpdateRuntime.isDirty(), true, 'hidden panel update should set dirty state inside runtime');
assert.strictEqual(panelTimers.length, 0);

panelVisible = true;
assert.strictEqual(panelUpdateRuntime.clearDirty(), true);
assert.strictEqual(panelUpdateRuntime.isDirty(), false);
assert.strictEqual(panelUpdateRuntime.schedule(), true);
assert.strictEqual(panelUpdateRuntime.hasTimer(), true);
assert.deepStrictEqual(panelTimers.map((entry) => entry.delayMs), [1000]);
assert.strictEqual(panelUpdateRuntime.schedule(), false, 'runtime should not schedule duplicate panel updates');
panelTimers[0].callback();
assert.strictEqual(panelUpdateCount, 1);
assert.strictEqual(panelUpdateRuntime.hasTimer(), false);

panelUpdateRuntime.schedule();
assert.strictEqual(panelUpdateRuntime.clear(), true);
assert.deepStrictEqual(panelClearedTimers, ['panel-2']);
assert.strictEqual(panelUpdateRuntime.hasTimer(), false);
assert.strictEqual(panelUpdateRuntime.markDirty(), true);
assert.strictEqual(panelUpdateRuntime.isDirty(), true);
assert.strictEqual(panelUpdateRuntime.clearDirty(), true);
assert.strictEqual(panelUpdateRuntime.clearDirty(), false);

let arbRefreshDemand = false;
let arbRefreshCount = 0;
let arbRefreshSkippedCount = 0;
const arbRefreshTimers = [];
const arbRefreshRuntime = createArbRefreshRuntime({
  delayMs: 500,
  hasDemand: () => arbRefreshDemand,
  onSkipped: () => { arbRefreshSkippedCount += 1; },
  refresh: (options) => {
    arbRefreshCount += options.forcePanel ? 10 : 1;
    return 'snapshot';
  },
  setTimer(callback, delayMs) {
    const timer = { callback, delayMs };
    arbRefreshTimers.push(timer);
    return timer;
  },
  clearTimer() {}
});

assert.strictEqual(arbRefreshRuntime.schedule(), false);
assert.strictEqual(arbRefreshSkippedCount, 1);
arbRefreshDemand = true;
assert.strictEqual(arbRefreshRuntime.schedule(), true);
assert.strictEqual(arbRefreshRuntime.schedule(), false);
assert.strictEqual(arbRefreshTimers[0].delayMs, 500);
arbRefreshTimers[0].callback();
assert.strictEqual(arbRefreshCount, 1);
assert.strictEqual(arbRefreshRuntime.refresh({ forcePanel: true }), 'snapshot');
assert.strictEqual(arbRefreshCount, 11);
