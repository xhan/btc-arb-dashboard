const assert = require('assert');

const {
  buildRetainedArbOpportunityStore,
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
