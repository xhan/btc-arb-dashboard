(function (root, factory) {
  const quotePauseUtils = typeof module !== 'undefined' && module.exports
    ? require('./quote-pause-utils')
    : root.QuotePauseUtils;
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('./chain-defaults')
    : root.ChainDefaults;
  const api = factory(quotePauseUtils, chainDefaults);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.DataTerminalUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.DataTerminalUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (quotePauseUtils, chainDefaults) {
  const isQuotePaused = quotePauseUtils && typeof quotePauseUtils.isQuotePaused === 'function'
    ? quotePauseUtils.isQuotePaused
    : (quote) => !!quote && quote.paused === true;

  function normalizeSymbol(value) {
    return String(value || '').trim().toUpperCase();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isCexOrderbookChain(chain) {
    if (chainDefaults && typeof chainDefaults.isCexOrderbookChain === 'function') {
      return chainDefaults.isCexOrderbookChain(chain);
    }
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

  function buildDataTerminalRecords(dashboardState, quoteStateById, options = {}) {
    const dashboard = Array.isArray(dashboardState) ? dashboardState : [];
    const stateById = quoteStateById instanceof Map ? quoteStateById : new Map();
    const isQuoteActive = typeof options.isQuoteActive === 'function'
      ? options.isQuoteActive
      : (quote) => !isQuotePaused(quote);
    const records = [];

    for (const category of dashboard) {
      const quotes = Array.isArray(category && category.quotes) ? category.quotes : [];
      for (const quote of quotes) {
        if (!isQuoteActive(quote)) continue;
        const state = stateById.get(quote && quote.id) || {};
        records.push({
          categoryName: category && category.name,
          quote,
          fromSymbol: state.fromSymbol,
          toSymbol: state.toSymbol,
          lastRawPrice: state.lastRawPrice,
          inverseRawPrice: state.inverseRawPrice,
          cexOrderbook: state.cexOrderbook || null
        });
      }
    }

    return records;
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

  function buildDataTerminalRowHtml(row, side, selectedKey, options = {}) {
    const formatChainLabel = typeof options.formatChainLabel === 'function'
      ? options.formatChainLabel
      : (chain) => String(chain || '');
    const formatAmount = typeof options.formatAmount === 'function'
      ? options.formatAmount
      : (amount) => String(amount || '');
    const selectedClass = row.key === selectedKey ? ' data-terminal-row-selected' : '';
    const pairLabel = `${row.fromSymbol} -> ${row.toSymbol}`;
    const pairLinkHtml = typeof options.buildPairLinkHtml === 'function'
      ? options.buildPairLinkHtml(row, 'data-terminal-pair data-terminal-pair-link', pairLabel)
      : '';
    const pairHtml = pairLinkHtml
      || `<span class="data-terminal-pair">${escapeHtml(pairLabel)}</span>`;

    return `
            <div class="data-terminal-row${selectedClass}" data-data-terminal-side="${escapeHtml(side)}" data-data-terminal-row-key="${escapeHtml(row.key)}">
                <span class="data-terminal-chain">${escapeHtml(formatChainLabel(row.chain))}</span>
                ${pairHtml}
                <span class="data-terminal-rate">${escapeHtml(row.displayValue)}</span>
                <span class="data-terminal-amount">${escapeHtml(String(formatAmount(row.amount)))}</span>
            </div>
        `;
  }

  function buildDataTerminalColumnHtml(rows, emptyMessage, side, selectedKey, options = {}) {
    const list = Array.isArray(rows) ? rows : [];
    const bodyHtml = list.length
      ? list.map((row) => buildDataTerminalRowHtml(row, side, selectedKey, options)).join('')
      : `<div class="data-terminal-column-empty">${escapeHtml(emptyMessage)}</div>`;
    return `
            <section class="data-terminal-column">
                <div class="data-terminal-head">
                    <span>链</span>
                    <span>Token -&gt; Token</span>
                    <span>汇率</span>
                    <span>数量</span>
                </div>
                ${bodyHtml}
            </section>
        `;
  }

  function buildDataTerminalPanelHtml(viewModel, selectionState = {}, options = {}) {
    if (!viewModel || viewModel.mode === 'empty') {
      return `<div class="data-terminal-empty">${escapeHtml(viewModel && viewModel.emptyMessage ? viewModel.emptyMessage : '输入 1 或 2 个代币开始搜索')}</div>`;
    }

    return `
            <div class="data-terminal-grid">
                ${buildDataTerminalColumnHtml(viewModel.leftRows || [], viewModel.emptyMessage || '暂无匹配交易对', 'left', selectionState.selectedLeftKey, options)}
                ${buildDataTerminalColumnHtml(viewModel.rightRows || [], viewModel.emptyMessage || '暂无匹配交易对', 'right', selectionState.selectedRightKey, options)}
            </div>
        `;
  }

  function buildDataTerminalShellHtml() {
    return `
            <div id="data-terminal-header">
                <span>数据终端</span>
                <div class="panel-header-actions">
                    <button id="data-terminal-min-btn" type="button" title="关闭">－</button>
                </div>
            </div>
            <div id="data-terminal-controls">
                <div class="data-terminal-controls-row">
                    <input id="data-terminal-search-input" type="text" placeholder="输入 1 或 2 个代币，空格或逗号分隔">
                    <label class="data-terminal-toggle" for="data-terminal-alias-toggle">
                        <input id="data-terminal-alias-toggle" type="checkbox" checked>
                        <span>允许别名</span>
                    </label>
                    <label class="data-terminal-toggle" for="data-terminal-diff-toggle">
                        <input id="data-terminal-diff-toggle" type="checkbox">
                        <span>显示和 1 的差值</span>
                    </label>
                    <span id="data-terminal-profit-bp" class="data-terminal-profit-bp data-terminal-profit-bp-empty">--</span>
                </div>
            </div>
            <div id="data-terminal-content"></div>
        `;
  }

  return {
    buildDataTerminalCandidates,
    buildDataTerminalPanelHtml,
    buildDataTerminalRecords,
    buildDataTerminalShellHtml,
    buildDataTerminalSelectionSummary,
    buildDataTerminalViewModel,
    formatDataTerminalBp,
    formatDataTerminalValue,
    parseDataTerminalQuery
  };
});
