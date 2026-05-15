(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.AlertLogUiUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

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

  function buildMutedStateItemHtml(config = {}) {
    const linesHtml = (Array.isArray(config.lines) ? config.lines : [])
      .filter(Boolean)
      .map((line) => `<div>${escapeHtml(line)}</div>`)
      .join('');
    const actionsHtml = (Array.isArray(config.actions) ? config.actions : [])
      .map((action) => `<button type="button" class="muted-state-action-btn" ${action.dataAttr}="${escapeHtml(action.value)}">${escapeHtml(action.label)}</button>`)
      .join('');
    return `
            <div class="muted-state-item">
                <div class="muted-state-item-title">${escapeHtml(config.title || '--')}</div>
                ${linesHtml ? `<div class="muted-state-item-lines">${linesHtml}</div>` : ''}
                <div class="muted-state-item-foot">
                    <span class="path-alert-log-tag path-alert-log-tag-muted">${escapeHtml(config.status || '')}</span>
                    <div class="muted-state-item-actions">${actionsHtml}</div>
                </div>
            </div>
        `;
  }

  function buildMutedStateSectionHtml(title, items, emptyText) {
    const list = Array.isArray(items) ? items : [];
    return `
            <section class="muted-state-section">
                <div class="muted-state-title">${escapeHtml(title)}</div>
                ${list.length ? list.join('') : `<div class="muted-state-empty">${escapeHtml(emptyText)}</div>`}
            </section>
        `;
  }

  return {
    isMutedAlertLogEntry,
    shouldAutoOpenAlertLogEntries,
    buildAlertLogEntryDisplayState,
    buildMutedStateItemHtml,
    buildMutedStateSectionHtml
  };
}));
