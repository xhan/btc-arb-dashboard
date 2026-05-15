const assert = require('assert');
const fs = require('fs');

const appJs = fs.readFileSync('app.js', 'utf8');
const chainDefaultsJs = fs.readFileSync('chain-defaults.js', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

assert.ok(indexHtml.includes('id="add-quote-to-chain"'), '添加报价弹窗应提供目标链选择');
assert.ok(appJs.includes('const addQuoteToChainSelect'), '前端应读取目标链选择控件');
assert.ok(appJs.includes('newQuote.toChain = normalizedToChain'), '保存跨链报价时应写入 toChain');
assert.ok(appJs.includes("newQuote.preferredSource = 'LI.FI'"), '跨链报价应强制使用 LI.FI');
assert.ok(appJs.includes('function isCrossChainQuote'), '前端应有统一跨链报价判断');
assert.ok(chainDefaultsJs.includes("if (isCrossChainQuote(quote)) return ['LI.FI'];"), '跨链报价刷新策略应只走 LI.FI');
assert.ok(appJs.includes('window.ChainDefaults.buildQuoteStrategy(quote)'), '主看板应复用统一报价刷新策略');
