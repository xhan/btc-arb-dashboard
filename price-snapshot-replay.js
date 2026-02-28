const ArbPaths = require('./arb-paths');
const { formatUtc8 } = require('./time-utils');

const ALIAS_RULES = {
  xBTC: 'cbBTC',
  BTCB: 'cbBTC',
  'BTC.b': 'cbBTC',
  'BTC.B': 'cbBTC'
};

const FIXED_PATH_RULES = [
  {
    title: 'WBTC ETH <-> ARB',
    base: 'cbBTC',
    quote: 'WBTC',
    chains: ['ethereum', 'arbitrum'],
    steps: 2
  },
  {
    title: 'GHO <-> USDC',
    base: 'GHO',
    quote: 'USDC',
    steps: 2,
    crossChain: true
  }
];

function buildPreferredCycleStartSymbols(aliasRules, canonicalSymbol = 'cbBTC') {
  const target = String(canonicalSymbol || '').toUpperCase();
  const symbols = new Set([canonicalSymbol]);
  for (const [alias, mapped] of Object.entries(aliasRules || {})) {
    if (String(mapped || '').toUpperCase() === target) {
      symbols.add(alias);
      symbols.add(mapped);
    }
  }
  return Array.from(symbols);
}

function formatChainLabel(chain) {
  const labels = {
    ethereum: 'ETH',
    arbitrum: 'Arbitrum',
    base: 'Base',
    optimism: 'Optimism',
    katana: 'Katana',
    hemi: 'Hemi'
  };
  return labels[chain] || chain || '';
}

function legToPlain(leg) {
  return {
    from: leg.from,
    to: leg.to,
    rate: leg.rate,
    chain: leg.chain,
    inverse: !!leg.inverse,
    rule: !!leg.rule
  };
}

function cycleToPlain(cycle, title = '') {
  if (!cycle) return null;
  return {
    title,
    profitRate: cycle.profitRate,
    profitWanfen: ArbPaths.formatProfitWanfen(cycle.profitRate),
    legs: (cycle.legs || []).filter((leg) => !(leg && (leg.rule || leg.chain === '规则'))).map(legToPlain)
  };
}

function buildEdgesFromSnapshotQuotes(snapshot) {
  const edges = [];
  for (const quote of snapshot?.quotes || []) {
    const from = quote.fromSymbol;
    const to = quote.toSymbol;
    if (from && to && typeof quote.price === 'number') {
      edges.push({
        from,
        to,
        rate: quote.price,
        chain: quote.chain,
        quoteId: quote.quoteId
      });
    }
    if (from && to && typeof quote.inversePrice === 'number') {
      edges.push({
        from: to,
        to: from,
        rate: quote.inversePrice,
        chain: quote.chain,
        quoteId: quote.quoteId,
        inverse: true
      });
    }
  }
  return edges;
}

function decorateSnapshotSelection(selection) {
  if (!selection) return null;

  const snapshot = selection.snapshot
    ? {
      ...selection.snapshot,
      capturedAtLocal: formatUtc8(selection.snapshot.capturedAtMs || selection.snapshot.capturedAt),
      clientCapturedAtLocal: selection.snapshot.clientCapturedAt
        ? formatUtc8(selection.snapshot.clientCapturedAt)
        : null
    }
    : null;

  return {
    ...selection,
    requestedAtLocal: formatUtc8(selection.requestedAtMs || selection.requestedAt),
    snapshot
  };
}

function buildReplayFromSnapshot(selection) {
  const displaySelection = decorateSnapshotSelection(selection);
  const snapshot = displaySelection?.snapshot;
  if (!snapshot) {
    return {
      requestedAt: displaySelection?.requestedAt || null,
      requestedAtMs: displaySelection?.requestedAtMs || null,
      requestedAtLocal: displaySelection?.requestedAtLocal || '',
      match: {
        matchType: displaySelection?.matchType || '',
        deltaMs: displaySelection?.deltaMs ?? null,
        deltaSec: typeof displaySelection?.deltaMs === 'number' ? displaySelection.deltaMs / 1000 : null
      },
      snapshot: null,
      fixedPaths: [],
      globalTopCycles: []
    };
  }

  const edges = buildEdgesFromSnapshotQuotes(snapshot);
  const ruleEdges = ArbPaths.buildRuleEdges(ALIAS_RULES);
  const allEdgesWithRules = edges.concat(ruleEdges);
  const preferredStartSymbols = buildPreferredCycleStartSymbols(ALIAS_RULES, 'cbBTC');

  const fixedPaths = FIXED_PATH_RULES
    .map((rule) => cycleToPlain(ArbPaths.findBestFixedPath(allEdgesWithRules, rule, ALIAS_RULES), rule.title))
    .filter(Boolean);

  const globalTopCycles = (ArbPaths.findTopCycles(allEdgesWithRules, {
    maxDepth: 4,
    limit: 8,
    acceptCycle: ArbPaths.isMeaningfulPath,
    preferredStartSymbols
  }) || []).map((cycle, index) => cycleToPlain(cycle, `机会 ${index + 1}`));

  return {
    requestedAt: displaySelection.requestedAt,
    requestedAtMs: displaySelection.requestedAtMs,
    requestedAtLocal: displaySelection.requestedAtLocal,
    match: {
      matchType: displaySelection.matchType,
      deltaMs: displaySelection.deltaMs,
      deltaSec: displaySelection.deltaMs / 1000
    },
    snapshot: {
      snapshotId: snapshot.snapshotId,
      capturedAt: snapshot.capturedAt,
      capturedAtLocal: snapshot.capturedAtLocal,
      capturedAtMs: snapshot.capturedAtMs,
      clientCapturedAt: snapshot.clientCapturedAt,
      clientCapturedAtLocal: snapshot.clientCapturedAtLocal,
      quoteCount: snapshot.quoteCount
    },
    fixedPaths,
    globalTopCycles
  };
}

function renderCycleLines(cycle) {
  if (!cycle || !Array.isArray(cycle.legs) || !cycle.legs.length) {
    return ['  无有效路径'];
  }
  const lines = [];
  for (const leg of cycle.legs) {
    lines.push(`  ${ArbPaths.formatLegLine({
      from: leg.from,
      to: leg.to,
      rate: leg.rate,
      chainLabel: formatChainLabel(leg.chain)
    })}`);
  }
  lines.push(`  收益: ${cycle.profitWanfen}`);
  return lines;
}

function renderReplayText(replay) {
  if (!replay || !replay.snapshot) {
    return '未找到可用快照';
  }

  const lines = [
    `请求时间: ${replay.requestedAtLocal || replay.requestedAt}`,
    `命中快照: ${replay.snapshot.capturedAtLocal || replay.snapshot.capturedAt}`,
    `匹配方式: ${replay.match.matchType}`,
    `时间偏差: ${replay.match.deltaSec.toFixed(3)}s`,
    `快照报价数: ${replay.snapshot.quoteCount}`,
    ''
  ];

  lines.push('固定路径:');
  if (!replay.fixedPaths.length) {
    lines.push('  无');
  } else {
    for (const cycle of replay.fixedPaths) {
      lines.push(`- ${cycle.title}`);
      lines.push(...renderCycleLines(cycle));
    }
  }

  lines.push('');
  lines.push('全局路径:');
  if (!replay.globalTopCycles.length) {
    lines.push('  无');
  } else {
    for (const cycle of replay.globalTopCycles) {
      lines.push(`- ${cycle.title}`);
      lines.push(...renderCycleLines(cycle));
    }
  }

  return lines.join('\n');
}

module.exports = {
  decorateSnapshotSelection,
  buildReplayFromSnapshot,
  renderReplayText
};
