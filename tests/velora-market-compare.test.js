const assert = require('assert');

const { TOKENS } = require('../scripts/velora-market-api');
const {
  buildCbBtcWbtcRequests,
  buildScenarioMatrix
} = require('../scripts/velora-market-compare');

const requests = buildCbBtcWbtcRequests();
assert.strictEqual(requests.length, 2, '应生成 cbBTC/WBTC 双向两个请求');
assert.strictEqual(requests[0].label, 'cbBTC -> WBTC');
assert.strictEqual(requests[1].label, 'WBTC -> cbBTC');
assert.strictEqual(requests[0].srcToken.address, TOKENS.CBBTC.address);
assert.strictEqual(requests[0].destToken.address, TOKENS.WBTC.address);
assert.strictEqual(requests[1].srcToken.address, TOKENS.WBTC.address);
assert.strictEqual(requests[1].destToken.address, TOKENS.CBBTC.address);

const scenarios = buildScenarioMatrix(['UniswapV3', 'SushiSwap']);
assert.deepStrictEqual(
  scenarios.map((item) => item.name),
  [
    'kyber',
    'velora-default',
    'velora-include-empty',
    'velora-include-all',
    'velora-other-off',
    'velora-other-on'
  ]
);
assert.strictEqual(scenarios[0].kind, 'kyber');
assert.strictEqual(scenarios[1].kind, 'velora');
assert.deepStrictEqual(scenarios[2].veloraOptions.includeDEXS, []);
assert.deepStrictEqual(scenarios[3].veloraOptions.includeDEXS, ['UniswapV3', 'SushiSwap']);
assert.strictEqual(scenarios[4].veloraOptions.otherExchangePrices, false);
assert.strictEqual(scenarios[5].veloraOptions.otherExchangePrices, true);
