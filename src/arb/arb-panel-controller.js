(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbPanelController = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createArbPanelController(options = {}) {
    const arbPanelLayoutUtils = options.arbPanelLayoutUtils;
    const arbPanelRenderer = options.arbPanelRenderer;
    const arbRuntimeMemoryUtils = options.arbRuntimeMemoryUtils;
    const arbDiscovery = options.arbDiscovery;
    const dashboardRuntimeUtils = options.dashboardRuntimeUtils;
    const domRenderUtils = options.domRenderUtils;
    const refs = options.refs || {};
    const arbPathConfig = options.arbPathConfig || {};
    const getDashboardState = typeof options.getDashboardState === 'function'
      ? options.getDashboardState
      : () => [];
    const getQuoteMarketState = typeof options.getQuoteMarketState === 'function'
      ? options.getQuoteMarketState
      : () => null;
    const getAlertConfig = typeof options.getAlertConfig === 'function'
      ? options.getAlertConfig
      : () => null;
    const isQuotePaused = typeof options.isQuotePaused === 'function'
      ? options.isQuotePaused
      : () => false;
    const getArbDetailController = typeof options.getArbDetailController === 'function'
      ? options.getArbDetailController
      : () => null;
    const arbAlertBridgeRuntime = options.arbAlertBridgeRuntime || {};
    const openArbDetailModal = typeof options.openArbDetailModal === 'function'
      ? options.openArbDetailModal
      : () => {};
    const buildQuoteAlertDisplayLabel = typeof options.buildQuoteAlertDisplayLabel === 'function'
      ? options.buildQuoteAlertDisplayLabel
      : () => '';
    const windowImpl = options.windowImpl || {};
    const documentImpl = options.documentImpl || {};
    const closestEventTarget = typeof options.closestEventTarget === 'function'
      ? options.closestEventTarget
      : () => null;
    const setTimer = typeof options.setTimeout === 'function' ? options.setTimeout : setTimeout;
    const clearTimer = typeof options.clearTimeout === 'function' ? options.clearTimeout : clearTimeout;
    const updateDelayMs = Number.isFinite(Number(options.updateDelayMs)) ? Number(options.updateDelayMs) : 0;
    const arbGlobalFilterStateRuntime = arbPanelLayoutUtils.createGlobalArbFilterStateRuntime();
    let arbPanelHtmlRenderer = null;
    const arbPanelInteractionDeferralRuntime = (
      domRenderUtils && typeof domRenderUtils.createRenderInteractionDeferralRuntime === 'function'
    )
      ? domRenderUtils.createRenderInteractionDeferralRuntime({
        getTarget: () => refs.arbPathContent,
        setTimeout: setTimer,
        clearTimeout: clearTimer,
        trackFocus: false,
        releaseTarget: documentImpl,
        releaseEventListenerOptions: { capture: true },
        onIdle: () => {
          if (arbPanelHtmlRenderer && typeof arbPanelHtmlRenderer.flush === 'function') {
            arbPanelHtmlRenderer.flush(refs.arbPathContent);
          }
        }
      })
      : null;
    arbPanelHtmlRenderer = domRenderUtils.createStableHtmlRenderer({
      shouldDeferRender: (element) => (
        Boolean(
          arbPanelInteractionDeferralRuntime
          && typeof arbPanelInteractionDeferralRuntime.shouldDeferRender === 'function'
          && arbPanelInteractionDeferralRuntime.shouldDeferRender(element)
        )
      )
    });
    const arbExpandedSections = new Set();
    let arbLastPointerOpenedOpportunityId = null;

    const arbPanelUpdateRuntime = arbRuntimeMemoryUtils.createArbPanelUpdateRuntime({
      setTimer,
      clearTimer,
      delayMs: updateDelayMs,
      isVisible: () => dashboardRuntimeUtils.isPanelVisible(refs.arbPathWindow),
      update: () => updateArbPanel()
    });

    function getDashboardCategories() {
      const dashboardState = getDashboardState();
      return Array.isArray(dashboardState) ? dashboardState : [];
    }

    function getFixedRuleWatchItems() {
      return options.arbPathConfigUtils && typeof options.arbPathConfigUtils.getFixedRuleWatchItems === 'function'
        ? options.arbPathConfigUtils.getFixedRuleWatchItems(arbPathConfig)
        : [];
    }

    function formatChainLabel(chain) {
      return options.chainDefaults.getChainDisplayName(chain);
    }

    function buildArbPathLegLineOptions() {
      return {
        formatLegLine: (line) => options.arbPaths.formatLegLine(line),
        formatChainLabel,
        formatCexBookValue: (value, maxDecimals) => options.quoteDisplayUtils.formatCexBookValue(value, maxDecimals)
      };
    }

    function formatArbPathLegLine(leg) {
      return arbPanelLayoutUtils.buildArbPathLegLine(leg, buildArbPathLegLineOptions());
    }

    function isRuleLeg(leg) {
      return options.arbDetailUtils.isArbRuleLeg(leg);
    }

    function formatDetailNumber(value, precision = 6) {
      return options.arbDetailUtils.formatDetailNumber(value, precision);
    }

    function findQuoteById(quoteId) {
      return dashboardRuntimeUtils.findDashboardQuoteMatchById(getDashboardCategories(), quoteId);
    }

    function buildLiveQuoteLabel(chain, fromSymbol, toSymbol, suffix = '') {
      return options.pathAlertPageUtils.buildPathAlertQuoteLabel({
        chain,
        fromSymbol,
        toSymbol,
        suffix,
        formatChainLabel
      });
    }

    function buildMutedPathTargetKey(alertOrTarget) {
      return typeof arbAlertBridgeRuntime.buildMutedPathTargetKey === 'function'
        ? arbAlertBridgeRuntime.buildMutedPathTargetKey(alertOrTarget)
        : '';
    }

    function buildMutedPathTargetFromCycleLegs(legs) {
      return typeof arbAlertBridgeRuntime.buildMutedPathTargetFromCycleLegs === 'function'
        ? arbAlertBridgeRuntime.buildMutedPathTargetFromCycleLegs(legs)
        : null;
    }

    function createOpportunityEntry(targetMap, highlightTargetMap, cycle, label, meta = {}) {
      if (!cycle) return null;
      const opportunityId = options.arbDetailUtils.buildUniqueArbOpportunityId(
        new Set(targetMap.keys()),
        meta.section || '',
        label || '',
        cycle
      );
      const entry = arbPanelLayoutUtils.buildArbOpportunityStoreEntry(opportunityId, cycle, label, meta);
      targetMap.set(opportunityId, entry);
      arbPanelLayoutUtils.registerArbOpportunityHighlightTarget(
        highlightTargetMap,
        arbPanelLayoutUtils.buildArbOpportunityHighlightTargetKeyFromCycle(cycle, {
          buildMutedPathTargetFromCycleLegs,
          buildTargetKey: buildMutedPathTargetKey
        }),
        opportunityId
      );

      return arbPanelLayoutUtils.buildArbOpportunityDisplayEntry(opportunityId, cycle, label, meta, {
        isAlertHighlighted: options.arbOpportunityHighlightRuntime.isHighlighted(opportunityId)
      });
    }

    function refreshOpportunityRuntime(nextOpportunityMap, nextOpportunityIdsByTargetKey) {
      const arbDetailController = getArbDetailController();
      const retainedEntries = arbDetailController
        ? arbDetailController.getRetainedOpportunities(
            (opportunityId) => options.arbOpportunityRuntime.getOpportunity(opportunityId)
          )
        : [];

      options.arbOpportunityRuntime.setPanelOpportunities(nextOpportunityMap, nextOpportunityIdsByTargetKey, retainedEntries);
    }

    function buildQuotePriceWatchSection() {
      return arbPanelLayoutUtils.buildQuotePriceWatchSection({
        watchItems: options.arbPathConfigUtils.getQuotePriceWatchItems(arbPathConfig, {
          alertConfig: getAlertConfig()
        }),
        findQuote: (item) => dashboardRuntimeUtils.findDashboardQuoteById(getDashboardCategories(), item.quoteId),
        getQuoteState: (quote) => getQuoteMarketState(Number(quote.id)) || {},
        resolveValue: (item, state) => options.arbPathConfigUtils.resolveQuotePriceValue(item, state),
        isQuotePaused,
        buildPairLabel: (quote, state, item) => buildQuoteAlertDisplayLabel(quote, state, item.direction),
        formatChainLabel,
        formatPrice: (value) => String(formatDetailNumber(value, 8))
      });
    }

    function buildFixedSections(sharedRuleSnapshot, nextOpportunityMap, nextOpportunityIdsByTargetKey) {
      const fixedResults = (
        options.arbPathConfigUtils && typeof options.arbPathConfigUtils.applyFixedRuleWatchItemsToResults === 'function'
      )
        ? options.arbPathConfigUtils.applyFixedRuleWatchItemsToResults(
          sharedRuleSnapshot.fixedResults,
          getFixedRuleWatchItems()
        )
        : sharedRuleSnapshot.fixedResults;
      return arbPanelLayoutUtils.buildFixedArbSections({
        fixedResults,
        getDisplayMinProfitBp: (rule) => arbPanelLayoutUtils.normalizeDisplayMinProfitBp(
          rule && rule.displayMinProfitBp,
          arbPanelLayoutUtils.resolveDefaultDisplayMinProfitBp(options.pathAlertRuleDefinitions)
        ),
        buildEntry: (cycle, index, items, rule) => createOpportunityEntry(
          nextOpportunityMap,
          nextOpportunityIdsByTargetKey,
          cycle,
          items.length > 1 ? `机会 ${index + 1}` : '',
          {
            section: `fixed:${rule && rule.id || ''}`,
            groupName: String(rule && rule.title || '').trim(),
            alertPreset: { type: 'path' }
          }
        )
      });
    }

    function buildSpecialSections(sharedRuleSnapshot, nextOpportunityMap, nextOpportunityIdsByTargetKey) {
      return arbPanelLayoutUtils.buildSpecialArbSections({
        specialResults: sharedRuleSnapshot.specialResults,
        specialRules: sharedRuleSnapshot.configuredSpecialRules,
        buildEntry: (opportunity) => createOpportunityEntry(
          nextOpportunityMap,
          nextOpportunityIdsByTargetKey,
          opportunity.cycle,
          opportunity.label,
          {
            section: 'special',
            entryType: 'special-rule',
            clickable: false,
            displayMessage: String(opportunity.display_message || ''),
            hideLegs: true,
            alertPreset: {
              type: 'rule',
              ruleKind: 'special',
              ruleId: opportunity.ruleId
            }
          }
        )
      });
    }

    function buildGlobalSection(globalCycles, nextOpportunityMap, nextOpportunityIdsByTargetKey) {
      const globalSectionKey = 'global:all';
      const filterState = arbGlobalFilterStateRuntime.get();
      const filterCriteria = arbPanelLayoutUtils.buildGlobalArbFilterCriteria(filterState, {
        normalizeChainFilterToken: (chainToken) => options.chainDefaults.normalizeChainFilterToken(chainToken)
      });
      arbPanelLayoutUtils.applyGlobalArbFilterWritePlan(
        refs.arbGlobalFilterElements,
        arbPanelLayoutUtils.buildGlobalArbFilterWritePlan(filterState)
      );
      return arbPanelLayoutUtils.buildGlobalArbSection({
        sectionKey: globalSectionKey,
        cycles: globalCycles,
        ...filterCriteria,
        normalizeChain: (chain) => options.chainDefaults.normalizeChain(chain),
        expanded: arbExpandedSections.has(globalSectionKey),
        isRuleLeg,
        buildEntry: (cycle, index) => createOpportunityEntry(
          nextOpportunityMap,
          nextOpportunityIdsByTargetKey,
          cycle,
          `机会 ${index + 1}`,
          { section: '全局路径', alertPreset: { type: 'path' } }
        ),
        buildFooterHtml: (cycleDisplayState) => {
          if (!cycleDisplayState || !cycleDisplayState.canToggleExpand) return '';
          return arbPanelRenderer.renderArbSectionToggleHtml(globalSectionKey, {
            ...cycleDisplayState,
            displayMinProfitBp: arbPanelLayoutUtils.normalizeDisplayMinProfitBp(cycleDisplayState.displayMinProfitBp)
          });
        }
      });
    }

    function buildPanelData(sharedRuleSnapshot = arbDiscovery.getPanelSnapshot()) {
      const nextOpportunityMap = new Map();
      const nextOpportunityIdsByTargetKey = new Map();

      const fixedSections = buildFixedSections(sharedRuleSnapshot, nextOpportunityMap, nextOpportunityIdsByTargetKey);
      const specialSections = buildSpecialSections(sharedRuleSnapshot, nextOpportunityMap, nextOpportunityIdsByTargetKey);
      const globalSection = buildGlobalSection(
        sharedRuleSnapshot.globalCycles,
        nextOpportunityMap,
        nextOpportunityIdsByTargetKey
      );
      const columns = arbPanelLayoutUtils.buildArbPanelColumns({
        fixedSections,
        specialSections,
        quoteSection: buildQuotePriceWatchSection(),
        globalSection
      });

      return {
        columns,
        nextOpportunityMap,
        nextOpportunityIdsByTargetKey
      };
    }

    function updateArbPanel(config = {}) {
      if (!refs.arbPathContent) return;
      if (!config.force && !dashboardRuntimeUtils.isPanelVisible(refs.arbPathWindow)) {
        arbPanelUpdateRuntime.markDirty();
        return;
      }
      arbPanelUpdateRuntime.clearDirty();

      const panelData = buildPanelData(config.snapshot);
      if (panelData.error) {
        arbPanelHtmlRenderer.reset();
        arbPanelRenderer.applyArbPanelErrorText(refs.arbPathContent, panelData.error);
        return;
      }

      const { columns, nextOpportunityMap, nextOpportunityIdsByTargetKey } = panelData;

      refreshOpportunityRuntime(nextOpportunityMap, nextOpportunityIdsByTargetKey);

      const nextArbPanelHtml = arbPanelRenderer.renderArbGrid({
        columns,
        isMeaningfulPath: cycle => cycle && options.arbPaths.isMeaningfulPath(cycle.legs),
        shouldIncludeLeg: leg => !isRuleLeg(leg),
        formatChainLabel,
        formatLegLine: formatArbPathLegLine,
        formatProfit: profitRate => options.arbPaths.formatProfitWanfen(profitRate)
      });
      arbPanelHtmlRenderer.render(refs.arbPathContent, nextArbPanelHtml);
    }

    function applyFloatingPanelDisplay(panel, action, config = {}) {
      const result = domRenderUtils.applyFloatingPanelDisplayState(panel, action, {
        getComputedStyle: (element) => windowImpl.getComputedStyle(element),
        displayValue: config.displayValue
      });
      if (!result.panelFound) return result;
      if (result.shouldBringToFront && options.zIndexRuntime) {
        options.zIndexRuntime.bringToFront(panel);
      }
      if (result.shouldRender && typeof config.render === 'function') {
        config.render(result);
      }
      if (typeof config.afterApply === 'function') {
        config.afterApply(result);
      }
      return result;
    }

    function togglePanel() {
      applyFloatingPanelDisplay(refs.arbPathWindow, 'toggle', {
        render: () => {
          if (arbPanelUpdateRuntime.isDirty()) {
            updateArbPanel({ force: true });
          }
        }
      });
    }

    function setMaxHeight() {
      domRenderUtils.applyFloatingPanelViewportHeight(refs.arbPathWindow, windowImpl.innerHeight, { minHeight: 200 });
    }

    function openOpportunityDetail(opportunityId) {
      return openArbDetailModal(opportunityId) !== false;
    }

    function handleContentClick(event) {
      if (!refs.arbPathContent) return;
      const action = arbPanelRenderer.resolveArbPathContentClickAction(event, {
        closestEventTarget,
        containsElement: (element) => refs.arbPathContent.contains(element)
      });
      if (action.type === 'toggle-section') {
        if (arbExpandedSections.has(action.sectionKey)) {
          arbExpandedSections.delete(action.sectionKey);
        } else {
          arbExpandedSections.add(action.sectionKey);
        }
        updateArbPanel();
        return;
      }
      if (action.type !== 'open-opportunity') return;
      if (arbLastPointerOpenedOpportunityId === action.opportunityId) {
        arbLastPointerOpenedOpportunityId = null;
        return;
      }
      openOpportunityDetail(action.opportunityId);
    }

    function handleContentKeydown(event) {
      if (!refs.arbPathContent) return;
      const action = arbPanelRenderer.resolveArbPathContentKeydownAction(event, { closestEventTarget });
      if (action.type !== 'open-opportunity') return;
      event.preventDefault();
      openOpportunityDetail(action.opportunityId);
    }

    function handleContentPointerDown(event) {
      if (!refs.arbPathContent) return;
      const action = arbPanelRenderer.resolveArbPathContentPointerDownAction(event, { closestEventTarget });
      if (action.type !== 'open-opportunity') return;
      arbLastPointerOpenedOpportunityId = openOpportunityDetail(action.opportunityId)
        ? action.opportunityId
        : null;
    }

    function flushContentRender() {
      if (arbPanelHtmlRenderer && typeof arbPanelHtmlRenderer.flush === 'function') {
        arbPanelHtmlRenderer.flush(refs.arbPathContent);
      }
    }

    function handleContentFocusOut(event) {
      const nextFocusedElement = event && event.relatedTarget;
      if (
        nextFocusedElement
        && refs.arbPathContent
        && typeof refs.arbPathContent.contains === 'function'
        && refs.arbPathContent.contains(nextFocusedElement)
      ) {
        return;
      }
      flushContentRender();
    }

    function bindContentEvents() {
      if (!refs.arbPathContent) return;
      if (arbPanelInteractionDeferralRuntime && typeof arbPanelInteractionDeferralRuntime.bind === 'function') {
        arbPanelInteractionDeferralRuntime.bind(refs.arbPathContent);
      }
      refs.arbPathContent.addEventListener('pointerdown', handleContentPointerDown);
      refs.arbPathContent.addEventListener('click', handleContentClick);
      refs.arbPathContent.addEventListener('keydown', handleContentKeydown);
      refs.arbPathContent.addEventListener('focusout', handleContentFocusOut);
    }

    function bindGlobalFilterEvents() {
      arbPanelLayoutUtils.bindGlobalArbFilterEvents({
        excludedSymbolsInput: refs.arbGlobalFilterInput,
        excludedChainsInput: refs.arbGlobalChainFilterInput,
        includedSymbolsInput: refs.arbGlobalIncludeFilterInput,
        twoLegOnlyInput: refs.arbGlobalTwoLegOnlyInput,
        clearButton: refs.arbGlobalFilterClearBtn,
        header: refs.arbPathHeader
      }, {
        onPatch: (patch) => {
          const result = arbGlobalFilterStateRuntime.update(patch);
          if (!result.changed) return false;
          updateArbPanel();
          return true;
        },
        onClear: () => {
          const result = arbGlobalFilterStateRuntime.clear();
          if (!result.changed) return;
          updateArbPanel();
          if (refs.arbGlobalFilterInput) {
            refs.arbGlobalFilterInput.focus();
          }
        },
        getActiveElement: () => documentImpl.activeElement,
        closestEventTarget
      });
    }

    return {
      applyFloatingPanelDisplay,
      bindContentEvents,
      bindGlobalFilterEvents,
      buildArbPathLegLineOptions,
      buildLiveQuoteLabel,
      findQuoteById,
      formatArbPathLegLine,
      formatChainLabel,
      formatDetailNumber,
      isVisible: () => dashboardRuntimeUtils.isPanelVisible(refs.arbPathWindow),
      markDirty: () => arbPanelUpdateRuntime.markDirty(),
      isRuleLeg,
      scheduleUpdate: () => arbPanelUpdateRuntime.schedule(),
      setMaxHeight,
      togglePanel,
      update: updateArbPanel
    };
  }

  return {
    createArbPanelController
  };
}));
