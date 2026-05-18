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

  function applyKyberExcludedSourcesControlState(refs = {}, state = {}) {
    const visible = state.visible === true;
    setDisplay(refs['kyber-excluded-sources-group'], visible ? 'block' : 'none');
    if (Object.prototype.hasOwnProperty.call(state, 'value')) {
      setElementValue(refs['kyber-excluded-sources'], state.value);
    }
    return visible;
  }

  function applyQuoteRequestChannelOptionsState(refs = {}, state = {}) {
    const visible = state.visible === true;
    const selectEl = refs['quote-request-channel'];

    setDisplay(refs['request-channel-select-group'], visible ? 'block' : 'none');
    if (selectEl) {
      selectEl.innerHTML = visible ? String(state.optionsHtml || '') : '';
      selectEl.value = visible ? String(state.value || '') : '';
    }
    return visible;
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

  function createSettingsModalRuntime(options = {}) {
    const refs = options.intervalInputRefs || {};
    const getIntervals = typeof options.getIntervals === 'function' ? options.getIntervals : () => ({});
    const setIntervals = typeof options.setIntervals === 'function' ? options.setIntervals : () => {};
    const buildSettingsIntervalWritePlan = typeof options.buildSettingsIntervalWritePlan === 'function'
      ? options.buildSettingsIntervalWritePlan
      : () => [];
    const readSettingsFormValues = typeof options.readSettingsIntervalFormValues === 'function'
      ? options.readSettingsIntervalFormValues
      : () => ({});
    const buildSettingsIntervalsFromFormValues = typeof options.buildSettingsIntervalsFromFormValues === 'function'
      ? options.buildSettingsIntervalsFromFormValues
      : () => ({});
    const onSave = typeof options.onSave === 'function' ? options.onSave : () => {};
    const showSaveFeedback = typeof options.showSaveFeedback === 'function' ? options.showSaveFeedback : () => {};

    function sync() {
      const writePlan = buildSettingsIntervalWritePlan(getIntervals());
      applySettingsIntervalWritePlan(refs, writePlan);
      return writePlan;
    }

    function read() {
      return readSettingsIntervalFormValues(refs, {
        readSettingsIntervalFormValues: readSettingsFormValues
      });
    }

    function open() {
      sync();
      showModal(options.modal);
    }

    function close() {
      hideModal(options.modal);
    }

    function save() {
      const nextIntervals = buildSettingsIntervalsFromFormValues(read(), options.defaultIntervals || {});
      setIntervals(nextIntervals);
      onSave(nextIntervals);
      close();
      showSaveFeedback(nextIntervals);
      return nextIntervals;
    }

    function bind() {
      const bindings = {};
      if (options.openButton && typeof options.openButton.addEventListener === 'function') {
        options.openButton.addEventListener('click', open);
        bindings.openButton = true;
      }
      if (options.cancelButton && typeof options.cancelButton.addEventListener === 'function') {
        options.cancelButton.addEventListener('click', close);
        bindings.cancelButton = true;
      }
      if (options.saveButton && typeof options.saveButton.addEventListener === 'function') {
        options.saveButton.addEventListener('click', save);
        bindings.saveButton = true;
      }
      return bindings;
    }

    return {
      bind,
      close,
      open,
      read,
      save,
      sync
    };
  }

  function readQuoteSettingsFormValues(refs = {}) {
    return {
      sourceValue: readElementValue(refs['quote-source-pref']),
      kyberExcludedSourcesInput: readElementValue(refs['kyber-excluded-sources']),
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

  function createModalSelectionRuntime() {
    let currentSelection = null;

    return {
      get() {
        return currentSelection;
      },
      set(selection = null) {
        currentSelection = selection;
        return currentSelection;
      },
      clear() {
        currentSelection = null;
        return currentSelection;
      }
    };
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

  function createConfirmActionRuntime(options = {}) {
    const show = typeof options.showConfirmModal === 'function' ? options.showConfirmModal : showConfirmModal;
    const close = typeof options.closeConfirmModal === 'function' ? options.closeConfirmModal : closeConfirmModal;
    let currentAction = null;

    return {
      show(refs = {}, message = '', action = null) {
        show(refs, message);
        currentAction = typeof action === 'function' ? action : null;
      },
      confirm() {
        if (typeof currentAction === 'function') {
          currentAction();
        }
      },
      close(refs = {}) {
        close(refs);
        currentAction = null;
      }
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
    hideModal(refs.modal);
  }

  return {
    applyAddQuoteFormViewState,
    applyKyberExcludedSourcesControlState,
    applyQuoteRequestChannelOptionsState,
    applyQuoteSettingsModalWritePlan,
    applySettingsIntervalWritePlan,
    closeAddCategoryModal,
    closeConfirmModal,
    createConfirmActionRuntime,
    createModalSelectionRuntime,
    createSettingsModalRuntime,
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
