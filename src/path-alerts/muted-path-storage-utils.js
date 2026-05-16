(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./path-alert-utils'));
    return;
  }
  root.MutedPathStorageUtils = factory(root.PathAlertUtils);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (pathAlertUtils) {
  const DEFAULT_MUTED_PATH_STORAGE_LIMIT = 200;
  const MUTED_PATH_TARGETS_STORAGE_KEY = 'mutedPathTargets';
  const MUTED_PATH_LEGS_STORAGE_KEY = 'mutedPathLegs';

  function reportStorageError(options = {}, error) {
    if (typeof options.onError === 'function') {
      options.onError(error);
    }
  }

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

  function readJsonArrayFromStorage(storage, key, options = {}) {
    if (!storage || typeof storage.getItem !== 'function') return [];
    try {
      const raw = storage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      reportStorageError(options, error);
    }
    return [];
  }

  function loadMutedPathTargetsFromStorage(storage, options = {}) {
    const entries = readJsonArrayFromStorage(storage, MUTED_PATH_TARGETS_STORAGE_KEY, options);
    return normalizeStoredMutedPathTargets(entries);
  }

  function loadMutedPathLegsFromStorage(storage, options = {}) {
    const entries = readJsonArrayFromStorage(storage, MUTED_PATH_LEGS_STORAGE_KEY, options);
    const mutedPathLegUtils = options.mutedPathLegUtils || null;
    if (mutedPathLegUtils && typeof mutedPathLegUtils.pruneExpiredMutedPathLegs === 'function') {
      const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
      return mutedPathLegUtils.pruneExpiredMutedPathLegs(entries, nowMs);
    }
    return entries;
  }

  function createMutedPathStorageRuntime(options = {}) {
    const getStorage = typeof options.getStorage === 'function' ? options.getStorage : () => options.storage || null;
    const getMutedPathLegUtils = typeof options.getMutedPathLegUtils === 'function'
      ? options.getMutedPathLegUtils
      : () => options.mutedPathLegUtils || null;

    function loadTargets() {
      return loadMutedPathTargetsFromStorage(getStorage(), {
        onError: options.onTargetsLoadError
      });
    }

    function loadLegs() {
      return loadMutedPathLegsFromStorage(getStorage(), {
        mutedPathLegUtils: getMutedPathLegUtils(),
        nowMs: options.nowMs,
        onError: options.onLegsLoadError
      });
    }

    function persistTargets(entries, persistOptions = {}) {
      return persistMutedPathTargetsToStorage(getStorage(), entries, {
        onError: options.onTargetsPersistError,
        ...persistOptions
      });
    }

    function persistLegs(entries, persistOptions = {}) {
      return persistMutedPathLegsToStorage(getStorage(), entries, {
        onError: options.onLegsPersistError,
        ...persistOptions,
        mutedPathLegUtils: persistOptions.mutedPathLegUtils || getMutedPathLegUtils()
      });
    }

    return {
      loadLegs,
      loadTargets,
      persistLegs,
      persistTargets
    };
  }

  function writeJsonArrayToStorage(storage, key, entries, options = {}) {
    if (!storage || typeof storage.setItem !== 'function') return null;
    const list = Array.isArray(entries) ? entries : [];
    try {
      storage.setItem(key, JSON.stringify(list));
      return list;
    } catch (error) {
      reportStorageError(options, error);
    }
    return null;
  }

  function persistMutedPathTargetsToStorage(storage, entries, options = {}) {
    const list = trimMutedPathTargetsForStorage(entries, options.limit);
    return writeJsonArrayToStorage(storage, MUTED_PATH_TARGETS_STORAGE_KEY, list, options);
  }

  function persistMutedPathLegsToStorage(storage, entries, options = {}) {
    const mutedPathLegUtils = options.mutedPathLegUtils || null;
    const list = mutedPathLegUtils && typeof mutedPathLegUtils.trimMutedPathLegsForStorage === 'function'
      ? mutedPathLegUtils.trimMutedPathLegsForStorage(entries, options.limit)
      : (Array.isArray(entries) ? entries.slice() : []);
    return writeJsonArrayToStorage(storage, MUTED_PATH_LEGS_STORAGE_KEY, list, options);
  }

  return {
    DEFAULT_MUTED_PATH_STORAGE_LIMIT,
    MUTED_PATH_LEGS_STORAGE_KEY,
    MUTED_PATH_TARGETS_STORAGE_KEY,
    createMutedPathStorageRuntime,
    loadMutedPathLegsFromStorage,
    loadMutedPathTargetsFromStorage,
    normalizeStoredMutedPathTargets,
    persistMutedPathLegsToStorage,
    persistMutedPathTargetsToStorage,
    trimMutedPathTargetsForStorage
  };
}));
