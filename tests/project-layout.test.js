const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const serverJs = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
const serverAppJs = fs.readFileSync(path.join(projectRoot, 'src', 'server', 'server-app.js'), 'utf8');

assert.ok(fs.existsSync(path.join(projectRoot, 'src', 'market-clients', 'index.js')));
assert.ok(fs.existsSync(path.join(projectRoot, 'src', 'server', 'server-app.js')));
assert.ok(fs.existsSync(path.join(projectRoot, 'docs', 'user', '使用说明.txt')));
assert.ok(fs.existsSync(path.join(projectRoot, 'docs', 'user', '补充说明.md')));
assert.ok(!fs.existsSync(path.join(projectRoot, 'market-clients')));
assert.ok(!fs.existsSync(path.join(projectRoot, 'shared')));
assert.ok(!fs.existsSync(path.join(projectRoot, '使用说明.txt')));
assert.ok(!fs.existsSync(path.join(projectRoot, '补充说明.md')));
assert.ok(serverJs.includes("require('./src/server/server-app')"));
assert.ok(serverJs.split('\n').length <= 12);
assert.ok(!serverJs.includes("require('./src/market-clients')"));
assert.ok(serverAppJs.includes("require('../market-clients')"));
assert.ok(!serverJs.includes("require('./market-clients')"));
assert.ok(serverAppJs.includes("resolveProjectFilePath(path.join('db', 'metadata-cache.json'), 'METADATA_CACHE_PATH'"));
assert.ok(!serverAppJs.includes("resolveProjectFilePath('metadata-cache.json', 'METADATA_CACHE_PATH'"));
assert.ok(serverAppJs.includes('createDashboardServer,'));
assert.ok(serverAppJs.includes('startDashboardServer'));
