const assert = require('assert');

const {
  createDashboardAppRefGroups
} = require('../src/app/dashboard-app-ref-groups');

function ref(id) {
  return { id };
}

const refs = {
  addCategoryBtn: ref('addCategoryBtn'),
  addCategoryModal: ref('addCategoryModal'),
  addCategoryModalRefs: ref('addCategoryModalRefs'),
  addQuoteChainSelect: ref('addQuoteChainSelect'),
  addQuoteAmountInput: ref('addQuoteAmountInput'),
  addQuoteFromInput: ref('addQuoteFromInput'),
  addQuoteModal: ref('addQuoteModal'),
  addQuoteModalRefs: ref('addQuoteModalRefs'),
  addQuoteSymbolInput: ref('addQuoteSymbolInput'),
  addQuoteToChainSelect: ref('addQuoteToChainSelect'),
  addQuoteToInput: ref('addQuoteToInput'),
  alertLogContent: ref('alertLogContent'),
  alertLogHeader: ref('alertLogHeader'),
  alertLogLogTab: ref('alertLogLogTab'),
  alertLogMinBtn: ref('alertLogMinBtn'),
  alertLogMutedContent: ref('alertLogMutedContent'),
  alertLogMutedLogContent: ref('alertLogMutedLogContent'),
  alertLogMutedLogTab: ref('alertLogMutedLogTab'),
  alertLogMutedTab: ref('alertLogMutedTab'),
  alertLogSettingsContent: ref('alertLogSettingsContent'),
  alertLogSettingsTab: ref('alertLogSettingsTab'),
  alertLogWindow: ref('alertLogWindow'),
  arbDetailChartAutoRefreshToggle: ref('arbDetailChartAutoRefreshToggle'),
  arbDetailChartLink: ref('arbDetailChartLink'),
  arbDetailChartPreview: ref('arbDetailChartPreview'),
  arbDetailCloseBtn: ref('arbDetailCloseBtn'),
  arbDetailGrid: ref('arbDetailGrid'),
  arbDetailMultiLinksBtn: ref('arbDetailMultiLinksBtn'),
  arbDetailModal: ref('arbDetailModal'),
  arbDetailProfitPreview: ref('arbDetailProfitPreview'),
  arbDetailSubtitle: ref('arbDetailSubtitle'),
  arbGlobalChainFilterInput: ref('arbGlobalChainFilterInput'),
  arbGlobalFilterClearBtn: ref('arbGlobalFilterClearBtn'),
  arbGlobalFilterElements: ref('arbGlobalFilterElements'),
  arbGlobalFilterInput: ref('arbGlobalFilterInput'),
  arbGlobalIncludeFilterInput: ref('arbGlobalIncludeFilterInput'),
  arbGlobalTwoLegOnlyInput: ref('arbGlobalTwoLegOnlyInput'),
  arbPathContent: ref('arbPathContent'),
  arbPathHeader: ref('arbPathHeader'),
  arbPathMinBtn: ref('arbPathMinBtn'),
  arbPathWindow: ref('arbPathWindow'),
  audioNoticeEl: ref('audioNoticeEl'),
  confirmCancelBtn: ref('confirmCancelBtn'),
  confirmModal: ref('confirmModal'),
  confirmModalRefs: ref('confirmModalRefs'),
  confirmOkBtn: ref('confirmOkBtn'),
  copyToast: ref('copyToast'),
  dashboardEl: ref('dashboardEl'),
  globalTooltip: ref('globalTooltip'),
  manualSaveBtn: ref('manualSaveBtn'),
  manualSaveText: ref('manualSaveText'),
  pathAlertSound: ref('pathAlertSound'),
  quoteRequestChannelSelect: ref('quoteRequestChannelSelect'),
  quoteRunStateTag: ref('quoteRunStateTag'),
  quoteSettingsModal: ref('quoteSettingsModal'),
  quoteSettingsModalElements: ref('quoteSettingsModalElements'),
  quoteSourceSelect: ref('quoteSourceSelect'),
  quoteSpreadContent: ref('quoteSpreadContent'),
  quoteSpreadHeader: ref('quoteSpreadHeader'),
  quoteSpreadMinBtn: ref('quoteSpreadMinBtn'),
  quoteSpreadWindow: ref('quoteSpreadWindow'),
  settingsBtn: ref('settingsBtn'),
  settingsCancelBtn: ref('settingsCancelBtn'),
  settingsIntervalInputRefs: ref('settingsIntervalInputRefs'),
  settingsModal: ref('settingsModal'),
  settingsSaveBtn: ref('settingsSaveBtn'),
  themeToggleBtn: ref('themeToggleBtn'),
  toggleAlertLogBtn: ref('toggleAlertLogBtn'),
  toggleArbBtn: ref('toggleArbBtn'),
  toggleDataTerminalBtn: ref('toggleDataTerminalBtn'),
  toggleMultiChannelBtn: ref('toggleMultiChannelBtn'),
  toggleQuoteDisplayBtn: ref('toggleQuoteDisplayBtn'),
  toggleSpreadBtn: ref('toggleSpreadBtn'),
  viewArbBtn: ref('viewArbBtn'),
  viewDashboardBtn: ref('viewDashboardBtn')
};
const bodyEl = ref('body');

const groups = createDashboardAppRefGroups({ refs, bodyEl });

assert.strictEqual(groups.shell.bodyEl, bodyEl);
assert.strictEqual(groups.shell.themeToggleBtn, refs.themeToggleBtn);
assert.strictEqual(groups.shell.settingsIntervalInputRefs, refs.settingsIntervalInputRefs);
assert.strictEqual(groups.shell.toggleMultiChannelBtn, refs.toggleMultiChannelBtn);

assert.strictEqual(groups.workspace.copyToast, refs.copyToast);
assert.strictEqual(groups.workspace.detail.multiLinksButton, refs.arbDetailMultiLinksBtn);
assert.strictEqual(groups.workspace.arbPanel.arbPathWindow, refs.arbPathWindow);
assert.strictEqual(groups.workspace.arbPanel.arbGlobalFilterElements, refs.arbGlobalFilterElements);
assert.strictEqual(groups.workspace.alert.alertLogSettingsContent, refs.alertLogSettingsContent);
assert.strictEqual(groups.workspace.detail.chartAutoRefreshToggle, refs.arbDetailChartAutoRefreshToggle);
assert.strictEqual(groups.workspace.detail.quoteRunStateTag, refs.quoteRunStateTag);
assert.strictEqual(groups.workspace.viewMode.viewDashboardBtn, refs.viewDashboardBtn);
assert.strictEqual(groups.workspace.quoteSpread.toggleButton, refs.toggleSpreadBtn);

assert.strictEqual(groups.board.addCategoryModal, refs.addCategoryModal);
assert.deepStrictEqual(groups.board.addQuoteInputs, [
  refs.addQuoteFromInput,
  refs.addQuoteToInput,
  refs.addQuoteSymbolInput,
  refs.addQuoteAmountInput
]);
assert.strictEqual(groups.board.quoteSettingsModalElements, refs.quoteSettingsModalElements);

assert.strictEqual(groups.lifecycle.dashboardEl, refs.dashboardEl);
assert.strictEqual(groups.lifecycle.alertLogMutedLogContent, refs.alertLogMutedLogContent);
assert.strictEqual(groups.lifecycle.toggleMultiChannelBtn, refs.toggleMultiChannelBtn);
