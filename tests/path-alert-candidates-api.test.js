const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'path-alert-candidates-api-'));
const configPath = path.join(tempDir, 'config.json');
const alertConfigPath = path.join(tempDir, 'alert.config');
const metadataCachePath = path.join(tempDir, 'metadata-cache.json');
const port = 3460;

fs.writeFileSync(configPath, JSON.stringify({
  dashboard: [
    {
      id: 1,
      name: '测试监控',
      quotes: [
        {
          id: 101,
          chain: 'ethereum',
          amount: 1,
          fromToken: '0xaaa',
          toToken: '0xbbb',
          showInverse: true
        },
        {
          id: 102,
          chain: 'sui',
          amount: 1,
          fromToken: '0xcoin::tbtc::TBTC',
          toToken: '0xcoin::wbtc::WBTC',
          showInverse: true,
          paused: true
        },
        {
          id: 103,
          chain: 'Bybit',
          amount: 1,
          symbol: 'WBTCBTC'
        }
      ]
    }
  ],
  settings: {}
}, null, 2));

fs.writeFileSync(metadataCachePath, JSON.stringify({
  'ethereum-0xaaa': { symbol: 'GHO', decimals: 18 },
  'ethereum-0xbbb': { symbol: 'USDC', decimals: 6 },
  'sui-0xcoin::tbtc::TBTC': { symbol: 'TBTC', decimals: 8 },
  'sui-0xcoin::wbtc::WBTC': { symbol: 'WBTC', decimals: 8 }
}, null, 2));

const serverProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    PORT: String(port),
    CONFIG_PATH: configPath,
    ALERT_CONFIG_PATH: alertConfigPath,
    METADATA_CACHE_PATH: metadataCachePath
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
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error('server did not start');
}

(async () => {
  try {
    await waitForServer();
    const response = await request('/api/path-alert-quote-candidates');
    assert.strictEqual(response.statusCode, 200);
    const candidates = JSON.parse(response.body);
    assert.ok(Array.isArray(candidates));

    const ethForward = candidates.find((item) => item.key === '101:forward');
    assert.ok(ethForward);
    assert.strictEqual(ethForward.fromSymbol, 'GHO');
    assert.strictEqual(ethForward.toSymbol, 'USDC');
    assert.ok(ethForward.label.includes('(ETH) GHO -> USDC'));

    const pausedSui = candidates.find((item) => item.key.startsWith('102:'));
    assert.strictEqual(pausedSui, undefined);

    const bybitBid = candidates.find((item) => item.key === '103:cex-bid1');
    assert.ok(bybitBid);
    assert.strictEqual(bybitBid.fromSymbol, 'WBTC');
    assert.strictEqual(bybitBid.toSymbol, 'BTC');

    const bybitAsk = candidates.find((item) => item.key === '103:cex-ask1-inverse');
    assert.ok(bybitAsk);
    assert.strictEqual(bybitAsk.fromSymbol, 'BTC');
    assert.strictEqual(bybitAsk.toSymbol, 'WBTC');
  } finally {
    serverProcess.kill();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
