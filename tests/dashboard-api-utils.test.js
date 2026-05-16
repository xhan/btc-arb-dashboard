const assert = require('assert');

const {
  createDashboardApiClient,
  normalizeDashboardConfigResponse,
  normalizePriceSnapshotConfigResponse
} = require('../src/dashboard/dashboard-api-utils');

assert.deepStrictEqual(normalizePriceSnapshotConfigResponse({ enabled: true, intervalSec: '15' }), {
  enabled: true,
  intervalSec: 15
});
assert.deepStrictEqual(normalizePriceSnapshotConfigResponse({ enabled: true, intervalSec: '-1' }), {
  enabled: true,
  intervalSec: 10
});
assert.deepStrictEqual(
  normalizeDashboardConfigResponse(
    { dashboard: [{ id: 1 }], settings: { kyber: 200, solana: 1200 } },
    { kyber: 170, solana: 3500 }
  ),
  {
    dashboardState: [{ id: 1 }],
    apiIntervals: { kyber: 200, solana: 3500 },
    migratedSolanaInterval: true
  }
);
assert.deepStrictEqual(
  normalizeDashboardConfigResponse([{ id: 1 }], { kyber: 170 }),
  {
    dashboardState: [{ id: 1 }],
    apiIntervals: { kyber: 170 },
    migratedSolanaInterval: false
  }
);

function createResponse(ok, payload) {
  return {
    ok,
    async json() {
      return payload;
    }
  };
}

async function runClientTest() {
  const requests = [];
  const warnings = [];
  const client = createDashboardApiClient({
    backendUrl: 'http://backend.test',
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });
      if (url.endsWith('/api/get-price-snapshot-config')) {
        return createResponse(true, { enabled: true, intervalSec: '20' });
      }
      if (url.endsWith('/api/get-arb-settings')) {
        return createResponse(true, { cycleStartPriority: [' WBTC ', '', 'USDC'] });
      }
      if (url.endsWith('/api/get-request-channels')) {
        return createResponse(true, { channels: [{ id: 'default' }] });
      }
      if (url.endsWith('/api/get-config')) {
        return createResponse(true, { dashboard: [{ id: 2 }], settings: { kyber: 210 } });
      }
      return createResponse(true, { ok: true });
    },
    logger: {
      warn: (...args) => warnings.push(args)
    }
  });

  await client.saveDashboardConfig({ dashboard: [], settings: { kyber: 200 } });
  await client.requestBackendConfigRefresh();
  assert.deepStrictEqual(await client.loadPriceSnapshotConfig(), { enabled: true, intervalSec: 20 });
  assert.deepStrictEqual(
    await client.loadArbSettings({
      normalizePriority: (value) => value.map((item) => item.trim()).filter(Boolean),
      defaultPriority: ['cbBTC']
    }),
    ['WBTC', 'USDC']
  );
  assert.deepStrictEqual(await client.loadRequestChannels(), { channels: [{ id: 'default' }] });
  assert.deepStrictEqual(await client.loadDashboardConfig({ kyber: 170 }), {
    dashboardState: [{ id: 2 }],
    apiIntervals: { kyber: 210 },
    migratedSolanaInterval: false
  });
  await client.savePriceSnapshot({ quotes: [{ quoteId: 1 }] });

  assert.deepStrictEqual(
    requests.map((item) => [item.url, item.options.method || 'GET']),
    [
      ['http://backend.test/api/save-config', 'POST'],
      ['http://backend.test/api/request-update-config', 'POST'],
      ['http://backend.test/api/get-price-snapshot-config', 'GET'],
      ['http://backend.test/api/get-arb-settings', 'GET'],
      ['http://backend.test/api/get-request-channels', 'GET'],
      ['http://backend.test/api/get-config', 'GET'],
      ['http://backend.test/api/save-price-snapshot', 'POST']
    ]
  );
  assert.deepStrictEqual(JSON.parse(requests[0].options.body), { dashboard: [], settings: { kyber: 200 } });
  assert.deepStrictEqual(JSON.parse(requests[1].options.body), {});
  assert.deepStrictEqual(JSON.parse(requests[6].options.body), { quotes: [{ quoteId: 1 }] });
  assert.deepStrictEqual(warnings, []);
}

async function runFallbackTest() {
  const warnings = [];
  const client = createDashboardApiClient({
    backendUrl: 'http://backend.test/',
    fetchImpl: async (url) => {
      if (url.endsWith('/api/get-config')) {
        return createResponse(false, {});
      }
      throw new Error('network failed');
    },
    logger: {
      warn: (...args) => warnings.push(args)
    }
  });

  assert.deepStrictEqual(await client.loadPriceSnapshotConfig(), { enabled: false, intervalSec: 10 });
  assert.deepStrictEqual(
    await client.loadArbSettings({
      normalizePriority: (value) => value,
      defaultPriority: ['cbBTC']
    }),
    ['cbBTC']
  );
  assert.deepStrictEqual(await client.loadRequestChannels(), { channels: [] });
  assert.deepStrictEqual(await client.loadDashboardConfig({ kyber: 170 }), {
    dashboardState: [],
    apiIntervals: { kyber: 170 },
    migratedSolanaInterval: false
  });
  assert.strictEqual(await client.requestBackendConfigRefresh(), false);
  assert.strictEqual(warnings.length, 5);
}

Promise.resolve()
  .then(runClientTest)
  .then(runFallbackTest)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
