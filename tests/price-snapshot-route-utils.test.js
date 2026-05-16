const assert = require('assert');

const { registerPriceSnapshotRoutes } = require('../src/server/price-snapshot-route-utils');

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
    contentType: '',
    body: null,
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    type(contentType) {
      this.contentType = contentType;
      return this;
    }
  };
}

const app = createFakeApp();
const calls = [];
let snapshotEnabled = true;
registerPriceSnapshotRoutes({
  app,
  priceSnapshotDir: '/snapshots',
  chartPairWindowMs: 1234,
  getConfigMore: async () => ({
    enablePriceSnapshot: snapshotEnabled,
    priceSnapshotIntervalSec: '15',
    arbCycleStartPriority: ['USDC']
  }),
  appendPriceSnapshot: async (dir, payload) => {
    calls.push(['append', dir, payload]);
    return '/snapshots/one.json';
  },
  getClosestPriceSnapshot: async (dir, at, options) => {
    calls.push(['closest', dir, at.toISOString(), options]);
    return { snapshot: { capturedAt: '2026-02-28T16:00:10.000Z' } };
  },
  listRecentChartPairs: async (dir, options) => {
    calls.push(['pairs', dir, options]);
    return [{ key: '1:forward' }];
  },
  getChartSeries: async (dir, options) => {
    calls.push(['series', dir, options]);
    return options.quoteId === 404 ? null : { key: `${options.quoteId}:${options.direction}`, points: [] };
  },
  buildReplayFromSnapshot: (selection, options) => ({ selection, options }),
  decorateSnapshotSelection: (selection) => ({ decorated: selection }),
  renderReplayText: (replay) => `replay:${replay.options.cycleStartPriority.join(',')}`,
  logMessage: (...args) => calls.push(['log', ...args]),
  verboseLog: (...args) => calls.push(['verbose', ...args])
});

async function runConfigAndSaveTests() {
  const configResponse = createResponse();
  await app.handlers.get('GET /api/get-price-snapshot-config')({ query: {} }, configResponse);
  assert.deepStrictEqual(configResponse.body, { enabled: true, intervalSec: 15 });

  snapshotEnabled = false;
  const skippedResponse = createResponse();
  await app.handlers.get('POST /api/save-price-snapshot')({ body: { quotes: [] } }, skippedResponse);
  assert.deepStrictEqual(skippedResponse.body, { message: '价格快照未启用', skipped: true });

  snapshotEnabled = true;
  const savedResponse = createResponse();
  await app.handlers.get('POST /api/save-price-snapshot')({ body: { quotes: [{ quoteId: 1 }] } }, savedResponse);
  assert.deepStrictEqual(savedResponse.body, { message: '价格快照保存成功' });
  assert.deepStrictEqual(calls.find((item) => item[0] === 'append'), ['append', '/snapshots', { quotes: [{ quoteId: 1 }] }]);
}

async function runChartTests() {
  const pairsResponse = createResponse();
  await app.handlers.get('GET /api/chart-pairs')({ query: {} }, pairsResponse);
  assert.deepStrictEqual(pairsResponse.body, [{ key: '1:forward' }]);
  assert.deepStrictEqual(calls.find((item) => item[0] === 'pairs'), ['pairs', '/snapshots', { windowMs: 1234 }]);

  const badSeriesResponse = createResponse();
  await app.handlers.get('GET /api/chart-series')({ query: { quoteId: 'abc', direction: 'forward' } }, badSeriesResponse);
  assert.strictEqual(badSeriesResponse.statusCode, 400);
  assert.deepStrictEqual(badSeriesResponse.body, { error: '缺少合法的 quoteId 或 direction' });

  const missingSeriesResponse = createResponse();
  await app.handlers.get('GET /api/chart-series')({ query: { quoteId: '404', direction: 'forward' } }, missingSeriesResponse);
  assert.strictEqual(missingSeriesResponse.statusCode, 404);
  assert.deepStrictEqual(missingSeriesResponse.body, { error: '未找到图表数据' });
}

async function runReplayTextTest() {
  const replayResponse = createResponse();
  await app.handlers.get('GET /api/replay-arb-snapshot')({
    query: { at: '2026-03-01 00:00:12', format: 'text' }
  }, replayResponse);
  assert.strictEqual(replayResponse.contentType, 'text/plain; charset=utf-8');
  assert.strictEqual(replayResponse.body, 'replay:USDC');
}

Promise.resolve()
  .then(runConfigAndSaveTests)
  .then(runChartTests)
  .then(runReplayTextTest)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
