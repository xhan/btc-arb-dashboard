(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.PathAlertNotificationUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function formatPathAlertEvaluationText(evaluation) {
    if (!evaluation || !Number.isFinite(evaluation.profitBp)) {
      return '--';
    }
    const value = evaluation.profitBp;
    return `📈 ${value >= 0 ? '+' : ''}${value.toFixed(2)}bp`;
  }

  function buildLegKey(leg) {
    const quoteId = Number(leg && leg.quoteId);
    if (!Number.isFinite(quoteId) || quoteId <= 0) return '';
    const direction = leg && leg.direction === 'inverse' ? 'inverse' : 'forward';
    const pricingMode = ['raw', 'cex-bid1', 'cex-ask1-inverse'].includes(leg && leg.pricingMode)
      ? leg.pricingMode
      : 'raw';
    return `${quoteId}|${direction}|${pricingMode}`;
  }

  function markSummaryLines(entry, summaryLines) {
    const changedLegs = Array.isArray(entry && entry.changedLegs) ? entry.changedLegs : [];
    if (!changedLegs.length) return summaryLines;

    const changedKeys = new Set(changedLegs.map((leg) => buildLegKey(leg)).filter(Boolean));
    const summaryLegKeys = Array.isArray(entry && entry.summaryLegKeys) ? entry.summaryLegKeys : [];
    return summaryLines.map((line, index) => {
      const key = summaryLegKeys[index];
      return key && changedKeys.has(key) ? `⚡ ${line}` : line;
    });
  }

  function buildEntryBlock(entry, options = {}) {
    const includeTitle = options.includeTitle === true;
    const title = String(entry && entry.alert && entry.alert.name || '').trim();
    const summaryLines = markSummaryLines(
      entry,
      Array.isArray(entry && entry.summaryLines) ? entry.summaryLines.filter(Boolean) : []
    );
    const changedLegLines = Array.isArray(entry && entry.changedLegLines) ? entry.changedLegLines.filter(Boolean) : [];
    const lines = [];

    if (includeTitle && title) {
      lines.push(title);
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
      return String(list[0] && list[0].alert && list[0].alert.name || '').trim() || '路径报警';
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

  function buildLegacyQuoteAlertRemotePayload(options = {}) {
    const chainName = String(options.chainName || '').trim() || '未知链';
    const label = String(options.label || '').trim();
    const currentValueText = String(options.currentValueText || '').trim();
    const message = String(options.message || '').trim();
    const actionLink = options.actionLink && typeof options.actionLink === 'object' ? options.actionLink : null;
    const actionLinkLabel = String(actionLink && actionLink.label || '').trim();
    const actionLinkUrl = String(actionLink && actionLink.url || '').trim();
    const bodyLines = [];
    const heading = [label, currentValueText].filter(Boolean).join('  ');
    const telegramHtmlLines = [];

    function escapeTelegramHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    if (heading) {
      bodyLines.push(heading);
      telegramHtmlLines.push(escapeTelegramHtml(heading));
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
      title: `[监控提醒] ${chainName}`,
      body: bodyLines.join('\n') || '监控命中',
      telegramHtmlBody: telegramHtmlLines.join('\n') || '监控命中'
    };
  }

  return {
    formatPathAlertEvaluationText,
    buildPathAlertNotificationTitle,
    buildPathAlertNotificationBody,
    buildPathAlertAggregatedLog,
    buildLegacyQuoteAlertRemotePayload
  };
}));
