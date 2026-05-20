const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const config = require('../src/app/dashboard-app-config');

assert.strictEqual(config.AMOUNT_INPUT_DEBOUNCE_MS, 600);
assert.strictEqual(config.DASHBOARD_SAVE_DEBOUNCE_MS, 1500);
assert.strictEqual(config.CHART_AUTO_REFRESH_INTERVAL_MS, 5000);
assert.strictEqual(config.FLOATING_PANEL_BASE_Z_INDEX, 2100);
assert.strictEqual(config.DATA_TERMINAL_UPDATE_DELAY_MS, 1000);
assert.strictEqual(config.DEFAULT_QUOTE_DISPLAY_MODE, 'rate');
assert.strictEqual(config.ARB_PANEL_UPDATE_DELAY_MS, 1000);
assert.strictEqual(config.ARB_DETAIL_REFRESH_INTERVAL_MS, 2500);
assert.strictEqual(config.MUTED_STATE_VISIBLE_REFRESH_MS, 1000);
assert.strictEqual(config.MUTED_STATE_HIDDEN_MAX_REFRESH_MS, 60000);
assert.deepStrictEqual(config.GLOBAL_PATH_SOURCE_SELECTORS, [0, 1, 2, 3]);
assert.strictEqual(Object.isFrozen(config.GLOBAL_PATH_SOURCE_SELECTORS), true);
assert.strictEqual(
  config.buildBackendUrl({ origin: 'http://127.0.0.1:3003', protocol: 'http:', hostname: '127.0.0.1', port: '3003' }),
  'http://127.0.0.1:3003'
);
assert.strictEqual(
  config.buildBackendUrl({ protocol: 'http:', host: 'localhost:3010', hostname: 'localhost', port: '3010' }),
  'http://localhost:3010'
);
assert.strictEqual(
  config.buildBackendUrl({ protocol: 'http:', hostname: '127.0.0.1' }),
  'http://127.0.0.1:3000'
);
assert.strictEqual(
  config.buildBackendUrl({ protocol: 'https:', hostname: 'example.com' }),
  'https://example.com:3000'
);

const source = fs.readFileSync(path.join(__dirname, '..', 'src/app/dashboard-app-config.js'), 'utf8');
const sandbox = {};
vm.runInNewContext(source, sandbox);
assert.strictEqual(sandbox.DashboardAppConfig.DEFAULT_QUOTE_DISPLAY_MODE, 'rate');
assert.strictEqual(
  sandbox.DashboardAppConfig.buildBackendUrl({ origin: 'http://localhost:3004', protocol: 'http:', hostname: 'localhost', port: '3004' }),
  'http://localhost:3004'
);
