const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.ok(
  appJs.includes('function buildCexOrderbookSummary(symbol, orderbook)'),
  '前端应生成 CEX 盘口摘要文本'
);
assert.ok(
  appJs.includes('function buildCexOrderbookTooltipHtml(orderbook)'),
  '前端应生成 CEX 盘口 tooltip'
);
assert.ok(
  appJs.includes("return normalized === 'bybit' || normalized === 'binance';"),
  '前端应识别 Bybit 和 Binance 为同类 CEX quote'
);
assert.ok(
  appJs.includes("className: 'cex-orderbook-tooltip-host'"),
  'CEX tooltip 应使用独立样式类'
);
assert.ok(
  indexHtml.includes('.quote-text.cex-orderbook-summary'),
  '卡片应支持 CEX 双行盘口显示'
);
assert.ok(
  indexHtml.includes('.quote-pair-label'),
  '卡片应包含较小字号的交易对标签'
);
assert.ok(
  appJs.includes('function getCexPairLabel(quote, state)'),
  '前端应生成 CEX 交易对标签'
);
assert.ok(
  indexHtml.includes('.cex-orderbook-tooltip'),
  'tooltip 应包含 CEX 盘口样式'
);
assert.ok(
  indexHtml.includes('id="setting-binance-interval"'),
  '设置面板应包含 Binance 间隔'
);
assert.ok(
  indexHtml.includes('<option value="Binance">Binance</option>'),
  '添加报价弹窗应包含 Binance'
);
