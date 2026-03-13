const assert = require('assert');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'alert.config'), 'utf8'));

assert.strictEqual(config.settings.defaultCooldownSec, 180);
assert.strictEqual(config.settings.changedLegMinBp, 0.1);
assert.strictEqual(config.settings.dayAppEnabled, false);
assert.strictEqual(config.settings.telegramEnabled, true);
for (const alert of config.alerts || []) {
  assert.strictEqual(alert.triggerMode, 'delayed', `alert ${alert.id} triggerMode should be delayed`);
  assert.strictEqual(alert.confirmDelaySec, 13, `alert ${alert.id} confirmDelaySec should be 13`);
  assert.strictEqual(alert.cooldownSec, 180, `alert ${alert.id} cooldownSec should be 180`);
}
