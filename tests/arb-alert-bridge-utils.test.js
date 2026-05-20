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
const highlightRuntime = {
  mark(opportunityIds, nowMs) {
    highlighted.push([opportunityIds, nowMs]);
    return true;
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
  highlightRuntime
});

assert.deepStrictEqual(bridgeRuntime.getOpportunityIdsForTarget('target-a'), ['opp-1', 'opp-2']);
assert.strictEqual(bridgeRuntime.markTriggeredOpportunities('target-a', 5678), true);
assert.strictEqual(bridgeRuntime.markTriggeredOpportunities('missing', 5678), false);
assert.deepStrictEqual(highlighted, [
  [['opp-1'], 1234],
  [['opp-1', 'opp-2'], 5678]
]);
