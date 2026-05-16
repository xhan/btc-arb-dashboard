const assert = require('assert');

const {
  MUTED_PATH_LEGS_STORAGE_KEY,
  MUTED_PATH_TARGETS_STORAGE_KEY,
  loadMutedPathLegsFromStorage,
  loadMutedPathTargetsFromStorage,
  normalizeStoredMutedPathTargets,
  persistMutedPathLegsToStorage,
  persistMutedPathTargetsToStorage,
  trimMutedPathTargetsForStorage
} = require('../src/path-alerts/muted-path-storage-utils');

const normalized = normalizeStoredMutedPathTargets([
  {
    target: {
      type: 'path',
      legs: [
        { quoteId: 11, direction: 'forward', pricingMode: 'raw', chain: 'ethereum', fromSymbol: 'GHO', toSymbol: 'USDC' }
      ]
    },
    mutedAt: 1000,
    expiresAt: 2000,
    summaryLinesSnapshot: ['GHO - USD'],
    logTitleSnapshot: '🚨 [路径报警] GHO - USD'
  },
  {
    target: {
      type: 'path',
      legs: [
        { quoteId: 12, direction: 'forward', pricingMode: 'raw', chain: 'base', fromSymbol: 'A', toSymbol: 'B' }
      ]
    },
    mutedAt: 1000,
    expiresAt: 1000
  }
]);

assert.strictEqual(normalized.length, 1);
assert.strictEqual(normalized[0].target.type, 'path');
assert.strictEqual(normalized[0].logTitleSnapshot, '🚨 [路径报警] GHO - USD');

const trimmed = trimMutedPathTargetsForStorage([
  { mutedAt: 1000, target: { type: 'quote', quoteId: 1, direction: 'forward', ruleKind: 'targetAbove', value: 1 } },
  { mutedAt: 2000, target: { type: 'quote', quoteId: 2, direction: 'forward', ruleKind: 'targetAbove', value: 1 } },
  { mutedAt: 3000, target: { type: 'quote', quoteId: 3, direction: 'forward', ruleKind: 'targetAbove', value: 1 } }
], 2);

assert.deepStrictEqual(
  trimmed.map((entry) => entry.target.quoteId),
  [2, 3]
);

function createStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    values,
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

const storage = createStorage({
  [MUTED_PATH_TARGETS_STORAGE_KEY]: JSON.stringify(normalized)
});
assert.deepStrictEqual(
  loadMutedPathTargetsFromStorage(storage),
  normalized
);

const persistedTargets = persistMutedPathTargetsToStorage(storage, trimmed, { limit: 1 });
assert.deepStrictEqual(persistedTargets.map((entry) => entry.target.quoteId), [3]);
assert.deepStrictEqual(
  JSON.parse(storage.getItem(MUTED_PATH_TARGETS_STORAGE_KEY)).map((entry) => entry.target.quoteId),
  [3]
);

const mutedPathLegUtils = {
  pruneExpiredMutedPathLegs(entries, nowMs) {
    return entries.filter((entry) => nowMs < entry.expiresAt);
  },
  trimMutedPathLegsForStorage(entries, limit) {
    return entries.slice(-limit);
  }
};
const legStorage = createStorage({
  [MUTED_PATH_LEGS_STORAGE_KEY]: JSON.stringify([
    { quoteId: 1, expiresAt: 1000 },
    { quoteId: 2, expiresAt: 3000 }
  ])
});
assert.deepStrictEqual(
  loadMutedPathLegsFromStorage(legStorage, { mutedPathLegUtils, nowMs: 2000 }),
  [{ quoteId: 2, expiresAt: 3000 }]
);

const persistedLegs = persistMutedPathLegsToStorage(legStorage, [
  { quoteId: 1 },
  { quoteId: 2 },
  { quoteId: 3 }
], { mutedPathLegUtils, limit: 2 });
assert.deepStrictEqual(persistedLegs, [{ quoteId: 2 }, { quoteId: 3 }]);
assert.deepStrictEqual(
  JSON.parse(legStorage.getItem(MUTED_PATH_LEGS_STORAGE_KEY)),
  [{ quoteId: 2 }, { quoteId: 3 }]
);

const warnings = [];
assert.deepStrictEqual(
  loadMutedPathTargetsFromStorage(createStorage({ [MUTED_PATH_TARGETS_STORAGE_KEY]: '{bad json' }), {
    onError: (error) => warnings.push(error.message)
  }),
  []
);
assert.strictEqual(warnings.length, 1);
