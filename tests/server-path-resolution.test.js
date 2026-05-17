const assert = require('assert');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const port = 3457;
const serverProcess = spawn('node', [path.join(projectRoot, 'server.js')], {
  cwd: path.join(projectRoot, '..'),
  env: { ...process.env, PORT: String(port) },
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
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function waitForServer(attempts = 12) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await request('GET', '/api/get-config');
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

    const configResponse = await request('GET', '/api/get-config');
    assert.strictEqual(configResponse.statusCode, 200);
    const config = JSON.parse(configResponse.body);
    assert.ok(Array.isArray(config.dashboard), '应读取到 config/config.js');
    assert.ok(config.dashboard.length > 0, 'dashboard 不应为空');
  } finally {
    serverProcess.kill();
  }
})().catch((error) => {
  serverProcess.kill();
  throw error;
});
