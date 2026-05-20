(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardBoardRuntime = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardBoardRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardBoardRuntime(options = {}) {
    const refs = options.refs || {};
    const shared = options.shared || {};
    const actionOptions = options.actionOptions || {};
    const viewOptions = options.viewOptions || {};
    const formOptions = options.formOptions || {};
    const domRenderUtils = shared.domRenderUtils || actionOptions.domRenderUtils || null;
    const getRequestChannelOptions = typeof options.getRequestChannelOptions === 'function'
      ? options.getRequestChannelOptions
      : () => ({});
    let viewRenderRuntime = null;
    const dashboardInteractionDeferralRuntime = (
      domRenderUtils && typeof domRenderUtils.createRenderInteractionDeferralRuntime === 'function'
    )
      ? domRenderUtils.createRenderInteractionDeferralRuntime({
        getTarget: () => refs.dashboardEl,
        setTimeout: options.setTimeout,
        clearTimeout: options.clearTimeout,
        onIdle: () => {
          if (viewRenderRuntime && typeof viewRenderRuntime.ensureRendered === 'function') {
            viewRenderRuntime.ensureRendered();
          }
        }
      })
      : null;

    function shouldDeferDashboardRender() {
      return Boolean(
        dashboardInteractionDeferralRuntime
        && typeof dashboardInteractionDeferralRuntime.shouldDeferRender === 'function'
        && dashboardInteractionDeferralRuntime.shouldDeferRender()
      );
    }

    function bindDashboardInteractionDeferral() {
      if (
        dashboardInteractionDeferralRuntime
        && typeof dashboardInteractionDeferralRuntime.bind === 'function'
      ) {
        dashboardInteractionDeferralRuntime.bind();
      }
    }

    const dashboardActionController = options.dashboardActionControllerUtils.createDashboardActionController({
      ...shared,
      ...actionOptions,
      addCategoryModalRefs: refs.addCategoryModalRefs,
      addQuoteModal: refs.addQuoteModal,
      addQuoteModalSelectionRuntime: options.addQuoteModalSelectionRuntime,
      confirmActionRuntime: options.confirmActionRuntime,
      confirmModalRefs: refs.confirmModalRefs,
      quoteSettingsModal: refs.quoteSettingsModal,
      quoteSettingsModalElements: refs.quoteSettingsModalElements,
      quoteSettingsSelectionRuntime: options.quoteSettingsSelectionRuntime,
      getRequestChannelOptions
    });
    const {
      closeAddCategoryModal,
      closeQuoteSettingsModal,
      deleteCategoryFromDashboard,
      deleteQuoteFromCategory,
      handleDashboardClick,
      handleDashboardInput,
      openAddCategoryModal,
      setQuotePausedState,
      showConfirmation,
      swapQuoteTokens,
      syncKyberExcludedSourcesControl,
      toggleCategoryPause,
      toggleQuotePause,
      updateCategoryPauseButtonState
    } = dashboardActionController;

    const dashboardViewController = options.dashboardViewControllerUtils.createDashboardViewController({
      ...shared,
      ...viewOptions,
      dashboardEl: refs.dashboardEl,
      getRequestChannelOptions
    });
    const {
      createCategoryModule,
      createQuoteItem,
      renderDashboard
    } = dashboardViewController;

    viewRenderRuntime = options.dashboardViewModeControllerUtils.createDashboardViewRenderRuntime({
      activeMode: options.dashboardViewModeControllerUtils.APP_VIEW_DASHBOARD,
      getMode: () => options.dashboardViewModeController && options.dashboardViewModeController.getMode(),
      render: renderDashboard,
      shouldDeferRender: shouldDeferDashboardRender
    });
    bindDashboardInteractionDeferral();
    if (options.dashboardViewRenderRuntimeRef && typeof options.dashboardViewRenderRuntimeRef.set === 'function') {
      options.dashboardViewRenderRuntimeRef.set(viewRenderRuntime);
    }

    const dashboardFormController = options.dashboardFormControllerUtils.createDashboardFormController({
      ...shared,
      ...formOptions,
      addCategoryModal: refs.addCategoryModal,
      addCategoryModalRefs: refs.addCategoryModalRefs,
      addQuoteChainSelect: refs.addQuoteChainSelect,
      addQuoteInputs: refs.addQuoteInputs,
      addQuoteModal: refs.addQuoteModal,
      addQuoteModalRefs: refs.addQuoteModalRefs,
      addQuoteModalSelectionRuntime: options.addQuoteModalSelectionRuntime,
      addQuoteToChainSelect: refs.addQuoteToChainSelect,
      closeAddCategoryModal,
      closeQuoteSettingsModal,
      createCategoryModule,
      createQuoteItem,
      dashboardEl: refs.dashboardEl,
      deleteQuoteFromCategory,
      quoteRequestChannelSelect: refs.quoteRequestChannelSelect,
      quoteSettingsModal: refs.quoteSettingsModal,
      quoteSettingsModalElements: refs.quoteSettingsModalElements,
      quoteSettingsSelectionRuntime: options.quoteSettingsSelectionRuntime,
      quoteSourceSelect: refs.quoteSourceSelect,
      showConfirmation,
      swapQuoteTokens,
      syncKyberExcludedSourcesControl,
      updateCategoryPauseButtonState
    });

    return {
      closeAddCategoryModal,
      closeQuoteSettingsModal,
      dashboardActionController,
      dashboardFormController,
      dashboardViewController,
      deleteCategoryFromDashboard,
      deleteQuoteFromCategory,
      handleDashboardClick,
      handleDashboardInput,
      openAddCategoryModal,
      renderDashboard,
      setQuotePausedState,
      showConfirmation,
      swapQuoteTokens,
      syncKyberExcludedSourcesControl,
      toggleCategoryPause,
      toggleQuotePause,
      updateCategoryPauseButtonState,
      viewRenderRuntime
    };
  }

  return {
    createDashboardBoardRuntime
  };
});
