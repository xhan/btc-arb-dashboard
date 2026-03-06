const assert = require('assert');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const port = 3456;
const serverProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT: String(port) },
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

async function waitForServer(attempts = 12) {
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
    const response = await request('/index.html');
    assert.strictEqual(response.statusCode, 200);
    assert.ok(response.body.includes('聚合报价看板'));
    assert.ok(response.body.includes('href="/snapshot?mode=nearest"'));
    assert.ok(response.body.includes('href="/charts"'));
    assert.ok(response.body.includes('target="_blank"'));
    assert.ok(response.body.includes('width: min(720px, 92vw);'));
    assert.ok(response.body.includes('src="charts-utils.js"'));

    const appJsResponse = await request('/app.js');
    assert.strictEqual(appJsResponse.statusCode, 200);
    assert.ok(appJsResponse.body.includes('inputmode="decimal"'));
    assert.ok(appJsResponse.body.includes('data-arb-detail-token-address'));
    assert.ok(appJsResponse.body.includes("addEventListener('pointerdown', handleArbPathContentPointerDown)"));
    assert.ok(appJsResponse.body.includes("closest('.arb-opportunity-chart-link')"));

    const snapshotResponse = await request('/snapshot');
    assert.strictEqual(snapshotResponse.statusCode, 200);
    assert.ok(snapshotResponse.body.includes('快照回放'));
    assert.ok(snapshotResponse.body.includes('查看快照 JSON'));
    assert.ok(snapshotResponse.body.includes('查看回放 JSON'));
    assert.ok(snapshotResponse.body.includes('grid-template-columns: minmax(220px, 0.55fr) minmax(480px, 1.45fr);'));

    const chartsResponse = await request('/charts');
    assert.strictEqual(chartsResponse.statusCode, 200);
    assert.ok(chartsResponse.body.includes('id="chart-search-input"'));
    assert.ok(chartsResponse.body.includes('id="chart-refresh-btn"'));
    assert.ok(chartsResponse.body.includes('id="chart-panels"'));
    assert.ok(chartsResponse.body.includes('src="charts-app.js"'));
    assert.ok(chartsResponse.body.includes('grid-template-columns: minmax(0, 1fr) 112px 112px;'));
    assert.ok(!chartsResponse.body.includes('<section class="hero">'));
    assert.ok(!chartsResponse.body.includes('读取最近两小时的历史快照'));
    assert.ok(!chartsResponse.body.includes('当前页只负责图表查看'));
  } finally {
    serverProcess.kill();
  }
})().catch((error) => {
  serverProcess.kill();
  throw error;
});
