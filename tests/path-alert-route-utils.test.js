const assert = require('assert');

const {
  loadAlertConfig,
  registerPathAlertRoutes
} = require('../src/server/path-alert-route-utils');

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

async function runLoadAlertConfigFallbackTest() {
  const config = await loadAlertConfig({
    alertConfigPath: '/missing-alert.json',
    readJsonFile: async () => {
      const error = new Error('missing');
      error.code = 'ENOENT';
      throw error;
    }
  });
  assert.strictEqual(config.version, 1);
  assert.strictEqual(config.settings.webhookEnabled, false);
  assert.deepStrictEqual(config.alerts, []);
  assert.deepStrictEqual(config.dismissedTargets, []);
}

async function runRoutesTest() {
  const app = createFakeApp();
  const calls = [];
  let alertConfigRead = {
    version: 1,
    settings: { webhookEnabled: true, telegramEnabled: true },
    alerts: [
      {
        id: 'a1',
        name: 'alert',
        enabled: true,
        thresholdBp: 1,
        target: {
          type: 'rule',
          ruleKind: 'fixed',
          ruleId: 'fixed:gho-usdc'
        }
      }
    ]
  };

  registerPathAlertRoutes({
    app,
    alertConfigPath: '/alert.json',
    configPath: '/config.json',
    readJsonFile: async (filePath) => {
      calls.push(['read', filePath]);
      if (filePath === '/alert.json') {
        return alertConfigRead;
      }
      return { dashboard: [] };
    },
    safeWriteJsonFile: async (filePath, payload) => calls.push(['write', filePath, payload]),
    getConfigMore: async () => ({ telegramBotToken: 'token' }),
    marketClients: { marker: true },
    fetchImpl: async () => ({ ok: true }),
    telegramBotApiBaseUrlOverride: 'http://telegram.local',
    buildPathAlertQuoteCandidatesFromConfig: async (options) => {
      calls.push(['candidates', options.configPath, options.marketClients.marker]);
      return [{ key: '1:forward' }];
    },
    sendPathAlertRemoteWebhooks: async (payload, deps) => {
      calls.push(['webhook', payload.title, payload.body, payload.alertConfig.settings.webhookEnabled, deps.telegramBotApiBaseUrlOverride]);
      return { statusCode: 400, payload: { error: '路径报警远程推送未配置' } };
    },
    logger: {
      error: (...args) => calls.push(['error', ...args])
    }
  });

  const saveResponse = createResponse();
  await app.handlers.get('POST /api/save-alert-config')({
    body: {
      settings: { webhookEnabled: true },
      alerts: [
        {
          id: 'a1',
          name: 'A1',
          enabled: true,
          target: {
            type: 'rule',
            ruleKind: 'fixed',
            ruleId: 'fixed:gho-usdc'
          }
        }
      ]
    }
  }, saveResponse);
  assert.deepStrictEqual(saveResponse.body, { message: '路径报警配置保存成功' });
  assert.strictEqual(calls.find((item) => item[0] === 'write')[1], '/alert.json');

  const configResponse = createResponse();
  await app.handlers.get('GET /api/get-alert-config')({ query: {} }, configResponse);
  assert.strictEqual(configResponse.body.settings.webhookEnabled, true);
  assert.strictEqual(configResponse.body.alerts.length, 1);

  const candidatesResponse = createResponse();
  await app.handlers.get('GET /api/path-alert-quote-candidates')({ query: {} }, candidatesResponse);
  assert.deepStrictEqual(candidatesResponse.body, [{ key: '1:forward' }]);
  assert.ok(calls.some((item) => item[0] === 'candidates' && item[1] === '/config.json' && item[2] === true));

  const webhookResponse = createResponse();
  await app.handlers.get('POST /api/send-path-alert-webhook')({
    body: {
      title: '收益 +2bp',
      body: 'path body',
      telegramHtmlBody: '<b>path</b>'
    }
  }, webhookResponse);
  assert.strictEqual(webhookResponse.statusCode, 400);
  assert.deepStrictEqual(webhookResponse.body, { error: '路径报警远程推送未配置' });
  assert.ok(calls.some((item) => item[0] === 'webhook' && item[1] === '收益 +2bp' && item[4] === 'http://telegram.local'));
}

Promise.resolve()
  .then(runLoadAlertConfigFallbackTest)
  .then(runRoutesTest)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
