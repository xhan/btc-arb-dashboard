const ArbPaths = require('../arb/arb-paths');
const { filterEdgesForFixedRule } = require('../arb/arb-fixed-utils');
const { formatUtc8 } = require('../shared/time-utils');
const {
  DEFAULT_ARB_CYCLE_START_PRIORITY,
  normalizeArbCycleStartPriority,
  buildPreferredCycleStartSymbols
} = require('../arb/arb-cycle-priority-utils');
const {
  DEFAULT_ASSET_EQUIVALENCE_GROUPS,
  buildAliasRulesFromGroups
} = require('../arb/arb-equivalence-utils');
const { getChainDisplayName } = require('../shared/chain-defaults');

const ALIAS_RULES = buildAliasRulesFromGroups(DEFAULT_ASSET_EQUIVALENCE_GROUPS);

const FIXED_PATH_RULES = [
  {
    title: 'WBTC eth <-> arb',
    base: 'cbBTC',
    quote: 'WBTC',
    categoryNames: ['WBTC监控'],
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

function formatChainLabel(chain) {
  return getChainDisplayName(chain);
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

function buildReplayFromSnapshot(selection, options = {}) {
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
  const quoteMetaById = new Map((snapshot?.quotes || []).map((quote) => [quote.quoteId, { categoryName: quote.categoryName }]));
  const preferredStartSymbols = buildPreferredCycleStartSymbols(
    ALIAS_RULES,
    normalizeArbCycleStartPriority(options.cycleStartPriority, DEFAULT_ARB_CYCLE_START_PRIORITY)
  );

  const fixedPaths = FIXED_PATH_RULES
    .map((rule) => cycleToPlain(
      ArbPaths.findBestFixedPath(
        filterEdgesForFixedRule(rule, allEdgesWithRules, quoteMetaById),
        rule,
        ALIAS_RULES
      ),
      rule.title
    ))
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
      from: leg.rawFrom || leg.from,
      to: leg.rawTo || leg.to,
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
