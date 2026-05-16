const assert = require('assert');

const {
  applyAddQuoteFormViewState,
  applyQuoteSettingsModalWritePlan,
  applySettingsIntervalWritePlan,
  closeAddCategoryModal,
  closeConfirmModal,
  openAddCategoryModal,
  readAddQuoteFormValues,
  readAddCategoryFormValues,
  readQuoteSettingsFormValues,
  readSettingsIntervalFormValues,
  resetAddQuoteModal,
  showConfirmModal,
  syncAddQuoteFormControls
} = require('../src/dashboard/dashboard-modal-utils');

function createClassList(initialValues = ['visible']) {
  const values = new Set(initialValues);
  return {
    values,
    add(value) {
      values.add(value);
    },
    remove(value) {
      values.delete(value);
    },
    contains(value) {
      return values.has(value);
    }
  };
}

function createRefs() {
  return {
    modal: { classList: createClassList() },
    chainSelect: { value: 'ethereum' },
    toChainSelect: { value: 'arbitrum' },
    fromInput: { value: '0xaaa', placeholder: '' },
    toInput: { value: '0xbbb', placeholder: '' },
    symbolInput: { value: 'btcusdt' },
    toChainGroup: { style: { display: '' } },
    pairFields: { style: { display: '' } },
    symbolField: { style: { display: '' } },
    saveButton: { disabled: false }
  };
}

const refs = createRefs();
assert.deepStrictEqual(readAddQuoteFormValues(refs), {
  chain: 'ethereum',
  toChain: 'arbitrum',
  fromToken: '0xaaa',
  toToken: '0xbbb',
  symbol: 'btcusdt'
});

applyAddQuoteFormViewState(refs, {
  targetChainVisible: true,
  toChainValue: 'base',
  fromPlaceholder: 'from placeholder',
  toPlaceholder: 'to placeholder',
  pairFieldsVisible: true,
  symbolFieldVisible: false,
  saveDisabled: true
});
assert.strictEqual(refs.toChainGroup.style.display, 'block');
assert.strictEqual(refs.toChainSelect.value, 'base');
assert.strictEqual(refs.fromInput.placeholder, 'from placeholder');
assert.strictEqual(refs.toInput.placeholder, 'to placeholder');
assert.strictEqual(refs.pairFields.style.display, 'block');
assert.strictEqual(refs.symbolField.style.display, 'none');
assert.strictEqual(refs.saveButton.disabled, true);

const syncRefs = createRefs();
const syncViewState = syncAddQuoteFormControls(syncRefs, {
  buildAddQuoteFormViewState: (values) => ({
    targetChainVisible: Boolean(values.toChain),
    toChainValue: values.toChain,
    fromPlaceholder: `${values.chain}-from`,
    toPlaceholder: `${values.toChain}-to`,
    pairFieldsVisible: true,
    symbolFieldVisible: false,
    saveDisabled: false
  }),
  normalizeChainKey: (value) => String(value || '').toLowerCase(),
  isCexOrderbookChain: (chain) => chain === 'Bybit',
  isEvmChain: (chain) => chain === 'ethereum'
});
assert.deepStrictEqual(syncViewState, {
  targetChainVisible: true,
  toChainValue: 'arbitrum',
  fromPlaceholder: 'ethereum-from',
  toPlaceholder: 'arbitrum-to',
  pairFieldsVisible: true,
  symbolFieldVisible: false,
  saveDisabled: false
});
assert.strictEqual(syncRefs.fromInput.placeholder, 'ethereum-from');

let resetSyncCount = 0;
const resetRefs = createRefs();
const resetResult = resetAddQuoteModal(resetRefs, {
  syncControls: () => { resetSyncCount += 1; }
});
assert.strictEqual(resetRefs.chainSelect.value, '');
assert.strictEqual(resetRefs.toChainSelect.value, '');
assert.strictEqual(resetRefs.fromInput.value, '');
assert.strictEqual(resetRefs.toInput.value, '');
assert.strictEqual(resetRefs.symbolInput.value, '');
assert.strictEqual(resetRefs.modal.classList.contains('visible'), false);
assert.deepStrictEqual(resetResult, { currentCategoryIdToAdd: null });
assert.strictEqual(resetSyncCount, 1);

function createQuoteSettingsRefs() {
  return {
    'modal-title': { textContent: '' },
    'modal-subtitle': { textContent: '' },
    'quote-token-addresses': { style: { display: '' } },
    'quote-from-token-line': { textContent: '' },
    'quote-to-token-line': { textContent: '' },
    'source-select-group': { style: { display: '' } },
    'quote-source-pref': { value: '', disabled: false },
    'kyber-only-direct-pools': { checked: false },
    'inverse-toggle-group': { style: { display: '' } },
    'show-inverse-quote': { checked: false },
    'modal-swap-quote': { style: { display: '' } },
    'modal-delete-quote': { style: { display: '' } },
    'quote-request-channel': { value: 'default' }
  };
}

const quoteSettingsRefs = createQuoteSettingsRefs();
applyQuoteSettingsModalWritePlan(quoteSettingsRefs, {
  text: [
    { id: 'modal-title', text: '设置 · Base' },
    { id: 'quote-from-token-line', text: 'GHO 0xaaa' }
  ],
  display: [
    { id: 'quote-token-addresses', display: 'block' },
    { id: 'modal-swap-quote', display: 'none' }
  ],
  disabled: [
    { id: 'quote-source-pref', disabled: true }
  ],
  value: [
    { id: 'quote-source-pref', value: 'LI.FI' }
  ],
  checked: [
    { id: 'kyber-only-direct-pools', checked: true },
    { id: 'show-inverse-quote', checked: true }
  ]
});
assert.strictEqual(quoteSettingsRefs['modal-title'].textContent, '设置 · Base');
assert.strictEqual(quoteSettingsRefs['quote-from-token-line'].textContent, 'GHO 0xaaa');
assert.strictEqual(quoteSettingsRefs['quote-token-addresses'].style.display, 'block');
assert.strictEqual(quoteSettingsRefs['modal-swap-quote'].style.display, 'none');
assert.strictEqual(quoteSettingsRefs['quote-source-pref'].disabled, true);
assert.strictEqual(quoteSettingsRefs['quote-source-pref'].value, 'LI.FI');
assert.strictEqual(quoteSettingsRefs['kyber-only-direct-pools'].checked, true);
assert.strictEqual(quoteSettingsRefs['show-inverse-quote'].checked, true);

assert.deepStrictEqual(readQuoteSettingsFormValues(quoteSettingsRefs), {
  sourceValue: 'LI.FI',
  kyberOnlyDirectPools: true,
  showInverse: true,
  requestChannelId: 'default'
});

const settingsIntervalRefs = {
  'setting-kyber-interval': { value: '100' },
  'setting-zerox-interval': { value: '200' }
};
applySettingsIntervalWritePlan(settingsIntervalRefs, [
  { id: 'setting-kyber-interval', value: 171 },
  { id: 'setting-zerox-interval', value: 111 },
  { id: 'missing-interval', value: 999 }
]);
assert.strictEqual(settingsIntervalRefs['setting-kyber-interval'].value, 171);
assert.strictEqual(settingsIntervalRefs['setting-zerox-interval'].value, 111);

assert.deepStrictEqual(readSettingsIntervalFormValues(settingsIntervalRefs, {
  readSettingsIntervalFormValues: ({ readValue }) => ({
    kyber: readValue('setting-kyber-interval'),
    zerox: readValue('setting-zerox-interval'),
    missing: readValue('missing-interval')
  })
}), {
  kyber: 171,
  zerox: 111,
  missing: ''
});

let addCategoryFocusCount = 0;
const addCategoryRefs = {
  modal: { classList: createClassList([]) },
  'add-category-name': {
    value: 'stale name',
    focus() {
      addCategoryFocusCount += 1;
    }
  }
};
openAddCategoryModal(addCategoryRefs);
assert.strictEqual(addCategoryRefs['add-category-name'].value, '');
assert.strictEqual(addCategoryRefs.modal.classList.contains('visible'), true);
assert.strictEqual(addCategoryFocusCount, 1);
assert.deepStrictEqual(readAddCategoryFormValues(addCategoryRefs, {
  readAddCategoryFormValues: ({ readValue }) => ({
    name: readValue('add-category-name'),
    missing: readValue('missing-input')
  })
}), {
  name: '',
  missing: ''
});
closeAddCategoryModal(addCategoryRefs);
assert.strictEqual(addCategoryRefs.modal.classList.contains('visible'), false);

const confirmRefs = {
  modal: { classList: createClassList([]) },
  message: { textContent: '' }
};
showConfirmModal(confirmRefs, '确定删除此报价吗？');
assert.strictEqual(confirmRefs.message.textContent, '确定删除此报价吗？');
assert.strictEqual(confirmRefs.modal.classList.contains('visible'), true);
closeConfirmModal(confirmRefs);
assert.strictEqual(confirmRefs.modal.classList.contains('visible'), false);
