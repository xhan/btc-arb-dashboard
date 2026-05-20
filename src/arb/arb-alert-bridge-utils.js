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
    const invalidateArbRuleSnapshotCache = typeof options.invalidateArbRuleSnapshotCache === 'function'
      ? options.invalidateArbRuleSnapshotCache
      : null;
    const updateArbPanel = typeof options.updateArbPanel === 'function'
      ? options.updateArbPanel
      : null;
    const closeArbDetailModal = typeof options.closeArbDetailModal === 'function'
      ? options.closeArbDetailModal
      : null;
    const renderArbDetailModal = typeof options.renderArbDetailModal === 'function'
      ? options.renderArbDetailModal
      : null;
    const isArbDetailVisible = typeof options.isArbDetailVisible === 'function'
      ? options.isArbDetailVisible
      : () => false;
    const getAlertRuntimeController = typeof options.getAlertRuntimeController === 'function'
      ? options.getAlertRuntimeController
      : () => options.alertRuntimeController || null;

    function getAlertRuntime() {
      return getAlertRuntimeController();
    }

    function markTriggeredOpportunities(targetKey, nowMs) {
      const opportunityIds = getOpportunityIdsForTarget(opportunityRuntime, targetKey);
      return markOpportunityHighlights(highlightRuntime, opportunityIds, nowMs);
    }

    function invalidateRuleSnapshot() {
      if (!invalidateArbRuleSnapshotCache) return false;
      invalidateArbRuleSnapshotCache();
      return true;
    }

    function refreshArbPanel() {
      if (!updateArbPanel) return false;
      updateArbPanel();
      return true;
    }

    function refreshArbViewsAfterMutedPathLegChange(options = {}) {
      const result = {
        closedDetail: false,
        renderedDetail: false,
        updatedPanel: false
      };

      result.updatedPanel = refreshArbPanel();
      if (options.closeDetail !== false) {
        if (closeArbDetailModal) {
          closeArbDetailModal();
          result.closedDetail = true;
        }
        return result;
      }
      if (isArbDetailVisible() && renderArbDetailModal) {
        renderArbDetailModal();
        result.renderedDetail = true;
      }
      return result;
    }

    function getActiveMutedPathLegs(nowMs) {
      const alertRuntime = getAlertRuntime();
      if (!alertRuntime) return [];
      if (typeof alertRuntime.pruneMutedPathLegsInPlace === 'function') {
        alertRuntime.pruneMutedPathLegsInPlace(nowMs);
      }
      if (typeof alertRuntime.getMutedPathLegs !== 'function') return [];
      const mutedPathLegs = alertRuntime.getMutedPathLegs();
      return Array.isArray(mutedPathLegs) ? mutedPathLegs : [];
    }

    function buildMutedPathTargetKey(alertOrTarget) {
      const alertRuntime = getAlertRuntime();
      if (!alertRuntime || typeof alertRuntime.buildMutedPathTargetKey !== 'function') return '';
      return alertRuntime.buildMutedPathTargetKey(alertOrTarget);
    }

    function buildMutedPathTargetFromCycleLegs(legs) {
      const alertRuntime = getAlertRuntime();
      if (!alertRuntime || typeof alertRuntime.buildMutedPathTargetFromCycleLegs !== 'function') return null;
      return alertRuntime.buildMutedPathTargetFromCycleLegs(legs);
    }

    return {
      buildMutedPathTargetFromCycleLegs,
      buildMutedPathTargetKey,
      getActiveMutedPathLegs,
      getOpportunityIdsForTarget: (targetKey) => getOpportunityIdsForTarget(opportunityRuntime, targetKey),
      invalidateRuleSnapshot,
      refreshArbViewsAfterMutedPathLegChange,
      refreshArbPanel,
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
