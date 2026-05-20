const assert = require('assert');

const {
  createDashboardRuntimeBridge,
  createDashboardRuntimeRef
} = require('../src/app/dashboard-runtime-ref-utils');

const ref = createDashboardRuntimeRef({ name: 'Quote runtime' });
assert.strictEqual(ref.peek(), null);
assert.throws(
  () => ref.get(),
  /Quote runtime is not initialized/
);
assert.throws(
  () => ref.call('refresh'),
  /Quote runtime is not initialized/
);
assert.strictEqual(ref.callOr(false, 'refresh'), false);

const runtime = {
  value: 3,
  refresh(multiplier, offset) {
    return this.value * multiplier + offset;
  }
};
assert.strictEqual(ref.set(runtime), runtime);
assert.strictEqual(ref.peek(), runtime);
assert.strictEqual(ref.get(), runtime);
assert.strictEqual(ref.call('refresh', 4, 2), 14);
assert.strictEqual(ref.callOr(false, 'refresh', 5, 1), 16);
assert.strictEqual(ref.callOr('fallback', 'missingMethod'), 'fallback');
assert.throws(
  () => ref.call('missingMethod'),
  /Quote runtime\.missingMethod is not available/
);

const bridge = createDashboardRuntimeBridge();
assert.strictEqual(bridge.quoteRuntimeRef.peek(), null);
assert.strictEqual(bridge.arbAlertRuntimeRef.peek(), null);
assert.strictEqual(bridge.dashboardViewRenderRuntimeRef.peek(), null);
assert.strictEqual(bridge.isDashboardViewActive(), false);
assert.strictEqual(bridge.markDashboardViewDirty(), false);
assert.strictEqual(bridge.renderDashboardForCurrentState(), false);
assert.strictEqual(bridge.ensureDashboardRendered(), false);
assert.throws(
  () => bridge.abortActiveFetchControllers(),
  /Dashboard quote runtime is not initialized/
);

const bridgeCalls = [];
bridge.quoteRuntimeRef.set({
  abortActiveFetchControllers() {
    bridgeCalls.push(['abort']);
    return 'aborted';
  },
  fetchQuoteByStrategy(quote, options) {
    bridgeCalls.push(['fetch', quote, options]);
    return 'fetched';
  },
  updateSchedulers() {
    bridgeCalls.push(['updateSchedulers']);
    return 'scheduled';
  }
});
bridge.arbAlertRuntimeRef.set({
  invalidateArbRuleSnapshotCache(options) {
    bridgeCalls.push(['invalidate', options]);
    return 'invalidated';
  },
  updateArbPanel(options) {
    bridgeCalls.push(['updatePanel', options]);
    return 'updated';
  }
});
bridge.dashboardViewRenderRuntimeRef.set({
  isActive() {
    bridgeCalls.push(['isActive']);
    return true;
  },
  markDirty() {
    bridgeCalls.push(['markDirty']);
    return false;
  },
  renderNow() {
    bridgeCalls.push(['renderNow']);
    return true;
  },
  ensureRendered() {
    bridgeCalls.push(['ensureRendered']);
    return true;
  }
});

assert.strictEqual(bridge.abortActiveFetchControllers(), 'aborted');
assert.strictEqual(bridge.fetchQuoteByStrategy({ id: 1 }, { force: true }), 'fetched');
assert.strictEqual(bridge.updateSchedulers(), 'scheduled');
assert.strictEqual(bridge.invalidateArbRuleSnapshotCache({ bumpRevision: false }), 'invalidated');
assert.strictEqual(bridge.updateArbPanel({ force: true }), 'updated');
assert.strictEqual(bridge.isDashboardViewActive(), true);
assert.strictEqual(bridge.markDashboardViewDirty(), false);
assert.strictEqual(bridge.renderDashboardForCurrentState(), true);
assert.strictEqual(bridge.ensureDashboardRendered(), true);
assert.deepStrictEqual(bridgeCalls, [
  ['abort'],
  ['fetch', { id: 1 }, { force: true }],
  ['updateSchedulers'],
  ['invalidate', { bumpRevision: false }],
  ['updatePanel', { force: true }],
  ['isActive'],
  ['markDirty'],
  ['renderNow'],
  ['ensureRendered']
]);
