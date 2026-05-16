(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.DashboardModalUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function readElementValue(element) {
    return element ? element.value : '';
  }

  function setElementValue(element, value) {
    if (element) {
      element.value = value;
    }
  }

  function setDisplay(element, display) {
    if (element && element.style) {
      element.style.display = display;
    }
  }

  function readAddQuoteFormValues(refs = {}) {
    return {
      chain: readElementValue(refs.chainSelect),
      toChain: readElementValue(refs.toChainSelect),
      fromToken: readElementValue(refs.fromInput),
      toToken: readElementValue(refs.toInput),
      symbol: readElementValue(refs.symbolInput)
    };
  }

  function applyAddQuoteFormViewState(refs = {}, viewState = {}) {
    setDisplay(refs.toChainGroup, viewState.targetChainVisible ? 'block' : 'none');
    if (refs.toChainSelect && refs.toChainSelect.value !== viewState.toChainValue) {
      refs.toChainSelect.value = viewState.toChainValue;
    }
    if (refs.fromInput) {
      refs.fromInput.placeholder = viewState.fromPlaceholder;
    }
    if (refs.toInput) {
      refs.toInput.placeholder = viewState.toPlaceholder;
    }
    setDisplay(refs.pairFields, viewState.pairFieldsVisible ? 'block' : 'none');
    setDisplay(refs.symbolField, viewState.symbolFieldVisible ? 'block' : 'none');
    if (refs.saveButton) {
      refs.saveButton.disabled = viewState.saveDisabled;
    }
  }

  function syncAddQuoteFormControls(refs = {}, options = {}) {
    const buildAddQuoteFormViewState = typeof options.buildAddQuoteFormViewState === 'function'
      ? options.buildAddQuoteFormViewState
      : () => ({});
    const viewState = buildAddQuoteFormViewState({
      ...readAddQuoteFormValues(refs),
      normalizeChainKey: options.normalizeChainKey,
      isCexOrderbookChain: options.isCexOrderbookChain,
      isEvmChain: options.isEvmChain
    });
    applyAddQuoteFormViewState(refs, viewState);
    return viewState;
  }

  function resetAddQuoteModal(refs = {}, options = {}) {
    setElementValue(refs.chainSelect, '');
    setElementValue(refs.toChainSelect, '');
    setElementValue(refs.fromInput, '');
    setElementValue(refs.toInput, '');
    setElementValue(refs.symbolInput, '');
    if (typeof options.syncControls === 'function') {
      options.syncControls();
    }
    if (refs.modal && refs.modal.classList && typeof refs.modal.classList.remove === 'function') {
      refs.modal.classList.remove('visible');
    }
    return { currentCategoryIdToAdd: null };
  }

  return {
    applyAddQuoteFormViewState,
    readAddQuoteFormValues,
    resetAddQuoteModal,
    syncAddQuoteFormControls
  };
});
