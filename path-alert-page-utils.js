(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.PathAlertPageUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function sanitizeMode(mode) {
    return mode === 'edit' ? 'edit' : mode === 'create' ? 'create' : 'manage';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function shortenTokenText(value) {
    const text = String(value || '').trim();
    if (!text) return '--';
    if (text.length <= 18) return text;
    return `${text.slice(0, 8)}...${text.slice(-6)}`;
  }

  function buildPathAlertQuoteLabel(options = {}) {
    const formatChainLabel = typeof options.formatChainLabel === 'function'
      ? options.formatChainLabel
      : (chain) => chain || '';
    const chainLabel = formatChainLabel(options.chain);
    const fromSymbol = options.fromSymbol || '--';
    const toSymbol = options.toSymbol || '--';
    const suffix = options.suffix || '';
    return `(${chainLabel}) ${fromSymbol} -> ${toSymbol}${suffix}`;
  }

  function getPathAlertQuoteDirection(target, options = {}) {
    if (typeof options.getQuoteDirection === 'function') {
      return options.getQuoteDirection(target);
    }
    return target && target.direction === 'inverse' ? 'inverse' : 'forward';
  }

  function buildPathAlertQuoteDirectionLabel(target, options = {}) {
    if (typeof options.buildQuoteDirectionLabel === 'function') {
      return options.buildQuoteDirectionLabel(target);
    }
    return getPathAlertQuoteDirection(target, options) === 'inverse' ? '反向' : '正向';
  }

  function isPathAlertCexOrderbookChain(chain, options = {}) {
    return typeof options.isCexOrderbookChain === 'function'
      ? options.isCexOrderbookChain(chain)
      : false;
  }

  function parsePathAlertCexPair(symbol, options = {}) {
    return typeof options.parseCexTradingPairSymbol === 'function'
      ? options.parseCexTradingPairSymbol(symbol)
      : null;
  }

  function formatPathAlertChainLabel(chain, options = {}) {
    return typeof options.formatChainLabel === 'function'
      ? options.formatChainLabel(chain)
      : String(chain || '');
  }

  function buildPathAlertQuotePairLabel(chain, fromSymbol, toSymbol, suffix, options = {}) {
    if (typeof options.buildQuoteLabel === 'function') {
      return options.buildQuoteLabel(chain, fromSymbol, toSymbol, suffix);
    }
    return buildPathAlertQuoteLabel({
      chain,
      fromSymbol,
      toSymbol,
      suffix,
      formatChainLabel: (value) => formatPathAlertChainLabel(value, options)
    });
  }

  function shortenPathAlertQuoteToken(value, options = {}) {
    return typeof options.shortenToken === 'function'
      ? options.shortenToken(value)
      : shortenTokenText(value);
  }

  function buildPathAlertQuoteDisplayLabel(target, quote, options = {}) {
    if (!quote) {
      return `报价 #${String(target && target.quoteId || '--')}`;
    }
    const direction = getPathAlertQuoteDirection(target, options);
    const directionLabel = buildPathAlertQuoteDirectionLabel(target, options);
    if (isPathAlertCexOrderbookChain(quote.chain, options)) {
      const parsed = parsePathAlertCexPair(quote.symbol, options);
      if (parsed) {
        const fromSymbol = direction === 'inverse' ? parsed.toSymbol : parsed.fromSymbol;
        const toSymbol = direction === 'inverse' ? parsed.fromSymbol : parsed.toSymbol;
        return `${directionLabel} ${buildPathAlertQuotePairLabel(quote.chain, fromSymbol, toSymbol, '', options)}`;
      }
      return `${directionLabel} (${formatPathAlertChainLabel(quote.chain, options)}) ${quote.symbol || '--'}`;
    }
    const fromToken = direction === 'inverse' ? quote.toToken : quote.fromToken;
    const toToken = direction === 'inverse' ? quote.fromToken : quote.toToken;
    return `${directionLabel} ${buildPathAlertQuotePairLabel(
      quote.chain,
      shortenPathAlertQuoteToken(fromToken, options),
      shortenPathAlertQuoteToken(toToken, options),
      '',
      options
    )}`;
  }

  function findPathAlertQuoteCandidateForTarget(target, candidates, options = {}) {
    const quoteId = Number(target && target.quoteId);
    if (!Number.isFinite(quoteId)) return null;
    const direction = getPathAlertQuoteDirection(target, options);
    const items = Array.isArray(candidates) ? candidates : [];
    return items.find((candidate) => (
      Number(candidate && candidate.quoteId) === quoteId
      && String(candidate && candidate.direction || 'forward') === direction
      && String(candidate && candidate.pricingMode || 'raw') === 'raw'
    )) || null;
  }

  function buildPathAlertQuotePairText(target, quote, candidates, options = {}) {
    if (!quote) {
      return `报价 #${String(target && target.quoteId || '--')}`;
    }
    const direction = getPathAlertQuoteDirection(target, options);
    if (isPathAlertCexOrderbookChain(quote.chain, options)) {
      const parsed = parsePathAlertCexPair(quote.symbol, options);
      if (parsed) {
        const fromSymbol = direction === 'inverse' ? parsed.toSymbol : parsed.fromSymbol;
        const toSymbol = direction === 'inverse' ? parsed.fromSymbol : parsed.toSymbol;
        return `${formatPathAlertChainLabel(quote.chain, options)} ${fromSymbol}/${toSymbol}`;
      }
      return `${formatPathAlertChainLabel(quote.chain, options)} ${quote.symbol || '--'}`;
    }
    const candidate = findPathAlertQuoteCandidateForTarget(target, candidates, options);
    if (candidate && candidate.fromSymbol && candidate.toSymbol) {
      return `${formatPathAlertChainLabel(quote.chain, options)} ${candidate.fromSymbol}/${candidate.toSymbol}`;
    }
    const fromToken = direction === 'inverse' ? quote.toToken : quote.fromToken;
    const toToken = direction === 'inverse' ? quote.fromToken : quote.toToken;
    return `${formatPathAlertChainLabel(quote.chain, options)} ${shortenPathAlertQuoteToken(fromToken, options)}/${shortenPathAlertQuoteToken(toToken, options)}`;
  }

  function getPathAlertQuoteDefaultNameSuffix(target) {
    if (target && target.ruleKind === 'targetAbove') return '汇率高于';
    if (target && target.ruleKind === 'targetBelow') return '汇率低于';
    if (target && target.ruleKind === 'percentUp') return '上涨提醒';
    if (target && target.ruleKind === 'percentDown') return '下跌提醒';
    return '报警';
  }

  function buildPathAlertDefaultQuoteAlertName(target, quote, candidates, options = {}) {
    if (!target || target.type !== 'quote') return '';
    const pairText = buildPathAlertQuotePairText(target, quote, candidates, options);
    return `${pairText} ${getPathAlertQuoteDefaultNameSuffix(target)}`.trim();
  }

  function buildPathAlertPageSummaryLines(alert, options = {}) {
    const getDisplayTitle = typeof options.getDisplayTitle === 'function'
      ? options.getDisplayTitle
      : () => '';
    const buildQuoteAlertThresholdLine = typeof options.buildQuoteAlertThresholdLine === 'function'
      ? options.buildQuoteAlertThresholdLine
      : () => '--';
    const buildQuoteAlertQuoteLabel = typeof options.buildQuoteAlertQuoteLabel === 'function'
      ? options.buildQuoteAlertQuoteLabel
      : (target) => buildPathAlertQuoteDisplayLabel(target, null, options);
    const buildQuoteAlertRuleLine = typeof options.buildQuoteAlertRuleLine === 'function'
      ? options.buildQuoteAlertRuleLine
      : () => '--';
    const buildPathAlertSummaryLines = typeof options.buildPathAlertSummaryLines === 'function'
      ? options.buildPathAlertSummaryLines
      : null;
    const formatLeg = typeof options.formatLeg === 'function'
      ? options.formatLeg
      : (leg) => buildPathAlertQuotePairLabel(leg && leg.chain, leg && leg.fromSymbol, leg && leg.toSymbol, '', options);
    const findRule = typeof options.findRule === 'function'
      ? options.findRule
      : () => null;

    if (alert && alert.target && alert.target.type === 'quote') {
      const displayTitle = getDisplayTitle(alert);
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
    if (buildPathAlertSummaryLines) {
      return buildPathAlertSummaryLines(alert, {
        formatLeg,
        findRule
      });
    }
    if (!alert || !alert.target) return [];
    if (alert.target.type === 'rule') {
      const rule = findRule(alert.target.ruleKind, alert.target.ruleId);
      return [rule ? rule.title : alert.target.ruleId];
    }
    return (alert.target.legs || []).map(formatLeg);
  }

  function buildDismissedPathAlertPageSummaryLines(entry, options = {}) {
    const lines = Array.isArray(entry && entry.summaryLinesSnapshot)
      ? entry.summaryLinesSnapshot.filter(Boolean)
      : [];
    if (lines.length) return lines;
    if (!entry || !entry.target) return [];
    return buildPathAlertPageSummaryLines({ target: entry.target }, options);
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

  function sanitizeLeg(leg) {
    if (!leg || typeof leg !== 'object') return null;
    const quoteId = Number(leg.quoteId);
    if (!Number.isFinite(quoteId) || quoteId <= 0) return null;
    const direction = leg.direction === 'inverse' ? 'inverse' : 'forward';
    const pricingMode = ['raw', 'cex-bid1', 'cex-ask1-inverse'].includes(leg.pricingMode)
      ? leg.pricingMode
      : 'raw';
    return {
      quoteId,
      direction,
      pricingMode,
      chain: String(leg.chain || ''),
      fromSymbol: String(leg.fromSymbol || ''),
      toSymbol: String(leg.toSymbol || '')
    };
  }

  function sanitizePathAlertDraft(draft) {
    if (!draft || typeof draft !== 'object') return null;
    const target = draft.target || {};
    if (target.type !== 'path' && target.type !== 'rule' && target.type !== 'quote') return null;

    const name = String(draft.name || '').trim();
    if (target.type === 'path') {
      const legs = Array.isArray(target.legs)
        ? target.legs.map(sanitizeLeg).filter(Boolean)
        : [];
      if (!legs.length) return null;
      return {
        name,
        target: {
          type: 'path',
          legs
        }
      };
    }

    if (target.type === 'quote') {
      const quoteId = Number(target.quoteId);
      const direction = target.direction === 'inverse' ? 'inverse' : 'forward';
      const ruleKind = ['targetAbove', 'targetBelow', 'percentUp', 'percentDown'].includes(target.ruleKind)
        ? target.ruleKind
        : '';
      const value = Number(target.value);
      if (!Number.isFinite(quoteId) || !ruleKind || !Number.isFinite(value)) return null;
      const normalizedTarget = {
        type: 'quote',
        quoteId,
        direction,
        ruleKind,
        value
      };
      if (ruleKind === 'percentUp' || ruleKind === 'percentDown') {
        const basePrice = Number(target.basePrice);
        if (!Number.isFinite(basePrice) || basePrice <= 0) return null;
        normalizedTarget.basePrice = basePrice;
      }
      return {
        name,
        target: normalizedTarget
      };
    }

    const ruleKind = target.ruleKind === 'special' ? 'special' : target.ruleKind === 'fixed' ? 'fixed' : '';
    const ruleId = String(target.ruleId || '').trim();
    if (!ruleKind || !ruleId) return null;
    return {
      name,
      target: {
        type: 'rule',
        ruleKind,
        ruleId
      }
    };
  }

  function buildPathAlertsPageHref(options = {}) {
    const mode = sanitizeMode(options.mode);
    const params = new URLSearchParams();
    if (mode !== 'manage') {
      params.set('mode', mode);
    }
    const filterQuoteId = String(options.filterQuoteId || '').trim();
    if (filterQuoteId) {
      params.set('filterQuoteId', filterQuoteId);
    }

    if (mode === 'edit') {
      const alertId = String(options.alertId || '').trim();
      if (alertId) {
        params.set('alertId', alertId);
      }
    }

    if (mode === 'create') {
      const draft = sanitizePathAlertDraft(options.draft);
      if (draft) {
        params.set('draft', JSON.stringify(draft));
      }
    }

    const search = params.toString();
    return search ? `/path-alerts?${search}` : '/path-alerts';
  }

  function parsePathAlertsPagePrefill(input) {
    const raw = String(input || '').trim();
    let url = null;
    try {
      url = new URL(raw.startsWith('http://') || raw.startsWith('https://')
        ? raw
        : (raw.startsWith('/') ? raw : `/${raw}`), 'https://codex.local');
    } catch {
      return {
        mode: 'manage',
        alertId: '',
        filterQuoteId: '',
        draft: null
      };
    }

    const mode = sanitizeMode(url.searchParams.get('mode'));
    const alertId = mode === 'edit'
      ? String(url.searchParams.get('alertId') || '').trim()
      : '';
    const filterQuoteId = String(url.searchParams.get('filterQuoteId') || '').trim();

    let draft = null;
    if (mode === 'create') {
      const draftValue = url.searchParams.get('draft');
      if (draftValue) {
        try {
          draft = sanitizePathAlertDraft(JSON.parse(draftValue));
        } catch {
          draft = null;
        }
      }
    }

    return {
      mode,
      alertId,
      filterQuoteId,
      draft
    };
  }

  function renderPathAlertToolbarHtml(options = {}) {
    const settings = options.settings && typeof options.settings === 'object' ? options.settings : {};
    const dismissedCount = Number.isFinite(Number(options.dismissedCount))
      ? Number(options.dismissedCount)
      : 0;
    return `
            <div class="path-alert-toolbar">
                <div class="path-alert-toolbar-meta">
                    <label class="path-alert-toolbar-toggle">
                        <input type="checkbox" data-path-alert-global-toggle="localSoundEnabled" ${settings.localSoundEnabled !== false ? 'checked' : ''}>
                        <span>音效</span>
                    </label>
                    <label class="path-alert-toolbar-toggle">
                        <input type="checkbox" data-path-alert-global-toggle="webhookEnabled" ${settings.webhookEnabled === true ? 'checked' : ''}>
                        <span>远程</span>
                    </label>
                    <label class="path-alert-toolbar-toggle">
                        <input type="checkbox" data-path-alert-force-immediate ${options.forceImmediateAlerts ? 'checked' : ''}>
                        <span>全部立即</span>
                    </label>
                    <div class="path-alert-toolbar-cycle">周期 ${escapeHtml(settings.pathAlertEvalIntervalMs)}ms</div>
                    <div class="path-alert-toolbar-cycle">已忽略 ${dismissedCount} 条</div>
                </div>
            </div>
        `;
  }

  function renderPathAlertItemHtml(item = {}) {
    const statusTagHtml = item.statusText
      ? `<span class="path-alert-status-tag ${escapeHtml(item.statusClassName)}">${escapeHtml(item.statusText)}</span>`
      : '';
    return `
                <div class="path-alert-item">
                    <div class="path-alert-item-head">
                        <div>
                            <div class="path-alert-item-title">${escapeHtml(item.title)}</div>
                            <div class="path-alert-item-route">${item.routeHtml || ''}</div>
                            <div class="path-alert-item-meta">${escapeHtml(item.metaText)}</div>
                        </div>
                        <div class="path-alert-item-actions">
                            <a
                                class="path-alert-item-link"
                                href="${escapeHtml(item.editHref)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                data-path-alert-edit-link="${escapeHtml(item.alertId)}"
                            >编辑</a>
                            <button type="button" data-path-alert-delete="${escapeHtml(item.alertId)}">删除</button>
                            <button type="button" data-path-alert-dismiss-delete="${escapeHtml(item.alertId)}">标记并删除</button>
                        </div>
                    </div>
                    <div class="path-alert-status-row">
                        ${statusTagHtml}
                        <span class="path-alert-profit">${escapeHtml(item.evaluationText)}</span>
                    </div>
                    <div class="path-alert-item-meta">上次报警: ${escapeHtml(item.lastTriggeredText || '--')}</div>
                </div>
            `;
  }

  function renderPathAlertRouteLinesHtml(lines, className = 'path-alert-item-route-line', options = {}) {
    const safeClassName = String(className || 'path-alert-item-route-line');
    const sourceLines = Array.isArray(lines) ? lines : [];
    const safeLines = options.filterEmpty === false ? sourceLines : sourceLines.filter(Boolean);
    if (!safeLines.length) {
      return `<div class="${escapeHtml(safeClassName)}">--</div>`;
    }
    return safeLines
      .map((line) => `<div class="${escapeHtml(safeClassName)}">${escapeHtml(line)}</div>`)
      .join('');
  }

  function renderPathAlertSummaryLinesHtml(lines) {
    return renderPathAlertRouteLinesHtml(lines, 'path-alert-item-route-line', { filterEmpty: false });
  }

  function renderPathAlertPanelHtml(options = {}) {
    const toolbarHtml = renderPathAlertToolbarHtml(options);
    const items = Array.isArray(options.items) ? options.items : [];
    if (!items.length) {
      return `${toolbarHtml}<div class="path-alert-empty">${escapeHtml(options.emptyText || '暂无路径报警')}</div>`;
    }
    return `${toolbarHtml}<div class="path-alert-list">${items.map(renderPathAlertItemHtml).join('')}</div>`;
  }

  function buildPathAlertMetaText(alert, options = {}) {
    const triggerText = alert && alert.triggerMode === 'delayed'
      ? `延迟 ${String(alert.confirmDelaySec)}s`
      : '立即';
    const cooldownText = `冷却 ${String(alert && alert.cooldownSec)}s`;
    if (alert && alert.target && alert.target.type === 'quote') {
      return `报价 | ${String(alert.target.value != null ? alert.target.value : '--')} | ${triggerText} | ${cooldownText}`;
    }
    if (alert && alert.target && alert.target.type === 'rule' && alert.target.ruleKind === 'special') {
      const specialRuleConfig = typeof options.resolveSpecialRuleConfig === 'function'
        ? options.resolveSpecialRuleConfig(alert)
        : {};
      return [
        `净收益 > ${String(specialRuleConfig.minNetProfit != null ? specialRuleConfig.minNetProfit : '--')}`,
        `净收益率 > ${String(specialRuleConfig.minNetProfitBp != null ? specialRuleConfig.minNetProfitBp : '--')}bp`,
        triggerText,
        cooldownText
      ].join(' | ');
    }
    return `阈值 ${String(alert && alert.thresholdBp)}bp | ${triggerText} | ${cooldownText}`;
  }

  function getTargetLegCount(target) {
    return Array.isArray(target && target.legs) ? target.legs.length : 0;
  }

  function buildPathAlertCardTitle(alert, options = {}) {
    const getDisplayTitle = typeof options.getDisplayTitle === 'function'
      ? options.getDisplayTitle
      : () => '';
    const buildQuoteLabel = typeof options.buildQuoteLabel === 'function'
      ? options.buildQuoteLabel
      : null;
    const title = getDisplayTitle(alert);
    if (title) return title;

    const target = alert && alert.target ? alert.target : null;
    if (target && target.type === 'quote') {
      return buildQuoteLabel ? buildQuoteLabel(target) : '交易对报警';
    }
    if (target && target.type === 'rule') {
      return target.ruleKind === 'fixed' ? '固定规则' : '特殊规则';
    }

    const legCount = getTargetLegCount(target);
    return legCount > 0 ? `路径规则 (${legCount}腿)` : '路径规则';
  }

  function buildDismissedTargetCardTitle(entry) {
    const target = entry && entry.target ? entry.target : null;
    if (!target) return '已忽略规则';
    if (target.type === 'quote') return '已忽略交易对报警';
    if (target.type === 'rule') {
      return target.ruleKind === 'fixed' ? '已忽略固定规则' : '已忽略特殊规则';
    }
    const legCount = getTargetLegCount(target);
    return legCount > 0 ? `已忽略手工路径 (${legCount}腿)` : '已忽略手工路径';
  }

  function getPathAlertTypeLabel(alert) {
    const target = alert && alert.target ? alert.target : null;
    if (target && target.type === 'quote') return '交易对';
    if (target && target.type === 'rule') {
      return target.ruleKind === 'fixed' ? '固定' : '特殊';
    }
    return '路径';
  }

  function buildPathAlertCardValueText(alert, resolveSpecialRuleConfig) {
    const target = alert && alert.target ? alert.target : null;
    if (target && target.type === 'quote') {
      return String(target.value != null ? target.value : '--');
    }
    if (target && target.type === 'rule' && target.ruleKind === 'special') {
      const specialRuleConfig = resolveSpecialRuleConfig(alert && alert.specialRuleConfig);
      return `>${String(specialRuleConfig.minNetProfit != null ? specialRuleConfig.minNetProfit : '--')} / >${String(specialRuleConfig.minNetProfitBp != null ? specialRuleConfig.minNetProfitBp : '--')}bp`;
    }
    return `${String(alert && alert.thresholdBp != null ? alert.thresholdBp : '--')}bp`;
  }

  function buildPathAlertCardMetaText(alert, options = {}) {
    const resolveSpecialRuleConfig = typeof options.resolveSpecialRuleConfig === 'function'
      ? options.resolveSpecialRuleConfig
      : (config) => (config && typeof config === 'object' ? config : {});
    const triggerLabel = alert && alert.triggerMode === 'delayed'
      ? `⏱${Number(alert.confirmDelaySec || 0)}s`
      : '⚡立即';
    const statusLabel = alert && alert.enabled === false ? '⛔' : '✅';
    return [
      `🏷️${getPathAlertTypeLabel(alert)}`,
      `🎯${buildPathAlertCardValueText(alert, resolveSpecialRuleConfig)}`,
      triggerLabel,
      `❄️${String(alert && alert.cooldownSec != null ? alert.cooldownSec : '--')}s`,
      statusLabel
    ].join(' · ');
  }

  function buildDismissedTargetMetaText(entry, options = {}) {
    const formatDate = typeof options.formatDate === 'function'
      ? options.formatDate
      : (value) => new Date(value).toLocaleString();
    const dismissedAtText = entry && entry.dismissedAt ? formatDate(entry.dismissedAt) : '--';
    return `🗃️已忽略 · 🕒${dismissedAtText}`;
  }

  function isQuoteScopedAlertTarget(target, quoteId) {
    const filterQuoteId = String(quoteId || '').trim();
    if (!filterQuoteId) return true;
    return Boolean(
      target
      && target.type === 'quote'
      && String(target.quoteId) === filterQuoteId
    );
  }

  function filterAlertsByQuoteId(alerts, quoteId) {
    const items = Array.isArray(alerts) ? alerts : [];
    return items.filter((alert) => isQuoteScopedAlertTarget(alert && alert.target, quoteId));
  }

  function filterDismissedTargetsByQuoteId(entries, quoteId) {
    const items = Array.isArray(entries) ? entries : [];
    return items.filter((entry) => isQuoteScopedAlertTarget(entry && entry.target, quoteId));
  }

  function pruneSelectionSet(selection, validIds) {
    const validIdSet = new Set((Array.isArray(validIds) ? validIds : []).map((id) => String(id || '')));
    return new Set(
      Array.from(selection instanceof Set ? selection : new Set(selection || []))
        .filter((id) => validIdSet.has(String(id || '')))
    );
  }

  function groupAlertsBySection(alerts) {
    const grouped = {
      quote: [],
      rule: [],
      path: [],
      special: []
    };
    for (const alert of (Array.isArray(alerts) ? alerts : [])) {
      if (!alert || !alert.target) continue;
      if (alert.target.type === 'quote') {
        grouped.quote.push(alert);
        continue;
      }
      if (alert.target.type === 'rule') {
        if (alert.target.ruleKind === 'special') grouped.special.push(alert);
        else grouped.rule.push(alert);
        continue;
      }
      grouped.path.push(alert);
    }
    return grouped;
  }

  function buildPathAlertSectionConfigs(grouped, options = {}) {
    const groups = grouped && typeof grouped === 'object' ? grouped : {};
    const hasQuoteFilter = Boolean(String(options.filterQuoteId || '').trim());
    return [
      {
        key: 'quote',
        id: 'quote-alert-section',
        title: '交易对报警',
        note: hasQuoteFilter ? '当前交易对上下文' : '按交易对汇率分组',
        items: Array.isArray(groups.quote) ? groups.quote : [],
        tagClass: 'quote'
      },
      {
        key: 'rule',
        id: 'rule-alert-section',
        title: '固定规则',
        note: '直接展示实际路径腿',
        items: Array.isArray(groups.rule) ? groups.rule : [],
        tagClass: 'rule'
      },
      {
        key: 'path',
        id: 'path-manual-section',
        title: '手工路径',
        note: '保留完整 legs',
        items: Array.isArray(groups.path) ? groups.path : [],
        tagClass: 'path'
      },
      {
        key: 'special',
        id: 'special-alert-section',
        title: '特殊规则',
        note: '特殊聚合逻辑',
        items: Array.isArray(groups.special) ? groups.special : [],
        tagClass: 'special'
      }
    ];
  }

  return {
    sanitizePathAlertDraft,
    buildDismissedTargetCardTitle,
    buildDismissedTargetMetaText,
    buildPathAlertEditorDraftFromAlert,
    buildPathAlertEditorDraftFromPrefill,
    buildPathAlertEditorTarget,
    buildPathAlertCardMetaText,
    buildPathAlertCardTitle,
    buildPathAlertDefaultQuoteAlertName,
    buildPathAlertQuoteLabel,
    buildPathAlertQuoteDisplayLabel,
    buildPathAlertQuotePairText,
    buildPathAlertPageSummaryLines,
    buildPathAlertSectionConfigs,
    buildPathAlertMetaText,
    buildPathAlertsPageHref,
    buildPathAlertFromEditorDraft,
    buildDismissedPathAlertPageSummaryLines,
    clonePathAlertEditorDraft,
    createPathAlertEditorDraft,
    escapeHtml,
    filterAlertsByQuoteId,
    filterDismissedTargetsByQuoteId,
    groupAlertsBySection,
    parsePathAlertsPagePrefill,
    pruneSelectionSet,
    renderPathAlertItemHtml,
    renderPathAlertPanelHtml,
    renderPathAlertRouteLinesHtml,
    renderPathAlertSummaryLinesHtml,
    renderPathAlertToolbarHtml,
    shortenTokenText,
    validatePathAlertEditorDraft
  };
}));
