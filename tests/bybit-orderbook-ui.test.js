const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'src/app/dashboard-app.js'), 'utf8');
const chainDefaultsJs = fs.readFileSync(path.join(__dirname, '..', 'src/shared/chain-defaults.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public/index.html'), 'utf8');
const quoteDisplayUtilsJs = fs.readFileSync(path.join(__dirname, '..', 'src/quote/quote-display-utils.js'), 'utf8');
const quoteUiControllerJs = fs.readFileSync(path.join(__dirname, '..', 'src/quote/quote-ui-controller.js'), 'utf8');

assert.ok(
  quoteDisplayUtilsJs.includes('function buildCexOrderbookSummary(symbol, orderbook)'),
  'quote display 工具应生成 CEX 盘口摘要文本'
);
assert.ok(
  quoteDisplayUtilsJs.includes('function buildCexOrderbookTooltipHtml(orderbook)'),
  'quote display 工具应生成 CEX 盘口 tooltip'
);
assert.ok(
  appJs.includes('getChainDefaults().isCexOrderbookChain(chain)'),
  '前端应通过 ChainDefaults 识别 CEX quote'
);
assert.ok(
  chainDefaultsJs.includes("return normalized === 'bybit' || normalized === 'binance';"),
  'ChainDefaults 应识别 Bybit 和 Binance 为同类 CEX quote'
);
assert.ok(
  quoteDisplayUtilsJs.includes("className: 'cex-orderbook-tooltip-host'"),
  'quote display 工具应声明 CEX tooltip 独立样式类'
);
assert.ok(
  quoteUiControllerJs.includes('buildQuoteHoverTooltipState(quote, state, { isEvmChain })'),
  '前端 hover 应消费 quote display 工具生成的 tooltip 状态'
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
  quoteDisplayUtilsJs.includes('function getCexPairLabel(quote, state)'),
  'quote display 工具应生成 CEX 交易对标签'
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
