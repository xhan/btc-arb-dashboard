const assert = require('assert');

const { registerConfigRoutes } = require('../src/server/config-route-utils');

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

const calls = [];
let configRead = { dashboard: [{ id: 1 }], settings: { kyber: 170 } };
let metadataCache = {};
let requestChannelsConfig = {
  channels: [
    {
      id: 'default',
      name: '默认通道',
      isDefault: true,
      httpProxy: '',
      intervals: { kyber: 170 },
      configMore: { secret: 'hidden' }
    }
  ]
};
let configMore = { arbCycleStartPriority: [' USDC ', '', 'WBTC'] };

const app = createFakeApp();
registerConfigRoutes({
  app,
  configPath: '/config.json',
  readJsonFile: async () => {
    if (configRead instanceof Error) {
      throw configRead;
    }
    return configRead;
  },
  safeWriteConfig: async (payload) => calls.push(['save', payload]),
  refreshRuntimeConfigCache: async () => {
    calls.push(['refresh']);
    return { requestChannelsConfig };
  },
  getRequestChannelsConfig: async () => requestChannelsConfig,
  getConfigMore: async () => configMore,
  marketClients: {
    loadTokenMetaCache: async () => metadataCache
  },
  logger: {
    error: (...args) => calls.push(['error', ...args])
  }
});

async function runSaveAndRefreshTests() {
  const saveResponse = createResponse();
  await app.handlers.get('POST /api/save-config')({ body: { dashboard: [] } }, saveResponse);
  assert.deepStrictEqual(calls.slice(0, 2), [['save', { dashboard: [] }], ['refresh']]);
  assert.deepStrictEqual(saveResponse.body, { message: '配置保存成功' });

  const refreshResponse = createResponse();
  await app.handlers.get('POST /api/request-update-config')({ body: {} }, refreshResponse);
  assert.deepStrictEqual(refreshResponse.body, {
    message: '运行时配置已刷新',
    requestChannelCount: 1
  });
}

async function runReadConfigTests() {
  configRead = {
    dashboard: [{
      id: 1,
      quotes: [{
        id: 101,
        chain: 'ethereum',
        fromToken: '0xaaa',
        toToken: '0xbbb',
        paused: true
      }]
    }],
    settings: { kyber: 170 }
  };
  metadataCache = {
    'ethereum-0xaaa': { symbol: 'GHO' },
    'ethereum-0xbbb': { symbol: 'USDC' }
  };
  const configResponse = createResponse();
  await app.handlers.get('GET /api/get-config')({ query: {} }, configResponse);
  assert.deepStrictEqual(configResponse.body, {
    ...configRead,
    quoteMarketStateById: {
      101: { fromSymbol: 'GHO', toSymbol: 'USDC' }
    }
  });
  assert.strictEqual(configRead.quoteMarketStateById, undefined);

  configRead = new SyntaxError('bad json');
  const badJsonResponse = createResponse();
  await app.handlers.get('GET /api/get-config')({ query: {} }, badJsonResponse);
  assert.deepStrictEqual(badJsonResponse.body, []);

  configRead = new Error('missing');
  configRead.code = 'ENOENT';
  const missingResponse = createResponse();
  await app.handlers.get('GET /api/get-config')({ query: {} }, missingResponse);
  assert.deepStrictEqual(missingResponse.body, []);

  configRead = new Error('disk failed');
  const failedResponse = createResponse();
  await app.handlers.get('GET /api/get-config')({ query: {} }, failedResponse);
  assert.strictEqual(failedResponse.statusCode, 500);
  assert.deepStrictEqual(failedResponse.body, { error: 'disk failed' });
}

async function runRequestChannelsAndArbSettingsTests() {
  const channelsResponse = createResponse();
  await app.handlers.get('GET /api/get-request-channels')({ query: {} }, channelsResponse);
  assert.deepStrictEqual(channelsResponse.body.channels, [
    {
      id: 'default',
      name: '默认通道',
      isDefault: true,
      httpProxy: '',
      intervals: { kyber: 170 }
    }
  ]);

  const arbResponse = createResponse();
  await app.handlers.get('GET /api/get-arb-settings')({ query: {} }, arbResponse);
  assert.deepStrictEqual(arbResponse.body, { cycleStartPriority: ['USDC', 'WBTC'] });
}

Promise.resolve()
  .then(runSaveAndRefreshTests)
  .then(runReadConfigTests)
  .then(runRequestChannelsAndArbSettingsTests)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
