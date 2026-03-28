const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'request-channels-api-'));
const configPath = path.join(tempDir, 'config.json');
const configMorePath = path.join(tempDir, 'config_more.json');
const requestChannelsPath = path.join(tempDir, 'request_channels.json');
const port = 3461;

fs.writeFileSync(configPath, JSON.stringify({ dashboard: [], settings: { kyber: 170, zerox: 110, solana: 3500, sui: 500, starknet: 1000, bybit: 1000, binance: 1000, velora: 700, lifi: 170 } }, null, 2));
fs.writeFileSync(configMorePath, JSON.stringify({ kyberClientId: 'default-client', jupiterApiKey: 'default-jupiter' }, null, 2));
fs.writeFileSync(
  requestChannelsPath,
  JSON.stringify({
    channels: [
      {
        id: 'hk-1',
        name: 'HK-1',
        httpProxy: 'http://127.0.0.1:18001',
        intervals: {
          kyber: 90
        },
        configMore: {
          kyberClientId: 'hk-client'
        }
      }
    ]
  }, null, 2)
);

const serverProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    PORT: String(port),
    CONFIG_PATH: configPath,
    CONFIG_MORE_PATH: configMorePath,
    REQUEST_CHANNELS_PATH: requestChannelsPath
  },
  stdio: 'ignore'
});

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: pathname }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
}

async function waitForServer(attempts = 15) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await request('/api/get-config');
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

    const response = await request('/api/get-request-channels');
    assert.strictEqual(response.statusCode, 200);
    const payload = JSON.parse(response.body);

    assert.deepStrictEqual(payload.channels, [
      {
        id: 'default',
        name: '默认通道',
        isDefault: true,
        httpProxy: '',
        intervals: {
          kyber: 170,
          zerox: 110,
          velora: 700,
          lifi: 170,
          bybit: 1000,
          binance: 1000,
          solana: 3500,
          sui: 500,
          starknet: 1000
        }
      },
      {
        id: 'hk-1',
        name: 'HK-1',
        isDefault: false,
        httpProxy: 'http://127.0.0.1:18001',
        intervals: {
          kyber: 90,
          zerox: 110,
          velora: 700,
          lifi: 170,
          bybit: 1000,
          binance: 1000,
          solana: 3500,
          sui: 500,
          starknet: 1000
        }
      }
    ]);
  } finally {
    serverProcess.kill();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
