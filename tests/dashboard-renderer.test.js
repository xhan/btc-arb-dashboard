const assert = require('assert');

const {
  renderCategoryModuleShell,
  renderQuoteItemShell
} = require('../dashboard-renderer');

const quoteItemHtml = renderQuoteItemShell({
  quoteId: 'quote-1',
  categoryId: 'cat-1',
  displayName: 'ETH <Main>',
  requestChannelTagHtml: '<span class="quote-channel-tag">主通道</span>',
  pairLabelHtml: '<span class="quote-pair-label">ETH/USDC</span>',
  amountInputHtml: '<input class="amount-input">',
  quoteTextClassName: 'quote-text cex-orderbook-summary',
  lastResultText: '1 < 2',
  paused: true
});

assert.ok(quoteItemHtml.includes('id="trend-arrow-quote-1"'));
assert.ok(quoteItemHtml.includes('data-category-id="cat-1"'));
assert.ok(quoteItemHtml.includes('ETH &lt;Main&gt;'));
assert.ok(quoteItemHtml.includes('<span class="quote-channel-tag">主通道</span>'));
assert.ok(quoteItemHtml.includes('<span class="quote-pair-label">ETH/USDC</span>'));
assert.ok(quoteItemHtml.includes('<input class="amount-input">'));
assert.ok(quoteItemHtml.includes('class="quote-text cex-orderbook-summary"'));
assert.ok(quoteItemHtml.includes('1 &lt; 2'));
assert.ok(quoteItemHtml.includes('title="恢复"'));
assert.ok(quoteItemHtml.includes('aria-pressed="true"'));

const categoryHtml = renderCategoryModuleShell({
  categoryId: 'cat-1',
  categoryName: '主分区 <A>',
  categoryPauseAction: 'resume'
});

assert.ok(categoryHtml.includes('<h2>主分区 &lt;A&gt;</h2>'));
assert.ok(categoryHtml.includes('data-category-id="cat-1"'));
assert.ok(categoryHtml.includes('title="恢复分区"'));
assert.ok(categoryHtml.includes('aria-pressed="true"'));
assert.ok(categoryHtml.includes('id="quote-list-cat-1"'));
