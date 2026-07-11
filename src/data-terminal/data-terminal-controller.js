(function (root, factory) {
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('../shared/chain-defaults')
    : root.ChainDefaults;
  const api = factory(root, chainDefaults);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.DataTerminalController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root, chainDefaults) {
  function createInitialState() {
    return {
      visible: false,
      query: '',
      allowAliases: true,
      showDiff: false,
      selectedLeftKey: '',
      selectedRightKey: '',
      domRefs: null
    };
  }

  function createDataTerminalController(deps = {}) {
    const utils = deps.dataTerminalUtils || (root && root.DataTerminalUtils);
    const dashboardRuntimeUtils = deps.dashboardRuntimeUtils || {};
    const domRenderUtils = deps.domRenderUtils || {};
    const interactionSafeRenderer = deps.interactionSafeRenderer || (root && root.InteractionSafeRenderer);
    let state = null;
    state = deps.state || createInitialState();
    const contentRenderer = deps.htmlRenderer
      || interactionSafeRenderer.createInteractionSafeHtmlRenderer({
        getTarget: () => (state && state.domRefs ? state.domRefs.content : null),
        interactionRuntime: deps.interactionRuntime,
        setTimeout: deps.setTimeout,
        clearTimeout: deps.clearTimeout,
        trackFocus: false,
        releaseTarget: deps.documentImpl,
        releaseEventListenerOptions: { capture: true },
        windowImpl: deps.windowImpl
      });
    const cache = deps.cache || utils.createDataTerminalCache();

    function getDocument() {
      return deps.documentImpl || (typeof document !== 'undefined' ? document : null);
    }

    function getWindow() {
      return deps.windowImpl || (typeof window !== 'undefined' ? window : null);
    }

    function getDashboardState() {
      return typeof deps.getDashboardState === 'function' ? deps.getDashboardState() : [];
    }

    function getQuoteMarketStateMap() {
      return typeof deps.getQuoteMarketStateMap === 'function' ? deps.getQuoteMarketStateMap() : new Map();
    }

    function getMarketRevision() {
      return typeof deps.getMarketRevision === 'function' ? deps.getMarketRevision() : 0;
    }

    function getAliasRules() {
      return typeof deps.getAliasRules === 'function' ? deps.getAliasRules() : {};
    }

    function getAnchorPanel() {
      return typeof deps.getAnchorPanel === 'function' ? deps.getAnchorPanel() : deps.anchorPanel;
    }

    function getComputedStyleFor(element) {
      const windowImpl = getWindow();
      return windowImpl && typeof windowImpl.getComputedStyle === 'function'
        ? windowImpl.getComputedStyle(element)
        : null;
    }

    function resolveRecordsCacheKey() {
      if (typeof dashboardRuntimeUtils.buildDataTerminalRecordsCacheKey !== 'function') {
        return `${getMarketRevision()}`;
      }
      return dashboardRuntimeUtils.buildDataTerminalRecordsCacheKey(getDashboardState(), getMarketRevision());
    }

    function hasActiveQuery() {
      return utils.parseDataTerminalQuery(state.query).length > 0;
    }

    function buildRecords() {
      const cacheKey = resolveRecordsCacheKey();
      return cache.getRecords(cacheKey, () => utils.buildDataTerminalRecords(getDashboardState(), getQuoteMarketStateMap(), {
        isQuoteActive: typeof deps.isQuoteActive === 'function' ? deps.isQuoteActive : undefined
      }));
    }

    function buildCandidates() {
      const cacheKey = resolveRecordsCacheKey();
      return cache.getCandidates(cacheKey, () => utils.buildDataTerminalCandidates(buildRecords()));
    }

    function buildSelectionSummary(viewModel) {
      if (typeof utils.buildDataTerminalSelectionSummary !== 'function') {
        return {
          leftKey: '',
          rightKey: '',
          profitBp: null,
          text: '--'
        };
      }
      return utils.buildDataTerminalSelectionSummary(
        {
          leftKey: state.selectedLeftKey,
          rightKey: state.selectedRightKey
        },
        {
          leftRows: viewModel.leftRows || [],
          rightRows: viewModel.rightRows || []
        }
      );
    }

    function formatDefaultChainLabel(chain) {
      if (chainDefaults && typeof chainDefaults.getChainDisplayName === 'function') {
        return chainDefaults.getChainDisplayName(chain);
      }
      if (root && root.ChainDefaults && typeof root.ChainDefaults.getChainDisplayName === 'function') {
        return root.ChainDefaults.getChainDisplayName(chain);
      }
      return String(chain || '');
    }

    function formatChainLabel(chain) {
      return typeof deps.formatChainLabel === 'function' ? deps.formatChainLabel(chain) : formatDefaultChainLabel(chain);
    }

    function formatAmount(amount) {
      return typeof deps.formatAmount === 'function' ? deps.formatAmount(amount) : String(amount);
    }

    function buildPairLinkHtml(row, className, label) {
      return typeof deps.buildPairLinkHtml === 'function'
        ? deps.buildPairLinkHtml(row, className, label)
        : '';
    }

    function renderPanel() {
      if (!state.visible || !state.domRefs) return false;
      const refs = state.domRefs;
      if (!refs.content) return false;

      utils.applyDataTerminalControlWritePlan(utils.buildDataTerminalControlWritePlan(state), refs);

      const viewModel = utils.buildDataTerminalViewModel(buildCandidates(), {
        query: state.query,
        aliasRules: getAliasRules(),
        allowAliases: state.allowAliases,
        showDiff: state.showDiff
      });
      const selectionSummary = buildSelectionSummary(viewModel);
      state.selectedLeftKey = selectionSummary.leftKey;
      state.selectedRightKey = selectionSummary.rightKey;

      utils.applyDataTerminalSelectionSummaryDomState(refs, selectionSummary);
      contentRenderer.update(
        utils.buildDataTerminalPanelHtml(
          viewModel,
          {
            selectedLeftKey: state.selectedLeftKey,
            selectedRightKey: state.selectedRightKey
          },
          {
            formatChainLabel,
            formatAmount,
            buildPairLinkHtml
          }
        )
      );

      if (!hasActiveQuery()) {
        updateRuntime.clear();
      }
      return true;
    }

    const updateRuntime = deps.updateRuntime || utils.createDataTerminalUpdateRuntime({
      setTimeout: deps.setTimeout,
      clearTimeout: deps.clearTimeout,
      delayMs: deps.updateDelayMs,
      canUpdate: () => state.visible && state.domRefs && hasActiveQuery(),
      update: renderPanel
    });

    function handleContentClick(event) {
      const action = utils.resolveDataTerminalContentClickAction(event, {
        closestEventTarget: deps.closestEventTarget
      });
      if (action.type === 'copy-dex-link') {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof deps.copyDexLinkFromElement === 'function') {
          void deps.copyDexLinkFromElement(action.element);
        }
        return;
      }
      if (action.type !== 'toggle-row') {
        return;
      }

      utils.applyDataTerminalStatePatch(
        state,
        utils.buildDataTerminalSelectionPatch(state, action)
      );
      renderPanel();
    }

    function handleHeaderClick(event) {
      const action = utils.resolveDataTerminalHeaderClickAction(event, {
        closestEventTarget: deps.closestEventTarget
      });
      if (action.type !== 'blur-search') return;

      const documentImpl = getDocument();
      const refs = state.domRefs;
      if (refs && refs.searchInput && documentImpl && documentImpl.activeElement === refs.searchInput) {
        refs.searchInput.blur();
      }
    }

    function mountPanel() {
      if (state.visible && state.domRefs && state.domRefs.window) {
        if (deps.zIndexRuntime && typeof deps.zIndexRuntime.bringToFront === 'function') {
          deps.zIndexRuntime.bringToFront(state.domRefs.window);
        }
        return state.domRefs.window;
      }

      const documentImpl = getDocument();
      const panel = utils.createDataTerminalPanelElement({ documentImpl });
      if (!panel) return null;

      utils.applyDataTerminalDefaultSize(panel, {
        anchorPanel: getAnchorPanel(),
        getComputedStyle: getComputedStyleFor
      });
      utils.applyDataTerminalWindowPosition(panel, {
        anchorPanel: getAnchorPanel(),
        getComputedStyle: getComputedStyleFor
      });
      documentImpl.body.appendChild(panel);

      const refs = utils.getDataTerminalDomRefs(panel);
      state.visible = true;
      state.domRefs = refs;
      contentRenderer.reset();
      utils.applyDataTerminalControlWritePlan(utils.buildDataTerminalControlWritePlan(state), refs);

      utils.bindDataTerminalControlEvents(refs, {
        onPatch: (patch) => {
          utils.applyDataTerminalStatePatch(state, patch);
          renderPanel();
        },
        onContentClick: handleContentClick,
        onHeaderClick: handleHeaderClick,
        onMinimize: togglePanel
      });
      if (refs.header && typeof domRenderUtils.bindFloatingPanelChrome === 'function') {
        domRenderUtils.bindFloatingPanelChrome(panel, refs.header, {
          documentImpl,
          zIndexRuntime: deps.zIndexRuntime
        });
      }

      renderPanel();
      if (deps.zIndexRuntime && typeof deps.zIndexRuntime.bringToFront === 'function') {
        deps.zIndexRuntime.bringToFront(panel);
      }
      if (refs.searchInput && !String(state.query || '').trim()) {
        refs.searchInput.focus();
      }
      return panel;
    }

    function unmountPanel() {
      updateRuntime.clear();
      const refs = state.domRefs;
      if (refs && refs.content && typeof contentRenderer.unbind === 'function') {
        contentRenderer.unbind(refs.content);
      }
      if (refs && refs.window && refs.window.parentNode) {
        refs.window.parentNode.removeChild(refs.window);
      }
      state.visible = false;
      state.domRefs = null;
      contentRenderer.reset();
    }

    function togglePanel() {
      if (state.visible) {
        unmountPanel();
        return null;
      }
      return mountPanel();
    }

    return {
      getState: () => state,
      hasActiveQuery,
      mountPanel,
      renderPanel,
      scheduleUpdate: () => updateRuntime.schedule(),
      togglePanel,
      unmountPanel
    };
  }

  return {
    createDataTerminalController,
    createInitialState
  };
});
