const assert = require('assert');

const { renderArbGrid } = require('../arb-panel-renderer');

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
assert.ok(html.includes('WBTC->WETH 16 @ethereum'));
assert.ok(html.includes('WETH->WBTC 0.064 @arbitrum bid1×1.25'));
assert.ok(html.includes('class="arb-path-line arb-path-display-line">1) 0.50000     0.9998     💹 13.0‱</div>'));
assert.ok(html.includes('class="arb-path-line arb-path-display-line arb-path-display-line-empty">&nbsp;</div>'));
assert.ok(html.includes('class="arb-opportunity-head-profit arb-profit">12.00</div>'));
assert.ok(!html.includes('<div class="arb-profit">收益: 12.00</div>'));

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
