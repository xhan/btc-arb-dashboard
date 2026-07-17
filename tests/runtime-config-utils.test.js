const assert = require('assert');

const {
  buildDefaultConfigMore,
  buildDefaultRuntimeConfigData,
  createRuntimeConfigStore,
  getConfigSettings,
  loadStartupCetusAggregatorConfig,
  normalizeConfigMoreData,
  normalizeStringArray
} = require('../src/server/runtime-config-utils');

assert.deepStrictEqual(normalizeStringArray([' a ', '', 'b']), ['a', 'b']);
assert.deepStrictEqual(normalizeStringArray(' a, ,b '), ['a', 'b']);
assert.deepStrictEqual(normalizeStringArray(null), []);

const defaultConfigMore = buildDefaultConfigMore();
assert.strictEqual(defaultConfigMore.kyberClientId, 'xh-quote-dashboard');
assert.deepStrictEqual(defaultConfigMore.kyberExcludedSources, []);
assert.strictEqual(defaultConfigMore.lifiSlippage, '0.0001');
assert.strictEqual(defaultConfigMore.providerSettings.llamaParaSwapProxyUrl, 'http://127.0.0.1:18081');
assert.strictEqual(defaultConfigMore.llamaParaSwapProxyUrl, 'http://127.0.0.1:18081');
assert.strictEqual(defaultConfigMore.telegramBotApiBaseUrl, 'https://api.telegram.org');
assert.ok(Array.isArray(defaultConfigMore.arbCycleStartPriority));

assert.deepStrictEqual(buildDefaultRuntimeConfigData(), { dashboard: [], settings: {} });
assert.deepStrictEqual(getConfigSettings({ settings: { kyber: 200 } }), { kyber: 200 });
assert.deepStrictEqual(getConfigSettings([]), {});
assert.deepStrictEqual(getConfigSettings({}), {});

const normalizedConfigMore = normalizeConfigMoreData({
  providerSettings: {
    kyberClientId: ' custom-client ',
    kyberExcludedSources: [' fermi ', '', 'curve-stable-ng'],
    lifiApiKey: ' lifi-key ',
    lifiIntegrator: ' integrator ',
    lifiSlippage: '',
    jupiterApiKey: ' jup-key ',
    cetusAggregatorEndpoint: ' https://cetus.example ',
    cetusAggregatorApiKey: ' cetus-key ',
    veloraPartner: ' partner ',
    veloraIncludeDEXS: 'a, b,',
    veloraOtherExchangePrices: true,
    llamaParaSwapProxyUrl: ' http://127.0.0.1:18082 ',
    llamaParaSwapSlippage: ' 0.3 '
  },
  enablePriceSnapshot: true,
  priceSnapshotIntervalSec: '15',
  arbCycleStartPriority: [' USDC ', '', 'WBTC'],
  telegramBotToken: ' token ',
  telegramChatId: ' chat ',
  telegramBotApiBaseUrl: ' http://telegram.local '
});
assert.strictEqual(normalizedConfigMore.kyberClientId, 'custom-client');
assert.deepStrictEqual(normalizedConfigMore.kyberExcludedSources, ['fermi', 'curve-stable-ng']);
assert.deepStrictEqual(normalizedConfigMore.providerSettings.kyberExcludedSources, ['fermi', 'curve-stable-ng']);
assert.strictEqual(normalizedConfigMore.lifiApiKey, 'lifi-key');
assert.strictEqual(normalizedConfigMore.lifiIntegrator, 'integrator');
assert.strictEqual(normalizedConfigMore.lifiSlippage, '0.0001');
assert.strictEqual(normalizedConfigMore.jupiterApiKey, 'jup-key');
assert.strictEqual(normalizedConfigMore.cetusAggregatorEndpoint, 'https://cetus.example');
assert.strictEqual(normalizedConfigMore.cetusAggregatorApiKey, 'cetus-key');
assert.strictEqual(normalizedConfigMore.veloraPartner, 'partner');
assert.deepStrictEqual(normalizedConfigMore.veloraIncludeDEXS, ['a', 'b']);
assert.strictEqual(normalizedConfigMore.veloraOtherExchangePrices, true);
assert.strictEqual(normalizedConfigMore.llamaParaSwapProxyUrl, 'http://127.0.0.1:18082');
assert.strictEqual(normalizedConfigMore.llamaParaSwapSlippage, '0.3');
assert.strictEqual(normalizedConfigMore.providerSettings.llamaParaSwapProxyUrl, 'http://127.0.0.1:18082');
assert.strictEqual(normalizedConfigMore.enablePriceSnapshot, true);
assert.strictEqual(normalizedConfigMore.priceSnapshotIntervalSec, 15);
assert.deepStrictEqual(normalizedConfigMore.arbCycleStartPriority, ['USDC', 'WBTC']);
assert.strictEqual(normalizedConfigMore.telegramBotToken, 'token');
assert.strictEqual(normalizedConfigMore.telegramChatId, 'chat');
assert.strictEqual(normalizedConfigMore.telegramBotApiBaseUrl, 'http://telegram.local');

async function runStoreTest() {
  const reads = {
    '/config.json': { dashboard: [{ id: 1 }], settings: { kyber: 230 } },
    '/config_more.json': {
      providerSettings: {
        kyberClientId: ' runtime-client ',
        kyberExcludedSources: ['fermi', 'curve-stable-ng', 'dodo-gsp'],
        lifiSlippage: '0.002'
      }
    },
    '/request_channels.json': {
      channels: [
        {
          id: 'HK-1',
          name: '香港 1',
          sourceKeys: ['kyber'],
          intervals: { kyber: 321 },
          providerSettings: { kyberClientId: 'hk-client' }
        }
      ]
    }
  };
  const store = createRuntimeConfigStore({
    configPath: '/config.json',
    configMorePath: '/config_more.json',
    requestChannelsPath: '/request_channels.json',
    readJsonFile: async (filePath) => {
      if (!(filePath in reads)) {
        const error = new Error('missing');
        error.code = 'ENOENT';
        throw error;
      }
      return reads[filePath];
    },
    logger: { warn: () => {} }
  });

  const cache = await store.refreshRuntimeConfigCache();
  assert.strictEqual(cache.loaded, true);
  assert.deepStrictEqual(cache.configData.dashboard, [{ id: 1 }]);
  assert.strictEqual(cache.configMore.kyberClientId, 'runtime-client');
  assert.strictEqual(cache.configMore.lifiSlippage, '0.002');
  assert.strictEqual(cache.requestChannelsConfig.channels.length, 2);
  assert.strictEqual(cache.requestChannelsConfig.byId.get('HK-1').configMore.kyberClientId, 'hk-client');
  assert.deepStrictEqual(
    cache.requestChannelsConfig.byId.get('HK-1').configMore.kyberExcludedSources,
    ['fermi', 'curve-stable-ng', 'dodo-gsp']
  );
  assert.strictEqual((await store.getConfigMore()).kyberClientId, 'runtime-client');
  assert.strictEqual((await store.getRequestChannelsConfig()).defaultChannelId, 'default');
}

async function runFallbackTest() {
  const warnings = [];
  const store = createRuntimeConfigStore({
    configPath: '/missing-config.json',
    configMorePath: '/bad-config-more.json',
    requestChannelsPath: '/bad-request-channels.json',
    readJsonFile: async (filePath) => {
      if (filePath === '/bad-config-more.json') {
        throw new SyntaxError('bad json');
      }
      if (filePath === '/bad-request-channels.json') {
        throw new SyntaxError('bad json');
      }
      const error = new Error('missing');
      error.code = 'ENOENT';
      throw error;
    },
    logger: { warn: (message) => warnings.push(message) }
  });
  const cache = await store.refreshRuntimeConfigCache();
  assert.deepStrictEqual(cache.configData, { dashboard: [], settings: {} });
  assert.strictEqual(cache.configMore.kyberClientId, 'xh-quote-dashboard');
  assert.strictEqual(cache.requestChannelsConfig.channels.length, 1);
  assert.strictEqual(warnings.length, 1);
}

async function runStartupCetusConfigTest() {
  assert.deepStrictEqual(
    loadStartupCetusAggregatorConfig('/config_more.json', {
      readJsonFileSync: () => ({ cetusAggregatorEndpoint: ' https://cetus.example ', cetusAggregatorApiKey: ' key ' }),
      logger: { warn: () => {} }
    }),
    { endpoint: 'https://cetus.example', apiKey: 'key' }
  );

  const warnings = [];
  assert.strictEqual(
    loadStartupCetusAggregatorConfig('/missing.json', {
      readJsonFileSync: () => {
        const error = new Error('missing');
        error.code = 'ENOENT';
        throw error;
      },
      logger: { warn: (message) => warnings.push(message) }
    }).endpoint,
    defaultConfigMore.cetusAggregatorEndpoint
  );
  assert.deepStrictEqual(warnings, []);
}

Promise.resolve()
  .then(runStoreTest)
  .then(runFallbackTest)
  .then(runStartupCetusConfigTest)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
