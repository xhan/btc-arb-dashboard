(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbFixedUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function filterEdgesForFixedRule(rule, edges, quoteMetaById) {
    const categoryNames = Array.isArray(rule?.categoryNames)
      ? rule.categoryNames.filter(Boolean)
      : [];

    if (!categoryNames.length) {
      return Array.isArray(edges) ? edges : [];
    }

    const allowSet = new Set(categoryNames);
    const metaMap = quoteMetaById instanceof Map ? quoteMetaById : new Map();

    return (edges || []).filter((edge) => {
      if (!edge) return false;
      if (edge.rule || edge.chain === '规则' || edge.quoteId === undefined || edge.quoteId === null) {
        return true;
      }
      const meta = metaMap.get(edge.quoteId);
      return meta && allowSet.has(meta.categoryName);
    });
  }

  return {
    filterEdgesForFixedRule
  };
}));
