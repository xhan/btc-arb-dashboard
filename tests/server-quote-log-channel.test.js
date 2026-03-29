const assert = require('assert');
const fs = require('fs');
const path = require('path');

const serverJs = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

assert.ok(
  serverJs.includes('channel='),
  '报价错误日志应包含 channel 标记'
);

assert.ok(
  serverJs.includes('[channel=${channel}] ${pair}') || serverJs.includes('`[channel=${channel}] ${pair} ${error.message}`'),
  '报价错误日志应把 channel 放在最前面'
);

assert.ok(
  serverJs.includes('requestContext?.channelId') || serverJs.includes('requestContext.channelId'),
  'DEX 报价路由应把实际 request channel 传给错误日志'
);
