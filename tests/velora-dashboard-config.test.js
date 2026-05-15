const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const { DEFAULT_INTERVALS } = require('../queue-stats-utils');
const { getQueueSourceKeyForQuote } = require('../request-channel-utils');

assert.strictEqual(DEFAULT_INTERVALS.velora, 700, 'DEFAULT_INTERVALS 应包含 velora 默认 700ms');
assert.ok(appJs.includes('getQueueStatsUtils().getQueueTypeForQuote(quote, requestChannelOptions, { multiChannelEnabled })'), '报价应通过共享请求通道工具决定队列');
assert.strictEqual(
  getQueueSourceKeyForQuote({ chain: 'ethereum', preferredSource: 'Velora' }),
  'velora',
  'Velora 仍应映射到独立 source 队列'
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
assert.ok(indexHtml.includes('Velora (默认 700ms)'), '设置面板应展示 Velora 默认值');
