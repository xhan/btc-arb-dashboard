(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.AlertLogUiUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isMutedAlertLogEntry(entry) {
    return Boolean(entry && entry.mutedEntry);
  }

  function shouldAutoOpenAlertLogEntries(entries) {
    const list = Array.isArray(entries) ? entries : [];
    return list.some((entry) => !isMutedAlertLogEntry(entry));
  }

  function buildAlertLogEntryDisplayState(entry, options = {}) {
    const muted = isMutedAlertLogEntry(entry);
    const expanded = Boolean(options && options.expanded);
    return {
      muted,
      collapsed: muted && !expanded
    };
  }

  return {
    isMutedAlertLogEntry,
    shouldAutoOpenAlertLogEntries,
    buildAlertLogEntryDisplayState
  };
}));
