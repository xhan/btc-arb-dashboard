const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.ok(/velora:\s*\[\]/.test(appJs), 'queues 应包含 velora');
assert.ok(/velora:\s*0/.test(appJs), 'indices 应包含 velora');
assert.ok(/velora:\s*null/.test(appJs), 'timers 应包含 velora');
assert.ok(/velora:\s*200/.test(appJs), 'DEFAULT_INTERVALS 应包含 velora 默认 200ms');
assert.ok(
  /quote\.preferredSource === 'Velora'[\s\S]*type = 'velora';/.test(appJs),
  'Velora 应映射到独立队列'
);
assert.ok(
  appJs.includes("document.getElementById('setting-velora-interval').value = apiIntervals.velora;"),
  '设置弹窗应回填 Velora 间隔'
);
assert.ok(
  appJs.includes("velora: parseInt(document.getElementById('setting-velora-interval').value) || DEFAULT_INTERVALS.velora"),
  '保存设置时应包含 Velora 间隔'
);
assert.ok(indexHtml.includes('id="setting-velora-interval"'), '设置面板应包含 Velora 输入框');
assert.ok(indexHtml.includes('Velora (默认 200ms)'), '设置面板应展示 Velora 默认值');
