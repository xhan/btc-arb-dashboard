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
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}bp`;
  }

  function buildEntryBlock(entry, options = {}) {
    const includeTitle = options.includeTitle === true;
    const title = String(entry && entry.alert && entry.alert.name || '').trim();
    const summaryLines = Array.isArray(entry && entry.summaryLines) ? entry.summaryLines.filter(Boolean) : [];
    const changedLegLines = Array.isArray(entry && entry.changedLegLines) ? entry.changedLegLines.filter(Boolean) : [];
    const lines = [];

    if (includeTitle && title) {
      lines.push(title);
    }
    lines.push(formatPathAlertEvaluationText(entry && entry.evaluation));
    lines.push(...summaryLines);

    if (changedLegLines.length) {
      lines.push('');
      lines.push('异动腿:');
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
        title: `[路径报警] ${buildPathAlertNotificationTitle(list)}`,
        subtitle: '',
        message: buildPathAlertNotificationBody(list)
      };
    }

    return {
      title: `[路径报警] ${list.length} 条命中`,
      subtitle: '',
      message: buildPathAlertNotificationBody(list)
    };
  }

  return {
    formatPathAlertEvaluationText,
    buildPathAlertNotificationTitle,
    buildPathAlertNotificationBody,
    buildPathAlertAggregatedLog
  };
}));
