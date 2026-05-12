(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./arb-paths'));
    return;
  }
  root.ArbPathTemplateCacheUtils = factory(root.ArbPaths);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (arbPathsApi) {
  function resolveAlias(symbol, aliases) {
    if (!aliases) return symbol;
    for (const [alias, target] of Object.entries(aliases)) {
      if (alias === symbol) return target;
    }
    return symbol;
  }

  function isQuotePaused(quote) {
    return Boolean(quote && quote.paused === true);
  }

  function isCrossChainQuote(quote) {
    const fromChain = String(quote && quote.chain || '').trim().toLowerCase();
    const toChain = String(quote && quote.toChain || '').trim().toLowerCase();
    return Boolean(fromChain && toChain && fromChain !== toChain);
  }

  function getActiveQuotes(quotes) {
    return Array.isArray(quotes) ? quotes.filter((quote) => !isQuotePaused(quote)) : [];
  }

  function buildArbPathTopologyCacheKey(dashboardState, quoteStateById) {
    const stateMap = quoteStateById instanceof Map ? quoteStateById : new Map();
    return (Array.isArray(dashboardState) ? dashboardState : [])
      .map((category) => {
        const quoteSignature = getActiveQuotes(category && category.quotes)
          .map((quote) => {
            const state = stateMap.get(quote.id) || null;
            const fromSymbol = state && state.fromSymbol ? state.fromSymbol : '';
            const toSymbol = state && state.toSymbol ? state.toSymbol : '';
            return [
              String(quote && quote.id || ''),
              String(quote && quote.chain || ''),
              quote && quote.showInverse ? '1' : '0',
              fromSymbol,
              toSymbol
            ].join(':');
          })
          .join(',');
        return `${String(category && category.id || '')}:${String(category && category.name || '')}:${quoteSignature}`;
      })
      .join('|');
  }

  function buildTopologyEdges(quotes, quoteStateById, allowedSymbols) {
    const allowSet = Array.isArray(allowedSymbols)
      ? new Set(allowedSymbols.filter(Boolean))
      : null;
    const stateMap = quoteStateById instanceof Map ? quoteStateById : new Map();
    const edges = [];

    for (const quote of quotes || []) {
      if (!quote || !Number.isFinite(Number(quote.id))) continue;
      if (isCrossChainQuote(quote)) continue;
      const state = stateMap.get(Number(quote.id));
      if (!state || !state.fromSymbol || !state.toSymbol) continue;

      if (!allowSet || (allowSet.has(state.fromSymbol) && allowSet.has(state.toSymbol))) {
        edges.push({
          from: state.fromSymbol,
          to: state.toSymbol,
          rate: 1,
          chain: quote.chain,
          quoteId: Number(quote.id)
        });
      }

      if (quote.showInverse && (!allowSet || (allowSet.has(state.toSymbol) && allowSet.has(state.fromSymbol)))) {
        edges.push({
          from: state.toSymbol,
          to: state.fromSymbol,
          rate: 1,
          chain: quote.chain,
          quoteId: Number(quote.id),
          inverse: true
        });
      }
    }

    return edges;
  }

  function buildCycleTemplates(edges, options = {}) {
    if (!arbPathsApi || typeof arbPathsApi.findTopCycles !== 'function') return [];
    const cycles = arbPathsApi.findTopCycles(Array.isArray(edges) ? edges : [], options);
    return Array.isArray(cycles)
      ? cycles.map((cycle) => ({
          legs: Array.isArray(cycle && cycle.legs) ? cycle.legs.map((leg) => ({ ...leg })) : [],
          profitRate: 0
        }))
      : [];
  }

  function buildFixedPathTemplates(edges, rule, aliases, options = {}) {
    if (!rule || rule.steps !== 2 || !rule.base || !rule.quote) return [];
    const normalizedBase = resolveAlias(rule.base, aliases);
    const normalizedQuote = resolveAlias(rule.quote, aliases);
    const templates = [];
    const seen = new Set();
    const edgeList = Array.isArray(edges) ? edges : [];
    const candidateChains = Array.from(new Set(
      edgeList
        .map((edge) => String(edge && edge.chain || ''))
        .filter((chain) => chain && chain !== '规则')
    ));

    const excludedChains = new Set(
      Array.isArray(rule.excludeChains)
        ? rule.excludeChains.map((chain) => String(chain || '')).filter(Boolean)
        : []
    );

    function pushTemplate(chainA, chainB) {
      if (!chainA || !chainB || chainA === chainB) return;
      if (excludedChains.has(chainA) || excludedChains.has(chainB)) return;
      const hasLegA = edgeList.some((edge) => {
        if (!edge || edge.chain !== chainA) return false;
        return resolveAlias(edge.from, aliases) === normalizedBase && resolveAlias(edge.to, aliases) === normalizedQuote;
      });
      const hasLegB = edgeList.some((edge) => {
        if (!edge || edge.chain !== chainB) return false;
        return resolveAlias(edge.from, aliases) === normalizedQuote && resolveAlias(edge.to, aliases) === normalizedBase;
      });
      if (!hasLegA || !hasLegB) return;
      const legs = [
        { chain: chainA, from: normalizedBase, to: normalizedQuote },
        { chain: chainB, from: normalizedQuote, to: normalizedBase }
      ];
      const preferredStartSymbols = Array.isArray(options.preferredStartSymbols) && options.preferredStartSymbols.length
        ? options.preferredStartSymbols
        : null;
      const canonical = arbPathsApi && typeof arbPathsApi.canonicalizeCycleRotation === 'function'
        ? arbPathsApi.canonicalizeCycleRotation(legs, preferredStartSymbols)
        : {
            legs,
            key: `${chainA}:${normalizedBase}->${normalizedQuote}|${chainB}:${normalizedQuote}->${normalizedBase}`
          };
      const key = canonical.key;
      if (seen.has(key)) return;
      seen.add(key);
      templates.push({
        legs: (preferredStartSymbols ? canonical.legs : legs).map((leg) => ({ ...leg })),
        profitRate: 0,
        key
      });
    }

    const chains = Array.isArray(rule.chains) ? rule.chains.filter(Boolean) : [];
    if (chains.length >= 2) {
      pushTemplate(String(chains[0]), String(chains[1]));
      pushTemplate(String(chains[1]), String(chains[0]));
      return templates;
    }

    if (!rule.crossChain) return [];

    for (let i = 0; i < candidateChains.length; i += 1) {
      for (let j = 0; j < candidateChains.length; j += 1) {
        if (i === j) continue;
        pushTemplate(candidateChains[i], candidateChains[j]);
      }
    }

    return templates;
  }

  function getLiveLegRate(leg, quoteStateById) {
    if (!leg) return null;
    if (leg.rule || leg.chain === '规则') return 1;
    const state = quoteStateById instanceof Map ? quoteStateById.get(Number(leg.quoteId)) : null;
    if (!state) return null;
    if (leg.inverse) {
      return Number.isFinite(state.inverseRawPrice) ? state.inverseRawPrice : null;
    }
    return Number.isFinite(state.lastRawPrice) ? state.lastRawPrice : null;
  }

  function evaluateCycleTemplate(template, quoteStateById) {
    const templateLegs = Array.isArray(template && template.legs) ? template.legs : [];
    if (!templateLegs.length) return null;

    let product = 1;
    const legs = [];
    for (const leg of templateLegs) {
      const rate = getLiveLegRate(leg, quoteStateById);
      if (!Number.isFinite(rate)) {
        return null;
      }
      product *= rate;
      legs.push({ ...leg, rate });
    }

    return {
      legs,
      profitRate: product - 1
    };
  }

  function selectBestLiveEdge(edges, chain, from, to, aliases) {
    if (!chain || !from || !to) return null;
    const targetFrom = resolveAlias(from, aliases);
    const targetTo = resolveAlias(to, aliases);
    let best = null;

    for (const edge of edges || []) {
      if (!edge || edge.chain !== chain) continue;
      const edgeFrom = resolveAlias(edge.from, aliases);
      const edgeTo = resolveAlias(edge.to, aliases);
      if (edgeFrom !== targetFrom || edgeTo !== targetTo) continue;
      if (!best || Number(edge.rate) > Number(best.rate)) {
        best = {
          ...edge,
          rawFrom: edge.rawFrom || edge.from,
          rawTo: edge.rawTo || edge.to,
          from: targetFrom,
          to: targetTo
        };
      }
    }

    return best;
  }

  function evaluateFixedPathTemplate(template, liveEdges, aliases) {
    const templateLegs = Array.isArray(template && template.legs) ? template.legs : [];
    if (!templateLegs.length) return null;

    let product = 1;
    const legs = [];
    for (const leg of templateLegs) {
      const liveLeg = selectBestLiveEdge(liveEdges, leg.chain, leg.from, leg.to, aliases);
      if (!liveLeg || !Number.isFinite(Number(liveLeg.rate))) {
        return null;
      }
      product *= Number(liveLeg.rate);
      legs.push({ ...liveLeg });
    }

    return {
      legs,
      profitRate: product - 1
    };
  }

  return {
    buildArbPathTopologyCacheKey,
    buildTopologyEdges,
    buildCycleTemplates,
    buildFixedPathTemplates,
    evaluateCycleTemplate,
    evaluateFixedPathTemplate
  };
}));
