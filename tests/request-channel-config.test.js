const assert = require('assert');

const {
  normalizeRequestChannelsConfig,
  resolveRequestChannelContext,
  sanitizeRequestChannelsForClient
} = require('../src/request-channel/request-channel-config');

const defaultIntervals = {
  kyber: 170,
  zerox: 110,
  velora: 700,
  lifi: 170,
  bybit: 1000,
  binance: 1000,
  solana: 3500,
  sui: 500,
  starknet: 1000,
  llamaparaswap: 800
};

const defaultConfigMore = {
  providerSettings: {
    kyberClientId: 'default-client',
    lifiApiKey: 'default-lifi',
    lifiIntegrator: 'default-integrator',
    jupiterApiKey: 'default-jupiter',
    veloraPartner: '',
    veloraIncludeDEXS: [],
    veloraOtherExchangePrices: false,
    llamaParaSwapProxyUrl: 'http://127.0.0.1:18081',
    llamaParaSwapSlippage: '0.5'
  },
  kyberClientId: 'default-client',
  lifiApiKey: 'default-lifi',
  lifiIntegrator: 'default-integrator',
  jupiterApiKey: 'default-jupiter',
  veloraPartner: '',
  veloraIncludeDEXS: [],
  veloraOtherExchangePrices: false,
  llamaParaSwapProxyUrl: 'http://127.0.0.1:18081',
  llamaParaSwapSlippage: '0.5'
};

const config = normalizeRequestChannelsConfig(
  {
    channels: [
      {
        id: 'hk-1',
        name: 'HK-1',
        httpProxy: 'http://127.0.0.1:18001',
        intervals: {
          kyber: 90
        },
        providerSettings: {
          kyberClientId: 'hk-client',
          LIFIApiKey: 'hk-lifi',
          llamaParaSwapProxyUrl: 'http://127.0.0.1:18082'
        }
      }
    ]
  },
  defaultIntervals,
  defaultConfigMore
);

assert.strictEqual(config.channels[0].id, 'default');
assert.strictEqual(config.channels[1].id, 'hk-1');
assert.strictEqual(config.channels[1].intervals.kyber, 90);
assert.strictEqual(config.channels[1].intervals.zerox, 110);
assert.strictEqual(config.channels[1].configMore.kyberClientId, 'hk-client');
assert.strictEqual(config.channels[1].configMore.lifiApiKey, 'hk-lifi');
assert.strictEqual(config.channels[1].configMore.lifiIntegrator, 'default-integrator');
assert.strictEqual(config.channels[1].configMore.llamaParaSwapProxyUrl, 'http://127.0.0.1:18082');
assert.strictEqual(config.channels[1].configMore.providerSettings.llamaParaSwapProxyUrl, 'http://127.0.0.1:18082');

const kyberContext = resolveRequestChannelContext({
  requestChannelId: 'hk-1',
  sourceKey: 'kyber',
  requestChannelsConfig: config
});
assert.strictEqual(kyberContext.channelId, 'hk-1');
assert.strictEqual(kyberContext.httpProxy, 'http://127.0.0.1:18001');
assert.strictEqual(kyberContext.configMore.kyberClientId, 'hk-client');

const zeroxMissingContext = resolveRequestChannelContext({
  requestChannelId: 'missing',
  sourceKey: 'zerox',
  requestChannelsConfig: config
});
assert.strictEqual(zeroxMissingContext.channelId, 'default');
assert.strictEqual(zeroxMissingContext.configMore.kyberClientId, 'default-client');

const llamaParaSwapContext = resolveRequestChannelContext({
  requestChannelId: 'hk-1',
  sourceKey: 'llamaparaswap',
  requestChannelsConfig: config
});
assert.strictEqual(llamaParaSwapContext.channelId, 'hk-1');
assert.strictEqual(llamaParaSwapContext.configMore.llamaParaSwapProxyUrl, 'http://127.0.0.1:18082');

const suiContext = resolveRequestChannelContext({
  requestChannelId: 'hk-1',
  sourceKey: 'sui',
  requestChannelsConfig: config
});
assert.strictEqual(suiContext.channelId, 'default');

const clientPayload = sanitizeRequestChannelsForClient(config);
assert.deepStrictEqual(clientPayload.channels, [
  {
    id: 'default',
    name: '默认通道',
    isDefault: true,
    httpProxy: '',
    intervals: defaultIntervals
  },
  {
    id: 'hk-1',
    name: 'HK-1',
    isDefault: false,
    httpProxy: 'http://127.0.0.1:18001',
    intervals: {
      ...defaultIntervals,
      kyber: 90
    }
  }
]);
