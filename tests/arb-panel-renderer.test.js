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
            profitRate: 0.0012,
            legs: [
              { from: 'WBTC', to: 'WETH', rate: 16, chain: 'ethereum' },
              { from: 'WETH', to: 'WBTC', rate: 0.064, chain: 'arbitrum' }
            ]
          }
        ]
      }
    ]
  ],
  formatLegLine: ({ from, to, rate, chainLabel }) => `${from}->${to} ${rate} @${chainLabel}`,
  formatProfit: (profitRate) => `${(profitRate * 10000).toFixed(2)}`
});

assert.ok(html.includes('固定路径'));
assert.ok(html.includes('机会 1'));
assert.ok(html.includes('data-arb-opportunity-id="fixed-1"'));
assert.ok(html.includes('class="arb-opportunity-chart-link"'));
assert.ok(html.includes('href="/charts?pairs=%5B%7B%22quoteId%22%3A1%2C%22direction%22%3A%22forward%22%7D%5D"'));
assert.ok(html.includes('↗'));
assert.ok(html.includes('WBTC->WETH 16 @ethereum'));
assert.ok(html.includes('收益: 12.00'));
