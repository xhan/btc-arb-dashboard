(function () {
  const BACKEND_URL = `${location.protocol}//${location.hostname}:3000`;
  const PATH_ALERT_CONFIG_SYNC_KEY = 'path-alert-config-sync';
  const PATH_ALERT_CONFIG_SYNC_SOURCE_MANAGE = 'path-alerts-manage';
  const refs = window.PathAlertDomRefs.getPathAlertDomRefs(document);
  const {
    statusEl,
    listEl,
    dismissedListEl,
    editorEl,
    editorTitleEl,
    editorModalEl,
    createBtn,
    closeEditorBtn,
    contextBarEl,
    dismissSelectedBtn,
    deleteSelectedBtn,
    deleteDismissedSelectedBtn,
    selectionCountEl,
    dismissedSelectionCountEl
  } = refs;

  let dashboardState = [];
  let alertConfig = window.PathAlertUtils
    ? window.PathAlertUtils.normalizeAlertConfig()
    : { settings: { defaultCooldownSec: 180 }, alerts: [], dismissedTargets: [] };
  let quoteById = new Map();
  let quoteCandidates = [];
  let pageState = {
    editorVisible: false,
    editorStep: 'target',
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
    return window.PathAlertEditorUtils.createPathAlertEditorDraft(getEditorDraftOptions());
  }

  function cloneDraft(draft) {
    return window.PathAlertEditorUtils.clonePathAlertEditorDraft(draft, getEditorDraftOptions());
  }

  function buildDraftFromAlert(alert) {
    return window.PathAlertEditorUtils.buildPathAlertEditorDraftFromAlert(alert, getEditorDraftOptions());
  }

  function buildDraftFromPrefill(prefill) {
    return window.PathAlertEditorUtils.buildPathAlertEditorDraftFromPrefill(prefill, getEditorDraftOptions());
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

  function getQuoteAlertDisplayOptions() {
    return {
      getQuoteDirection: (target) => window.PathAlertNotificationUtils.getQuoteAlertDirection(target),
      buildQuoteDirectionLabel: (target) => window.PathAlertNotificationUtils.buildQuoteAlertDirectionLabel(target),
      isCexOrderbookChain,
      parseCexTradingPairSymbol,
      formatChainLabel,
      buildQuoteLabel,
      shortenToken: shortToken
    };
  }

  function buildQuoteAlertQuoteLabel(target) {
    const quote = quoteById.get(Number(target && target.quoteId));
    return window.PathAlertPageUtils.buildPathAlertQuoteDisplayLabel(target, quote, getQuoteAlertDisplayOptions());
  }

  function buildQuoteAlertThresholdLine(target) {
    return window.PathAlertNotificationUtils.buildQuoteAlertThresholdLine(target);
  }

  function buildQuoteAlertRuleLine(target) {
    return window.PathAlertNotificationUtils.buildQuoteAlertRuleLine(target);
  }

  function buildDefaultQuoteAlertName(target) {
    const quote = quoteById.get(Number(target && target.quoteId));
    return window.PathAlertPageUtils.buildPathAlertDefaultQuoteAlertName(
      target,
      quote,
      quoteCandidates,
      getQuoteAlertDisplayOptions()
    );
  }

  function buildDefaultAlertName(draft = pageState.draft) {
    if (!draft) return '';
    if (draft.sourceType === 'quote') {
      return buildDefaultQuoteAlertName(collectEditorTarget(draft));
    }
    return '';
  }

  function getAlertSummaryOptions() {
    return {
      getDisplayTitle: getAlertDisplayTitle,
      buildQuoteAlertThresholdLine,
      buildQuoteAlertQuoteLabel,
      buildQuoteAlertRuleLine,
      buildPathAlertSummaryLines: window.PathAlertUtils && typeof window.PathAlertUtils.buildPathAlertSummaryLines === 'function'
        ? window.PathAlertUtils.buildPathAlertSummaryLines
        : null,
      formatLeg(leg) {
        return buildQuoteLabel(leg.chain, leg.fromSymbol, leg.toSymbol);
      },
      findRule
    };
  }

  function buildAlertSummaryLines(alert) {
    return window.PathAlertPageUtils.buildPathAlertPageSummaryLines(alert, getAlertSummaryOptions());
  }

  function buildDismissedSummaryLines(entry) {
    return window.PathAlertPageUtils.buildDismissedPathAlertPageSummaryLines(entry, getAlertSummaryOptions());
  }

  function buildEditorTargetSummaryLines(draft) {
    return window.PathAlertEditorUtils.buildPathAlertEditorTargetSummaryLines(draft, {
      formatLeg(leg) {
        return buildQuoteLabel(leg.chain, leg.fromSymbol, leg.toSymbol);
      },
      buildQuoteAlertQuoteLabel,
      buildQuoteAlertRuleLine,
      findRule
    });
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

    suggestionsEl.innerHTML = window.PathAlertEditorUtils.renderPathAlertEditorCandidateSuggestionsHtml(
      pageState.filteredCandidates,
      pageState.activeCandidateIndex
    );
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
    pageState.editorStep = mode === 'edit' ? 'settings' : 'target';
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
    pageState.editorStep = 'target';
    updateHistory('manage');
    renderEditor();
  }

  function collectEditorTarget(draft = pageState.draft) {
    return window.PathAlertEditorUtils.buildPathAlertEditorTarget(draft);
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
    return window.PathAlertEditorUtils.validatePathAlertEditorDraft(draft, {
      quoteExists(quoteId) {
        return quoteById.has(Number(quoteId));
      },
      findRule,
      findDuplicateAlert: findDuplicateAlertForDraft,
      findDismissedTarget: findDismissedTargetForDraft,
      resolveSpecialRuleConfig: resolveSpecialRuleAlertConfig
    });
  }

  function buildAlertFromDraft() {
    return window.PathAlertEditorUtils.buildPathAlertFromEditorDraft(pageState.draft, {
      defaultCooldownSec: alertConfig.settings?.defaultCooldownSec || 180,
      buildAlertId,
      buildDefaultAlertName,
      resolveSpecialRuleConfig: resolveSpecialRuleAlertConfig,
      normalizePathAlert(alert) {
        return window.PathAlertUtils
          ? window.PathAlertUtils.normalizePathAlert(alert, alertConfig.settings || { defaultCooldownSec: 180 })
          : alert;
      }
    });
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
        : window.PathAlertPageUtils.buildPathAlertCardSubtitle(alert);
      return window.PathAlertPageUtils.renderPathAlertCardHtml({
        alertId: alert.id,
        selected: pageState.selectedAlertIds.has(alert.id),
        title,
        subtitle,
        typeClass: window.PathAlertPageUtils.getPathAlertSectionTypeClass(sectionKey),
        typeLabel: window.PathAlertPageUtils.getPathAlertSectionTypeLabel(sectionKey),
        enabled: alert.enabled,
        summaryLines,
        metaText
      });
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
    const quoteLabel = window.PathAlertPageUtils.buildPathAlertContextQuoteLabel({
      filterQuoteId: pageState.filterQuoteId,
      quote,
      isCexOrderbookChain,
      formatChainLabel,
      shortenToken: shortToken,
      buildQuoteLabel
    });
    const filteredCount = getFilteredAlerts().length;
    contextBarEl.classList.add('visible');
    contextBarEl.innerHTML = window.PathAlertPageUtils.renderPathAlertContextBarHtml({
      quoteLabel,
      filteredCount
    });
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
      .map((section) => window.PathAlertPageUtils.renderPathAlertSectionHtml(
        { ...section, count: section.items.length },
        renderSectionCards(section.key, section.items)
      )).join('');
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
        return window.PathAlertPageUtils.renderDismissedTargetCardHtml({
          targetKey,
          selected: pageState.selectedDismissedKeys.has(targetKey),
          title,
          summaryLines,
          metaText
        });
      }).join('')
      : `<div class="empty">${dismissedTargets.length ? '没有匹配的已忽略项' : '暂无已忽略项'}</div>`;

    syncSelectionCounters();
  }

  function renderRuleChoices(sourceType, selectedRuleId) {
    return window.PathAlertEditorUtils.renderPathAlertEditorRuleChoicesHtml(
      getRuleDefinitions(sourceType),
      selectedRuleId
    );
  }

  function renderCandidateSearchArea(draft) {
    return window.PathAlertEditorUtils.renderPathAlertEditorCandidateSearchHtml(draft, {
      hasQuoteCandidates: quoteCandidates.length > 0
    });
  }

  function renderQuoteTargetEditor(draft, options = {}) {
    const quoteOptions = Array.from(quoteById.values()).map((quote) => {
      const label = isCexOrderbookChain(quote.chain)
        ? `(${formatChainLabel(quote.chain)}) ${quote.symbol || '--'}`
        : buildQuoteLabel(quote.chain, shortToken(quote.fromToken), shortToken(quote.toToken));
      return { id: quote.id, label };
    });
    return window.PathAlertEditorUtils.renderPathAlertEditorQuoteTargetHtml(draft, quoteOptions, {
      quoteSelectDisabled: Boolean(pageState.filterQuoteId) || options.lockTarget === true,
      selectionOnly: options.selectionOnly === true,
      settingsOnly: options.settingsOnly === true
    });
  }

  function hasSelectedEditorTarget(draft) {
    if (!draft) return false;
    if (draft.sourceType === 'path') return Array.isArray(draft.legs) && draft.legs.length > 0;
    if (draft.sourceType === 'quote') return Boolean(String(draft.selectedQuoteId || '').trim());
    return Boolean(String(draft.selectedRuleId || '').trim());
  }

  function renderSelectedLegs(draft) {
    return window.PathAlertEditorUtils.renderPathAlertEditorSelectedLegsHtml(draft, {
      formatLeg(leg) {
        return buildQuoteLabel(leg.chain, leg.fromSymbol, leg.toSymbol);
      },
      buildQuoteAlertQuoteLabel,
      buildQuoteAlertRuleLine,
      findRule
    });
  }

  function renderEditor() {
    if (!pageState.editorVisible || !pageState.draft) {
      if (editorModalEl) {
        editorModalEl.classList.remove('visible', 'compact', 'target-step');
      }
      editorEl.innerHTML = '';
      return;
    }
    if (editorModalEl) {
      editorModalEl.classList.add('visible');
      editorModalEl.classList.toggle('compact', pageState.editorStep === 'settings');
      editorModalEl.classList.toggle('target-step', pageState.editorStep === 'target');
    }

    const draft = pageState.draft;
    const duplicateAlert = findDuplicateAlertForDraft(draft);
    const dismissedTarget = findDismissedTargetForDraft(draft);
    const targetSummaryLines = buildEditorTargetSummaryLines(draft);
    const targetPaneHtml = draft.sourceType === 'path'
      ? renderCandidateSearchArea(draft)
      : draft.sourceType === 'quote'
        ? renderQuoteTargetEditor(draft, { selectionOnly: true })
        : renderRuleChoices(draft.sourceType, draft.selectedRuleId);
    editorEl.innerHTML = window.PathAlertEditorUtils.renderPathAlertEditorHtml({
      mode: draft.id ? 'edit' : 'create',
      step: pageState.editorStep,
      canContinue: hasSelectedEditorTarget(draft),
      draft,
      errorMessage: pageState.errorMessage,
      duplicateAlert,
      duplicateEditHref: duplicateAlert ? getEditAlertHref(duplicateAlert.id) : '',
      dismissedTarget,
      targetPaneHtml,
      conditionPaneHtml: draft.sourceType === 'quote'
        ? renderQuoteTargetEditor(draft, { settingsOnly: true, lockTarget: Boolean(draft.id) })
        : '',
      selectedTargetHtml: renderSelectedLegs(draft),
      summaryHtml: window.PathAlertPageUtils.renderPathAlertRouteLinesHtml(targetSummaryLines, 'summary-line'),
      specialRuleConfig: resolveSpecialRuleAlertConfig(draft.specialRuleConfig),
      defaultCooldownSec: alertConfig.settings?.defaultCooldownSec || 180
    });
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
      closeEditor();
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
    if (target.id === 'path-alert-search-input') {
      pageState.draft.searchQuery = target.value || '';
    } else {
      window.PathAlertEditorUtils.updatePathAlertEditorDraftField(pageState.draft, target, {
        defaultCooldownSec: alertConfig.settings?.defaultCooldownSec || 180,
        resolveSpecialRuleConfig: resolveSpecialRuleAlertConfig
      });
    }
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
    if (event.key === 'Escape') {
      event.preventDefault();
      closeEditor();
      return;
    }

    if (!target || target.id !== 'path-alert-search-input') return;

    if (!pageState.filteredCandidates.length) return;

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

  }

  function handleDocumentKeydown(event) {
    if (event.key !== 'Escape' || event.defaultPrevented || !pageState.editorVisible) return;
    event.preventDefault();
    closeEditor();
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

    if (event.target.closest('#editor-next-btn')) {
      if (!hasSelectedEditorTarget(pageState.draft)) return;
      pageState.editorStep = 'settings';
      pageState.errorMessage = '';
      renderEditor();
      return;
    }

    if (event.target.closest('#editor-back-btn')) {
      pageState.editorStep = 'target';
      pageState.errorMessage = '';
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
    if (contextBarEl) {
      contextBarEl.addEventListener('click', handleContextBarClick);
    }
    editorEl.addEventListener('focusin', (event) => {
      if (event.target && event.target.id === 'path-alert-search-input') {
        renderCandidateSuggestions();
      }
    });
    document.addEventListener('keydown', handleDocumentKeydown);
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
      return window.PathAlertPageUtils.buildPathAlertDefaultQuoteAlertName(
        target,
        quote,
        candidates,
        getQuoteAlertDisplayOptions()
      );
    }
  };

  if (!window.__PATH_ALERTS_APP_DISABLE_AUTO_INIT__) {
    init();
  }
}());
