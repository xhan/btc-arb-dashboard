const assert = require('assert');

const {
  createDashboardAppBoardRuntime
} = require('../src/app/dashboard-app-board-runtime');

let capturedOptions = null;
const boardRuntime = {
  dashboardFormController: { id: 'form-controller' },
  handleDashboardClick: () => 'click',
  handleDashboardInput: () => 'input',
  openAddCategoryModal: () => 'open-category'
};
const dashboardBoardRuntimeUtils = {
  createDashboardBoardRuntime(options) {
    capturedOptions = options;
    return boardRuntime;
  }
};
const modules = {
  getDashboardActionController: () => ({ id: 'action-utils' }),
  getDashboardBoardRuntime: () => dashboardBoardRuntimeUtils,
  getDashboardFormController: () => ({ id: 'form-utils' }),
  getDashboardModalUtils: () => ({ id: 'modal-utils' }),
  getDashboardRenderer: () => ({ id: 'renderer' }),
  getDashboardViewController: () => ({ id: 'view-utils' }),
  getDashboardViewModeController: () => ({ id: 'view-mode-utils' }),
  getArbDetailUtils: () => ({ id: 'arb-detail-utils' }),
  getDexLinkUtils: () => ({ id: 'dex-link-utils' }),
  getPathAlertPageUtils: () => ({ id: 'path-alert-page-utils' }),
  getQuoteDisplayUtils: () => ({ id: 'quote-display-utils' }),
  getQuotePauseUtils: () => ({ id: 'quote-pause-utils' }),
  getRequestChannelUtils: () => ({ id: 'request-channel-utils' })
};
const deps = {
  activeFetchControllerRuntime: { id: 'active-fetch-runtime' },
  addQuoteModalSelectionRuntime: { id: 'add-quote-selection' },
  amountInputDebounceRuntime: { id: 'amount-debounce' },
  closeArbDetailModal: () => {},
  closestEventTarget: () => {},
  confirmActionRuntime: { id: 'confirm-runtime' },
  copyDexLinkFromElement: () => {},
  copyPriceText: () => {},
  dashboardRuntimeUtils: { id: 'dashboard-runtime-utils' },
  dashboardShellRuntime: {
    addQuoteModalSelectionRuntime: { id: 'shell-add-quote-selection' },
    confirmActionRuntime: { id: 'shell-confirm-runtime' },
    quoteSettingsSelectionRuntime: { id: 'shell-quote-settings-selection' },
    requestChannelRuntime: {
      getOptions: () => ({ channels: ['shell'] })
    },
    saveData: () => 'shell-save-data',
    updateRequestChannelTagForQuote: () => 'shell-update-request-channel-tag'
  },
  dashboardViewModeController: { id: 'dashboard-view-mode-controller' },
  dashboardViewRenderRuntimeRef: { id: 'view-render-ref' },
  defaultSourceResolver: () => 'source',
  deleteQuoteMarketState: () => {},
  deleteQuoteUiRuntimeState: () => {},
  documentImpl: { id: 'document' },
  domRenderUtils: { id: 'dom-render-utils' },
  evaluatePathAlertsOnce: () => {},
  formatChainLabel: (chain) => chain,
  getArbDetailState: () => ({ id: 'arb-detail-state' }),
  getCategoryPauseAction: () => 'pause',
  getDashboardState: () => [{ id: 'category' }],
  getInverseQuoteDisplayText: () => 'inverse',
  getQuoteChainDisplayName: () => 'chain',
  getQuoteDisplayText: () => 'display',
  getQuoteMarketState: () => ({ id: 'market' }),
  getRequestChannelOptions: () => ({ channels: [] }),
  handleQuoteHover: () => {},
  isCexOrderbookChain: () => false,
  isCrossChainQuote: () => false,
  isEvmChain: () => true,
  isQuotePaused: () => false,
  logger: { id: 'logger' },
  normalizeChainKey: (chain) => chain,
  quoteSettingsSelectionRuntime: { id: 'quote-settings-selection' },
  quoteStateRuntime: { id: 'quote-state-runtime' },
  queueQuoteRefresh: () => {},
  removeFromQueue: () => {},
  renderDataTerminalPanel: () => {},
  resetQuoteUiRuntimeState: () => {},
  saveData: () => {},
  setQuoteMarketState: () => {},
  shouldQueueInverseFetch: () => true,
  updateAlertSoundState: () => {},
  updateArbPanel: () => {},
  updateRequestChannelTagForQuote: () => {},
  updateSchedulers: () => {},
  windowImpl: { id: 'window' }
};
const refs = {
  addCategoryModal: { id: 'add-category-modal' },
  addCategoryModalRefs: { id: 'add-category-refs' },
  addQuoteChainSelect: { id: 'chain-select' },
  addQuoteInputs: [{ id: 'from' }, { id: 'to' }, { id: 'symbol' }],
  addQuoteModal: { id: 'add-quote-modal' },
  addQuoteModalRefs: { id: 'add-quote-refs' },
  addQuoteToChainSelect: { id: 'to-chain-select' },
  confirmModalRefs: { id: 'confirm-refs' },
  dashboardEl: { id: 'dashboard' },
  quoteRequestChannelSelect: { id: 'request-channel-select' },
  quoteSettingsModal: { id: 'quote-settings-modal' },
  quoteSettingsModalElements: { id: 'quote-settings-elements' },
  quoteSourceSelect: { id: 'quote-source-select' }
};

const runtime = createDashboardAppBoardRuntime({
  modules,
  deps,
  refs
});

assert.strictEqual(runtime.dashboardBoardRuntime, boardRuntime);
assert.strictEqual(runtime.dashboardFormController, boardRuntime.dashboardFormController);
assert.strictEqual(runtime.handleDashboardClick(), 'click');
assert.strictEqual(runtime.handleDashboardInput(), 'input');
assert.strictEqual(runtime.openAddCategoryModal(), 'open-category');
assert.strictEqual(capturedOptions.dashboardActionControllerUtils.id, 'action-utils');
assert.strictEqual(capturedOptions.dashboardFormControllerUtils.id, 'form-utils');
assert.strictEqual(capturedOptions.dashboardViewControllerUtils.id, 'view-utils');
assert.strictEqual(capturedOptions.dashboardViewModeControllerUtils.id, 'view-mode-utils');
assert.strictEqual(capturedOptions.addQuoteModalSelectionRuntime, deps.dashboardShellRuntime.addQuoteModalSelectionRuntime);
assert.strictEqual(capturedOptions.confirmActionRuntime, deps.dashboardShellRuntime.confirmActionRuntime);
assert.strictEqual(capturedOptions.interactionRuntime, deps.interactionRuntime);
assert.strictEqual(capturedOptions.dashboardViewModeController, deps.dashboardViewModeController);
assert.strictEqual(capturedOptions.dashboardViewRenderRuntimeRef, deps.dashboardViewRenderRuntimeRef);
assert.deepStrictEqual(capturedOptions.getRequestChannelOptions(), { channels: ['shell'] });
assert.strictEqual(capturedOptions.refs, refs);
assert.strictEqual(capturedOptions.shared.dashboardModalUtils.id, 'modal-utils');
assert.strictEqual(capturedOptions.shared.dashboardRenderer.id, 'renderer');
assert.strictEqual(capturedOptions.shared.dashboardRuntimeUtils, deps.dashboardRuntimeUtils);
assert.strictEqual(capturedOptions.shared.documentImpl, deps.documentImpl);
assert.deepStrictEqual(capturedOptions.shared.getDashboardState(), [{ id: 'category' }]);
assert.strictEqual(capturedOptions.actionOptions.arbDetailUtils.id, 'arb-detail-utils');
assert.strictEqual(capturedOptions.actionOptions.quotePauseUtils.id, 'quote-pause-utils');
assert.strictEqual(capturedOptions.actionOptions.requestChannelUtils.id, 'request-channel-utils');
assert.strictEqual(capturedOptions.actionOptions.saveData(), 'shell-save-data');
assert.strictEqual(capturedOptions.actionOptions.updateRequestChannelTagForQuote(), 'shell-update-request-channel-tag');
assert.strictEqual(capturedOptions.actionOptions.updateAlertSoundState, deps.updateAlertSoundState);
assert.strictEqual(capturedOptions.viewOptions.dexLinkUtils.id, 'dex-link-utils');
assert.strictEqual(capturedOptions.viewOptions.quoteDisplayUtils.id, 'quote-display-utils');
assert.strictEqual(capturedOptions.viewOptions.logger, deps.logger);
assert.strictEqual(capturedOptions.viewOptions.saveData(), 'shell-save-data');
assert.strictEqual(capturedOptions.formOptions.pathAlertPageUtils.id, 'path-alert-page-utils');
assert.strictEqual(capturedOptions.formOptions.saveData(), 'shell-save-data');
assert.strictEqual(capturedOptions.formOptions.updateRequestChannelTagForQuote(), 'shell-update-request-channel-tag');
assert.strictEqual(capturedOptions.formOptions.windowImpl, deps.windowImpl);
