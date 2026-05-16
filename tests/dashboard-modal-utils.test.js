const assert = require('assert');

const {
  applyAddQuoteFormViewState,
  applyKyberDirectPoolsControlVisibility,
  applyQuoteRequestChannelOptionsState,
  applyQuoteSettingsModalWritePlan,
  applySettingsIntervalWritePlan,
  closeAddCategoryModal,
  closeConfirmModal,
  createConfirmActionRuntime,
  createModalSelectionRuntime,
  createSettingsModalRuntime,
  hideModal,
  openAddCategoryModal,
  readAddQuoteFormValues,
  readAddCategoryFormValues,
  readQuoteSettingsFormValues,
  readSettingsIntervalFormValues,
  resetAddQuoteModal,
  showConfirmModal,
  showModal,
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

function createEventTarget() {
  const listeners = {};
  return {
    listeners,
    addEventListener(type, listener) {
      listeners[type] = listener;
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

const genericModal = { classList: createClassList([]) };
showModal(genericModal);
assert.strictEqual(genericModal.classList.contains('visible'), true);
hideModal(genericModal);
assert.strictEqual(genericModal.classList.contains('visible'), false);

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
assert.strictEqual(resetResult, undefined);
assert.strictEqual(resetSyncCount, 1);

const modalSelectionRuntime = createModalSelectionRuntime();
assert.strictEqual(modalSelectionRuntime.get(), null);
assert.strictEqual(modalSelectionRuntime.set('category-1'), 'category-1');
assert.strictEqual(modalSelectionRuntime.get(), 'category-1');
const editingQuote = { categoryId: 'category-1', quote: { id: 'quote-1' } };
assert.strictEqual(modalSelectionRuntime.set(editingQuote), editingQuote);
assert.strictEqual(modalSelectionRuntime.get(), editingQuote);
assert.strictEqual(modalSelectionRuntime.clear(), null);
assert.strictEqual(modalSelectionRuntime.get(), null);

function createQuoteSettingsRefs() {
  return {
    'modal-title': { textContent: '' },
    'modal-subtitle': { textContent: '' },
    'quote-token-addresses': { style: { display: '' } },
    'quote-from-token-line': { textContent: '' },
    'quote-to-token-line': { textContent: '' },
    'source-select-group': { style: { display: '' } },
    'quote-source-pref': { value: '', disabled: false },
    'kyber-direct-pools-group': { style: { display: '' } },
    'kyber-direct-pools-note': { style: { display: '' } },
    'kyber-only-direct-pools': { checked: false },
    'inverse-toggle-group': { style: { display: '' } },
    'show-inverse-quote': { checked: false },
    'modal-swap-quote': { style: { display: '' } },
    'modal-delete-quote': { style: { display: '' } },
    'request-channel-select-group': { style: { display: '' } },
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
assert.strictEqual(applyKyberDirectPoolsControlVisibility(quoteSettingsRefs, true), true);
assert.strictEqual(quoteSettingsRefs['kyber-direct-pools-group'].style.display, 'flex');
assert.strictEqual(quoteSettingsRefs['kyber-direct-pools-note'].style.display, 'block');
assert.strictEqual(applyKyberDirectPoolsControlVisibility(quoteSettingsRefs, false), false);
assert.strictEqual(quoteSettingsRefs['kyber-direct-pools-group'].style.display, 'none');
assert.strictEqual(quoteSettingsRefs['kyber-direct-pools-note'].style.display, 'none');
assert.strictEqual(applyQuoteRequestChannelOptionsState(quoteSettingsRefs, {
  visible: true,
  optionsHtml: '<option value="default">默认通道</option><option value="fast">fast</option>',
  value: 'fast'
}), true);
assert.strictEqual(quoteSettingsRefs['request-channel-select-group'].style.display, 'block');
assert.strictEqual(quoteSettingsRefs['quote-request-channel'].innerHTML, '<option value="default">默认通道</option><option value="fast">fast</option>');
assert.strictEqual(quoteSettingsRefs['quote-request-channel'].value, 'fast');
assert.strictEqual(applyQuoteRequestChannelOptionsState(quoteSettingsRefs, { visible: false }), false);
assert.strictEqual(quoteSettingsRefs['request-channel-select-group'].style.display, 'none');
assert.strictEqual(quoteSettingsRefs['quote-request-channel'].innerHTML, '');
assert.strictEqual(quoteSettingsRefs['quote-request-channel'].value, '');

assert.deepStrictEqual(readQuoteSettingsFormValues(quoteSettingsRefs), {
  sourceValue: 'LI.FI',
  kyberOnlyDirectPools: true,
  showInverse: true,
  requestChannelId: ''
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

const settingsRuntimeModal = { classList: createClassList([]) };
const settingsRuntimeRefs = {
  'setting-kyber-interval': { value: 'stale' },
  'setting-solana-interval': { value: 'stale' }
};
const settingsRuntimeOpenButton = createEventTarget();
const settingsRuntimeCancelButton = createEventTarget();
const settingsRuntimeSaveButton = createEventTarget();
const settingsRuntimeCalls = [];
let settingsRuntimeIntervals = {
  kyber: 170,
  solana: 1300
};
const settingsModalRuntime = createSettingsModalRuntime({
  openButton: settingsRuntimeOpenButton,
  cancelButton: settingsRuntimeCancelButton,
  saveButton: settingsRuntimeSaveButton,
  modal: settingsRuntimeModal,
  intervalInputRefs: settingsRuntimeRefs,
  defaultIntervals: {
    kyber: 200,
    solana: 1400
  },
  getIntervals: () => settingsRuntimeIntervals,
  setIntervals(nextIntervals) {
    settingsRuntimeIntervals = nextIntervals;
    settingsRuntimeCalls.push(['setIntervals', nextIntervals]);
  },
  buildSettingsIntervalWritePlan(intervals) {
    settingsRuntimeCalls.push(['writePlan', intervals]);
    return [
      { id: 'setting-kyber-interval', value: String(intervals.kyber) },
      { id: 'setting-solana-interval', value: String(intervals.solana) }
    ];
  },
  readSettingsIntervalFormValues: ({ readValue }) => ({
    kyber: Number(readValue('setting-kyber-interval')),
    solana: Number(readValue('setting-solana-interval'))
  }),
  buildSettingsIntervalsFromFormValues(values, defaults) {
    settingsRuntimeCalls.push(['buildIntervals', values, defaults]);
    return {
      kyber: Number.isFinite(values.kyber) ? values.kyber : defaults.kyber,
      solana: Number.isFinite(values.solana) ? values.solana : defaults.solana
    };
  },
  onSave(nextIntervals) {
    settingsRuntimeCalls.push(['onSave', nextIntervals]);
  },
  showSaveFeedback(nextIntervals) {
    settingsRuntimeCalls.push(['feedback', nextIntervals]);
  }
});
assert.deepStrictEqual(settingsModalRuntime.bind(), {
  openButton: true,
  cancelButton: true,
  saveButton: true
});
settingsRuntimeOpenButton.listeners.click();
assert.strictEqual(settingsRuntimeRefs['setting-kyber-interval'].value, '170');
assert.strictEqual(settingsRuntimeRefs['setting-solana-interval'].value, '1300');
assert.strictEqual(settingsRuntimeModal.classList.contains('visible'), true);
settingsRuntimeRefs['setting-kyber-interval'].value = '210';
settingsRuntimeRefs['setting-solana-interval'].value = '1500';
assert.deepStrictEqual(settingsRuntimeSaveButton.listeners.click(), {
  kyber: 210,
  solana: 1500
});
assert.deepStrictEqual(settingsRuntimeIntervals, {
  kyber: 210,
  solana: 1500
});
assert.strictEqual(settingsRuntimeModal.classList.contains('visible'), false);
settingsRuntimeOpenButton.listeners.click();
settingsRuntimeCancelButton.listeners.click();
assert.strictEqual(settingsRuntimeModal.classList.contains('visible'), false);
assert.deepStrictEqual(settingsRuntimeCalls.map((call) => call[0]), [
  'writePlan',
  'buildIntervals',
  'setIntervals',
  'onSave',
  'feedback',
  'writePlan'
]);
assert.deepStrictEqual(createSettingsModalRuntime().bind(), {});

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

const confirmRuntimeCalls = [];
const confirmActionRuntime = createConfirmActionRuntime({
  showConfirmModal(refsToShow, message) {
    confirmRuntimeCalls.push(['show', refsToShow, message]);
  },
  closeConfirmModal(refsToClose) {
    confirmRuntimeCalls.push(['close', refsToClose]);
  }
});
let confirmActionCount = 0;
confirmActionRuntime.show(confirmRefs, '删除确认', () => {
  confirmActionCount += 1;
});
assert.deepStrictEqual(confirmRuntimeCalls, [['show', confirmRefs, '删除确认']]);
confirmActionRuntime.confirm();
assert.strictEqual(confirmActionCount, 1);
confirmActionRuntime.close(confirmRefs);
assert.deepStrictEqual(confirmRuntimeCalls, [
  ['show', confirmRefs, '删除确认'],
  ['close', confirmRefs]
]);
confirmActionRuntime.confirm();
assert.strictEqual(confirmActionCount, 1);
