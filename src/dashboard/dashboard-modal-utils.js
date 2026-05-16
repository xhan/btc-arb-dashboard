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

  function addClass(element, className) {
    if (element && element.classList && typeof element.classList.add === 'function') {
      element.classList.add(className);
    }
  }

  function removeClass(element, className) {
    if (element && element.classList && typeof element.classList.remove === 'function') {
      element.classList.remove(className);
    }
  }

  function showModal(modal) {
    addClass(modal, 'visible');
  }

  function hideModal(modal) {
    removeClass(modal, 'visible');
  }

  function applyQuoteSettingsModalWritePlan(refs = {}, plan = {}) {
    (plan.text || []).forEach((item) => {
      const element = refs[item.id];
      if (element) element.textContent = item.text;
    });
    (plan.display || []).forEach((item) => {
      setDisplay(refs[item.id], item.display);
    });
    (plan.disabled || []).forEach((item) => {
      const element = refs[item.id];
      if (element) element.disabled = item.disabled;
    });
    (plan.value || []).forEach((item) => {
      setElementValue(refs[item.id], item.value);
    });
    (plan.checked || []).forEach((item) => {
      const element = refs[item.id];
      if (element) element.checked = item.checked;
    });
  }

  function applySettingsIntervalWritePlan(refs = {}, writePlan = []) {
    (writePlan || []).forEach((item) => {
      setElementValue(refs[item.id], item.value);
    });
  }

  function readSettingsIntervalFormValues(refs = {}, options = {}) {
    const readSettingsIntervalFormValues = typeof options.readSettingsIntervalFormValues === 'function'
      ? options.readSettingsIntervalFormValues
      : () => ({});
    return readSettingsIntervalFormValues({
      readValue: (id) => readElementValue(refs[id])
    });
  }

  function readQuoteSettingsFormValues(refs = {}) {
    return {
      sourceValue: readElementValue(refs['quote-source-pref']),
      kyberOnlyDirectPools: Boolean(refs['kyber-only-direct-pools'] && refs['kyber-only-direct-pools'].checked),
      showInverse: Boolean(refs['show-inverse-quote'] && refs['show-inverse-quote'].checked),
      requestChannelId: readElementValue(refs['quote-request-channel'])
    };
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

  function openAddCategoryModal(refs = {}) {
    const nameInput = refs['add-category-name'];
    setElementValue(nameInput, '');
    showModal(refs.modal);
    if (nameInput && typeof nameInput.focus === 'function') {
      nameInput.focus();
    }
  }

  function closeAddCategoryModal(refs = {}) {
    hideModal(refs.modal);
  }

  function readAddCategoryFormValues(refs = {}, options = {}) {
    const readAddCategoryFormValues = typeof options.readAddCategoryFormValues === 'function'
      ? options.readAddCategoryFormValues
      : () => ({});
    return readAddCategoryFormValues({
      readValue: (id) => readElementValue(refs[id])
    });
  }

  function showConfirmModal(refs = {}, message = '') {
    if (refs.message) {
      refs.message.textContent = message;
    }
    showModal(refs.modal);
  }

  function closeConfirmModal(refs = {}) {
    hideModal(refs.modal);
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
    hideModal(refs.modal);
    return { currentCategoryIdToAdd: null };
  }

  return {
    applyAddQuoteFormViewState,
    applyQuoteSettingsModalWritePlan,
    applySettingsIntervalWritePlan,
    closeAddCategoryModal,
    closeConfirmModal,
    openAddCategoryModal,
    readAddQuoteFormValues,
    readAddCategoryFormValues,
    readQuoteSettingsFormValues,
    readSettingsIntervalFormValues,
    resetAddQuoteModal,
    showConfirmModal,
    hideModal,
    showModal,
    syncAddQuoteFormControls
  };
});
