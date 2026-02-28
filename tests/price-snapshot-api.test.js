const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const { appendPriceSnapshot } = require('../price-snapshot-store');

const port = 3457;

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
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'price-snapshot-api-'));
  await appendPriceSnapshot(tempDir, {
    quotes: [
      {
        quoteId: 1,
        chain: 'ethereum',
        pair: 'WBTC/WETH',
        size: 1,
        fromSymbol: 'WBTC',
        toSymbol: 'WETH',
        price: 16,
        inversePrice: 0.0625
      },
      {
        quoteId: 2,
        chain: 'arbitrum',
        pair: 'WETH/WBTC',
        size: 1,
        fromSymbol: 'WETH',
        toSymbol: 'WBTC',
        price: 0.064,
        inversePrice: 15.625
      }
    ]
  }, new Date('2026-02-28T16:00:10.000Z'));

  const serverProcess = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      PRICE_SNAPSHOT_DIR: tempDir
    },
    stdio: 'ignore'
  });

  try {
    await waitForServer();

    const snapshotResponse = await request('/api/get-price-snapshot?at=2026-03-01%2000:00:12&mode=nearest');
    assert.strictEqual(snapshotResponse.statusCode, 200);
    const snapshotBody = JSON.parse(snapshotResponse.body);
    assert.strictEqual(snapshotBody.matchType, 'floor');
    assert.strictEqual(snapshotBody.requestedAtLocal, '2026-03-01 00:00:12 +08:00');
    assert.strictEqual(snapshotBody.snapshot.capturedAtLocal, '2026-03-01 00:00:10 +08:00');

    const replayTextResponse = await request('/api/replay-arb-snapshot?at=2026-03-01%2000:00:12&format=text');
    assert.strictEqual(replayTextResponse.statusCode, 200);
    assert.ok(replayTextResponse.body.includes('请求时间: 2026-03-01 00:00:12 +08:00'));
    assert.ok(replayTextResponse.body.includes('命中快照: 2026-03-01 00:00:10 +08:00'));

    const replayJsonResponse = await request('/api/replay-arb-snapshot?at=2026-03-01%2000:00:12&format=json');
    assert.strictEqual(replayJsonResponse.statusCode, 200);
    const replayJson = JSON.parse(replayJsonResponse.body);
    assert.strictEqual(replayJson.requestedAtLocal, '2026-03-01 00:00:12 +08:00');
    assert.strictEqual(replayJson.snapshot.capturedAtLocal, '2026-03-01 00:00:10 +08:00');
  } finally {
    serverProcess.kill();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
