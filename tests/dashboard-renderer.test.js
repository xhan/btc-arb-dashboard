const assert = require('assert');

const {
  buildAddQuoteDraft,
  buildAddQuoteFormViewState,
  buildQuoteSettingsModalViewState,
  buildSettingsIntervalWritePlan,
  buildSettingsIntervalsFromFormValues,
  readSettingsIntervalFormValues,
  resolveAddQuoteModalClickAction,
  resolveDashboardAmountInputAction,
  resolveDashboardButtonClickAction,
  renderCategoryModuleShell,
  renderQuoteItemShell
} = require('../dashboard-renderer');

function resolveDashboardActionFor(resolver, matches, event = { type: 'click' }) {
  return resolver(event, {
    closestEventTarget: (sourceEvent, selector) => matches[selector] || null
  });
}

assert.deepStrictEqual(
  resolveDashboardActionFor(resolveDashboardAmountInputAction, {
    '.amount-input': {
      value: '1.25',
      dataset: {
        categoryId: 'cat-1',
        quoteId: '101'
      }
    }
  }, { type: 'input' }),
  {
    type: 'update-amount',
    categoryId: 'cat-1',
    quoteId: 101,
    amount: 1.25
  }
);
assert.deepStrictEqual(
  resolveDashboardActionFor(resolveDashboardAmountInputAction, {
    '.amount-input': {
      value: '-1',
      dataset: {
        categoryId: 'cat-1',
        quoteId: '101'
      }
    }
  }, { type: 'input' }),
  { type: 'none' }
);

assert.deepStrictEqual(
  resolveDashboardActionFor(resolveDashboardButtonClickAction, {
    button: {
      className: 'icon-btn dismiss-highlight-btn',
      dataset: { dismissHighlightId: '101' }
    }
  }),
  {
    type: 'dismiss-highlight',
    quoteId: 101,
    button: {
      className: 'icon-btn dismiss-highlight-btn',
      dataset: { dismissHighlightId: '101' }
    }
  }
);
assert.deepStrictEqual(
  resolveDashboardActionFor(resolveDashboardButtonClickAction, {
    button: {
      dataset: {
        categoryId: 'cat-1',
        toggleCategoryPauseId: 'cat-1'
      }
    }
  }),
  { type: 'toggle-category-pause', categoryId: 'cat-1' }
);
assert.deepStrictEqual(
  resolveDashboardActionFor(resolveDashboardButtonClickAction, {
    button: {
      dataset: {
        categoryId: 'cat-1',
        togglePauseId: '102'
      }
    }
  }),
  { type: 'toggle-quote-pause', categoryId: 'cat-1', quoteId: 102 }
);
assert.deepStrictEqual(
  resolveDashboardActionFor(resolveDashboardButtonClickAction, {
    button: {
      dataset: {
        categoryId: 'cat-1',
        editAlertId: '103'
      }
    }
  }),
  { type: 'edit-quote', categoryId: 'cat-1', quoteId: 103 }
);
assert.deepStrictEqual(
  resolveDashboardActionFor(resolveDashboardButtonClickAction, {
    button: {
      className: 'icon-btn delete-btn',
      dataset: {
        categoryId: 'cat-1',
        quoteId: '104'
      }
    }
  }),
  { type: 'delete-quote', categoryId: 'cat-1', quoteId: 104 }
);
assert.deepStrictEqual(
  resolveDashboardActionFor(resolveDashboardButtonClickAction, {
    button: {
      className: 'icon-btn delete-btn',
      dataset: {
        categoryId: 'cat-1'
      }
    }
  }),
  { type: 'delete-category', categoryId: 'cat-1' }
);
assert.deepStrictEqual(
  resolveDashboardActionFor(resolveDashboardButtonClickAction, {
    button: {
      className: 'icon-btn add-quote-btn',
      dataset: {
        categoryId: 'cat-1'
      }
    }
  }),
  { type: 'add-quote', categoryId: 'cat-1' }
);
assert.deepStrictEqual(
  resolveDashboardActionFor(resolveDashboardButtonClickAction, {
    button: {
      className: 'icon-btn swap-btn',
      dataset: {
        categoryId: 'cat-1',
        quoteId: '105'
      }
    }
  }),
  { type: 'swap-quote', categoryId: 'cat-1', quoteId: 105 }
);
assert.deepStrictEqual(resolveDashboardActionFor(resolveDashboardButtonClickAction, {}), { type: 'none' });

assert.deepStrictEqual(
  buildSettingsIntervalWritePlan({
    kyber: 170,
    zerox: 110,
    velora: 700,
    lifi: 170,
    bybit: 1000,
    binance: 1000,
    solana: 3500,
    sui: 500,
    starknet: 1000
  }).map((item) => [item.key, item.id, item.value]),
  [
    ['kyber', 'setting-kyber-interval', 170],
    ['zerox', 'setting-zerox-interval', 110],
    ['velora', 'setting-velora-interval', 700],
    ['lifi', 'setting-lifi-interval', 170],
    ['bybit', 'setting-bybit-interval', 1000],
    ['binance', 'setting-binance-interval', 1000],
    ['solana', 'setting-solana-interval', 3500],
    ['sui', 'setting-sui-interval', 500],
    ['starknet', 'setting-starknet-interval', 1000]
  ]
);
assert.deepStrictEqual(
  readSettingsIntervalFormValues({
    readValue: (id) => ({
      'setting-kyber-interval': '171',
      'setting-zerox-interval': '111',
      'setting-velora-interval': '701'
    }[id] || '')
  }),
  {
    kyber: '171',
    zerox: '111',
    velora: '701',
    lifi: '',
    bybit: '',
    binance: '',
    solana: '',
    sui: '',
    starknet: ''
  }
);
assert.deepStrictEqual(
  buildSettingsIntervalsFromFormValues(
    {
      kyber: '171',
      zerox: 'bad',
      velora: '0',
      lifi: '180',
      bybit: '',
      binance: '1200',
      solana: '3600',
      sui: '-1',
      starknet: '900'
    },
    {
      kyber: 170,
      zerox: 110,
      velora: 700,
      lifi: 170,
      bybit: 1000,
      binance: 1000,
      solana: 3500,
      sui: 500,
      starknet: 1000
    }
  ),
  {
    kyber: 171,
    zerox: 110,
    velora: 700,
    lifi: 180,
    bybit: 1000,
    binance: 1200,
    solana: 3600,
    sui: 500,
    starknet: 900
  }
);

assert.deepStrictEqual(
  buildAddQuoteFormViewState({
    chain: 'ethereum',
    toChain: 'base',
    fromToken: '0xfrom',
    toToken: '0xto',
    symbol: '',
    isEvmChain: (chain) => chain === 'ethereum'
  }),
  {
    pairFieldsVisible: true,
    symbolFieldVisible: false,
    targetChainVisible: true,
    toChainValue: 'base',
    fromPlaceholder: '0x...',
    toPlaceholder: '0x...',
    saveDisabled: false
  }
);
assert.deepStrictEqual(
  buildAddQuoteFormViewState({
    chain: 'Bybit',
    symbol: 'BTCUSDT',
    isCexOrderbookChain: () => true
  }),
  {
    pairFieldsVisible: false,
    symbolFieldVisible: true,
    targetChainVisible: false,
    toChainValue: '',
    fromPlaceholder: 'N/A',
    toPlaceholder: 'N/A',
    saveDisabled: false
  }
);
assert.strictEqual(
  buildAddQuoteFormViewState({
    chain: 'ethereum',
    fromToken: '0xfrom',
    toToken: ''
  }).saveDisabled,
  true
);

assert.deepStrictEqual(
  buildAddQuoteDraft({
    quoteId: 123,
    chain: 'ethereum',
    toChain: 'base',
    fromToken: ' 0xfrom ',
    toToken: ' 0xto ',
    normalizeChainKey: (chain) => String(chain || '').trim().toLowerCase(),
    defaultSourceResolver: () => 'Kyber'
  }),
  {
    id: 123,
    chain: 'ethereum',
    amount: 1,
    preferredSource: 'LI.FI',
    fromToken: '0xfrom',
    toToken: '0xto',
    toChain: 'base',
    showInverse: false
  }
);
assert.deepStrictEqual(
  buildAddQuoteDraft({
    quoteId: 124,
    chain: 'Bybit',
    symbol: ' btcusdt ',
    isCexOrderbookChain: () => true,
    normalizeChainKey: (chain) => String(chain || '').trim().toLowerCase(),
    defaultSourceResolver: () => 'Bybit'
  }),
  {
    id: 124,
    chain: 'Bybit',
    amount: 1,
    preferredSource: 'Bybit',
    symbol: 'BTCUSDT'
  }
);
assert.strictEqual(buildAddQuoteDraft({ chain: 'ethereum', fromToken: '0xfrom' }), null);

const addQuoteModal = { id: 'add-quote-modal', closest: () => null };
assert.deepStrictEqual(
  resolveAddQuoteModalClickAction({ target: { id: 'add-quote-cancel' } }, { modal: addQuoteModal }),
  { type: 'close' }
);
assert.deepStrictEqual(
  resolveAddQuoteModalClickAction({ target: { id: 'add-quote-save' } }, { modal: addQuoteModal }),
  { type: 'save' }
);
assert.deepStrictEqual(
  resolveAddQuoteModalClickAction({ target: addQuoteModal }, { modal: addQuoteModal }),
  { type: 'close' }
);
assert.deepStrictEqual(
  resolveAddQuoteModalClickAction({ target: { id: 'other' } }, { modal: addQuoteModal }),
  { type: 'none' }
);

const modalViewState = buildQuoteSettingsModalViewState({
  quote: {
    chain: 'ethereum',
    fromToken: '0xfrom',
    toToken: '0xto',
    preferredSource: '0x',
    showInverse: true,
    kyberOnlyDirectPools: true
  },
  monitorState: {
    fromSymbol: 'WETH',
    toSymbol: 'USDC'
  },
  isEvmChain: (chain) => chain === 'ethereum',
  getQuoteChainDisplayName: () => 'Ethereum WETH/USDC',
  getSingleChainDisplayName: (chain) => `Chain:${chain}`
});
assert.deepStrictEqual(modalViewState, {
  title: '设置 · Ethereum WETH/USDC',
  subtitle: 'WETH/USDC',
  tokenAddresses: {
    visible: true,
    fromLine: 'WETH (Chain:ethereum) 0xfrom',
    toLine: 'USDC (Chain:ethereum) 0xto'
  },
  sourceSelect: {
    visible: true,
    value: '0x',
    disabled: false,
    kyberOnlyDirectPoolsSource: '0x'
  },
  kyberOnlyDirectPoolsChecked: true,
  inverse: {
    visible: true,
    checked: true
  },
  swapVisible: true,
  deleteVisible: true
});

assert.deepStrictEqual(
  buildQuoteSettingsModalViewState({
    quote: { chain: 'arbitrum', toChain: 'base', preferredSource: 'Kyber' },
    monitorState: {},
    isCrossChainQuote: () => true,
    getQuoteChainDisplayName: () => '跨链报价'
  }).sourceSelect,
  {
    visible: true,
    value: 'LI.FI',
    disabled: true,
    kyberOnlyDirectPoolsSource: ''
  }
);
assert.strictEqual(
  buildQuoteSettingsModalViewState({
    quote: { chain: 'Bybit', symbol: 'BTCUSDT' },
    isCexOrderbookChain: () => true
  }).inverse.visible,
  false
);

const quoteItemHtml = renderQuoteItemShell({
  quoteId: 'quote-1',
  categoryId: 'cat-1',
  displayName: 'ETH <Main>',
  requestChannelTagHtml: '<span class="quote-channel-tag">主通道</span>',
  pairLabelHtml: '<span class="quote-pair-label">ETH/USDC</span>',
  amountInputHtml: '<input class="amount-input">',
  quoteTextClassName: 'quote-text cex-orderbook-summary',
  lastResultText: '1 < 2',
  paused: true
});

assert.ok(quoteItemHtml.includes('id="trend-arrow-quote-1"'));
assert.ok(quoteItemHtml.includes('data-category-id="cat-1"'));
assert.ok(quoteItemHtml.includes('ETH &lt;Main&gt;'));
assert.ok(quoteItemHtml.includes('<span class="quote-channel-tag">主通道</span>'));
assert.ok(quoteItemHtml.includes('<span class="quote-pair-label">ETH/USDC</span>'));
assert.ok(quoteItemHtml.includes('<input class="amount-input">'));
assert.ok(quoteItemHtml.includes('class="quote-text cex-orderbook-summary"'));
assert.ok(quoteItemHtml.includes('1 &lt; 2'));
assert.ok(quoteItemHtml.includes('title="恢复"'));
assert.ok(quoteItemHtml.includes('aria-pressed="true"'));

const categoryHtml = renderCategoryModuleShell({
  categoryId: 'cat-1',
  categoryName: '主分区 <A>',
  categoryPauseAction: 'resume'
});

assert.ok(categoryHtml.includes('<h2>主分区 &lt;A&gt;</h2>'));
assert.ok(categoryHtml.includes('data-category-id="cat-1"'));
assert.ok(categoryHtml.includes('title="恢复分区"'));
assert.ok(categoryHtml.includes('aria-pressed="true"'));
assert.ok(categoryHtml.includes('id="quote-list-cat-1"'));
