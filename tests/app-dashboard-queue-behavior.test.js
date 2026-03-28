const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

assert.ok(
  appJs.includes('function processQueue(type)'),
  '主看板应保留 processQueue 作为队列消费入口'
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
