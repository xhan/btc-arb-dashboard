const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alert-config-api-'));
const alertConfigPath = path.join(tempDir, 'alert.config');
const configPath = path.join(tempDir, 'config.json');
const port = 3458;
const webhookPort = 3459;
const webhookRequests = [];

const webhookServer = http.createServer((req, res) => {
  webhookRequests.push(req.url);
  res.statusCode = 200;
  res.end('ok');
});

webhookServer.listen(webhookPort, '127.0.0.1');

fs.writeFileSync(configPath, JSON.stringify({ dashboard: [], settings: {} }, null, 2));

const serverProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    PORT: String(port),
    CONFIG_PATH: configPath,
    ALERT_CONFIG_PATH: alertConfigPath
  },
  stdio: 'ignore'
});

function request(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: pathname,
        method,
        headers: body
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body)
            }
          : undefined
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function waitForServer(attempts = 15) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await request('GET', '/api/get-alert-config');
      return;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error('server did not start');
}

(async () => {
  try {
    await waitForServer();

    const defaultResponse = await request('GET', '/api/get-alert-config');
    assert.strictEqual(defaultResponse.statusCode, 200);
    const defaultConfig = JSON.parse(defaultResponse.body);
    assert.strictEqual(defaultConfig.version, 1);
    assert.strictEqual(defaultConfig.settings.pathAlertEvalIntervalMs, 1000);
    assert.strictEqual(defaultConfig.settings.localSoundEnabled, true);
    assert.strictEqual(defaultConfig.settings.webhookEnabled, false);
    assert.deepStrictEqual(defaultConfig.alerts, []);

    const payload = {
      version: 1,
      settings: {
        pathAlertEvalIntervalMs: 2500,
        defaultCooldownSec: 180,
        localSoundEnabled: true,
        webhookEnabled: true,
        webhookUrl: `http://127.0.0.1:${webhookPort}/notify/[title]/[body]?sound=ladder`,
        webhookSecret: ''
      },
      alerts: [
        {
          id: 'fixed-gho',
          name: 'GHO <-> USDC',
          enabled: true,
          thresholdBp: 2,
          triggerMode: 'immediate',
          confirmDelaySec: 0,
          cooldownSec: 180,
          target: {
            type: 'rule',
            ruleKind: 'fixed',
            ruleId: 'fixed:gho-usdc'
          }
        }
      ]
    };

    const saveResponse = await request('POST', '/api/save-alert-config', JSON.stringify(payload));
    assert.strictEqual(saveResponse.statusCode, 200);

    const savedText = fs.readFileSync(alertConfigPath, 'utf-8');
    const savedJson = JSON.parse(savedText);
    assert.strictEqual(savedJson.settings.pathAlertEvalIntervalMs, 2500);
    assert.strictEqual(savedJson.settings.localSoundEnabled, true);
    assert.strictEqual(savedJson.settings.webhookEnabled, true);
    assert.strictEqual(savedJson.alerts[0].target.ruleId, 'fixed:gho-usdc');

    const readBackResponse = await request('GET', '/api/get-alert-config');
    assert.strictEqual(readBackResponse.statusCode, 200);
    const readBack = JSON.parse(readBackResponse.body);
    assert.strictEqual(readBack.settings.defaultCooldownSec, 180);
    assert.strictEqual(readBack.alerts.length, 1);

    const webhookResponse = await request('POST', '/api/send-path-alert-webhook', JSON.stringify({
      title: '收益 +2.50 bp',
      body: 'ETH WBTC -> tBTC | SUI TBTC -> WBTC'
    }));
    assert.strictEqual(webhookResponse.statusCode, 200);
    assert.strictEqual(
      webhookRequests[0],
      '/notify/%E6%94%B6%E7%9B%8A%20%2B2.50%20bp/ETH%20WBTC%20-%3E%20tBTC%20%7C%20SUI%20TBTC%20-%3E%20WBTC?sound=ladder'
    );
  } finally {
    serverProcess.kill();
    webhookServer.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
