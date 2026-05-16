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

  function splitSectionsIntoColumns(sections, columnLimit = 6, maxColumns = 2) {
    const safeSections = Array.isArray(sections) ? sections : [];
    const columns = Array.from({ length: Math.max(1, maxColumns) }, () => []);
    let columnIndex = 0;
    let usedInColumn = 0;
    const normalizedLimit = Number.isFinite(Number(columnLimit)) && Number(columnLimit) > 0
      ? Math.floor(Number(columnLimit))
      : Number.MAX_SAFE_INTEGER;

    for (const section of safeSections) {
      const opportunities = Array.isArray(section && section.opportunities) ? section.opportunities : [];
      if (!opportunities.length) {
        if (usedInColumn >= normalizedLimit && columnIndex < columns.length - 1) {
          columnIndex += 1;
          usedInColumn = 0;
        }
        columns[columnIndex].push(cloneSection(section, []));
        usedInColumn += 1;
        continue;
      }

      let offset = 0;
      while (offset < opportunities.length) {
        if (columnIndex >= columns.length) {
          columns[columns.length - 1].push(cloneSection(section, opportunities.slice(offset)));
          offset = opportunities.length;
          break;
        }

        const remaining = normalizedLimit - usedInColumn;
        if (remaining <= 0 && columnIndex < columns.length - 1) {
          columnIndex += 1;
          usedInColumn = 0;
          continue;
        }

        const takeCount = columnIndex < columns.length - 1 ? Math.min(remaining, opportunities.length - offset) : opportunities.length - offset;
        columns[columnIndex].push(cloneSection(section, opportunities.slice(offset, offset + takeCount)));
        offset += takeCount;
        usedInColumn += takeCount;

        if (usedInColumn >= normalizedLimit && columnIndex < columns.length - 1) {
          columnIndex += 1;
          usedInColumn = 0;
        }
      }
    }

    return columns;
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
    splitSectionsIntoColumns,
    splitSectionsBySectionCount,
    resolveItemsBySelectors,
    DEFAULT_DISPLAY_MIN_PROFIT_BP,
    normalizeDisplayMinProfitBp,
    resolveDefaultDisplayMinProfitBp,
    selectCyclesAboveDisplayThreshold,
    selectPositiveCyclesOrBest,
    buildArbOpportunityDisplayEntry,
    buildArbOpportunityStoreEntry,
    buildQuotePriceWatchDisplayEntry,
    buildQuotePriceWatchSection,
    getCycleDisplayState,
    mapEntriesForDisplayCycles,
    parseFilterInput,
    cycleContainsAnySymbols,
    cycleContainsAnyChains,
    filterGlobalArbCycles,
    registerArbOpportunityHighlightTarget,
    selectFirstUnmutedDisplayedCycle
  };
}));
