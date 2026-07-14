const assert = require('assert');

const {
  createDashboardDomRefs,
  getById
} = require('../src/app/dashboard-dom-refs');

const elements = new Map();
function makeElement(id) {
  const element = { id };
  elements.set(id, element);
  return element;
}

[
  'dashboard',
  'add-category-btn',
  'alert-log-window',
  'alert-log-header',
  'quote-settings-modal',
  'quote-source-pref',
  'view-arb-btn',
  'view-dashboard-btn',
  'manual-save-btn',
  'setting-kyber-interval',
  'add-quote-modal',
  'add-quote-chain',
  'add-quote-from',
  'add-quote-amount',
  'confirm-modal',
  'confirm-message',
  'arb-global-filter-input',
  'toggle-arb-btn',
  'toggle-spread-btn',
  'quote-spread-window',
  'quote-spread-content',
  'arb-detail-multi-links-btn',
  'arb-detail-grid',
  'quote-request-channel'
].forEach(makeElement);

const documentImpl = {
  getElementById(id) {
    return elements.get(id) || null;
  }
};

assert.strictEqual(getById(documentImpl, 'dashboard'), elements.get('dashboard'));
assert.strictEqual(getById(null, 'dashboard'), null);

const refs = createDashboardDomRefs(documentImpl);
assert.strictEqual(refs.dashboardEl, elements.get('dashboard'));
assert.strictEqual(refs.addCategoryBtn, elements.get('add-category-btn'));
assert.strictEqual(refs.alertLogWindow, elements.get('alert-log-window'));
assert.strictEqual(refs.quoteSettingsModal, elements.get('quote-settings-modal'));
assert.strictEqual(refs.quoteSourceSelect, elements.get('quote-source-pref'));
assert.strictEqual(refs.viewArbBtn, elements.get('view-arb-btn'));
assert.strictEqual(refs.viewDashboardBtn, elements.get('view-dashboard-btn'));
assert.strictEqual(refs.manualSaveBtn, elements.get('manual-save-btn'));
assert.strictEqual(refs.settingsIntervalInputRefs['setting-kyber-interval'], elements.get('setting-kyber-interval'));
assert.strictEqual(refs.addQuoteModalRefs.modal, elements.get('add-quote-modal'));
assert.strictEqual(refs.addQuoteModalRefs.chainSelect, elements.get('add-quote-chain'));
assert.strictEqual(refs.addQuoteModalRefs.fromInput, elements.get('add-quote-from'));
assert.strictEqual(refs.addQuoteModalRefs.amountInput, elements.get('add-quote-amount'));
assert.strictEqual(refs.confirmModalRefs.modal, elements.get('confirm-modal'));
assert.strictEqual(refs.confirmModalRefs.message, elements.get('confirm-message'));
assert.strictEqual(refs.arbGlobalFilterElements['arb-global-filter-input'], elements.get('arb-global-filter-input'));
assert.strictEqual(refs.toggleArbBtn, elements.get('toggle-arb-btn'));
assert.strictEqual(refs.toggleSpreadBtn, elements.get('toggle-spread-btn'));
assert.strictEqual(refs.quoteSpreadWindow, elements.get('quote-spread-window'));
assert.strictEqual(refs.quoteSpreadContent, elements.get('quote-spread-content'));
assert.strictEqual(refs.arbDetailMultiLinksBtn, elements.get('arb-detail-multi-links-btn'));
assert.strictEqual(refs.arbDetailGrid, elements.get('arb-detail-grid'));
assert.strictEqual(refs.quoteSettingsModalElements['quote-request-channel'], elements.get('quote-request-channel'));
