const assert = require('assert');

const {
  parseUtc8Input,
  formatUtc8
} = require('../time-utils');

const parsed = parseUtc8Input('2026-03-01 00:00:00');
assert.strictEqual(parsed.toISOString(), '2026-02-28T16:00:00.000Z');

const parsedWithOffset = parseUtc8Input('2026-03-01T00:00:00+08:00');
assert.strictEqual(parsedWithOffset.toISOString(), '2026-02-28T16:00:00.000Z');

const parsedDateOnly = parseUtc8Input('2026-03-01');
assert.strictEqual(parsedDateOnly.toISOString(), '2026-02-28T16:00:00.000Z');

assert.strictEqual(
  formatUtc8('2026-02-28T16:00:00.000Z'),
  '2026-03-01 00:00:00 +08:00'
);
