(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.PathAlertPageUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function sanitizeMode(mode) {
    return mode === 'edit' ? 'edit' : mode === 'create' ? 'create' : 'manage';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeLeg(leg) {
    if (!leg || typeof leg !== 'object') return null;
    const quoteId = Number(leg.quoteId);
    if (!Number.isFinite(quoteId) || quoteId <= 0) return null;
    const direction = leg.direction === 'inverse' ? 'inverse' : 'forward';
    const pricingMode = ['raw', 'cex-bid1', 'cex-ask1-inverse'].includes(leg.pricingMode)
      ? leg.pricingMode
      : 'raw';
    return {
      quoteId,
      direction,
      pricingMode,
      chain: String(leg.chain || ''),
      fromSymbol: String(leg.fromSymbol || ''),
      toSymbol: String(leg.toSymbol || '')
    };
  }

  function sanitizePathAlertDraft(draft) {
    if (!draft || typeof draft !== 'object') return null;
    const target = draft.target || {};
    if (target.type !== 'path' && target.type !== 'rule' && target.type !== 'quote') return null;

    const name = String(draft.name || '').trim();
    if (target.type === 'path') {
      const legs = Array.isArray(target.legs)
        ? target.legs.map(sanitizeLeg).filter(Boolean)
        : [];
      if (!legs.length) return null;
      return {
        name,
        target: {
          type: 'path',
          legs
        }
      };
    }

    if (target.type === 'quote') {
      const quoteId = Number(target.quoteId);
      const direction = target.direction === 'inverse' ? 'inverse' : 'forward';
      const ruleKind = ['targetAbove', 'targetBelow', 'percentUp', 'percentDown'].includes(target.ruleKind)
        ? target.ruleKind
        : '';
      const value = Number(target.value);
      if (!Number.isFinite(quoteId) || !ruleKind || !Number.isFinite(value)) return null;
      const normalizedTarget = {
        type: 'quote',
        quoteId,
        direction,
        ruleKind,
        value
      };
      if (ruleKind === 'percentUp' || ruleKind === 'percentDown') {
        const basePrice = Number(target.basePrice);
        if (!Number.isFinite(basePrice) || basePrice <= 0) return null;
        normalizedTarget.basePrice = basePrice;
      }
      return {
        name,
        target: normalizedTarget
      };
    }

    const ruleKind = target.ruleKind === 'special' ? 'special' : target.ruleKind === 'fixed' ? 'fixed' : '';
    const ruleId = String(target.ruleId || '').trim();
    if (!ruleKind || !ruleId) return null;
    return {
      name,
      target: {
        type: 'rule',
        ruleKind,
        ruleId
      }
    };
  }

  function buildPathAlertsPageHref(options = {}) {
    const mode = sanitizeMode(options.mode);
    const params = new URLSearchParams();
    if (mode !== 'manage') {
      params.set('mode', mode);
    }
    const filterQuoteId = String(options.filterQuoteId || '').trim();
    if (filterQuoteId) {
      params.set('filterQuoteId', filterQuoteId);
    }

    if (mode === 'edit') {
      const alertId = String(options.alertId || '').trim();
      if (alertId) {
        params.set('alertId', alertId);
      }
    }

    if (mode === 'create') {
      const draft = sanitizePathAlertDraft(options.draft);
      if (draft) {
        params.set('draft', JSON.stringify(draft));
      }
    }

    const search = params.toString();
    return search ? `/path-alerts?${search}` : '/path-alerts';
  }

  function parsePathAlertsPagePrefill(input) {
    const raw = String(input || '').trim();
    let url = null;
    try {
      url = new URL(raw.startsWith('http://') || raw.startsWith('https://')
        ? raw
        : (raw.startsWith('/') ? raw : `/${raw}`), 'https://codex.local');
    } catch {
      return {
        mode: 'manage',
        alertId: '',
        filterQuoteId: '',
        draft: null
      };
    }

    const mode = sanitizeMode(url.searchParams.get('mode'));
    const alertId = mode === 'edit'
      ? String(url.searchParams.get('alertId') || '').trim()
      : '';
    const filterQuoteId = String(url.searchParams.get('filterQuoteId') || '').trim();

    let draft = null;
    if (mode === 'create') {
      const draftValue = url.searchParams.get('draft');
      if (draftValue) {
        try {
          draft = sanitizePathAlertDraft(JSON.parse(draftValue));
        } catch {
          draft = null;
        }
      }
    }

    return {
      mode,
      alertId,
      filterQuoteId,
      draft
    };
  }

  function renderPathAlertToolbarHtml(options = {}) {
    const settings = options.settings && typeof options.settings === 'object' ? options.settings : {};
    const dismissedCount = Number.isFinite(Number(options.dismissedCount))
      ? Number(options.dismissedCount)
      : 0;
    return `
            <div class="path-alert-toolbar">
                <div class="path-alert-toolbar-meta">
                    <label class="path-alert-toolbar-toggle">
                        <input type="checkbox" data-path-alert-global-toggle="localSoundEnabled" ${settings.localSoundEnabled !== false ? 'checked' : ''}>
                        <span>音效</span>
                    </label>
                    <label class="path-alert-toolbar-toggle">
                        <input type="checkbox" data-path-alert-global-toggle="webhookEnabled" ${settings.webhookEnabled === true ? 'checked' : ''}>
                        <span>远程</span>
                    </label>
                    <label class="path-alert-toolbar-toggle">
                        <input type="checkbox" data-path-alert-force-immediate ${options.forceImmediateAlerts ? 'checked' : ''}>
                        <span>全部立即</span>
                    </label>
                    <div class="path-alert-toolbar-cycle">周期 ${escapeHtml(settings.pathAlertEvalIntervalMs)}ms</div>
                    <div class="path-alert-toolbar-cycle">已忽略 ${dismissedCount} 条</div>
                </div>
            </div>
        `;
  }

  function renderPathAlertItemHtml(item = {}) {
    const statusTagHtml = item.statusText
      ? `<span class="path-alert-status-tag ${escapeHtml(item.statusClassName)}">${escapeHtml(item.statusText)}</span>`
      : '';
    return `
                <div class="path-alert-item">
                    <div class="path-alert-item-head">
                        <div>
                            <div class="path-alert-item-title">${escapeHtml(item.title)}</div>
                            <div class="path-alert-item-route">${item.routeHtml || ''}</div>
                            <div class="path-alert-item-meta">${escapeHtml(item.metaText)}</div>
                        </div>
                        <div class="path-alert-item-actions">
                            <a
                                class="path-alert-item-link"
                                href="${escapeHtml(item.editHref)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                data-path-alert-edit-link="${escapeHtml(item.alertId)}"
                            >编辑</a>
                            <button type="button" data-path-alert-delete="${escapeHtml(item.alertId)}">删除</button>
                            <button type="button" data-path-alert-dismiss-delete="${escapeHtml(item.alertId)}">标记并删除</button>
                        </div>
                    </div>
                    <div class="path-alert-status-row">
                        ${statusTagHtml}
                        <span class="path-alert-profit">${escapeHtml(item.evaluationText)}</span>
                    </div>
                    <div class="path-alert-item-meta">上次报警: ${escapeHtml(item.lastTriggeredText || '--')}</div>
                </div>
            `;
  }

  function renderPathAlertSummaryLinesHtml(lines) {
    const safeLines = Array.isArray(lines) ? lines : [];
    if (!safeLines.length) {
      return '<div class="path-alert-item-route-line">--</div>';
    }
    return safeLines
      .map((line) => `<div class="path-alert-item-route-line">${escapeHtml(line)}</div>`)
      .join('');
  }

  function renderPathAlertPanelHtml(options = {}) {
    const toolbarHtml = renderPathAlertToolbarHtml(options);
    const items = Array.isArray(options.items) ? options.items : [];
    if (!items.length) {
      return `${toolbarHtml}<div class="path-alert-empty">${escapeHtml(options.emptyText || '暂无路径报警')}</div>`;
    }
    return `${toolbarHtml}<div class="path-alert-list">${items.map(renderPathAlertItemHtml).join('')}</div>`;
  }

  function buildPathAlertMetaText(alert, options = {}) {
    const triggerText = alert && alert.triggerMode === 'delayed'
      ? `延迟 ${String(alert.confirmDelaySec)}s`
      : '立即';
    const cooldownText = `冷却 ${String(alert && alert.cooldownSec)}s`;
    if (alert && alert.target && alert.target.type === 'quote') {
      return `报价 | ${String(alert.target.value != null ? alert.target.value : '--')} | ${triggerText} | ${cooldownText}`;
    }
    if (alert && alert.target && alert.target.type === 'rule' && alert.target.ruleKind === 'special') {
      const specialRuleConfig = typeof options.resolveSpecialRuleConfig === 'function'
        ? options.resolveSpecialRuleConfig(alert)
        : {};
      return [
        `净收益 > ${String(specialRuleConfig.minNetProfit != null ? specialRuleConfig.minNetProfit : '--')}`,
        `净收益率 > ${String(specialRuleConfig.minNetProfitBp != null ? specialRuleConfig.minNetProfitBp : '--')}bp`,
        triggerText,
        cooldownText
      ].join(' | ');
    }
    return `阈值 ${String(alert && alert.thresholdBp)}bp | ${triggerText} | ${cooldownText}`;
  }

  return {
    sanitizePathAlertDraft,
    buildPathAlertMetaText,
    buildPathAlertsPageHref,
    parsePathAlertsPagePrefill,
    renderPathAlertItemHtml,
    renderPathAlertPanelHtml,
    renderPathAlertSummaryLinesHtml,
    renderPathAlertToolbarHtml
  };
}));
