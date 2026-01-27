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
  } finally {
    serverProcess.kill();
  }
})().catch((error) => {
  serverProcess.kill();
  throw error;
});
