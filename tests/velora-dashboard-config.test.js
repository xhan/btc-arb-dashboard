const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const {
  buildSettingsIntervalWritePlan,
  buildSettingsIntervalsFromFormValues
} = require('../dashboard-renderer');
const { DEFAULT_INTERVALS, getQueueTypeForQuote } = require('../queue-stats-utils');

assert.strictEqual(DEFAULT_INTERVALS.velora, 700, 'DEFAULT_INTERVALS 应包含 velora 默认 700ms');
assert.ok(appJs.includes('getQueueStatsUtils().getQueueTypeForQuote(quote, requestChannelOptions, { multiChannelEnabled })'), '报价应通过共享请求通道工具决定队列');
assert.strictEqual(
  getQueueTypeForQuote({ chain: 'ethereum', preferredSource: 'Velora' }),
  'velora',
  'Velora 仍应映射到独立 source 队列'
);
assert.ok(
  appJs.includes('getDashboardRenderer().buildSettingsIntervalWritePlan(apiIntervals)'),
  '设置弹窗应通过 dashboard renderer 回填间隔'
);
assert.ok(
  appJs.includes('getDashboardRenderer().buildSettingsIntervalsFromFormValues('),
  '保存设置时应通过 dashboard renderer 构造间隔配置'
);
assert.ok(
  buildSettingsIntervalWritePlan({ velora: DEFAULT_INTERVALS.velora }).some((item) => (
    item.key === 'velora'
    && item.id === 'setting-velora-interval'
    && item.value === DEFAULT_INTERVALS.velora
  )),
  'settings interval write plan 应包含 Velora 间隔'
);
assert.strictEqual(
  buildSettingsIntervalsFromFormValues({ velora: '710' }, DEFAULT_INTERVALS).velora,
  710,
  'settings interval parse 应包含 Velora 间隔'
);
assert.ok(indexHtml.includes('id="setting-velora-interval"'), '设置面板应包含 Velora 输入框');
assert.ok(indexHtml.includes('Velora (默认 700ms)'), '设置面板应展示 Velora 默认值');
