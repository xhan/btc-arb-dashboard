const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  extractPriceFromText,
  buildCalculatorEntry,
  calculateProduct,
  formatCalculatorEntry,
  splitCompactTradingPairSymbol
} = require('../quote-calculator');

assert.strictEqual(extractPriceFromText('cbBTC ≈ 1.003060 WBTC'), 1.00306);
assert.strictEqual(extractPriceFromText('WBTC = 0.998812 cbBTC'), 0.998812);
assert.strictEqual(extractPriceFromText('no-number'), null);

const first = buildCalculatorEntry({
  chainLabel: 'ETH',
  fromSymbol: 'cbBTC',
  toSymbol: 'WBTC',
  price: 1.00306
});

const second = buildCalculatorEntry({
  chainLabel: 'Monad',
  fromSymbol: 'WBTC',
  toSymbol: 'BTC.b',
  price: 0.996814
});

assert.ok(first);
assert.ok(second);
assert.strictEqual(formatCalculatorEntry(first), 'ETH cbBTC -> WBTC 1.003060');
assert.strictEqual(formatCalculatorEntry(second), 'Monad WBTC -> BTC.b 0.996814');
assert.strictEqual(calculateProduct([first]), 1.00306);
assert.ok(Math.abs(calculateProduct([first, second]) - 0.99986425084) < 1e-12);

assert.deepStrictEqual(
  splitCompactTradingPairSymbol('WBTCBTC'),
  { fromSymbol: 'WBTC', toSymbol: 'BTC' }
);
assert.deepStrictEqual(
  splitCompactTradingPairSymbol('BTCUSDT'),
  { fromSymbol: 'BTC', toSymbol: 'USDT' }
);
assert.deepStrictEqual(
  splitCompactTradingPairSymbol('ETH/BTC'),
  { fromSymbol: 'ETH', toSymbol: 'BTC' }
);
assert.strictEqual(splitCompactTradingPairSymbol('BTC'), null);

const browserCode = fs.readFileSync(path.join(__dirname, '..', 'quote-calculator.js'), 'utf8');
const browserSandbox = { window: {} };
vm.createContext(browserSandbox);
assert.doesNotThrow(() => vm.runInContext(browserCode, browserSandbox));
assert.ok(browserSandbox.window.QuoteCalculator, 'expected QuoteCalculator to attach to window');
