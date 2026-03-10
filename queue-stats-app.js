(function () {
  const stateEl = document.getElementById('queue-stats-state');
  const tableEl = document.getElementById('queue-stats-table');
  const metricsEl = document.getElementById('summary-metrics');
  const utils = window.QueueStatsUtils;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderMetrics(summary) {
    metricsEl.innerHTML = [
      {
        label: '总 Quote 数',
        value: summary.totalQuoteCount
      },
      {
        label: '总 Task 数',
        value: summary.totalTaskCount
      },
      {
        label: '启用队列数',
        value: summary.queues.filter((item) => !item.disabled).length
      }
    ].map((item) => (
      `<div class="metric-card"><strong>${escapeHtml(item.label)}</strong><div class="value">${escapeHtml(item.value)}</div></div>`
    )).join('');
  }

  function renderTable(summary) {
    const rows = summary.queues.map((item) => `
      <tr>
        <td><span class="badge">${escapeHtml(item.key)}</span></td>
        <td>${escapeHtml(item.intervalMs)}ms</td>
        <td>${escapeHtml(item.quoteCount)}</td>
        <td>${escapeHtml(item.mainTasks)}</td>
        <td>${escapeHtml(item.inverseTasks)}</td>
        <td>${escapeHtml(item.taskCount)}</td>
        <td>${escapeHtml(utils.formatDurationMs(item.nominalLapMs))}</td>
      </tr>
    `).join('');

    tableEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>队列</th>
            <th>Interval</th>
            <th>Quote 数</th>
            <th>Main Task</th>
            <th>Inverse Task</th>
            <th>Task 总数</th>
            <th>名义一轮</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  async function init() {
    try {
      const response = await fetch('/api/get-config');
      if (!response.ok) {
        throw new Error(`读取配置失败: ${response.status}`);
      }
      const data = await response.json();
      const summary = utils.buildQueueSummary(data);

      stateEl.remove();
      renderMetrics(summary);
      renderTable(summary);
    } catch (error) {
      stateEl.className = 'error';
      stateEl.textContent = error.message || '加载失败';
    }
  }

  init();
})();
