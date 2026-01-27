function normalizeSymbol(symbol) {
  return (symbol || '').toUpperCase();
}

function buildEdges(quotes, quoteStateById, allowedSymbols) {
  const allowSet = Array.isArray(allowedSymbols)
    ? new Set(allowedSymbols.map((item) => item.toUpperCase()))
    : null;

  const edges = [];
  for (const quote of quotes || []) {
    const state = quoteStateById.get(quote.id);
    if (!state) continue;

    const from = state.fromSymbol;
    const to = state.toSymbol;
    const rate = state.lastRawPrice;

    if (from && to && typeof rate === 'number') {
      if (!allowSet || (allowSet.has(normalizeSymbol(from)) && allowSet.has(normalizeSymbol(to)))) {
        edges.push({ from, to, rate, chain: quote.chain, quoteId: quote.id });
      }
    }

    if (quote.showInverse && typeof state.inverseRawPrice === 'number' && from && to) {
      if (!allowSet || (allowSet.has(normalizeSymbol(from)) && allowSet.has(normalizeSymbol(to)))) {
        edges.push({ from: to, to: from, rate: state.inverseRawPrice, chain: quote.chain, quoteId: quote.id, inverse: true });
      }
    }
  }

  return edges;
}

function findBestTwoStepCycle(edges) {
  let best = null;

  for (const first of edges) {
    for (const second of edges) {
      if (first.to !== second.from) continue;
      if (second.to !== first.from) continue;

      const product = first.rate * second.rate;
      const profitRate = product - 1;

      if (!best || profitRate > best.profitRate) {
        best = { legs: [first, second], profitRate };
      }
    }
  }

  return best;
}

module.exports = { buildEdges, findBestTwoStepCycle };

if (typeof window !== 'undefined') {
  window.ArbPaths = { buildEdges, findBestTwoStepCycle };
}
