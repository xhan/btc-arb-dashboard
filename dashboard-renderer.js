(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.DashboardRenderer = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function renderQuoteItemShell(config = {}) {
    const quoteId = escapeAttr(config.quoteId);
    const categoryId = escapeAttr(config.categoryId);
    const isPaused = config.paused === true;
    const pauseTitle = isPaused ? '恢复' : '暂停';
    const pauseIcon = isPaused ? '▶️' : '⏸️';
    const quoteTextClassName = config.quoteTextClassName || 'quote-text';

    return `
            <div class="quote-left-container">
                <span class="quote-label-stack">
                    <span class="quote-label-row">
                        <span class="quote-label">${escapeHtml(config.displayName)}</span>
                        ${config.requestChannelTagHtml || ''}
                    </span>
                    ${config.pairLabelHtml || ''}
                </span>
                <span id="trend-arrow-${quoteId}" class="trend-arrow"></span>
            </div>
            <div class="quote-result">
                <div id="quote-data-${quoteId}" class="quote-data">
                    <div style="display:flex; align-items:center;">
                        ${config.amountInputHtml || ''}
                        <span class="quote-text-wrapper" id="quote-text-wrapper-${quoteId}">
                            <span class="${escapeAttr(quoteTextClassName)}" id="quote-text-${quoteId}">${escapeHtml(config.lastResultText)}</span>
                        </span>
                    </div>
                </div>
                <div class="quote-actions">
                    <button class="icon-btn" title="${pauseTitle}" aria-label="${pauseTitle}" aria-pressed="${isPaused ? 'true' : 'false'}" data-toggle-pause-id="${quoteId}" data-category-id="${categoryId}">${pauseIcon}</button>
                    <button class="icon-btn" title="设置" data-edit-alert-id="${quoteId}" data-category-id="${categoryId}">⚙️</button>
                </div>
            </div>`;
  }

  function renderCategoryModuleShell(config = {}) {
    const categoryId = escapeAttr(config.categoryId);
    const categoryPauseAction = config.categoryPauseAction === 'resume' ? 'resume' : 'pause';
    const categoryPauseTitle = categoryPauseAction === 'resume' ? '恢复分区' : '暂停分区';
    const categoryPauseIcon = categoryPauseAction === 'resume' ? '▶️' : '⏸️';

    return `
            <div class="module-header">
                <h2>${escapeHtml(config.categoryName)}</h2>
                <div class="module-header-actions">
                    <button class="icon-btn add-quote-btn" title="添加报价" aria-label="添加报价" data-category-id="${categoryId}">+</button>
                    <button class="icon-btn" title="${categoryPauseTitle}" aria-label="${categoryPauseTitle}" aria-pressed="${categoryPauseAction === 'resume' ? 'true' : 'false'}" data-toggle-category-pause-id="${categoryId}" data-category-id="${categoryId}">${categoryPauseIcon}</button>
                    <button class="icon-btn delete-btn" title="删除分区" data-category-id="${categoryId}">×</button>
                </div>
            </div>
            <ul class="quote-list" id="quote-list-${categoryId}"></ul>`;
  }

  return {
    renderCategoryModuleShell,
    renderQuoteItemShell
  };
}));
