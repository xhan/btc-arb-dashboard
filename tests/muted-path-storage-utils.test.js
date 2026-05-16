const assert = require('assert');

const {
  normalizeStoredMutedPathTargets,
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
