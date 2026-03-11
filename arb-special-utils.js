(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./arb-paths'));
    return;
  }
  root.ArbSpecialUtils = factory(root.ArbPaths);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (arbPathsApi) {
  function isCexChain(chain) {
    const normalized = String(chain || '').trim().toLowerCase();
    return normalized === 'bybit' || normalized === 'binance';
  }

  function buildEdges(quotes, quoteStateById) {
    const edges = [];
    for (const quote of quotes || []) {
      const state = quoteStateById instanceof Map ? quoteStateById.get(quote.id) : null;
      if (!state) continue;

      if (state.fromSymbol && state.toSymbol && typeof state.lastRawPrice === 'number') {
        edges.push({
          from: state.fromSymbol,
          to: state.toSymbol,
          rate: state.lastRawPrice,
          chain: quote.chain,
          quoteId: quote.id
        });
      }

      if (quote.showInverse && state.fromSymbol && state.toSymbol && typeof state.inverseRawPrice === 'number') {
        edges.push({
          from: state.toSymbol,
          to: state.fromSymbol,
          rate: state.inverseRawPrice,
          chain: quote.chain,
          quoteId: quote.id,
          inverse: true
        });
      }
    }
    return edges;
  }

  function buildDexCexOpportunities(rule, quotes, quoteStateById, aliasRules) {
    if (!arbPathsApi || !rule || !Array.isArray(quotes) || !(quoteStateById instanceof Map)) {
      return [];
    }

    const categoryEdges = buildEdges(quotes, quoteStateById);
    const dexEdges = categoryEdges.filter((edge) => !isCexChain(edge.chain));
    const dexSellLeg = selectBestMatchingEdge(dexEdges, rule.dexBase, rule.dexQuote, aliasRules);
    const dexBuyLeg = selectBestMatchingEdge(dexEdges, rule.dexQuote, rule.dexBase, aliasRules);
    const allowedCexChains = new Set((rule.cexChains || []).map((chain) => String(chain || '').trim().toLowerCase()));

    let bestCexSellLeg = null;
    let bestCexBuyLeg = null;

    for (const quote of quotes) {
      if (!quote || !isCexChain(quote.chain)) continue;
      if (allowedCexChains.size && !allowedCexChains.has(String(quote.chain || '').trim().toLowerCase())) continue;

      const state = quoteStateById.get(quote.id);
      const book = state && state.cexOrderbook;
      if (!state || !book) continue;
      if (state.fromSymbol !== rule.dexQuote || state.toSymbol !== rule.cexQuote) continue;

      if (typeof book.bestBidPrice === 'number') {
        const candidate = {
          from: rule.dexQuote,
          to: rule.cexQuote,
          rate: book.bestBidPrice,
          chain: quote.chain,
          quoteId: quote.id,
          cexLevelLabel: 'bid1',
          cexLevelSize: book.bestBidSize
        };
        if (!bestCexSellLeg || candidate.rate > bestCexSellLeg.rate) {
          bestCexSellLeg = candidate;
        }
      }

      if (typeof book.bestAskPrice === 'number' && book.bestAskPrice > 0) {
        const candidate = {
          from: rule.cexQuote,
          to: rule.dexQuote,
          rate: 1 / book.bestAskPrice,
          chain: quote.chain,
          quoteId: quote.id,
          inverse: true,
          cexLevelLabel: 'ask1',
          cexLevelSize: book.bestAskSize
        };
        if (!bestCexBuyLeg || candidate.rate > bestCexBuyLeg.rate) {
          bestCexBuyLeg = candidate;
        }
      }
    }

    const opportunities = [];

    if (dexSellLeg && bestCexSellLeg) {
      opportunities.push({
        direction: 'dex-to-cex',
        label: rule.title,
        cycle: {
          legs: [dexSellLeg, bestCexSellLeg],
          profitRate: (dexSellLeg.rate * bestCexSellLeg.rate) - 1
        }
      });
    }

    if (bestCexBuyLeg && dexBuyLeg) {
      opportunities.push({
        direction: 'cex-to-dex',
        label: rule.title,
        cycle: {
          legs: [bestCexBuyLeg, dexBuyLeg],
          profitRate: (bestCexBuyLeg.rate * dexBuyLeg.rate) - 1
        }
      });
    }

    return opportunities;
  }

  function resolveAlias(symbol, aliasRules) {
    if (!aliasRules) return symbol;
    for (const [alias, target] of Object.entries(aliasRules)) {
      if (alias === symbol) return target;
    }
    return symbol;
  }

  function selectBestMatchingEdge(edges, from, to, aliasRules) {
    const targetFrom = resolveAlias(from, aliasRules);
    const targetTo = resolveAlias(to, aliasRules);
    let best = null;

    for (const edge of edges || []) {
      if (resolveAlias(edge.from, aliasRules) !== targetFrom) continue;
      if (resolveAlias(edge.to, aliasRules) !== targetTo) continue;
      if (!best || edge.rate > best.rate) {
        best = { ...edge };
      }
    }

    return best;
  }

  function buildSpecialArbOpportunities(options = {}) {
    const rules = Array.isArray(options.rules) ? options.rules : [];
    const opportunities = [];

    for (const rule of rules) {
      if (!rule || rule.type !== 'dex-cex') continue;
      opportunities.push(...buildDexCexOpportunities(
        rule,
        Array.isArray(options.quotes) ? options.quotes : [],
        options.quoteStateById instanceof Map ? options.quoteStateById : new Map(),
        options.aliasRules || null
      ));
    }

    return opportunities.sort((a, b) => b.cycle.profitRate - a.cycle.profitRate);
  }

  return {
    buildSpecialArbOpportunities,
    isCexChain
  };
}));
