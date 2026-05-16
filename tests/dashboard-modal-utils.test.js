const assert = require('assert');

const {
  applyAddQuoteFormViewState,
  readAddQuoteFormValues,
  resetAddQuoteModal,
  syncAddQuoteFormControls
} = require('../src/dashboard/dashboard-modal-utils');

function createClassList() {
  const values = new Set(['visible']);
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
