const assert = require('assert');

const {
  createArbAlertBridgeRuntime,
  getOpportunityIdsForTarget,
  markOpportunityHighlights,
  normalizeTargetKey,
  resolveTriggeredArbOpportunityTargetKey
} = require('../src/arb/arb-alert-bridge-utils');

assert.strictEqual(normalizeTargetKey('  target-a  '), 'target-a');
assert.strictEqual(normalizeTargetKey(null), '');

const opportunityRuntime = {
  getOpportunityIdsForTarget(targetKey) {
    if (targetKey === 'target-a') return ['opp-1', '', 'opp-2'];
    if (targetKey === 'target-key-a') return ['opp-3'];
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
const arbLayoutCalls = [];
const arbPanelLayoutUtils = {
  buildTriggeredArbOpportunityHighlightTargetKey(alert, evaluation, options) {
    arbLayoutCalls.push(['buildTargetKey', alert, evaluation]);
    if (alert && alert.target && alert.target.type === 'path') {
      return options.buildTargetKey(alert);
    }
    const candidate = options.buildMutedPathTargetFromCycleLegs(evaluation && evaluation.cycle && evaluation.cycle.legs);
    return candidate ? options.buildTargetKey(candidate) : '';
  },
  selectFirstUnmutedDisplayedCycle(cycles, isMutedCandidate) {
    arbLayoutCalls.push(['selectCycle', cycles]);
    return cycles.find((cycle) => !isMutedCandidate(cycle)) || null;
  }
};

assert.deepStrictEqual(getOpportunityIdsForTarget(opportunityRuntime, ' target-a '), ['opp-1', 'opp-2']);
assert.deepStrictEqual(getOpportunityIdsForTarget(opportunityRuntime, ''), []);
assert.deepStrictEqual(getOpportunityIdsForTarget(null, 'target-a'), []);
assert.strictEqual(markOpportunityHighlights(highlightRuntime, ['opp-1'], 1234), true);
assert.strictEqual(markOpportunityHighlights(highlightRuntime, [], 1234), false);
assert.strictEqual(markOpportunityHighlights(null, ['opp-1'], 1234), false);
assert.strictEqual(
  resolveTriggeredArbOpportunityTargetKey({ target: { type: 'path' } }, {}, {
    buildMutedPathTargetFromCycleLegs: () => ({ type: 'path' }),
    buildMutedPathTargetKey: () => ' helper-target ',
    buildTriggeredArbOpportunityHighlightTargetKey: (alert, evaluation, options) => options.buildTargetKey(alert)
  }),
  'helper-target'
);

const bridgeRuntime = createArbAlertBridgeRuntime({
  arbPanelLayoutUtils,
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
assert.strictEqual(
  bridgeRuntime.markTriggeredAlertOpportunity(
    { target: { type: 'rule', ruleId: 'fixed-a' } },
    { cycle: { legs: [{ quoteId: 1 }] } },
    6789
  ),
  true
);
assert.deepStrictEqual(highlighted, [
  [['opp-1'], 1234],
  [['opp-1', 'opp-2'], 5678],
  [['opp-3'], 6789]
]);
assert.strictEqual(bridgeRuntime.invalidateRuleSnapshot(), true);
assert.strictEqual(bridgeRuntime.refreshArbPanel(), true);
assert.deepStrictEqual(
  bridgeRuntime.selectFirstUnmutedDisplayedCycle(
    [{ id: 'muted' }, { id: 'live' }],
    (cycle) => cycle.id === 'muted'
  ),
  { id: 'live' }
);
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
  ['buildTarget', [{ quoteId: 1 }]],
  ['buildKey', { type: 'path', legs: [{ quoteId: 1 }] }],
  ['prune', 2000],
  ['getLegs'],
  ['buildKey', { target: { type: 'path' } }],
  ['buildTarget', [{ quoteId: 1 }]]
]);
assert.deepStrictEqual(arbLayoutCalls, [
  [
    'buildTargetKey',
    { target: { type: 'rule', ruleId: 'fixed-a' } },
    { cycle: { legs: [{ quoteId: 1 }] } }
  ],
  [
    'selectCycle',
    [{ id: 'muted' }, { id: 'live' }]
  ]
]);

const emptyBridgeRuntime = createArbAlertBridgeRuntime();
assert.strictEqual(emptyBridgeRuntime.invalidateRuleSnapshot(), false);
assert.strictEqual(emptyBridgeRuntime.refreshArbPanel(), false);
assert.strictEqual(emptyBridgeRuntime.selectFirstUnmutedDisplayedCycle([{ id: 1 }], () => false), null);
assert.deepStrictEqual(emptyBridgeRuntime.getActiveMutedPathLegs(2000), []);
assert.strictEqual(emptyBridgeRuntime.buildMutedPathTargetKey({}), '');
assert.strictEqual(emptyBridgeRuntime.buildMutedPathTargetFromCycleLegs([]), null);
assert.deepStrictEqual(
  emptyBridgeRuntime.refreshArbViewsAfterMutedPathLegChange(),
  { closedDetail: false, renderedDetail: false, updatedPanel: false }
);
