const assert = require('assert');
const fs = require('fs');

const appJs = fs.readFileSync('src/app/dashboard-app.js', 'utf8');
const chainDefaultsJs = fs.readFileSync('src/shared/chain-defaults.js', 'utf8');
const quoteDomainAdapterJs = fs.readFileSync('src/app/dashboard-quote-domain-adapter.js', 'utf8');
const appWorkspaceRuntimeJs = fs.readFileSync('src/app/dashboard-app-workspace-runtime.js', 'utf8');
const quoteWorkspaceRuntimeJs = fs.readFileSync('src/app/dashboard-quote-workspace-runtime.js', 'utf8');
const dashboardDomRefsJs = fs.readFileSync('src/app/dashboard-dom-refs.js', 'utf8');
const dashboardFormControllerJs = fs.readFileSync('src/dashboard/dashboard-form-controller.js', 'utf8');
const dashboardRendererJs = fs.readFileSync('src/dashboard/dashboard-renderer.js', 'utf8');
const quoteFetchControllerJs = fs.readFileSync('src/quote/quote-fetch-controller.js', 'utf8');
const indexHtml = fs.readFileSync('public/index.html', 'utf8');

assert.ok(indexHtml.includes('id="add-quote-to-chain"'), '添加报价弹窗应提供目标链选择');
assert.ok(indexHtml.includes('id="add-quote-amount"'), '添加报价弹窗应提供 Size 输入');
assert.ok(dashboardDomRefsJs.includes("const addQuoteToChainSelect = getById(documentImpl, 'add-quote-to-chain');"), '前端应读取目标链选择控件');
assert.ok(dashboardFormControllerJs.includes('deps.dashboardRenderer.buildAddQuoteDraft({'), '保存添加报价时应走 dashboard renderer draft 构造');
assert.ok(dashboardRendererJs.includes('quote.toChain = normalizedToChain'), '保存跨链报价时应写入 toChain');
assert.ok(dashboardRendererJs.includes("quote.preferredSource = 'LI.FI'"), '跨链报价应强制使用 LI.FI');
assert.ok(
  appJs.includes('getDashboardAppWorkspaceRuntime().createDashboardAppWorkspaceRuntime({')
    && appWorkspaceRuntimeJs.includes('modules.getDashboardQuoteWorkspaceRuntime().createDashboardQuoteWorkspaceRuntime({')
    && quoteWorkspaceRuntimeJs.includes('modules.getDashboardQuoteDomainAdapter()')
    && quoteDomainAdapterJs.includes('function isCrossChainQuote(quote)'),
  '前端应有统一跨链报价判断'
);
assert.ok(chainDefaultsJs.includes("if (isCrossChainQuote(quote)) return ['LI.FI'];"), '跨链报价刷新策略应只走 LI.FI');
assert.ok(quoteFetchControllerJs.includes('deps.chainDefaults.buildQuoteStrategy(quote)'), '主看板应复用统一报价刷新策略');
