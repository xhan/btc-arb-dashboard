(function () {
function normalizeChain(chain, chainDefaults) {
  if (chainDefaults && typeof chainDefaults.normalizeChain === 'function') {
    return chainDefaults.normalizeChain(chain);
  }
  return String(chain || '').trim().toLowerCase();
}

function normalizeRuleChains(chains, chainDefaults) {
  return Array.isArray(chains)
    ? chains.map((chain) => normalizeChain(chain, chainDefaults)).filter(Boolean)
    : [];
}

function isSameChain(left, right, chainDefaults) {
  const normalizedLeft = normalizeChain(left, chainDefaults);
  const normalizedRight = normalizeChain(right, chainDefaults);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function buildEdges(quotes, quoteStateById, allowedSymbols, chainDefaults) {
  const allowSet = Array.isArray(allowedSymbols)
    ? new Set(allowedSymbols.filter(Boolean))
    : null;

  const edges = [];
  for (const quote of quotes || []) {
    if (isCrossChainQuote(quote, chainDefaults)) continue;
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

function isCrossChainQuote(quote, chainDefaults) {
  const fromChain = normalizeChain(quote && quote.chain, chainDefaults);
  const toChain = normalizeChain(quote && quote.toChain, chainDefaults);
  return Boolean(fromChain && toChain && fromChain !== toChain);
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

function isRuleEdge(edge) {
  return Boolean(edge && (edge.rule || edge.chain === '规则'));
}

function buildRuleEdges(aliases, arbEquivalenceUtils) {
  if (!aliases) return [];

  const groups = arbEquivalenceUtils.buildAliasGroups(aliases).map((group) => group.symbols);

  const edges = [];
  for (const group of groups) {
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

  const preferredRanks = Array.isArray(preferredStartSymbols) && preferredStartSymbols.length
    ? preferredStartSymbols.reduce((map, symbol, index) => {
      const normalized = String(symbol || '').trim();
      if (!normalized || map.has(normalized)) return map;
      map.set(normalized, index);
      return map;
    }, new Map())
    : null;

  let bestLegs = legs;
  let bestKey = '';
  let bestRank = Number.POSITIVE_INFINITY;

  for (let i = 0; i < legs.length; i += 1) {
    const rotated = rotateCycleLegs(legs, i);
    const startSymbol = rotated[0] && rotated[0].from;
    const rank = preferredRanks
      ? (preferredRanks.has(startSymbol) ? preferredRanks.get(startSymbol) : preferredRanks.size + 1)
      : 0;
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
  const maxDepth = Number(options.maxDepth) || 3;
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

  function dfs(start, current, visited, path, product, pricedDepth) {
    const neighbors = adjacency.get(current) || [];
    for (const edge of neighbors) {
      const next = edge.to;
      const nextProduct = product * edge.rate;
      const prevEdge = path[path.length - 1];
      const nextPricedDepth = pricedDepth + (isRuleEdge(edge) ? 0 : 1);

      if (isRuleEdge(prevEdge) && isRuleEdge(edge)) continue;
      if (nextPricedDepth > maxDepth) continue;

      if (next === start && path.length >= 1) {
        const legs = path.concat(edge);
        if (hasAdjacentRuleLegs(legs)) continue;
        recordCycle(legs, nextProduct - 1);
        continue;
      }

      if (visited.has(next)) continue;

      visited.add(next);
      dfs(start, next, visited, path.concat(edge), nextProduct, nextPricedDepth);
      visited.delete(next);
    }
  }

  for (const start of adjacency.keys()) {
    const visited = new Set([start]);
    dfs(start, start, visited, [], 1, 0);
  }

  results.sort((a, b) => b.profitRate - a.profitRate);
  return results.slice(0, Math.max(0, limit));
}

function resolveAlias(symbol, aliases, arbEquivalenceUtils) {
  if (!aliases) return symbol;
  return arbEquivalenceUtils.resolveAliasTarget(symbol, aliases);
}

function selectBestEdgeByChain(edges, from, to, chain, aliases, arbEquivalenceUtils, chainDefaults) {
  if (!chain) return null;
  const targetFrom = resolveAlias(from, aliases, arbEquivalenceUtils);
  const targetTo = resolveAlias(to, aliases, arbEquivalenceUtils);
  let best = null;

  for (const edge of edges || []) {
    if (!isSameChain(edge.chain, chain, chainDefaults)) continue;
    const edgeFrom = resolveAlias(edge.from, aliases, arbEquivalenceUtils);
    const edgeTo = resolveAlias(edge.to, aliases, arbEquivalenceUtils);
    if (edgeFrom !== targetFrom || edgeTo !== targetTo) continue;
    if (!best || edge.rate > best.rate) {
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

function buildTwoStepFixedPath(edges, rule, chainA, chainB, aliases, arbEquivalenceUtils, chainDefaults) {
  const legA = selectBestEdgeByChain(edges, rule.base, rule.quote, chainA, aliases, arbEquivalenceUtils, chainDefaults);
  const legB = selectBestEdgeByChain(edges, rule.quote, rule.base, chainB, aliases, arbEquivalenceUtils, chainDefaults);
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

function buildFixedCycleCandidate(cycle, rule, aliases, options = {}, arbEquivalenceUtils, chainDefaults) {
  if (!cycle || !Array.isArray(cycle.legs) || !cycle.legs.length) return null;
  const excludeChains = new Set(normalizeRuleChains(rule && rule.excludeChains, chainDefaults));
  const excludedSymbols = Array.isArray(rule && rule.excludeSymbols)
    ? rule.excludeSymbols.map((symbol) => String(symbol || '')).filter(Boolean)
    : [];
  const excludedCanonicalSymbols = new Set(excludedSymbols.map((symbol) => resolveAlias(symbol, aliases, arbEquivalenceUtils)));

  const realLegs = cycle.legs.filter((leg) => leg && !leg.rule && leg.chain !== '规则');
  if (!realLegs.length) return null;
  if (excludeChains.size && realLegs.some((leg) => excludeChains.has(normalizeChain(leg.chain, chainDefaults)))) {
    return null;
  }
  if (excludedSymbols.length) {
    const hasExcludedSymbol = realLegs.some((leg) => {
      const symbols = [
        String(leg.rawFrom || ''),
        String(leg.rawTo || ''),
        String(leg.from || ''),
        String(leg.to || '')
      ].filter(Boolean);
      return symbols.some((symbol) => (
        excludedCanonicalSymbols.has(resolveAlias(symbol, aliases, arbEquivalenceUtils)) ||
        excludedSymbols.includes(symbol)
      ));
    });
    if (hasExcludedSymbol) {
      return null;
    }
  }
  const preferredStartSymbols = Array.isArray(options.preferredStartSymbols) && options.preferredStartSymbols.length
    ? options.preferredStartSymbols
    : null;
  const canonical = canonicalizeCycleRotation(cycle.legs, preferredStartSymbols);
  if (!canonical.key) return null;
  return {
    legs: (preferredStartSymbols ? canonical.legs : cycle.legs).map((leg) => ({ ...leg })),
    profitRate: cycle.profitRate,
    key: canonical.key
  };
}

function sortFixedCycleCandidates(left, right) {
  const profitDiff = Number(right && right.profitRate) - Number(left && left.profitRate);
  if (profitDiff !== 0) return profitDiff;
  return String(left && left.key || '').localeCompare(String(right && right.key || ''));
}

function findFixedPaths(edges, rule, aliases, options = {}, arbEquivalenceUtils, chainDefaults) {
  if (!rule || rule.steps !== 2) return null;
  if (!rule.base || !rule.quote) return null;
  const limit = Number(options.limit ?? rule.resultLimit);
  const resultLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : Number.MAX_SAFE_INTEGER;
  const candidates = [];
  const seen = new Set();

  function pushCycle(cycle) {
    const candidate = buildFixedCycleCandidate(cycle, rule, aliases, options, arbEquivalenceUtils, chainDefaults);
    if (!candidate || seen.has(candidate.key)) return;
    seen.add(candidate.key);
    candidates.push(candidate);
  }

  const chains = normalizeRuleChains(rule.chains, chainDefaults);
  if (chains.length >= 2) {
    const [chainA, chainB] = chains;
    pushCycle(buildTwoStepFixedPath(edges, rule, chainA, chainB, aliases, arbEquivalenceUtils, chainDefaults));
    pushCycle(buildTwoStepFixedPath(edges, rule, chainB, chainA, aliases, arbEquivalenceUtils, chainDefaults));
    return candidates.sort(sortFixedCycleCandidates).slice(0, resultLimit);
  }

  if (!rule.crossChain) return candidates;

  const excludedChains = new Set(normalizeRuleChains(rule.excludeChains, chainDefaults));
  const candidateChains = collectQuoteChains(edges).filter((chain) => !excludedChains.has(normalizeChain(chain, chainDefaults)));
  for (let i = 0; i < candidateChains.length; i += 1) {
    for (let j = 0; j < candidateChains.length; j += 1) {
      if (i === j) continue;
      const chainA = candidateChains[i];
      const chainB = candidateChains[j];
      pushCycle(buildTwoStepFixedPath(edges, rule, chainA, chainB, aliases, arbEquivalenceUtils, chainDefaults));
    }
  }
  return candidates.sort(sortFixedCycleCandidates).slice(0, resultLimit);
}

function findBestFixedPath(edges, rule, aliases, options = {}, arbEquivalenceUtils, chainDefaults) {
  const list = findFixedPaths(edges, rule, aliases, {
    ...options,
    limit: 1
  }, arbEquivalenceUtils, chainDefaults);
  return Array.isArray(list) && list.length ? list[0] : null;
}

function isMeaningfulPath(legs) {
  if (!Array.isArray(legs) || legs.length === 0) return false;
  return legs.some((leg) => leg && !leg.rule && leg.chain !== '规则');
}

function buildApi(arbEquivalenceUtils, chainDefaults) {
  return {
    buildEdges: (quotes, quoteStateById, allowedSymbols) => buildEdges(quotes, quoteStateById, allowedSymbols, chainDefaults),
    isCrossChainQuote: (quote) => isCrossChainQuote(quote, chainDefaults),
    formatLegLine,
    formatProfitWanfen,
    buildRuleEdges: (aliases) => buildRuleEdges(aliases, arbEquivalenceUtils),
    findTopCycles,
    findFixedPaths: (edges, rule, aliases, options) => findFixedPaths(edges, rule, aliases, options, arbEquivalenceUtils, chainDefaults),
    findBestFixedPath: (edges, rule, aliases, options) => findBestFixedPath(edges, rule, aliases, options, arbEquivalenceUtils, chainDefaults),
    canonicalizeCycleRotation,
    isMeaningfulPath
  };
}

(function attachApi(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./arb-equivalence-utils'), require('../shared/chain-defaults'));
  } else {
    root.ArbPaths = factory(root.ArbEquivalenceUtils, root.ChainDefaults);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), buildApi);
}());
