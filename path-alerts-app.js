(function () {
  const BACKEND_URL = `${location.protocol}//${location.hostname}:3000`;
  const PATH_ALERT_CONFIG_SYNC_KEY = 'path-alert-config-sync';
  const PATH_ALERT_CONFIG_SYNC_SOURCE_MANAGE = 'path-alerts-manage';
  const statusEl = document.getElementById('path-alerts-status');
  const listEl = document.getElementById('path-alerts-sections');
  const dismissedListEl = document.getElementById('path-alerts-dismissed-list');
  const editorEl = document.getElementById('path-alerts-editor');
  const editorTitleEl = document.getElementById('path-alerts-editor-title');
  const editorModalEl = document.getElementById('path-alerts-editor-modal');
  const createBtn = document.getElementById('path-alerts-create-btn');
  const closeEditorBtn = document.getElementById('path-alerts-close-editor-btn');
  const contextBarEl = document.getElementById('path-alerts-context');
  const dismissSelectedBtn = document.getElementById('path-alerts-dismiss-selected-btn');
  const deleteSelectedBtn = document.getElementById('path-alerts-delete-selected-btn');
  const deleteDismissedSelectedBtn = document.getElementById('path-alerts-dismissed-delete-selected-btn');
  const selectionCountEl = document.getElementById('path-alerts-selection-count');
  const dismissedSelectionCountEl = document.getElementById('path-alerts-dismissed-selection-count');

  let dashboardState = [];
  let alertConfig = window.PathAlertUtils
    ? window.PathAlertUtils.normalizeAlertConfig()
    : { settings: { defaultCooldownSec: 180 }, alerts: [], dismissedTargets: [] };
  let quoteById = new Map();
  let quoteCandidates = [];
  let pageState = {
    editorVisible: false,
    errorMessage: '',
    saveMessage: '',
    draft: null,
    filterQuoteId: '',
    filteredCandidates: [],
    activeCandidateIndex: -1,
    selectedAlertIds: new Set(),
    selectedDismissedKeys: new Set()
  };

  function emitPathAlertConfigSync() {
    const payload = JSON.stringify({
      source: PATH_ALERT_CONFIG_SYNC_SOURCE_MANAGE,
      ts: Date.now()
    });
    try {
      localStorage.setItem(PATH_ALERT_CONFIG_SYNC_KEY, payload);
    } catch (error) {
      console.warn('[path-alert-config] sync emit failed', error);
    }
  }

  function escapeHtml(value) {
    return window.PathAlertPageUtils.escapeHtml(value);
  }

  function formatChainLabel(chain) {
    return window.ChainDefaults && typeof window.ChainDefaults.getChainDisplayName === 'function'
      ? window.ChainDefaults.getChainDisplayName(chain)
      : (chain || '');
  }

  function isCexOrderbookChain(chain) {
    if (window.ChainDefaults && typeof window.ChainDefaults.isCexOrderbookChain === 'function') {
      return window.ChainDefaults.isCexOrderbookChain(chain);
    }
    const normalized = String(chain || '').trim().toLowerCase();
    return normalized === 'bybit' || normalized === 'binance';
  }

  function parseCexTradingPairSymbol(symbol) {
    if (window.TradingPairUtils && typeof window.TradingPairUtils.parseCexTradingPairSymbol === 'function') {
      return window.TradingPairUtils.parseCexTradingPairSymbol(symbol);
    }
    return null;
  }

  function shortToken(value) {
    return window.PathAlertPageUtils.shortenTokenText(value);
  }

  function buildQuoteLabel(chain, fromSymbol, toSymbol, suffix = '') {
    return window.PathAlertPageUtils.buildPathAlertQuoteLabel({
      chain,
      fromSymbol,
      toSymbol,
      suffix,
      formatChainLabel
    });
  }

  function getDefaultThresholdBp() {
    return window.PathAlertUtils && Number.isFinite(window.PathAlertUtils.DEFAULT_PATH_ALERT_THRESHOLD_BP)
      ? window.PathAlertUtils.DEFAULT_PATH_ALERT_THRESHOLD_BP
      : 1.1;
  }

  function buildAlertId() {
    return `path-alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function getRuleDefinitions(kind) {
    return window.PathAlertRuleDefinitions
      ? window.PathAlertRuleDefinitions.getRuleDefinitions(kind)
      : [];
  }

  function findRule(kind, ruleId) {
    return window.PathAlertRuleDefinitions
      ? window.PathAlertRuleDefinitions.findRule(kind, ruleId)
      : null;
  }

  function resolveSpecialRuleAlertConfig(config) {
    if (window.SpecialRuleAlertConfigUtils && typeof window.SpecialRuleAlertConfigUtils.normalizeSpecialRuleAlertConfig === 'function') {
      return window.SpecialRuleAlertConfigUtils.normalizeSpecialRuleAlertConfig(config);
    }
    const source = config && typeof config === 'object' ? config : {};
    return {
      minNetProfit: Number.isFinite(Number(source.minNetProfit)) ? Number(source.minNetProfit) : null,
      minNetProfitBp: Number.isFinite(Number(source.minNetProfitBp)) ? Number(source.minNetProfitBp) : null
    };
  }

  function getEditorDraftOptions() {
    return {
      defaultThresholdBp: getDefaultThresholdBp(),
      defaultCooldownSec: alertConfig.settings?.defaultCooldownSec || 180,
      normalizePathAlert(alert) {
        return window.PathAlertUtils
          ? window.PathAlertUtils.normalizePathAlert(alert, alertConfig.settings || { defaultCooldownSec: 180 })
          : null;
      },
      resolveSpecialRuleConfig: resolveSpecialRuleAlertConfig
    };
  }

  function createEmptyDraft() {
    return window.PathAlertPageUtils.createPathAlertEditorDraft(getEditorDraftOptions());
  }

  function cloneDraft(draft) {
    return window.PathAlertPageUtils.clonePathAlertEditorDraft(draft, getEditorDraftOptions());
  }

  function buildDraftFromAlert(alert) {
    return window.PathAlertPageUtils.buildPathAlertEditorDraftFromAlert(alert, getEditorDraftOptions());
  }

  function buildDraftFromPrefill(prefill) {
    return window.PathAlertPageUtils.buildPathAlertEditorDraftFromPrefill(prefill, getEditorDraftOptions());
  }

  function buildDismissedIdentityKey(entry) {
    return buildAlertIdentityKey(entry && entry.target ? entry.target : entry);
  }

  function buildAlertIdentityKey(alertOrTarget) {
    if (!window.PathAlertUtils || typeof window.PathAlertUtils.buildPathAlertTargetDuplicateKey !== 'function') {
      return '';
    }
    const target = alertOrTarget && alertOrTarget.target ? alertOrTarget.target : alertOrTarget;
    return window.PathAlertUtils.buildPathAlertTargetDuplicateKey(target);
  }

  function getAlertDisplayTitle(alert) {
    return String(alert && alert.name || '').trim();
  }

  function getQuoteDirection(target) {
    return window.PathAlertNotificationUtils.getQuoteAlertDirection(target);
  }

  function buildQuoteDirectionLabel(target) {
    return window.PathAlertNotificationUtils.buildQuoteAlertDirectionLabel(target);
  }

  function buildQuoteAlertQuoteLabel(target) {
    const quote = quoteById.get(Number(target && target.quoteId));
    if (!quote) {
      return `报价 #${String(target && target.quoteId || '--')}`;
    }
    const direction = getQuoteDirection(target);
    if (isCexOrderbookChain(quote.chain)) {
      const parsed = parseCexTradingPairSymbol(quote.symbol);
      if (parsed) {
        const fromSymbol = direction === 'inverse' ? parsed.toSymbol : parsed.fromSymbol;
        const toSymbol = direction === 'inverse' ? parsed.fromSymbol : parsed.toSymbol;
        return `${buildQuoteDirectionLabel(target)} ${buildQuoteLabel(quote.chain, fromSymbol, toSymbol)}`;
      }
      return `${buildQuoteDirectionLabel(target)} (${formatChainLabel(quote.chain)}) ${quote.symbol || '--'}`;
    }
    const fromToken = direction === 'inverse' ? quote.toToken : quote.fromToken;
    const toToken = direction === 'inverse' ? quote.fromToken : quote.toToken;
    return `${buildQuoteDirectionLabel(target)} ${buildQuoteLabel(
      quote.chain,
      shortToken(fromToken),
      shortToken(toToken)
    )}`;
  }

  function buildQuoteAlertThresholdLine(target) {
    return window.PathAlertNotificationUtils.buildQuoteAlertThresholdLine(target);
  }

  function buildQuoteAlertRuleLine(target) {
    return window.PathAlertNotificationUtils.buildQuoteAlertRuleLine(target);
  }

  function buildQuoteAlertPairText(target) {
    const quote = quoteById.get(Number(target && target.quoteId));
    if (!quote) {
      return `报价 #${String(target && target.quoteId || '--')}`;
    }
    return buildQuoteAlertPairTextWithResolvedSymbols(target, quote, quoteCandidates);
  }

  function findQuoteCandidateForTarget(target, candidates = quoteCandidates) {
    const quoteId = Number(target && target.quoteId);
    if (!Number.isFinite(quoteId)) return null;
    const direction = getQuoteDirection(target);
    const items = Array.isArray(candidates) ? candidates : [];
    return items.find((candidate) => (
      Number(candidate && candidate.quoteId) === quoteId
      && String(candidate && candidate.direction || 'forward') === direction
      && String(candidate && candidate.pricingMode || 'raw') === 'raw'
    )) || null;
  }

  function buildQuoteAlertPairTextWithResolvedSymbols(target, quote, candidates = quoteCandidates) {
    if (!quote) {
      return `报价 #${String(target && target.quoteId || '--')}`;
    }
    const direction = getQuoteDirection(target);
    if (isCexOrderbookChain(quote.chain)) {
      const parsed = parseCexTradingPairSymbol(quote.symbol);
      if (parsed) {
        const fromSymbol = direction === 'inverse' ? parsed.toSymbol : parsed.fromSymbol;
        const toSymbol = direction === 'inverse' ? parsed.fromSymbol : parsed.toSymbol;
        return `${formatChainLabel(quote.chain)} ${fromSymbol}/${toSymbol}`;
      }
      return `${formatChainLabel(quote.chain)} ${quote.symbol || '--'}`;
    }
    const candidate = findQuoteCandidateForTarget(target, candidates);
    if (candidate && candidate.fromSymbol && candidate.toSymbol) {
      return `${formatChainLabel(quote.chain)} ${candidate.fromSymbol}/${candidate.toSymbol}`;
    }
    const fromToken = direction === 'inverse' ? quote.toToken : quote.fromToken;
    const toToken = direction === 'inverse' ? quote.fromToken : quote.toToken;
    return `${formatChainLabel(quote.chain)} ${shortToken(fromToken)}/${shortToken(toToken)}`;
  }

  function buildDefaultQuoteAlertName(target) {
    if (!target || target.type !== 'quote') return '';
    const pairText = buildQuoteAlertPairText(target);
    const suffix = target.ruleKind === 'targetAbove'
      ? '汇率高于'
      : target.ruleKind === 'targetBelow'
        ? '汇率低于'
        : target.ruleKind === 'percentUp'
          ? '上涨提醒'
          : target.ruleKind === 'percentDown'
            ? '下跌提醒'
            : '报警';
    return `${pairText} ${suffix}`.trim();
  }

  function buildDefaultAlertName(draft = pageState.draft) {
    if (!draft) return '';
    if (draft.sourceType === 'quote') {
      return buildDefaultQuoteAlertName(collectEditorTarget(draft));
    }
    return '';
  }

  function buildAlertSummaryLines(alert) {
    if (alert && alert.target && alert.target.type === 'quote') {
      const displayTitle = getAlertDisplayTitle(alert);
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
    if (window.PathAlertUtils && typeof window.PathAlertUtils.buildPathAlertSummaryLines === 'function') {
      return window.PathAlertUtils.buildPathAlertSummaryLines(alert, {
        formatLeg(leg) {
          return buildQuoteLabel(leg.chain, leg.fromSymbol, leg.toSymbol);
        },
        findRule
      });
    }
    if (!alert || !alert.target) return [];
    if (alert.target.type === 'rule') {
      const rule = findRule(alert.target.ruleKind, alert.target.ruleId);
      return [rule ? rule.title : alert.target.ruleId];
    }
    return (alert.target.legs || []).map((leg) => buildQuoteLabel(leg.chain, leg.fromSymbol, leg.toSymbol));
  }

  function buildDismissedSummaryLines(entry) {
    const lines = Array.isArray(entry && entry.summaryLinesSnapshot)
      ? entry.summaryLinesSnapshot.filter(Boolean)
      : [];
    if (lines.length) return lines;
    if (!entry || !entry.target) return [];
    return buildAlertSummaryLines({ target: entry.target });
  }

  function getFilteredAlerts() {
    return window.PathAlertPageUtils.filterAlertsByQuoteId(alertConfig.alerts, pageState.filterQuoteId);
  }

  function getFilteredDismissedTargets() {
    return window.PathAlertPageUtils.filterDismissedTargetsByQuoteId(alertConfig.dismissedTargets, pageState.filterQuoteId);
  }

  function syncSelectionCounters() {
    if (selectionCountEl) {
      selectionCountEl.textContent = `已选 ${pageState.selectedAlertIds.size} 条`;
    }
    if (dismissedSelectionCountEl) {
      dismissedSelectionCountEl.textContent = `已选 ${pageState.selectedDismissedKeys.size} 条`;
    }
    if (dismissSelectedBtn) {
      dismissSelectedBtn.disabled = pageState.selectedAlertIds.size === 0;
    }
    if (deleteSelectedBtn) {
      deleteSelectedBtn.disabled = pageState.selectedAlertIds.size === 0;
    }
    if (deleteDismissedSelectedBtn) {
      deleteDismissedSelectedBtn.disabled = pageState.selectedDismissedKeys.size === 0;
    }
  }

  function buildAlertRouteHtml(lines) {
    return `<div class="alert-item-route-lines">${window.PathAlertPageUtils.renderPathAlertRouteLinesHtml(lines, 'alert-item-route-line')}</div>`;
  }

  function buildQuoteCandidates() {
    return buildFallbackQuoteCandidatesFromDashboard(dashboardState);
  }

  function buildFallbackQuoteCandidatesFromDashboard(dashboard) {
    return window.PathAlertCandidateUtils
      ? window.PathAlertCandidateUtils.buildPathAlertCandidatesFromDashboard(dashboard, {
        parseCexTradingPairSymbol,
        shortenToken: shortToken,
        buildLabel: (chain, fromSymbol, toSymbol, suffix = '') => buildQuoteLabel(chain, fromSymbol, toSymbol, suffix)
      })
      : [];
  }

  function getFilteredCandidates(query) {
    return window.PathAlertCandidateUtils
      ? window.PathAlertCandidateUtils.filterPathAlertCandidates(quoteCandidates, query, 12)
      : [];
  }

  function hideCandidateSuggestions() {
    pageState.activeCandidateIndex = -1;
    const suggestionsEl = document.getElementById('path-alert-suggestions');
    if (!suggestionsEl) return;
    suggestionsEl.classList.remove('visible');
    suggestionsEl.innerHTML = '';
  }

  function renderCandidateSuggestions() {
    const suggestionsEl = document.getElementById('path-alert-suggestions');
    const searchInput = document.getElementById('path-alert-search-input');
    if (!suggestionsEl || !searchInput || !pageState.draft || pageState.draft.sourceType !== 'path') {
      return;
    }

    pageState.filteredCandidates = getFilteredCandidates(pageState.draft.searchQuery);
    const shouldShow = document.activeElement === searchInput || Boolean(searchInput.value.trim());
    if (!pageState.filteredCandidates.length || !shouldShow) {
      hideCandidateSuggestions();
      return;
    }

    if (pageState.activeCandidateIndex >= pageState.filteredCandidates.length) {
      pageState.activeCandidateIndex = 0;
    }

    suggestionsEl.innerHTML = pageState.filteredCandidates.map((candidate, index) => `
      <button
        type="button"
        class="path-alert-suggestion${index === pageState.activeCandidateIndex ? ' active' : ''}"
        data-path-alert-candidate-key="${escapeHtml(candidate.key)}"
      >
        <span class="path-alert-suggestion-label">${escapeHtml(candidate.label)}</span>
        <span class="path-alert-suggestion-meta">${escapeHtml(candidate.categoryName || '')}</span>
      </button>
    `).join('');
    suggestionsEl.classList.add('visible');
  }

  function getSelectedCandidate() {
    pageState.filteredCandidates = getFilteredCandidates(pageState.draft ? pageState.draft.searchQuery : '');
    if (pageState.activeCandidateIndex >= 0 && pageState.activeCandidateIndex < pageState.filteredCandidates.length) {
      return pageState.filteredCandidates[pageState.activeCandidateIndex];
    }
    if (!pageState.draft || !String(pageState.draft.searchQuery || '').trim()) {
      return null;
    }
    return pageState.filteredCandidates[0] || null;
  }

  function setStatus(message, kind = '') {
    statusEl.textContent = message || '';
    statusEl.className = kind ? `status-message ${kind}` : 'status-message';
  }

  async function loadDashboardConfig() {
    const response = await fetch(`${BACKEND_URL}/api/get-config`);
    if (!response.ok) throw new Error('获取主看板配置失败');
    const raw = await response.json();
    dashboardState = Array.isArray(raw) ? raw : Array.isArray(raw.dashboard) ? raw.dashboard : [];
    quoteById = new Map(dashboardState.flatMap((category) => (category.quotes || []).map((quote) => [quote.id, quote])));
    quoteCandidates = buildQuoteCandidates();
  }

  async function loadQuoteCandidates() {
    const response = await fetch(`${BACKEND_URL}/api/path-alert-quote-candidates`);
    if (!response.ok) throw new Error('获取报价腿候选失败');
    const raw = await response.json();
    quoteCandidates = Array.isArray(raw) ? raw : [];
  }

  async function loadAlertConfig() {
    const response = await fetch(`${BACKEND_URL}/api/get-alert-config`);
    if (!response.ok) throw new Error('获取报警配置失败');
    const raw = await response.json();
    alertConfig = window.PathAlertUtils
      ? window.PathAlertUtils.normalizeAlertConfig(raw)
      : raw;
  }

  async function persistAlertConfig() {
    const payload = window.PathAlertUtils
      ? window.PathAlertUtils.normalizeAlertConfig(alertConfig)
      : alertConfig;
    const response = await fetch(`${BACKEND_URL}/api/save-alert-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error((data && data.error) || '保存报警配置失败');
    }
    alertConfig = payload;
    emitPathAlertConfigSync();
    setStatus('已保存，主看板会自动同步。', 'success');
  }

  function updateHistory(mode, options = {}) {
    if (!window.PathAlertPageUtils) return;
    const href = window.PathAlertPageUtils.buildPathAlertsPageHref({
      mode,
      alertId: options.alertId || '',
      draft: options.draft || null,
      filterQuoteId: pageState.filterQuoteId || ''
    });
    history.replaceState(null, '', href);
  }

  function openEditorWithDraft(draft, mode = 'create') {
    pageState.editorVisible = true;
    pageState.errorMessage = '';
    pageState.saveMessage = '';
    pageState.draft = cloneDraft(draft);
    editorTitleEl.textContent = pageState.draft.id ? '编辑报警' : '新建报警';
    updateHistory(mode, mode === 'edit'
      ? { alertId: pageState.draft.id }
      : { draft: pageState.draft.id ? null : { name: pageState.draft.name, target: collectEditorTarget(pageState.draft) } });
    renderEditor();
  }

  function closeEditor() {
    pageState.editorVisible = false;
    pageState.errorMessage = '';
    pageState.saveMessage = '';
    pageState.draft = null;
    updateHistory('manage');
    renderEditor();
  }

  function collectEditorTarget(draft = pageState.draft) {
    if (!draft) return null;
    if (draft.sourceType === 'quote') {
      const target = {
        type: 'quote',
        quoteId: Number(draft.selectedQuoteId),
        direction: draft.quoteDirection === 'inverse' ? 'inverse' : 'forward',
        ruleKind: draft.quoteRuleKind,
        value: Number(draft.quoteValue)
      };
      if (draft.quoteRuleKind === 'percentUp' || draft.quoteRuleKind === 'percentDown') {
        target.basePrice = Number(draft.quoteBasePrice);
      }
      return target;
    }
    if (draft.sourceType === 'fixed' || draft.sourceType === 'special') {
      return {
        type: 'rule',
        ruleKind: draft.sourceType,
        ruleId: draft.selectedRuleId
      };
    }
    return {
      type: 'path',
      legs: (draft.legs || []).map((leg) => ({
        quoteId: Number(leg.quoteId),
        direction: leg.direction === 'inverse' ? 'inverse' : 'forward',
        pricingMode: ['raw', 'cex-bid1', 'cex-ask1-inverse'].includes(leg.pricingMode) ? leg.pricingMode : 'raw',
        chain: String(leg.chain || ''),
        fromSymbol: String(leg.fromSymbol || ''),
        toSymbol: String(leg.toSymbol || '')
      }))
    };
  }

  function getEditAlertHref(alertId) {
    if (!window.PathAlertPageUtils || !alertId) return '/path-alerts';
    return window.PathAlertPageUtils.buildPathAlertsPageHref({
      mode: 'edit',
      alertId,
      filterQuoteId: pageState.filterQuoteId || ''
    });
  }

  function createQuoteScopedDraft(direction = 'forward') {
    const draft = createEmptyDraft();
    draft.sourceType = 'quote';
    draft.selectedQuoteId = pageState.filterQuoteId || '';
    draft.quoteDirection = direction === 'inverse' ? 'inverse' : 'forward';
    return draft;
  }

  function findDuplicateAlertForDraft(draft) {
    if (!draft || !window.PathAlertUtils || typeof window.PathAlertUtils.findDuplicatePathAlert !== 'function') {
      return null;
    }
    return window.PathAlertUtils.findDuplicatePathAlert(
      Array.isArray(alertConfig.alerts) ? alertConfig.alerts : [],
      {
        id: String(draft.id || ''),
        target: collectEditorTarget(draft)
      },
      {
        excludeId: String(draft.id || '')
      }
    );
  }

  function findDismissedTargetForDraft(draft) {
    if (!draft || !window.PathAlertUtils || typeof window.PathAlertUtils.findDismissedPathAlert !== 'function') {
      return null;
    }
    return window.PathAlertUtils.findDismissedPathAlert(
      Array.isArray(alertConfig.dismissedTargets) ? alertConfig.dismissedTargets : [],
      {
        target: collectEditorTarget(draft)
      }
    );
  }

  function validateDraft(draft) {
    const confirmDelaySec = Number(draft.confirmDelaySec);
    if (!Number.isFinite(confirmDelaySec) || confirmDelaySec < 0) {
      return '延迟确认必须是大于等于 0 的数字';
    }
    const cooldownSec = Number(draft.cooldownSec);
    if (!Number.isFinite(cooldownSec) || cooldownSec <= 0) {
      return '冷却时间必须大于 0';
    }

    if (draft.sourceType === 'quote') {
      if (!quoteById.has(Number(draft.selectedQuoteId))) {
        return '请选择有效的报价';
      }
      if (!['forward', 'inverse'].includes(draft.quoteDirection)) {
        return '请选择有效的监控方向';
      }
      if (!['targetAbove', 'targetBelow', 'percentUp', 'percentDown'].includes(draft.quoteRuleKind)) {
        return '请选择有效的交易对报警规则';
      }
      if (!Number.isFinite(Number(draft.quoteValue))) {
        return '汇率阈值必须是合法数字';
      }
      if (
        (draft.quoteRuleKind === 'percentUp' || draft.quoteRuleKind === 'percentDown')
        && (!Number.isFinite(Number(draft.quoteBasePrice)) || Number(draft.quoteBasePrice) <= 0)
      ) {
        return '百分比规则必须填写有效基准汇率';
      }
      const duplicateAlert = findDuplicateAlertForDraft(draft);
      if (duplicateAlert) {
        return `该报警已存在：${duplicateAlert.name || duplicateAlert.id}`;
      }
      return '';
    }

    const thresholdBp = draft.thresholdBp === '' ? 0 : Number(draft.thresholdBp);
    if (draft.sourceType !== 'special' && !Number.isFinite(thresholdBp)) {
      return '收益阈值必须是合法数字';
    }

    if (draft.sourceType === 'fixed' || draft.sourceType === 'special') {
      const rule = findRule(draft.sourceType, draft.selectedRuleId);
      if (!rule) {
        return '请选择有效的规则';
      }
      if (draft.sourceType === 'special') {
        const specialRuleConfig = resolveSpecialRuleAlertConfig(draft.specialRuleConfig);
        if (!Number.isFinite(Number(specialRuleConfig.minNetProfit)) || Number(specialRuleConfig.minNetProfit) < 0) {
          return '净收益阈值必须是大于等于 0 的数字';
        }
        if (!Number.isFinite(Number(specialRuleConfig.minNetProfitBp)) || Number(specialRuleConfig.minNetProfitBp) < 0) {
          return '净收益率阈值必须是大于等于 0 的数字';
        }
      }
      const dismissedTarget = findDismissedTargetForDraft(draft);
      if (dismissedTarget) {
        return '该规则已被标记为忽略，请先在“已忽略规则”列表取消标记。';
      }
      const duplicateAlert = findDuplicateAlertForDraft(draft);
      if (duplicateAlert) {
        return `该报警已存在：${duplicateAlert.name || duplicateAlert.id}`;
      }
      return '';
    }

    if (!Array.isArray(draft.legs) || !draft.legs.length) {
      return '至少需要一条路径腿';
    }
    const missingQuoteId = draft.legs.find((leg) => !quoteById.has(Number(leg.quoteId)));
    if (missingQuoteId) {
      return `路径腿引用的 live quote 不存在：${missingQuoteId.quoteId}`;
    }
    const dismissedTarget = findDismissedTargetForDraft(draft);
    if (dismissedTarget) {
      return '该规则已被标记为忽略，请先在“已忽略规则”列表取消标记。';
    }
    const duplicateAlert = findDuplicateAlertForDraft(draft);
    if (duplicateAlert) {
      return `该报警已存在：${duplicateAlert.name || duplicateAlert.id}`;
    }
    return '';
  }

  function buildAlertFromDraft() {
    const draft = pageState.draft;
    const thresholdBp = draft.sourceType === 'quote' || draft.sourceType === 'special'
      ? 0
      : draft.thresholdBp === '' ? 0 : Number(draft.thresholdBp);
    const alert = {
      id: draft.id || buildAlertId(),
      name: draft.name.trim() || buildDefaultAlertName(draft),
      enabled: draft.enabled !== false,
      thresholdBp,
      triggerMode: draft.triggerMode === 'delayed' ? 'delayed' : 'immediate',
      confirmDelaySec: Number(draft.confirmDelaySec || 0),
      cooldownSec: Number(draft.cooldownSec || alertConfig.settings?.defaultCooldownSec || 180),
      target: collectEditorTarget(draft)
    };
    if (draft.sourceType === 'special') {
      alert.specialRuleConfig = resolveSpecialRuleAlertConfig(draft.specialRuleConfig);
    }
    return window.PathAlertUtils
      ? window.PathAlertUtils.normalizePathAlert(alert, alertConfig.settings || { defaultCooldownSec: 180 })
      : alert;
  }

  function createDismissedEntryFromAlert(alert) {
    if (!window.PathAlertUtils || typeof window.PathAlertUtils.createDismissedTargetEntry !== 'function') {
      return null;
    }
    return window.PathAlertUtils.createDismissedTargetEntry(
      alert,
      buildAlertSummaryLines(alert),
      Date.now()
    );
  }

  function syncSelectionSets() {
    pageState.selectedAlertIds = window.PathAlertPageUtils.pruneSelectionSet(
      pageState.selectedAlertIds,
      (alertConfig.alerts || []).map((alert) => alert.id)
    );
    pageState.selectedDismissedKeys = window.PathAlertPageUtils.pruneSelectionSet(
      pageState.selectedDismissedKeys,
      (alertConfig.dismissedTargets || []).map((entry) => buildAlertIdentityKey(entry.target))
    );
  }

  function renderSectionCards(sectionKey, alerts) {
    return alerts.map((alert) => {
      const title = window.PathAlertPageUtils.buildPathAlertCardTitle(alert, {
        getDisplayTitle: getAlertDisplayTitle,
        buildQuoteLabel: buildQuoteAlertQuoteLabel
      });
      const summaryLines = buildAlertSummaryLines(alert);
      const metaText = window.PathAlertPageUtils.buildPathAlertCardMetaText(alert, {
        resolveSpecialRuleConfig: resolveSpecialRuleAlertConfig
      });
      const subtitle = alert && alert.target && alert.target.type === 'quote'
        ? buildQuoteAlertRuleLine(alert.target)
        : alert && alert.target && alert.target.type === 'rule'
          ? (alert.target.ruleKind === 'fixed' ? '固定规则路径' : '特殊规则路径')
          : `${Array.isArray(alert?.target?.legs) ? alert.target.legs.length : 0} 腿路径`;
      const typeClass = sectionKey === 'quote' ? 'quote' : sectionKey === 'rule' ? 'rule' : sectionKey === 'special' ? 'special' : 'path';
      return `
        <article class="alert-card" data-alert-open="${escapeHtml(alert.id)}">
          <div class="alert-card-shell">
            <input class="alert-card-select" type="checkbox" data-alert-select="${escapeHtml(alert.id)}" ${pageState.selectedAlertIds.has(alert.id) ? 'checked' : ''}>
            <div class="alert-card-main">
              <div class="alert-card-head">
                <div>
                  <div class="alert-card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
                  <div class="alert-card-subline">${escapeHtml(subtitle)}</div>
                </div>
                <div class="alert-card-meta-tags">
                  <span class="tag ${typeClass}">${sectionKey === 'quote' ? '交易对' : sectionKey === 'rule' ? '固定' : sectionKey === 'special' ? '特殊' : '路径'}</span>
                  <span class="tag live">${alert.enabled === false ? '停用' : '启用'}</span>
                </div>
              </div>
              <div class="alert-card-route">${window.PathAlertPageUtils.renderPathAlertRouteLinesHtml(summaryLines, 'alert-card-route-line')}</div>
              <div class="alert-card-foot">
                <div class="alert-card-meta" title="${escapeHtml(metaText)}">${escapeHtml(metaText)}</div>
                <div class="alert-card-actions">
                  <button type="button" class="inline-action-btn" data-alert-edit="${escapeHtml(alert.id)}">编辑</button>
                  <button type="button" class="inline-action-btn" data-alert-toggle="${escapeHtml(alert.id)}">${alert.enabled === false ? '启用' : '停用'}</button>
                  <button type="button" class="inline-action-btn" data-alert-dismiss-delete="${escapeHtml(alert.id)}">忽略并删除</button>
                  <button type="button" class="inline-action-btn danger" data-alert-delete="${escapeHtml(alert.id)}">删除</button>
                </div>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderContextBar() {
    if (!contextBarEl) return;
    if (!pageState.filterQuoteId) {
      contextBarEl.classList.remove('visible');
      contextBarEl.innerHTML = '';
      return;
    }
    const quote = quoteById.get(Number(pageState.filterQuoteId));
    const quoteLabel = quote
      ? (isCexOrderbookChain(quote.chain)
        ? `${formatChainLabel(quote.chain)} ${quote.symbol || '--'}`
        : buildQuoteLabel(quote.chain, shortToken(quote.fromToken), shortToken(quote.toToken)).replace(/[()]/g, ''))
      : `交易对 #${pageState.filterQuoteId}`;
    const filteredCount = getFilteredAlerts().length;
    contextBarEl.classList.add('visible');
    contextBarEl.innerHTML = `
      <div class="context-left">
        <span class="chip context">当前交易对 · ${escapeHtml(quoteLabel)}</span>
        <span class="chip">仅展示这个交易对相关报警</span>
      </div>
      <div class="toolbar-right">
        <button type="button" data-context-create="forward">新增正向报警</button>
        <button type="button" data-context-create="inverse">新增反向报警</button>
        <div class="inline-count">当前 ${filteredCount} 条</div>
      </div>
    `;
  }

  function renderList() {
    syncSelectionSets();
    const alerts = getFilteredAlerts();
    renderContextBar();
    if (!alerts.length) {
      listEl.innerHTML = `<div class="empty">${pageState.filterQuoteId ? '这个交易对还没有报警' : '暂无报警'}</div>`;
      syncSelectionCounters();
      return;
    }
    const grouped = window.PathAlertPageUtils.groupAlertsBySection(alerts);
    listEl.innerHTML = window.PathAlertPageUtils.buildPathAlertSectionConfigs(grouped, {
      filterQuoteId: pageState.filterQuoteId
    })
      .filter((section) => section.items.length)
      .map((section) => `
        <section id="${section.id}" class="panel section-block section-anchor">
          <div class="section-head">
            <div class="section-title">
              <span class="tag ${section.tagClass}">${escapeHtml(section.title)}</span>
              <h2>${escapeHtml(section.title)}</h2>
              <small>${escapeHtml(section.note)}</small>
            </div>
            <div class="section-link">${section.items.length} 条</div>
          </div>
          <div class="card-grid">${renderSectionCards(section.key, section.items)}</div>
        </section>
      `).join('');
    syncSelectionCounters();
  }

  function renderDismissedList() {
    if (!dismissedListEl) return;
    syncSelectionSets();
    const dismissedTargets = Array.isArray(alertConfig.dismissedTargets) ? alertConfig.dismissedTargets : [];
    const filteredDismissed = getFilteredDismissedTargets();
    dismissedListEl.innerHTML = filteredDismissed.length
      ? filteredDismissed.map((entry) => {
        const targetKey = buildDismissedIdentityKey(entry);
        const title = window.PathAlertPageUtils.buildDismissedTargetCardTitle(entry);
        const summaryLines = buildDismissedSummaryLines(entry);
        const metaText = window.PathAlertPageUtils.buildDismissedTargetMetaText(entry);
        return `
          <article class="alert-card">
            <div class="alert-card-shell">
              <input class="alert-card-select" type="checkbox" data-dismissed-select="${escapeHtml(targetKey)}" ${pageState.selectedDismissedKeys.has(targetKey) ? 'checked' : ''}>
              <div class="alert-card-main">
                <div class="alert-card-head">
                  <div>
                    <div class="alert-card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
                    <div class="alert-card-subline">已忽略规则</div>
                  </div>
                  <div class="alert-card-meta-tags">
                    <span class="tag path">已忽略</span>
                  </div>
                </div>
                <div class="alert-card-route">${window.PathAlertPageUtils.renderPathAlertRouteLinesHtml(summaryLines, 'alert-card-route-line')}</div>
                <div class="alert-card-foot">
                  <div class="alert-card-meta" title="${escapeHtml(metaText)}">${escapeHtml(metaText)}</div>
                  <div class="alert-card-actions">
                    <button type="button" class="inline-action-btn" data-dismissed-restore="${escapeHtml(targetKey)}">取消标记</button>
                    <button type="button" class="inline-action-btn danger" data-dismissed-delete="${escapeHtml(targetKey)}">删除</button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        `;
      }).join('')
      : `<div class="empty">${dismissedTargets.length ? '没有匹配的已忽略项' : '暂无已忽略项'}</div>`;

    syncSelectionCounters();
  }

  function renderRuleChoices(sourceType, selectedRuleId) {
    const rules = getRuleDefinitions(sourceType);
    if (!rules.length) return '<div class="empty">暂无可选规则</div>';
    return `<div class="rule-list">${rules.map((rule) => `
      <button
        type="button"
        class="rule-item${selectedRuleId === rule.id ? ' active' : ''}"
        data-editor-rule-id="${escapeHtml(rule.id)}"
      >${escapeHtml(rule.title)}</button>
    `).join('')}</div>`;
  }

  function renderCandidateSearchArea(draft) {
    const disabledAttr = quoteCandidates.length ? '' : 'disabled';
    return `
      <div class="form-group">
        <label for="path-alert-search-input">搜索报价腿</label>
        <div class="path-alert-search-row">
          <div class="path-alert-search-shell">
            <input id="path-alert-search-input" type="text" value="${escapeHtml(draft.searchQuery)}" placeholder="输入分区名、链名、代币、地址" ${disabledAttr}>
            <div id="path-alert-suggestions" class="path-alert-suggestions"></div>
          </div>
          <button type="button" id="path-alert-add-leg-btn" ${disabledAttr}>添加</button>
        </div>
      </div>
      ${quoteCandidates.length ? '' : '<div class="empty">暂无可选报价腿</div>'}
    `;
  }

  function renderQuoteTargetEditor(draft) {
    const quoteOptions = Array.from(quoteById.values()).map((quote) => {
      const label = isCexOrderbookChain(quote.chain)
        ? `(${formatChainLabel(quote.chain)}) ${quote.symbol || '--'}`
        : buildQuoteLabel(quote.chain, shortToken(quote.fromToken), shortToken(quote.toToken));
      return `<option value="${escapeHtml(String(quote.id))}" ${String(draft.selectedQuoteId || '') === String(quote.id) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }).join('');

    return `
      <div class="form-group">
        <label for="editor-quote-id">报价</label>
        <select id="editor-quote-id" ${pageState.filterQuoteId ? 'disabled' : ''}>
          <option value="">请选择</option>
          ${quoteOptions}
        </select>
      </div>
      <div class="form-group">
        <label for="editor-quote-direction">方向</label>
        <select id="editor-quote-direction">
          <option value="forward" ${draft.quoteDirection === 'forward' ? 'selected' : ''}>正向</option>
          <option value="inverse" ${draft.quoteDirection === 'inverse' ? 'selected' : ''}>反向</option>
        </select>
      </div>
      <div class="form-group">
        <label for="editor-quote-rule-kind">规则</label>
        <select id="editor-quote-rule-kind">
          <option value="targetAbove" ${draft.quoteRuleKind === 'targetAbove' ? 'selected' : ''}>汇率高于</option>
          <option value="targetBelow" ${draft.quoteRuleKind === 'targetBelow' ? 'selected' : ''}>汇率低于</option>
          <option value="percentUp" ${draft.quoteRuleKind === 'percentUp' ? 'selected' : ''}>相对基准上涨</option>
          <option value="percentDown" ${draft.quoteRuleKind === 'percentDown' ? 'selected' : ''}>相对基准下跌</option>
        </select>
      </div>
      <div class="form-group">
        <label for="editor-quote-value">${draft.quoteRuleKind === 'percentUp' || draft.quoteRuleKind === 'percentDown' ? '阈值 (%)' : '汇率阈值'}</label>
        <input id="editor-quote-value" type="number" step="0.000001" value="${draft.quoteValue === '' ? '' : escapeHtml(String(draft.quoteValue))}">
      </div>
      ${(draft.quoteRuleKind === 'percentUp' || draft.quoteRuleKind === 'percentDown') ? `
        <div class="form-group">
          <label for="editor-quote-base-price">基准汇率</label>
          <input id="editor-quote-base-price" type="number" step="0.000001" value="${draft.quoteBasePrice === '' ? '' : escapeHtml(String(draft.quoteBasePrice))}">
        </div>
      ` : ''}
    `;
  }

  function renderSelectedLegs(draft) {
    if (draft.sourceType === 'quote') {
      const target = collectEditorTarget(draft);
      return `<div class="rule-list"><div class="rule-item active">${escapeHtml(buildQuoteAlertQuoteLabel(target))}</div><div class="rule-item active">${escapeHtml(buildQuoteAlertRuleLine(target))}</div></div>`;
    }
    if (draft.sourceType !== 'path') {
      const rule = findRule(draft.sourceType, draft.selectedRuleId);
      return rule
        ? `<div class="rule-list"><div class="rule-item active">${escapeHtml(rule.title)}</div></div>`
        : '<div class="empty">请选择一条规则</div>';
    }
    if (!draft.legs.length) {
      return '<div class="empty">还没有添加路径腿</div>';
    }
    return `<div class="selected-legs">${draft.legs.map((leg, index) => `
      <div class="selected-leg-item">
        <div class="selected-leg-text">${escapeHtml(buildQuoteLabel(leg.chain, leg.fromSymbol, leg.toSymbol))}</div>
        <div class="selected-leg-actions">
          <button type="button" data-editor-move-leg="up" data-editor-leg-index="${index}">↑</button>
          <button type="button" data-editor-move-leg="down" data-editor-leg-index="${index}">↓</button>
          <button type="button" data-editor-remove-leg="${index}">删</button>
        </div>
      </div>
    `).join('')}</div>`;
  }

  function renderEditor() {
    if (!pageState.editorVisible || !pageState.draft) {
      if (editorModalEl) editorModalEl.classList.remove('visible');
      editorEl.innerHTML = '';
      return;
    }
    if (editorModalEl) editorModalEl.classList.add('visible');

    const draft = pageState.draft;
    const duplicateAlert = findDuplicateAlertForDraft(draft);
    const dismissedTarget = findDismissedTargetForDraft(draft);
    const targetSummaryLines = draft.sourceType === 'path'
      ? ((draft.legs || []).map((leg) => buildQuoteLabel(leg.chain, leg.fromSymbol, leg.toSymbol)).filter(Boolean))
      : draft.sourceType === 'quote'
        ? [buildQuoteAlertQuoteLabel(collectEditorTarget(draft)), buildQuoteAlertRuleLine(collectEditorTarget(draft))]
      : [((findRule(draft.sourceType, draft.selectedRuleId) || {}).title || '--')];
    const errorHtml = pageState.errorMessage
      ? `<div id="editor-error-slot" class="status-message error">${escapeHtml(pageState.errorMessage)}</div>`
      : '<div id="editor-error-slot" class="status-message"></div>';
    const duplicateHtml = duplicateAlert
      ? `
        <div class="status-message error editor-duplicate-warning">
          <span>与已有报警重复：${escapeHtml(duplicateAlert.name || duplicateAlert.id || '未命名路径')}</span>
          <a class="inline-link-btn" href="${escapeHtml(getEditAlertHref(duplicateAlert.id))}">编辑已有报警</a>
        </div>
      `
      : '';
    const dismissedHtml = dismissedTarget
      ? `
        <div class="status-message error editor-duplicate-warning">
          <span>该路径已被标记为不需要，请先恢复后再添加。</span>
          <a class="inline-link-btn" href="#dismissed-section">查看已忽略规则</a>
        </div>
      `
      : '';
    const saveDisabledAttr = duplicateAlert || dismissedTarget ? 'disabled' : '';

    editorEl.innerHTML = `
      ${errorHtml}
      ${duplicateHtml}
      ${dismissedHtml}
      <div class="form-group">
        <label for="editor-name">备注（可选）</label>
        <input id="editor-name" type="text" value="${escapeHtml(draft.name)}" placeholder="例如：只关注 ETH / ARB 这条">
      </div>

      <div class="type-tabs">
        <button type="button" class="type-tab${draft.sourceType === 'path' ? ' active' : ''}" data-editor-type="path">手工路径</button>
        <button type="button" class="type-tab${draft.sourceType === 'quote' ? ' active' : ''}" data-editor-type="quote">交易对报警</button>
        <button type="button" class="type-tab${draft.sourceType === 'fixed' ? ' active' : ''}" data-editor-type="fixed">固定规则</button>
        <button type="button" class="type-tab${draft.sourceType === 'special' ? ' active' : ''}" data-editor-type="special">特殊规则</button>
      </div>

      <div class="editor-grid">
        <div class="editor-pane">
          ${draft.sourceType === 'path'
            ? renderCandidateSearchArea(draft)
            : draft.sourceType === 'quote'
              ? renderQuoteTargetEditor(draft)
              : renderRuleChoices(draft.sourceType, draft.selectedRuleId)}
        </div>
        <div class="editor-pane">
          <div class="editor-pane-title">${draft.sourceType === 'path' ? '已选路径' : '已选目标'}</div>
          ${renderSelectedLegs(draft)}
          <div class="summary-box">${window.PathAlertPageUtils.renderPathAlertRouteLinesHtml(targetSummaryLines, 'summary-line')}</div>
        </div>
        <div class="editor-pane editor-settings-pane">
          <div class="editor-pane-title">报警条件</div>
          ${draft.sourceType === 'quote' || draft.sourceType === 'special' ? '' : `
            <div class="form-group">
              <label for="editor-threshold">收益阈值 (bp)</label>
              <input id="editor-threshold" type="number" step="0.1" value="${draft.thresholdBp === '' ? '' : escapeHtml(String(draft.thresholdBp))}">
            </div>
          `}
          ${draft.sourceType !== 'special' ? '' : `
            <div class="form-group">
              <label for="editor-special-min-profit">净收益阈值</label>
              <input id="editor-special-min-profit" type="number" min="0" step="0.0001" value="${escapeHtml(String(resolveSpecialRuleAlertConfig(draft.specialRuleConfig).minNetProfit ?? 0))}">
            </div>
            <div class="form-group">
              <label for="editor-special-min-profit-bp">净收益率阈值 (bp)</label>
              <input id="editor-special-min-profit-bp" type="number" min="0" step="0.1" value="${escapeHtml(String(resolveSpecialRuleAlertConfig(draft.specialRuleConfig).minNetProfitBp ?? 0))}">
            </div>
          `}
          <div class="form-group">
            <label for="editor-trigger">触发方式</label>
            <select id="editor-trigger">
              <option value="immediate" ${draft.triggerMode === 'immediate' ? 'selected' : ''}>立即提醒</option>
              <option value="delayed" ${draft.triggerMode === 'delayed' ? 'selected' : ''}>延迟确认</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editor-confirm-delay">延迟确认 (秒)</label>
            <input id="editor-confirm-delay" type="number" min="0" value="${escapeHtml(String(draft.confirmDelaySec || 0))}" ${draft.triggerMode === 'delayed' ? '' : 'disabled'}>
          </div>
          <div class="form-group">
            <label for="editor-cooldown">冷却时间 (秒)</label>
            <input id="editor-cooldown" type="number" min="1" value="${escapeHtml(String(draft.cooldownSec || alertConfig.settings?.defaultCooldownSec || 180))}">
          </div>
          <label class="editor-checkbox-row" for="editor-enabled">
            <input id="editor-enabled" type="checkbox" ${draft.enabled !== false ? 'checked' : ''}>
            <span>启用这条报警</span>
          </label>
        </div>
      </div>

      <div class="editor-actions">
        <div class="inline-hint">保存后，主看板会自动同步。</div>
        <div class="editor-actions-right">
          <button type="button" id="editor-cancel-btn">取消</button>
          <button type="button" class="primary" id="editor-save-btn" ${saveDisabledAttr}>保存</button>
        </div>
      </div>
    `;
    syncEditorConfirmDelayState();
    renderCandidateSuggestions();
  }

  async function handleSave() {
    const error = validateDraft(pageState.draft);
    if (error) {
      pageState.errorMessage = error;
      renderEditor();
      return;
    }

    const nextAlert = buildAlertFromDraft();
    const nextAlerts = Array.isArray(alertConfig.alerts) ? [...alertConfig.alerts] : [];
    const existingIndex = nextAlerts.findIndex((item) => item.id === nextAlert.id);
    if (existingIndex >= 0) nextAlerts.splice(existingIndex, 1, nextAlert);
    else nextAlerts.push(nextAlert);
    alertConfig.alerts = nextAlerts;

    try {
      await persistAlertConfig();
      renderList();
      openEditorWithDraft(buildDraftFromAlert(nextAlert), 'edit');
    } catch (saveError) {
      pageState.errorMessage = saveError.message || '保存失败';
      renderEditor();
    }
  }

  function syncEditorConfirmDelayState() {
    const triggerInput = document.getElementById('editor-trigger');
    const confirmDelayInput = document.getElementById('editor-confirm-delay');
    if (!triggerInput || !confirmDelayInput) return;
    confirmDelayInput.disabled = triggerInput.value !== 'delayed';
  }

  function clearEditorError() {
    pageState.errorMessage = '';
    const errorEl = document.getElementById('editor-error-slot');
    if (!errorEl) return;
    errorEl.textContent = '';
    errorEl.className = 'status-message';
  }

  function rerenderEditorPreservingFocus(target) {
    const focusId = target && target.id ? target.id : '';
    const selectionStart = typeof target?.selectionStart === 'number' ? target.selectionStart : null;
    const selectionEnd = typeof target?.selectionEnd === 'number' ? target.selectionEnd : null;
    renderEditor();
    if (!focusId) return;
    const nextTarget = document.getElementById(focusId);
    if (!nextTarget) return;
    nextTarget.focus();
    if (typeof selectionStart === 'number' && typeof selectionEnd === 'number' && typeof nextTarget.setSelectionRange === 'function') {
      nextTarget.setSelectionRange(selectionStart, selectionEnd);
    }
  }

  function addCandidateToDraft(candidate) {
    if (!pageState.draft || pageState.draft.sourceType !== 'path' || !candidate) return false;
    const exists = (pageState.draft.legs || []).some((leg) => (
      Number(leg.quoteId) === Number(candidate.quoteId)
      && leg.direction === candidate.direction
      && leg.pricingMode === candidate.pricingMode
    ));
    if (exists) return false;
    pageState.draft.legs.push({
      quoteId: candidate.quoteId,
      direction: candidate.direction,
      pricingMode: candidate.pricingMode,
      chain: candidate.chain,
      fromSymbol: candidate.fromSymbol,
      toSymbol: candidate.toSymbol
    });
    pageState.draft.searchQuery = '';
    pageState.filteredCandidates = [];
    pageState.activeCandidateIndex = -1;
    return true;
  }

  function commitCandidateSelection() {
    const candidate = getSelectedCandidate();
    if (!candidate) {
      pageState.errorMessage = '没有匹配的报价腿，请换个关键词。';
      rerenderEditorPreservingFocus(document.getElementById('path-alert-search-input'));
      return;
    }
    pageState.errorMessage = '';
    addCandidateToDraft(candidate);
    renderEditor();
    const searchInput = document.getElementById('path-alert-search-input');
    if (searchInput) {
      searchInput.focus();
    }
  }

  function applyInitialRoute() {
    const parsed = window.PathAlertPageUtils
      ? window.PathAlertPageUtils.parsePathAlertsPagePrefill(location.href)
      : { mode: 'manage', alertId: '', filterQuoteId: '', draft: null };
    pageState.filterQuoteId = String(parsed.filterQuoteId || '').trim();
    if (parsed.mode === 'edit') {
      const alert = (alertConfig.alerts || []).find((item) => item.id === parsed.alertId);
      if (!alert) {
        setStatus(`未找到报警：${parsed.alertId || '--'}`, 'error');
        openEditorWithDraft(pageState.filterQuoteId ? createQuoteScopedDraft() : createEmptyDraft(), 'create');
        return;
      }
      openEditorWithDraft(buildDraftFromAlert(alert), 'edit');
      return;
    }
    if (parsed.mode === 'create') {
      if (location.search.includes('draft=') && !parsed.draft) {
        setStatus('导入草稿无效，请重新从机会列表发起。', 'error');
      }
      const prefilledDraft = buildDraftFromPrefill(parsed.draft);
      if (pageState.filterQuoteId && prefilledDraft.sourceType !== 'quote') {
        prefilledDraft.sourceType = 'quote';
        prefilledDraft.selectedQuoteId = pageState.filterQuoteId;
      }
      openEditorWithDraft(prefilledDraft, 'create');
      return;
    }
    if (pageState.filterQuoteId && !getFilteredAlerts().length) {
      openEditorWithDraft(createQuoteScopedDraft(), 'create');
      return;
    }
    closeEditor();
  }

  function removeAlertIds(ids) {
    const targetIds = new Set((ids || []).map((id) => String(id || '')));
    if (!targetIds.size) return;
    alertConfig.alerts = (alertConfig.alerts || []).filter((item) => !targetIds.has(String(item.id || '')));
    pageState.selectedAlertIds = new Set(
      Array.from(pageState.selectedAlertIds).filter((id) => !targetIds.has(id))
    );
    if (pageState.draft && pageState.draft.id && targetIds.has(pageState.draft.id)) {
      closeEditor();
    }
  }

  function dismissAlertIds(ids) {
    const alerts = Array.isArray(alertConfig.alerts) ? alertConfig.alerts : [];
    const dismissedTargets = Array.isArray(alertConfig.dismissedTargets) ? [...alertConfig.dismissedTargets] : [];
    const targetIds = new Set((ids || []).map((id) => String(id || '')));
    if (!targetIds.size) return;
    if (!window.PathAlertUtils || typeof window.PathAlertUtils.findDismissedPathAlert !== 'function') {
      removeAlertIds(Array.from(targetIds));
      return;
    }

    for (const alert of alerts) {
      if (!targetIds.has(String(alert.id || ''))) continue;
      const dismissedEntry = createDismissedEntryFromAlert(alert);
      if (!dismissedEntry) continue;
      if (!window.PathAlertUtils.findDismissedPathAlert(dismissedTargets, dismissedEntry)) {
        dismissedTargets.push(dismissedEntry);
      }
    }

    alertConfig.dismissedTargets = dismissedTargets;
    removeAlertIds(Array.from(targetIds));
  }

  function restoreDismissedKeys(keys) {
    const targetKeys = new Set((keys || []).map((key) => String(key || '')));
    if (!targetKeys.size) return;
    alertConfig.dismissedTargets = (alertConfig.dismissedTargets || []).filter((entry) => {
      return !targetKeys.has(buildAlertIdentityKey(entry.target));
    });
    pageState.selectedDismissedKeys = new Set(
      Array.from(pageState.selectedDismissedKeys).filter((key) => !targetKeys.has(key))
    );
  }

  function removeDismissedKeys(keys) {
    restoreDismissedKeys(keys);
  }

  async function handleListClick(event) {
    const selectInput = event.target.closest('[data-alert-select]');
    if (selectInput) {
      const id = String(selectInput.dataset.alertSelect || '');
      if (!id) return;
      if (selectInput.checked) pageState.selectedAlertIds.add(id);
      else pageState.selectedAlertIds.delete(id);
      syncSelectionCounters();
      return;
    }

    const editBtn = event.target.closest('[data-alert-edit]');
    if (editBtn) {
      const alert = (alertConfig.alerts || []).find((item) => item.id === editBtn.dataset.alertEdit);
      if (!alert) return;
      openEditorWithDraft(buildDraftFromAlert(alert), 'edit');
      return;
    }

    const toggleBtn = event.target.closest('[data-alert-toggle]');
    if (toggleBtn) {
      const alert = (alertConfig.alerts || []).find((item) => item.id === toggleBtn.dataset.alertToggle);
      if (!alert) return;
      alert.enabled = alert.enabled === false;
      await persistAlertConfig();
      renderList();
      renderDismissedList();
      return;
    }

    const deleteBtn = event.target.closest('[data-alert-delete]');
    if (deleteBtn) {
      removeAlertIds([deleteBtn.dataset.alertDelete]);
      await persistAlertConfig();
      renderList();
      renderDismissedList();
      return;
    }

    const dismissDeleteBtn = event.target.closest('[data-alert-dismiss-delete]');
    if (dismissDeleteBtn) {
      dismissAlertIds([dismissDeleteBtn.dataset.alertDismissDelete]);
      await persistAlertConfig();
      renderList();
      renderDismissedList();
      return;
    }

    const openCard = event.target.closest('[data-alert-open]');
    if (openCard) {
      const alert = (alertConfig.alerts || []).find((item) => item.id === openCard.dataset.alertOpen);
      if (!alert) return;
      openEditorWithDraft(buildDraftFromAlert(alert), 'edit');
    }
  }

  async function handleDismissedListClick(event) {
    const restoreBtn = event.target.closest('[data-dismissed-restore]');
    if (restoreBtn) {
      restoreDismissedKeys([restoreBtn.dataset.dismissedRestore]);
      await persistAlertConfig();
      renderList();
      renderDismissedList();
      return;
    }

    const deleteBtn = event.target.closest('[data-dismissed-delete]');
    if (deleteBtn) {
      removeDismissedKeys([deleteBtn.dataset.dismissedDelete]);
      await persistAlertConfig();
      renderList();
      renderDismissedList();
      return;
    }

    const selectInput = event.target.closest('[data-dismissed-select]');
    if (selectInput) {
      const key = String(selectInput.dataset.dismissedSelect || '');
      if (!key) return;
      if (selectInput.checked) pageState.selectedDismissedKeys.add(key);
      else pageState.selectedDismissedKeys.delete(key);
      syncSelectionCounters();
    }
  }

  async function handleDeleteSelectedAlerts() {
    if (!pageState.selectedAlertIds.size) return;
    removeAlertIds(Array.from(pageState.selectedAlertIds));
    await persistAlertConfig();
    renderList();
    renderDismissedList();
  }

  async function handleDeleteSelectedDismissed() {
    if (!pageState.selectedDismissedKeys.size) return;
    removeDismissedKeys(Array.from(pageState.selectedDismissedKeys));
    await persistAlertConfig();
    renderList();
    renderDismissedList();
  }

  async function handleDismissSelectedAlerts() {
    if (!pageState.selectedAlertIds.size) return;
    dismissAlertIds(Array.from(pageState.selectedAlertIds));
    await persistAlertConfig();
    renderList();
    renderDismissedList();
  }

  function updateDraftField(event) {
    if (!pageState.draft) return;
    const target = event.target;
    if (!pageState.draft.specialRuleConfig || typeof pageState.draft.specialRuleConfig !== 'object') {
      pageState.draft.specialRuleConfig = null;
    }
    if (target.id === 'editor-name') pageState.draft.name = target.value || '';
    if (target.id === 'path-alert-search-input') pageState.draft.searchQuery = target.value || '';
    if (target.id === 'editor-threshold') pageState.draft.thresholdBp = target.value === '' ? '' : Number(target.value);
    if (target.id === 'editor-trigger') pageState.draft.triggerMode = target.value === 'delayed' ? 'delayed' : 'immediate';
    if (target.id === 'editor-confirm-delay') pageState.draft.confirmDelaySec = Number(target.value || 0);
    if (target.id === 'editor-cooldown') pageState.draft.cooldownSec = Number(target.value || alertConfig.settings?.defaultCooldownSec || 180);
    if (target.id === 'editor-enabled') pageState.draft.enabled = target.checked;
    if (target.id === 'editor-special-min-profit') {
      pageState.draft.specialRuleConfig = {
        ...resolveSpecialRuleAlertConfig(pageState.draft.specialRuleConfig),
        minNetProfit: Number(target.value || 0)
      };
    }
    if (target.id === 'editor-special-min-profit-bp') {
      pageState.draft.specialRuleConfig = {
        ...resolveSpecialRuleAlertConfig(pageState.draft.specialRuleConfig),
        minNetProfitBp: Number(target.value || 0)
      };
    }
    if (target.id === 'editor-quote-id') pageState.draft.selectedQuoteId = target.value || '';
    if (target.id === 'editor-quote-direction') pageState.draft.quoteDirection = target.value === 'inverse' ? 'inverse' : 'forward';
    if (target.id === 'editor-quote-rule-kind') pageState.draft.quoteRuleKind = target.value || 'targetAbove';
    if (target.id === 'editor-quote-value') pageState.draft.quoteValue = target.value === '' ? '' : Number(target.value);
    if (target.id === 'editor-quote-base-price') pageState.draft.quoteBasePrice = target.value === '' ? '' : Number(target.value);
    if (pageState.errorMessage) clearEditorError();
    if (target.id === 'path-alert-search-input') {
      pageState.activeCandidateIndex = -1;
      renderCandidateSuggestions();
      return;
    }
    if (target.id === 'editor-trigger') {
      syncEditorConfirmDelayState();
    }
    if (target.id === 'editor-quote-id' || target.id === 'editor-quote-direction' || target.id === 'editor-quote-rule-kind') {
      rerenderEditorPreservingFocus(target);
    }
  }

  function updateEditorType(sourceType) {
    if (!pageState.draft) return;
    pageState.draft.sourceType = sourceType;
    pageState.draft.selectedRuleId = '';
    pageState.draft.specialRuleConfig = null;
    pageState.draft.selectedQuoteId = pageState.filterQuoteId || '';
    pageState.draft.quoteDirection = 'forward';
    pageState.draft.quoteRuleKind = 'targetAbove';
    pageState.draft.quoteValue = '';
    pageState.draft.quoteBasePrice = '';
    pageState.draft.searchQuery = '';
    pageState.filteredCandidates = [];
    pageState.activeCandidateIndex = -1;
    if (sourceType !== 'path') {
      pageState.draft.legs = [];
    }
    pageState.errorMessage = '';
    renderEditor();
  }

  function moveLeg(index, direction) {
    if (!pageState.draft || pageState.draft.sourceType !== 'path') return;
    const legs = pageState.draft.legs;
    const current = Number(index);
    const delta = direction === 'up' ? -1 : 1;
    const target = current + delta;
    if (current < 0 || current >= legs.length || target < 0 || target >= legs.length) return;
    const [leg] = legs.splice(current, 1);
    legs.splice(target, 0, leg);
    renderEditor();
  }

  function handleEditorKeydown(event) {
    const target = event.target;
    if (!target || target.id !== 'path-alert-search-input') return;

    if (!pageState.filteredCandidates.length && event.key !== 'Escape') return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      pageState.activeCandidateIndex = Math.min(pageState.filteredCandidates.length - 1, pageState.activeCandidateIndex + 1);
      renderCandidateSuggestions();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      pageState.activeCandidateIndex = Math.max(0, pageState.activeCandidateIndex - 1);
      renderCandidateSuggestions();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      commitCandidateSelection();
      return;
    }

    if (event.key === 'Escape') {
      hideCandidateSuggestions();
    }
  }

  function handleEditorClick(event) {
    if (!pageState.draft) return;

    const typeBtn = event.target.closest('[data-editor-type]');
    if (typeBtn) {
      updateEditorType(typeBtn.dataset.editorType);
      return;
    }

    if (event.target.closest('#path-alert-add-leg-btn')) {
      commitCandidateSelection();
      return;
    }

    const addBtn = event.target.closest('[data-path-alert-candidate-key]');
    if (addBtn) {
      const candidate = pageState.filteredCandidates.find((item) => item.key === addBtn.dataset.pathAlertCandidateKey);
      if (!candidate) return;
      pageState.errorMessage = '';
      addCandidateToDraft(candidate);
      renderEditor();
      return;
    }

    const removeBtn = event.target.closest('[data-editor-remove-leg]');
    if (removeBtn) {
      const index = Number(removeBtn.dataset.editorRemoveLeg);
      if (!Number.isFinite(index)) return;
      pageState.draft.legs.splice(index, 1);
      renderEditor();
      return;
    }

    const moveBtn = event.target.closest('[data-editor-move-leg]');
    if (moveBtn) {
      moveLeg(moveBtn.dataset.editorLegIndex, moveBtn.dataset.editorMoveLeg);
      return;
    }

    const ruleBtn = event.target.closest('[data-editor-rule-id]');
    if (ruleBtn) {
      pageState.draft.selectedRuleId = ruleBtn.dataset.editorRuleId || '';
      pageState.draft.specialRuleConfig = pageState.draft.sourceType === 'special'
        ? { minNetProfit: 0, minNetProfitBp: 0 }
        : null;
      renderEditor();
      return;
    }

    if (event.target.closest('#editor-save-btn')) {
      handleSave();
      return;
    }

    if (event.target.closest('#editor-cancel-btn')) {
      closeEditor();
    }
  }

  function handleContextBarClick(event) {
    const createBtn = event.target.closest('[data-context-create]');
    if (!createBtn || !pageState.filterQuoteId) return;
    openEditorWithDraft(createQuoteScopedDraft(createBtn.dataset.contextCreate), 'create');
  }

  async function init() {
    try {
      await Promise.all([loadDashboardConfig(), loadAlertConfig()]);
      try {
        await loadQuoteCandidates();
      } catch (candidateError) {
        console.warn('加载路径报警候选失败，回退到本地配置展示:', candidateError);
      }
      applyInitialRoute();
      renderList();
      renderDismissedList();
      renderEditor();
      setStatus('');
    } catch (error) {
      setStatus(error.message || '初始化失败', 'error');
      renderList();
      renderDismissedList();
      renderEditor();
    }

    createBtn.addEventListener('click', () => {
      openEditorWithDraft(pageState.filterQuoteId ? createQuoteScopedDraft() : createEmptyDraft(), 'create');
    });
    closeEditorBtn.addEventListener('click', closeEditor);
    listEl.addEventListener('click', (event) => {
      handleListClick(event).catch((error) => setStatus(error.message || '操作失败', 'error'));
    });
    if (dismissedListEl) {
      dismissedListEl.addEventListener('click', (event) => {
        handleDismissedListClick(event).catch((error) => setStatus(error.message || '操作失败', 'error'));
      });
    }
    if (dismissSelectedBtn) {
      dismissSelectedBtn.addEventListener('click', () => {
        handleDismissSelectedAlerts().catch((error) => setStatus(error.message || '批量标记失败', 'error'));
      });
    }
    if (deleteSelectedBtn) {
      deleteSelectedBtn.addEventListener('click', () => {
        handleDeleteSelectedAlerts().catch((error) => setStatus(error.message || '批量删除失败', 'error'));
      });
    }
    if (deleteDismissedSelectedBtn) {
      deleteDismissedSelectedBtn.addEventListener('click', () => {
        handleDeleteSelectedDismissed().catch((error) => setStatus(error.message || '批量删除失败', 'error'));
      });
    }
    editorEl.addEventListener('click', handleEditorClick);
    editorEl.addEventListener('keydown', handleEditorKeydown);
    editorEl.addEventListener('input', updateDraftField);
    editorEl.addEventListener('change', updateDraftField);
    if (editorModalEl) {
      editorModalEl.addEventListener('click', (event) => {
        if (event.target === editorModalEl) {
          closeEditor();
        }
      });
    }
    if (contextBarEl) {
      contextBarEl.addEventListener('click', handleContextBarClick);
    }
    editorEl.addEventListener('focusin', (event) => {
      if (event.target && event.target.id === 'path-alert-search-input') {
        renderCandidateSuggestions();
      }
    });
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (target && typeof target.closest === 'function' && target.closest('.path-alert-search-shell')) return;
      hideCandidateSuggestions();
    });
  }

  window.PathAlertsAppTestHooks = {
    buildFallbackQuoteCandidatesFromDashboard,
    buildAlertSummaryLines,
    buildAlertRouteHtml,
    getAlertPrimaryTitle(alert) {
      return window.PathAlertPageUtils.buildPathAlertCardTitle(alert, {
        getDisplayTitle: getAlertDisplayTitle,
        buildQuoteLabel: buildQuoteAlertQuoteLabel
      });
    },
    formatAlertMetaLine(alert) {
      return window.PathAlertPageUtils.buildPathAlertCardMetaText(alert, {
        resolveSpecialRuleConfig: resolveSpecialRuleAlertConfig
      });
    },
    groupAlertsBySection: window.PathAlertPageUtils.groupAlertsBySection,
    buildDefaultAlertName,
    buildDefaultQuoteAlertNameForTarget(target, quote, candidates) {
      const pairText = buildQuoteAlertPairTextWithResolvedSymbols(target, quote, candidates);
      const suffix = target && target.ruleKind === 'targetAbove'
        ? '汇率高于'
        : target && target.ruleKind === 'targetBelow'
          ? '汇率低于'
          : target && target.ruleKind === 'percentUp'
            ? '上涨提醒'
            : target && target.ruleKind === 'percentDown'
              ? '下跌提醒'
              : '报警';
      return `${pairText} ${suffix}`.trim();
    }
  };

  if (!window.__PATH_ALERTS_APP_DISABLE_AUTO_INIT__) {
    init();
  }
}());
