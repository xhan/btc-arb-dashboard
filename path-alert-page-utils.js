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

  return {
    sanitizePathAlertDraft,
    buildPathAlertsPageHref,
    parsePathAlertsPagePrefill
  };
}));
