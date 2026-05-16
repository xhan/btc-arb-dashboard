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

  function buildAlertLogAppendPlan(entries) {
    const list = Array.isArray(entries) ? entries.slice() : [];
    return {
      entries: list.slice().reverse(),
      shouldAutoOpen: shouldAutoOpenAlertLogEntries(list)
    };
  }

  function buildAlertLogEntryDisplayState(entry, options = {}) {
    const muted = isMutedAlertLogEntry(entry);
    const expanded = Boolean(options && options.expanded);
    return {
      muted,
      collapsed: muted && !expanded
    };
  }

  function resolveAlertLogCardPlacement(entry, options = {}) {
    const targetKey = String(options && options.targetKey || '').trim();
    if (isMutedAlertLogEntry(entry)) {
      return {
        destination: 'muted',
        removeRestoredTargetKey: ''
      };
    }
    return {
      destination: 'active',
      removeRestoredTargetKey: targetKey
    };
  }

  function buildAlertLogMutedStatusState(mutedEntry, options = {}) {
    if (mutedEntry) {
      return {
        statusText: String(options.statusText || ''),
        statusClassName: 'path-alert-log-tag path-alert-log-tag-muted',
        buttonText: '延长 2 小时',
        buttonDisabled: false
      };
    }
    return {
      statusText: '已触发',
      statusClassName: 'path-alert-log-tag',
      buttonText: '忽略 1 小时',
      buttonDisabled: false
    };
  }

  function buildRestoredMutedAlertLogPlan(entries, options = {}) {
    const buildTargetKey = typeof options.buildTargetKey === 'function'
      ? options.buildTargetKey
      : () => '';
    const buildStatusText = typeof options.buildStatusText === 'function'
      ? options.buildStatusText
      : () => '';
    return (Array.isArray(entries) ? entries : [])
      .slice()
      .sort((left, right) => Number(left && left.mutedAt) - Number(right && right.mutedAt))
      .map((entry) => ({
        entry,
        targetKey: String(buildTargetKey(entry) || '').trim(),
        statusText: String(buildStatusText(entry) || '')
      }))
      .filter((item) => item.targetKey);
  }

  function escapeCssAttributeValue(value, options = {}) {
    if (typeof options.escapeCssAttributeValue === 'function') {
      return options.escapeCssAttributeValue(value);
    }
    return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function buildMutedTargetLogCardSelector(targetKey, options = {}) {
    const normalizedTargetKey = String(targetKey || '').trim();
    if (!normalizedTargetKey) return '';
    const restoredOnly = options.restoredOnly === true ? '[data-muted-restored="1"]' : '';
    return `.log-entry${restoredOnly}[data-muted-target-key="${escapeCssAttributeValue(normalizedTargetKey, options)}"]`;
  }

  function hasMutedTargetLogCard(container, targetKey, options = {}) {
    const selector = buildMutedTargetLogCardSelector(targetKey, options);
    if (!selector || !container || typeof container.querySelector !== 'function') return false;
    return Boolean(container.querySelector(selector));
  }

  function removeRestoredMutedAlertLogCards(containers, targetKey, options = {}) {
    const selector = buildMutedTargetLogCardSelector(targetKey, {
      ...options,
      restoredOnly: true
    });
    if (!selector) return 0;
    const list = Array.isArray(containers) ? containers : [containers];
    let removedCount = 0;
    list.filter(Boolean).forEach((container) => {
      if (typeof container.querySelectorAll !== 'function') return;
      container.querySelectorAll(selector).forEach((card) => {
        if (card && typeof card.remove === 'function') {
          card.remove();
          removedCount += 1;
        }
      });
    });
    return removedCount;
  }

  function readDatasetValue(element, key) {
    return String(element && element.dataset && element.dataset[key] || '').trim();
  }

  function resolveAlertLogClickAction(event, options = {}) {
    const closestEventTarget = typeof options.closestEventTarget === 'function'
      ? options.closestEventTarget
      : () => null;
    function closest(selector) {
      return closestEventTarget(event, selector);
    }

    const tabActions = [
      ['#alert-log-log-tab', 'log'],
      ['#alert-log-muted-log-tab', 'muted-log'],
      ['#alert-log-muted-tab', 'muted']
    ];
    for (const [selector, tab] of tabActions) {
      if (closest(selector)) {
        return { type: 'set-tab', tab };
      }
    }

    const quoteDexLinkEl = closest('[data-quote-alert-dex-link-copy]');
    if (quoteDexLinkEl) {
      return { type: 'copy-quote-dex-link', element: quoteDexLinkEl };
    }

    const extendMutedPathTargetBtn = closest('[data-muted-path-target-extend]');
    if (extendMutedPathTargetBtn) {
      return {
        type: 'extend-muted-path-target',
        key: readDatasetValue(extendMutedPathTargetBtn, 'mutedPathTargetExtend')
      };
    }

    const restoreMutedPathTargetBtn = closest('[data-muted-path-target-restore]');
    if (restoreMutedPathTargetBtn) {
      return {
        type: 'restore-muted-path-target',
        key: readDatasetValue(restoreMutedPathTargetBtn, 'mutedPathTargetRestore')
      };
    }

    const extendMutedPathLegBtn = closest('[data-muted-path-leg-extend]');
    if (extendMutedPathLegBtn) {
      return {
        type: 'extend-muted-path-leg',
        key: readDatasetValue(extendMutedPathLegBtn, 'mutedPathLegExtend')
      };
    }

    const restoreMutedPathLegBtn = closest('[data-muted-path-leg-restore]');
    if (restoreMutedPathLegBtn) {
      return {
        type: 'restore-muted-path-leg',
        key: readDatasetValue(restoreMutedPathLegBtn, 'mutedPathLegRestore')
      };
    }

    const muteBtn = closest('[data-path-alert-log-mute]');
    const quoteMuteBtn = closest('[data-quote-alert-log-mute]');
    const buttonEl = muteBtn || quoteMuteBtn;
    if (buttonEl) {
      if (buttonEl.disabled) return { type: 'ignore' };
      return {
        type: 'mute-alert-target',
        alertId: readDatasetValue(muteBtn, 'pathAlertLogMute') || readDatasetValue(quoteMuteBtn, 'quoteAlertLogMute'),
        buttonEl
      };
    }

    if (closest('a, button')) return { type: 'ignore' };

    const collapsedCard = closest('[data-alert-log-collapsed="1"]');
    if (collapsedCard) {
      return { type: 'expand-collapsed-card', card: collapsedCard };
    }

    return { type: 'none' };
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

  function sortMutedEntriesByMutedAtDesc(entries) {
    return (Array.isArray(entries) ? entries : [])
      .slice()
      .sort((left, right) => Number(right && right.mutedAt) - Number(left && left.mutedAt));
  }

  function buildMutedAlertStatePanelHtml(config = {}) {
    const buildPathTargetKey = typeof config.buildPathTargetKey === 'function'
      ? config.buildPathTargetKey
      : () => '';
    const buildPathStatusText = typeof config.buildPathStatusText === 'function'
      ? config.buildPathStatusText
      : () => '';
    const buildLegKey = typeof config.buildLegKey === 'function'
      ? config.buildLegKey
      : () => '';
    const buildLegTitle = typeof config.buildLegTitle === 'function'
      ? config.buildLegTitle
      : () => '';
    const buildLegStatusText = typeof config.buildLegStatusText === 'function'
      ? config.buildLegStatusText
      : () => '';

    const mutedPathItems = sortMutedEntriesByMutedAtDesc(config.mutedPathTargets)
      .map((entry) => {
        const summaryLines = Array.isArray(entry && entry.summaryLinesSnapshot) ? entry.summaryLinesSnapshot : [];
        return buildMutedStateItemHtml({
          title: entry && (entry.logTitleSnapshot || summaryLines[0]) || '路径沉默',
          lines: summaryLines,
          status: buildPathStatusText(entry),
          actions: [
            { label: '延长 2 小时', dataAttr: 'data-muted-path-target-extend', value: buildPathTargetKey(entry) },
            { label: '恢复', dataAttr: 'data-muted-path-target-restore', value: buildPathTargetKey(entry) }
          ]
        });
      });

    const mutedLegItems = sortMutedEntriesByMutedAtDesc(config.mutedPathLegs)
      .map((entry) => buildMutedStateItemHtml({
        title: buildLegTitle(entry) || '路径腿',
        lines: [],
        status: buildLegStatusText(entry),
        actions: [
          { label: '延长 2 小时', dataAttr: 'data-muted-path-leg-extend', value: buildLegKey(entry) },
          { label: '恢复', dataAttr: 'data-muted-path-leg-restore', value: buildLegKey(entry) }
        ]
      }));

    return [
      buildMutedStateSectionHtml('沉默的路径', mutedPathItems, '当前没有沉默中的路径'),
      buildMutedStateSectionHtml('屏蔽的腿', mutedLegItems, '当前没有屏蔽中的腿')
    ].join('');
  }

  function buildRestoredMutedAlertLogHtml(mutedEntry, options = {}) {
    const displayState = buildAlertLogEntryDisplayState({ mutedEntry });
    const title = String(
      mutedEntry && mutedEntry.logTitleSnapshot
      || Array.isArray(mutedEntry && mutedEntry.summaryLinesSnapshot) && mutedEntry.summaryLinesSnapshot[0]
      || '沉默中的提醒'
    ).trim();
    const nowMs = Number(options.nowMs) || Date.now();
    const targetKey = options.targetKey || '';
    const statusText = options.statusText || '';
    const summaryLinesHtml = (Array.isArray(mutedEntry && mutedEntry.summaryLinesSnapshot) ? mutedEntry.summaryLinesSnapshot : [])
      .map((line) => `<div class="path-alert-log-line">${escapeHtml(line)}</div>`)
      .join('');
    const cardClassName = [
      'log-entry',
      'path-alert-log-entry',
      'alert-log-entry-muted',
      displayState.collapsed ? 'alert-log-entry-collapsed' : ''
    ].filter(Boolean).join(' ');
    const titleClassName = displayState.collapsed ? 'alert-log-title-muted' : '';
    return `
            <div
                class="${cardClassName}"
                data-muted-target-key="${escapeHtml(targetKey)}"
                data-muted-restored="1"
                data-alert-log-collapsed="${displayState.collapsed ? '1' : '0'}"
            >
                <div class="path-alert-log-head">
                    <div>
                        <div><strong class="${titleClassName}" data-alert-log-title data-alert-log-expanded-title="${escapeHtml(title)}">${escapeHtml(title)}</strong></div>
                    </div>
                </div>
                <div class="path-alert-log-route alert-log-collapsible"${displayState.collapsed ? ' hidden' : ''}>${summaryLinesHtml || '<div class="path-alert-log-line">--</div>'}</div>
                <div class="path-alert-log-foot alert-log-collapsible"${displayState.collapsed ? ' hidden' : ''}>
                    <span class="path-alert-log-tag path-alert-log-tag-muted" data-path-alert-muted-status>${escapeHtml(statusText)}</span>
                    <span class="log-time">${new Date(Number(mutedEntry && mutedEntry.mutedAt) || nowMs).toLocaleTimeString()}</span>
                </div>
            </div>
        `;
  }

  function buildPathAlertLogCardHtml(entry, options = {}) {
    const mutedEntry = options.mutedEntry || null;
    const displayState = buildAlertLogEntryDisplayState({ ...entry, mutedEntry });
    const targetKey = options.targetKey || '';
    const nowMs = Number(options.nowMs) || Date.now();
    const expandedTitle = `🚨 [路径报警] ${String(entry && entry.alert && entry.alert.name || '路径报警')}`;
    const title = escapeHtml(expandedTitle);
    const profitText = escapeHtml(options.profitText || '--');
    const routeLinesHtml = (Array.isArray(entry && entry.summaryLines) ? entry.summaryLines : [])
      .map((line) => `<div class="path-alert-log-line">${escapeHtml(line)}</div>`)
      .join('');
    const statusText = options.statusText || (mutedEntry ? '' : '已触发');
    const statusClass = mutedEntry ? 'path-alert-log-tag path-alert-log-tag-muted' : 'path-alert-log-tag';
    const muteButtonHtml = entry && entry.mutedTargetCandidate
      ? `<button
                    type="button"
                    class="path-alert-log-mute-btn"
                    data-path-alert-log-mute="${escapeHtml(entry.alert && entry.alert.id || '')}"
                >${mutedEntry ? '延长 2 小时' : '忽略 1 小时'}</button>`
      : '';
    const cardClassName = [
      'log-entry',
      'path-alert-log-entry',
      displayState.muted ? 'alert-log-entry-muted' : '',
      displayState.collapsed ? 'alert-log-entry-collapsed' : ''
    ].filter(Boolean).join(' ');
    const titleClassName = displayState.collapsed ? 'alert-log-title-muted' : '';
    return `
            <div
                class="${cardClassName}"
                data-path-alert-log-entry="${escapeHtml(entry && entry.alert && entry.alert.id || '')}"
                data-muted-target-key="${escapeHtml(targetKey)}"
                data-alert-log-collapsed="${displayState.collapsed ? '1' : '0'}"
            >
                <div class="path-alert-log-head">
                    <div>
                        <div><strong class="${titleClassName}" data-alert-log-title data-alert-log-expanded-title="${escapeHtml(expandedTitle)}">${title}</strong></div>
                        <div class="path-alert-log-profit alert-log-collapsible"${displayState.collapsed ? ' hidden' : ''}>📈 ${profitText}</div>
                    </div>
                    <div class="path-alert-log-actions alert-log-collapsible"${displayState.collapsed ? ' hidden' : ''}>${muteButtonHtml}</div>
                </div>
                <div class="path-alert-log-route alert-log-collapsible"${displayState.collapsed ? ' hidden' : ''}>${routeLinesHtml || '<div class="path-alert-log-line">--</div>'}</div>
                <div class="path-alert-log-foot alert-log-collapsible"${displayState.collapsed ? ' hidden' : ''}>
                    <span class="${statusClass}" data-path-alert-muted-status>${escapeHtml(statusText)}</span>
                    <span class="log-time">${new Date(nowMs).toLocaleTimeString()}</span>
                </div>
            </div>
        `;
  }

  function buildQuoteAlertLogHtml(entry, options = {}) {
    const quote = entry && entry.quote ? entry.quote : null;
    const heading = [entry && entry.label, entry && entry.currentValueText].filter(Boolean).join('  ');
    const expandedTitle = entry && entry.displayName ? entry.displayName : '';
    const actionLink = options.actionLink || entry && entry.actionLink || null;
    const mutedEntry = options.mutedEntry || null;
    const displayState = buildAlertLogEntryDisplayState({ ...entry, mutedEntry });
    const collapsedTitle = [expandedTitle, heading].filter(Boolean).join('  ') || expandedTitle || '报价提醒';
    const targetKey = options.targetKey || '';
    const nowMs = Number(options.nowMs) || Date.now();
    const statusText = options.statusText || (mutedEntry ? '' : '已触发');
    const statusClass = mutedEntry ? 'path-alert-log-tag path-alert-log-tag-muted' : 'path-alert-log-tag';
    const dexLinkHtml = actionLink && actionLink.url
      ? `<a
                    href="${escapeHtml(actionLink.url)}"
                    class="quote-alert-log-link"
                    data-quote-alert-dex-link="${escapeHtml(actionLink.url)}"
                    data-quote-alert-dex-link-copy="1"
                    data-dex-link-label="${escapeHtml(actionLink.label || '交易链接')}"
                    data-dex-link-chain="${escapeHtml(quote && quote.chain || '')}"
                    data-dex-link-from-token-address="${escapeHtml(quote && quote.fromToken || '')}"
                    data-dex-link-to-token-address="${escapeHtml(quote && quote.toToken || '')}"
                    data-dex-link-input-amount="${escapeHtml(quote && quote.amount || '')}"
                >${escapeHtml(actionLink.label || '交易链接')}</a>`
      : '';
    const muteButtonHtml = entry && entry.mutedTargetCandidate
      ? `<button
                    type="button"
                    class="path-alert-log-mute-btn"
                    data-quote-alert-log-mute="${escapeHtml(entry.alert && entry.alert.id || '')}"
                >${mutedEntry ? '延长 2 小时' : '忽略 1 小时'}</button>`
      : '';
    const cardClassName = [
      'log-entry',
      'quote-alert-log-entry',
      displayState.muted ? 'alert-log-entry-muted' : '',
      displayState.collapsed ? 'alert-log-entry-collapsed' : ''
    ].filter(Boolean).join(' ');
    const titleClassName = displayState.collapsed ? 'alert-log-title-muted' : '';
    return `
            <div
                class="${cardClassName}"
                data-quote-alert-log-entry="${escapeHtml(entry && entry.alert && entry.alert.id || '')}"
                data-muted-target-key="${escapeHtml(targetKey)}"
                data-alert-log-collapsed="${displayState.collapsed ? '1' : '0'}"
            >
                <div class="path-alert-log-head">
                    <div>
                        <div><strong class="${titleClassName}" data-alert-log-title data-alert-log-expanded-title="${escapeHtml(expandedTitle)}">${escapeHtml(displayState.collapsed ? collapsedTitle : expandedTitle)}</strong></div>
                        ${heading ? `<div class="alert-log-collapsible"${displayState.collapsed ? ' hidden' : ''}>${escapeHtml(heading)}</div>` : ''}
                        <div class="alert-log-collapsible"${displayState.collapsed ? ' hidden' : ''}>${escapeHtml(entry && entry.message || '')}</div>
                        ${dexLinkHtml ? `<div class="quote-alert-log-link-row alert-log-collapsible"${displayState.collapsed ? ' hidden' : ''}>${dexLinkHtml}</div>` : ''}
                    </div>
                    <div class="path-alert-log-actions alert-log-collapsible"${displayState.collapsed ? ' hidden' : ''}>${muteButtonHtml}</div>
                </div>
                <div class="path-alert-log-foot alert-log-collapsible"${displayState.collapsed ? ' hidden' : ''}>
                    <span class="${statusClass}" data-path-alert-muted-status>${escapeHtml(statusText)}</span>
                    <span class="log-time">${new Date(nowMs).toLocaleTimeString()}</span>
                </div>
            </div>
        `;
  }

  return {
    buildAlertLogAppendPlan,
    resolveAlertLogCardPlacement,
    buildAlertLogMutedStatusState,
    buildMutedTargetLogCardSelector,
    buildRestoredMutedAlertLogPlan,
    buildMutedAlertStatePanelHtml,
    buildRestoredMutedAlertLogHtml,
    buildPathAlertLogCardHtml,
    buildQuoteAlertLogHtml,
    hasMutedTargetLogCard,
    removeRestoredMutedAlertLogCards,
    resolveAlertLogClickAction
  };
}));
