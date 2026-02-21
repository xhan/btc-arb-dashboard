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

function formatLegLine({ from, to, rate, chainLabel, precision = 6 }) {
  const label = chainLabel ? `（${chainLabel}）` : '';
  const safeFrom = from || '';
  const safeTo = to || '';
  const safeRate = typeof rate === 'number' ? rate.toFixed(precision) : '--';
  return `${label}${safeFrom} -> ${safeTo} @${safeRate}`;
}

function formatProfitWanfen(profitRate, precision = 2) {
  if (typeof profitRate !== 'number') return '--';
  const wanfen = profitRate * 10000;
  return `${wanfen >= 0 ? '+' : ''}${wanfen.toFixed(precision)}‱`;
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

function buildRuleEdges(aliases) {
  const edges = [];
  if (!aliases) return edges;

  for (const [alias, target] of Object.entries(aliases)) {
    if (!alias || !target) continue;
    edges.push({ from: alias, to: target, rate: 1, chain: '规则', rule: true });
    edges.push({ from: target, to: alias, rate: 1, chain: '规则', rule: true });
  }

  return edges;
}

function findBestCycle(edges, options = {}) {
  const maxDepth = Number(options.maxDepth) || 4;
  const acceptCycle = typeof options.acceptCycle === 'function' ? options.acceptCycle : null;
  let best = null;

  const adjacency = new Map();
  for (const edge of edges) {
    if (!edge || !edge.from || !edge.to || typeof edge.rate !== 'number') continue;
    const list = adjacency.get(edge.from) || [];
    list.push(edge);
    adjacency.set(edge.from, list);
  }

  function dfs(start, current, visited, path, product) {
    if (path.length > maxDepth) return;

    const neighbors = adjacency.get(current) || [];
    for (const edge of neighbors) {
      const next = edge.to;
      const nextProduct = product * edge.rate;

      if (next === start && path.length >= 1) {
        const profitRate = nextProduct - 1;
        const legs = path.concat(edge);
        if (acceptCycle && !acceptCycle(legs)) {
          continue;
        }
        if (!best || profitRate > best.profitRate) {
          best = { legs, profitRate };
        }
        continue;
      }

      if (visited.has(next)) continue;
      if (path.length + 1 >= maxDepth) continue;

      visited.add(next);
      dfs(start, next, visited, path.concat(edge), nextProduct);
      visited.delete(next);
    }
  }

  for (const start of adjacency.keys()) {
    const visited = new Set([start]);
    dfs(start, start, visited, [], 1);
  }

  return best;
}

function findTopCycles(edges, options = {}) {
  const maxDepth = Number(options.maxDepth) || 4;
  const limit = Number(options.limit) || 3;
  const acceptCycle = typeof options.acceptCycle === 'function' ? options.acceptCycle : null;
  const results = [];
  const seen = new Set();

  const adjacency = new Map();
  for (const edge of edges) {
    if (!edge || !edge.from || !edge.to || typeof edge.rate !== 'number') continue;
    const list = adjacency.get(edge.from) || [];
    list.push(edge);
    adjacency.set(edge.from, list);
  }

  function recordCycle(legs, profitRate) {
    if (acceptCycle && !acceptCycle(legs)) return;
    const key = legs.map((leg) => `${leg.from}|${leg.to}|${leg.chain || ''}|${leg.rate}`).join('>');
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ legs, profitRate });
  }

  function dfs(start, current, visited, path, product) {
    if (path.length > maxDepth) return;

    const neighbors = adjacency.get(current) || [];
    for (const edge of neighbors) {
      const next = edge.to;
      const nextProduct = product * edge.rate;

      if (next === start && path.length >= 1) {
        recordCycle(path.concat(edge), nextProduct - 1);
        continue;
      }

      if (visited.has(next)) continue;
      if (path.length + 1 >= maxDepth) continue;

      visited.add(next);
      dfs(start, next, visited, path.concat(edge), nextProduct);
      visited.delete(next);
    }
  }

  for (const start of adjacency.keys()) {
    const visited = new Set([start]);
    dfs(start, start, visited, [], 1);
  }

  results.sort((a, b) => b.profitRate - a.profitRate);
  return results.slice(0, Math.max(0, limit));
}

function resolveAlias(symbol, aliases) {
  if (!aliases) return symbol;
  const normalizedSymbol = normalizeSymbol(symbol);
  for (const [alias, target] of Object.entries(aliases)) {
    if (normalizeSymbol(alias) === normalizedSymbol) {
      return target;
    }
  }
  return symbol;
}

function selectBestEdgeByChain(edges, from, to, chain, aliases) {
  if (!chain) return null;
  const targetFrom = resolveAlias(from, aliases);
  const targetTo = resolveAlias(to, aliases);
  const normalizedTargetFrom = normalizeSymbol(targetFrom);
  const normalizedTargetTo = normalizeSymbol(targetTo);
  let best = null;

  for (const edge of edges || []) {
    if (edge.chain !== chain) continue;
    const edgeFrom = resolveAlias(edge.from, aliases);
    const edgeTo = resolveAlias(edge.to, aliases);
    if (normalizeSymbol(edgeFrom) !== normalizedTargetFrom || normalizeSymbol(edgeTo) !== normalizedTargetTo) continue;
    if (!best || edge.rate > best.rate) {
      best = { ...edge, from: targetFrom, to: targetTo };
    }
  }

  return best;
}

function buildTwoStepFixedPath(edges, rule, chainA, chainB, aliases) {
  const legA = selectBestEdgeByChain(edges, rule.base, rule.quote, chainA, aliases);
  const legB = selectBestEdgeByChain(edges, rule.quote, rule.base, chainB, aliases);
  if (!legA || !legB) return null;
  return { legs: [legA, legB], profitRate: (legA.rate * legB.rate) - 1 };
}

function findBestFixedPath(edges, rule, aliases) {
  if (!rule || rule.steps !== 2) return null;
  const chains = Array.isArray(rule.chains) ? rule.chains : [];
  const [chainA, chainB] = chains;
  if (!rule.base || !rule.quote || !chainA || !chainB) return null;

  const forward = buildTwoStepFixedPath(edges, rule, chainA, chainB, aliases);
  const reverse = buildTwoStepFixedPath(edges, rule, chainB, chainA, aliases);
  if (!forward) return reverse;
  if (!reverse) return forward;
  return forward.profitRate >= reverse.profitRate ? forward : reverse;
}

function selectBestDirectEdge(edges, from, to, aliases) {
  const targetFrom = resolveAlias(from, aliases);
  const targetTo = resolveAlias(to, aliases);
  const normalizedTargetFrom = normalizeSymbol(targetFrom);
  const normalizedTargetTo = normalizeSymbol(targetTo);
  let best = null;

  for (const edge of edges || []) {
    const edgeFrom = resolveAlias(edge.from, aliases);
    const edgeTo = resolveAlias(edge.to, aliases);
    if (normalizeSymbol(edgeFrom) !== normalizedTargetFrom || normalizeSymbol(edgeTo) !== normalizedTargetTo) continue;
    if (!best || edge.rate > best.rate) {
      best = { ...edge, from: targetFrom, to: targetTo };
    }
  }

  return best;
}

function isMeaningfulPath(legs) {
  if (!Array.isArray(legs) || legs.length === 0) return false;
  return legs.some((leg) => leg && !leg.rule && leg.chain !== '规则');
}

function buildApi() {
  return {
    buildEdges,
    findBestTwoStepCycle,
    formatLegLine,
    formatProfitWanfen,
    buildRuleEdges,
    findBestCycle,
    findTopCycles,
    findBestFixedPath,
    selectBestDirectEdge,
    isMeaningfulPath
  };
}

(function attachApi(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ArbPaths = factory();
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), buildApi);
