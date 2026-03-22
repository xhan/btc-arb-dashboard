(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbRuntimeMemoryUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildRetainedArbOpportunityStore(currentOpportunities, retainedEntries) {
    const nextStore = currentOpportunities instanceof Map
      ? new Map(currentOpportunities)
      : new Map();

    for (const entry of Array.isArray(retainedEntries) ? retainedEntries : []) {
      if (!entry || !entry.id || nextStore.has(entry.id)) continue;
      nextStore.set(entry.id, entry);
    }

    return nextStore;
  }

  function trimContainerChildren(container, maxEntries) {
    const limit = Number.isFinite(Number(maxEntries)) ? Math.max(0, Math.floor(Number(maxEntries))) : 0;
    if (!container || !container.children || typeof container.children.length !== 'number') return 0;

    let removedCount = 0;
    while (container.children.length > limit) {
      const child = container.children[container.children.length - 1];
      if (!child || typeof child.remove !== 'function') break;
      child.remove();
      removedCount += 1;
    }

    return removedCount;
  }

  return {
    buildRetainedArbOpportunityStore,
    trimContainerChildren
  };
}));
