const assert = require('assert');

const {
  normalizeArbPathNotes,
  setArbPathNote
} = require('../src/arb/arb-path-notes-utils');
const {
  loadArbPathNotes,
  registerArbPathNotesRoutes
} = require('../src/server/arb-path-notes-route-utils');

function createFakeApp() {
  const handlers = new Map();
  return {
    handlers,
    get(routePath, handler) {
      handlers.set(`GET ${routePath}`, handler);
    },
    post(routePath, handler) {
      handlers.set(`POST ${routePath}`, handler);
    }
  };
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    json(payload) {
      this.body = payload;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    }
  };
}

assert.deepStrictEqual(
  normalizeArbPathNotes({
    'fixed:wbtc': '  跨链到账较慢  ',
    'fixed:empty': '   ',
    'special:wbtc': '不应保存',
    'fixed:long': 'x'.repeat(520)
  }),
  {
    'fixed:wbtc': '跨链到账较慢',
    'fixed:long': 'x'.repeat(500)
  }
);
assert.deepStrictEqual(
  setArbPathNote({ 'fixed:wbtc': '旧备注' }, 'fixed:wbtc', ' 新备注 '),
  { 'fixed:wbtc': '新备注' }
);
assert.deepStrictEqual(setArbPathNote({ 'fixed:wbtc': '旧备注' }, 'fixed:wbtc', ''), {});
assert.deepStrictEqual(setArbPathNote({}, 'special:wbtc', '忽略'), {});

async function runRouteTests() {
  const missing = await loadArbPathNotes({
    configPath: '/missing.js',
    readJsonFile: async () => {
      const error = new Error('missing');
      error.code = 'ENOENT';
      throw error;
    }
  });
  assert.deepStrictEqual(missing, {});

  const app = createFakeApp();
  const calls = [];
  registerArbPathNotesRoutes({
    app,
    configPath: '/arb-path-notes.js',
    readJsonFile: async () => ({ 'fixed:wbtc': '现有备注', 'special:x': '无效' }),
    safeWriteJsonFile: async (filePath, payload) => calls.push([filePath, payload]),
    logger: { error: (...args) => calls.push(['error', ...args]) }
  });

  const getResponse = createResponse();
  await app.handlers.get('GET /api/arb-path-notes')({}, getResponse);
  assert.deepStrictEqual(getResponse.body, { 'fixed:wbtc': '现有备注' });

  const saveResponse = createResponse();
  await app.handlers.get('POST /api/arb-path-notes')({
    body: { 'fixed:wbtc': ' 更新后 ', 'fixed:empty': '', 'special:x': '无效' }
  }, saveResponse);
  assert.deepStrictEqual(calls[0], ['/arb-path-notes.js', { 'fixed:wbtc': '更新后' }]);
  assert.deepStrictEqual(saveResponse.body, { notes: { 'fixed:wbtc': '更新后' } });

  const failingApp = createFakeApp();
  registerArbPathNotesRoutes({
    app: failingApp,
    configPath: '/arb-path-notes.js',
    readJsonFile: async () => ({}),
    safeWriteJsonFile: async () => { throw new Error('write failed'); },
    logger: { error: () => {} }
  });
  const failingResponse = createResponse();
  await failingApp.handlers.get('POST /api/arb-path-notes')({ body: {} }, failingResponse);
  assert.strictEqual(failingResponse.statusCode, 500);
  assert.deepStrictEqual(failingResponse.body, { error: 'write failed' });
}

runRouteTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
