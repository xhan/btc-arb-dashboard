const assert = require('assert');

const {
  MUTED_PATH_LEG_DURATION_OPTIONS,
  normalizeMutedPathLeg,
  createMutedPathLegEntry,
  extendMutedPathLegEntry,
  pruneExpiredMutedPathLegs,
  findMutedPathLeg,
  findMutedPathLegByKey,
  removeMutedPathLegByKey,
  upsertMutedPathLegEntry,
  trimMutedPathLegsForStorage,
  filterMutedPathLegs
} = require('../muted-path-leg-utils');

assert.deepStrictEqual(MUTED_PATH_LEG_DURATION_OPTIONS, [2, 8, 12]);

const mutedLeg = createMutedPathLegEntry(
  {
    quoteId: 21,
    direction: 'forward',
    pricingMode: 'raw',
    chain: 'ethereum',
    fromSymbol: 'tBTC',
    toSymbol: 'BTC.b'
  },
  1000,
  2 * 60 * 60 * 1000,
  { titleSnapshot: '（ETH）tBTC -> BTC.b' }
);

assert.ok(mutedLeg);
assert.strictEqual(mutedLeg.quoteId, 21);
assert.strictEqual(mutedLeg.direction, 'forward');
assert.strictEqual(mutedLeg.pricingMode, 'raw');
assert.strictEqual(mutedLeg.titleSnapshot, '（ETH）tBTC -> BTC.b');
assert.strictEqual(mutedLeg.expiresAt, 1000 + (2 * 60 * 60 * 1000));

const inverseMutedLeg = createMutedPathLegEntry(
  {
    quoteId: 23,
    inverse: true,
    chain: 'ethereum',
    from: 'BTC.b',
    to: 'tBTC'
  },
  1000,
  2 * 60 * 60 * 1000
);

assert.ok(inverseMutedLeg);
assert.strictEqual(inverseMutedLeg.direction, 'inverse');
assert.strictEqual(inverseMutedLeg.pricingMode, 'raw');

const cexAskMutedLeg = createMutedPathLegEntry(
  {
    quoteId: 24,
    cexLevelLabel: 'ask1',
    chain: 'Bybit',
    from: 'USDT',
    to: 'USDe'
  },
  1000,
  2 * 60 * 60 * 1000
);

assert.ok(cexAskMutedLeg);
assert.strictEqual(cexAskMutedLeg.direction, 'forward');
assert.strictEqual(cexAskMutedLeg.pricingMode, 'cex-ask1-inverse');

const normalized = normalizeMutedPathLeg({
  quoteId: 22,
  direction: 'inverse',
  pricingMode: 'cex-ask1-inverse',
  chain: 'Bybit',
  fromSymbol: 'USDT',
  toSymbol: 'USDe',
  mutedAt: 2000,
  expiresAt: 4000,
  titleSnapshot: '（Bybit）USDT -> USDe'
});

assert.strictEqual(normalized.direction, 'inverse');
assert.strictEqual(normalized.pricingMode, 'cex-ask1-inverse');

const extended = extendMutedPathLegEntry(mutedLeg, 1500, 2 * 60 * 60 * 1000);
assert.ok(extended);
assert.strictEqual(extended.expiresAt, mutedLeg.expiresAt + (2 * 60 * 60 * 1000));
assert.strictEqual(extended.titleSnapshot, '（ETH）tBTC -> BTC.b');

assert.ok(findMutedPathLeg([mutedLeg], {
  quoteId: 21,
  direction: 'forward',
  pricingMode: 'raw'
}, 1200));
assert.strictEqual(findMutedPathLeg([mutedLeg], {
  quoteId: 21,
  direction: 'inverse',
  pricingMode: 'raw'
}, 1200), null);
assert.deepStrictEqual(pruneExpiredMutedPathLegs([mutedLeg], mutedLeg.expiresAt + 1), []);
const otherMutedLeg = createMutedPathLegEntry(
  {
    quoteId: 22,
    direction: 'forward',
    pricingMode: 'raw',
    chain: 'base',
    fromSymbol: 'cbBTC',
    toSymbol: 'tBTC'
  },
  1000,
  2 * 60 * 60 * 1000,
  { titleSnapshot: '（Base）cbBTC -> tBTC' }
);
const replacedMutedLeg = createMutedPathLegEntry(
  {
    quoteId: 21,
    direction: 'forward',
    pricingMode: 'raw',
    chain: 'ethereum',
    fromSymbol: 'tBTC',
    toSymbol: 'BTC.b'
  },
  3000,
  2 * 60 * 60 * 1000,
  { titleSnapshot: 'Updated tBTC -> BTC.b' }
);
assert.strictEqual(
  findMutedPathLegByKey([mutedLeg, otherMutedLeg], '21:forward:raw').titleSnapshot,
  '（ETH）tBTC -> BTC.b'
);
assert.deepStrictEqual(
  upsertMutedPathLegEntry([mutedLeg, otherMutedLeg], replacedMutedLeg).map((entry) => entry.titleSnapshot),
  ['（Base）cbBTC -> tBTC', 'Updated tBTC -> BTC.b']
);
assert.deepStrictEqual(
  removeMutedPathLegByKey([mutedLeg, otherMutedLeg], '21:forward:raw').map((entry) => entry.titleSnapshot),
  ['（Base）cbBTC -> tBTC']
);

const trimmed = trimMutedPathLegsForStorage([
  { quoteId: 1, direction: 'forward', pricingMode: 'raw', mutedAt: 1000, expiresAt: 2000 },
  { quoteId: 2, direction: 'forward', pricingMode: 'raw', mutedAt: 2000, expiresAt: 3000 },
  { quoteId: 3, direction: 'forward', pricingMode: 'raw', mutedAt: 3000, expiresAt: 4000 }
], 2);

assert.deepStrictEqual(trimmed.map((entry) => entry.quoteId), [2, 3]);

const filteredEdges = filterMutedPathLegs([
  { quoteId: 21, direction: 'forward', pricingMode: 'raw', chain: 'ethereum', from: 'tBTC', to: 'BTC.b' },
  { quoteId: 21, direction: 'inverse', pricingMode: 'raw', chain: 'ethereum', from: 'BTC.b', to: 'tBTC' },
  { quoteId: 22, direction: 'forward', pricingMode: 'raw', chain: 'base', from: 'cbBTC', to: 'tBTC' }
], [mutedLeg], 1200);

assert.deepStrictEqual(
  filteredEdges.map((edge) => `${edge.quoteId}:${edge.direction}`),
  ['21:inverse', '22:forward']
);
