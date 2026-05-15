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

  function shortenTokenText(value) {
    const text = String(value || '').trim();
    if (!text) return '--';
    if (text.length <= 18) return text;
    return `${text.slice(0, 8)}...${text.slice(-6)}`;
  }

  function buildPathAlertQuoteLabel(options = {}) {
    const formatChainLabel = typeof options.formatChainLabel === 'function'
      ? options.formatChainLabel
      : (chain) => chain || '';
    const chainLabel = formatChainLabel(options.chain);
    const fromSymbol = options.fromSymbol || '--';
    const toSymbol = options.toSymbol || '--';
    const suffix = options.suffix || '';
    return `(${chainLabel}) ${fromSymbol} -> ${toSymbol}${suffix}`;
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

  function renderPathAlertRouteLinesHtml(lines, className = 'path-alert-item-route-line', options = {}) {
    const safeClassName = String(className || 'path-alert-item-route-line');
    const sourceLines = Array.isArray(lines) ? lines : [];
    const safeLines = options.filterEmpty === false ? sourceLines : sourceLines.filter(Boolean);
    if (!safeLines.length) {
      return `<div class="${escapeHtml(safeClassName)}">--</div>`;
    }
    return safeLines
      .map((line) => `<div class="${escapeHtml(safeClassName)}">${escapeHtml(line)}</div>`)
      .join('');
  }

  function renderPathAlertSummaryLinesHtml(lines) {
    return renderPathAlertRouteLinesHtml(lines, 'path-alert-item-route-line', { filterEmpty: false });
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

  function getTargetLegCount(target) {
    return Array.isArray(target && target.legs) ? target.legs.length : 0;
  }

  function buildPathAlertCardTitle(alert, options = {}) {
    const getDisplayTitle = typeof options.getDisplayTitle === 'function'
      ? options.getDisplayTitle
      : () => '';
    const buildQuoteLabel = typeof options.buildQuoteLabel === 'function'
      ? options.buildQuoteLabel
      : null;
    const title = getDisplayTitle(alert);
    if (title) return title;

    const target = alert && alert.target ? alert.target : null;
    if (target && target.type === 'quote') {
      return buildQuoteLabel ? buildQuoteLabel(target) : '交易对报警';
    }
    if (target && target.type === 'rule') {
      return target.ruleKind === 'fixed' ? '固定规则' : '特殊规则';
    }

    const legCount = getTargetLegCount(target);
    return legCount > 0 ? `路径规则 (${legCount}腿)` : '路径规则';
  }

  function buildDismissedTargetCardTitle(entry) {
    const target = entry && entry.target ? entry.target : null;
    if (!target) return '已忽略规则';
    if (target.type === 'quote') return '已忽略交易对报警';
    if (target.type === 'rule') {
      return target.ruleKind === 'fixed' ? '已忽略固定规则' : '已忽略特殊规则';
    }
    const legCount = getTargetLegCount(target);
    return legCount > 0 ? `已忽略手工路径 (${legCount}腿)` : '已忽略手工路径';
  }

  function getPathAlertTypeLabel(alert) {
    const target = alert && alert.target ? alert.target : null;
    if (target && target.type === 'quote') return '交易对';
    if (target && target.type === 'rule') {
      return target.ruleKind === 'fixed' ? '固定' : '特殊';
    }
    return '路径';
  }

  function buildPathAlertCardValueText(alert, resolveSpecialRuleConfig) {
    const target = alert && alert.target ? alert.target : null;
    if (target && target.type === 'quote') {
      return String(target.value != null ? target.value : '--');
    }
    if (target && target.type === 'rule' && target.ruleKind === 'special') {
      const specialRuleConfig = resolveSpecialRuleConfig(alert && alert.specialRuleConfig);
      return `>${String(specialRuleConfig.minNetProfit != null ? specialRuleConfig.minNetProfit : '--')} / >${String(specialRuleConfig.minNetProfitBp != null ? specialRuleConfig.minNetProfitBp : '--')}bp`;
    }
    return `${String(alert && alert.thresholdBp != null ? alert.thresholdBp : '--')}bp`;
  }

  function buildPathAlertCardMetaText(alert, options = {}) {
    const resolveSpecialRuleConfig = typeof options.resolveSpecialRuleConfig === 'function'
      ? options.resolveSpecialRuleConfig
      : (config) => (config && typeof config === 'object' ? config : {});
    const triggerLabel = alert && alert.triggerMode === 'delayed'
      ? `⏱${Number(alert.confirmDelaySec || 0)}s`
      : '⚡立即';
    const statusLabel = alert && alert.enabled === false ? '⛔' : '✅';
    return [
      `🏷️${getPathAlertTypeLabel(alert)}`,
      `🎯${buildPathAlertCardValueText(alert, resolveSpecialRuleConfig)}`,
      triggerLabel,
      `❄️${String(alert && alert.cooldownSec != null ? alert.cooldownSec : '--')}s`,
      statusLabel
    ].join(' · ');
  }

  function buildDismissedTargetMetaText(entry, options = {}) {
    const formatDate = typeof options.formatDate === 'function'
      ? options.formatDate
      : (value) => new Date(value).toLocaleString();
    const dismissedAtText = entry && entry.dismissedAt ? formatDate(entry.dismissedAt) : '--';
    return `🗃️已忽略 · 🕒${dismissedAtText}`;
  }

  function isQuoteScopedAlertTarget(target, quoteId) {
    const filterQuoteId = String(quoteId || '').trim();
    if (!filterQuoteId) return true;
    return Boolean(
      target
      && target.type === 'quote'
      && String(target.quoteId) === filterQuoteId
    );
  }

  function filterAlertsByQuoteId(alerts, quoteId) {
    const items = Array.isArray(alerts) ? alerts : [];
    return items.filter((alert) => isQuoteScopedAlertTarget(alert && alert.target, quoteId));
  }

  function filterDismissedTargetsByQuoteId(entries, quoteId) {
    const items = Array.isArray(entries) ? entries : [];
    return items.filter((entry) => isQuoteScopedAlertTarget(entry && entry.target, quoteId));
  }

  function pruneSelectionSet(selection, validIds) {
    const validIdSet = new Set((Array.isArray(validIds) ? validIds : []).map((id) => String(id || '')));
    return new Set(
      Array.from(selection instanceof Set ? selection : new Set(selection || []))
        .filter((id) => validIdSet.has(String(id || '')))
    );
  }

  function groupAlertsBySection(alerts) {
    const grouped = {
      quote: [],
      rule: [],
      path: [],
      special: []
    };
    for (const alert of (Array.isArray(alerts) ? alerts : [])) {
      if (!alert || !alert.target) continue;
      if (alert.target.type === 'quote') {
        grouped.quote.push(alert);
        continue;
      }
      if (alert.target.type === 'rule') {
        if (alert.target.ruleKind === 'special') grouped.special.push(alert);
        else grouped.rule.push(alert);
        continue;
      }
      grouped.path.push(alert);
    }
    return grouped;
  }

  function buildPathAlertSectionConfigs(grouped, options = {}) {
    const groups = grouped && typeof grouped === 'object' ? grouped : {};
    const hasQuoteFilter = Boolean(String(options.filterQuoteId || '').trim());
    return [
      {
        key: 'quote',
        id: 'quote-alert-section',
        title: '交易对报警',
        note: hasQuoteFilter ? '当前交易对上下文' : '按交易对汇率分组',
        items: Array.isArray(groups.quote) ? groups.quote : [],
        tagClass: 'quote'
      },
      {
        key: 'rule',
        id: 'rule-alert-section',
        title: '固定规则',
        note: '直接展示实际路径腿',
        items: Array.isArray(groups.rule) ? groups.rule : [],
        tagClass: 'rule'
      },
      {
        key: 'path',
        id: 'path-manual-section',
        title: '手工路径',
        note: '保留完整 legs',
        items: Array.isArray(groups.path) ? groups.path : [],
        tagClass: 'path'
      },
      {
        key: 'special',
        id: 'special-alert-section',
        title: '特殊规则',
        note: '特殊聚合逻辑',
        items: Array.isArray(groups.special) ? groups.special : [],
        tagClass: 'special'
      }
    ];
  }

  return {
    sanitizePathAlertDraft,
    buildDismissedTargetCardTitle,
    buildDismissedTargetMetaText,
    buildPathAlertCardMetaText,
    buildPathAlertCardTitle,
    buildPathAlertQuoteLabel,
    buildPathAlertSectionConfigs,
    buildPathAlertMetaText,
    buildPathAlertsPageHref,
    escapeHtml,
    filterAlertsByQuoteId,
    filterDismissedTargetsByQuoteId,
    groupAlertsBySection,
    parsePathAlertsPagePrefill,
    pruneSelectionSet,
    renderPathAlertItemHtml,
    renderPathAlertPanelHtml,
    renderPathAlertRouteLinesHtml,
    renderPathAlertSummaryLinesHtml,
    renderPathAlertToolbarHtml,
    shortenTokenText
  };
}));
