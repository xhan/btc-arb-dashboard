(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardAppRefGroups = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardAppRefGroups = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardAppRefGroups(options = {}) {
    const refs = options.refs || {};
    return {
      shell: {
        bodyEl: options.bodyEl,
        themeToggleBtn: refs.themeToggleBtn,
        manualSaveBtn: refs.manualSaveBtn,
        manualSaveText: refs.manualSaveText,
        settingsBtn: refs.settingsBtn,
        settingsCancelBtn: refs.settingsCancelBtn,
        settingsSaveBtn: refs.settingsSaveBtn,
        settingsModal: refs.settingsModal,
        settingsIntervalInputRefs: refs.settingsIntervalInputRefs,
        toggleMultiChannelBtn: refs.toggleMultiChannelBtn,
        copyToast: refs.copyToast
      },
      workspace: {
        copyToast: refs.copyToast,
        globalTooltip: refs.globalTooltip,
        toggleQuoteDisplayBtn: refs.toggleQuoteDisplayBtn,
        arbPanel: {
          arbPathWindow: refs.arbPathWindow,
          arbPathContent: refs.arbPathContent,
          arbPathHeader: refs.arbPathHeader,
          arbGlobalFilterInput: refs.arbGlobalFilterInput,
          arbGlobalChainFilterInput: refs.arbGlobalChainFilterInput,
          arbGlobalIncludeFilterInput: refs.arbGlobalIncludeFilterInput,
          arbGlobalTwoLegOnlyInput: refs.arbGlobalTwoLegOnlyInput,
          arbGlobalFilterClearBtn: refs.arbGlobalFilterClearBtn,
          arbGlobalFilterElements: refs.arbGlobalFilterElements
        },
        fixedPathActions: refs.arbFixedPathActionRefs,
        alert: {
          alertLogWindow: refs.alertLogWindow,
          alertLogLogTab: refs.alertLogLogTab,
          alertLogMutedLogTab: refs.alertLogMutedLogTab,
          alertLogMutedTab: refs.alertLogMutedTab,
          alertLogSettingsTab: refs.alertLogSettingsTab,
          alertLogContent: refs.alertLogContent,
          alertLogMutedLogContent: refs.alertLogMutedLogContent,
          alertLogMutedContent: refs.alertLogMutedContent,
          alertLogSettingsContent: refs.alertLogSettingsContent,
          audioNoticeEl: refs.audioNoticeEl,
          pathAlertSound: refs.pathAlertSound
        },
        detail: {
          modal: refs.arbDetailModal,
          closeButton: refs.arbDetailCloseBtn,
          multiLinksButton: refs.arbDetailMultiLinksBtn,
          chartLink: refs.arbDetailChartLink,
          chartAutoRefreshToggle: refs.arbDetailChartAutoRefreshToggle,
          subtitle: refs.arbDetailSubtitle,
          chartPreview: refs.arbDetailChartPreview,
          profitPreview: refs.arbDetailProfitPreview,
          grid: refs.arbDetailGrid,
          quoteRunStateTag: refs.quoteRunStateTag
        },
        viewMode: {
          dashboardEl: refs.dashboardEl,
          addCategoryBtn: refs.addCategoryBtn,
          arbPathWindow: refs.arbPathWindow,
          viewArbBtn: refs.viewArbBtn,
          viewDashboardBtn: refs.viewDashboardBtn
        },
        quoteSpread: {
          window: refs.quoteSpreadWindow,
          header: refs.quoteSpreadHeader,
          minButton: refs.quoteSpreadMinBtn,
          toggleButton: refs.toggleSpreadBtn,
          content: refs.quoteSpreadContent
        }
      },
      board: {
        addCategoryModal: refs.addCategoryModal,
        addCategoryModalRefs: refs.addCategoryModalRefs,
        addQuoteChainSelect: refs.addQuoteChainSelect,
        addQuoteInputs: [refs.addQuoteFromInput, refs.addQuoteToInput, refs.addQuoteSymbolInput, refs.addQuoteAmountInput],
        addQuoteModal: refs.addQuoteModal,
        addQuoteModalRefs: refs.addQuoteModalRefs,
        addQuoteToChainSelect: refs.addQuoteToChainSelect,
        confirmModalRefs: refs.confirmModalRefs,
        dashboardEl: refs.dashboardEl,
        quoteRequestChannelSelect: refs.quoteRequestChannelSelect,
        quoteSettingsModal: refs.quoteSettingsModal,
        quoteSettingsModalElements: refs.quoteSettingsModalElements,
        quoteSourceSelect: refs.quoteSourceSelect
      },
      lifecycle: {
        dashboardEl: refs.dashboardEl,
        addCategoryBtn: refs.addCategoryBtn,
        audioNoticeEl: refs.audioNoticeEl,
        manualSaveBtn: refs.manualSaveBtn,
        themeToggleBtn: refs.themeToggleBtn,
        confirmOkBtn: refs.confirmOkBtn,
        confirmCancelBtn: refs.confirmCancelBtn,
        confirmModal: refs.confirmModal,
        confirmModalRefs: refs.confirmModalRefs,
        alertLogWindow: refs.alertLogWindow,
        alertLogHeader: refs.alertLogHeader,
        alertLogMinBtn: refs.alertLogMinBtn,
        alertLogMutedLogContent: refs.alertLogMutedLogContent,
        arbPathWindow: refs.arbPathWindow,
        arbPathHeader: refs.arbPathHeader,
        arbPathMinBtn: refs.arbPathMinBtn,
        toggleArbBtn: refs.toggleArbBtn,
        toggleQuoteDisplayBtn: refs.toggleQuoteDisplayBtn,
        toggleDataTerminalBtn: refs.toggleDataTerminalBtn,
        toggleAlertLogBtn: refs.toggleAlertLogBtn,
        toggleMultiChannelBtn: refs.toggleMultiChannelBtn
      }
    };
  }

  return {
    createDashboardAppRefGroups
  };
});
