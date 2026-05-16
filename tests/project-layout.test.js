const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const serverJs = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');

assert.ok(fs.existsSync(path.join(projectRoot, 'src', 'market-clients', 'index.js')));
assert.ok(fs.existsSync(path.join(projectRoot, 'docs', 'user', '使用说明.txt')));
assert.ok(fs.existsSync(path.join(projectRoot, 'docs', 'user', '补充说明.md')));
assert.ok(!fs.existsSync(path.join(projectRoot, 'market-clients')));
assert.ok(!fs.existsSync(path.join(projectRoot, 'shared')));
assert.ok(!fs.existsSync(path.join(projectRoot, '使用说明.txt')));
assert.ok(!fs.existsSync(path.join(projectRoot, '补充说明.md')));
assert.ok(serverJs.includes("require('./src/market-clients')"));
assert.ok(!serverJs.includes("require('./market-clients')"));
