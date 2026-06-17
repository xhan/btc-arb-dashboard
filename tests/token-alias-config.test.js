const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { DEFAULT_TOKEN_ALIAS_GROUPS } = require('../src/shared/token-alias-config');
const { DEFAULT_ASSET_EQUIVALENCE_GROUPS } = require('../src/arb/arb-equivalence-utils');

assert.strictEqual(DEFAULT_ASSET_EQUIVALENCE_GROUPS, DEFAULT_TOKEN_ALIAS_GROUPS);
assert.deepStrictEqual(DEFAULT_TOKEN_ALIAS_GROUPS.USDT, ['USDT', 'USD₮0', 'USDT0']);
assert.deepStrictEqual(DEFAULT_TOKEN_ALIAS_GROUPS.cbBTC, ['cbBTC', 'xBTC', 'BTCB', 'BTC.b', 'BTC.B']);

const configCode = fs.readFileSync(path.join(__dirname, '..', 'src/shared/token-alias-config.js'), 'utf8');
const equivalenceCode = fs.readFileSync(path.join(__dirname, '..', 'src/arb/arb-equivalence-utils.js'), 'utf8');
const browserSandbox = {};
browserSandbox.window = browserSandbox;
vm.createContext(browserSandbox);

vm.runInContext(configCode, browserSandbox);
vm.runInContext(equivalenceCode, browserSandbox);

assert.ok(browserSandbox.TokenAliasConfig);
assert.strictEqual(
  browserSandbox.ArbEquivalenceUtils.DEFAULT_ASSET_EQUIVALENCE_GROUPS,
  browserSandbox.TokenAliasConfig.DEFAULT_TOKEN_ALIAS_GROUPS
);
