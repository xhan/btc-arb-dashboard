const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  DEFAULT_ASSET_EQUIVALENCE_GROUPS,
  buildAliasGroups,
  buildAliasLookup,
  buildAliasRulesFromGroups,
  buildAliasTargetLookup,
  expandAliasSymbols,
  normalizeAssetLookupKey,
  resolveAliasSymbol,
  resolveAliasTarget,
  symbolsMatch
} = require('../src/arb/arb-equivalence-utils');

const aliasRules = buildAliasRulesFromGroups({
  cbBTC: ['cbBTC', 'xBTC', 'BTCB', 'BTC.b'],
  tBTC: ['tBTC', 'TBTC']
});

assert.strictEqual(aliasRules.xBTC, 'cbBTC');
assert.strictEqual(aliasRules.BTCB, 'cbBTC');
assert.strictEqual(aliasRules['BTC.b'], 'cbBTC');
assert.strictEqual(aliasRules.TBTC, 'tBTC');
assert.ok(!Object.prototype.hasOwnProperty.call(aliasRules, 'cbBTC'));
assert.ok(!Object.prototype.hasOwnProperty.call(aliasRules, 'tBTC'));

const defaultAliasRules = buildAliasRulesFromGroups(DEFAULT_ASSET_EQUIVALENCE_GROUPS);
assert.strictEqual(defaultAliasRules.WETH, 'ETH');
assert.strictEqual(defaultAliasRules.TBTC, 'tBTC');
assert.strictEqual(defaultAliasRules['USD₮0'], 'USDT');
assert.strictEqual(defaultAliasRules.USDT0, 'USDT');
assert.strictEqual(defaultAliasRules.wBTC, 'WBTC');
assert.strictEqual(defaultAliasRules.USDE, 'USDe');
assert.strictEqual(defaultAliasRules.USDTB, 'USDtb');
assert.strictEqual(defaultAliasRules['BTC.B'], 'cbBTC');

const defaultAliasLookup = buildAliasLookup(defaultAliasRules);
const defaultAliasTargetLookup = buildAliasTargetLookup(defaultAliasRules);
assert.strictEqual(normalizeAssetLookupKey(' usdt0 '), 'USDT0');
assert.strictEqual(resolveAliasSymbol('USD₮0', defaultAliasLookup), 'USDT');
assert.strictEqual(resolveAliasSymbol('usdt0', defaultAliasLookup), 'USDT');
assert.strictEqual(resolveAliasSymbol('USDtb', defaultAliasLookup), 'USDTB');
assert.strictEqual(resolveAliasSymbol('USDT0', defaultAliasLookup, { allowAliases: false }), 'USDT0');
assert.strictEqual(resolveAliasTarget('USD₮0', defaultAliasTargetLookup), 'USDT');
assert.strictEqual(resolveAliasTarget('usde', defaultAliasTargetLookup), 'USDe');
assert.strictEqual(resolveAliasTarget('USDT0', defaultAliasTargetLookup, { allowAliases: false }), 'USDT0');
assert.strictEqual(symbolsMatch('USDtb', 'USDTB', defaultAliasLookup), true);
assert.strictEqual(symbolsMatch('USDT0', 'USDT', defaultAliasLookup), true);
assert.deepStrictEqual(
  buildAliasGroups({ USDT0: 'USDT', 'USD₮0': 'USDT' }),
  [{ canonical: 'USDT', symbols: ['USDT', 'USDT0', 'USD₮0'] }]
);
assert.deepStrictEqual(
  expandAliasSymbols(defaultAliasRules, ['USDT', 'cbBTC']),
  ['USDT', 'USD₮0', 'USDT0', 'cbBTC', 'xBTC', 'BTCB', 'BTC.b', 'BTC.B']
);

const browserCode = fs.readFileSync(path.join(__dirname, '..', 'src/arb/arb-equivalence-utils.js'), 'utf8');
const browserSandbox = { window: {} };
vm.createContext(browserSandbox);
assert.doesNotThrow(() => vm.runInContext(browserCode, browserSandbox));
assert.ok(browserSandbox.window.ArbEquivalenceUtils, 'expected ArbEquivalenceUtils to attach to window');
assert.strictEqual(browserSandbox.buildApi, undefined, 'arb equivalence factory should not leak to global scope');
