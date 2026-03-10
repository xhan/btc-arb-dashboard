const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.ok(
  appJs.includes('function buildBybitOrderbookSummary(symbol, orderbook)'),
  '前端应生成 Bybit 盘口摘要文本'
);
assert.ok(
  appJs.includes('function buildBybitOrderbookTooltipHtml(orderbook)'),
  '前端应生成 Bybit 盘口 tooltip'
);
assert.ok(
  appJs.includes("quote.chain === 'Bybit'"),
  'hover 逻辑应对 Bybit 单独处理'
);
assert.ok(
  appJs.includes("className: 'bybit-orderbook-tooltip-host'"),
  'Bybit tooltip 应使用独立样式类'
);
assert.ok(
  indexHtml.includes('.quote-text.bybit-orderbook-summary'),
  '卡片应支持 Bybit 双行盘口显示'
);
assert.ok(
  indexHtml.includes('.bybit-orderbook-tooltip'),
  'tooltip 应包含 Bybit 盘口样式'
);
