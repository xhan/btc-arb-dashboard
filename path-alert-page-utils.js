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

  function getPathAlertQuoteDirection(target, options = {}) {
    if (typeof options.getQuoteDirection === 'function') {
      return options.getQuoteDirection(target);
    }
    return target && target.direction === 'inverse' ? 'inverse' : 'forward';
  }

  function buildPathAlertQuoteDirectionLabel(target, options = {}) {
    if (typeof options.buildQuoteDirectionLabel === 'function') {
      return options.buildQuoteDirectionLabel(target);
    }
    return getPathAlertQuoteDirection(target, options) === 'inverse' ? '反向' : '正向';
  }

  function isPathAlertCexOrderbookChain(chain, options = {}) {
    return typeof options.isCexOrderbookChain === 'function'
      ? options.isCexOrderbookChain(chain)
      : false;
  }

  function parsePathAlertCexPair(symbol, options = {}) {
    return typeof options.parseCexTradingPairSymbol === 'function'
      ? options.parseCexTradingPairSymbol(symbol)
      : null;
  }

  function formatPathAlertChainLabel(chain, options = {}) {
    return typeof options.formatChainLabel === 'function'
      ? options.formatChainLabel(chain)
      : String(chain || '');
  }

  function buildPathAlertQuotePairLabel(chain, fromSymbol, toSymbol, suffix, options = {}) {
    if (typeof options.buildQuoteLabel === 'function') {
      return options.buildQuoteLabel(chain, fromSymbol, toSymbol, suffix);
    }
    return buildPathAlertQuoteLabel({
      chain,
      fromSymbol,
      toSymbol,
      suffix,
      formatChainLabel: (value) => formatPathAlertChainLabel(value, options)
    });
  }

  function shortenPathAlertQuoteToken(value, options = {}) {
    return typeof options.shortenToken === 'function'
      ? options.shortenToken(value)
      : shortenTokenText(value);
  }

  function buildPathAlertQuoteDisplayLabel(target, quote, options = {}) {
    if (!quote) {
      return `报价 #${String(target && target.quoteId || '--')}`;
    }
    const direction = getPathAlertQuoteDirection(target, options);
    const directionLabel = buildPathAlertQuoteDirectionLabel(target, options);
    if (isPathAlertCexOrderbookChain(quote.chain, options)) {
      const parsed = parsePathAlertCexPair(quote.symbol, options);
      if (parsed) {
        const fromSymbol = direction === 'inverse' ? parsed.toSymbol : parsed.fromSymbol;
        const toSymbol = direction === 'inverse' ? parsed.fromSymbol : parsed.toSymbol;
        return `${directionLabel} ${buildPathAlertQuotePairLabel(quote.chain, fromSymbol, toSymbol, '', options)}`;
      }
      return `${directionLabel} (${formatPathAlertChainLabel(quote.chain, options)}) ${quote.symbol || '--'}`;
    }
    const fromToken = direction === 'inverse' ? quote.toToken : quote.fromToken;
    const toToken = direction === 'inverse' ? quote.fromToken : quote.toToken;
    return `${directionLabel} ${buildPathAlertQuotePairLabel(
      quote.chain,
      shortenPathAlertQuoteToken(fromToken, options),
      shortenPathAlertQuoteToken(toToken, options),
      '',
      options
    )}`;
  }

  function findPathAlertQuoteCandidateForTarget(target, candidates, options = {}) {
    const quoteId = Number(target && target.quoteId);
    if (!Number.isFinite(quoteId)) return null;
    const direction = getPathAlertQuoteDirection(target, options);
    const items = Array.isArray(candidates) ? candidates : [];
    return items.find((candidate) => (
      Number(candidate && candidate.quoteId) === quoteId
      && String(candidate && candidate.direction || 'forward') === direction
      && String(candidate && candidate.pricingMode || 'raw') === 'raw'
    )) || null;
  }

  function buildPathAlertQuotePairText(target, quote, candidates, options = {}) {
    if (!quote) {
      return `报价 #${String(target && target.quoteId || '--')}`;
    }
    const direction = getPathAlertQuoteDirection(target, options);
    if (isPathAlertCexOrderbookChain(quote.chain, options)) {
      const parsed = parsePathAlertCexPair(quote.symbol, options);
      if (parsed) {
        const fromSymbol = direction === 'inverse' ? parsed.toSymbol : parsed.fromSymbol;
        const toSymbol = direction === 'inverse' ? parsed.fromSymbol : parsed.toSymbol;
        return `${formatPathAlertChainLabel(quote.chain, options)} ${fromSymbol}/${toSymbol}`;
      }
      return `${formatPathAlertChainLabel(quote.chain, options)} ${quote.symbol || '--'}`;
    }
    const candidate = findPathAlertQuoteCandidateForTarget(target, candidates, options);
    if (candidate && candidate.fromSymbol && candidate.toSymbol) {
      return `${formatPathAlertChainLabel(quote.chain, options)} ${candidate.fromSymbol}/${candidate.toSymbol}`;
    }
    const fromToken = direction === 'inverse' ? quote.toToken : quote.fromToken;
    const toToken = direction === 'inverse' ? quote.fromToken : quote.toToken;
    return `${formatPathAlertChainLabel(quote.chain, options)} ${shortenPathAlertQuoteToken(fromToken, options)}/${shortenPathAlertQuoteToken(toToken, options)}`;
  }

  function getPathAlertQuoteDefaultNameSuffix(target) {
    if (target && target.ruleKind === 'targetAbove') return '汇率高于';
    if (target && target.ruleKind === 'targetBelow') return '汇率低于';
    if (target && target.ruleKind === 'percentUp') return '上涨提醒';
    if (target && target.ruleKind === 'percentDown') return '下跌提醒';
    return '报警';
  }

  function buildPathAlertDefaultQuoteAlertName(target, quote, candidates, options = {}) {
    if (!target || target.type !== 'quote') return '';
    const pairText = buildPathAlertQuotePairText(target, quote, candidates, options);
    return `${pairText} ${getPathAlertQuoteDefaultNameSuffix(target)}`.trim();
  }

  function buildPathAlertPageSummaryLines(alert, options = {}) {
    const getDisplayTitle = typeof options.getDisplayTitle === 'function'
      ? options.getDisplayTitle
      : () => '';
    const buildQuoteAlertThresholdLine = typeof options.buildQuoteAlertThresholdLine === 'function'
      ? options.buildQuoteAlertThresholdLine
      : () => '--';
    const buildQuoteAlertQuoteLabel = typeof options.buildQuoteAlertQuoteLabel === 'function'
      ? options.buildQuoteAlertQuoteLabel
      : (target) => buildPathAlertQuoteDisplayLabel(target, null, options);
    const buildQuoteAlertRuleLine = typeof options.buildQuoteAlertRuleLine === 'function'
      ? options.buildQuoteAlertRuleLine
      : () => '--';
    const buildPathAlertSummaryLines = typeof options.buildPathAlertSummaryLines === 'function'
      ? options.buildPathAlertSummaryLines
      : null;
    const formatLeg = typeof options.formatLeg === 'function'
      ? options.formatLeg
      : (leg) => buildPathAlertQuotePairLabel(leg && leg.chain, leg && leg.fromSymbol, leg && leg.toSymbol, '', options);
    const findRule = typeof options.findRule === 'function'
      ? options.findRule
      : () => null;

    if (alert && alert.target && alert.target.type === 'quote') {
      const displayTitle = getDisplayTitle(alert);
      if (displayTitle) {
        return [
          displayTitle,
          buildQuoteAlertThresholdLine(alert.target)
        ];
      }
      return [
        buildQuoteAlertQuoteLabel(alert.target),
        buildQuoteAlertRuleLine(alert.target)
      ];
    }
    if (buildPathAlertSummaryLines) {
      return buildPathAlertSummaryLines(alert, {
        formatLeg,
        findRule
      });
    }
    if (!alert || !alert.target) return [];
    if (alert.target.type === 'rule') {
      const rule = findRule(alert.target.ruleKind, alert.target.ruleId);
      return [rule ? rule.title : alert.target.ruleId];
    }
    return (alert.target.legs || []).map(formatLeg);
  }

  function buildPathAlertLegDisplayLine(leg, options = {}) {
    if (!leg) return '--';
    const suffixByMode = {
      'cex-bid1': ' [bid1]',
      'cex-ask1-inverse': ' [ask1]'
    };
    const suffix = suffixByMode[leg.pricingMode] || '';
    return buildPathAlertQuotePairLabel(
      leg.chain,
      leg.fromSymbol,
      leg.toSymbol,
      suffix,
      options
    );
  }

  function buildPathAlertSummaryLegLine(leg, state, options = {}) {
    if (!leg) return '--';
    let fromSymbol = leg.fromSymbol;
    let toSymbol = leg.toSymbol;
    let suffix = '';
    if (!state || !state.fromSymbol || !state.toSymbol) {
      return buildPathAlertQuotePairLabel(leg.chain, fromSymbol, toSymbol, suffix, options);
    }
    fromSymbol = state.fromSymbol;
    toSymbol = state.toSymbol;
    if (leg.pricingMode === 'cex-ask1-inverse' || leg.direction === 'inverse') {
      fromSymbol = state.toSymbol;
      toSymbol = state.fromSymbol;
    }
    if (leg.pricingMode === 'cex-ask1-inverse') {
      suffix = ' [ask1]';
    }
    if (leg.pricingMode === 'cex-bid1') {
      suffix = ' [bid1]';
    }
    return buildPathAlertQuotePairLabel(leg.chain, fromSymbol, toSymbol, suffix, options);
  }

  function buildDismissedPathAlertPageSummaryLines(entry, options = {}) {
    const lines = Array.isArray(entry && entry.summaryLinesSnapshot)
      ? entry.summaryLinesSnapshot.filter(Boolean)
      : [];
    if (lines.length) return lines;
    if (!entry || !entry.target) return [];
    return buildPathAlertPageSummaryLines({ target: entry.target }, options);
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

  function getPathAlertStatusInfo(alert, runtime) {
    if (!alert || alert.enabled === false) {
      return { text: '已禁用', className: 'path-alert-status-disabled' };
    }
    if (!runtime || runtime.status === 'unavailable') {
      if (alert && alert.target && alert.target.type === 'quote') {
        return { text: '等待报价', className: 'path-alert-status-unavailable' };
      }
      return { text: '缺报价', className: 'path-alert-status-unavailable' };
    }
    if (runtime.status === 'pending_confirm') {
      return { text: '待确认', className: 'path-alert-status-pending' };
    }
    if (runtime.status === 'cooldown') {
      return { text: '冷却中', className: 'path-alert-status-cooldown' };
    }
    return { text: '', className: '' };
  }

  function buildPathAlertPanelRenderOptions(options = {}) {
    const alerts = Array.isArray(options.alerts) ? options.alerts : [];
    const settings = options.settings && typeof options.settings === 'object' ? options.settings : {};
    const dismissedCount = Number.isFinite(Number(options.dismissedCount)) ? Number(options.dismissedCount) : 0;
    const forceImmediateAlerts = options.forceImmediateAlerts === true;
    const getRuntime = typeof options.getRuntime === 'function' ? options.getRuntime : () => null;
    const resolveStatusInfo = typeof options.getStatusInfo === 'function' ? options.getStatusInfo : getPathAlertStatusInfo;
    const buildTitle = typeof options.buildTitle === 'function' ? options.buildTitle : () => '';
    const renderSummaryLinesHtml = typeof options.renderSummaryLinesHtml === 'function' ? options.renderSummaryLinesHtml : () => '';
    const buildMetaText = typeof options.buildMetaText === 'function' ? options.buildMetaText : () => '';
    const buildEditHref = typeof options.buildEditHref === 'function'
      ? options.buildEditHref
      : (alert) => buildPathAlertsPageHref({ mode: 'edit', alertId: alert && alert.id });
    const formatEvaluationText = typeof options.formatEvaluationText === 'function' ? options.formatEvaluationText : () => '--';
    const formatTime = typeof options.formatTime === 'function' ? options.formatTime : (value) => new Date(value).toLocaleTimeString();
    const baseOptions = {
      settings,
      dismissedCount,
      forceImmediateAlerts
    };

    if (!alerts.length) {
      return {
        ...baseOptions,
        emptyText: options.emptyText || '暂无路径报警'
      };
    }

    const alertItems = alerts
      .map((alert) => {
        const runtime = getRuntime(alert) || null;
        const evaluation = runtime && runtime.evaluation ? runtime.evaluation : null;
        const statusInfo = resolveStatusInfo(alert, runtime);
        return {
          alert,
          runtime,
          evaluation,
          statusInfo
        };
      })
      .filter(({ statusInfo }) => Boolean(
        statusInfo
        && statusInfo.text
        && statusInfo.className !== 'path-alert-status-unavailable'
      ));

    if (!alertItems.length) {
      return {
        ...baseOptions,
        emptyText: options.noActionableText || '暂无需要关注的路径报警'
      };
    }

    return {
      ...baseOptions,
      items: alertItems.map(({ alert, runtime, evaluation, statusInfo }) => ({
        alertId: alert && alert.id,
        title: buildTitle(alert),
        routeHtml: renderSummaryLinesHtml(alert),
        metaText: buildMetaText(alert),
        editHref: buildEditHref(alert),
        statusText: statusInfo.text,
        statusClassName: statusInfo.className,
        evaluationText: formatEvaluationText(evaluation),
        lastTriggeredText: runtime && runtime.lastTriggeredAt ? formatTime(runtime.lastTriggeredAt) : '--'
      }))
    };
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

  function buildPathAlertContextQuoteLabel(options = {}) {
    const quote = options.quote && typeof options.quote === 'object' ? options.quote : null;
    const filterQuoteId = String(options.filterQuoteId || '').trim();
    if (!quote) return `交易对 #${filterQuoteId || '--'}`;

    const isCexOrderbookChain = typeof options.isCexOrderbookChain === 'function'
      ? options.isCexOrderbookChain
      : () => false;
    const formatChainLabel = typeof options.formatChainLabel === 'function'
      ? options.formatChainLabel
      : (chain) => String(chain || '');
    const shortenToken = typeof options.shortenToken === 'function'
      ? options.shortenToken
      : shortenTokenText;
    const buildQuoteLabel = typeof options.buildQuoteLabel === 'function'
      ? options.buildQuoteLabel
      : (chain, fromSymbol, toSymbol) => buildPathAlertQuoteLabel({
        chain,
        fromSymbol,
        toSymbol,
        formatChainLabel
      });

    if (isCexOrderbookChain(quote.chain)) {
      return `${formatChainLabel(quote.chain)} ${quote.symbol || '--'}`;
    }
    return buildQuoteLabel(
      quote.chain,
      shortenToken(quote.fromToken),
      shortenToken(quote.toToken)
    ).replace(/[()]/g, '');
  }

  function renderPathAlertContextBarHtml(options = {}) {
    const filteredCount = Number.isFinite(Number(options.filteredCount))
      ? Number(options.filteredCount)
      : 0;
    return `
      <div class="context-left">
        <span class="chip context">当前交易对 · ${escapeHtml(options.quoteLabel)}</span>
        <span class="chip">仅展示这个交易对相关报警</span>
      </div>
      <div class="toolbar-right">
        <button type="button" data-context-create="forward">新增正向报警</button>
        <button type="button" data-context-create="inverse">新增反向报警</button>
        <div class="inline-count">当前 ${filteredCount} 条</div>
      </div>
    `;
  }

  function buildPathAlertCardSubtitle(alert) {
    if (alert && alert.target && alert.target.type === 'quote') {
      return alert.target.ruleKind || '交易对报警';
    }
    if (alert && alert.target && alert.target.type === 'rule') {
      return alert.target.ruleKind === 'fixed' ? '固定规则路径' : '特殊规则路径';
    }
    return `${getTargetLegCount(alert && alert.target)} 腿路径`;
  }

  function getPathAlertSectionTypeClass(sectionKey) {
    if (sectionKey === 'quote') return 'quote';
    if (sectionKey === 'rule') return 'rule';
    if (sectionKey === 'special') return 'special';
    return 'path';
  }

  function getPathAlertSectionTypeLabel(sectionKey) {
    if (sectionKey === 'quote') return '交易对';
    if (sectionKey === 'rule') return '固定';
    if (sectionKey === 'special') return '特殊';
    return '路径';
  }

  function renderPathAlertCardHtml(item = {}) {
    const alertId = String(item.alertId || '');
    const routeHtml = item.routeHtml || renderPathAlertRouteLinesHtml(item.summaryLines, 'alert-card-route-line');
    return `
        <article class="alert-card" data-alert-open="${escapeHtml(alertId)}">
          <div class="alert-card-shell">
            <input class="alert-card-select" type="checkbox" data-alert-select="${escapeHtml(alertId)}" ${item.selected ? 'checked' : ''}>
            <div class="alert-card-main">
              <div class="alert-card-head">
                <div>
                  <div class="alert-card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
                  <div class="alert-card-subline">${escapeHtml(item.subtitle)}</div>
                </div>
                <div class="alert-card-meta-tags">
                  <span class="tag ${escapeHtml(item.typeClass)}">${escapeHtml(item.typeLabel)}</span>
                  <span class="tag live">${item.enabled === false ? '停用' : '启用'}</span>
                </div>
              </div>
              <div class="alert-card-route">${routeHtml}</div>
              <div class="alert-card-foot">
                <div class="alert-card-meta" title="${escapeHtml(item.metaText)}">${escapeHtml(item.metaText)}</div>
                <div class="alert-card-actions">
                  <button type="button" class="inline-action-btn" data-alert-edit="${escapeHtml(alertId)}">编辑</button>
                  <button type="button" class="inline-action-btn" data-alert-toggle="${escapeHtml(alertId)}">${item.enabled === false ? '启用' : '停用'}</button>
                  <button type="button" class="inline-action-btn" data-alert-dismiss-delete="${escapeHtml(alertId)}">忽略并删除</button>
                  <button type="button" class="inline-action-btn danger" data-alert-delete="${escapeHtml(alertId)}">删除</button>
                </div>
              </div>
            </div>
          </div>
        </article>
      `;
  }

  function renderDismissedTargetCardHtml(item = {}) {
    const targetKey = String(item.targetKey || '');
    const routeHtml = item.routeHtml || renderPathAlertRouteLinesHtml(item.summaryLines, 'alert-card-route-line');
    return `
          <article class="alert-card">
            <div class="alert-card-shell">
              <input class="alert-card-select" type="checkbox" data-dismissed-select="${escapeHtml(targetKey)}" ${item.selected ? 'checked' : ''}>
              <div class="alert-card-main">
                <div class="alert-card-head">
                  <div>
                    <div class="alert-card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
                    <div class="alert-card-subline">已忽略规则</div>
                  </div>
                  <div class="alert-card-meta-tags">
                    <span class="tag path">已忽略</span>
                  </div>
                </div>
                <div class="alert-card-route">${routeHtml}</div>
                <div class="alert-card-foot">
                  <div class="alert-card-meta" title="${escapeHtml(item.metaText)}">${escapeHtml(item.metaText)}</div>
                  <div class="alert-card-actions">
                    <button type="button" class="inline-action-btn" data-dismissed-restore="${escapeHtml(targetKey)}">取消标记</button>
                    <button type="button" class="inline-action-btn danger" data-dismissed-delete="${escapeHtml(targetKey)}">删除</button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        `;
  }

  function renderPathAlertSectionHtml(section = {}, cardsHtml = '') {
    return `
        <section id="${escapeHtml(section.id)}" class="panel section-block section-anchor">
          <div class="section-head">
            <div class="section-title">
              <span class="tag ${escapeHtml(section.tagClass)}">${escapeHtml(section.title)}</span>
              <h2>${escapeHtml(section.title)}</h2>
              <small>${escapeHtml(section.note)}</small>
            </div>
            <div class="section-link">${Number(section.count || 0)} 条</div>
          </div>
          <div class="card-grid">${cardsHtml || ''}</div>
        </section>
      `;
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
    buildPathAlertCardSubtitle,
    buildPathAlertCardTitle,
    buildPathAlertDefaultQuoteAlertName,
    buildPathAlertQuoteLabel,
    buildPathAlertQuoteDisplayLabel,
    buildPathAlertQuotePairText,
    buildPathAlertPanelRenderOptions,
    buildPathAlertPageSummaryLines,
    buildPathAlertLegDisplayLine,
    buildPathAlertSummaryLegLine,
    buildPathAlertSectionConfigs,
    buildPathAlertMetaText,
    buildPathAlertsPageHref,
    buildDismissedPathAlertPageSummaryLines,
    buildPathAlertContextQuoteLabel,
    escapeHtml,
    filterAlertsByQuoteId,
    filterDismissedTargetsByQuoteId,
    getPathAlertStatusInfo,
    groupAlertsBySection,
    parsePathAlertsPagePrefill,
    pruneSelectionSet,
    renderDismissedTargetCardHtml,
    renderPathAlertContextBarHtml,
    renderPathAlertCardHtml,
    renderPathAlertItemHtml,
    renderPathAlertPanelHtml,
    renderPathAlertRouteLinesHtml,
    renderPathAlertSectionHtml,
    renderPathAlertSummaryLinesHtml,
    renderPathAlertToolbarHtml,
    getPathAlertSectionTypeClass,
    getPathAlertSectionTypeLabel,
    shortenTokenText
  };
}));
