const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const candidateUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'path-alert-candidate-utils.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, '..', 'path-alerts-app.js'), 'utf8');

function createElement() {
  return {
    innerHTML: '',
    textContent: '',
    className: '',
    value: '',
    checked: false,
    disabled: false,
    style: {},
    dataset: {},
    classList: {
      add() {},
      remove() {}
    },
    addEventListener() {},
    removeEventListener() {},
    focus() {},
    closest() { return null; }
  };
}

const documentStub = {
  getElementById() {
    return createElement();
  },
  addEventListener() {},
  activeElement: null
};

const sandbox = {
  console,
  window: {
    __PATH_ALERTS_APP_DISABLE_AUTO_INIT__: true,
    PathAlertUtils: {
      normalizeAlertConfig() {
        return { settings: { defaultCooldownSec: 300 }, alerts: [] };
      },
      DEFAULT_PATH_ALERT_THRESHOLD_BP: 1.1
    }
  },
  document: documentStub,
  location: {
    protocol: 'http:',
    hostname: '127.0.0.1',
    href: 'http://127.0.0.1/path-alerts'
  },
  history: { replaceState() {} },
  fetch: async () => {
    throw new Error('unexpected fetch');
  },
  setTimeout,
  clearTimeout,
  URL,
  URLSearchParams,
  Map,
  Date
};
sandbox.window.window = sandbox.window;
sandbox.window.document = documentStub;
sandbox.window.history = sandbox.history;
sandbox.window.location = sandbox.location;
sandbox.window.fetch = sandbox.fetch;
sandbox.window.console = console;
sandbox.window.setTimeout = setTimeout;
sandbox.window.clearTimeout = clearTimeout;

vm.createContext(sandbox);
vm.runInContext(candidateUtilsCode, sandbox);
vm.runInContext(appCode, sandbox);

const candidates = sandbox.window.PathAlertsAppTestHooks.buildFallbackQuoteCandidatesFromDashboard([
  {
    id: 1,
    name: '测试监控',
    quotes: [
      { id: 101, chain: 'ethereum', fromToken: '0xaaa', toToken: '0xbbb', showInverse: true },
      { id: 102, chain: 'ethereum', fromToken: '0xccc', toToken: '0xddd', showInverse: true, paused: true }
    ]
  }
]);

assert.ok(candidates.some((item) => item.key === '101:forward'));
assert.ok(candidates.some((item) => item.key === '101:inverse'));
assert.ok(!candidates.some((item) => item.key.startsWith('102:')));
