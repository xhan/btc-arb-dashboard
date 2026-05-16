const assert = require('assert');
const fs = require('fs');

const appJs = fs.readFileSync('app.js', 'utf8');
const chainDefaultsJs = fs.readFileSync('chain-defaults.js', 'utf8');
const dashboardRendererJs = fs.readFileSync('src/dashboard/dashboard-renderer.js', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

assert.ok(indexHtml.includes('id="add-quote-to-chain"'), '添加报价弹窗应提供目标链选择');
assert.ok(appJs.includes('const addQuoteToChainSelect'), '前端应读取目标链选择控件');
assert.ok(appJs.includes('getDashboardRenderer().buildAddQuoteDraft({'), '保存添加报价时应走 dashboard renderer draft 构造');
assert.ok(dashboardRendererJs.includes('quote.toChain = normalizedToChain'), '保存跨链报价时应写入 toChain');
assert.ok(dashboardRendererJs.includes("quote.preferredSource = 'LI.FI'"), '跨链报价应强制使用 LI.FI');
assert.ok(appJs.includes('function isCrossChainQuote'), '前端应有统一跨链报价判断');
assert.ok(chainDefaultsJs.includes("if (isCrossChainQuote(quote)) return ['LI.FI'];"), '跨链报价刷新策略应只走 LI.FI');
assert.ok(appJs.includes('getChainDefaults().buildQuoteStrategy(quote)'), '主看板应复用统一报价刷新策略');
