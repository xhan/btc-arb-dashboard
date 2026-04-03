const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  buildDataTerminalCandidates,
  buildDataTerminalSelectionSummary,
  buildDataTerminalViewModel,
  formatDataTerminalBp,
  formatDataTerminalValue,
  parseDataTerminalQuery
} = require('../data-terminal-utils');

assert.deepStrictEqual(parseDataTerminalQuery('  WBTC, cbBTC extra  '), ['WBTC', 'cbBTC']);
assert.deepStrictEqual(parseDataTerminalQuery(''), []);

const candidates = buildDataTerminalCandidates([
  {
    quote: { id: 101, chain: 'ethereum', showInverse: true, amount: 0.5 },
    fromSymbol: 'cbBTC',
    toSymbol: 'WBTC',
    lastRawPrice: 1.001432,
    inverseRawPrice: 0.99857
  },
  {
    quote: { id: 102, chain: 'arbitrum', showInverse: true, amount: 0.3 },
    fromSymbol: 'xBTC',
    toSymbol: 'wBTC',
    lastRawPrice: 1.000511,
    inverseRawPrice: 0.998451
  },
  {
    quote: { id: 103, chain: 'base', showInverse: true, amount: 0.2 },
    fromSymbol: 'WBTC',
    toSymbol: 'BTC.b',
    lastRawPrice: 0.99877,
    inverseRawPrice: 1.001231
  },
  {
    quote: { id: 104, chain: 'ethereum', showInverse: true, amount: 0.5 },
    fromSymbol: 'WBTC',
    toSymbol: 'cbBTC',
    lastRawPrice: 0.99912,
    inverseRawPrice: 1.00088
  },
  {
    quote: { id: 105, chain: 'Bybit', amount: 0.1 },
    fromSymbol: 'WBTC',
    toSymbol: 'BTC',
    cexOrderbook: {
      bestBidPrice: 27.123456,
      bestAskPrice: 27.223456
    }
  },
  {
    quote: { id: 106, chain: 'ethereum', paused: true, showInverse: true, amount: 1 },
    fromSymbol: 'PAUSED',
    toSymbol: 'WBTC',
    lastRawPrice: 123
  }
]);

assert.ok(candidates.some((item) => item.key === '101:forward'));
assert.ok(candidates.some((item) => item.key === '101:inverse'));
assert.ok(candidates.some((item) => item.key === '105:cex-bid1'));
assert.ok(candidates.some((item) => item.key === '105:cex-ask1-inverse'));
assert.ok(!candidates.some((item) => item.key.startsWith('106:')));

const aliasRules = {
  xBTC: 'cbBTC',
  'BTC.b': 'cbBTC',
  wBTC: 'WBTC'
};

const pairWithAliases = buildDataTerminalViewModel(candidates, {
  query: 'WBTC, cbBTC',
  aliasRules,
  allowAliases: true,
  showDiff: false
});

assert.strictEqual(pairWithAliases.mode, 'pair');
assert.strictEqual(pairWithAliases.leftTitle, 'cbBTC -> WBTC');
assert.strictEqual(pairWithAliases.rightTitle, 'WBTC -> cbBTC');
assert.deepStrictEqual(
  pairWithAliases.leftRows.map((item) => `${item.fromSymbol}->${item.toSymbol}`),
  ['cbBTC->WBTC', 'BTC.b->WBTC', 'cbBTC->WBTC', 'xBTC->wBTC']
);
assert.deepStrictEqual(
  pairWithAliases.rightRows.map((item) => `${item.fromSymbol}->${item.toSymbol}`),
  ['WBTC->cbBTC', 'WBTC->BTC.b', 'WBTC->cbBTC', 'wBTC->xBTC']
);
assert.strictEqual(pairWithAliases.leftRows[0].displayValue, '1.00143');

const pairWithoutAliases = buildDataTerminalViewModel(candidates, {
  query: 'WBTC cbBTC',
  aliasRules,
  allowAliases: false,
  showDiff: false
});

assert.deepStrictEqual(
  pairWithoutAliases.leftRows.map((item) => `${item.fromSymbol}->${item.toSymbol}`),
  ['cbBTC->WBTC', 'cbBTC->WBTC']
);
assert.deepStrictEqual(
  pairWithoutAliases.rightRows.map((item) => `${item.fromSymbol}->${item.toSymbol}`),
  ['WBTC->cbBTC', 'WBTC->cbBTC']
);

const singleTokenDiffView = buildDataTerminalViewModel(candidates, {
  query: 'cbBTC',
  aliasRules,
  allowAliases: true,
  showDiff: true
});

assert.strictEqual(singleTokenDiffView.mode, 'single');
assert.strictEqual(singleTokenDiffView.leftTitle, 'xxx -> cbBTC');
assert.strictEqual(singleTokenDiffView.rightTitle, 'cbBTC -> yyy');
assert.strictEqual(singleTokenDiffView.leftRows[0].displayValue, '-0.00088');
assert.strictEqual(singleTokenDiffView.rightRows[0].displayValue, '0.00143');
assert.ok(singleTokenDiffView.rightRows.some((item) => item.displayValue === '0.00123'));

const emptyView = buildDataTerminalViewModel(candidates, {
  query: '',
  aliasRules,
  allowAliases: true,
  showDiff: false
});

assert.strictEqual(emptyView.mode, 'empty');
assert.strictEqual(emptyView.leftRows.length, 0);
assert.strictEqual(emptyView.rightRows.length, 0);
assert.strictEqual(emptyView.emptyMessage, '输入 1 或 2 个代币开始搜索');

assert.strictEqual(formatDataTerminalValue(1.001432, false), '1.00143');
assert.strictEqual(formatDataTerminalValue(1.001432, true), '0.00143');
assert.strictEqual(formatDataTerminalValue(0.99912, true), '-0.00088');
assert.strictEqual(formatDataTerminalBp(1.4000419999983195), '+1.40bp');
assert.strictEqual(formatDataTerminalBp(-3.2), '-3.20bp');

assert.deepStrictEqual(
  buildDataTerminalSelectionSummary(
    {
      leftKey: '101:forward',
      rightKey: '104:forward'
    },
    {
      leftRows: pairWithAliases.leftRows,
      rightRows: pairWithAliases.rightRows
    }
  ),
  {
    leftKey: '101:forward',
    rightKey: '104:forward',
    profitBp: 5.507398400002028,
    text: '+5.51bp'
  }
);

assert.deepStrictEqual(
  buildDataTerminalSelectionSummary(
    {
      leftKey: 'missing-left',
      rightKey: '104:forward'
    },
    {
      leftRows: pairWithAliases.leftRows,
      rightRows: pairWithAliases.rightRows
    }
  ),
  {
    leftKey: '',
    rightKey: '104:forward',
    profitBp: null,
    text: '--'
  }
);

assert.deepStrictEqual(
  buildDataTerminalSelectionSummary(
    {
      leftKey: '101:forward',
      rightKey: ''
    },
    {
      leftRows: pairWithAliases.leftRows,
      rightRows: pairWithAliases.rightRows
    }
  ),
  {
    leftKey: '101:forward',
    rightKey: '',
    profitBp: null,
    text: '--'
  }
);

const browserCode = fs.readFileSync(path.join(__dirname, '..', 'data-terminal-utils.js'), 'utf8');
const browserSandbox = { window: {} };
vm.createContext(browserSandbox);
assert.doesNotThrow(() => vm.runInContext(browserCode, browserSandbox));
assert.ok(browserSandbox.window.DataTerminalUtils, 'expected DataTerminalUtils to attach to window');
