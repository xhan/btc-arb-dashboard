const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { buildAliasRulesFromGroups, DEFAULT_ASSET_EQUIVALENCE_GROUPS } = require('../arb-equivalence-utils');

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
assert.strictEqual(defaultAliasRules.TBTC, 'tBTC');

const browserCode = fs.readFileSync(path.join(__dirname, '..', 'arb-equivalence-utils.js'), 'utf8');
const browserSandbox = { window: {} };
vm.createContext(browserSandbox);
assert.doesNotThrow(() => vm.runInContext(browserCode, browserSandbox));
assert.ok(browserSandbox.window.ArbEquivalenceUtils, 'expected ArbEquivalenceUtils to attach to window');
