const assert = require('assert');

const {
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
