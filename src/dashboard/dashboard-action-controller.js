(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.DashboardActionController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardActionController(deps = {}) {
    function getDashboardState() {
      return typeof deps.getDashboardState === 'function' ? deps.getDashboardState() : [];
    }

    function getRequestChannelOptions() {
      return typeof deps.getRequestChannelOptions === 'function' ? deps.getRequestChannelOptions() : {};
    }

    function getArbDetailState() {
      return typeof deps.getArbDetailState === 'function' ? deps.getArbDetailState() : {};
    }

    function syncKyberExcludedSourcesControl(quote, selectedSource) {
      const shouldShow = Boolean(
        quote
        && deps.isEvmChain(quote.chain)
        && String(quote.chain || '').toLowerCase() !== 'plasma'
        && (selectedSource === 'Kyber' || selectedSource === 'Auto')
      );
      deps.dashboardModalUtils.applyKyberExcludedSourcesControlState(deps.quoteSettingsModalElements, {
        visible: shouldShow
      });
    }

    function updateCategoryPauseButtonState(categoryId) {
      const pauseBtn = deps.documentImpl.querySelector(`[data-toggle-category-pause-id="${categoryId}"]`);
      const category = deps.dashboardRuntimeUtils.findDashboardCategoryById(getDashboardState(), categoryId);
      deps.quotePauseUtils.applyCategoryPauseButtonState(
        pauseBtn,
        category && category.quotes ? category.quotes : []
      );
    }

    function openAddCategoryModal() {
      deps.dashboardModalUtils.openAddCategoryModal(deps.addCategoryModalRefs);
    }

    function closeAddCategoryModal() {
      deps.dashboardModalUtils.closeAddCategoryModal(deps.addCategoryModalRefs);
    }

    function showConfirmation(message, callback) {
      deps.confirmActionRuntime.show(deps.confirmModalRefs, message, callback);
    }

    function handleDashboardInput(event) {
      const action = deps.dashboardRenderer.resolveDashboardAmountInputAction(event, {
        closestEventTarget: deps.closestEventTarget
      });
      if (action.type !== 'update-amount') return;
      const match = deps.dashboardRuntimeUtils.findDashboardQuoteMatchByCategoryId(
        getDashboardState(),
        action.categoryId,
        action.quoteId
      );
      if (!match) return;
      const { quote } = match;

      deps.amountInputDebounceRuntime.schedule(action.quoteId, () => {
        quote.amount = action.amount;
        deps.renderDataTerminalPanel();
        if (!deps.isQuotePaused(quote)) {
          deps.queueQuoteRefresh(quote);
        }
        deps.saveData();
      });
    }

    function deleteQuoteFromCategory(categoryId, quoteId) {
      const match = deps.dashboardRuntimeUtils.findDashboardQuoteMatchByCategoryId(getDashboardState(), categoryId, quoteId);
      if (!match) return false;

      const { category, quote: quoteToDelete, quoteIndex } = match;
      deps.removeFromQueue(quoteToDelete.id);
      category.quotes.splice(quoteIndex, 1);

      const quoteItem = deps.documentImpl.getElementById(`quote-item-${quoteId}`);
      if (quoteItem) quoteItem.remove();

      deps.deleteQuoteMarketState(quoteId);
      deps.deleteQuoteUiRuntimeState(quoteId);
      updateCategoryPauseButtonState(categoryId);
      deps.updateAlertSoundState();
      deps.renderDataTerminalPanel();
      deps.saveData();
      return true;
    }

    function syncPauseLinkedViews() {
      deps.updateArbPanel();
      deps.renderDataTerminalPanel();
      deps.evaluatePathAlertsOnce();
    }

    function setQuotePausedState(categoryId, quote, nextPaused, options = {}) {
      if (!quote || deps.isQuotePaused(quote) === nextPaused) return false;

      const shouldSync = options.sync !== false;
      const shouldSave = options.save !== false;
      const quoteId = quote.id;
      quote.paused = nextPaused;

      deps.amountInputDebounceRuntime.clear(quoteId);

      if (nextPaused) {
        const previousState = deps.getQuoteMarketState(quoteId) || {};
        deps.removeFromQueue(quoteId);
        deps.activeFetchControllerRuntime.abort(quoteId);
        deps.setQuoteMarketState(quoteId, deps.quotePauseUtils.buildPausedQuoteState(previousState));
        deps.resetQuoteUiRuntimeState(quoteId);
        deps.applyPausedQuoteUiState(quote, deps.getQuoteMarketState(quoteId) || {});
        deps.updateSchedulers();
        if (deps.arbDetailUtils.doesArbDetailUseQuote(getArbDetailState().selectedOpportunity, quoteId)) {
          deps.closeArbDetailModal();
        }
      } else {
        deps.queueQuoteRefresh(quote);
      }

      updateCategoryPauseButtonState(categoryId);
      if (shouldSync) {
        deps.updateAlertSoundState();
        syncPauseLinkedViews();
      }
      if (shouldSave) {
        deps.saveData();
      }
      return true;
    }

    function toggleQuotePause(categoryId, quoteId, options = {}) {
      const match = deps.dashboardRuntimeUtils.findDashboardQuoteMatchByCategoryId(getDashboardState(), categoryId, quoteId);
      if (!match) return false;
      const { quote } = match;
      return setQuotePausedState(categoryId, quote, !deps.isQuotePaused(quote), options);
    }

    function toggleCategoryPause(categoryId) {
      const category = deps.dashboardRuntimeUtils.findDashboardCategoryById(getDashboardState(), categoryId);
      if (!category || !Array.isArray(category.quotes) || category.quotes.length === 0) {
        updateCategoryPauseButtonState(categoryId);
        return false;
      }

      const action = deps.getCategoryPauseAction(category.quotes);
      const nextPaused = action === 'pause';
      let changed = false;

      category.quotes.forEach((quote) => {
        if (deps.isQuotePaused(quote) === nextPaused) return;
        if (setQuotePausedState(categoryId, quote, nextPaused, { sync: false, save: false })) {
          changed = true;
        }
      });

      updateCategoryPauseButtonState(categoryId);
      if (!changed) return false;

      deps.updateAlertSoundState();
      syncPauseLinkedViews();
      deps.saveData();
      return true;
    }

    function swapQuoteTokens(categoryId, quoteId) {
      const match = deps.dashboardRuntimeUtils.findDashboardQuoteMatchByCategoryId(getDashboardState(), categoryId, quoteId);
      if (!match) return false;
      const { quote } = match;
      if (deps.isCexOrderbookChain(quote.chain) || deps.isCrossChainQuote(quote)) return false;

      [quote.fromToken, quote.toToken] = [quote.toToken, quote.fromToken];

      const state = deps.getQuoteMarketState(quoteId);
      if (state) {
        const nextState = deps.dashboardRuntimeUtils.buildSwappedQuoteMarketState(state);

        const arrowEl = deps.documentImpl.getElementById(`trend-arrow-${quoteId}`);
        deps.domRenderUtils.resetTrendArrow(arrowEl);

        const quoteItemEl = deps.documentImpl.getElementById(`quote-item-${quoteId}`);
        deps.domRenderUtils.clearQuoteHighlightUi(quoteItemEl);
        deps.setQuoteMarketState(quoteId, nextState);
      }
      deps.resetQuoteUiRuntimeState(quoteId);
      deps.updateAlertSoundState();

      deps.domRenderUtils.applyQuoteSwitchingDomState({
        ...deps.domRenderUtils.getQuoteDomRefs(deps.documentImpl, quoteId),
        inverseEl: deps.documentImpl.getElementById(`inverse-quote-${quoteId}`)
      });

      deps.saveData();
      deps.removeFromQueue(quote.id);
      deps.queueQuoteRefresh(quote);
      deps.renderDataTerminalPanel();
      return true;
    }

    function openQuoteSettingsModal(categoryId, quoteId) {
      const match = deps.dashboardRuntimeUtils.findDashboardQuoteMatchByCategoryId(getDashboardState(), categoryId, quoteId);
      if (!match) return false;
      const { quote } = match;
      deps.quoteSettingsSelectionRuntime.set({ quote, categoryId });
      const monitorState = deps.getQuoteMarketState(quote.id) || {};
      const modalState = deps.dashboardRenderer.buildQuoteSettingsModalViewState({
        quote,
        monitorState,
        isCexOrderbookChain: deps.isCexOrderbookChain,
        isCrossChainQuote: deps.isCrossChainQuote,
        isEvmChain: deps.isEvmChain,
        getQuoteChainDisplayName: deps.getQuoteChainDisplayName,
        getSingleChainDisplayName: deps.formatChainLabel
      });
      const writePlan = deps.dashboardRenderer.buildQuoteSettingsModalWritePlan(modalState);
      deps.dashboardModalUtils.applyQuoteSettingsModalWritePlan(deps.quoteSettingsModalElements, writePlan);
      syncKyberExcludedSourcesControl(quote, modalState.sourceSelect ? modalState.sourceSelect.value : '');

      if (deps.requestChannelUtils.supportsRequestChannelForQuote(quote)) {
        const requestChannelOptions = getRequestChannelOptions();
        const currentChannelId = deps.requestChannelUtils.resolveRequestChannelIdForQuote(quote, requestChannelOptions);
        deps.dashboardModalUtils.applyQuoteRequestChannelOptionsState(deps.quoteSettingsModalElements, {
          visible: true,
          optionsHtml: deps.requestChannelUtils.buildRequestChannelOptionsHtml(requestChannelOptions.channels || []),
          value: currentChannelId
        });
      } else {
        deps.dashboardModalUtils.applyQuoteRequestChannelOptionsState(deps.quoteSettingsModalElements, {
          visible: false
        });
      }

      deps.dashboardModalUtils.showModal(deps.quoteSettingsModal);
      return true;
    }

    function closeQuoteSettingsModal() {
      deps.dashboardModalUtils.hideModal(deps.quoteSettingsModal);
      deps.quoteSettingsSelectionRuntime.clear();
    }

    function deleteCategoryFromDashboard(categoryId) {
      const dashboardState = getDashboardState();
      const categoryIndex = deps.dashboardRuntimeUtils.findDashboardCategoryIndexById(dashboardState, categoryId);
      if (categoryIndex === -1) return false;
      showConfirmation(`确定删除分区 "${dashboardState[categoryIndex].name}" 吗？`, () => {
        (dashboardState[categoryIndex].quotes || []).forEach((quote) => {
          deps.removeFromQueue(quote.id);
          deps.deleteQuoteMarketState(quote.id);
          deps.deleteQuoteUiRuntimeState(quote.id);
        });
        deps.updateAlertSoundState();
        dashboardState.splice(categoryIndex, 1);
        const moduleEl = deps.documentImpl.getElementById(`module-${categoryId}`);
        if (moduleEl) moduleEl.remove();
        deps.renderDataTerminalPanel();
        deps.saveData();
      });
      return true;
    }

    function stopDashboardClick(event) {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
    }

    function handleDashboardClick(event) {
      const action = deps.dashboardRenderer.resolveDashboardClickAction(event, {
        closestEventTarget: deps.closestEventTarget
      });
      if (action.type === 'copy-dex-link') {
        stopDashboardClick(event);
        if (typeof deps.copyDexLinkFromElement === 'function') {
          void deps.copyDexLinkFromElement(action.element);
        }
        return;
      }
      if (action.type === 'copy-price') {
        stopDashboardClick(event);
        if (typeof deps.copyPriceText === 'function') {
          deps.copyPriceText(action.element && action.element.textContent);
        }
        return;
      }
      if (action.type === 'dismiss-highlight') {
        deps.quoteStateRuntime.setUiState(action.quoteId, {
          hasUnreadAlert: false
        });
        const quoteItemEl = deps.documentImpl.getElementById(`quote-item-${action.quoteId}`);
        deps.domRenderUtils.clearQuoteHighlightUi(quoteItemEl);
        return;
      }
      if (action.type === 'toggle-category-pause') {
        toggleCategoryPause(action.categoryId);
        return;
      }
      if (action.type === 'toggle-quote-pause') {
        toggleQuotePause(action.categoryId, action.quoteId);
        return;
      }
      if (action.type === 'edit-quote') {
        openQuoteSettingsModal(action.categoryId, action.quoteId);
        return;
      }
      if (action.type === 'delete-quote') {
        showConfirmation('确定删除此报价吗？', () => {
          deleteQuoteFromCategory(action.categoryId, action.quoteId);
        });
        return;
      }
      if (action.type === 'delete-category') {
        deleteCategoryFromDashboard(action.categoryId);
        return;
      }
      if (action.type === 'add-quote') {
        deps.addQuoteModalSelectionRuntime.set(action.categoryId);
        deps.dashboardModalUtils.showModal(deps.addQuoteModal);
        return;
      }
      if (action.type === 'swap-quote') {
        swapQuoteTokens(action.categoryId, action.quoteId);
      }
    }

    return {
      closeAddCategoryModal,
      closeQuoteSettingsModal,
      deleteCategoryFromDashboard,
      deleteQuoteFromCategory,
      handleDashboardClick,
      handleDashboardInput,
      openAddCategoryModal,
      openQuoteSettingsModal,
      setQuotePausedState,
      showConfirmation,
      swapQuoteTokens,
      syncKyberExcludedSourcesControl,
      toggleCategoryPause,
      toggleQuotePause,
      updateCategoryPauseButtonState
    };
  }

  return {
    createDashboardActionController
  };
});
