(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardDomRefs = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardDomRefs = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getById(documentImpl, id) {
    return documentImpl && typeof documentImpl.getElementById === 'function'
      ? documentImpl.getElementById(id)
      : null;
  }

  function createDashboardDomRefs(documentImpl) {
    const dashboardEl = getById(documentImpl, 'dashboard');
    const addCategoryBtn = getById(documentImpl, 'add-category-btn');
    const alertLogWindow = getById(documentImpl, 'alert-log-window');
    const alertLogHeader = getById(documentImpl, 'alert-log-header');
    const alertLogMinBtn = getById(documentImpl, 'alert-log-min-btn');
    const alertLogLogTab = getById(documentImpl, 'alert-log-log-tab');
    const alertLogMutedLogTab = getById(documentImpl, 'alert-log-muted-log-tab');
    const alertLogMutedTab = getById(documentImpl, 'alert-log-muted-tab');
    const alertLogSettingsTab = getById(documentImpl, 'alert-log-settings-tab');
    const alertLogContent = getById(documentImpl, 'alert-log-content');
    const alertLogMutedLogContent = getById(documentImpl, 'alert-log-muted-log-content');
    const alertLogMutedContent = getById(documentImpl, 'alert-log-muted-content');
    const alertLogSettingsContent = getById(documentImpl, 'alert-log-settings-content');
    const pathAlertSound = getById(documentImpl, 'path-alert-sound');
    const viewArbBtn = getById(documentImpl, 'view-arb-btn');
    const viewDashboardBtn = getById(documentImpl, 'view-dashboard-btn');
    const themeToggleBtn = getById(documentImpl, 'theme-toggle-btn');
    const audioNoticeEl = getById(documentImpl, 'audio-notice');
    const quoteSettingsModal = getById(documentImpl, 'quote-settings-modal');
    const modalSwapQuoteBtn = getById(documentImpl, 'modal-swap-quote');
    const modalDeleteQuoteBtn = getById(documentImpl, 'modal-delete-quote');
    const modalTitleEl = getById(documentImpl, 'modal-title');
    const modalSubtitleEl = getById(documentImpl, 'modal-subtitle');
    const quoteTokenAddressesEl = getById(documentImpl, 'quote-token-addresses');
    const quoteFromTokenLineEl = getById(documentImpl, 'quote-from-token-line');
    const quoteToTokenLineEl = getById(documentImpl, 'quote-to-token-line');
    const quoteSourceSelect = getById(documentImpl, 'quote-source-pref');
    const quoteSourceGroup = getById(documentImpl, 'source-select-group');
    const kyberExcludedSourcesGroup = getById(documentImpl, 'kyber-excluded-sources-group');
    const kyberExcludedSourcesInput = getById(documentImpl, 'kyber-excluded-sources');
    const inverseToggleGroup = getById(documentImpl, 'inverse-toggle-group');
    const inverseCheckbox = getById(documentImpl, 'show-inverse-quote');
    const manualSaveBtn = getById(documentImpl, 'manual-save-btn');
    const manualSaveText = getById(documentImpl, 'manual-save-text');
    const quoteRunStateTag = getById(documentImpl, 'quote-run-state-tag');
    const settingsBtn = getById(documentImpl, 'global-settings-btn');
    const settingsSaveBtn = getById(documentImpl, 'settings-save');
    const settingsCancelBtn = getById(documentImpl, 'settings-cancel');
    const settingsModal = getById(documentImpl, 'settings-modal');
    const addQuoteModal = getById(documentImpl, 'add-quote-modal');
    const addQuoteChainSelect = getById(documentImpl, 'add-quote-chain');
    const addQuoteToChainSelect = getById(documentImpl, 'add-quote-to-chain');
    const addQuoteToChainGroup = getById(documentImpl, 'add-quote-to-chain-group');
    const addQuotePairFields = getById(documentImpl, 'add-quote-pair-fields');
    const addQuoteSymbolField = getById(documentImpl, 'add-quote-symbol-field');
    const addQuoteFromInput = getById(documentImpl, 'add-quote-from');
    const addQuoteToInput = getById(documentImpl, 'add-quote-to');
    const addQuoteSymbolInput = getById(documentImpl, 'add-quote-symbol');
    const addQuoteSaveBtn = getById(documentImpl, 'add-quote-save');
    const confirmModal = getById(documentImpl, 'confirm-modal');
    const confirmMessageEl = getById(documentImpl, 'confirm-message');
    const confirmOkBtn = getById(documentImpl, 'confirm-ok');
    const confirmCancelBtn = getById(documentImpl, 'confirm-cancel');
    const addCategoryModal = getById(documentImpl, 'add-category-modal');
    const addCategoryNameInput = getById(documentImpl, 'add-category-name');
    const globalTooltip = getById(documentImpl, 'global-tooltip');
    const copyToast = getById(documentImpl, 'copy-toast');
    const arbPathWindow = getById(documentImpl, 'arb-path-window');
    const arbPathContent = getById(documentImpl, 'arb-path-content');
    const arbGlobalFilterInput = getById(documentImpl, 'arb-global-filter-input');
    const arbGlobalChainFilterInput = getById(documentImpl, 'arb-global-chain-filter-input');
    const arbGlobalIncludeFilterInput = getById(documentImpl, 'arb-global-include-filter-input');
    const arbGlobalTwoLegOnlyInput = getById(documentImpl, 'arb-global-two-leg-only');
    const arbGlobalFilterClearBtn = getById(documentImpl, 'arb-global-filter-clear-btn');
    const arbPathHeader = getById(documentImpl, 'arb-path-header');
    const arbPathMinBtn = getById(documentImpl, 'arb-path-min-btn');
    const toggleQuoteDisplayBtn = getById(documentImpl, 'toggle-quote-display-btn');
    const toggleDataTerminalBtn = getById(documentImpl, 'toggle-data-terminal-btn');
    const toggleSpreadBtn = getById(documentImpl, 'toggle-spread-btn');
    const toggleArbBtn = getById(documentImpl, 'toggle-arb-btn');
    const toggleAlertLogBtn = getById(documentImpl, 'toggle-alert-log-btn');
    const toggleMultiChannelBtn = getById(documentImpl, 'toggle-multi-channel-btn');
    const quoteSpreadWindow = getById(documentImpl, 'quote-spread-window');
    const quoteSpreadHeader = getById(documentImpl, 'quote-spread-header');
    const quoteSpreadMinBtn = getById(documentImpl, 'quote-spread-min-btn');
    const quoteSpreadContent = getById(documentImpl, 'quote-spread-content');
    const arbDetailModal = getById(documentImpl, 'arb-detail-modal');
    const arbDetailCloseBtn = getById(documentImpl, 'arb-detail-close-btn');
    const arbDetailMultiLinksBtn = getById(documentImpl, 'arb-detail-multi-links-btn');
    const arbDetailChartLink = getById(documentImpl, 'arb-detail-chart-link');
    const arbDetailChartAutoRefreshToggle = getById(documentImpl, 'arb-detail-chart-auto-refresh');
    const arbDetailSubtitle = getById(documentImpl, 'arb-detail-subtitle');
    const arbDetailChartPreview = getById(documentImpl, 'arb-detail-chart-preview');
    const arbDetailProfitPreview = getById(documentImpl, 'arb-detail-profit-preview');
    const arbDetailGrid = getById(documentImpl, 'arb-detail-grid');
    const requestChannelSelectGroup = getById(documentImpl, 'request-channel-select-group');
    const quoteRequestChannelSelect = getById(documentImpl, 'quote-request-channel');

    return {
      dashboardEl,
      addCategoryBtn,
      alertLogWindow,
      alertLogHeader,
      alertLogMinBtn,
      alertLogLogTab,
      alertLogMutedLogTab,
      alertLogMutedTab,
      alertLogSettingsTab,
      alertLogContent,
      alertLogMutedLogContent,
      alertLogMutedContent,
      alertLogSettingsContent,
      pathAlertSound,
      viewArbBtn,
      viewDashboardBtn,
      themeToggleBtn,
      audioNoticeEl,
      quoteSettingsModal,
      modalSwapQuoteBtn,
      modalDeleteQuoteBtn,
      modalTitleEl,
      modalSubtitleEl,
      quoteTokenAddressesEl,
      quoteFromTokenLineEl,
      quoteToTokenLineEl,
      quoteSourceSelect,
      quoteSourceGroup,
      kyberExcludedSourcesGroup,
      kyberExcludedSourcesInput,
      inverseToggleGroup,
      inverseCheckbox,
      manualSaveBtn,
      manualSaveText,
      quoteRunStateTag,
      settingsBtn,
      settingsSaveBtn,
      settingsCancelBtn,
      settingsModal,
      settingsIntervalInputRefs: {
        'setting-kyber-interval': getById(documentImpl, 'setting-kyber-interval'),
        'setting-zerox-interval': getById(documentImpl, 'setting-zerox-interval'),
        'setting-velora-interval': getById(documentImpl, 'setting-velora-interval'),
        'setting-llama-paraswap-interval': getById(documentImpl, 'setting-llama-paraswap-interval'),
        'setting-lifi-interval': getById(documentImpl, 'setting-lifi-interval'),
        'setting-bybit-interval': getById(documentImpl, 'setting-bybit-interval'),
        'setting-binance-interval': getById(documentImpl, 'setting-binance-interval'),
        'setting-solana-interval': getById(documentImpl, 'setting-solana-interval'),
        'setting-sui-interval': getById(documentImpl, 'setting-sui-interval'),
        'setting-starknet-interval': getById(documentImpl, 'setting-starknet-interval')
      },
      addQuoteModal,
      addQuoteChainSelect,
      addQuoteToChainSelect,
      addQuoteToChainGroup,
      addQuotePairFields,
      addQuoteSymbolField,
      addQuoteFromInput,
      addQuoteToInput,
      addQuoteSymbolInput,
      addQuoteSaveBtn,
      addQuoteModalRefs: {
        modal: addQuoteModal,
        chainSelect: addQuoteChainSelect,
        toChainSelect: addQuoteToChainSelect,
        fromInput: addQuoteFromInput,
        toInput: addQuoteToInput,
        symbolInput: addQuoteSymbolInput,
        toChainGroup: addQuoteToChainGroup,
        pairFields: addQuotePairFields,
        symbolField: addQuoteSymbolField,
        saveButton: addQuoteSaveBtn
      },
      confirmModal,
      confirmMessageEl,
      confirmOkBtn,
      confirmCancelBtn,
      addCategoryModal,
      addCategoryNameInput,
      addCategoryModalRefs: {
        modal: addCategoryModal,
        'add-category-name': addCategoryNameInput
      },
      confirmModalRefs: {
        modal: confirmModal,
        message: confirmMessageEl
      },
      globalTooltip,
      copyToast,
      arbPathWindow,
      arbPathContent,
      arbGlobalFilterInput,
      arbGlobalChainFilterInput,
      arbGlobalIncludeFilterInput,
      arbGlobalTwoLegOnlyInput,
      arbGlobalFilterClearBtn,
      arbGlobalFilterElements: {
        'arb-global-filter-input': arbGlobalFilterInput,
        'arb-global-chain-filter-input': arbGlobalChainFilterInput,
        'arb-global-include-filter-input': arbGlobalIncludeFilterInput,
        'arb-global-two-leg-only': arbGlobalTwoLegOnlyInput,
        'arb-global-filter-clear-btn': arbGlobalFilterClearBtn
      },
      arbPathHeader,
      arbPathMinBtn,
      toggleQuoteDisplayBtn,
      toggleDataTerminalBtn,
      toggleSpreadBtn,
      toggleArbBtn,
      toggleAlertLogBtn,
      toggleMultiChannelBtn,
      quoteSpreadWindow,
      quoteSpreadHeader,
      quoteSpreadMinBtn,
      quoteSpreadContent,
      arbDetailModal,
      arbDetailCloseBtn,
      arbDetailMultiLinksBtn,
      arbDetailChartLink,
      arbDetailChartAutoRefreshToggle,
      arbDetailSubtitle,
      arbDetailChartPreview,
      arbDetailProfitPreview,
      arbDetailGrid,
      requestChannelSelectGroup,
      quoteRequestChannelSelect,
      quoteSettingsModalElements: {
        'modal-title': modalTitleEl,
        'modal-subtitle': modalSubtitleEl,
        'quote-token-addresses': quoteTokenAddressesEl,
        'quote-from-token-line': quoteFromTokenLineEl,
        'quote-to-token-line': quoteToTokenLineEl,
        'source-select-group': quoteSourceGroup,
        'quote-source-pref': quoteSourceSelect,
        'kyber-excluded-sources-group': kyberExcludedSourcesGroup,
        'kyber-excluded-sources': kyberExcludedSourcesInput,
        'inverse-toggle-group': inverseToggleGroup,
        'show-inverse-quote': inverseCheckbox,
        'modal-swap-quote': modalSwapQuoteBtn,
        'modal-delete-quote': modalDeleteQuoteBtn,
        'request-channel-select-group': requestChannelSelectGroup,
        'quote-request-channel': quoteRequestChannelSelect
      }
    };
  }

  return {
    createDashboardDomRefs,
    getById
  };
});
