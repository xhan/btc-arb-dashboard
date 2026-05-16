(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../../path-alert-utils'));
    return;
  }
  root.MutedPathStorageUtils = factory(root.PathAlertUtils);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (pathAlertUtils) {
  const DEFAULT_MUTED_PATH_STORAGE_LIMIT = 200;

  function normalizeStoredMutedPathTargets(input) {
    if (!pathAlertUtils || typeof pathAlertUtils.normalizeMutedPathTarget !== 'function') {
      return [];
    }
    const items = Array.isArray(input) ? input : [];
    return items.map((entry) => pathAlertUtils.normalizeMutedPathTarget(entry)).filter(Boolean);
  }

  function trimMutedPathTargetsForStorage(entries, limit = DEFAULT_MUTED_PATH_STORAGE_LIMIT) {
    const items = Array.isArray(entries) ? entries.slice() : [];
    const max = Number.isFinite(Number(limit)) && Number(limit) > 0
      ? Math.floor(Number(limit))
      : DEFAULT_MUTED_PATH_STORAGE_LIMIT;
    if (items.length <= max) return items;
    return items
      .sort((left, right) => Number(left && left.mutedAt) - Number(right && right.mutedAt))
      .slice(items.length - max);
  }

  return {
    DEFAULT_MUTED_PATH_STORAGE_LIMIT,
    normalizeStoredMutedPathTargets,
    trimMutedPathTargetsForStorage
  };
}));
