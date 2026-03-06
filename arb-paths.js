function buildEdges(quotes, quoteStateById, allowedSymbols) {
  const allowSet = Array.isArray(allowedSymbols)
    ? new Set(allowedSymbols.filter(Boolean))
    : null;

  const edges = [];
  for (const quote of quotes || []) {
    const state = quoteStateById.get(quote.id);
    if (!state) continue;

    const from = state.fromSymbol;
    const to = state.toSymbol;
    const rate = state.lastRawPrice;

    if (from && to && typeof rate === 'number') {
      if (!allowSet || (allowSet.has(from) && allowSet.has(to))) {
        edges.push({ from, to, rate, chain: quote.chain, quoteId: quote.id });
      }
    }

    if (quote.showInverse && typeof state.inverseRawPrice === 'number' && from && to) {
      if (!allowSet || (allowSet.has(from) && allowSet.has(to))) {
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

function isRuleEdge(edge) {
  return Boolean(edge && (edge.rule || edge.chain === '规则'));
}

function buildRuleEdges(aliases) {
  if (!aliases) return [];

  const groups = new Map();
  for (const [alias, target] of Object.entries(aliases)) {
    if (!alias || !target) continue;
    const key = String(target);
    const group = groups.get(key) || [];

    if (!group.includes(target)) {
      group.push(target);
    }
    if (!group.includes(alias)) {
      group.push(alias);
    }

    groups.set(key, group);
  }

  const edges = [];
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = 0; j < group.length; j += 1) {
        if (i === j) continue;
        edges.push({ from: group[i], to: group[j], rate: 1, chain: '规则', rule: true });
      }
    }
  }

  return edges;
}

function hasAdjacentRuleLegs(legs) {
  if (!Array.isArray(legs) || legs.length < 2) return false;
  for (let i = 0; i < legs.length; i += 1) {
    const current = legs[i];
    const next = legs[(i + 1) % legs.length];
    if (isRuleEdge(current) && isRuleEdge(next)) return true;
  }
  return false;
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
      const prevEdge = path[path.length - 1];

      if (isRuleEdge(prevEdge) && isRuleEdge(edge)) continue;

      if (next === start && path.length >= 1) {
        const profitRate = nextProduct - 1;
        const legs = path.concat(edge);
        if (hasAdjacentRuleLegs(legs)) {
          continue;
        }
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

function rotateCycleLegs(legs, offset) {
  if (!Array.isArray(legs) || !legs.length) return [];
  const start = ((offset % legs.length) + legs.length) % legs.length;
  return legs.slice(start).concat(legs.slice(0, start));
}

function buildCycleLegKey(leg) {
  if (!leg) return '';
  const from = leg.from || '';
  const to = leg.to || '';
  const chain = leg.chain || '';
  const rate = typeof leg.rate === 'number' ? String(leg.rate) : '';
  return `${from}|${to}|${chain}|${rate}`;
}

function canonicalizeCycleRotation(legs, preferredStartSymbols) {
  if (!Array.isArray(legs) || !legs.length) {
    return { legs: [], key: '' };
  }

  const preferredSet = Array.isArray(preferredStartSymbols) && preferredStartSymbols.length
    ? new Set(preferredStartSymbols.filter(Boolean))
    : null;

  let bestLegs = legs;
  let bestKey = '';
  let bestRank = Number.POSITIVE_INFINITY;

  for (let i = 0; i < legs.length; i += 1) {
    const rotated = rotateCycleLegs(legs, i);
    const startSymbol = rotated[0] && rotated[0].from;
    const rank = preferredSet ? (preferredSet.has(startSymbol) ? 0 : 1) : 0;
    const key = rotated.map(buildCycleLegKey).join('>');
    if (rank < bestRank || (rank === bestRank && (bestKey === '' || key < bestKey))) {
      bestLegs = rotated;
      bestKey = key;
      bestRank = rank;
    }
  }

  return { legs: bestLegs, key: bestKey };
}

function findTopCycles(edges, options = {}) {
  const maxDepth = Number(options.maxDepth) || 4;
  const limit = Number(options.limit) || 3;
  const acceptCycle = typeof options.acceptCycle === 'function' ? options.acceptCycle : null;
  const preferredStartSymbols = Array.isArray(options.preferredStartSymbols) ? options.preferredStartSymbols : null;
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
    const canonical = canonicalizeCycleRotation(legs, preferredStartSymbols);
    if (!canonical.key || seen.has(canonical.key)) return;
    seen.add(canonical.key);
    results.push({ legs: canonical.legs, profitRate });
  }

  function dfs(start, current, visited, path, product) {
    if (path.length > maxDepth) return;

    const neighbors = adjacency.get(current) || [];
    for (const edge of neighbors) {
      const next = edge.to;
      const nextProduct = product * edge.rate;
      const prevEdge = path[path.length - 1];

      if (isRuleEdge(prevEdge) && isRuleEdge(edge)) continue;

      if (next === start && path.length >= 1) {
        const legs = path.concat(edge);
        if (hasAdjacentRuleLegs(legs)) continue;
        recordCycle(legs, nextProduct - 1);
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
  for (const [alias, target] of Object.entries(aliases)) {
    if (alias === symbol) {
      return target;
    }
  }
  return symbol;
}

function selectBestEdgeByChain(edges, from, to, chain, aliases) {
  if (!chain) return null;
  const targetFrom = resolveAlias(from, aliases);
  const targetTo = resolveAlias(to, aliases);
  let best = null;

  for (const edge of edges || []) {
    if (edge.chain !== chain) continue;
    const edgeFrom = resolveAlias(edge.from, aliases);
    const edgeTo = resolveAlias(edge.to, aliases);
    if (edgeFrom !== targetFrom || edgeTo !== targetTo) continue;
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

function chooseBetterCycle(candidateA, candidateB) {
  if (!candidateA) return candidateB;
  if (!candidateB) return candidateA;
  return candidateA.profitRate >= candidateB.profitRate ? candidateA : candidateB;
}

function collectQuoteChains(edges) {
  const chains = [];
  const seen = new Set();
  for (const edge of edges || []) {
    const chain = edge && edge.chain;
    if (!chain || chain === '规则') continue;
    if (seen.has(chain)) continue;
    seen.add(chain);
    chains.push(chain);
  }
  return chains;
}

function findBestFixedPath(edges, rule, aliases) {
  if (!rule || rule.steps !== 2) return null;
  if (!rule.base || !rule.quote) return null;

  const chains = Array.isArray(rule.chains) ? rule.chains.filter(Boolean) : [];
  if (chains.length >= 2) {
    const [chainA, chainB] = chains;
    const forward = buildTwoStepFixedPath(edges, rule, chainA, chainB, aliases);
    const reverse = buildTwoStepFixedPath(edges, rule, chainB, chainA, aliases);
    return chooseBetterCycle(forward, reverse);
  }

  if (!rule.crossChain) return null;

  const candidateChains = collectQuoteChains(edges);
  let best = null;
  for (let i = 0; i < candidateChains.length; i += 1) {
    for (let j = 0; j < candidateChains.length; j += 1) {
      if (i === j) continue;
      const chainA = candidateChains[i];
      const chainB = candidateChains[j];
      const cycle = buildTwoStepFixedPath(edges, rule, chainA, chainB, aliases);
      best = chooseBetterCycle(best, cycle);
    }
  }
  return best;
}

function selectBestDirectEdge(edges, from, to, aliases) {
  const targetFrom = resolveAlias(from, aliases);
  const targetTo = resolveAlias(to, aliases);
  let best = null;

  for (const edge of edges || []) {
    const edgeFrom = resolveAlias(edge.from, aliases);
    const edgeTo = resolveAlias(edge.to, aliases);
    if (edgeFrom !== targetFrom || edgeTo !== targetTo) continue;
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
