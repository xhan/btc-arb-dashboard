const assert = require('assert');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const port = 3456;
const serverProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore'
});

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: pathname }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
}

async function waitForServer(attempts = 12) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await request('/api/get-config');
      return;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error('server did not start');
}

(async () => {
  try {
    await waitForServer();
    const response = await request('/index.html');
    assert.strictEqual(response.statusCode, 200);
    assert.ok(response.body.includes('聚合报价看板'));
    assert.ok(response.body.includes('href="/snapshot?mode=nearest"'));
    assert.ok(response.body.includes('href="/charts"'));
    assert.ok(response.body.includes('target="_blank"'));
    assert.ok(response.body.includes('width: min(960px, 94vw);'));
    assert.ok(response.body.includes('id="arb-detail-chart-link"'));
    assert.ok(response.body.includes('id="arb-detail-chart-preview"'));
    assert.ok(response.body.includes('id="arb-detail-chart-auto-refresh"'));
    assert.ok(response.body.includes('id="arb-detail-profit-preview"'));
    assert.ok(response.body.includes('#arb-path-window { position: fixed; bottom: 20px; left: 20px; width: 1242px;'));
    assert.ok(response.body.includes('src="charts-utils.js"'));
    assert.ok(response.body.includes('src="charts-renderer.js"'));
    assert.ok(response.body.includes('src="copy-utils.js"'));
    assert.ok(response.body.includes('src="arb-special-utils.js"'));
    assert.ok(response.body.includes('src="arb-panel-layout-utils.js"'));
    assert.ok(response.body.includes('src="arb-rule-snapshot-utils.js"'));
    assert.ok(response.body.includes('src="path-alert-utils.js"'));
    assert.ok(response.body.includes('src="path-alert-notification-utils.js"'));
    assert.ok(response.body.includes('src="path-alert-page-utils.js"'));
    assert.ok(response.body.includes('src="quote-pause-utils.js"'));
    assert.ok(response.body.includes('src="price-snapshot-payload-utils.js"'));
    assert.ok(
      response.body.indexOf('src="quote-pause-utils.js"') < response.body.indexOf('src="queue-stats-utils.js"')
    );
    assert.ok(
      response.body.indexOf('src="price-snapshot-payload-utils.js"') < response.body.indexOf('src="app.js"')
    );
    assert.ok(response.body.includes('id="path-alert-sound"'));
    assert.ok(response.body.includes('src="alert_path.mp3"'));
    assert.ok(response.body.includes('setting-binance-interval'));
    assert.ok(response.body.includes('Velora (默认 700ms)'));
    assert.ok(response.body.includes('class="settings-grid"'));
    assert.ok(response.body.includes('<option value="Binance">Binance</option>'));
    assert.ok(response.body.includes('id="path-alert-window"'));
    assert.ok(response.body.includes('id="path-alert-modal"'));
    assert.ok(response.body.includes('id="toggle-path-alert-btn"'));
    assert.ok(response.body.includes('路径报警管理'));
    assert.ok(response.body.includes('#top-bar-right > button,'));
    assert.ok(response.body.includes('#top-bar-right > a {'));
    assert.ok(response.body.includes('#top-bar-right > button.icon-btn'));
    assert.ok(response.body.includes('.quote-item-paused'));
    assert.ok(response.body.includes('border: 2px solid #f59e0b;'));
    assert.ok(response.body.includes('z-index: 7000;'));
    assert.ok(response.body.includes('.auto-refresh-toggle span {'));
    assert.ok(response.body.includes('.auto-refresh-toggle input[type="checkbox"] {'));
    assert.ok(response.body.includes('appearance: none;'));
    assert.ok(response.body.includes('.auto-refresh-toggle span::before {'));
    assert.ok(response.body.includes('overflow-x: auto;'));
    assert.ok(response.body.includes('flex-wrap: nowrap;'));
    assert.ok(response.body.includes('.arb-detail-profit-card {'));
    assert.ok(response.body.includes('flex: 0 0 236px;'));
    assert.ok(response.body.includes('.arb-detail-profit-canvas {'));
    assert.ok(response.body.includes('height: 104px;'));

    const appJsResponse = await request('/app.js');
    assert.strictEqual(appJsResponse.statusCode, 200);
    assert.ok(appJsResponse.body.includes('inputmode="decimal"'));
    assert.ok(appJsResponse.body.includes('data-arb-detail-token-address'));
    assert.ok(appJsResponse.body.includes('data-arb-detail-dex-url'));
    assert.ok(appJsResponse.body.includes("addEventListener('pointerdown', handleArbPathContentPointerDown)"));
    assert.ok(appJsResponse.body.includes("closest('.arb-opportunity-chart-link')"));
    assert.ok(appJsResponse.body.includes('/api/get-alert-config'));
    assert.ok(appJsResponse.body.includes('/api/save-alert-config'));
    assert.ok(appJsResponse.body.includes('/api/send-path-alert-webhook'));
    assert.ok(appJsResponse.body.includes('[监控提醒]'));
    assert.ok(appJsResponse.body.includes("if (key === 'a')"));
    assert.ok(appJsResponse.body.includes('音效'));
    assert.ok(appJsResponse.body.includes('远程'));
    assert.ok(appJsResponse.body.includes('path-alert-reload-btn'));
    assert.ok(appJsResponse.body.includes('path-alert-import-btn'));
    assert.ok(appJsResponse.body.includes('/path-alerts'));
    assert.ok(appJsResponse.body.includes('data-path-alert-edit-link'));
    assert.ok(appJsResponse.body.includes('data-path-alert-delete'));
    assert.ok(appJsResponse.body.includes('data-path-alert-dismiss-delete'));
    assert.ok(appJsResponse.body.includes('PriceSnapshotPayloadUtils'));
    assert.ok(appJsResponse.body.includes('data-toggle-pause-id'));
    assert.ok(appJsResponse.body.includes('data-toggle-category-pause-id'));
    assert.ok(appJsResponse.body.includes('暂停分区'));
    assert.ok(appJsResponse.body.includes('恢复分区'));
    assert.ok(appJsResponse.body.includes('已暂停'));
    assert.ok(appJsResponse.body.includes('quote-item-paused'));
    assert.ok(appJsResponse.body.includes('recordArbDetailBudgetTimestamp'));
    assert.ok(appJsResponse.body.includes('buildArbDetailSnapshotMonitorState'));
    assert.ok(appJsResponse.body.includes('setArbPanelMaxHeight();'));
    assert.ok(appJsResponse.body.includes("window.addEventListener('resize', setArbPanelMaxHeight)"));
    assert.ok(appJsResponse.body.includes('CHART_AUTO_REFRESH_INTERVAL_MS = 5000'));
    assert.ok(appJsResponse.body.includes('syncArbDetailChartAutoRefreshTimer'));
    assert.ok(appJsResponse.body.includes('syncArbDetailProfitPreview'));
    assert.ok(appJsResponse.body.includes('data-arb-detail-profit-card'));
    assert.ok(appJsResponse.body.includes('resolveEventTargetElement(event)'));
    assert.ok(appJsResponse.body.includes('const eventTarget = resolveEventTargetElement(event);'));
    assert.ok(appJsResponse.body.includes('window.CopyUtils'));
    assert.ok(appJsResponse.body.includes("windowSec: '3600'"));
    assert.ok(appJsResponse.body.includes('最近 1 小时'));
    assert.ok(appJsResponse.body.includes('arb-detail-chart-card arb-detail-profit-card'));
    assert.ok(appJsResponse.body.includes('height: 104'));
    assert.ok(appJsResponse.body.includes('showRightPriceScale: true'));
    assert.ok(appJsResponse.body.includes('mini: true'));

    const snapshotResponse = await request('/snapshot');
    assert.strictEqual(snapshotResponse.statusCode, 200);
    assert.ok(snapshotResponse.body.includes('快照回放'));
    assert.ok(snapshotResponse.body.includes('查看快照 JSON'));
    assert.ok(snapshotResponse.body.includes('查看回放 JSON'));
    assert.ok(snapshotResponse.body.includes('grid-template-columns: minmax(220px, 0.55fr) minmax(480px, 1.45fr);'));
    assert.ok(snapshotResponse.body.includes('src="arb-equivalence-utils.js"'));
    assert.ok(snapshotResponse.body.includes('src="charts-utils.js"'));
    assert.ok(snapshotResponse.body.includes('.arb-opportunity-head {'));
    assert.ok(snapshotResponse.body.includes('.arb-opportunity-chart-link {'));
    assert.ok(snapshotResponse.body.includes('.arb-opportunity-add-alert-btn {'));

    const snapshotAppResponse = await request('/snapshot-app.js');
    assert.strictEqual(snapshotAppResponse.statusCode, 200);
    assert.ok(snapshotAppResponse.body.includes('buildAliasRulesFromGroups'));
    assert.ok(snapshotAppResponse.body.includes('buildOpportunityChartHref'));
    assert.ok(snapshotAppResponse.body.includes('/path-alerts'));

    const chartsResponse = await request('/charts');
    assert.strictEqual(chartsResponse.statusCode, 200);
    assert.ok(chartsResponse.body.includes('id="chart-search-input"'));
    assert.ok(chartsResponse.body.includes('id="chart-refresh-btn"'));
    assert.ok(chartsResponse.body.includes('id="chart-auto-refresh-toggle"'));
    assert.ok(chartsResponse.body.includes('id="chart-panels"'));
    assert.ok(chartsResponse.body.includes('src="charts-app.js"'));
    assert.ok(chartsResponse.body.includes('grid-template-columns: minmax(0, 1fr) 112px 112px auto;'));
    assert.ok(!chartsResponse.body.includes('<section class="hero">'));
    assert.ok(!chartsResponse.body.includes('读取最近两小时的历史快照'));
    assert.ok(!chartsResponse.body.includes('当前页只负责图表查看'));

    const chartsAppResponse = await request('/charts-app.js');
    assert.strictEqual(chartsAppResponse.statusCode, 200);
    assert.ok(chartsAppResponse.body.includes('CHART_AUTO_REFRESH_INTERVAL_MS = 5000'));
    assert.ok(chartsAppResponse.body.includes('syncChartAutoRefreshTimer'));
    assert.ok(chartsAppResponse.body.includes('chart-auto-refresh-toggle'));

    const copyUtilsResponse = await request('/copy-utils.js');
    assert.strictEqual(copyUtilsResponse.statusCode, 200);
    assert.ok(copyUtilsResponse.body.includes('Clipboard fallback failed'));

    const chartsRendererResponse = await request('/charts-renderer.js');
    assert.strictEqual(chartsRendererResponse.statusCode, 200);
    assert.ok(chartsRendererResponse.body.includes('showRightPriceScale'));
    assert.ok(chartsRendererResponse.body.includes('const chart = createChartInstance(container, options);'));

    const queueStatsResponse = await request('/queue-stats');
    assert.strictEqual(queueStatsResponse.statusCode, 200);
    assert.ok(queueStatsResponse.body.includes('队列统计'));
    assert.ok(queueStatsResponse.body.includes('请求发起间隔'));
    assert.ok(queueStatsResponse.body.includes('src="quote-pause-utils.js"'));
    assert.ok(
      queueStatsResponse.body.indexOf('src="quote-pause-utils.js"') < queueStatsResponse.body.indexOf('src="queue-stats-utils.js"')
    );
    assert.ok(queueStatsResponse.body.includes('src="queue-stats-utils.js"'));
    assert.ok(queueStatsResponse.body.includes('src="queue-stats-app.js"'));

    assert.ok(response.body.includes('href="/queue-stats"'));

    const pathAlertsResponse = await request('/path-alerts');
    assert.strictEqual(pathAlertsResponse.statusCode, 200);
    assert.ok(pathAlertsResponse.body.includes('路径报警管理'));
    assert.ok(pathAlertsResponse.body.includes('id="path-alerts-page"'));
    assert.ok(pathAlertsResponse.body.includes('id="path-alerts-list"'));
    assert.ok(pathAlertsResponse.body.includes('id="path-alerts-dismissed-list"'));
    assert.ok(pathAlertsResponse.body.includes('id="path-alerts-editor"'));
    assert.ok(pathAlertsResponse.body.includes('id="path-alerts-search-input"'));
    assert.ok(pathAlertsResponse.body.includes('id="path-alerts-dismissed-search-input"'));
    assert.ok(pathAlertsResponse.body.includes('id="path-alerts-dismiss-selected-btn"'));
    assert.ok(pathAlertsResponse.body.includes('批量删除'));
    assert.ok(pathAlertsResponse.body.includes('不需要路径'));
    assert.ok(pathAlertsResponse.body.includes('src="quote-calculator.js"'));
    assert.ok(pathAlertsResponse.body.includes('src="quote-pause-utils.js"'));
    assert.ok(pathAlertsResponse.body.includes('src="path-alert-candidate-utils.js"'));
    assert.ok(
      pathAlertsResponse.body.indexOf('src="path-alert-candidate-utils.js"') < pathAlertsResponse.body.indexOf('src="path-alerts-app.js"')
    );
    assert.ok(pathAlertsResponse.body.includes('src="path-alert-page-utils.js"'));
    assert.ok(pathAlertsResponse.body.includes('src="path-alert-rule-definitions.js"'));
    assert.ok(pathAlertsResponse.body.includes('src="path-alerts-app.js"'));

    const pathAlertsAppResponse = await request('/path-alerts-app.js');
    assert.strictEqual(pathAlertsAppResponse.statusCode, 200);
    assert.ok(pathAlertsAppResponse.body.includes('path-alert-search-input'));
    assert.ok(pathAlertsAppResponse.body.includes('path-alert-add-leg-btn'));
    assert.ok(pathAlertsAppResponse.body.includes('path-alert-suggestions'));
    assert.ok(pathAlertsAppResponse.body.includes('PathAlertCandidateUtils'));
    assert.ok(pathAlertsAppResponse.body.includes('findDismissedTargetForDraft'));
    assert.ok(pathAlertsAppResponse.body.includes('path-alerts-search-input'));
    assert.ok(pathAlertsAppResponse.body.includes('path-alerts-dismissed-search-input'));
    assert.ok(pathAlertsAppResponse.body.includes('path-alerts-dismiss-selected-btn'));
    assert.ok(pathAlertsAppResponse.body.includes('data-alert-dismiss-delete'));
    assert.ok(pathAlertsAppResponse.body.includes('data-dismissed-restore'));
    assert.ok(pathAlertsAppResponse.body.includes("event.key === 'ArrowDown'"));
    assert.ok(pathAlertsAppResponse.body.includes("event.key === 'ArrowUp'"));
    assert.ok(pathAlertsAppResponse.body.includes("event.key === 'Enter'"));
  } finally {
    serverProcess.kill();
  }
})().catch((error) => {
  serverProcess.kill();
  throw error;
});
