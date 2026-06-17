(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.DashboardFormController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardFormController(deps = {}) {
    function getDashboardState() {
      return typeof deps.getDashboardState === 'function' ? deps.getDashboardState() : [];
    }

    function getNowMs() {
      return typeof deps.nowMs === 'function' ? deps.nowMs() : Date.now();
    }

    function syncAddQuoteFormControls() {
      deps.dashboardModalUtils.syncAddQuoteFormControls(deps.addQuoteModalRefs, {
        buildAddQuoteFormViewState: deps.dashboardRenderer.buildAddQuoteFormViewState,
        normalizeChainKey: deps.normalizeChainKey,
        isCexOrderbookChain: deps.isCexOrderbookChain,
        isEvmChain: deps.isEvmChain
      });
    }

    function resetAndCloseAddQuoteModal() {
      deps.addQuoteModalSelectionRuntime.clear();
      deps.dashboardModalUtils.resetAddQuoteModal(deps.addQuoteModalRefs, {
        syncControls: syncAddQuoteFormControls
      });
    }

    function handleQuoteSettingsModalClick(event) {
      const action = deps.dashboardRenderer.resolveQuoteSettingsModalClickAction(event, {
        modal: deps.quoteSettingsModal
      });
      if (action.type === 'close') {
        deps.closeQuoteSettingsModal();
        return;
      }

      const editingQuote = deps.quoteSettingsSelectionRuntime.get();
      if (!editingQuote || !editingQuote.quote) return;

      if (action.type === 'swap') {
        deps.swapQuoteTokens(editingQuote.categoryId, editingQuote.quote.id);
        return;
      }
      if (action.type === 'delete') {
        const { categoryId, quote } = editingQuote;
        deps.closeQuoteSettingsModal();
        deps.showConfirmation('确定删除此报价吗？', () => {
          deps.deleteQuoteFromCategory(categoryId, quote.id);
        });
        return;
      }
      if (action.type === 'manage-alerts') {
        const href = deps.pathAlertPageUtils.buildPathAlertsPageHref({
          filterQuoteId: editingQuote.quote.id
        });
        deps.windowImpl.open(href, '_blank', 'noopener');
        return;
      }
      if (action.type !== 'save') return;

      const { quote } = editingQuote;
      const values = deps.dashboardModalUtils.readQuoteSettingsFormValues(deps.quoteSettingsModalElements);
      const formValues = {
        ...values,
        sourceValue: values.sourceValue || (quote ? quote.preferredSource : '')
      };
      const updatePlan = deps.dashboardRenderer.buildQuoteSettingsUpdatePlan({
        quote,
        sourceValue: formValues.sourceValue,
        kyberExcludedSourcesInput: formValues.kyberExcludedSourcesInput,
        showInverse: formValues.showInverse,
        requestChannelEnabled: deps.requestChannelUtils.supportsRequestChannelForQuote(quote) && Boolean(deps.quoteRequestChannelSelect),
        requestChannelId: formValues.requestChannelId,
        isCrossChainQuote: deps.isCrossChainQuote,
        isEvmChain: deps.isEvmChain,
        normalizeChainKey: deps.normalizeChainKey
      });
      Object.assign(quote, updatePlan.updates);
      updatePlan.deletes.forEach((key) => { delete quote[key]; });
      if (updatePlan.requestChannelChanged) {
        deps.updateRequestChannelTagForQuote(quote);
      }

      if (updatePlan.shouldQueueRefreshQuote) {
        deps.removeFromQueue(quote.id);
        deps.queueQuoteRefresh(quote, { clearInverse: quote.showInverse !== true });
      }

      deps.saveData();
      deps.closeQuoteSettingsModal();
    }

    function handleQuoteSourceChange() {
      const editingQuote = deps.quoteSettingsSelectionRuntime.get();
      const currentQuote = editingQuote && editingQuote.quote ? editingQuote.quote : null;
      deps.syncKyberExcludedSourcesControl(currentQuote, deps.quoteSourceSelect ? deps.quoteSourceSelect.value : '');
    }

    function handleAddCategoryModalClick(event) {
      const action = deps.dashboardRenderer.resolveAddCategoryModalClickAction(event, {
        modal: deps.addCategoryModal
      });
      if (action.type === 'close') {
        deps.closeAddCategoryModal();
        return;
      }
      if (action.type !== 'save') return;

      const newCategory = deps.dashboardRenderer.buildAddCategoryDraft({
        ...deps.dashboardModalUtils.readAddCategoryFormValues(deps.addCategoryModalRefs, {
          readAddCategoryFormValues: deps.dashboardRenderer.readAddCategoryFormValues
        }),
        categoryId: getNowMs()
      });
      if (!newCategory) return;
      getDashboardState().push(newCategory);
      const moduleEl = deps.createCategoryModule(newCategory);
      if (moduleEl) deps.dashboardEl.appendChild(moduleEl);
      deps.saveData();
      deps.closeAddCategoryModal();
    }

    function handleAddQuoteModalClick(event) {
      const action = deps.dashboardRenderer.resolveAddQuoteModalClickAction(event, {
        modal: deps.addQuoteModal
      });
      if (action.type === 'close') {
        resetAndCloseAddQuoteModal();
        return;
      }
      if (action.type !== 'save') return;

      const categoryIdToAdd = deps.addQuoteModalSelectionRuntime.get();
      if (categoryIdToAdd === null) return;
      const newQuote = deps.dashboardRenderer.buildAddQuoteDraft({
        ...deps.dashboardModalUtils.readAddQuoteFormValues(deps.addQuoteModalRefs),
        quoteId: getNowMs(),
        normalizeChainKey: deps.normalizeChainKey,
        isCexOrderbookChain: deps.isCexOrderbookChain,
        defaultSourceResolver: deps.defaultSourceResolver
      });
      if (!newQuote) return;
      const category = deps.dashboardRuntimeUtils.findDashboardCategoryById(getDashboardState(), categoryIdToAdd);
      if (!category) return;
      if (!category.quotes) category.quotes = [];
      category.quotes.push(newQuote);
      const quoteListEl = deps.documentImpl.getElementById(`quote-list-${category.id}`);
      if (quoteListEl) {
        quoteListEl.appendChild(deps.createQuoteItem(newQuote, category.id));
      }
      deps.updateCategoryPauseButtonState(category.id);
      deps.saveData();
      deps.queueQuoteRefresh(newQuote);
      resetAndCloseAddQuoteModal();
    }

    function bind() {
      if (deps.quoteSettingsModal) {
        deps.quoteSettingsModal.addEventListener('click', handleQuoteSettingsModalClick);
      }
      if (deps.quoteSourceSelect) {
        deps.quoteSourceSelect.addEventListener('change', handleQuoteSourceChange);
      }
      if (deps.addCategoryModal) {
        deps.addCategoryModal.addEventListener('click', handleAddCategoryModalClick);
      }
      if (deps.addQuoteChainSelect) {
        deps.addQuoteChainSelect.addEventListener('change', syncAddQuoteFormControls);
      }
      if (deps.addQuoteToChainSelect) {
        deps.addQuoteToChainSelect.addEventListener('change', syncAddQuoteFormControls);
      }
      const addQuoteInputs = Array.isArray(deps.addQuoteInputs) ? deps.addQuoteInputs : [];
      addQuoteInputs.forEach((input) => {
        input.addEventListener('input', syncAddQuoteFormControls);
      });
      if (deps.addQuoteModal) {
        deps.addQuoteModal.addEventListener('click', handleAddQuoteModalClick);
      }
    }

    return {
      bind,
      handleAddCategoryModalClick,
      handleAddQuoteModalClick,
      handleQuoteSettingsModalClick,
      handleQuoteSourceChange,
      resetAndCloseAddQuoteModal,
      syncAddQuoteFormControls
    };
  }

  return {
    createDashboardFormController
  };
});
