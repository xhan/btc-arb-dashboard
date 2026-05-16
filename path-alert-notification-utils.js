(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }
  root.PathAlertNotificationUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.PathAlertNotificationUtils = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function formatPathAlertEvaluationText(evaluation) {
    if (!evaluation || !Number.isFinite(evaluation.profitBp)) {
      return '--';
    }
    const value = evaluation.profitBp;
    return `📈 ${value >= 0 ? '+' : ''}${value.toFixed(2)}bp`;
  }

  function buildPathAlertLegKey(leg) {
    const quoteId = Number(leg && leg.quoteId);
    if (!Number.isFinite(quoteId) || quoteId <= 0) return '';
    const direction = leg && (leg.direction === 'inverse' || leg.inverse) ? 'inverse' : 'forward';
    const pricingMode = ['raw', 'cex-bid1', 'cex-ask1-inverse'].includes(leg && leg.pricingMode)
      ? leg.pricingMode
      : 'raw';
    return `${quoteId}|${direction}|${pricingMode}`;
  }

  function buildPathAlertChangedLegLines(changedLegs, options = {}) {
    const maxCount = Number.isFinite(Number(options.maxCount)) && Number(options.maxCount) > 0
      ? Number(options.maxCount)
      : 3;
    const formatLeg = typeof options.formatLeg === 'function'
      ? options.formatLeg
      : () => '--';
    return (Array.isArray(changedLegs) ? changedLegs : [])
      .slice(0, maxCount)
      .map((leg) => {
        const rateText = Number.isFinite(Number(leg && leg.rate))
          ? ` @${Number(leg.rate).toFixed(6)}`
          : '';
        const deltaBp = Number(leg && leg.deltaBp);
        const deltaText = Number.isFinite(deltaBp)
          ? `${deltaBp >= 0 ? '+' : ''}${deltaBp.toFixed(2)}bp`
          : '--';
        return `${formatLeg(leg)}${rateText} ${deltaText}`;
      });
  }

  function getPathAlertLegPricingMode(leg) {
    if (!leg || typeof leg !== 'object') return 'raw';
    if (leg.cexLevelLabel === 'bid1') return 'cex-bid1';
    if (leg.cexLevelLabel === 'ask1') return 'cex-ask1-inverse';
    return 'raw';
  }

  function buildMutedPathTargetFromCycleLegs(legs, options = {}) {
    const isRuleLeg = typeof options.isRuleLeg === 'function' ? options.isRuleLeg : () => false;
    const normalizedLegs = (Array.isArray(legs) ? legs : [])
      .filter((leg) => !isRuleLeg(leg) && Number.isFinite(Number(leg && leg.quoteId)))
      .map((leg) => ({
        quoteId: Number(leg.quoteId),
        direction: leg.inverse ? 'inverse' : 'forward',
        pricingMode: getPathAlertLegPricingMode(leg),
        chain: leg.chain,
        fromSymbol: leg.from,
        toSymbol: leg.to
      }));
    if (!normalizedLegs.length) return null;
    return {
      target: {
        type: 'path',
        legs: normalizedLegs
      }
    };
  }

  function buildMutedPathTargetCandidate(alert, evaluation, options = {}) {
    if (!alert || !alert.target) return null;
    if (alert.target.type === 'path') {
      return alert;
    }
    if (alert.target.type === 'rule' && alert.target.ruleKind === 'fixed' && evaluation && evaluation.cycle) {
      return buildMutedPathTargetFromCycleLegs(evaluation.cycle.legs, options);
    }
    return null;
  }

  function splitAlertMessageLines(message) {
    return String(message || '')
      .split('\n')
      .map((line) => String(line || '').trim())
      .filter(Boolean);
  }

  function buildPathAlertCycleSummaryEntries(alert, evaluation, options = {}) {
    if (evaluation && typeof evaluation.displayMessage === 'string' && evaluation.displayMessage.trim()) {
      return splitAlertMessageLines(evaluation.displayMessage).map((line) => ({ line, key: '' }));
    }
    if (evaluation && evaluation.cycle && Array.isArray(evaluation.cycle.legs)) {
      const isRuleLeg = typeof options.isRuleLeg === 'function' ? options.isRuleLeg : () => false;
      const formatCycleLeg = typeof options.formatCycleLeg === 'function' ? options.formatCycleLeg : () => '--';
      const entries = evaluation.cycle.legs
        .filter((leg) => !isRuleLeg(leg))
        .map((leg) => ({
          line: formatCycleLeg(leg),
          key: buildPathAlertLegKey(leg)
        }));
      if (entries.length) return entries;
    }
    const fallbackLines = typeof options.buildFallbackSummaryLines === 'function'
      ? options.buildFallbackSummaryLines(alert)
      : [];
    return (Array.isArray(fallbackLines) ? fallbackLines : []).map((line) => ({ line, key: '' }));
  }

  function buildTriggeredPathAlertEntry(options = {}) {
    const alert = options.alert || null;
    const evaluation = options.evaluation || null;
    const changedLegs = Array.isArray(options.changedLegs) ? options.changedLegs : [];
    const summaryEntries = buildPathAlertCycleSummaryEntries(alert, evaluation, options);
    const displayTitle = typeof options.buildDisplayTitle === 'function'
      ? options.buildDisplayTitle(alert)
      : '';
    const changedLegLines = buildPathAlertChangedLegLines(changedLegs, {
      maxCount: 3,
      formatLeg: options.formatChangedLeg
    });
    const realLegCount = typeof options.getRealLegCount === 'function'
      ? options.getRealLegCount(alert, evaluation)
      : 0;
    const mutedTargetCandidate = typeof options.buildMutedTargetCandidate === 'function'
      ? options.buildMutedTargetCandidate(alert, evaluation)
      : buildMutedPathTargetCandidate(alert, evaluation, options);

    return {
      alert: {
        ...(alert && typeof alert === 'object' ? alert : {}),
        name: displayTitle
      },
      evaluation,
      summaryLines: summaryEntries.map((item) => item.line),
      summaryLegKeys: summaryEntries.map((item) => item.key),
      customAlertMessage: String(evaluation && evaluation.alertMessage || '').trim(),
      changedLegLines,
      changedLegs: changedLegs.slice(0, 3),
      realLegCount,
      mutedTargetCandidate
    };
  }

  function sortTriggeredPathAlertEntries(entries, options = {}) {
    const sourceEntries = Array.isArray(entries) ? entries : [];
    const sortEntries = typeof options.sortEntries === 'function'
      ? options.sortEntries
      : (items) => items.slice();
    const getRealLegCount = typeof options.getRealLegCount === 'function'
      ? options.getRealLegCount
      : () => 0;
    return sortEntries(sourceEntries).map((entry) => ({
      ...entry,
      realLegCount: entry.realLegCount ?? getRealLegCount(entry.alert, entry.evaluation)
    }));
  }

  function markSummaryLines(entry, summaryLines) {
    const changedLegs = Array.isArray(entry && entry.changedLegs) ? entry.changedLegs : [];
    if (!changedLegs.length) return summaryLines;

    const changedKeys = new Set(changedLegs.map((leg) => buildPathAlertLegKey(leg)).filter(Boolean));
    const summaryLegKeys = Array.isArray(entry && entry.summaryLegKeys) ? entry.summaryLegKeys : [];
    return summaryLines.map((line, index) => {
      const key = summaryLegKeys[index];
      return key && changedKeys.has(key) ? `⚡ ${line}` : line;
    });
  }

  function buildEntryBlock(entry, options = {}) {
    const includeTitle = options.includeTitle === true;
    const title = String(entry && entry.alert && entry.alert.name || '').trim();
    const customAlertMessage = String(entry && entry.customAlertMessage || '').trim();
    const summaryLines = markSummaryLines(
      entry,
      Array.isArray(entry && entry.summaryLines) ? entry.summaryLines.filter(Boolean) : []
    );
    const changedLegLines = Array.isArray(entry && entry.changedLegLines) ? entry.changedLegLines.filter(Boolean) : [];
    const lines = [];

    if (includeTitle && title) {
      lines.push(title);
    }
    if (customAlertMessage) {
      lines.push(customAlertMessage);
      return lines.join('\n');
    }
    lines.push(formatPathAlertEvaluationText(entry && entry.evaluation));
    lines.push(...summaryLines);

    if (changedLegLines.length) {
      lines.push('');
      lines.push('⚡ 异动腿:');
      lines.push(...changedLegLines);
    }

    return lines.join('\n');
  }

  function buildPathAlertNotificationTitle(triggeredEntries) {
    const list = Array.isArray(triggeredEntries) ? triggeredEntries : [];
    if (!list.length) return '路径报警';
    if (list.length === 1) {
      const entry = list[0] || null;
      const title = String(entry && entry.alert && entry.alert.name || '').trim() || '路径报警';
      const isSpecialRule = Boolean(entry && entry.alert && entry.alert.target && entry.alert.target.type === 'rule' && entry.alert.target.ruleKind === 'special');
      return isSpecialRule ? `🚨 [特殊规则] ${title}` : title;
    }
    return `${list.length} 条`;
  }

  function buildPathAlertNotificationBody(triggeredEntries) {
    const list = (Array.isArray(triggeredEntries) ? triggeredEntries : []).slice(0, 3);
    if (!list.length) return '路径报警';
    return list.map((entry, index) => {
      return buildEntryBlock(entry, { includeTitle: list.length > 1 });
    }).join('\n\n');
  }

  function buildPathAlertAggregatedLog(triggeredEntries) {
    const list = (Array.isArray(triggeredEntries) ? triggeredEntries : []).slice(0, 3);
    if (!list.length) {
      return {
        title: '[路径报警]',
        subtitle: '',
        message: '本轮无可通知路径'
      };
    }

    if (list.length === 1) {
      return {
        title: `🚨 [路径报警] ${buildPathAlertNotificationTitle(list)}`,
        subtitle: '',
        message: buildPathAlertNotificationBody(list)
      };
    }

    return {
      title: `🚨 [路径报警] ${list.length} 条命中`,
      subtitle: '',
      message: buildPathAlertNotificationBody(list)
    };
  }

  function defaultQuoteAlertNumberFormatter(value, precision = 6) {
    return (typeof value === 'number' && Number.isFinite(value))
      ? Number(value.toFixed(precision))
      : '--';
  }

  function formatQuoteAlertNumber(value, options = {}) {
    if (typeof options.formatNumber === 'function') {
      return options.formatNumber(value);
    }
    return defaultQuoteAlertNumberFormatter(value);
  }

  function getQuoteAlertDirection(target) {
    return target && target.direction === 'inverse' ? 'inverse' : 'forward';
  }

  function buildQuoteAlertDirectionLabel(target) {
    return getQuoteAlertDirection(target) === 'inverse' ? '反向' : '正向';
  }

  function buildQuoteAlertThresholdLine(target) {
    if (!target || target.type !== 'quote') return '--';
    const directionLabel = buildQuoteAlertDirectionLabel(target);
    if (target.ruleKind === 'targetAbove' || target.ruleKind === 'targetBelow') {
      return `${directionLabel} · 汇率阈值 ${String(target.value != null ? target.value : '--')}`;
    }
    if (target.ruleKind === 'percentUp' || target.ruleKind === 'percentDown') {
      return `${directionLabel} · 阈值 ${String(target.value != null ? target.value : '--')}% | 基准汇率 ${String(target.basePrice != null ? target.basePrice : '--')}`;
    }
    return '--';
  }

  function buildQuoteAlertRuleLine(target) {
    if (!target || target.type !== 'quote') return '--';
    if (target.ruleKind === 'targetAbove') {
      return `汇率 >= ${String(target.value != null ? target.value : '--')}`;
    }
    if (target.ruleKind === 'targetBelow') {
      return `汇率 <= ${String(target.value != null ? target.value : '--')}`;
    }
    if (target.ruleKind === 'percentUp') {
      return `相对基准上涨 >= ${String(target.value != null ? target.value : '--')}%（基准 ${String(target.basePrice != null ? target.basePrice : '--')}）`;
    }
    if (target.ruleKind === 'percentDown') {
      return `相对基准下跌 >= ${String(target.value != null ? target.value : '--')}%（基准 ${String(target.basePrice != null ? target.basePrice : '--')}）`;
    }
    return '--';
  }

  function buildQuoteAlertSummaryRuleLine(target) {
    if (!target || target.type !== 'quote') return '--';
    if (target.ruleKind === 'targetAbove') {
      return `汇率 >= ${String(target.value != null ? target.value : '--')}`;
    }
    if (target.ruleKind === 'targetBelow') {
      return `汇率 <= ${String(target.value != null ? target.value : '--')}`;
    }
    if (target.ruleKind === 'percentUp') {
      return `相对基准上涨 >= ${String(target.value != null ? target.value : '--')}%`;
    }
    if (target.ruleKind === 'percentDown') {
      return `相对基准下跌 >= ${String(target.value != null ? target.value : '--')}%`;
    }
    return '--';
  }

  function buildQuoteAlertMessage(alert, evaluation, options = {}) {
    if (!alert || !alert.target || !evaluation) return '';
    const target = alert.target;
    if (target.ruleKind === 'targetAbove') {
      return `汇率已达到或超过目标 ${formatQuoteAlertNumber(target.value, options)}`;
    }
    if (target.ruleKind === 'targetBelow') {
      return `汇率已达到或低于目标 ${formatQuoteAlertNumber(target.value, options)}`;
    }
    if (target.ruleKind === 'percentUp') {
      return `汇率相比基准(${formatQuoteAlertNumber(evaluation.basePrice, options)}) 上涨 ${Number(evaluation.changePercent || 0).toFixed(3)}% (>${formatQuoteAlertNumber(target.value, options)}%)`;
    }
    if (target.ruleKind === 'percentDown') {
      return `汇率相比基准(${formatQuoteAlertNumber(evaluation.basePrice, options)}) 下跌 ${Math.abs(Number(evaluation.changePercent || 0)).toFixed(3)}% (>${formatQuoteAlertNumber(target.value, options)}%)`;
    }
    return '';
  }

  function buildQuoteAlertCurrentValueText(alert, evaluation, options = {}) {
    if (!alert || !alert.target || !evaluation) return '';
    if (alert.target.ruleKind === 'targetAbove' || alert.target.ruleKind === 'targetBelow') {
      return Number.isFinite(Number(evaluation.currentValue))
        ? `当前汇率 ${formatQuoteAlertNumber(evaluation.currentValue, options)}`
        : '';
    }
    return Number.isFinite(Number(evaluation.basePrice)) && Number.isFinite(Number(evaluation.currentValue))
      ? `基准汇率 ${formatQuoteAlertNumber(evaluation.basePrice, options)} -> ${formatQuoteAlertNumber(evaluation.currentValue, options)}`
      : '';
  }

  function buildQuoteAlertTriggeredEntry(options = {}) {
    const alert = options.alert || null;
    const displayName = String(options.displayName || '').trim();
    const label = String(options.label || '').trim();
    const message = String(options.message || '');
    return {
      alert,
      quote: options.quote || null,
      displayName,
      label,
      message,
      currentValueText: options.currentValueText || '',
      actionLink: options.actionLink || null,
      summaryLines: [[displayName, label].filter(Boolean).join(' '), message].filter(Boolean),
      mutedTargetCandidate: alert && alert.target && alert.target.type === 'quote' ? alert : null
    };
  }

  function buildQuoteAlertTriggeredEntryForQuote(options = {}) {
    const alert = options.alert || null;
    const quote = options.quote || null;
    const state = options.state || {};
    const buildQuoteAlertDisplayLabel = typeof options.buildQuoteAlertDisplayLabel === 'function'
      ? options.buildQuoteAlertDisplayLabel
      : () => '--';
    const direction = getQuoteAlertDirection(alert && alert.target);
    const label = buildQuoteAlertDisplayLabel(quote, state, direction);
    const actionLink = options.actionLink || buildQuoteAlertActionLink(options.dexLink);
    return buildQuoteAlertTriggeredEntry({
      alert,
      quote,
      displayName: options.displayName,
      label,
      message: options.message,
      currentValueText: options.currentValueText,
      actionLink
    });
  }

  function buildQuoteAlertActionLink(dexLink) {
    if (!dexLink || !dexLink.url) return null;
    return {
      label: dexLink.label || '交易链接',
      url: dexLink.url
    };
  }

  function buildQuoteAlertRemotePayload(options = {}) {
    const chainName = String(options.chainName || '').trim() || '未知链';
    const label = String(options.label || '').trim();
    const currentValueText = String(options.currentValueText || '').trim();
    const message = String(options.message || '').trim();
    const actionLink = options.actionLink && typeof options.actionLink === 'object' ? options.actionLink : null;
    const actionLinkLabel = String(actionLink && actionLink.label || '').trim();
    const actionLinkUrl = String(actionLink && actionLink.url || '').trim();
    const heading = [label, currentValueText].filter(Boolean).join('  ');
    const title = [chainName, heading].filter(Boolean).join(' ');
    const bodyLines = [];
    const telegramHtmlLines = [];

    function escapeTelegramHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    if (message) {
      bodyLines.push(message);
      telegramHtmlLines.push(escapeTelegramHtml(message));
    }
    if (actionLinkLabel && actionLinkUrl) {
      bodyLines.push(`${actionLinkLabel}: ${actionLinkUrl}`);
      telegramHtmlLines.push(`<a href="${escapeTelegramHtml(actionLinkUrl)}">${escapeTelegramHtml(actionLinkLabel)}</a>`);
    }

    return {
      title: title || chainName,
      body: bodyLines.join('\n') || '监控命中',
      telegramHtmlBody: telegramHtmlLines.join('\n') || '监控命中'
    };
  }

  return {
    formatPathAlertEvaluationText,
    buildPathAlertChangedLegLines,
    buildPathAlertLegKey,
    buildMutedPathTargetCandidate,
    buildMutedPathTargetFromCycleLegs,
    buildTriggeredPathAlertEntry,
    sortTriggeredPathAlertEntries,
    buildPathAlertNotificationTitle,
    buildPathAlertNotificationBody,
    buildPathAlertAggregatedLog,
    buildQuoteAlertDirectionLabel,
    buildQuoteAlertCurrentValueText,
    buildQuoteAlertRuleLine,
    buildQuoteAlertSummaryRuleLine,
    buildQuoteAlertMessage,
    buildQuoteAlertThresholdLine,
    buildQuoteAlertActionLink,
    buildQuoteAlertTriggeredEntry,
    buildQuoteAlertTriggeredEntryForQuote,
    buildQuoteAlertRemotePayload,
    getQuoteAlertDirection
  };
}));
