const assert = require('assert');

const {
  applyArbPanelErrorText,
  renderArbGrid,
  renderArbSectionToggleHtml,
  resolveArbPathContentClickAction,
  resolveArbPathContentKeydownAction,
  resolveArbPathContentPointerDownAction
} = require('../src/arb/arb-panel-renderer');

const arbPanelErrorEl = { textContent: '' };
assert.strictEqual(applyArbPanelErrorText(arbPanelErrorEl, '配置加载失败'), true);
assert.strictEqual(arbPanelErrorEl.textContent, '配置加载失败');
assert.strictEqual(applyArbPanelErrorText(null, 'x'), false);

function resolveArbActionFor(resolver, matches, event = { type: 'click' }, extraOptions = {}) {
  return resolver(event, {
    closestEventTarget: (sourceEvent, selector) => matches[selector] || null,
    ...extraOptions
  });
}

const expandToggleEl = { dataset: { arbSectionKey: 'category:btc' } };
const opportunityEl = { dataset: { arbOpportunityId: 'opp-1' } };

assert.deepStrictEqual(
  resolveArbActionFor(resolveArbPathContentClickAction, { '.arb-path-expand-toggle': expandToggleEl }),
  { type: 'toggle-section', sectionKey: 'category:btc' }
);
assert.deepStrictEqual(
  resolveArbActionFor(
    resolveArbPathContentClickAction,
    {
      '.arb-path-expand-toggle': expandToggleEl,
      '[data-arb-opportunity-id]': opportunityEl
    },
    { type: 'click' },
    { containsElement: () => false }
  ),
  { type: 'open-opportunity', opportunityId: 'opp-1' }
);
assert.deepStrictEqual(
  resolveArbActionFor(resolveArbPathContentClickAction, { '[data-arb-opportunity-id]': opportunityEl }),
  { type: 'open-opportunity', opportunityId: 'opp-1' }
);
assert.deepStrictEqual(resolveArbActionFor(resolveArbPathContentClickAction, {}), { type: 'none' });

assert.deepStrictEqual(
  resolveArbActionFor(resolveArbPathContentPointerDownAction, { '[data-arb-opportunity-id]': opportunityEl }, { type: 'pointerdown', button: 0 }),
  { type: 'open-opportunity', opportunityId: 'opp-1' }
);
assert.deepStrictEqual(
  resolveArbActionFor(resolveArbPathContentPointerDownAction, { '[data-arb-opportunity-id]': opportunityEl }, { type: 'pointerdown', button: 1 }),
  { type: 'none' }
);
assert.deepStrictEqual(
  resolveArbActionFor(resolveArbPathContentPointerDownAction, {
    '.arb-path-expand-toggle': expandToggleEl,
    '[data-arb-opportunity-id]': opportunityEl
  }, { type: 'pointerdown', button: 0 }),
  { type: 'none' }
);

assert.deepStrictEqual(
  resolveArbActionFor(resolveArbPathContentKeydownAction, { '[data-arb-opportunity-id]': opportunityEl }, { type: 'keydown', key: 'Enter' }),
  { type: 'open-opportunity', opportunityId: 'opp-1' }
);
assert.deepStrictEqual(
  resolveArbActionFor(resolveArbPathContentKeydownAction, { '[data-arb-opportunity-id]': opportunityEl }, { type: 'keydown', key: ' ' }),
  { type: 'open-opportunity', opportunityId: 'opp-1' }
);
assert.deepStrictEqual(
  resolveArbActionFor(resolveArbPathContentKeydownAction, { '[data-arb-opportunity-id]': opportunityEl }, { type: 'keydown', key: 'Escape' }),
  { type: 'none' }
);

const html = renderArbGrid({
  columns: [
    [
      {
        title: '固定路径',
        opportunities: [
          {
            label: '机会 1',
            opportunityId: 'fixed-1',
            chartHref: '/charts?pairs=%5B%7B%22quoteId%22%3A1%2C%22direction%22%3A%22forward%22%7D%5D',
            displayMessage: '1) 0.50000     0.9998     💹 13.0‱\n\n2.30000     💰 0.00247     💹 10.7‱(MAX)',
            profitRate: 0.0012,
            legs: [
              { from: 'WBTC', to: 'WETH', rate: 16, chain: 'ethereum' },
              { from: 'WETH', to: 'WBTC', rate: 0.064, chain: 'arbitrum', cexLevelLabel: 'bid1', cexLevelSize: 1.25 }
            ]
          }
        ]
      }
    ]
  ],
  formatLegLine: ({ from, to, rate, chainLabel, cexLevelLabel, cexLevelSize }) => {
    const levelText = cexLevelLabel ? ` ${cexLevelLabel}×${cexLevelSize}` : '';
    return `${from}->${to} ${rate} @${chainLabel}${levelText}`;
  },
  formatProfit: (profitRate) => `${(profitRate * 10000).toFixed(2)}`
});

assert.ok(html.includes('固定路径'));
assert.ok(html.includes('机会 1'));
assert.ok(html.includes('data-arb-opportunity-id="fixed-1"'));
assert.ok(!html.includes('class="arb-opportunity-chart-link"'));
assert.ok(!html.includes('data-arb-opportunity-alert-id="fixed-1"'));
assert.ok(html.includes('WBTC->WETH 16 @eth'));
assert.ok(html.includes('WETH->WBTC 0.064 @arb bid1×1.25'));
assert.ok(html.includes('class="arb-path-line arb-path-display-line">1) 0.50000     0.9998     💹 13.0‱</div>'));
assert.ok(html.includes('class="arb-path-line arb-path-display-line arb-path-display-line-empty">&nbsp;</div>'));
assert.ok(html.includes('class="arb-opportunity-head-profit arb-profit">12.00</div>'));
assert.ok(!html.includes('<div class="arb-profit">收益: 12.00</div>'));

const emptyHtml = renderArbGrid({
  columns: [
    [
      {
        title: '空状态',
        opportunities: [],
        emptyText: '无收益率 > 0.5bp'
      }
    ]
  ]
});

assert.ok(emptyHtml.includes('<div class="arb-path-line arb-path-empty">无收益率 &gt; 0.5bp</div>'));

const htmlWithoutLabel = renderArbGrid({
  columns: [
    [
      {
        title: 'GHO - USD',
        opportunities: [
          {
            label: '',
            opportunityId: 'fixed-gho-1',
            profitRate: 0.0002,
            legs: [
              { from: 'GHO', to: 'USDC', rate: 1.0001, chain: 'ethereum' },
              { from: 'USDC', to: 'GHO', rate: 1.0001, chain: 'arbitrum' }
            ]
          }
        ]
      }
    ]
  ]
});

assert.ok(!htmlWithoutLabel.includes('<div class="arb-path-line"><strong>历史图表</strong></div>'));
assert.ok(htmlWithoutLabel.includes('class="arb-path-line arb-opportunity-head-label"'));

const highlightedHtml = renderArbGrid({
  columns: [
    [
      {
        title: '高亮测试',
        opportunities: [
          {
            label: '机会 2',
            opportunityId: 'highlight-1',
            isAlertHighlighted: true,
            profitRate: 0.0004,
            legs: [
              { from: 'cbBTC', to: 'BTC.b', rate: 1.0002, chain: 'base' },
              { from: 'BTC.b', to: 'cbBTC', rate: 0.9999, chain: 'ethereum' }
            ]
          }
        ]
      }
    ]
  ]
});

assert.ok(highlightedHtml.includes('class="arb-opportunity is-alert-highlight"'));

const specialHtml = renderArbGrid({
  columns: [
    [
      {
        title: 'WBTC <-> BYBIT',
        sectionType: 'special-rule',
        titleProfitRate: 0.00013,
        opportunities: [
          {
            label: '',
            opportunityId: 'special-1',
            profitRate: 0.00013,
            entryType: 'special-rule',
            displayMessage: '（ETH）cbBTC -> WBTC 1.001562\n（Bybit）WBTC -> BTC 0.9992 bid1\n\n1) 0.02001   0.9992   💹7.6‱\n\n1.00000   💰0.00059   💹5.9‱\n2.30000   💰0.00247   💹10.7‱(MAX)',
            hideLegs: true,
            clickable: false
          }
        ]
      }
    ]
  ],
  formatProfit: (profitRate) => `${(profitRate * 10000).toFixed(2)}`
});

assert.ok(specialHtml.includes('class="arb-section arb-section-special"'));
assert.ok(specialHtml.includes('class="arb-section-title-row"'));
assert.ok(specialHtml.includes('WBTC &lt;-&gt; BYBIT'));
assert.ok(specialHtml.includes('class="arb-section-title-profit arb-profit">1.30</div>'));
assert.ok(specialHtml.includes('class="arb-opportunity arb-opportunity-special-body"'));
assert.ok(!specialHtml.includes('arb-opportunity-head'));
assert.ok(specialHtml.includes('class="arb-path-line arb-path-display-line">1.00000   💰0.00059   💹5.9‱</div>'));

const quotePriceHtml = renderArbGrid({
  columns: [
    [
      {
        title: '关注列表',
        opportunities: [
          {
            entryType: 'quote-price',
            title: 'ETH USDT/USDe 汇率高于',
            priceText: '1.00042',
            metaText: 'Ethereum · USDT/USDe',
            alertText: '报警 延迟13s >= 1.0008',
            statusText: ''
          },
          {
            entryType: 'quote-price',
            title: '等待报价测试',
            priceText: '--',
            metaText: 'Ethereum · cbBTC/syBTC',
            statusText: '等待报价',
            muted: true
          }
        ]
      }
    ]
  ],
  isMeaningfulPath: () => false
});

assert.ok(quotePriceHtml.includes('class="arb-opportunity arb-opportunity-quote-price"'));
assert.ok(quotePriceHtml.includes('ETH USDT/USDe 汇率高于'));
assert.ok(quotePriceHtml.includes('class="arb-quote-price-value">1.00042</div>'));
assert.ok(quotePriceHtml.includes('Ethereum · USDT/USDe'));
assert.ok(quotePriceHtml.includes('报警 延迟13s &gt;= 1.0008'));
assert.ok(quotePriceHtml.includes('等待报价'));
assert.ok(!quotePriceHtml.includes('正向'));
assert.ok(!quotePriceHtml.includes('阈值'));
assert.ok(!quotePriceHtml.includes('状态 未触发'));

const collapsedToggleHtml = renderArbSectionToggleHtml('category:WBTC <main>', {
  canToggleExpand: true,
  expanded: false,
  hiddenPositiveCount: 3,
  positiveCount: 7,
  displayMinProfitBp: 0.5
});

assert.ok(collapsedToggleHtml.includes('class="arb-path-expand-toggle"'));
assert.ok(collapsedToggleHtml.includes('data-arb-section-key="category:WBTC &lt;main&gt;"'));
assert.ok(collapsedToggleHtml.includes('aria-expanded="false"'));
assert.ok(collapsedToggleHtml.includes('还有 3 条 &gt; 0.5bp 未显示，点击展开全部'));

const expandedToggleHtml = renderArbSectionToggleHtml('global:all', {
  canToggleExpand: true,
  expanded: true,
  hiddenPositiveCount: 0,
  positiveCount: 7,
  displayMinProfitBp: 1.25
});

assert.ok(expandedToggleHtml.includes('aria-expanded="true"'));
assert.ok(expandedToggleHtml.includes('已展开 7 条 &gt; 1.25bp，点击收起'));
assert.strictEqual(renderArbSectionToggleHtml('global:all', { canToggleExpand: false }), '');
