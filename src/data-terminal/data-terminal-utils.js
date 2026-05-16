(function (root, factory) {
  const quotePauseUtils = typeof module !== 'undefined' && module.exports
    ? require('../quote/quote-pause-utils')
    : root.QuotePauseUtils;
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('../shared/chain-defaults')
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
  const DATA_TERMINAL_DEFAULT_WIDTH_SCALE = 0.65;

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

  function applyDataTerminalSelectionSummaryDomState(refs = {}, summary = {}) {
    const profitBpEl = refs.profitBp;
    if (!profitBpEl) return false;
    profitBpEl.textContent = summary.text || '--';
    if (profitBpEl.classList && typeof profitBpEl.classList.toggle === 'function') {
      profitBpEl.classList.toggle('data-terminal-profit-bp-empty', summary.profitBp === null);
    }
    return true;
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

  function readDatasetValue(element, key) {
    return String(element && element.dataset && element.dataset[key] || '').trim();
  }

  function createClosestResolver(event, options = {}) {
    const closestEventTarget = typeof options.closestEventTarget === 'function'
      ? options.closestEventTarget
      : () => null;
    return (selector) => closestEventTarget(event, selector);
  }

  function resolveDataTerminalContentClickAction(event, options = {}) {
    const closest = createClosestResolver(event, options);
    const dexLinkEl = closest('[data-dex-link-copy]');
    if (dexLinkEl) {
      return { type: 'copy-dex-link', element: dexLinkEl };
    }

    const rowEl = closest('[data-data-terminal-row-key]');
    const side = readDatasetValue(rowEl, 'dataTerminalSide');
    const rowKey = readDatasetValue(rowEl, 'dataTerminalRowKey');
    if ((side === 'left' || side === 'right') && rowKey) {
      return {
        type: 'toggle-row',
        side,
        rowKey
      };
    }

    return { type: 'none' };
  }

  function resolveDataTerminalHeaderClickAction(event, options = {}) {
    if (!event) return { type: 'none' };
    const closest = createClosestResolver(event, options);
    if (closest('button')) return { type: 'none' };
    return { type: 'blur-search' };
  }

  function buildDataTerminalControlWritePlan(state = {}) {
    return {
      value: [
        { id: 'data-terminal-search-input', value: String(state.query || '') }
      ],
      checked: [
        { id: 'data-terminal-alias-toggle', checked: state.allowAliases === true },
        { id: 'data-terminal-diff-toggle', checked: state.showDiff === true }
      ]
    };
  }

  function getDataTerminalControlElements(refs = {}) {
    return {
      'data-terminal-search-input': refs.searchInput,
      'data-terminal-alias-toggle': refs.aliasToggle,
      'data-terminal-diff-toggle': refs.diffToggle
    };
  }

  function applyDataTerminalControlWritePlan(plan = {}, refs = {}) {
    const elements = getDataTerminalControlElements(refs);
    let changed = false;
    (plan.value || []).forEach((item) => {
      const element = elements[item.id];
      if (!element || element.value === item.value) return;
      element.value = item.value;
      changed = true;
    });
    (plan.checked || []).forEach((item) => {
      const element = elements[item.id];
      if (!element || element.checked === item.checked) return;
      element.checked = item.checked;
      changed = true;
    });
    return changed;
  }

  function readEventTargetTextValue(event) {
    return (event && event.target && typeof event.target.value === 'string')
      ? event.target.value
      : '';
  }

  function buildDataTerminalControlEventPatch(field, event) {
    if (field === 'query') {
      return { query: readEventTargetTextValue(event) };
    }
    if (field === 'allowAliases') {
      return { allowAliases: Boolean(event && event.target && event.target.checked) };
    }
    if (field === 'showDiff') {
      return { showDiff: Boolean(event && event.target && event.target.checked) };
    }
    return {};
  }

  function applyDataTerminalStatePatch(state = {}, patch = {}) {
    const keys = ['query', 'allowAliases', 'showDiff', 'selectedLeftKey', 'selectedRightKey'];
    let changed = false;
    keys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(patch, key)) return;
      state[key] = patch[key];
      changed = true;
    });
    return changed;
  }

  function readElementDisplay(element, getComputedStyle) {
    if (typeof getComputedStyle === 'function') {
      const computedStyle = getComputedStyle(element);
      return String(computedStyle && computedStyle.display || '');
    }
    return String(element && element.style && element.style.display || '');
  }

  function applyDataTerminalWindowPosition(panel, options = {}) {
    if (!panel || !panel.style) return false;

    const baseLeft = Number.isFinite(Number(options.baseLeft)) ? Number(options.baseLeft) : 20;
    const baseBottom = Number.isFinite(Number(options.baseBottom)) ? Number(options.baseBottom) : 20;
    const anchorOffsetLeft = Number.isFinite(Number(options.anchorOffsetLeft)) ? Number(options.anchorOffsetLeft) : 24;
    const anchorOffsetTop = Number.isFinite(Number(options.anchorOffsetTop)) ? Number(options.anchorOffsetTop) : 24;
    const minTop = Number.isFinite(Number(options.minTop)) ? Number(options.minTop) : 80;
    panel.style.left = `${baseLeft}px`;
    panel.style.bottom = `${baseBottom}px`;
    panel.style.top = '';

    const anchorPanel = options.anchorPanel;
    if (!anchorPanel || readElementDisplay(anchorPanel, options.getComputedStyle) === 'none') {
      return true;
    }
    if (typeof anchorPanel.getBoundingClientRect !== 'function') return true;

    const rect = anchorPanel.getBoundingClientRect();
    const anchorLeft = Number(rect && rect.left);
    const anchorTop = Number(rect && rect.top);
    panel.style.left = `${Math.max(baseLeft, (Number.isFinite(anchorLeft) ? anchorLeft : 0) + anchorOffsetLeft)}px`;
    panel.style.top = `${Math.max(minTop, (Number.isFinite(anchorTop) ? anchorTop : 0) + anchorOffsetTop)}px`;
    panel.style.bottom = '';
    return true;
  }

  function applyDataTerminalDefaultSize(panel, options = {}) {
    if (!panel || !panel.style || !options.anchorPanel) return false;
    const anchorStyle = typeof options.getComputedStyle === 'function'
      ? options.getComputedStyle(options.anchorPanel)
      : null;
    if (!anchorStyle) return false;

    const widthScale = Number.isFinite(Number(options.widthScale))
      ? Number(options.widthScale)
      : DATA_TERMINAL_DEFAULT_WIDTH_SCALE;
    if (anchorStyle.width) {
      const anchorWidth = parseFloat(anchorStyle.width);
      panel.style.width = Number.isFinite(anchorWidth)
        ? `${Math.round(anchorWidth * widthScale)}px`
        : anchorStyle.width;
    }
    if (anchorStyle.height) {
      panel.style.height = anchorStyle.height;
    }
    return true;
  }

  function getDataTerminalDomRefs(panel) {
    const query = panel && typeof panel.querySelector === 'function'
      ? panel.querySelector.bind(panel)
      : () => null;
    return {
      window: panel || null,
      header: query('#data-terminal-header'),
      minBtn: query('#data-terminal-min-btn'),
      searchInput: query('#data-terminal-search-input'),
      aliasToggle: query('#data-terminal-alias-toggle'),
      diffToggle: query('#data-terminal-diff-toggle'),
      profitBp: query('#data-terminal-profit-bp'),
      content: query('#data-terminal-content')
    };
  }

  function buildDataTerminalSelectionPatch(selectionState = {}, action = {}) {
    if (!action || action.type !== 'toggle-row') return {};
    const rowKey = String(action.rowKey || '');
    if (!rowKey) return {};
    if (action.side === 'left') {
      const currentLeftKey = String(selectionState.selectedLeftKey || selectionState.leftKey || '');
      return { selectedLeftKey: currentLeftKey === rowKey ? '' : rowKey };
    }
    if (action.side === 'right') {
      const currentRightKey = String(selectionState.selectedRightKey || selectionState.rightKey || '');
      return { selectedRightKey: currentRightKey === rowKey ? '' : rowKey };
    }
    return {};
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

  function createDataTerminalCache() {
    let recordsCacheKey = '';
    let recordsCache = null;
    let candidatesCacheKey = '';
    let candidatesCache = null;

    function getRecords(cacheKey, buildRecords) {
      const normalizedKey = String(cacheKey || '');
      if (recordsCache !== null && recordsCacheKey === normalizedKey) {
        return recordsCache;
      }
      const records = typeof buildRecords === 'function' ? buildRecords() : [];
      recordsCacheKey = normalizedKey;
      recordsCache = Array.isArray(records) ? records : [];
      return recordsCache;
    }

    function getCandidates(cacheKey, buildCandidates) {
      const normalizedKey = String(cacheKey || '');
      if (candidatesCache !== null && candidatesCacheKey === normalizedKey) {
        return candidatesCache;
      }
      const candidates = typeof buildCandidates === 'function' ? buildCandidates() : [];
      candidatesCacheKey = normalizedKey;
      candidatesCache = Array.isArray(candidates) ? candidates : [];
      return candidatesCache;
    }

    function clear() {
      recordsCacheKey = '';
      recordsCache = null;
      candidatesCacheKey = '';
      candidatesCache = null;
    }

    return {
      clear,
      getCandidates,
      getRecords
    };
  }

  function createDataTerminalUpdateRuntime(options = {}) {
    const setTimer = typeof options.setTimeout === 'function'
      ? options.setTimeout
      : (typeof setTimeout === 'function' ? setTimeout : null);
    const clearTimerImpl = typeof options.clearTimeout === 'function'
      ? options.clearTimeout
      : (typeof clearTimeout === 'function' ? clearTimeout : null);
    const delayMs = Number.isFinite(Number(options.delayMs)) && Number(options.delayMs) >= 0
      ? Number(options.delayMs)
      : 0;
    const canUpdate = typeof options.canUpdate === 'function'
      ? options.canUpdate
      : () => false;
    const update = typeof options.update === 'function'
      ? options.update
      : () => {};
    let timer = null;

    function clear() {
      if (timer === null) return false;
      if (clearTimerImpl) {
        clearTimerImpl(timer);
      }
      timer = null;
      return true;
    }

    function schedule() {
      if (!canUpdate()) return false;
      if (timer !== null) return false;
      if (!setTimer) {
        update();
        return true;
      }
      timer = setTimer(() => {
        timer = null;
        update();
      }, delayMs);
      return true;
    }

    return {
      clear,
      hasTimer: () => timer !== null,
      schedule
    };
  }

  return {
    buildDataTerminalCandidates,
    buildDataTerminalControlEventPatch,
    buildDataTerminalControlWritePlan,
    applyDataTerminalControlWritePlan,
    applyDataTerminalSelectionSummaryDomState,
    applyDataTerminalStatePatch,
    buildDataTerminalPanelHtml,
    buildDataTerminalRecords,
    buildDataTerminalShellHtml,
    applyDataTerminalDefaultSize,
    applyDataTerminalWindowPosition,
    buildDataTerminalSelectionPatch,
    buildDataTerminalSelectionSummary,
    buildDataTerminalViewModel,
    createDataTerminalCache,
    createDataTerminalUpdateRuntime,
    getDataTerminalDomRefs,
    parseDataTerminalQuery,
    resolveDataTerminalContentClickAction,
    resolveDataTerminalHeaderClickAction
  };
});
