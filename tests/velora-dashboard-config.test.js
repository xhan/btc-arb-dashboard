const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'src/app/dashboard-app.js'), 'utf8');
const appShellRuntimeJs = fs.readFileSync(path.join(__dirname, '..', 'src/app/dashboard-app-shell-runtime.js'), 'utf8');
const shellRuntimeJs = fs.readFileSync(path.join(__dirname, '..', 'src/app/dashboard-shell-runtime.js'), 'utf8');
const quoteRuntimeJs = fs.readFileSync(path.join(__dirname, '..', 'src/app/dashboard-quote-runtime.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public/index.html'), 'utf8');
const {
  buildSettingsIntervalWritePlan,
  buildSettingsIntervalsFromFormValues
} = require('../src/dashboard/dashboard-renderer');
const { DEFAULT_INTERVALS, getQueueTypeForQuote } = require('../src/queue-stats/queue-stats-utils');

assert.strictEqual(DEFAULT_INTERVALS.velora, 700, 'DEFAULT_INTERVALS 应包含 velora 默认 700ms');
assert.strictEqual(DEFAULT_INTERVALS.llamaparaswap, 800, 'DEFAULT_INTERVALS 应包含 Llama-ParaSwap 默认 800ms');
assert.ok(
  quoteRuntimeJs.includes('options.queueStatsUtils.getQueueTypeForQuote(quote, requestChannelRuntime.getOptions(), {')
    && quoteRuntimeJs.includes('multiChannelEnabled: requestChannelRuntime.isMultiChannelEnabled()'),
  '报价应通过共享请求通道工具决定队列'
);
assert.strictEqual(
  getQueueTypeForQuote({ chain: 'ethereum', preferredSource: 'Velora' }),
  'velora',
  'Velora 仍应映射到独立 source 队列'
);
assert.strictEqual(
  getQueueTypeForQuote({ chain: 'ethereum', preferredSource: 'Llama-ParaSwap' }),
  'llamaparaswap',
  'Llama-ParaSwap 应映射到独立 source 队列'
);
assert.ok(
  appJs.includes('getDashboardAppShellRuntime().createDashboardAppShellRuntime({')
    && appShellRuntimeJs.includes('dashboardRenderer: modules.getDashboardRenderer()')
    && appShellRuntimeJs.includes('return modules.getDashboardShellRuntime().createDashboardShellRuntime({')
    && shellRuntimeJs.includes('buildSettingsIntervalWritePlan: dashboardRenderer.buildSettingsIntervalWritePlan'),
  '设置弹窗应通过 dashboard renderer 回填间隔'
);
assert.ok(
  shellRuntimeJs.includes('buildSettingsIntervalsFromFormValues: dashboardRenderer.buildSettingsIntervalsFromFormValues'),
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
assert.ok(
  buildSettingsIntervalWritePlan({ llamaparaswap: DEFAULT_INTERVALS.llamaparaswap }).some((item) => (
    item.key === 'llamaparaswap'
    && item.id === 'setting-llama-paraswap-interval'
    && item.value === DEFAULT_INTERVALS.llamaparaswap
  )),
  'settings interval write plan 应包含 Llama-ParaSwap 间隔'
);
assert.strictEqual(
  buildSettingsIntervalsFromFormValues({ velora: '710' }, DEFAULT_INTERVALS).velora,
  710,
  'settings interval parse 应包含 Velora 间隔'
);
assert.ok(indexHtml.includes('id="setting-velora-interval"'), '设置面板应包含 Velora 输入框');
assert.ok(indexHtml.includes('Velora (默认 700ms)'), '设置面板应展示 Velora 默认值');
assert.ok(indexHtml.includes('id="setting-llama-paraswap-interval"'), '设置面板应包含 Llama-ParaSwap 输入框');
assert.ok(indexHtml.includes('Llama-ParaSwap (默认 800ms)'), '设置面板应展示 Llama-ParaSwap 默认值');
