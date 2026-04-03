(function (root, factory) {
  const quotePauseUtils = typeof module !== 'undefined' && module.exports
    ? require('./quote-pause-utils')
    : root.QuotePauseUtils;
  const api = factory(quotePauseUtils);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.DataTerminalUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.DataTerminalUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (quotePauseUtils) {
  const isQuotePaused = quotePauseUtils && typeof quotePauseUtils.isQuotePaused === 'function'
    ? quotePauseUtils.isQuotePaused
    : (quote) => !!quote && quote.paused === true;

  function normalizeSymbol(value) {
    return String(value || '').trim().toUpperCase();
  }

  function isCexOrderbookChain(chain) {
    const normalized = String(chain || '').trim().toLowerCase();
    return normalized === 'bybit' || normalized === 'binance';
  }

  function parseDataTerminalQuery(inputText) {
    return String(inputText || '')
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .slice(0, 2);
  }

  function buildAliasLookup(aliasRules) {
    const lookup = new Map();
    for (const [alias, canonical] of Object.entries(aliasRules || {})) {
      const aliasKey = normalizeSymbol(alias);
      const canonicalKey = normalizeSymbol(canonical);
      if (!aliasKey || !canonicalKey) continue;
      lookup.set(aliasKey, canonicalKey);
      if (!lookup.has(canonicalKey)) {
        lookup.set(canonicalKey, canonicalKey);
      }
    }
    return lookup;
  }

  function resolveSymbolKey(symbol, aliasLookup, allowAliases) {
    const normalized = normalizeSymbol(symbol);
    if (!allowAliases) return normalized;
    return aliasLookup.get(normalized) || normalized;
  }

  function buildCandidate(record, overrides) {
    const quote = record && record.quote ? record.quote : {};
    const amount = Number(quote.amount);
    return {
      key: overrides.key,
      quoteId: quote.id,
      chain: quote.chain,
      fromSymbol: overrides.fromSymbol,
      toSymbol: overrides.toSymbol,
      fromTokenAddress: overrides.fromTokenAddress || '',
      toTokenAddress: overrides.toTokenAddress || '',
      rate: overrides.rate,
      amount: Number.isFinite(amount) && amount > 0 ? amount : 1,
      pricingMode: overrides.pricingMode,
      direction: overrides.direction
    };
  }

  function buildDataTerminalCandidates(records) {
    const candidates = [];

    for (const record of (records || [])) {
      const quote = record && record.quote;
      if (!quote || isQuotePaused(quote)) continue;

      const fromSymbol = String(record.fromSymbol || '').trim();
      const toSymbol = String(record.toSymbol || '').trim();
      if (!fromSymbol || !toSymbol) continue;

      if (isCexOrderbookChain(quote.chain)) {
        const orderbook = record.cexOrderbook || {};
        if (Number.isFinite(Number(orderbook.bestBidPrice))) {
          candidates.push(buildCandidate(record, {
            key: `${quote.id}:cex-bid1`,
            fromSymbol,
            toSymbol,
            fromTokenAddress: quote.fromToken,
            toTokenAddress: quote.toToken,
            rate: Number(orderbook.bestBidPrice),
            pricingMode: 'cex-bid1',
            direction: 'forward'
          }));
        }
        if (Number.isFinite(Number(orderbook.bestAskPrice))) {
          candidates.push(buildCandidate(record, {
            key: `${quote.id}:cex-ask1-inverse`,
            fromSymbol: toSymbol,
            toSymbol: fromSymbol,
            fromTokenAddress: quote.toToken,
            toTokenAddress: quote.fromToken,
            rate: Number(orderbook.bestAskPrice),
            pricingMode: 'cex-ask1-inverse',
            direction: 'inverse'
          }));
        }
        continue;
      }

      if (Number.isFinite(Number(record.lastRawPrice))) {
        candidates.push(buildCandidate(record, {
          key: `${quote.id}:forward`,
          fromSymbol,
          toSymbol,
          fromTokenAddress: quote.fromToken,
          toTokenAddress: quote.toToken,
          rate: Number(record.lastRawPrice),
          pricingMode: 'raw',
          direction: 'forward'
        }));
      }

      if (quote.showInverse && Number.isFinite(Number(record.inverseRawPrice))) {
        candidates.push(buildCandidate(record, {
          key: `${quote.id}:inverse`,
          fromSymbol: toSymbol,
          toSymbol: fromSymbol,
          fromTokenAddress: quote.toToken,
          toTokenAddress: quote.fromToken,
          rate: Number(record.inverseRawPrice),
          pricingMode: 'raw',
          direction: 'inverse'
        }));
      }
    }

    return candidates;
  }

  function formatDataTerminalValue(rate, showDiff) {
    const numericRate = Number(rate);
    if (!Number.isFinite(numericRate)) return '--';
    const displayValue = showDiff ? (numericRate - 1) : numericRate;
    return displayValue.toFixed(5);
  }

  function formatDataTerminalBp(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return '--';
    return `${numericValue >= 0 ? '+' : ''}${numericValue.toFixed(2)}bp`;
  }

  function sortCandidates(candidates) {
    return (Array.isArray(candidates) ? candidates : [])
      .map((candidate, index) => ({ candidate, index }))
      .sort((left, right) => {
        const rateDiff = Number(right.candidate.rate) - Number(left.candidate.rate);
        if (rateDiff !== 0) return rateDiff;

        const chainDiff = String(left.candidate.chain || '').localeCompare(String(right.candidate.chain || ''));
        if (chainDiff !== 0) return chainDiff;

        const pairDiff = `${left.candidate.fromSymbol}->${left.candidate.toSymbol}`.localeCompare(
          `${right.candidate.fromSymbol}->${right.candidate.toSymbol}`
        );
        if (pairDiff !== 0) return pairDiff;

        return left.index - right.index;
      })
      .map(({ candidate }) => candidate);
  }

  function decorateRows(rows, showDiff) {
    return rows.map((row) => ({
      ...row,
      displayValue: formatDataTerminalValue(row.rate, showDiff)
    }));
  }

  function buildDataTerminalViewModel(candidates, options = {}) {
    const query = options.query || '';
    const tokens = parseDataTerminalQuery(query);
    if (!tokens.length) {
      return {
        mode: 'empty',
        tokens: [],
        leftTitle: '',
        rightTitle: '',
        leftRows: [],
        rightRows: [],
        emptyMessage: '输入 1 或 2 个代币开始搜索'
      };
    }

    const allowAliases = options.allowAliases !== false;
    const showDiff = options.showDiff === true;
    const aliasLookup = buildAliasLookup(options.aliasRules || {});
    const firstToken = tokens[0];
    const secondToken = tokens[1] || '';

    const matchesToken = (symbol, token) => (
      resolveSymbolKey(symbol, aliasLookup, allowAliases) === resolveSymbolKey(token, aliasLookup, allowAliases)
    );

    let mode = 'single';
    let leftTitle = `xxx -> ${firstToken}`;
    let rightTitle = `${firstToken} -> yyy`;
    let leftRows = [];
    let rightRows = [];

    if (secondToken) {
      mode = 'pair';
      leftTitle = `${secondToken} -> ${firstToken}`;
      rightTitle = `${firstToken} -> ${secondToken}`;
      leftRows = (candidates || []).filter((candidate) => (
        matchesToken(candidate.fromSymbol, secondToken) &&
        matchesToken(candidate.toSymbol, firstToken)
      ));
      rightRows = (candidates || []).filter((candidate) => (
        matchesToken(candidate.fromSymbol, firstToken) &&
        matchesToken(candidate.toSymbol, secondToken)
      ));
    } else {
      leftRows = (candidates || []).filter((candidate) => matchesToken(candidate.toSymbol, firstToken));
      rightRows = (candidates || []).filter((candidate) => matchesToken(candidate.fromSymbol, firstToken));
    }

    return {
      mode,
      tokens,
      leftTitle,
      rightTitle,
      leftRows: decorateRows(sortCandidates(leftRows), showDiff),
      rightRows: decorateRows(sortCandidates(rightRows), showDiff),
      emptyMessage: '暂无匹配交易对'
    };
  }

  function buildDataTerminalSelectionSummary(selectionState = {}, rowGroups = {}) {
    const leftRows = Array.isArray(rowGroups.leftRows) ? rowGroups.leftRows : [];
    const rightRows = Array.isArray(rowGroups.rightRows) ? rowGroups.rightRows : [];
    const leftMap = new Map(leftRows.map((row) => [row.key, row]));
    const rightMap = new Map(rightRows.map((row) => [row.key, row]));
    const leftKey = leftMap.has(selectionState.leftKey) ? selectionState.leftKey : '';
    const rightKey = rightMap.has(selectionState.rightKey) ? selectionState.rightKey : '';

    if (!leftKey || !rightKey) {
      return {
        leftKey,
        rightKey,
        profitBp: null,
        text: '--'
      };
    }

    const leftRate = Number(leftMap.get(leftKey).rate);
    const rightRate = Number(rightMap.get(rightKey).rate);
    const profitBp = ((leftRate * rightRate) - 1) * 10000;

    return {
      leftKey,
      rightKey,
      profitBp,
      text: formatDataTerminalBp(profitBp)
    };
  }

  return {
    buildDataTerminalCandidates,
    buildDataTerminalSelectionSummary,
    buildDataTerminalViewModel,
    formatDataTerminalBp,
    formatDataTerminalValue,
    parseDataTerminalQuery
  };
});
