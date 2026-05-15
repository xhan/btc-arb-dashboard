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
    assert.ok(response.body.includes('#arb-path-window { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;'));
    assert.ok(response.body.includes('#arb-path-header { padding: 10px 15px; background-color: #2d3748; color: white; font-weight: bold; user-select: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; }'));
    assert.ok(response.body.includes('#arb-global-filter-input,'));
    assert.ok(response.body.includes('#arb-global-chain-filter-input,'));
    assert.ok(response.body.includes('#arb-global-include-filter-input {'));
    assert.ok(response.body.includes('.arb-global-filter-checkbox {'));
    assert.ok(response.body.includes('width: 160px;'));
    assert.ok(response.body.includes('font-size: 13px;'));
    assert.ok(response.body.includes('#arb-path-content { flex-grow: 1; overflow-y: auto; overscroll-behavior: contain;'));
    assert.ok(/#alert-log-content,\s*#alert-log-muted-log-content,\s*#alert-log-muted-content\s*\{\s*flex-grow:\s*1;\s*overflow-y:\s*auto;\s*overscroll-behavior:\s*contain;/.test(response.body));
    assert.ok(response.body.includes('#path-alert-window { position: fixed; top: 80px; right: 20px; width: 365px; height: 320px; background-color: var(--module-bg-color); border-radius: 12px; box-shadow: 0 10px 30px var(--shadow-color); display: none;'));
    assert.ok(response.body.includes('#path-alert-content { flex-grow: 1; overflow-y: auto; overscroll-behavior: contain;'));
    assert.ok(/#data-terminal-content\s*\{[\s\S]*?overflow-y:\s*auto;[\s\S]*?overscroll-behavior:\s*contain;/.test(response.body));
    assert.ok(response.body.includes('#alert-log-window { position: fixed; bottom: 20px; right: 20px; width: 315px; max-height: 400px;'));
    assert.ok(response.body.includes('#data-terminal-window { position: fixed; bottom: 20px; left: 20px; width: 807px;'));
    assert.ok(response.body.includes('src="charts-utils.js"'));
    assert.ok(response.body.includes('src="charts-renderer.js"'));
    assert.ok(response.body.includes('src="copy-utils.js"'));
    assert.ok(response.body.includes('src="arb-special-utils.js"'));
    assert.ok(response.body.includes('src="arb-panel-layout-utils.js"'));
    assert.ok(response.body.includes('src="arb-path-config.js"'));
    assert.ok(response.body.includes('src="arb-path-config-utils.js"'));
    assert.ok(response.body.includes('src="arb-rule-snapshot-utils.js"'));
    assert.ok(response.body.includes('src="alert-log-ui-utils.js"'));
    assert.ok(response.body.includes('src="muted-path-storage-utils.js"'));
    assert.ok(response.body.includes('src="dex-link-utils.js"'));
    assert.ok(response.body.includes('src="arb-detail-refresh-utils.js"'));
    assert.ok(response.body.includes('src="special-rule-alert-config-utils.js"'));
    assert.ok(response.body.includes('src="path-alert-utils.js"'));
    assert.ok(response.body.includes('src="alert-debug-utils.js"'));
    assert.ok(response.body.includes('src="special-rule-alert-utils.js"'));
    assert.ok(response.body.includes('src="path-alert-notification-utils.js"'));
    assert.ok(!response.body.includes('src="quote-alert-config-utils.js"'));
    assert.ok(response.body.includes('src="path-alert-page-utils.js"'));
    assert.ok(response.body.includes('src="quote-pause-utils.js"'));
    assert.ok(response.body.includes('src="quote-display-utils.js"'));
    assert.ok(response.body.includes('src="price-snapshot-payload-utils.js"'));
    assert.ok(response.body.includes('src="request-channel-utils.js"'));
    assert.ok(response.body.includes('src="data-terminal-utils.js"'));
    assert.ok(response.body.includes('src="dashboard-runtime-utils.js"'));
    assert.ok(!response.body.includes('src="quote-calculator.js"'));
    assert.ok(
      response.body.indexOf('src="quote-pause-utils.js"') < response.body.indexOf('src="queue-stats-utils.js"')
    );
    assert.ok(
      response.body.indexOf('src="request-channel-utils.js"') < response.body.indexOf('src="app.js"')
    );
    assert.ok(
      response.body.indexOf('src="dashboard-runtime-utils.js"') < response.body.indexOf('src="app.js"')
    );
    assert.ok(
      response.body.indexOf('src="dex-link-utils.js"') < response.body.indexOf('src="app.js"')
    );
    assert.ok(
      response.body.indexOf('src="arb-detail-refresh-utils.js"') < response.body.indexOf('src="app.js"')
    );
    assert.ok(
      response.body.indexOf('src="price-snapshot-payload-utils.js"') < response.body.indexOf('src="app.js"')
    );
    assert.ok(
      response.body.indexOf('src="alert-debug-utils.js"') < response.body.indexOf('src="app.js"')
    );
    assert.ok(
      response.body.indexOf('src="special-rule-alert-config-utils.js"') < response.body.indexOf('src="app.js"')
    );
    assert.ok(
      response.body.indexOf('src="arb-path-config.js"') < response.body.indexOf('src="arb-path-config-utils.js"')
    );
    assert.ok(
      response.body.indexOf('src="arb-path-config-utils.js"') < response.body.indexOf('src="app.js"')
    );
    assert.ok(
      response.body.indexOf('src="special-rule-alert-utils.js"') < response.body.indexOf('src="app.js"')
    );
    assert.ok(
      response.body.indexOf('src="muted-path-storage-utils.js"') < response.body.indexOf('src="path-alert-utils.js"')
    );
    assert.ok(!response.body.includes('id="alert-sound"'));
    assert.ok(!response.body.includes('src="alert.mp3"'));
    assert.ok(response.body.includes('id="path-alert-sound"'));
    assert.ok(response.body.includes('src="alert_path.mp3"'));
    assert.ok(response.body.includes('setting-binance-interval'));
    assert.ok(response.body.includes('Velora (默认 700ms)'));
    assert.ok(response.body.includes('.arb-opportunity.is-alert-highlight {'));
    assert.ok(response.body.includes('class="settings-grid"'));
    assert.ok(response.body.includes('id="quote-request-channel"'));
    assert.ok(response.body.includes('请求通道'));
    assert.ok(response.body.includes('id="kyber-only-direct-pools"'));
    assert.ok(response.body.includes('Kyber 仅直连池'));
    assert.ok(response.body.includes('.quote-direct-badge'));
    assert.ok(response.body.includes('quote-channel-tag'));
    assert.ok(response.body.includes('<option value="Binance">Binance</option>'));
    assert.ok(response.body.includes('id="path-alert-window"'));
    assert.ok(response.body.includes('#path-alert-window { position: fixed; top: 80px; right: 20px; width: 365px; height: 320px; background-color: var(--module-bg-color); border-radius: 12px; box-shadow: 0 10px 30px var(--shadow-color); display: none;'));
    assert.ok(response.body.includes('id="open-quote-alerts-manage"'));
    assert.ok(!response.body.includes('class="quote-alert-inline-grid"'));
    assert.ok(response.body.includes('id="modal-subtitle"'));
    assert.ok(response.body.includes('交易对报警已统一迁到「报警管理」页'));
    assert.ok(!response.body.includes('id="path-alert-modal"'));
    assert.ok(!response.body.includes('id="path-alert-name"'));
    assert.ok(!response.body.includes('id="path-alert-search-input"'));
    assert.ok(response.body.includes('id="toggle-quote-display-btn"'));
    assert.ok(response.body.includes('价格: 汇率'));
    assert.ok(response.body.includes('id="toggle-path-alert-btn"'));
    assert.ok(response.body.includes('id="toggle-data-terminal-btn"'));
    assert.ok(response.body.includes('id="toggle-multi-channel-btn"'));
    assert.ok(response.body.includes('id="arb-global-include-filter-input"'));
    assert.ok(response.body.includes('placeholder="仅显示代币"'));
    assert.ok(response.body.includes('id="arb-global-two-leg-only"'));
    assert.ok(response.body.includes('只看 2 腿'));
    assert.ok(!response.body.includes('id="arb-path-max-btn"'));
    assert.ok(!response.body.includes('id="arb-global-filter-bar"'));
    assert.ok(response.body.includes('多渠道'));
    assert.ok(response.body.includes('数据终端'));
    assert.ok(response.body.includes('<button id="toggle-path-alert-btn" title="打开报警管理页">🚨</button>'));
    assert.ok(response.body.includes('<button id="toggle-alert-log-btn" title="显示/隐藏提醒日志">📝</button>'));
    assert.ok(response.body.includes('<a id="snapshot-link-btn" href="/snapshot?mode=nearest" target="_blank" rel="noopener noreferrer" title="在新窗口打开快照页面">📸</a>'));
    assert.ok(response.body.includes('<a id="charts-link-btn" href="/charts" target="_blank" rel="noopener noreferrer" title="在新窗口打开历史图表页">📊</a>'));
    assert.ok(!response.body.includes('id="toggle-calc-btn"'));
    assert.ok(!response.body.includes('id="calc-window"'));
    assert.ok(!response.body.includes('id="calc-content"'));
    assert.ok(response.body.includes('#top-bar-right > button,'));
    assert.ok(response.body.includes('#top-bar-right > a {'));
    assert.ok(response.body.includes('#top-bar-right > button.icon-btn'));
    assert.ok(response.body.includes('.quote-item-paused'));
    assert.ok(response.body.includes('.quote-label-stack.quote-dex-link-target {'));
    assert.ok(response.body.includes('.quote-left-container .quote-dex-link-target {'));
    assert.ok(response.body.includes('pointer-events: auto;'));
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
    assert.ok(response.body.includes('.arb-detail-leg-rate-delta {'));
    assert.ok(response.body.includes('.arb-detail-leg-rate-delta.positive {'));
    const specialRuleConfigScriptIndex = response.body.indexOf('special-rule-alert-config-utils.js');
    const pathAlertUtilsScriptIndex = response.body.indexOf('path-alert-utils.js');
    assert.ok(specialRuleConfigScriptIndex >= 0);
    assert.ok(pathAlertUtilsScriptIndex >= 0);
    assert.ok(specialRuleConfigScriptIndex < pathAlertUtilsScriptIndex);

    const appJsResponse = await request('/app.js');
    assert.strictEqual(appJsResponse.statusCode, 200);
    assert.ok(appJsResponse.body.includes('inputmode="decimal"'));
    assert.ok(appJsResponse.body.includes('data-arb-detail-token-address'));
    assert.ok(appJsResponse.body.includes('data-dex-link-copy'));
    assert.ok(appJsResponse.body.includes('data-dex-link-chain'));
    assert.ok(appJsResponse.body.includes('copyDexLinkFromElement'));
    assert.ok(appJsResponse.body.includes('data-terminal-pair-link'));
    assert.ok(appJsResponse.body.includes('labelStackEl.classList.add(\'quote-dex-link-target\')'));
    assert.ok(appJsResponse.body.includes('void copyDexLinkFromElement(labelStackEl)'));
    assert.ok(appJsResponse.body.includes('class="icon-btn add-quote-btn"'));
    assert.ok(!appJsResponse.body.includes('>+ 添加报价</button>'));
    assert.ok(appJsResponse.body.includes("arbGlobalFilterInput.addEventListener('keydown', handleArbGlobalFilterKeydown)"));
    assert.ok(appJsResponse.body.includes("arbGlobalIncludeFilterInput.addEventListener('input', handleArbGlobalIncludeFilterInput)"));
    assert.ok(appJsResponse.body.includes("arbPathHeader.addEventListener('click', handleArbPathHeaderClick)"));
    assert.ok(appJsResponse.body.includes("closestEventTarget(event, 'button, input, textarea, select, [contenteditable=\"true\"]')"));
    assert.ok(!appJsResponse.body.includes('makeDraggable(arbPathWindow, arbPathHeader)'));
    assert.ok(!appJsResponse.body.includes('if (!arbGlobalFilterBar) return;'));
    assert.ok(appJsResponse.body.includes("addEventListener('pointerdown', handleArbPathContentPointerDown)"));
    assert.ok(!appJsResponse.body.includes("closest('.arb-opportunity-chart-link')"));
    assert.ok(!appJsResponse.body.includes("closest('[data-arb-opportunity-alert-id]')"));
    assert.ok(appJsResponse.body.includes('function buildArbOpportunityChartHref(entry)'));
    assert.ok(appJsResponse.body.includes('/api/get-alert-config'));
    assert.ok(appJsResponse.body.includes('/api/request-update-config'));
    assert.ok(appJsResponse.body.includes('/api/get-request-channels'));
    assert.ok(appJsResponse.body.includes('await requestBackendConfigRefresh();'));
    assert.ok(appJsResponse.body.includes('function syncKyberOnlyDirectPoolsControl(quote, selectedSource)'));
    assert.ok(appJsResponse.body.includes('function shouldShowKyberDirectPoolsBadge(quote)'));
    assert.ok(appJsResponse.body.includes('quote-direct-badge'));
    assert.ok(appJsResponse.body.includes('quote.kyberOnlyDirectPools = true;'));
    const scheduleArbUpdateMatch = appJsResponse.body.match(/function scheduleArbUpdate\(\) \{([\s\S]*?)function invalidateArbRuleSnapshotCache/);
    assert.ok(scheduleArbUpdateMatch);
    assert.ok(scheduleArbUpdateMatch[1].includes('if (!isArbPanelVisible())'));
    assert.ok(scheduleArbUpdateMatch[1].includes('updateArbPanel();'));
    assert.ok(!scheduleArbUpdateMatch[1].includes('updateArbPanel({ force: true });'));
    assert.ok(appJsResponse.body.includes('/api/save-alert-config'));
    assert.ok(appJsResponse.body.includes('/api/send-path-alert-webhook'));
    assert.ok(appJsResponse.body.includes('let pathAlertPanelHidden = true;'));
    assert.ok(appJsResponse.body.includes("target.type === 'quote'"));
    assert.ok(appJsResponse.body.includes("target.direction === 'inverse'"));
    assert.ok(!appJsResponse.body.includes('reconcileLegacyQuoteAlertsIntoPathAlertConfig'));
    assert.ok(!appJsResponse.body.includes('quote.alerts'));
    assert.ok(appJsResponse.body.includes("function getQuoteAlertDirection(target)"));
    assert.ok(appJsResponse.body.includes('let quoteUiState = new Map();'));
    assert.ok(appJsResponse.body.includes('function sanitizeQuoteMarketState(state)'));
    assert.ok(appJsResponse.body.includes('function setQuoteUiState(quoteId, nextState)'));
    const defaultQuoteUiStateMatch = appJsResponse.body.match(/function buildDefaultQuoteUiState\(\) \{([\s\S]*?)function normalizeQuoteStateKey/);
    assert.ok(defaultQuoteUiStateMatch);
    assert.ok(defaultQuoteUiStateMatch[1].includes('hasUnreadAlert: false'));
    assert.ok(defaultQuoteUiStateMatch[1].includes('trendTimer: null'));
    assert.ok(!defaultQuoteUiStateMatch[1].includes('logShown:'));
    assert.ok(!defaultQuoteUiStateMatch[1].includes('isSoundActive:'));
    assert.ok(appJsResponse.body.includes("return { text: '等待报价', className: 'path-alert-status-unavailable' };"));
    assert.ok(appJsResponse.body.includes("return { text: '', className: '' };"));
    assert.ok(appJsResponse.body.includes('const statusTagHtml = statusInfo.text'));
    assert.ok(/\.filter\(\(\{ statusInfo \}\) => Boolean\(\s*statusInfo\s*&& statusInfo\.text\s*&& statusInfo\.className !== 'path-alert-status-unavailable'\s*\)\s*\)\s*/.test(appJsResponse.body));
    assert.ok(!appJsResponse.body.includes("return { text: '监控中', className: 'path-alert-status-monitoring' };"));
    assert.ok(appJsResponse.body.includes('evaluatePathAlert(alert, { quoteStateById: quoteMarketState })'));
    assert.ok(!appJsResponse.body.includes('const alertSound = document.getElementById(\'alert-sound\');'));
    assert.ok(!appJsResponse.body.includes('syncLoopingAlertSound(alertSound, shouldPlayQuoteAlert);'));
    assert.ok(appJsResponse.body.includes('path-alert-config-sync'));
    assert.ok(appJsResponse.body.includes('new Audio(pathAlertSound.currentSrc || pathAlertSound.src)'));
    assert.ok(appJsResponse.body.includes('customAlertMessage: String(evaluation && evaluation.alertMessage || \'\').trim()'));
    assert.ok(appJsResponse.body.includes("console.info('[quote-alert] trigger'"));
    assert.ok(appJsResponse.body.includes("console.warn('[quote-alert] sound skipped: audio not unlocked'"));
    assert.ok(appJsResponse.body.includes("console.info('[quote-alert] muted trigger skipped'"));
    assert.ok(appJsResponse.body.includes('const ARB_OPPORTUNITY_HIGHLIGHT_DURATION_MS = 8000;'));
    assert.ok(appJsResponse.body.includes('let arbHighlightedOpportunityUntilById = new Map();'));
    assert.ok(appJsResponse.body.includes('markTriggeredArbOpportunities'));
    assert.ok(appJsResponse.body.includes('let arbGlobalTwoLegOnly = false;'));
    assert.ok(appJsResponse.body.includes('data-quote-alert-dex-link'));
    assert.ok(appJsResponse.body.includes('data-quote-alert-dex-link-copy="1"'));
    assert.ok(appJsResponse.body.includes('data-quote-alert-log-mute'));
    assert.ok(!appJsResponse.body.includes('buildLegacyQuoteAlertLogHtml'));
    assert.ok(appJsResponse.body.includes('buildQuoteAlertLogHtml'));
    assert.ok(appJsResponse.body.includes('appendMutedAlertLogCard'));
    assert.ok(appJsResponse.body.includes('data-path-alert-log-mute'));
    assert.ok(appJsResponse.body.includes('data-alert-log-collapsed'));
    assert.ok(appJsResponse.body.includes('expandCollapsedAlertLogCard'));
    assert.ok(appJsResponse.body.includes('extendMutedPathTargetFromLogButton'));
    assert.ok(appJsResponse.body.includes('if (extendMutedPathTargetFromLogButton(buttonEl, Date.now()))'));
    assert.ok(appJsResponse.body.includes("const mutedLogTabBtn = closestEventTarget(event, '#alert-log-muted-log-tab');"));
    assert.ok(appJsResponse.body.includes("alertLogActiveTab = 'muted-log';"));
    assert.ok(appJsResponse.body.includes("const quoteDexLinkEl = closestEventTarget(event, '[data-quote-alert-dex-link-copy]');"));
    assert.ok(appJsResponse.body.includes('event.preventDefault();'));
    assert.ok(appJsResponse.body.includes('void copyDexLinkFromElement(quoteDexLinkEl);'));
    assert.ok(appJsResponse.body.includes('忽略 1 小时'));
    assert.ok(appJsResponse.body.includes('延长 2 小时'));
    assert.ok(appJsResponse.body.includes('data-arb-detail-leg-mute'));
    assert.ok(appJsResponse.body.includes('renderMutedAlertStatePanel'));
    assert.ok(appJsResponse.body.includes('输入屏蔽时长（小时，正整数）'));
    assert.ok(!appJsResponse.body.includes('屏蔽 8 小时'));
    assert.ok(appJsResponse.body.includes('沉默中'));
    assert.ok(appJsResponse.body.includes("if (key === 'a')"));
    assert.ok(appJsResponse.body.includes("if (key === 'c')"));
    assert.ok(appJsResponse.body.includes("if (key === 'l')"));
    assert.ok(appJsResponse.body.includes("if (key === 'p')"));
    assert.ok(appJsResponse.body.includes("if (key === 's')"));
    assert.ok(!appJsResponse.body.includes("if (key === 'd')"));
    assert.ok(!appJsResponse.body.includes("if (key === 'r')"));
    assert.ok(!appJsResponse.body.includes('toggleCalcPanel()'));
    assert.ok(!appJsResponse.body.includes('resetCalculator()'));
    assert.ok(!appJsResponse.body.includes('calculatorEntries'));
    assert.ok(!appJsResponse.body.includes('addToCalculator('));
    assert.ok(appJsResponse.body.includes("const DEFAULT_QUOTE_DISPLAY_MODE = 'rate';"));
    assert.ok(appJsResponse.body.includes('toggleQuoteDisplayMode()'));
    assert.ok(appJsResponse.body.includes('toggleDataTerminalPanel()'));
    assert.ok(appJsResponse.body.includes('toggleRequestChannelTags()'));
    assert.ok(appJsResponse.body.includes('let showRequestChannelTags = true;'));
    assert.ok(appJsResponse.body.includes("USDe: ['USDe', 'USDE']"));
    assert.ok(appJsResponse.body.includes("USDE: 'USDe'"));
    assert.ok(appJsResponse.body.includes('音效'));
    assert.ok(appJsResponse.body.includes('远程'));
    assert.ok(!appJsResponse.body.includes('path-alert-reload-btn'));
    assert.ok(appJsResponse.body.includes('data-path-alert-force-immediate'));
    assert.ok(appJsResponse.body.includes('全部立即'));
    assert.ok(appJsResponse.body.includes('let forceImmediateAlerts = false;'));
    assert.ok(appJsResponse.body.includes('buildEffectiveRuntimeAlert(alert, { forceImmediate: forceImmediateAlerts })'));
    assert.ok(appJsResponse.body.includes("closestEventTarget(event, '[data-path-alert-force-immediate]')"));
    assert.ok(response.body.includes('.alert-log-entry-collapsed'));
    assert.ok(!appJsResponse.body.includes('path-alert-import-btn'));
    assert.ok(!appJsResponse.body.includes('导入当前全部机会'));
    assert.ok(appJsResponse.body.includes('/path-alerts'));
    assert.ok(appJsResponse.body.includes('if (pathAlertPanelHidden) return;'));
    assert.ok(appJsResponse.body.includes('if (isVisible) {'));
    assert.ok(appJsResponse.body.includes('renderPathAlertPanel();'));
    assert.ok(appJsResponse.body.includes('openPathAlertsManagementPage({'));
    assert.ok(appJsResponse.body.includes('data-path-alert-edit-link'));
    assert.ok(appJsResponse.body.includes('data-path-alert-delete'));
    assert.ok(appJsResponse.body.includes('data-path-alert-dismiss-delete'));
    assert.ok(!appJsResponse.body.includes('function openPathAlertModal('));
    assert.ok(!appJsResponse.body.includes('function renderPathAlertModal('));
    assert.ok(!appJsResponse.body.includes('function handlePathAlertModalClick('));
    assert.ok(!appJsResponse.body.includes("pathAlertModal.addEventListener('click', handlePathAlertModalClick)"));
    assert.ok(appJsResponse.body.includes('PriceSnapshotPayloadUtils'));
    assert.ok(appJsResponse.body.includes('data-toggle-pause-id'));
    assert.ok(appJsResponse.body.includes('data-toggle-category-pause-id'));
    assert.ok(appJsResponse.body.includes('暂停分区'));
    assert.ok(appJsResponse.body.includes('恢复分区'));
    assert.ok(appJsResponse.body.includes('已暂停'));
    assert.ok(appJsResponse.body.includes('quote-item-paused'));
    assert.ok(appJsResponse.body.includes('recordArbDetailBudgetTimestamp'));
    assert.ok(appJsResponse.body.includes('buildArbDetailSnapshotMonitorState'));
    assert.ok(appJsResponse.body.includes('buildArbDetailRateDeltaText'));
    assert.ok(appJsResponse.body.includes('rateDeltaText'));
    assert.ok(appJsResponse.body.includes('renderArbDetailCardContents();'));
    assert.ok(!appJsResponse.body.includes('function getActiveArbDetailInputIndex()'));
    assert.ok(!appJsResponse.body.includes('draftInputValue'));
    assert.ok(!appJsResponse.body.includes("arbDetailGrid.addEventListener('input'"));
    assert.ok(!appJsResponse.body.includes('function captureArbDetailInputSelection()'));
    assert.ok(!appJsResponse.body.includes('function restoreArbDetailInputSelection(selectionState)'));
    assert.ok(!appJsResponse.body.includes('input.select()'));
    assert.ok(!appJsResponse.body.includes("arbDetailGrid.addEventListener('mouseup'"));
    assert.ok(appJsResponse.body.includes('setArbPanelMaxHeight();'));
    assert.ok(appJsResponse.body.includes("window.addEventListener('resize', setArbPanelMaxHeight)"));
    assert.ok(appJsResponse.body.includes('const maxHeight = Math.max(200, window.innerHeight);'));
    assert.ok(appJsResponse.body.includes("const specialSections = SPECIAL_ARB_RULES"));
    assert.ok(appJsResponse.body.includes("emptyText: '无收益率'"));
    assert.ok(appJsResponse.body.includes("title: '关注列表'"));
    assert.ok(appJsResponse.body.includes('buildQuotePriceWatchEntries()'));
    assert.ok(!appJsResponse.body.includes('buildQuoteAlertWatchEntries'));
    assert.ok(appJsResponse.body.includes('const columns = ['));
    assert.ok(appJsResponse.body.includes('const includedSymbols = parseArbFilterInput(arbGlobalIncludedSymbolsInput);'));
    assert.ok(appJsResponse.body.includes('const twoLegOnlyCycles = arbGlobalTwoLegOnly'));
    assert.ok(appJsResponse.body.includes('cycleLegs.length === 2'));
    assert.ok(appJsResponse.body.includes('cycleContainsAnySymbols(cycle, includedSymbols)'));
    assert.ok(appJsResponse.body.includes('CHART_AUTO_REFRESH_INTERVAL_MS = 5000'));
    assert.ok(appJsResponse.body.includes('syncArbDetailChartAutoRefreshTimer'));
    assert.ok(appJsResponse.body.includes('syncArbDetailProfitPreview'));
    assert.ok(appJsResponse.body.includes('createArbDetailRefreshScheduler'));
    assert.ok(appJsResponse.body.includes('clearArbDetailRefreshTimer'));
    assert.ok(!appJsResponse.body.includes('arbDetailRefreshTimer = setTimeout'));
    assert.ok(appJsResponse.body.includes('refreshToken: 0'));
    assert.ok(!appJsResponse.body.includes('loopToken'));
    assert.ok(appJsResponse.body.includes('data-arb-detail-profit-card'));
    assert.ok(appJsResponse.body.includes('resolveEventTargetElement(event)'));
    assert.ok(appJsResponse.body.includes('const eventTarget = resolveEventTargetElement(event);'));
    assert.ok(appJsResponse.body.includes('function mountDataTerminalPanel()'));
    assert.ok(appJsResponse.body.includes('function unmountDataTerminalPanel()'));
    assert.ok(appJsResponse.body.includes('function syncDataTerminalPanelDefaultSize(panel)'));
    assert.ok(appJsResponse.body.includes('const DATA_TERMINAL_DEFAULT_WIDTH_SCALE = 0.65;'));
    assert.ok(appJsResponse.body.includes('id="data-terminal-profit-bp"'));
    assert.ok(appJsResponse.body.includes('selectedLeftKey'));
    assert.ok(appJsResponse.body.includes('selectedRightKey'));
    assert.ok(appJsResponse.body.includes('buildDataTerminalSelectionSummary'));
    assert.ok(appJsResponse.body.includes('clearTimeout(dataTerminalState.timer);'));
    assert.ok(appJsResponse.body.includes('let dataTerminalCandidatesCacheKey = \'\';'));
    assert.ok(appJsResponse.body.includes('function buildDataTerminalCandidates(utils)'));
    assert.ok(appJsResponse.body.includes('dataTerminalState.domRefs = null;'));
    assert.ok(appJsResponse.body.includes('Token -&gt; Token'));
    assert.ok(appJsResponse.body.includes('window.CopyUtils'));
    assert.ok(appJsResponse.body.includes('window.enableAlertDebug ='));
    assert.ok(appJsResponse.body.includes("windowSec: '3600'"));
    assert.ok(appJsResponse.body.includes('最近 1 小时'));
    assert.ok(response.body.includes('id="alert-log-log-tab"'));
    assert.ok(response.body.includes('id="alert-log-muted-log-tab"'));
    assert.ok(response.body.includes('id="alert-log-muted-tab"'));
    assert.ok(response.body.includes('id="alert-log-muted-log-content"'));
    assert.ok(response.body.includes('id="alert-log-muted-content"'));
    assert.ok(response.body.includes('src="muted-path-leg-utils.js"'));
    assert.ok(appJsResponse.body.includes('arb-detail-chart-card arb-detail-profit-card'));
    assert.ok(appJsResponse.body.includes('height: 104'));
    assert.ok(appJsResponse.body.includes('showRightPriceScale: true'));
    assert.ok(appJsResponse.body.includes('mini: true'));
    assert.ok(appJsResponse.body.includes('buildArbDetailSourceHtml(row, { cardIndex, rowIndex })'));
    assert.ok(!appJsResponse.body.includes('arb-detail-leg-action-row'));
    assert.ok(response.body.includes('.arb-detail-leg-source {'));
    assert.ok(response.body.includes('.arb-detail-leg-source-actions {'));
    assert.ok(appJsResponse.body.includes('buildArbDetailSourceMetaHtml'));
    assert.ok(appJsResponse.body.includes('buildArbDetailSourceActionsHtml'));

    const snapshotResponse = await request('/snapshot');
    assert.strictEqual(snapshotResponse.statusCode, 200);
    assert.ok(snapshotResponse.body.includes('快照回放'));
    assert.ok(snapshotResponse.body.includes('查看快照 JSON'));
    assert.ok(snapshotResponse.body.includes('查看回放 JSON'));
    assert.ok(snapshotResponse.body.includes('grid-template-columns: minmax(220px, 0.55fr) minmax(480px, 1.45fr);'));
    assert.ok(snapshotResponse.body.includes('src="arb-equivalence-utils.js"'));
    assert.ok(snapshotResponse.body.includes('src="charts-utils.js"'));
    assert.ok(snapshotResponse.body.includes('.arb-opportunity-head {'));
    assert.ok(!snapshotResponse.body.includes('.arb-opportunity-chart-link {'));
    assert.ok(!snapshotResponse.body.includes('.arb-opportunity-add-alert-btn {'));

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
    assert.ok(queueStatsResponse.body.includes('src="request-channel-utils.js"'));
    assert.ok(
      queueStatsResponse.body.indexOf('src="quote-pause-utils.js"') < queueStatsResponse.body.indexOf('src="queue-stats-utils.js"')
    );
    assert.ok(
      queueStatsResponse.body.indexOf('src="request-channel-utils.js"') < queueStatsResponse.body.indexOf('src="queue-stats-utils.js"')
    );
    assert.ok(queueStatsResponse.body.includes('src="queue-stats-utils.js"'));
    assert.ok(queueStatsResponse.body.includes('src="queue-stats-app.js"'));

    assert.ok(response.body.includes('href="/queue-stats"'));

    const pathAlertsResponse = await request('/path-alerts');
    assert.strictEqual(pathAlertsResponse.statusCode, 200);
    assert.ok(pathAlertsResponse.body.includes('报警管理'));
    assert.ok(pathAlertsResponse.body.includes('id="path-alerts-page"'));
    assert.ok(pathAlertsResponse.body.includes('id="path-alerts-sections"'));
    assert.ok(pathAlertsResponse.body.includes('id="path-alerts-dismissed-list"'));
    assert.ok(pathAlertsResponse.body.includes('id="path-alerts-editor"'));
    assert.ok(pathAlertsResponse.body.includes('id="path-alerts-anchor-nav"'));
    assert.ok(pathAlertsResponse.body.includes('href="#quote-alert-section"'));
    assert.ok(pathAlertsResponse.body.includes('href="#rule-alert-section"'));
    assert.ok(pathAlertsResponse.body.includes('href="#path-manual-section"'));
    assert.ok(pathAlertsResponse.body.includes('href="#special-alert-section"'));
    assert.ok(pathAlertsResponse.body.includes('id="path-alerts-dismiss-selected-btn"'));
    assert.ok(pathAlertsResponse.body.includes('批量删除'));
    assert.ok(pathAlertsResponse.body.includes('已忽略规则'));
    assert.ok(pathAlertsResponse.body.includes('id="path-alerts-editor-modal"'));
    assert.ok(!pathAlertsResponse.body.includes('id="path-alerts-search-input"'));
    assert.ok(!pathAlertsResponse.body.includes('id="path-alerts-dismissed-search-input"'));
    assert.ok(pathAlertsResponse.body.includes('src="shared/trading-pair-utils.js"'));
    assert.ok(pathAlertsResponse.body.includes('src="quote-pause-utils.js"'));
    assert.ok(!pathAlertsResponse.body.includes('src="quote-alert-config-utils.js"'));
    assert.ok(pathAlertsResponse.body.includes('src="path-alert-candidate-utils.js"'));
    assert.ok(pathAlertsResponse.body.includes('src="special-rule-alert-config-utils.js"'));
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
    assert.ok(pathAlertsAppResponse.body.includes('renderSectionCards'));
    assert.ok(pathAlertsAppResponse.body.includes('groupAlertsBySection'));
    assert.ok(pathAlertsAppResponse.body.includes('path-alerts-editor-modal'));
    assert.ok(pathAlertsAppResponse.body.includes('path-alerts-dismiss-selected-btn'));
    assert.ok(pathAlertsAppResponse.body.includes('data-alert-dismiss-delete'));
    assert.ok(pathAlertsAppResponse.body.includes('data-dismissed-restore'));
    assert.ok(pathAlertsAppResponse.body.includes("event.key === 'ArrowDown'"));
    assert.ok(pathAlertsAppResponse.body.includes("event.key === 'ArrowUp'"));
    assert.ok(pathAlertsAppResponse.body.includes("event.key === 'Enter'"));
    assert.ok(pathAlertsAppResponse.body.includes('pageState.filterQuoteId = String(parsed.filterQuoteId || \'\').trim();'));
    assert.ok(pathAlertsAppResponse.body.includes('applyInitialRoute();'));
  } finally {
    serverProcess.kill();
  }
})().catch((error) => {
  serverProcess.kill();
  throw error;
});
