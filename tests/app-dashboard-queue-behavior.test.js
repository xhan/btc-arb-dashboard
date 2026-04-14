const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

assert.ok(
  appJs.includes('function processQueue(type)'),
  '主看板应保留 processQueue 作为队列消费入口'
);

assert.ok(
  appJs.includes('function rebuildQueuesForMultiChannelToggle(previousEnabled, nextEnabled)'),
  '多渠道开关应通过统一的批量重排队列逻辑切换'
);

assert.ok(
  appJs.includes('queueQuoteRefresh(quote, { updateSchedulers: false });'),
  '多渠道开关切换后应批量回收到队列，并只在最后统一刷新 scheduler'
);

assert.ok(
  appJs.includes('getEffectiveRequestChannelIdForQuote(quote)'),
  '主看板请求与队列归类都应走生效渠道，而不是直接读原始 requestChannelId'
);

assert.ok(
  !appJs.includes('fetchSingleQuote(newQuote);'),
  '新增报价后不应直接请求，应只进入队列'
);

assert.ok(
  !appJs.includes('fetchSingleQuote(quote);'),
  '主看板交互入口不应直接请求报价'
);

assert.ok(
  !appJs.includes('setTimeout(() => fetchSingleQuote(quote), 0);'),
  '切换 source/channel/showInverse 后不应直连刷新，应等待队列消费'
);

assert.ok(
  appJs.includes("requestChannelId: 'default'"),
  '套利详情应继续强制走默认通道'
);

assert.ok(
  appJs.includes('beforeSourceAttempt: (source) => waitForArbDetailSourceBudget(source, controller.signal)'),
  '套利详情应继续保留独立的 source budget 控制'
);
