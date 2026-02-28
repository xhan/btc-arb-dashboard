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
assert.ok(html.includes('WBTC->WETH 16 @ethereum'));
assert.ok(html.includes('收益: 12.00'));
