const assert = require('assert');

const {
  createArbAlertBridgeRuntime,
  getOpportunityIdsForTarget,
  markOpportunityHighlights,
  normalizeTargetKey
} = require('../src/arb/arb-alert-bridge-utils');

assert.strictEqual(normalizeTargetKey('  target-a  '), 'target-a');
assert.strictEqual(normalizeTargetKey(null), '');

const opportunityRuntime = {
  getOpportunityIdsForTarget(targetKey) {
    if (targetKey === 'target-a') return ['opp-1', '', 'opp-2'];
    return [];
  }
};
const highlighted = [];
const sideEffects = [];
const alertRuntimeCalls = [];
const highlightRuntime = {
  mark(opportunityIds, nowMs) {
    highlighted.push([opportunityIds, nowMs]);
    return true;
  }
};
const mutedPathLegs = [{ key: 'leg-a' }];
const alertRuntime = {
  buildMutedPathTargetFromCycleLegs(legs) {
    alertRuntimeCalls.push(['buildTarget', legs]);
    return { type: 'path', legs };
  },
  buildMutedPathTargetKey(alertOrTarget) {
    alertRuntimeCalls.push(['buildKey', alertOrTarget]);
    return 'target-key-a';
  },
  getMutedPathLegs() {
    alertRuntimeCalls.push(['getLegs']);
    return mutedPathLegs;
  },
  pruneMutedPathLegsInPlace(nowMs) {
    alertRuntimeCalls.push(['prune', nowMs]);
  }
};

assert.deepStrictEqual(getOpportunityIdsForTarget(opportunityRuntime, ' target-a '), ['opp-1', 'opp-2']);
assert.deepStrictEqual(getOpportunityIdsForTarget(opportunityRuntime, ''), []);
assert.deepStrictEqual(getOpportunityIdsForTarget(null, 'target-a'), []);
assert.strictEqual(markOpportunityHighlights(highlightRuntime, ['opp-1'], 1234), true);
assert.strictEqual(markOpportunityHighlights(highlightRuntime, [], 1234), false);
assert.strictEqual(markOpportunityHighlights(null, ['opp-1'], 1234), false);

const bridgeRuntime = createArbAlertBridgeRuntime({
  opportunityRuntime,
  highlightRuntime,
  closeArbDetailModal: () => sideEffects.push(['closeDetail']),
  getAlertRuntimeController: () => alertRuntime,
  invalidateArbRuleSnapshotCache: () => sideEffects.push(['invalidate']),
  isArbDetailVisible: () => true,
  renderArbDetailModal: () => sideEffects.push(['renderDetail']),
  updateArbPanel: () => sideEffects.push(['updatePanel'])
});

assert.deepStrictEqual(bridgeRuntime.getOpportunityIdsForTarget('target-a'), ['opp-1', 'opp-2']);
assert.strictEqual(bridgeRuntime.markTriggeredOpportunities('target-a', 5678), true);
assert.strictEqual(bridgeRuntime.markTriggeredOpportunities('missing', 5678), false);
assert.deepStrictEqual(highlighted, [
  [['opp-1'], 1234],
  [['opp-1', 'opp-2'], 5678]
]);
assert.strictEqual(bridgeRuntime.invalidateRuleSnapshot(), true);
assert.strictEqual(bridgeRuntime.refreshArbPanel(), true);
assert.deepStrictEqual(
  bridgeRuntime.refreshArbViewsAfterMutedPathLegChange({ closeDetail: true }),
  { closedDetail: true, renderedDetail: false, updatedPanel: true }
);
assert.deepStrictEqual(
  bridgeRuntime.refreshArbViewsAfterMutedPathLegChange({ closeDetail: false }),
  { closedDetail: false, renderedDetail: true, updatedPanel: true }
);
assert.deepStrictEqual(bridgeRuntime.getActiveMutedPathLegs(2000), mutedPathLegs);
assert.strictEqual(bridgeRuntime.buildMutedPathTargetKey({ target: { type: 'path' } }), 'target-key-a');
assert.deepStrictEqual(
  bridgeRuntime.buildMutedPathTargetFromCycleLegs([{ quoteId: 1 }]),
  { type: 'path', legs: [{ quoteId: 1 }] }
);
assert.deepStrictEqual(sideEffects, [
  ['invalidate'],
  ['updatePanel'],
  ['updatePanel'],
  ['closeDetail'],
  ['updatePanel'],
  ['renderDetail']
]);
assert.deepStrictEqual(alertRuntimeCalls, [
  ['prune', 2000],
  ['getLegs'],
  ['buildKey', { target: { type: 'path' } }],
  ['buildTarget', [{ quoteId: 1 }]]
]);

const emptyBridgeRuntime = createArbAlertBridgeRuntime();
assert.strictEqual(emptyBridgeRuntime.invalidateRuleSnapshot(), false);
assert.strictEqual(emptyBridgeRuntime.refreshArbPanel(), false);
assert.deepStrictEqual(emptyBridgeRuntime.getActiveMutedPathLegs(2000), []);
assert.strictEqual(emptyBridgeRuntime.buildMutedPathTargetKey({}), '');
assert.strictEqual(emptyBridgeRuntime.buildMutedPathTargetFromCycleLegs([]), null);
assert.deepStrictEqual(
  emptyBridgeRuntime.refreshArbViewsAfterMutedPathLegChange(),
  { closedDetail: false, renderedDetail: false, updatedPanel: false }
);
