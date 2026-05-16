(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbPanelLayoutUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_DISPLAY_MIN_PROFIT_BP = 0.5;

  function cloneSection(section, opportunities) {
    return {
      ...section,
      opportunities
    };
  }

  function splitSectionsBySectionCount(sections, sectionLimit = 6, maxColumns = 2) {
    const safeSections = Array.isArray(sections) ? sections : [];
    const columns = Array.from({ length: Math.max(1, maxColumns) }, () => []);
    const normalizedLimit = Number.isFinite(Number(sectionLimit)) && Number(sectionLimit) > 0
      ? Math.floor(Number(sectionLimit))
      : Number.MAX_SAFE_INTEGER;

    for (let index = 0; index < safeSections.length; index += 1) {
      const columnIndex = Math.min(Math.floor(index / normalizedLimit), columns.length - 1);
      const section = safeSections[index];
      const opportunities = Array.isArray(section && section.opportunities) ? section.opportunities : [];
      columns[columnIndex].push(cloneSection(section, opportunities));
    }

    return columns;
  }

  function buildArbPanelColumns(options = {}) {
    const fixedColumns = splitSectionsBySectionCount(
      options.fixedSections,
      options.fixedSectionLimit || 6,
      options.fixedMaxColumns || 2
    );
    return [
      fixedColumns[0] || [],
      fixedColumns[1] || [],
      Array.isArray(options.specialSections) ? options.specialSections : [],
      options.quoteSection ? [options.quoteSection] : [],
      options.globalSection ? [options.globalSection] : []
    ];
  }

  function resolveItemsBySelectors(items, selectors) {
    const safeItems = Array.isArray(items) ? items : [];
    const safeSelectors = Array.isArray(selectors) ? selectors : [];
    const usedIndexes = new Set();
    const matches = [];

    for (const selector of safeSelectors) {
      let matchIndex = -1;
      if (Number.isInteger(selector) && selector >= 0 && selector < safeItems.length) {
        matchIndex = selector;
      } else {
        const normalizedSelector = String(selector ?? '').trim();
        if (!normalizedSelector) continue;
        matchIndex = safeItems.findIndex((item) => String(item && item.name || '') === normalizedSelector || String(item && item.id || '') === normalizedSelector);
      }
      if (matchIndex < 0 || usedIndexes.has(matchIndex)) continue;
      usedIndexes.add(matchIndex);
      matches.push(safeItems[matchIndex]);
    }

    return matches;
  }

  function buildArbPathLegLine(leg, options = {}) {
    const item = leg || {};
    const displayFrom = item.rawFrom || item.from;
    const displayTo = item.rawTo || item.to;
    const formatLegLine = typeof options.formatLegLine === 'function'
      ? options.formatLegLine
      : (line) => `${line.chainLabel}: ${line.from} -> ${line.to}`;
    const formatChainLabel = typeof options.formatChainLabel === 'function'
      ? options.formatChainLabel
      : (chain) => String(chain || '');
    const formatCexBookValue = typeof options.formatCexBookValue === 'function'
      ? options.formatCexBookValue
      : (value) => String(value);
    const baseLine = formatLegLine({
      from: displayFrom,
      to: displayTo,
      rate: item.rate,
      chainLabel: formatChainLabel(item.chain)
    });

    if (item.cexLevelLabel && typeof item.cexLevelSize === 'number' && Number.isFinite(item.cexLevelSize)) {
      return `${baseLine} ${item.cexLevelLabel}×${formatCexBookValue(item.cexLevelSize, 6)}`;
    }
    return baseLine;
  }

  function buildArbPathLegLines(legs, options = {}) {
    return (Array.isArray(legs) ? legs : []).map((leg) => buildArbPathLegLine(leg, options));
  }

  function normalizeDisplayMinProfitBp(value, fallback = DEFAULT_DISPLAY_MIN_PROFIT_BP) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return Math.max(0, numericValue);
    const fallbackValue = Number(fallback);
    return Number.isFinite(fallbackValue) ? Math.max(0, fallbackValue) : DEFAULT_DISPLAY_MIN_PROFIT_BP;
  }

  function resolveDefaultDisplayMinProfitBp(source = {}, fallback = DEFAULT_DISPLAY_MIN_PROFIT_BP) {
    const sourceValue = Number(source && source.DEFAULT_FIXED_PATH_DISPLAY_MIN_PROFIT_BP);
    if (Number.isFinite(sourceValue)) return Math.max(0, sourceValue);
    return normalizeDisplayMinProfitBp(fallback);
  }

  function resolveDisplayMinProfitBp(options) {
    if (typeof options === 'number' || typeof options === 'string') {
      return normalizeDisplayMinProfitBp(options);
    }
    if (options && typeof options === 'object') {
      return normalizeDisplayMinProfitBp(options.minProfitBp);
    }
    return DEFAULT_DISPLAY_MIN_PROFIT_BP;
  }

  function selectCyclesAboveDisplayThreshold(cycles, minProfitBp = DEFAULT_DISPLAY_MIN_PROFIT_BP) {
    const list = Array.isArray(cycles) ? cycles.filter(Boolean) : [];
    const thresholdBp = normalizeDisplayMinProfitBp(minProfitBp);
    return list.filter((cycle) => {
      const profitRate = Number(cycle && cycle.profitRate);
      return Number.isFinite(profitRate) && profitRate * 10000 > thresholdBp;
    });
  }

  function selectPositiveCyclesOrBest(cycles) {
    const list = Array.isArray(cycles) ? cycles.filter(Boolean) : [];
    if (!list.length) return [];

    const positiveCycles = list.filter((cycle) => Number(cycle.profitRate) > 0);
    if (positiveCycles.length) return positiveCycles;

    let best = list[0];
    for (let index = 1; index < list.length; index += 1) {
      const candidate = list[index];
      if (Number(candidate.profitRate) > Number(best.profitRate)) {
        best = candidate;
      }
    }
    return best ? [best] : [];
  }

  function getCycleDisplayState(cycles, maxPositiveCount, expanded = false, options = null) {
    const list = Array.isArray(cycles) ? cycles : [];
    const maxCount = Math.max(1, Number(maxPositiveCount) || 1);
    const displayMinProfitBp = resolveDisplayMinProfitBp(options);
    if (!list.length) {
      return {
        displayCycles: [],
        positiveCount: 0,
        hiddenPositiveCount: 0,
        canToggleExpand: false,
        expanded: false,
        displayMinProfitBp
      };
    }

    const displayableCycles = selectCyclesAboveDisplayThreshold(list, displayMinProfitBp);

    if (displayableCycles.length) {
      const canToggleExpand = displayableCycles.length > maxCount;
      const shouldExpand = canToggleExpand && expanded;
      const displayCycles = shouldExpand ? displayableCycles : displayableCycles.slice(0, maxCount);
      return {
        displayCycles,
        positiveCount: displayableCycles.length,
        hiddenPositiveCount: Math.max(0, displayableCycles.length - displayCycles.length),
        canToggleExpand,
        expanded: shouldExpand,
        displayMinProfitBp
      };
    }

    return {
      displayCycles: [],
      positiveCount: 0,
      hiddenPositiveCount: 0,
      canToggleExpand: false,
      expanded: false,
      displayMinProfitBp
    };
  }

  function selectFirstUnmutedDisplayedCycle(cycles, isMuted) {
    const displayCycles = selectPositiveCyclesOrBest(cycles);
    if (!displayCycles.length) return null;
    if (typeof isMuted !== 'function' || displayCycles.length <= 1) {
      return displayCycles[0];
    }

    for (const cycle of displayCycles) {
      if (!isMuted(cycle)) {
        return cycle;
      }
    }
    return displayCycles[0];
  }

  function mapEntriesForDisplayCycles(allCycles, displayCycles, mapEntry) {
    const sourceCycles = Array.isArray(allCycles) ? allCycles : [];
    const visibleCycles = Array.isArray(displayCycles) ? displayCycles : [];
    if (!sourceCycles.length || !visibleCycles.length || typeof mapEntry !== 'function') {
      return [];
    }

    const visibleSet = new Set(visibleCycles);
    const entries = [];
    for (let index = 0; index < sourceCycles.length; index += 1) {
      const cycle = sourceCycles[index];
      if (!visibleSet.has(cycle)) continue;
      const entry = mapEntry(cycle, index, sourceCycles);
      if (entry) {
        entries.push(entry);
      }
    }
    return entries;
  }

  function parseFilterInput(inputText) {
    const tokens = String(inputText || '')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(Boolean);
    return Array.from(new Set(tokens));
  }

  function buildGlobalArbFilterCriteria(state = {}, options = {}) {
    const filterState = buildGlobalArbFilterState(state);
    const normalizeChainFilterToken = typeof options.normalizeChainFilterToken === 'function'
      ? options.normalizeChainFilterToken
      : (token) => String(token || '').trim();
    const excludedChains = Array.from(new Set(
      parseFilterInput(filterState.excludedChainsInput)
        .map((chainToken) => normalizeChainFilterToken(chainToken))
        .filter(Boolean)
    ));

    return {
      excludedSymbols: parseFilterInput(filterState.excludedSymbolsInput),
      excludedChains,
      includedSymbols: parseFilterInput(filterState.includedSymbolsInput),
      twoLegOnly: filterState.twoLegOnly
    };
  }

  function normalizeTextInput(value) {
    return typeof value === 'string' ? value : '';
  }

  function buildGlobalArbFilterState(state = {}) {
    return {
      excludedSymbolsInput: normalizeTextInput(state.excludedSymbolsInput),
      excludedChainsInput: normalizeTextInput(state.excludedChainsInput),
      includedSymbolsInput: normalizeTextInput(state.includedSymbolsInput),
      twoLegOnly: state.twoLegOnly === true || state.twoLegOnly === 1
    };
  }

  function buildGlobalArbFilterControlState(state = {}) {
    const nextState = buildGlobalArbFilterState(state);
    return {
      ...nextState,
      clearDisabled: !nextState.excludedSymbolsInput.trim()
        && !nextState.excludedChainsInput.trim()
        && !nextState.includedSymbolsInput.trim()
        && nextState.twoLegOnly !== true
    };
  }

  function buildGlobalArbFilterWritePlan(state = {}) {
    const controlState = buildGlobalArbFilterControlState(state);
    return {
      value: [
        { id: 'arb-global-filter-input', value: controlState.excludedSymbolsInput },
        { id: 'arb-global-chain-filter-input', value: controlState.excludedChainsInput },
        { id: 'arb-global-include-filter-input', value: controlState.includedSymbolsInput }
      ],
      checked: [
        { id: 'arb-global-two-leg-only', checked: controlState.twoLegOnly }
      ],
      disabled: [
        { id: 'arb-global-filter-clear-btn', disabled: controlState.clearDisabled }
      ]
    };
  }

  function applyGlobalArbFilterWritePlan(elements = {}, plan = {}) {
    let writeCount = 0;

    (plan.value || []).forEach((item) => {
      const input = elements[item.id];
      if (input && input.value !== item.value) {
        input.value = item.value;
        writeCount += 1;
      }
    });
    (plan.checked || []).forEach((item) => {
      const input = elements[item.id];
      if (input && input.checked !== item.checked) {
        input.checked = item.checked;
        writeCount += 1;
      }
    });
    (plan.disabled || []).forEach((item) => {
      const input = elements[item.id];
      if (input && input.disabled !== item.disabled) {
        input.disabled = item.disabled;
        writeCount += 1;
      }
    });

    return writeCount;
  }

  function readEventTargetTextValue(event) {
    return (event && event.target && typeof event.target.value === 'string')
      ? event.target.value
      : '';
  }

  function buildGlobalArbFilterEventPatch(field, event) {
    if (field === 'twoLegOnly') {
      return { twoLegOnly: Boolean(event && event.target && event.target.checked) };
    }
    if (field === 'excludedSymbolsInput' || field === 'excludedChainsInput' || field === 'includedSymbolsInput') {
      return { [field]: readEventTargetTextValue(event) };
    }
    return {};
  }

  function bindEvent(element, type, handler) {
    if (!element || typeof element.addEventListener !== 'function') return 0;
    element.addEventListener(type, handler);
    return 1;
  }

  function getGlobalArbFilterInputs(refs = {}) {
    return [
      refs.excludedSymbolsInput,
      refs.excludedChainsInput,
      refs.includedSymbolsInput
    ].filter(Boolean);
  }

  function blurGlobalArbFilterInputs(refs = {}, activeElement = null) {
    if (!activeElement || typeof activeElement.blur !== 'function') return false;
    if (!getGlobalArbFilterInputs(refs).includes(activeElement)) return false;
    activeElement.blur();
    return true;
  }

  function bindGlobalArbFilterEvents(refs = {}, handlers = {}) {
    const onPatch = typeof handlers.onPatch === 'function' ? handlers.onPatch : () => {};
    const onClear = typeof handlers.onClear === 'function' ? handlers.onClear : () => {};
    const getActiveElement = typeof handlers.getActiveElement === 'function'
      ? handlers.getActiveElement
      : () => null;
    const onKeydown = typeof handlers.onKeydown === 'function'
      ? handlers.onKeydown
      : (event) => {
          if (!event || event.key !== 'Enter') return;
          if (typeof event.preventDefault === 'function') {
            event.preventDefault();
          }
          blurGlobalArbFilterInputs(refs, getActiveElement());
        };
    const closestEventTarget = typeof handlers.closestEventTarget === 'function'
      ? handlers.closestEventTarget
      : null;
    const inputBindings = [
      [refs.excludedSymbolsInput, 'excludedSymbolsInput'],
      [refs.excludedChainsInput, 'excludedChainsInput'],
      [refs.includedSymbolsInput, 'includedSymbolsInput']
    ];

    let boundCount = 0;
    inputBindings.forEach(([element, field]) => {
      boundCount += bindEvent(element, 'input', (event) => {
        onPatch(buildGlobalArbFilterEventPatch(field, event), event);
      });
      boundCount += bindEvent(element, 'keydown', onKeydown);
    });
    boundCount += bindEvent(refs.twoLegOnlyInput, 'change', (event) => {
      onPatch(buildGlobalArbFilterEventPatch('twoLegOnly', event), event);
    });
    boundCount += bindEvent(refs.clearButton, 'click', onClear);
    boundCount += bindEvent(refs.header, 'click', (event) => {
      if (closestEventTarget && closestEventTarget(event, 'button, input, textarea, select, [contenteditable="true"]')) {
        return;
      }
      blurGlobalArbFilterInputs(refs, getActiveElement());
    });
    return boundCount;
  }

  function updateGlobalArbFilterState(currentState, patch = {}) {
    const current = buildGlobalArbFilterState(currentState);
    const next = buildGlobalArbFilterState({
      ...current,
      ...patch
    });
    return {
      changed: next.excludedSymbolsInput !== current.excludedSymbolsInput
        || next.excludedChainsInput !== current.excludedChainsInput
        || next.includedSymbolsInput !== current.includedSymbolsInput
        || next.twoLegOnly !== current.twoLegOnly,
      state: next
    };
  }

  function clearGlobalArbFilterState(currentState) {
    return updateGlobalArbFilterState(currentState, {
      excludedSymbolsInput: '',
      excludedChainsInput: '',
      includedSymbolsInput: '',
      twoLegOnly: false
    });
  }

  function createGlobalArbFilterStateRuntime(initialState = {}) {
    let currentState = buildGlobalArbFilterState(initialState);

    function get() {
      return buildGlobalArbFilterState(currentState);
    }

    function applyResult(result) {
      currentState = buildGlobalArbFilterState(result.state);
      return {
        changed: result.changed === true,
        state: get()
      };
    }

    return {
      get,
      update(patch = {}) {
        return applyResult(updateGlobalArbFilterState(currentState, patch));
      },
      clear() {
        return applyResult(clearGlobalArbFilterState(currentState));
      }
    };
  }

  function cycleContainsAnySymbols(cycle, symbols) {
    if (!cycle || !Array.isArray(cycle.legs) || !Array.isArray(symbols) || !symbols.length) return false;
    const symbolSet = new Set(symbols);
    return cycle.legs.some(leg => symbolSet.has(leg.from) || symbolSet.has(leg.to));
  }

  function cycleContainsAnyChains(cycle, chains) {
    if (!cycle || !Array.isArray(cycle.legs) || !Array.isArray(chains) || !chains.length) return false;
    const chainSet = new Set(chains);
    return cycle.legs.some(leg => chainSet.has(String(leg.chain || '')));
  }

  function filterGlobalArbCycles(cycles, options = {}) {
    const sourceCycles = Array.isArray(cycles) ? cycles : [];
    const includedSymbols = Array.isArray(options.includedSymbols) ? options.includedSymbols : [];
    const excludedSymbols = Array.isArray(options.excludedSymbols) ? options.excludedSymbols : [];
    const excludedChains = Array.isArray(options.excludedChains) ? options.excludedChains : [];
    const isRuleLeg = typeof options.isRuleLeg === 'function' ? options.isRuleLeg : () => false;
    const twoLegOnlyCycles = options.twoLegOnly === true
      ? sourceCycles.filter((cycle) => {
        const cycleLegs = Array.isArray(cycle && cycle.legs) ? cycle.legs.filter((leg) => !isRuleLeg(leg)) : [];
        return cycleLegs.length === 2;
      })
      : sourceCycles;
    const hasFilter = Boolean(excludedSymbols.length || excludedChains.length || includedSymbols.length);
    const filteredCycles = hasFilter
      ? twoLegOnlyCycles.filter(cycle =>
        (!includedSymbols.length || cycleContainsAnySymbols(cycle, includedSymbols)) &&
        !cycleContainsAnySymbols(cycle, excludedSymbols) &&
        !cycleContainsAnyChains(cycle, excludedChains)
      )
      : twoLegOnlyCycles;

    return {
      cycles: filteredCycles,
      hasFilter
    };
  }

  function buildGlobalArbSection(options = {}) {
    const cycles = Array.isArray(options.cycles) ? options.cycles : [];
    const sectionKey = String(options.sectionKey || 'global:all');
    const filterState = filterGlobalArbCycles(cycles, {
      includedSymbols: options.includedSymbols,
      excludedSymbols: options.excludedSymbols,
      excludedChains: options.excludedChains,
      twoLegOnly: options.twoLegOnly === true,
      isRuleLeg: options.isRuleLeg
    });
    const displayState = getCycleDisplayState(
      filterState.cycles,
      options.maxPositiveCount || 8,
      options.expanded === true,
      options.displayOptions || null
    );
    const buildEntry = typeof options.buildEntry === 'function' ? options.buildEntry : () => null;
    const opportunities = mapEntriesForDisplayCycles(cycles, displayState.displayCycles, buildEntry);
    const buildFooterHtml = typeof options.buildFooterHtml === 'function' ? options.buildFooterHtml : () => '';
    return {
      title: String(options.title || '全局路径'),
      opportunities,
      footerHtml: buildFooterHtml(displayState, sectionKey),
      emptyText: filterState.hasFilter ? '过滤后暂无路径' : '等待数据...'
    };
  }

  function buildArbOpportunityStoreEntry(opportunityId, cycle, label, meta = {}) {
    return {
      id: opportunityId,
      cycle,
      label,
      ...meta
    };
  }

  function buildArbOpportunityDisplayEntry(opportunityId, cycle, label, meta = {}, options = {}) {
    return {
      label,
      cycle,
      opportunityId,
      isAlertHighlighted: options.isAlertHighlighted === true,
      clickable: meta.clickable !== false,
      displayMessage: typeof meta.displayMessage === 'string' ? meta.displayMessage : '',
      hideLegs: meta.hideLegs === true,
      entryType: typeof meta.entryType === 'string' ? meta.entryType : ''
    };
  }

  function registerArbOpportunityHighlightTarget(targetMap, targetKey, opportunityId) {
    if (!(targetMap instanceof Map) || !targetKey || !opportunityId) return;
    const currentIds = targetMap.get(targetKey);
    if (currentIds) {
      currentIds.push(opportunityId);
      return;
    }
    targetMap.set(targetKey, [opportunityId]);
  }

  function buildFixedArbSections(options = {}) {
    const fixedResults = Array.isArray(options.fixedResults) ? options.fixedResults : [];
    const getDisplayMinProfitBp = typeof options.getDisplayMinProfitBp === 'function'
      ? options.getDisplayMinProfitBp
      : () => DEFAULT_DISPLAY_MIN_PROFIT_BP;
    const buildEntry = typeof options.buildEntry === 'function' ? options.buildEntry : () => null;
    return fixedResults.map(({ rule, cycles }) => {
      const displayMinProfitBp = normalizeDisplayMinProfitBp(getDisplayMinProfitBp(rule));
      const displayCycles = selectCyclesAboveDisplayThreshold(cycles, displayMinProfitBp);
      const opportunities = displayCycles
        .map((cycle, index, items) => buildEntry(cycle, index, items, rule, displayMinProfitBp))
        .filter(Boolean);
      return {
        title: String(rule?.title || '固定路径'),
        opportunities,
        emptyText: `无收益率 > ${displayMinProfitBp}bp`
      };
    });
  }

  function buildSpecialArbSections(options = {}) {
    const specialResults = Array.isArray(options.specialResults) ? options.specialResults : [];
    const specialRules = Array.isArray(options.specialRules) ? options.specialRules : [];
    const buildEntry = typeof options.buildEntry === 'function' ? options.buildEntry : () => null;
    const specialOpportunities = specialResults
      .flatMap(({ opportunities }) => Array.isArray(opportunities) ? opportunities : []);
    const specialEntries = specialOpportunities
      .map((opportunity) => buildEntry(opportunity))
      .filter(Boolean);
    const entriesByLabel = new Map(
      specialEntries
        .filter((entry) => entry && typeof entry.label === 'string' && entry.label.trim())
        .map((entry) => [entry.label.trim(), entry])
    );
    return specialRules
      .filter((rule) => rule && typeof rule.title === 'string' && rule.title.trim())
      .map((rule) => {
        const title = rule.title.trim();
        const entry = entriesByLabel.get(title);
        const opportunity = entry && entry.cycle && entry.cycle.profitRate > 0
          ? { ...entry, label: '' }
          : null;
        return {
          title,
          sectionType: 'special-rule',
          titleProfitRate: opportunity && opportunity.cycle ? opportunity.cycle.profitRate : null,
          opportunities: opportunity ? [opportunity] : [],
          emptyText: '无收益率'
        };
      });
  }

  function buildQuotePriceWatchDisplayEntry(options = {}) {
    const hasQuote = options.hasQuote === true;
    const hasValue = options.value !== null && options.value !== undefined;
    let statusText = '';
    if (!hasQuote || !hasValue) {
      statusText = '等待报价';
    } else if (options.isPaused) {
      statusText = '报价暂停';
    }
    return {
      entryType: 'quote-price',
      title: String(options.title || ''),
      priceText: hasValue ? String(options.priceText) : '--',
      metaText: [options.chainLabel, options.pairLabel].filter(Boolean).join(' · '),
      statusText,
      muted: Boolean(statusText)
    };
  }

  function buildQuotePriceWatchSection(options = {}) {
    const watchItems = Array.isArray(options.watchItems) ? options.watchItems : [];
    const findQuote = typeof options.findQuote === 'function' ? options.findQuote : () => null;
    const getQuoteState = typeof options.getQuoteState === 'function' ? options.getQuoteState : () => ({});
    const resolveValue = typeof options.resolveValue === 'function' ? options.resolveValue : () => null;
    const isQuotePaused = typeof options.isQuotePaused === 'function' ? options.isQuotePaused : () => false;
    const buildPairLabel = typeof options.buildPairLabel === 'function' ? options.buildPairLabel : () => '';
    const formatChainLabel = typeof options.formatChainLabel === 'function' ? options.formatChainLabel : (chain) => String(chain || '');
    const formatPrice = typeof options.formatPrice === 'function' ? options.formatPrice : (value) => value;
    const opportunities = watchItems
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const quote = findQuote(item);
        const hasQuote = Boolean(quote);
        const state = hasQuote ? getQuoteState(quote, item) || {} : {};
        const value = hasQuote ? resolveValue(item, state, quote) : null;
        return buildQuotePriceWatchDisplayEntry({
          title: item.title,
          hasQuote,
          value,
          priceText: value == null ? '--' : formatPrice(value, item, state, quote),
          isPaused: hasQuote ? isQuotePaused(quote, item, state) : false,
          chainLabel: hasQuote ? formatChainLabel(quote.chain, quote, item, state) : '未知链',
          pairLabel: hasQuote ? buildPairLabel(quote, state, item) : `报价 #${String(item.quoteId)}`
        });
      })
      .filter(Boolean);
    return {
      title: '关注列表',
      opportunities,
      emptyText: '暂无关注价格'
    };
  }

  return {
    buildArbPanelColumns,
    resolveItemsBySelectors,
    buildArbPathLegLine,
    buildArbPathLegLines,
    normalizeDisplayMinProfitBp,
    resolveDefaultDisplayMinProfitBp,
    buildArbOpportunityDisplayEntry,
    buildArbOpportunityStoreEntry,
    buildFixedArbSections,
    buildGlobalArbSection,
    buildSpecialArbSections,
    buildQuotePriceWatchSection,
    parseFilterInput,
    buildGlobalArbFilterState,
    buildGlobalArbFilterControlState,
    buildGlobalArbFilterEventPatch,
    buildGlobalArbFilterCriteria,
    blurGlobalArbFilterInputs,
    bindGlobalArbFilterEvents,
    buildGlobalArbFilterWritePlan,
    applyGlobalArbFilterWritePlan,
    updateGlobalArbFilterState,
    clearGlobalArbFilterState,
    createGlobalArbFilterStateRuntime,
    registerArbOpportunityHighlightTarget,
    selectFirstUnmutedDisplayedCycle
  };
}));
