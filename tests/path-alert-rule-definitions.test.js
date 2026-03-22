const assert = require('assert');
const { FIXED_PATH_RULES } = require('../path-alert-rule-definitions');

function byId(id) {
  return FIXED_PATH_RULES.find((rule) => rule.id === id);
}

const wbtcMinusArb = byId('fixed:wbtc-btc-no-arb');
assert.ok(wbtcMinusArb);
assert.strictEqual(wbtcMinusArb.title, 'WBTC - BTC (-arb)');
assert.strictEqual(wbtcMinusArb.base, 'cbBTC');
assert.strictEqual(wbtcMinusArb.quote, 'WBTC');
assert.deepStrictEqual(wbtcMinusArb.categoryNames, ['WBTC监控']);
assert.deepStrictEqual(wbtcMinusArb.excludeChains, ['arbitrum']);

const lbtcBtc = byId('fixed:lbtc-btc');
assert.ok(lbtcBtc);
assert.strictEqual(lbtcBtc.base, 'cbBTC');
assert.strictEqual(lbtcBtc.quote, 'LBTC');
assert.deepStrictEqual(lbtcBtc.categoryNames, ['LBTC监控']);

const wbtcLbtc = byId('fixed:wbtc-lbtc');
assert.ok(wbtcLbtc);
assert.strictEqual(wbtcLbtc.base, 'WBTC');
assert.strictEqual(wbtcLbtc.quote, 'LBTC');
assert.deepStrictEqual(wbtcLbtc.categoryNames, ['LBTC监控']);

const tbtcWbtc = byId('fixed:tbtc-wbtc');
assert.ok(tbtcWbtc);
assert.strictEqual(tbtcWbtc.base, 'tBTC');
assert.strictEqual(tbtcWbtc.quote, 'WBTC');
assert.deepStrictEqual(tbtcWbtc.categoryNames, ['TBTC监控']);

const tbtcBtc = byId('fixed:tbtc-btc');
assert.ok(tbtcBtc);
assert.strictEqual(tbtcBtc.base, 'tBTC');
assert.strictEqual(tbtcBtc.quote, 'cbBTC');
assert.deepStrictEqual(tbtcBtc.categoryNames, ['TBTC监控']);

const ghoUsd = byId('fixed:gho-usd');
assert.ok(ghoUsd);
assert.strictEqual(ghoUsd.base, 'GHO');
assert.strictEqual(ghoUsd.quote, 'USDC');
assert.deepStrictEqual(ghoUsd.categoryNames, ['USD监控']);
assert.strictEqual(ghoUsd.resultLimit, 2);

const msEth = byId('fixed:mseth');
assert.ok(msEth);
assert.strictEqual(msEth.base, 'msETH');
assert.strictEqual(msEth.quote, 'WETH');
assert.deepStrictEqual(msEth.categoryNames, ['ETH监控']);

const weEth = byId('fixed:weeth');
assert.ok(weEth);
assert.strictEqual(weEth.base, 'weETH');
assert.strictEqual(weEth.quote, 'WETH');
assert.deepStrictEqual(weEth.categoryNames, ['ETH监控']);

const wstEth = byId('fixed:wsteth');
assert.ok(wstEth);
assert.strictEqual(wstEth.base, 'wstETH');
assert.strictEqual(wstEth.quote, 'WETH');
assert.deepStrictEqual(wstEth.categoryNames, ['ETH监控']);
