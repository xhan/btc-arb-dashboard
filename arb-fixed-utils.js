(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbFixedUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildFixedRuleEdgeIndex(edges, quoteMetaById) {
    const allEdges = Array.isArray(edges) ? edges : [];
    const metaMap = quoteMetaById instanceof Map ? quoteMetaById : new Map();
    const ruleEdges = [];
    const edgesByCategoryName = new Map();
    const edgeOrder = new Map();

    for (const [index, edge] of allEdges.entries()) {
      if (!edge) continue;
      edgeOrder.set(edge, index);
      if (edge.rule || edge.chain === '规则' || edge.quoteId === undefined || edge.quoteId === null) {
        ruleEdges.push(edge);
        continue;
      }

      const meta = metaMap.get(edge.quoteId);
      const categoryName = meta && meta.categoryName ? String(meta.categoryName) : '';
      if (!categoryName) continue;
      const bucket = edgesByCategoryName.get(categoryName) || [];
      bucket.push(edge);
      edgesByCategoryName.set(categoryName, bucket);
    }

    return {
      allEdges,
      ruleEdges,
      edgesByCategoryName,
      edgeOrder
    };
  }

  function resolveEdgesForFixedRule(rule, edgeIndex) {
    if (!edgeIndex || typeof edgeIndex !== 'object') {
      return [];
    }

    const categoryNames = Array.isArray(rule?.categoryNames)
      ? Array.from(new Set(rule.categoryNames.filter(Boolean)))
      : [];

    if (!categoryNames.length) {
      return Array.isArray(edgeIndex.allEdges) ? edgeIndex.allEdges : [];
    }

    const edgesByCategoryName = edgeIndex.edgesByCategoryName instanceof Map
      ? edgeIndex.edgesByCategoryName
      : new Map();
    const ruleEdges = Array.isArray(edgeIndex.ruleEdges) ? edgeIndex.ruleEdges : [];
    const edgeOrder = edgeIndex.edgeOrder instanceof Map ? edgeIndex.edgeOrder : new Map();

    if (categoryNames.length === 1) {
      const scopedEdges = edgesByCategoryName.get(categoryNames[0]) || [];
      return scopedEdges.concat(ruleEdges);
    }

    const scopedEdges = [];
    for (const categoryName of categoryNames) {
      const bucket = edgesByCategoryName.get(categoryName) || [];
      for (const edge of bucket) {
        scopedEdges.push(edge);
      }
    }

    scopedEdges.sort((left, right) => Number(edgeOrder.get(left)) - Number(edgeOrder.get(right)));
    return scopedEdges.concat(ruleEdges);
  }

  function filterEdgesForFixedRule(rule, edges, quoteMetaById) {
    return resolveEdgesForFixedRule(rule, buildFixedRuleEdgeIndex(edges, quoteMetaById));
  }

  return {
    buildFixedRuleEdgeIndex,
    resolveEdgesForFixedRule,
    filterEdgesForFixedRule
  };
}));
