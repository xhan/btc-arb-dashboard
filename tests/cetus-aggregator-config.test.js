const assert = require('assert');

const {
  DEFAULT_CETUS_AGGREGATOR_ENDPOINT,
  createCetusAggregatorClient,
  normalizeCetusAggregatorConfig
} = require('../cetus-aggregator-config');

(() => {
  assert.deepStrictEqual(
    normalizeCetusAggregatorConfig(),
    {
      endpoint: DEFAULT_CETUS_AGGREGATOR_ENDPOINT,
      apiKey: ''
    }
  );

  assert.deepStrictEqual(
    normalizeCetusAggregatorConfig({
      cetusAggregatorEndpoint: ' https://quote.example.com/router_v3/find_routes ',
      cetusAggregatorApiKey: ' secret-key '
    }),
    {
      endpoint: 'https://quote.example.com/router_v3/find_routes',
      apiKey: 'secret-key'
    }
  );

  let receivedConfig = null;

  class FakeAggregatorClient {
    constructor(config) {
      receivedConfig = config;
      this.config = config;
    }
  }

  const client = createCetusAggregatorClient({
    cetusAggregatorEndpoint: 'https://quote.example.com/router_v3/find_routes',
    cetusAggregatorApiKey: 'secret-key'
  }, FakeAggregatorClient);

  assert.deepStrictEqual(receivedConfig, {
    endpoint: 'https://quote.example.com/router_v3/find_routes',
    apiKey: 'secret-key'
  });
  assert.deepStrictEqual(client.config, receivedConfig);
})();
