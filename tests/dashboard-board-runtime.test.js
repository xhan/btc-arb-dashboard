const assert = require('assert');

const {
  createDashboardBoardRuntime
} = require('../src/app/dashboard-board-runtime');

const calls = [];
const renderRuntime = { id: 'render-runtime' };
const actionController = {
  closeAddCategoryModal: () => 'close-add-category',
  closeQuoteSettingsModal: () => 'close-quote-settings',
  deleteCategoryFromDashboard: () => 'delete-category',
  deleteQuoteFromCategory: () => 'delete-quote',
  handleDashboardClick: () => 'click',
  handleDashboardInput: () => 'input',
  openAddCategoryModal: () => 'open-add-category',
  setQuotePausedState: () => 'set-paused',
  showConfirmation: () => 'confirm',
  swapQuoteTokens: () => 'swap',
  syncKyberExcludedSourcesControl: () => 'sync-kyber',
  toggleCategoryPause: () => 'toggle-category',
  toggleQuotePause: () => 'toggle-quote',
  updateCategoryPauseButtonState: () => 'update-category'
};
const viewController = {
  createCategoryModule: () => ({ id: 'category-module' }),
  createQuoteItem: () => ({ id: 'quote-item' }),
  renderDashboard: () => 'render-dashboard'
};
const formController = { id: 'form-controller' };
let renderRefValue = null;

const runtime = createDashboardBoardRuntime({
  dashboardActionControllerUtils: {
    createDashboardActionController(options) {
      calls.push(['createAction', options]);
      return actionController;
    }
  },
  dashboardFormControllerUtils: {
    createDashboardFormController(options) {
      calls.push(['createForm', options]);
      return formController;
    }
  },
  dashboardViewControllerUtils: {
    createDashboardViewController(options) {
      calls.push(['createView', options]);
      return viewController;
    }
  },
  dashboardViewModeControllerUtils: {
    APP_VIEW_DASHBOARD: 'dashboard',
    createDashboardViewRenderRuntime(options) {
      calls.push(['createRender', options]);
      return renderRuntime;
    }
  },
  dashboardViewRenderRuntimeRef: {
    set(value) {
      renderRefValue = value;
      calls.push(['setRenderRef', value]);
      return value;
    }
  },
  refs: {
    dashboardEl: { id: 'dashboard' },
    addQuoteInputs: [{ id: 'from' }, { id: 'to' }]
  },
  dashboardViewModeController: { getMode: () => 'dashboard' },
  getRequestChannelOptions: () => ({ channels: [] }),
  shared: {
    documentImpl: { id: 'document' },
    dashboardRuntimeUtils: { id: 'runtime-utils' }
  },
  actionOptions: {
    closeArbDetailModal: () => {},
    queueQuoteRefresh: () => {}
  },
  viewOptions: {
    handleQuoteHover: () => {},
    saveData: () => {}
  },
  formOptions: {
    queueQuoteRefresh: () => {},
    saveData: () => {}
  }
});

assert.strictEqual(runtime.dashboardActionController, actionController);
assert.strictEqual(runtime.dashboardViewController, viewController);
assert.strictEqual(runtime.dashboardFormController, formController);
assert.strictEqual(runtime.renderDashboard(), 'render-dashboard');
assert.strictEqual(runtime.handleDashboardClick(), 'click');
assert.strictEqual(runtime.openAddCategoryModal(), 'open-add-category');
assert.strictEqual(runtime.updateCategoryPauseButtonState(), 'update-category');
assert.strictEqual(renderRefValue, renderRuntime);

const actionOptions = calls.find((call) => call[0] === 'createAction')[1];
const viewOptions = calls.find((call) => call[0] === 'createView')[1];
const renderOptions = calls.find((call) => call[0] === 'createRender')[1];
const formOptions = calls.find((call) => call[0] === 'createForm')[1];

assert.strictEqual(actionOptions.documentImpl.id, 'document');
assert.strictEqual(actionOptions.dashboardRuntimeUtils.id, 'runtime-utils');
assert.deepStrictEqual(actionOptions.getRequestChannelOptions(), { channels: [] });
assert.strictEqual(viewOptions.dashboardEl.id, 'dashboard');
assert.deepStrictEqual(viewOptions.getRequestChannelOptions(), { channels: [] });
assert.strictEqual(renderOptions.activeMode, 'dashboard');
assert.strictEqual(renderOptions.getMode(), 'dashboard');
assert.strictEqual(renderOptions.render(), 'render-dashboard');
assert.deepStrictEqual(formOptions.addQuoteInputs.map((item) => item.id), ['from', 'to']);
assert.strictEqual(formOptions.createCategoryModule, viewController.createCategoryModule);
assert.strictEqual(formOptions.createQuoteItem, viewController.createQuoteItem);
assert.strictEqual(formOptions.closeAddCategoryModal(), 'close-add-category');
assert.strictEqual(formOptions.swapQuoteTokens(), 'swap');
