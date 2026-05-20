(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.ArbAlertBridgeUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.ArbAlertBridgeUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeTargetKey(targetKey) {
    return String(targetKey || '').trim();
  }

  function getOpportunityIdsForTarget(opportunityRuntime, targetKey) {
    const key = normalizeTargetKey(targetKey);
    if (!key || !opportunityRuntime || typeof opportunityRuntime.getOpportunityIdsForTarget !== 'function') {
      return [];
    }
    const ids = opportunityRuntime.getOpportunityIdsForTarget(key);
    return Array.isArray(ids) ? ids.filter(Boolean).map((id) => String(id)) : [];
  }

  function markOpportunityHighlights(highlightRuntime, opportunityIds, nowMs) {
    if (!highlightRuntime || typeof highlightRuntime.mark !== 'function') return false;
    if (!Array.isArray(opportunityIds) || !opportunityIds.length) return false;
    return highlightRuntime.mark(opportunityIds, nowMs) === true;
  }

  function createArbAlertBridgeRuntime(options = {}) {
    const opportunityRuntime = options.opportunityRuntime || options.arbOpportunityRuntime || null;
    const highlightRuntime = options.highlightRuntime || options.arbOpportunityHighlightRuntime || null;

    function markTriggeredOpportunities(targetKey, nowMs) {
      const opportunityIds = getOpportunityIdsForTarget(opportunityRuntime, targetKey);
      return markOpportunityHighlights(highlightRuntime, opportunityIds, nowMs);
    }

    return {
      getOpportunityIdsForTarget: (targetKey) => getOpportunityIdsForTarget(opportunityRuntime, targetKey),
      markTriggeredOpportunities
    };
  }

  return {
    createArbAlertBridgeRuntime,
    getOpportunityIdsForTarget,
    markOpportunityHighlights,
    normalizeTargetKey
  };
});
