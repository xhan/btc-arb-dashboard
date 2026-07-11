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

  function resolveTriggeredArbOpportunityTargetKey(alert, evaluation, options = {}) {
    const buildTargetKey = typeof options.buildTriggeredArbOpportunityHighlightTargetKey === 'function'
      ? options.buildTriggeredArbOpportunityHighlightTargetKey
      : null;
    if (!buildTargetKey) return '';
    return normalizeTargetKey(buildTargetKey(alert, evaluation, {
      buildMutedPathTargetFromCycleLegs: options.buildMutedPathTargetFromCycleLegs,
      buildTargetKey: options.buildMutedPathTargetKey
    }));
  }

  function resolveBuildTriggeredArbOpportunityTargetKey(options = {}) {
    if (typeof options.buildTriggeredArbOpportunityHighlightTargetKey === 'function') {
      return options.buildTriggeredArbOpportunityHighlightTargetKey;
    }
    const arbPanelLayoutUtils = options.arbPanelLayoutUtils || null;
    if (
      arbPanelLayoutUtils
      && typeof arbPanelLayoutUtils.buildTriggeredArbOpportunityHighlightTargetKey === 'function'
    ) {
      return arbPanelLayoutUtils.buildTriggeredArbOpportunityHighlightTargetKey;
    }
    return null;
  }

  function createArbAlertBridgeRuntime(options = {}) {
    const opportunityRuntime = options.opportunityRuntime || options.arbOpportunityRuntime || null;
    const highlightRuntime = options.highlightRuntime || options.arbOpportunityHighlightRuntime || null;
    const arbPanelLayoutUtils = options.arbPanelLayoutUtils || null;
    const fixedPathRules = Array.isArray(options.fixedPathRules) ? options.fixedPathRules : [];
    const specialArbRules = Array.isArray(options.specialArbRules) ? options.specialArbRules : [];
    const specialRuleAlertConfigUtils = options.specialRuleAlertConfigUtils || null;
    const buildTriggeredArbOpportunityHighlightTargetKey = resolveBuildTriggeredArbOpportunityTargetKey(options);
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

    function markTriggeredAlertOpportunity(alert, evaluation, nowMs) {
      const targetKey = resolveTriggeredArbOpportunityTargetKey(alert, evaluation, {
        buildMutedPathTargetFromCycleLegs,
        buildMutedPathTargetKey,
        buildTriggeredArbOpportunityHighlightTargetKey
      });
      return markTriggeredOpportunities(targetKey, nowMs);
    }

    function selectFirstUnmutedDisplayedCycle(cycles, isMutedCandidate) {
      if (
        !arbPanelLayoutUtils
        || typeof arbPanelLayoutUtils.selectFirstUnmutedDisplayedCycle !== 'function'
      ) {
        return null;
      }
      return arbPanelLayoutUtils.selectFirstUnmutedDisplayedCycle(cycles, isMutedCandidate);
    }

    function buildRuleAlertEvaluation(target, alert = null, sharedRuleSnapshot = {}, runtimeOptions = {}) {
      if (!target) return { available: false };
      if (target.ruleKind === 'fixed') {
        const rule = fixedPathRules.find((item) => item.id === target.ruleId) || null;
        if (!rule) return { available: false };
        const cycles = sharedRuleSnapshot && sharedRuleSnapshot.fixedByRuleId
          ? sharedRuleSnapshot.fixedByRuleId[target.ruleId]
          : null;
        const isMutedCycle = typeof runtimeOptions.isMutedCycle === 'function'
          ? runtimeOptions.isMutedCycle
          : () => false;
        const cycle = selectFirstUnmutedDisplayedCycle(cycles, isMutedCycle);
        return cycle
          ? { available: true, profitRate: cycle.profitRate, label: rule.title, cycle }
          : { available: false };
      }

      const rule = specialArbRules.find((item) => item.id === target.ruleId) || null;
      if (!rule) return { available: false };
      const opportunities = sharedRuleSnapshot && sharedRuleSnapshot.specialByRuleId
        ? sharedRuleSnapshot.specialByRuleId[target.ruleId]
        : null;
      const best = Array.isArray(opportunities) ? opportunities[0] : null;
      if (!best || !best.cycle) return { available: false };
      if (
        !specialRuleAlertConfigUtils
        || typeof specialRuleAlertConfigUtils.normalizeSpecialRuleAlertConfig !== 'function'
        || typeof specialRuleAlertConfigUtils.evaluateSpecialRuleTrigger !== 'function'
      ) {
        return { available: false };
      }
      const specialRuleConfig = specialRuleAlertConfigUtils.normalizeSpecialRuleAlertConfig(
        alert && alert.specialRuleConfig
      );
      const triggerEvaluation = specialRuleAlertConfigUtils.evaluateSpecialRuleTrigger(best.stats, specialRuleConfig);
      return {
        available: true,
        profitRate: best.cycle.profitRate,
        label: rule.title,
        cycle: best.cycle,
        meetsTriggerCondition: triggerEvaluation.meetsTriggerCondition === true,
        debugComparison: triggerEvaluation,
        displayMessage: String(best.display_message || ''),
        alertMessage: String(best.alert_message || '')
      };
    }

    function invalidateRuleSnapshot(config = {}) {
      if (!invalidateArbRuleSnapshotCache) return false;
      invalidateArbRuleSnapshotCache(config);
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

      if (options.closeDetail !== false) {
        if (closeArbDetailModal) {
          closeArbDetailModal();
          result.closedDetail = true;
        }
        result.updatedPanel = refreshArbPanel();
        return result;
      }
      result.updatedPanel = refreshArbPanel();
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
      buildRuleAlertEvaluation,
      buildMutedPathTargetFromCycleLegs,
      buildMutedPathTargetKey,
      getActiveMutedPathLegs,
      getOpportunityIdsForTarget: (targetKey) => getOpportunityIdsForTarget(opportunityRuntime, targetKey),
      invalidateRuleSnapshot,
      markTriggeredAlertOpportunity,
      refreshArbViewsAfterMutedPathLegChange,
      refreshArbPanel,
      markTriggeredOpportunities,
      selectFirstUnmutedDisplayedCycle
    };
  }

  return {
    createArbAlertBridgeRuntime,
    getOpportunityIdsForTarget,
    markOpportunityHighlights,
    normalizeTargetKey,
    resolveBuildTriggeredArbOpportunityTargetKey,
    resolveTriggeredArbOpportunityTargetKey
  };
});
