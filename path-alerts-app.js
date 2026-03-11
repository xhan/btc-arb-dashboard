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
  const editorEl = document.getElementById('path-alerts-editor');
  const editorTitleEl = document.getElementById('path-alerts-editor-title');
  const createBtn = document.getElementById('path-alerts-create-btn');
  const closeEditorBtn = document.getElementById('path-alerts-close-editor-btn');

  let dashboardState = [];
  let alertConfig = window.PathAlertUtils ? window.PathAlertUtils.normalizeAlertConfig() : { settings: { defaultCooldownSec: 300 }, alerts: [] };
  let quoteById = new Map();
  let quoteCandidates = [];
  let pageState = {
    editorVisible: false,
    errorMessage: '',
    saveMessage: '',
    draft: null
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

  function shortToken(value) {
    const text = String(value || '').trim();
    if (!text) return '--';
    if (text.length <= 18) return text;
    return `${text.slice(0, 8)}...${text.slice(-6)}`;
  }

  function buildQuoteLabel(chain, fromSymbol, toSymbol, suffix = '') {
    return `(${formatChainLabel(chain)}) ${fromSymbol || '--'} -> ${toSymbol || '--'}${suffix}`;
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
      thresholdBp: '',
      triggerMode: 'immediate',
      confirmDelaySec: 0,
      cooldownSec: alertConfig.settings?.defaultCooldownSec || 300,
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
      cooldownSec: Number(draft.cooldownSec || alertConfig.settings?.defaultCooldownSec || 300),
      sourceType: draft.sourceType === 'fixed' || draft.sourceType === 'special' ? draft.sourceType : 'path',
      selectedRuleId: String(draft.selectedRuleId || ''),
      searchQuery: String(draft.searchQuery || ''),
      legs: Array.isArray(draft.legs) ? draft.legs.map((leg) => ({ ...leg })) : []
    };
  }

  function buildDraftFromAlert(alert) {
    const normalized = window.PathAlertUtils
      ? window.PathAlertUtils.normalizePathAlert(alert, alertConfig.settings || { defaultCooldownSec: 300 })
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
    if (!alert || !alert.target) return '--';
    if (alert.target.type === 'rule') {
      const rule = findRule(alert.target.ruleKind, alert.target.ruleId);
      return rule ? rule.title : alert.target.ruleId;
    }
    return (alert.target.legs || [])
      .map((leg) => buildQuoteLabel(leg.chain, leg.fromSymbol, leg.toSymbol))
      .join(' | ') || '--';
  }

  function buildQuoteCandidates() {
    const candidates = [];
    for (const category of dashboardState) {
      for (const quote of (category.quotes || [])) {
        if (isCexOrderbookChain(quote.chain)) {
          const [fromSymbol, toSymbol] = String(quote.symbol || '').split('/').map((item) => item.trim());
          if (!fromSymbol || !toSymbol) continue;
          candidates.push({
            key: `${quote.id}:cex-bid1`,
            quoteId: quote.id,
            direction: 'forward',
            pricingMode: 'cex-bid1',
            chain: quote.chain,
            fromSymbol,
            toSymbol,
            categoryName: category.name,
            label: buildQuoteLabel(quote.chain, fromSymbol, toSymbol, ' [bid1]'),
            searchText: `${category.name} ${quote.chain} ${quote.symbol} ${fromSymbol} ${toSymbol}`
          });
          candidates.push({
            key: `${quote.id}:cex-ask1-inverse`,
            quoteId: quote.id,
            direction: 'forward',
            pricingMode: 'cex-ask1-inverse',
            chain: quote.chain,
            fromSymbol: toSymbol,
            toSymbol: fromSymbol,
            categoryName: category.name,
            label: buildQuoteLabel(quote.chain, toSymbol, fromSymbol, ' [ask1]'),
            searchText: `${category.name} ${quote.chain} ${quote.symbol} ${fromSymbol} ${toSymbol}`
          });
          continue;
        }

        const forwardFrom = shortToken(quote.fromToken);
        const forwardTo = shortToken(quote.toToken);
        candidates.push({
          key: `${quote.id}:forward`,
          quoteId: quote.id,
          direction: 'forward',
          pricingMode: 'raw',
          chain: quote.chain,
          fromSymbol: forwardFrom,
          toSymbol: forwardTo,
          categoryName: category.name,
          label: buildQuoteLabel(quote.chain, forwardFrom, forwardTo),
          searchText: `${category.name} ${quote.chain} ${quote.fromToken || ''} ${quote.toToken || ''} ${forwardFrom} ${forwardTo}`
        });
        if (quote.showInverse) {
          candidates.push({
            key: `${quote.id}:inverse`,
            quoteId: quote.id,
            direction: 'inverse',
            pricingMode: 'raw',
            chain: quote.chain,
            fromSymbol: forwardTo,
            toSymbol: forwardFrom,
            categoryName: category.name,
            label: buildQuoteLabel(quote.chain, forwardTo, forwardFrom),
            searchText: `${category.name} ${quote.chain} ${quote.fromToken || ''} ${quote.toToken || ''} ${forwardFrom} ${forwardTo}`
          });
        }
      }
    }
    return candidates;
  }

  function matchesCandidate(candidate, query) {
    const tokens = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    const haystack = String(candidate.searchText || candidate.label || '').toLowerCase();
    return tokens.every((token) => haystack.includes(token));
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

  function validateDraft(draft) {
    if (!draft.name.trim()) {
      return '名称不能为空';
    }
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
      return '';
    }

    if (!Array.isArray(draft.legs) || !draft.legs.length) {
      return '至少需要一条路径腿';
    }
    const missingQuoteId = draft.legs.find((leg) => !quoteById.has(Number(leg.quoteId)));
    if (missingQuoteId) {
      return `路径腿引用的 live quote 不存在：${missingQuoteId.quoteId}`;
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
      cooldownSec: Number(draft.cooldownSec || alertConfig.settings?.defaultCooldownSec || 300),
      delivery: { sound: true, log: true, webhookEnabled: false },
      target: collectEditorTarget(draft)
    };
    return window.PathAlertUtils
      ? window.PathAlertUtils.normalizePathAlert(alert, alertConfig.settings || { defaultCooldownSec: 300 })
      : alert;
  }

  function renderList() {
    const alerts = Array.isArray(alertConfig.alerts) ? alertConfig.alerts : [];
    if (!alerts.length) {
      listEl.innerHTML = '<div class="empty">暂无路径报警</div>';
      return;
    }

    listEl.innerHTML = alerts.map((alert) => `
      <div class="alert-item">
        <div class="alert-item-head">
          <div>
            <div class="alert-item-title">${escapeHtml(alert.name || '未命名路径')}</div>
            <div class="alert-item-meta">${escapeHtml(buildAlertSummary(alert))}</div>
            <div class="alert-item-meta">
              类型 ${alert.target.type === 'rule' ? (alert.target.ruleKind === 'fixed' ? '固定规则' : '特殊规则') : '路径'}
              | 阈值 ${escapeHtml(String(alert.thresholdBp))}bp
              | ${alert.triggerMode === 'delayed' ? `延迟 ${escapeHtml(String(alert.confirmDelaySec))}s` : '立即提醒'}
              | 冷却 ${escapeHtml(String(alert.cooldownSec))}s
              | ${alert.enabled === false ? '已禁用' : '已启用'}
            </div>
          </div>
          <div class="alert-item-actions">
            <button type="button" data-alert-toggle="${escapeHtml(alert.id)}">${alert.enabled === false ? '启用' : '停用'}</button>
            <button type="button" data-alert-edit="${escapeHtml(alert.id)}">编辑</button>
            <button type="button" class="danger" data-alert-delete="${escapeHtml(alert.id)}">删除</button>
          </div>
        </div>
      </div>
    `).join('');
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

  function renderCandidates(draft) {
    const selectedKeys = new Set((draft.legs || []).map((leg) => `${leg.quoteId}:${leg.direction}:${leg.pricingMode}`));
    const rows = quoteCandidates
      .filter((candidate) => matchesCandidate(candidate, draft.searchQuery))
      .slice(0, 100);
    if (!rows.length) return '<div class="empty">没有匹配的报价腿</div>';
    return `<div class="candidate-list">${rows.map((candidate) => {
      const key = `${candidate.quoteId}:${candidate.direction}:${candidate.pricingMode}`;
      return `
        <div class="candidate-item">
          <div class="candidate-text">${escapeHtml(candidate.label)}<br><span class="inline-hint">${escapeHtml(candidate.categoryName || '')}</span></div>
          <button type="button" data-editor-add-candidate="${escapeHtml(candidate.key)}" ${selectedKeys.has(key) ? 'disabled' : ''}>添加</button>
        </div>
      `;
    }).join('')}</div>`;
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
    const targetSummary = draft.sourceType === 'path'
      ? ((draft.legs || []).map((leg) => buildQuoteLabel(leg.chain, leg.fromSymbol, leg.toSymbol)).join(' | ') || '--')
      : ((findRule(draft.sourceType, draft.selectedRuleId) || {}).title || '--');
    const errorHtml = pageState.errorMessage
      ? `<div class="status-message error">${escapeHtml(pageState.errorMessage)}</div>`
      : '';

    editorEl.innerHTML = `
      ${errorHtml}
      <div class="form-group">
        <label for="editor-name">名称</label>
        <input id="editor-name" type="text" value="${escapeHtml(draft.name)}" placeholder="例如：WBTC 固定路径">
      </div>

      <div class="type-tabs">
        <button type="button" class="type-tab${draft.sourceType === 'path' ? ' active' : ''}" data-editor-type="path">手工路径</button>
        <button type="button" class="type-tab${draft.sourceType === 'fixed' ? ' active' : ''}" data-editor-type="fixed">固定规则</button>
        <button type="button" class="type-tab${draft.sourceType === 'special' ? ' active' : ''}" data-editor-type="special">特殊规则</button>
      </div>

      <div class="editor-grid">
        <div class="editor-pane">
          ${draft.sourceType === 'path' ? `
            <div class="form-group">
              <label for="editor-search">搜索报价腿</label>
              <input id="editor-search" type="text" value="${escapeHtml(draft.searchQuery)}" placeholder="输入分区名、链名、代币、地址">
            </div>
            ${renderCandidates(draft)}
          ` : renderRuleChoices(draft.sourceType, draft.selectedRuleId)}
        </div>
        <div class="editor-pane">
          <div style="font-weight:700; margin-bottom:8px;">已选路径</div>
          ${renderSelectedLegs(draft)}
          <div class="summary-box">${escapeHtml(targetSummary)}</div>
        </div>
      </div>

      <div class="form-group">
        <label for="editor-threshold">收益阈值 (bp)</label>
        <input id="editor-threshold" type="number" step="0.1" value="${draft.thresholdBp === '' ? '' : escapeHtml(String(draft.thresholdBp))}" placeholder="例如：3">
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
        <input id="editor-cooldown" type="number" min="1" value="${escapeHtml(String(draft.cooldownSec || alertConfig.settings?.defaultCooldownSec || 300))}">
      </div>
      <div class="form-group">
        <label><input id="editor-enabled" type="checkbox" ${draft.enabled !== false ? 'checked' : ''}> 启用这条路径报警</label>
      </div>

      <div class="editor-actions">
        <div class="inline-hint">保存后，请回主看板点击重新加载。</div>
        <div class="editor-actions-right">
          <button type="button" id="editor-cancel-btn">取消</button>
          <button type="button" class="primary" id="editor-save-btn">保存</button>
        </div>
      </div>
    `;
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
      return;
    }

    const deleteBtn = event.target.closest('[data-alert-delete]');
    if (deleteBtn) {
      alertConfig.alerts = (alertConfig.alerts || []).filter((item) => item.id !== deleteBtn.dataset.alertDelete);
      await persistAlertConfig();
      if (pageState.draft && pageState.draft.id === deleteBtn.dataset.alertDelete) {
        closeEditor();
      }
      renderList();
    }
  }

  function updateDraftField(event) {
    if (!pageState.draft) return;
    const target = event.target;
    if (target.id === 'editor-name') pageState.draft.name = target.value || '';
    if (target.id === 'editor-search') pageState.draft.searchQuery = target.value || '';
    if (target.id === 'editor-threshold') pageState.draft.thresholdBp = target.value === '' ? '' : Number(target.value);
    if (target.id === 'editor-trigger') pageState.draft.triggerMode = target.value === 'delayed' ? 'delayed' : 'immediate';
    if (target.id === 'editor-confirm-delay') pageState.draft.confirmDelaySec = Number(target.value || 0);
    if (target.id === 'editor-cooldown') pageState.draft.cooldownSec = Number(target.value || alertConfig.settings?.defaultCooldownSec || 300);
    if (target.id === 'editor-enabled') pageState.draft.enabled = target.checked;
    if (pageState.errorMessage) pageState.errorMessage = '';
    renderEditor();
  }

  function updateEditorType(sourceType) {
    if (!pageState.draft) return;
    pageState.draft.sourceType = sourceType;
    pageState.draft.selectedRuleId = '';
    pageState.draft.searchQuery = '';
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

  function handleEditorClick(event) {
    if (!pageState.draft) return;

    const typeBtn = event.target.closest('[data-editor-type]');
    if (typeBtn) {
      updateEditorType(typeBtn.dataset.editorType);
      return;
    }

    const addBtn = event.target.closest('[data-editor-add-candidate]');
    if (addBtn) {
      const candidate = quoteCandidates.find((item) => item.key === addBtn.dataset.editorAddCandidate);
      if (!candidate) return;
      pageState.draft.legs.push({
        quoteId: candidate.quoteId,
        direction: candidate.direction,
        pricingMode: candidate.pricingMode,
        chain: candidate.chain,
        fromSymbol: candidate.fromSymbol,
        toSymbol: candidate.toSymbol
      });
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
      renderList();
      applyInitialRoute();
      setStatus('');
    } catch (error) {
      setStatus(error.message || '初始化失败', 'error');
      renderList();
      renderEditor();
    }

    createBtn.addEventListener('click', () => openEditorWithDraft(createEmptyDraft(), 'create'));
    closeEditorBtn.addEventListener('click', closeEditor);
    listEl.addEventListener('click', (event) => {
      handleListClick(event).catch((error) => setStatus(error.message || '操作失败', 'error'));
    });
    editorEl.addEventListener('click', handleEditorClick);
    editorEl.addEventListener('input', updateDraftField);
    editorEl.addEventListener('change', updateDraftField);
  }

  init();
}());
