(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.PathAlertDomRefs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getById(documentImpl, id) {
    return documentImpl && typeof documentImpl.getElementById === 'function'
      ? documentImpl.getElementById(id)
      : null;
  }

  function getPathAlertDomRefs(documentImpl) {
    return {
      statusEl: getById(documentImpl, 'path-alerts-status'),
      listEl: getById(documentImpl, 'path-alerts-sections'),
      dismissedListEl: getById(documentImpl, 'path-alerts-dismissed-list'),
      editorEl: getById(documentImpl, 'path-alerts-editor'),
      editorTitleEl: getById(documentImpl, 'path-alerts-editor-title'),
      editorModalEl: getById(documentImpl, 'path-alerts-editor-modal'),
      createBtn: getById(documentImpl, 'path-alerts-create-btn'),
      closeEditorBtn: getById(documentImpl, 'path-alerts-close-editor-btn'),
      contextBarEl: getById(documentImpl, 'path-alerts-context'),
      dismissSelectedBtn: getById(documentImpl, 'path-alerts-dismiss-selected-btn'),
      deleteSelectedBtn: getById(documentImpl, 'path-alerts-delete-selected-btn'),
      deleteDismissedSelectedBtn: getById(documentImpl, 'path-alerts-dismissed-delete-selected-btn'),
      selectionCountEl: getById(documentImpl, 'path-alerts-selection-count'),
      dismissedSelectionCountEl: getById(documentImpl, 'path-alerts-dismissed-selection-count')
    };
  }

  return {
    getPathAlertDomRefs
  };
});
