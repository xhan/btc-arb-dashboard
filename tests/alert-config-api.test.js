const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alert-config-api-'));
const alertConfigPath = path.join(tempDir, 'alert.json');
const legacyAlertConfigPath = path.join(tempDir, 'alert.config');
const configPath = path.join(tempDir, 'config.json');
const configMorePath = path.join(tempDir, 'config_more.json');
const port = 3458;
const webhookPort = 3459;
const telegramPort = 3460;
const webhookRequests = [];
const telegramRequests = [];

const webhookServer = http.createServer((req, res) => {
  webhookRequests.push(req.url);
  res.statusCode = 200;
  res.end('ok');
});

webhookServer.listen(webhookPort, '127.0.0.1');

const telegramServer = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    telegramRequests.push({
      url: req.url,
      method: req.method,
      headers: req.headers,
      body
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
  });
});

telegramServer.listen(telegramPort, '127.0.0.1');

fs.writeFileSync(configPath, JSON.stringify({ dashboard: [], settings: {} }, null, 2));
fs.writeFileSync(
  legacyAlertConfigPath,
  JSON.stringify(
    {
      version: 1,
      settings: {
        pathAlertEvalIntervalMs: 1500,
        defaultCooldownSec: 180
      },
      alerts: []
    },
    null,
    2
  )
);
fs.writeFileSync(
  configMorePath,
  JSON.stringify(
    {
      telegramBotToken: 'test-bot-token',
      telegramChatId: '1124758403'
    },
    null,
    2
  )
);

const serverProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    PORT: String(port),
    CONFIG_PATH: configPath,
    ALERT_CONFIG_PATH: alertConfigPath,
    LEGACY_ALERT_CONFIG_PATH: legacyAlertConfigPath,
    CONFIG_MORE_PATH: configMorePath,
    TELEGRAM_BOT_API_BASE_URL: `http://127.0.0.1:${telegramPort}`
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
    assert.strictEqual(defaultConfig.settings.pathAlertEvalIntervalMs, 1500);
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
        dayAppEnabled: true,
        telegramEnabled: true,
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

    assert.strictEqual(fs.existsSync(alertConfigPath), true);
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
    assert.strictEqual(telegramRequests.length, 1);
    assert.strictEqual(telegramRequests[0].method, 'POST');
    assert.strictEqual(telegramRequests[0].url, '/bottest-bot-token/sendMessage');
    const telegramPayload = JSON.parse(telegramRequests[0].body);
    assert.deepStrictEqual(telegramPayload, {
      chat_id: '1124758403',
      text: '收益 +2.50 bp\n\nETH WBTC -> tBTC | SUI TBTC -> WBTC'
    });

    const webhookResponseWithTelegramHtml = await request('POST', '/api/send-path-alert-webhook', JSON.stringify({
      title: 'ETH cbBTC/BTC.b  1 -> 1.000224',
      body: '总价已达到或超过目标 1.00017\nswap.defillama: https://swap.defillama.com/?chain=ethereum&from=0x1&tab=swap&to=0x2',
      telegramHtmlBody: '总价已达到或超过目标 1.00017\n<a href="https://swap.defillama.com/?chain=ethereum&amp;from=0x1&amp;tab=swap&amp;to=0x2">swap.defillama</a>'
    }));
    assert.strictEqual(webhookResponseWithTelegramHtml.statusCode, 200);
    assert.strictEqual(telegramRequests.length, 2);
    const telegramHtmlPayload = JSON.parse(telegramRequests[1].body);
    assert.deepStrictEqual(telegramHtmlPayload, {
      chat_id: '1124758403',
      text: 'ETH cbBTC/BTC.b  1 -> 1.000224\n\n总价已达到或超过目标 1.00017\n<a href="https://swap.defillama.com/?chain=ethereum&amp;from=0x1&amp;tab=swap&amp;to=0x2">swap.defillama</a>',
      parse_mode: 'HTML'
    });
  } finally {
    serverProcess.kill();
    webhookServer.close();
    telegramServer.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
