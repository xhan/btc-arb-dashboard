(function () {
  const BACKEND_URL = `${location.protocol}//${location.hostname}:3000`;
  const CHAIN_DISPLAY_NAMES = {
    ethereum: 'ETH',
    arbitrum: 'Arbitrum',
    optimism: 'Optimism',
    bsc: 'BSC',
    polygon: 'Polygon',
    avalanche: 'Avalanche',
    base: 'Base',
    linea: 'Linea',
    mantle: 'Mantle',
    sonic: 'Sonic',
    berachain: 'Berachain',
    ronin: 'Ronin',
    unichain: 'Unichain',
    hyperevm: 'HyperEVM',
    plasma: 'Plasma',
    scroll: 'Scroll',
    blast: 'Blast',
    mode: 'Mode',
    monad: 'Monad',
    etherlink: 'Etherlink',
    fantom: 'Fantom',
    cronos: 'Cronos',
    moonbeam: 'Moonbeam',
    boba: 'Boba',
    gnosis: 'Gnosis',
    celo: 'Celo',
    hemi: 'Hemi',
    katana: 'Katana',
    solana: 'SOL',
    sui: 'SUI',
    starknet: 'Starknet',
    Bybit: 'Bybit',
    bybit: 'Bybit',
    Binance: 'Binance',
    binance: 'Binance'
  };

  const statusEl = document.getElementById('path-alerts-status');
  const listEl = document.getElementById('path-alerts-list');
  const dismissedListEl = document.getElementById('path-alerts-dismissed-list');
  const editorEl = document.getElementById('path-alerts-editor');
  const editorTitleEl = document.getElementById('path-alerts-editor-title');
  const createBtn = document.getElementById('path-alerts-create-btn');
  const closeEditorBtn = document.getElementById('path-alerts-close-editor-btn');
  const alertSearchInput = document.getElementById('path-alerts-search-input');
  const dismissedSearchInput = document.getElementById('path-alerts-dismissed-search-input');
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
    filteredCandidates: [],
    activeCandidateIndex: -1,
    alertFilterQuery: '',
    dismissedFilterQuery: '',
    selectedAlertIds: new Set(),
    selectedDismissedKeys: new Set()
  };

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatChainLabel(chain) {
    return CHAIN_DISPLAY_NAMES[chain] || chain || '';
  }

  function isCexOrderbookChain(chain) {
    const normalized = String(chain || '').trim().toLowerCase();
    return normalized === 'bybit' || normalized === 'binance';
  }

  function parseCexTradingPairSymbol(symbol) {
    if (window.QuoteCalculator && typeof window.QuoteCalculator.splitCompactTradingPairSymbol === 'function') {
      const parsed = window.QuoteCalculator.splitCompactTradingPairSymbol(symbol);
      if (parsed && parsed.fromSymbol && parsed.toSymbol) {
        return parsed;
      }
    }

    const [fromSymbol, toSymbol] = String(symbol || '').split('/').map((item) => item.trim());
    if (!fromSymbol || !toSymbol) return null;
    return { fromSymbol, toSymbol };
  }

  function shortToken(value) {
    const text = String(value || '').trim();
    if (!text) return '--';
    if (text.length <= 18) return text;
    return `${text.slice(0, 8)}...${text.slice(-6)}`;
  }

  function buildQuoteLabel(chain, fromSymbol, toSymbol, suffix = '') {
    return `(${formatChainLabel(chain)}) ${fromSymbol || '--'} -> ${toSymbol || '--'}${suffix}`;
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

  function createEmptyDraft() {
    return {
      id: '',
      name: '',
      enabled: true,
      thresholdBp: getDefaultThresholdBp(),
      triggerMode: 'delayed',
      confirmDelaySec: 13,
      cooldownSec: alertConfig.settings?.defaultCooldownSec || 180,
      sourceType: 'path',
      selectedRuleId: '',
      searchQuery: '',
      legs: []
    };
  }

  function cloneDraft(draft) {
    return {
      id: String(draft.id || ''),
      name: String(draft.name || ''),
      enabled: draft.enabled !== false,
      thresholdBp: draft.thresholdBp === '' ? '' : Number(draft.thresholdBp),
      triggerMode: draft.triggerMode === 'delayed' ? 'delayed' : 'immediate',
      confirmDelaySec: Number(draft.confirmDelaySec || 0),
      cooldownSec: Number(draft.cooldownSec || alertConfig.settings?.defaultCooldownSec || 180),
      sourceType: draft.sourceType === 'fixed' || draft.sourceType === 'special' ? draft.sourceType : 'path',
      selectedRuleId: String(draft.selectedRuleId || ''),
      searchQuery: String(draft.searchQuery || ''),
      legs: Array.isArray(draft.legs) ? draft.legs.map((leg) => ({ ...leg })) : []
    };
  }

  function buildDraftFromAlert(alert) {
    const normalized = window.PathAlertUtils
      ? window.PathAlertUtils.normalizePathAlert(alert, alertConfig.settings || { defaultCooldownSec: 180 })
      : null;
    if (!normalized) return createEmptyDraft();
    if (normalized.target.type === 'rule') {
      return {
        id: normalized.id,
        name: normalized.name,
        enabled: normalized.enabled !== false,
        thresholdBp: normalized.thresholdBp,
        triggerMode: normalized.triggerMode,
        confirmDelaySec: normalized.confirmDelaySec,
        cooldownSec: normalized.cooldownSec,
        sourceType: normalized.target.ruleKind,
        selectedRuleId: normalized.target.ruleId,
        searchQuery: '',
        legs: []
      };
    }
    return {
      id: normalized.id,
      name: normalized.name,
      enabled: normalized.enabled !== false,
      thresholdBp: normalized.thresholdBp,
      triggerMode: normalized.triggerMode,
      confirmDelaySec: normalized.confirmDelaySec,
      cooldownSec: normalized.cooldownSec,
      sourceType: 'path',
      selectedRuleId: '',
      searchQuery: '',
      legs: normalized.target.legs.map((leg) => ({ ...leg }))
    };
  }

  function buildDraftFromPrefill(prefill) {
    const draft = createEmptyDraft();
    if (!prefill) return draft;
    draft.name = String(prefill.name || '');
    if (prefill.target && prefill.target.type === 'rule') {
      draft.sourceType = prefill.target.ruleKind;
      draft.selectedRuleId = prefill.target.ruleId;
      return draft;
    }
    if (prefill.target && prefill.target.type === 'path') {
      draft.legs = (prefill.target.legs || []).map((leg) => ({ ...leg }));
    }
    return draft;
  }

  function buildAlertSummary(alert) {
    return buildAlertSummaryLines(alert).join(' | ') || '--';
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

  function buildAlertSummaryLines(alert) {
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

  function buildDismissedSummary(entry) {
    return buildDismissedSummaryLines(entry).join(' | ') || '--';
  }

  function findDismissedEntryForDraft(draft) {
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

  function getFilteredAlerts() {
    const alerts = Array.isArray(alertConfig.alerts) ? alertConfig.alerts : [];
    const query = pageState.alertFilterQuery;
    return alerts.filter((alert) => {
      const summary = buildAlertSummary(alert);
      const name = getAlertDisplayTitle(alert);
      return matchesSearch(`${name} ${summary}`, query);
    });
  }

  function getFilteredDismissedTargets() {
    const items = Array.isArray(alertConfig.dismissedTargets) ? alertConfig.dismissedTargets : [];
    const query = pageState.dismissedFilterQuery;
    return items.filter((entry) => matchesSearch(buildDismissedSummary(entry), query));
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

  function removeSelectedAlertIdsFromConfig(alertIds) {
    const idSet = new Set(Array.isArray(alertIds) ? alertIds : []);
    alertConfig.alerts = (alertConfig.alerts || []).filter((alert) => !idSet.has(alert.id));
  }

  function removeDismissedKeysFromConfig(keys) {
    const keySet = new Set(Array.isArray(keys) ? keys : []);
    alertConfig.dismissedTargets = (alertConfig.dismissedTargets || []).filter((entry) => !keySet.has(buildDismissedIdentityKey(entry)));
  }

  function markAlertDismissed(alert) {
    if (!alert || !window.PathAlertUtils || typeof window.PathAlertUtils.createDismissedTargetEntry !== 'function') {
      return false;
    }
    const entry = window.PathAlertUtils.createDismissedTargetEntry(alert, buildAlertSummaryLines(alert), Date.now());
    if (!entry) return false;
    const dismissed = Array.isArray(alertConfig.dismissedTargets) ? [...alertConfig.dismissedTargets] : [];
    if (window.PathAlertUtils.findDismissedPathAlert(dismissed, entry)) {
      return false;
    }
    dismissed.push(entry);
    alertConfig.dismissedTargets = dismissed;
    return true;
  }

  async function persistAndRefreshList(successMessage = '已保存，请回主看板点击重新加载。') {
    await persistAlertConfig();
    if (successMessage) {
      setStatus(successMessage, 'success');
    }
    renderList();
    renderDismissedList();
    renderEditor();
  }

  function matchesSearch(text, query) {
    const tokens = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    const haystack = String(text || '').toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  }

  function renderSummaryLinesHtml(lines, className) {
    const safeLines = Array.isArray(lines) ? lines.filter(Boolean) : [];
    if (!safeLines.length) {
      return `<div class="${className}">--</div>`;
    }
    return safeLines.map((line) => `<div class="${className}">${escapeHtml(line)}</div>`).join('');
  }

  function buildQuoteCandidates() {
    return buildFallbackQuoteCandidatesFromDashboard(dashboardState);
  }

  function buildFallbackQuoteCandidatesFromDashboard(dashboard) {
    const records = [];
    for (const category of (dashboard || [])) {
      for (const quote of (category.quotes || [])) {
        if (isCexOrderbookChain(quote.chain)) {
          const parsed = parseCexTradingPairSymbol(quote.symbol);
          if (!parsed) continue;
          records.push({
            categoryName: category.name,
            quote,
            fromSymbol: parsed.fromSymbol,
            toSymbol: parsed.toSymbol,
            searchText: `${category.name} ${quote.chain} ${quote.symbol} ${parsed.fromSymbol} ${parsed.toSymbol}`
          });
          continue;
        }

        const forwardFrom = shortToken(quote.fromToken);
        const forwardTo = shortToken(quote.toToken);
        records.push({
          categoryName: category.name,
          quote,
          fromSymbol: forwardFrom,
          toSymbol: forwardTo,
          searchText: `${category.name} ${quote.chain} ${quote.fromToken || ''} ${quote.toToken || ''} ${forwardFrom} ${forwardTo}`
        });
      }
    }
    return window.PathAlertCandidateUtils
      ? window.PathAlertCandidateUtils.buildPathAlertCandidates(records, {
        buildLabel: (chain, fromSymbol, toSymbol, suffix = '') => buildQuoteLabel(chain, fromSymbol, toSymbol, suffix)
      })
      : [];
  }

  function matchesCandidate(candidate, query) {
    const tokens = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    const haystack = String(candidate.searchText || candidate.label || '').toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  }

  function getFilteredCandidates(query) {
    return quoteCandidates
      .filter((candidate) => matchesCandidate(candidate, query))
      .slice(0, 12);
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
    if (!response.ok) throw new Error('获取路径报警配置失败');
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
      throw new Error((data && data.error) || '保存路径报警配置失败');
    }
    alertConfig = payload;
    setStatus('已保存，请回主看板点击重新加载。', 'success');
  }

  function updateHistory(mode, options = {}) {
    if (!window.PathAlertPageUtils) return;
    const href = window.PathAlertPageUtils.buildPathAlertsPageHref({
      mode,
      alertId: options.alertId || '',
      draft: options.draft || null
    });
    history.replaceState(null, '', href);
  }

  function openEditorWithDraft(draft, mode = 'create') {
    pageState.editorVisible = true;
    pageState.errorMessage = '';
    pageState.saveMessage = '';
    pageState.draft = cloneDraft(draft);
    editorTitleEl.textContent = pageState.draft.id ? '编辑路径报警' : '新建路径报警';
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
      alertId
    });
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
    const thresholdBp = draft.thresholdBp === '' ? 0 : Number(draft.thresholdBp);
    if (!Number.isFinite(thresholdBp)) {
      return '收益阈值必须是合法数字';
    }
    const confirmDelaySec = Number(draft.confirmDelaySec);
    if (!Number.isFinite(confirmDelaySec) || confirmDelaySec < 0) {
      return '延迟确认必须是大于等于 0 的数字';
    }
    const cooldownSec = Number(draft.cooldownSec);
    if (!Number.isFinite(cooldownSec) || cooldownSec <= 0) {
      return '冷却时间必须大于 0';
    }

    if (draft.sourceType === 'fixed' || draft.sourceType === 'special') {
      if (!findRule(draft.sourceType, draft.selectedRuleId)) {
        return '请选择有效的规则';
      }
      const dismissedTarget = findDismissedTargetForDraft(draft);
      if (dismissedTarget) {
        return '该路径已被标记为不需要，请先在“不需要路径”列表取消标记。';
      }
      const duplicateAlert = findDuplicateAlertForDraft(draft);
      if (duplicateAlert) {
        return `该路径报警已存在：${duplicateAlert.name || duplicateAlert.id}`;
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
      return '该路径已被标记为不需要，请先在“不需要路径”列表取消标记。';
    }
    const duplicateAlert = findDuplicateAlertForDraft(draft);
    if (duplicateAlert) {
      return `该路径报警已存在：${duplicateAlert.name || duplicateAlert.id}`;
    }
    return '';
  }

  function buildAlertFromDraft() {
    const draft = pageState.draft;
    const thresholdBp = draft.thresholdBp === '' ? 0 : Number(draft.thresholdBp);
    const alert = {
      id: draft.id || buildAlertId(),
      name: draft.name.trim(),
      enabled: draft.enabled !== false,
      thresholdBp,
      triggerMode: draft.triggerMode === 'delayed' ? 'delayed' : 'immediate',
      confirmDelaySec: Number(draft.confirmDelaySec || 0),
      cooldownSec: Number(draft.cooldownSec || alertConfig.settings?.defaultCooldownSec || 180),
      delivery: { sound: true, log: true, webhookEnabled: false },
      target: collectEditorTarget(draft)
    };
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
    const alertIds = new Set((alertConfig.alerts || []).map((alert) => String(alert.id || '')));
    pageState.selectedAlertIds = new Set(
      Array.from(pageState.selectedAlertIds).filter((id) => alertIds.has(id))
    );

    const dismissedKeys = new Set(
      (alertConfig.dismissedTargets || []).map((entry) => buildAlertIdentityKey(entry.target))
    );
    pageState.selectedDismissedKeys = new Set(
      Array.from(pageState.selectedDismissedKeys).filter((key) => dismissedKeys.has(key))
    );
  }

  function buildAlertSearchText(alert) {
    return [
      getAlertDisplayTitle(alert),
      buildAlertSummary(alert),
      alert.target && alert.target.type === 'rule'
        ? (alert.target.ruleKind === 'fixed' ? '固定规则' : '特殊规则')
        : '路径'
    ].join(' ');
  }

  function buildDismissedSearchText(entry) {
    return buildDismissedSummary(entry);
  }

  function renderList() {
    syncSelectionSets();
    const alerts = Array.isArray(alertConfig.alerts) ? alertConfig.alerts : [];
    const filteredAlerts = getFilteredAlerts();
    listEl.innerHTML = filteredAlerts.length
      ? filteredAlerts.map((alert) => {
        const note = getAlertDisplayTitle(alert);
        return `
          <div class="alert-item">
            <div class="alert-item-head">
              <div class="alert-item-head-left">
                <input class="alert-item-select" type="checkbox" data-alert-select="${escapeHtml(alert.id)}" ${pageState.selectedAlertIds.has(alert.id) ? 'checked' : ''}>
                <div class="alert-item-main">
                  ${note ? `<div class="alert-item-muted-title">备注：${escapeHtml(note)}</div>` : ''}
                  <div class="alert-item-route">${renderSummaryLinesHtml(buildAlertSummaryLines(alert), 'alert-item-route-line')}</div>
                  <div class="alert-item-meta">
                    类型 ${alert.target.type === 'rule' ? (alert.target.ruleKind === 'fixed' ? '固定规则' : '特殊规则') : '路径'}
                    | 阈值 ${escapeHtml(String(alert.thresholdBp))}bp
                    | ${alert.triggerMode === 'delayed' ? `延迟 ${escapeHtml(String(alert.confirmDelaySec))}s` : '立即提醒'}
                    | 冷却 ${escapeHtml(String(alert.cooldownSec))}s
                    | ${alert.enabled === false ? '已禁用' : '已启用'}
                  </div>
                </div>
              </div>
              <div class="alert-item-actions">
                <button type="button" data-alert-toggle="${escapeHtml(alert.id)}">${alert.enabled === false ? '启用' : '停用'}</button>
                <button type="button" data-alert-edit="${escapeHtml(alert.id)}">编辑</button>
                <button type="button" data-alert-dismiss-delete="${escapeHtml(alert.id)}">标记并删除</button>
                <button type="button" class="danger" data-alert-delete="${escapeHtml(alert.id)}">删除</button>
              </div>
            </div>
          </div>
        `;
      }).join('')
      : `<div class="empty">${alerts.length ? '没有匹配的路径报警' : '暂无路径报警'}</div>`;

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
        return `
          <div class="alert-item">
            <div class="alert-item-head">
              <div class="alert-item-head-left">
                <input class="alert-item-select" type="checkbox" data-dismissed-select="${escapeHtml(targetKey)}" ${pageState.selectedDismissedKeys.has(targetKey) ? 'checked' : ''}>
                <div class="alert-item-main">
                  <div class="alert-item-route">${renderSummaryLinesHtml(buildDismissedSummaryLines(entry), 'alert-item-route-line')}</div>
                  <div class="alert-item-meta">标记时间 ${entry.dismissedAt ? new Date(entry.dismissedAt).toLocaleString() : '--'}</div>
                </div>
              </div>
              <div class="alert-item-actions">
                <button type="button" data-dismissed-restore="${escapeHtml(targetKey)}">取消标记</button>
                <button type="button" class="danger" data-dismissed-delete="${escapeHtml(targetKey)}">删除</button>
              </div>
            </div>
          </div>
        `;
      }).join('')
      : `<div class="empty">${dismissedTargets.length ? '没有匹配的不需要路径' : '暂无不需要路径'}</div>`;

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

  function renderSelectedLegs(draft) {
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
      editorEl.innerHTML = '<div class="empty">选择一条已有规则进行编辑，或点击“新建路径报警”。</div>';
      return;
    }

    const draft = pageState.draft;
    const duplicateAlert = findDuplicateAlertForDraft(draft);
    const dismissedTarget = findDismissedTargetForDraft(draft);
    const targetSummaryLines = draft.sourceType === 'path'
      ? ((draft.legs || []).map((leg) => buildQuoteLabel(leg.chain, leg.fromSymbol, leg.toSymbol)).filter(Boolean))
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
          <a class="inline-link-btn" href="#dismissed-section">查看不需要路径</a>
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
        <button type="button" class="type-tab${draft.sourceType === 'fixed' ? ' active' : ''}" data-editor-type="fixed">固定规则</button>
        <button type="button" class="type-tab${draft.sourceType === 'special' ? ' active' : ''}" data-editor-type="special">特殊规则</button>
      </div>

      <div class="editor-grid">
        <div class="editor-pane">
          ${draft.sourceType === 'path' ? `
            ${renderCandidateSearchArea(draft)}
          ` : renderRuleChoices(draft.sourceType, draft.selectedRuleId)}
        </div>
        <div class="editor-pane">
          <div class="editor-pane-title">已选路径</div>
          ${renderSelectedLegs(draft)}
          <div class="summary-box">${renderSummaryLinesHtml(targetSummaryLines, 'summary-line')}</div>
        </div>
        <div class="editor-pane editor-settings-pane">
          <div class="editor-pane-title">报警条件</div>
          <div class="form-group">
            <label for="editor-threshold">收益阈值 (bp)</label>
            <input id="editor-threshold" type="number" step="0.1" value="${draft.thresholdBp === '' ? '' : escapeHtml(String(draft.thresholdBp))}">
          </div>
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
            <span>启用这条路径报警</span>
          </label>
        </div>
      </div>

      <div class="editor-actions">
        <div class="inline-hint">保存后，请回主看板点击重新加载。</div>
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
      : { mode: 'manage', alertId: '', draft: null };
    if (parsed.mode === 'edit') {
      const alert = (alertConfig.alerts || []).find((item) => item.id === parsed.alertId);
      if (!alert) {
        setStatus(`未找到路径报警：${parsed.alertId || '--'}`, 'error');
        openEditorWithDraft(createEmptyDraft(), 'create');
        return;
      }
      openEditorWithDraft(buildDraftFromAlert(alert), 'edit');
      return;
    }
    if (parsed.mode === 'create') {
      if (location.search.includes('draft=') && !parsed.draft) {
        setStatus('导入草稿无效，请重新从机会列表发起。', 'error');
      }
      openEditorWithDraft(buildDraftFromPrefill(parsed.draft), 'create');
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

    const selectInput = event.target.closest('[data-alert-select]');
    if (selectInput) {
      const id = String(selectInput.dataset.alertSelect || '');
      if (!id) return;
      if (selectInput.checked) pageState.selectedAlertIds.add(id);
      else pageState.selectedAlertIds.delete(id);
      syncSelectionCounters();
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
    if (target.id === 'editor-name') pageState.draft.name = target.value || '';
    if (target.id === 'path-alert-search-input') pageState.draft.searchQuery = target.value || '';
    if (target.id === 'editor-threshold') pageState.draft.thresholdBp = target.value === '' ? '' : Number(target.value);
    if (target.id === 'editor-trigger') pageState.draft.triggerMode = target.value === 'delayed' ? 'delayed' : 'immediate';
    if (target.id === 'editor-confirm-delay') pageState.draft.confirmDelaySec = Number(target.value || 0);
    if (target.id === 'editor-cooldown') pageState.draft.cooldownSec = Number(target.value || alertConfig.settings?.defaultCooldownSec || 180);
    if (target.id === 'editor-enabled') pageState.draft.enabled = target.checked;
    if (pageState.errorMessage) clearEditorError();
    if (target.id === 'path-alert-search-input') {
      pageState.activeCandidateIndex = -1;
      renderCandidateSuggestions();
      return;
    }
    if (target.id === 'editor-trigger') {
      syncEditorConfirmDelayState();
    }
  }

  function updateEditorType(sourceType) {
    if (!pageState.draft) return;
    pageState.draft.sourceType = sourceType;
    pageState.draft.selectedRuleId = '';
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

  async function init() {
    try {
      await Promise.all([loadDashboardConfig(), loadAlertConfig()]);
      try {
        await loadQuoteCandidates();
      } catch (candidateError) {
        console.warn('加载路径报警候选失败，回退到本地配置展示:', candidateError);
      }
      renderList();
      renderDismissedList();
      applyInitialRoute();
      setStatus('');
    } catch (error) {
      setStatus(error.message || '初始化失败', 'error');
      renderList();
      renderDismissedList();
      renderEditor();
    }

    createBtn.addEventListener('click', () => openEditorWithDraft(createEmptyDraft(), 'create'));
    closeEditorBtn.addEventListener('click', closeEditor);
    listEl.addEventListener('click', (event) => {
      handleListClick(event).catch((error) => setStatus(error.message || '操作失败', 'error'));
    });
    if (dismissedListEl) {
      dismissedListEl.addEventListener('click', (event) => {
        handleDismissedListClick(event).catch((error) => setStatus(error.message || '操作失败', 'error'));
      });
    }
    if (alertSearchInput) {
      alertSearchInput.addEventListener('input', (event) => {
        pageState.alertFilterQuery = event.target.value || '';
        renderList();
      });
    }
    if (dismissedSearchInput) {
      dismissedSearchInput.addEventListener('input', (event) => {
        pageState.dismissedFilterQuery = event.target.value || '';
        renderDismissedList();
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
    buildFallbackQuoteCandidatesFromDashboard
  };

  if (!window.__PATH_ALERTS_APP_DISABLE_AUTO_INIT__) {
    init();
  }
}());
