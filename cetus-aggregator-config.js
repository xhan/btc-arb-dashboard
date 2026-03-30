const DEFAULT_CETUS_AGGREGATOR_ENDPOINT = 'https://api-sui.cetus.zone/router_v3/find_routes';

function normalizeCetusAggregatorConfig(configMore = {}) {
  const rawEndpoint = typeof configMore.cetusAggregatorEndpoint === 'string'
    ? configMore.cetusAggregatorEndpoint.trim()
    : '';
  const rawApiKey = typeof configMore.cetusAggregatorApiKey === 'string'
    ? configMore.cetusAggregatorApiKey.trim()
    : '';

  return {
    endpoint: rawEndpoint || DEFAULT_CETUS_AGGREGATOR_ENDPOINT,
    apiKey: rawApiKey
  };
}

function createCetusAggregatorClient(configMore = {}, AggregatorClientClass) {
  return new AggregatorClientClass(normalizeCetusAggregatorConfig(configMore));
}

module.exports = {
  DEFAULT_CETUS_AGGREGATOR_ENDPOINT,
  createCetusAggregatorClient,
  normalizeCetusAggregatorConfig
};
