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
    const interactionSafeRenderer = options.interactionSafeRendererUtils;
    const documentImpl = shared.documentImpl || actionOptions.documentImpl || viewOptions.documentImpl || null;
    const getRequestChannelOptions = typeof options.getRequestChannelOptions === 'function'
      ? options.getRequestChannelOptions
      : () => ({});
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
      getRequestChannelOptions,
      morphDashboard: (target, nextDashboard) => (
        interactionSafeRenderer.morphElementChildren(target, nextDashboard)
      )
    });
    const {
      createCategoryModule,
      createQuoteItem,
      renderDashboard
    } = dashboardViewController;

    const viewRenderRuntime = interactionSafeRenderer.createInteractionSafeViewRuntime({
      activeMode: options.dashboardViewModeControllerUtils.APP_VIEW_DASHBOARD,
      getMode: () => options.dashboardViewModeController && options.dashboardViewModeController.getMode(),
      getTarget: () => refs.dashboardEl,
      render: renderDashboard,
      interactionRuntime: options.interactionRuntime,
      setTimeout: options.setTimeout,
      clearTimeout: options.clearTimeout,
      trackFocus: 'editable',
      releaseTarget: documentImpl,
      releaseEventListenerOptions: { capture: true },
      windowImpl: options.windowImpl
    });
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
