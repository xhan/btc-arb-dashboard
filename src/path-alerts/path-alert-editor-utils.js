(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.PathAlertEditorUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildPathAlertQuotePairLabel(chain, fromSymbol, toSymbol, suffix, options = {}) {
    if (typeof options.buildQuoteLabel === 'function') {
      return options.buildQuoteLabel(chain, fromSymbol, toSymbol, suffix);
    }
    const formatChainLabel = typeof options.formatChainLabel === 'function'
      ? options.formatChainLabel
      : (value) => String(value || '');
    return `(${formatChainLabel(chain)}) ${fromSymbol || '--'} -> ${toSymbol || '--'}${suffix || ''}`;
  }

  function getEditorDefaultCooldownSec(options = {}) {
    return options.defaultCooldownSec || 180;
  }

  function getEditorDefaultThresholdBp(options = {}) {
    return Number.isFinite(Number(options.defaultThresholdBp))
      ? Number(options.defaultThresholdBp)
      : 1.1;
  }

  function createPathAlertEditorDraft(options = {}) {
    return {
      id: '',
      name: '',
      enabled: true,
      thresholdBp: getEditorDefaultThresholdBp(options),
      triggerMode: 'delayed',
      confirmDelaySec: 13,
      cooldownSec: getEditorDefaultCooldownSec(options),
      sourceType: 'path',
      selectedRuleId: '',
      selectedQuoteId: '',
      quoteDirection: 'forward',
      quoteRuleKind: 'targetAbove',
      quoteValue: '',
      quoteBasePrice: '',
      specialRuleConfig: null,
      searchQuery: '',
      legs: []
    };
  }

  function clonePathAlertEditorDraft(draft, options = {}) {
    const source = draft && typeof draft === 'object' ? draft : {};
    return {
      id: String(source.id || ''),
      name: String(source.name || ''),
      enabled: source.enabled !== false,
      thresholdBp: source.thresholdBp === '' ? '' : Number(source.thresholdBp),
      triggerMode: source.triggerMode === 'delayed' ? 'delayed' : 'immediate',
      confirmDelaySec: Number(source.confirmDelaySec || 0),
      cooldownSec: Number(source.cooldownSec || getEditorDefaultCooldownSec(options)),
      sourceType: ['path', 'fixed', 'special', 'quote'].includes(source.sourceType) ? source.sourceType : 'path',
      selectedRuleId: String(source.selectedRuleId || ''),
      selectedQuoteId: String(source.selectedQuoteId || ''),
      quoteDirection: source.quoteDirection === 'inverse' ? 'inverse' : 'forward',
      quoteRuleKind: ['targetAbove', 'targetBelow', 'percentUp', 'percentDown'].includes(source.quoteRuleKind)
        ? source.quoteRuleKind
        : 'targetAbove',
      quoteValue: source.quoteValue === '' ? '' : Number(source.quoteValue),
      quoteBasePrice: source.quoteBasePrice === '' ? '' : Number(source.quoteBasePrice),
      specialRuleConfig: source.specialRuleConfig && typeof source.specialRuleConfig === 'object'
        ? { ...source.specialRuleConfig }
        : null,
      searchQuery: String(source.searchQuery || ''),
      legs: Array.isArray(source.legs) ? source.legs.map((leg) => ({ ...leg })) : []
    };
  }

  function buildQuoteEditorDraft(normalized) {
    return {
      id: normalized.id,
      name: normalized.name,
      enabled: normalized.enabled !== false,
      thresholdBp: '',
      triggerMode: normalized.triggerMode,
      confirmDelaySec: normalized.confirmDelaySec,
      cooldownSec: normalized.cooldownSec,
      sourceType: 'quote',
      selectedRuleId: '',
      selectedQuoteId: String(normalized.target.quoteId || ''),
      quoteDirection: normalized.target.direction === 'inverse' ? 'inverse' : 'forward',
      quoteRuleKind: normalized.target.ruleKind,
      quoteValue: normalized.target.value,
      quoteBasePrice: normalized.target.basePrice === undefined ? '' : normalized.target.basePrice,
      searchQuery: '',
      legs: []
    };
  }

  function buildRuleEditorDraft(normalized, options = {}) {
    const resolveSpecialRuleConfig = typeof options.resolveSpecialRuleConfig === 'function'
      ? options.resolveSpecialRuleConfig
      : (config) => (config && typeof config === 'object' ? config : null);
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
      selectedQuoteId: '',
      quoteDirection: 'forward',
      quoteRuleKind: 'targetAbove',
      quoteValue: '',
      quoteBasePrice: '',
      specialRuleConfig: normalized.target.ruleKind === 'special'
        ? resolveSpecialRuleConfig(normalized.specialRuleConfig)
        : null,
      searchQuery: '',
      legs: []
    };
  }

  function buildPathEditorDraft(normalized) {
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
      selectedQuoteId: '',
      quoteDirection: 'forward',
      quoteRuleKind: 'targetAbove',
      quoteValue: '',
      quoteBasePrice: '',
      searchQuery: '',
      legs: normalized.target.legs.map((leg) => ({ ...leg }))
    };
  }

  function buildPathAlertEditorDraftFromAlert(alert, options = {}) {
    const normalizePathAlert = typeof options.normalizePathAlert === 'function'
      ? options.normalizePathAlert
      : () => null;
    const normalized = normalizePathAlert(alert);
    if (!normalized || !normalized.target) return createPathAlertEditorDraft(options);
    if (normalized.target.type === 'quote') return buildQuoteEditorDraft(normalized);
    if (normalized.target.type === 'rule') return buildRuleEditorDraft(normalized, options);
    return buildPathEditorDraft(normalized);
  }

  function buildPathAlertEditorDraftFromPrefill(prefill, options = {}) {
    const draft = createPathAlertEditorDraft(options);
    if (!prefill) return draft;
    draft.name = String(prefill.name || '');
    if (prefill.target && prefill.target.type === 'rule') {
      draft.sourceType = prefill.target.ruleKind;
      draft.selectedRuleId = prefill.target.ruleId;
      return draft;
    }
    if (prefill.target && prefill.target.type === 'quote') {
      draft.sourceType = 'quote';
      draft.selectedQuoteId = String(prefill.target.quoteId || '');
      draft.quoteDirection = prefill.target.direction === 'inverse' ? 'inverse' : 'forward';
      draft.quoteRuleKind = prefill.target.ruleKind || 'targetAbove';
      draft.quoteValue = Number.isFinite(Number(prefill.target.value)) ? Number(prefill.target.value) : '';
      draft.quoteBasePrice = Number.isFinite(Number(prefill.target.basePrice)) ? Number(prefill.target.basePrice) : '';
      return draft;
    }
    if (prefill.target && prefill.target.type === 'path') {
      draft.legs = (prefill.target.legs || []).map((leg) => ({ ...leg }));
    }
    return draft;
  }

  function buildPathAlertEditorTarget(draft) {
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

  function buildPathAlertEditorTargetSummaryLines(draft, options = {}) {
    const formatLeg = typeof options.formatLeg === 'function'
      ? options.formatLeg
      : (leg) => buildPathAlertQuotePairLabel(leg && leg.chain, leg && leg.fromSymbol, leg && leg.toSymbol, '', options);
    const buildQuoteAlertQuoteLabel = typeof options.buildQuoteAlertQuoteLabel === 'function'
      ? options.buildQuoteAlertQuoteLabel
      : (target) => `报价 #${String(target && target.quoteId || '--')}`;
    const buildQuoteAlertRuleLine = typeof options.buildQuoteAlertRuleLine === 'function'
      ? options.buildQuoteAlertRuleLine
      : () => '--';
    const findRule = typeof options.findRule === 'function'
      ? options.findRule
      : () => null;

    if (!draft) return [];
    if (draft.sourceType === 'path') {
      return (draft.legs || []).map(formatLeg).filter(Boolean);
    }
    if (draft.sourceType === 'quote') {
      const target = buildPathAlertEditorTarget(draft);
      return [
        buildQuoteAlertQuoteLabel(target),
        buildQuoteAlertRuleLine(target)
      ];
    }
    return [((findRule(draft.sourceType, draft.selectedRuleId) || {}).title || '--')];
  }

  function isPercentQuoteRuleKind(ruleKind) {
    return ruleKind === 'percentUp' || ruleKind === 'percentDown';
  }

  function getEditorDraftThresholdBp(draft) {
    if (draft.sourceType === 'quote' || draft.sourceType === 'special') return 0;
    return draft.thresholdBp === '' ? 0 : Number(draft.thresholdBp);
  }

  function validatePathAlertEditorDraft(draft, options = {}) {
    const quoteExists = typeof options.quoteExists === 'function'
      ? options.quoteExists
      : () => false;
    const findRule = typeof options.findRule === 'function'
      ? options.findRule
      : () => null;
    const findDuplicateAlert = typeof options.findDuplicateAlert === 'function'
      ? options.findDuplicateAlert
      : () => null;
    const findDismissedTarget = typeof options.findDismissedTarget === 'function'
      ? options.findDismissedTarget
      : () => null;
    const resolveSpecialRuleConfig = typeof options.resolveSpecialRuleConfig === 'function'
      ? options.resolveSpecialRuleConfig
      : (config) => (config && typeof config === 'object' ? config : {});

    const confirmDelaySec = Number(draft && draft.confirmDelaySec);
    if (!Number.isFinite(confirmDelaySec) || confirmDelaySec < 0) {
      return '延迟确认必须是大于等于 0 的数字';
    }
    const cooldownSec = Number(draft && draft.cooldownSec);
    if (!Number.isFinite(cooldownSec) || cooldownSec <= 0) {
      return '冷却时间必须大于 0';
    }

    if (draft && draft.sourceType === 'quote') {
      if (!quoteExists(Number(draft.selectedQuoteId))) {
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
        isPercentQuoteRuleKind(draft.quoteRuleKind)
        && (!Number.isFinite(Number(draft.quoteBasePrice)) || Number(draft.quoteBasePrice) <= 0)
      ) {
        return '百分比规则必须填写有效基准汇率';
      }
      const duplicateAlert = findDuplicateAlert(draft);
      if (duplicateAlert) {
        return `该报警已存在：${duplicateAlert.name || duplicateAlert.id}`;
      }
      return '';
    }

    const thresholdBp = draft ? getEditorDraftThresholdBp(draft) : Number(draft && draft.thresholdBp);
    if (draft && draft.sourceType !== 'special' && !Number.isFinite(thresholdBp)) {
      return '收益阈值必须是合法数字';
    }

    if (draft && (draft.sourceType === 'fixed' || draft.sourceType === 'special')) {
      const rule = findRule(draft.sourceType, draft.selectedRuleId);
      if (!rule) {
        return '请选择有效的规则';
      }
      if (draft.sourceType === 'special') {
        const specialRuleConfig = resolveSpecialRuleConfig(draft.specialRuleConfig);
        if (!Number.isFinite(Number(specialRuleConfig.minNetProfit)) || Number(specialRuleConfig.minNetProfit) < 0) {
          return '净收益阈值必须是大于等于 0 的数字';
        }
        if (!Number.isFinite(Number(specialRuleConfig.minNetProfitBp)) || Number(specialRuleConfig.minNetProfitBp) < 0) {
          return '净收益率阈值必须是大于等于 0 的数字';
        }
      }
      const dismissedTarget = findDismissedTarget(draft);
      if (dismissedTarget) {
        return '该规则已被标记为忽略，请先在“已忽略规则”列表取消标记。';
      }
      const duplicateAlert = findDuplicateAlert(draft);
      if (duplicateAlert) {
        return `该报警已存在：${duplicateAlert.name || duplicateAlert.id}`;
      }
      return '';
    }

    if (!Array.isArray(draft && draft.legs) || !draft.legs.length) {
      return '至少需要一条路径腿';
    }
    const missingQuoteId = draft.legs.find((leg) => !quoteExists(Number(leg && leg.quoteId)));
    if (missingQuoteId) {
      return `路径腿引用的 live quote 不存在：${missingQuoteId.quoteId}`;
    }
    const dismissedTarget = findDismissedTarget(draft);
    if (dismissedTarget) {
      return '该规则已被标记为忽略，请先在“已忽略规则”列表取消标记。';
    }
    const duplicateAlert = findDuplicateAlert(draft);
    if (duplicateAlert) {
      return `该报警已存在：${duplicateAlert.name || duplicateAlert.id}`;
    }
    return '';
  }

  function buildPathAlertFromEditorDraft(draft, options = {}) {
    const buildAlertId = typeof options.buildAlertId === 'function'
      ? options.buildAlertId
      : () => '';
    const buildDefaultAlertName = typeof options.buildDefaultAlertName === 'function'
      ? options.buildDefaultAlertName
      : () => '';
    const resolveSpecialRuleConfig = typeof options.resolveSpecialRuleConfig === 'function'
      ? options.resolveSpecialRuleConfig
      : (config) => (config && typeof config === 'object' ? config : {});
    const normalizePathAlert = typeof options.normalizePathAlert === 'function'
      ? options.normalizePathAlert
      : (alert) => alert;
    const thresholdBp = getEditorDraftThresholdBp(draft);
    const alert = {
      id: draft.id || buildAlertId(),
      name: String(draft.name || '').trim() || buildDefaultAlertName(draft),
      enabled: draft.enabled !== false,
      thresholdBp,
      triggerMode: draft.triggerMode === 'delayed' ? 'delayed' : 'immediate',
      confirmDelaySec: Number(draft.confirmDelaySec || 0),
      cooldownSec: Number(draft.cooldownSec || getEditorDefaultCooldownSec(options)),
      target: buildPathAlertEditorTarget(draft)
    };
    if (draft.sourceType === 'special') {
      alert.specialRuleConfig = resolveSpecialRuleConfig(draft.specialRuleConfig);
    }
    return normalizePathAlert(alert);
  }

  function renderPathAlertEditorRuleChoicesHtml(rules, selectedRuleId) {
    const items = Array.isArray(rules) ? rules : [];
    if (!items.length) return '<div class="empty">暂无可选规则</div>';
    return `<div class="rule-list">${items.map((rule) => `
      <button
        type="button"
        class="rule-item${selectedRuleId === rule.id ? ' active' : ''}"
        data-editor-rule-id="${escapeHtml(rule.id)}"
      >${escapeHtml(rule.title)}</button>
    `).join('')}</div>`;
  }

  function renderPathAlertEditorCandidateSearchHtml(draft, options = {}) {
    const hasQuoteCandidates = options.hasQuoteCandidates === true;
    const disabledAttr = hasQuoteCandidates ? '' : 'disabled';
    return `
      <div class="form-group">
        <label for="path-alert-search-input">搜索报价腿</label>
        <div class="path-alert-search-row">
          <div class="path-alert-search-shell">
            <input id="path-alert-search-input" type="text" value="${escapeHtml(draft && draft.searchQuery)}" placeholder="输入分区名、链名、代币、地址" ${disabledAttr}>
            <div id="path-alert-suggestions" class="path-alert-suggestions"></div>
          </div>
          <button type="button" id="path-alert-add-leg-btn" ${disabledAttr}>添加</button>
        </div>
      </div>
      ${hasQuoteCandidates ? '' : '<div class="empty">暂无可选报价腿</div>'}
    `;
  }

  function renderPathAlertEditorCandidateSuggestionsHtml(candidates, activeIndex = -1) {
    const items = Array.isArray(candidates) ? candidates : [];
    return items.map((candidate, index) => `
      <button
        type="button"
        class="path-alert-suggestion${index === activeIndex ? ' active' : ''}"
        data-path-alert-candidate-key="${escapeHtml(candidate && candidate.key)}"
      >
        <span class="path-alert-suggestion-label">${escapeHtml(candidate && candidate.label)}</span>
        <span class="path-alert-suggestion-meta">${escapeHtml(candidate && candidate.categoryName || '')}</span>
      </button>
    `).join('');
  }

  function renderPathAlertEditorQuoteTargetHtml(draft, quoteOptions, options = {}) {
    const items = Array.isArray(quoteOptions) ? quoteOptions : [];
    const selectedQuoteId = String(draft && draft.selectedQuoteId || '');
    const quoteRuleKind = String(draft && draft.quoteRuleKind || '');
    const quoteOptionsHtml = items.map((quote) => {
      const quoteId = String(quote && quote.id || '');
      return `<option value="${escapeHtml(quoteId)}" ${selectedQuoteId === quoteId ? 'selected' : ''}>${escapeHtml(quote && quote.label)}</option>`;
    }).join('');

    return `
      <div class="form-group">
        <label for="editor-quote-id">报价</label>
        <select id="editor-quote-id" ${options.quoteSelectDisabled ? 'disabled' : ''}>
          <option value="">请选择</option>
          ${quoteOptionsHtml}
        </select>
      </div>
      <div class="form-group">
        <label for="editor-quote-direction">方向</label>
        <select id="editor-quote-direction">
          <option value="forward" ${draft && draft.quoteDirection === 'forward' ? 'selected' : ''}>正向</option>
          <option value="inverse" ${draft && draft.quoteDirection === 'inverse' ? 'selected' : ''}>反向</option>
        </select>
      </div>
      <div class="form-group">
        <label for="editor-quote-rule-kind">规则</label>
        <select id="editor-quote-rule-kind">
          <option value="targetAbove" ${quoteRuleKind === 'targetAbove' ? 'selected' : ''}>汇率高于</option>
          <option value="targetBelow" ${quoteRuleKind === 'targetBelow' ? 'selected' : ''}>汇率低于</option>
          <option value="percentUp" ${quoteRuleKind === 'percentUp' ? 'selected' : ''}>相对基准上涨</option>
          <option value="percentDown" ${quoteRuleKind === 'percentDown' ? 'selected' : ''}>相对基准下跌</option>
        </select>
      </div>
      <div class="form-group">
        <label for="editor-quote-value">${isPercentQuoteRuleKind(quoteRuleKind) ? '阈值 (%)' : '汇率阈值'}</label>
        <input id="editor-quote-value" type="number" step="0.000001" value="${draft && draft.quoteValue === '' ? '' : escapeHtml(String(draft && draft.quoteValue))}">
      </div>
      ${isPercentQuoteRuleKind(quoteRuleKind) ? `
        <div class="form-group">
          <label for="editor-quote-base-price">基准汇率</label>
          <input id="editor-quote-base-price" type="number" step="0.000001" value="${draft && draft.quoteBasePrice === '' ? '' : escapeHtml(String(draft && draft.quoteBasePrice))}">
        </div>
      ` : ''}
    `;
  }

  function renderPathAlertEditorSelectedLegsHtml(draft, options = {}) {
    const formatLeg = typeof options.formatLeg === 'function'
      ? options.formatLeg
      : (leg) => buildPathAlertQuotePairLabel(leg && leg.chain, leg && leg.fromSymbol, leg && leg.toSymbol, '', options);
    const buildQuoteAlertQuoteLabel = typeof options.buildQuoteAlertQuoteLabel === 'function'
      ? options.buildQuoteAlertQuoteLabel
      : (target) => `报价 #${String(target && target.quoteId || '--')}`;
    const buildQuoteAlertRuleLine = typeof options.buildQuoteAlertRuleLine === 'function'
      ? options.buildQuoteAlertRuleLine
      : () => '--';
    const findRule = typeof options.findRule === 'function'
      ? options.findRule
      : () => null;

    if (draft && draft.sourceType === 'quote') {
      const target = buildPathAlertEditorTarget(draft);
      return `<div class="rule-list"><div class="rule-item active">${escapeHtml(buildQuoteAlertQuoteLabel(target))}</div><div class="rule-item active">${escapeHtml(buildQuoteAlertRuleLine(target))}</div></div>`;
    }
    if (draft && draft.sourceType !== 'path') {
      const rule = findRule(draft.sourceType, draft.selectedRuleId);
      return rule
        ? `<div class="rule-list"><div class="rule-item active">${escapeHtml(rule.title)}</div></div>`
        : '<div class="empty">请选择一条规则</div>';
    }
    const legs = Array.isArray(draft && draft.legs) ? draft.legs : [];
    if (!legs.length) return '<div class="empty">还没有添加路径腿</div>';
    return `<div class="selected-legs">${legs.map((leg, index) => `
      <div class="selected-leg-item">
        <div class="selected-leg-text">${escapeHtml(formatLeg(leg))}</div>
        <div class="selected-leg-actions">
          <button type="button" data-editor-move-leg="up" data-editor-leg-index="${index}">↑</button>
          <button type="button" data-editor-move-leg="down" data-editor-leg-index="${index}">↓</button>
          <button type="button" data-editor-remove-leg="${index}">删</button>
        </div>
      </div>
    `).join('')}</div>`;
  }

  function renderPathAlertEditorHtml(options = {}) {
    const draft = options.draft && typeof options.draft === 'object' ? options.draft : {};
    const specialRuleConfig = options.specialRuleConfig && typeof options.specialRuleConfig === 'object'
      ? options.specialRuleConfig
      : {};
    const duplicateAlert = options.duplicateAlert && typeof options.duplicateAlert === 'object'
      ? options.duplicateAlert
      : null;
    const duplicateHtml = duplicateAlert
      ? `
        <div class="status-message error editor-duplicate-warning">
          <span>与已有报警重复：${escapeHtml(duplicateAlert.name || duplicateAlert.id || '未命名路径')}</span>
          <a class="inline-link-btn" href="${escapeHtml(options.duplicateEditHref || '')}">编辑已有报警</a>
        </div>
      `
      : '';
    const dismissedHtml = options.dismissedTarget
      ? `
        <div class="status-message error editor-duplicate-warning">
          <span>该路径已被标记为不需要，请先恢复后再添加。</span>
          <a class="inline-link-btn" href="#dismissed-section">查看已忽略规则</a>
        </div>
      `
      : '';
    const errorHtml = options.errorMessage
      ? `<div id="editor-error-slot" class="status-message error">${escapeHtml(options.errorMessage)}</div>`
      : '<div id="editor-error-slot" class="status-message"></div>';
    const sourceType = draft.sourceType || 'path';
    const defaultCooldownSec = options.defaultCooldownSec || 180;
    const saveDisabledAttr = duplicateAlert || options.dismissedTarget ? 'disabled' : '';
    return `
      ${errorHtml}
      ${duplicateHtml}
      ${dismissedHtml}
      <div class="form-group">
        <label for="editor-name">备注（可选）</label>
        <input id="editor-name" type="text" value="${escapeHtml(draft.name)}" placeholder="例如：只关注 ETH / ARB 这条">
      </div>

      <div class="type-tabs">
        <button type="button" class="type-tab${sourceType === 'path' ? ' active' : ''}" data-editor-type="path">手工路径</button>
        <button type="button" class="type-tab${sourceType === 'quote' ? ' active' : ''}" data-editor-type="quote">交易对报警</button>
        <button type="button" class="type-tab${sourceType === 'fixed' ? ' active' : ''}" data-editor-type="fixed">固定规则</button>
        <button type="button" class="type-tab${sourceType === 'special' ? ' active' : ''}" data-editor-type="special">特殊规则</button>
      </div>

      <div class="editor-grid">
        <div class="editor-pane">
          ${options.targetPaneHtml || ''}
        </div>
        <div class="editor-pane">
          <div class="editor-pane-title">${sourceType === 'path' ? '已选路径' : '已选目标'}</div>
          ${options.selectedTargetHtml || ''}
          <div class="summary-box">${options.summaryHtml || ''}</div>
        </div>
        <div class="editor-pane editor-settings-pane">
          <div class="editor-pane-title">报警条件</div>
          ${sourceType === 'quote' || sourceType === 'special' ? '' : `
            <div class="form-group">
              <label for="editor-threshold">收益阈值 (bp)</label>
              <input id="editor-threshold" type="number" step="0.1" value="${draft.thresholdBp === '' ? '' : escapeHtml(String(draft.thresholdBp))}">
            </div>
          `}
          ${sourceType !== 'special' ? '' : `
            <div class="form-group">
              <label for="editor-special-min-profit">净收益阈值</label>
              <input id="editor-special-min-profit" type="number" min="0" step="0.0001" value="${escapeHtml(String(specialRuleConfig.minNetProfit ?? 0))}">
            </div>
            <div class="form-group">
              <label for="editor-special-min-profit-bp">净收益率阈值 (bp)</label>
              <input id="editor-special-min-profit-bp" type="number" min="0" step="0.1" value="${escapeHtml(String(specialRuleConfig.minNetProfitBp ?? 0))}">
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
            <input id="editor-cooldown" type="number" min="1" value="${escapeHtml(String(draft.cooldownSec || defaultCooldownSec))}">
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
  }

  return {
    buildPathAlertEditorDraftFromAlert,
    buildPathAlertEditorDraftFromPrefill,
    buildPathAlertEditorTarget,
    buildPathAlertEditorTargetSummaryLines,
    buildPathAlertFromEditorDraft,
    clonePathAlertEditorDraft,
    createPathAlertEditorDraft,
    renderPathAlertEditorCandidateSearchHtml,
    renderPathAlertEditorCandidateSuggestionsHtml,
    renderPathAlertEditorHtml,
    renderPathAlertEditorQuoteTargetHtml,
    renderPathAlertEditorRuleChoicesHtml,
    renderPathAlertEditorSelectedLegsHtml,
    validatePathAlertEditorDraft
  };
}));
