(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.DataTerminalController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createFallbackHtmlRenderer() {
    return {
      render(target, html) {
        if (target) target.innerHTML = html;
      },
      reset() {}
    };
  }

  function createInitialState(options = {}) {
    return {
      visible: false,
      query: '',
      allowAliases: true,
      showDiff: false,
      selectedLeftKey: '',
      selectedRightKey: '',
      domRefs: null,
      htmlRenderer: options.htmlRenderer || createFallbackHtmlRenderer()
    };
  }

  function createDataTerminalController(deps = {}) {
    const utils = deps.dataTerminalUtils || (root && root.DataTerminalUtils);
    const dashboardRuntimeUtils = deps.dashboardRuntimeUtils || {};
    const domRenderUtils = deps.domRenderUtils || {};
    let state = null;
    const interactionHoldRuntime = (
      domRenderUtils && typeof domRenderUtils.createRenderInteractionHoldRuntime === 'function'
    )
      ? domRenderUtils.createRenderInteractionHoldRuntime({
        setTimeout: deps.setTimeout,
        clearTimeout: deps.clearTimeout,
        onIdle: () => {
          if (
            state
            && state.domRefs
            && state.domRefs.content
            && state.htmlRenderer
            && typeof state.htmlRenderer.flush === 'function'
          ) {
            state.htmlRenderer.flush(state.domRefs.content);
          }
        }
      })
      : null;

    function shouldDeferContentRender(element) {
      return Boolean(
        interactionHoldRuntime
        && typeof interactionHoldRuntime.shouldDeferRender === 'function'
        && interactionHoldRuntime.shouldDeferRender(element)
      );
    }

    function createDefaultHtmlRenderer() {
      if (!domRenderUtils || typeof domRenderUtils.createStableHtmlRenderer !== 'function') {
        return null;
      }
      return domRenderUtils.createStableHtmlRenderer({
        shouldDeferRender: shouldDeferContentRender
      });
    }

    state = deps.state || createInitialState({
      htmlRenderer: deps.htmlRenderer || (
        createDefaultHtmlRenderer()
      )
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

    function formatChainLabel(chain) {
      return typeof deps.formatChainLabel === 'function' ? deps.formatChainLabel(chain) : String(chain || '');
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
      state.htmlRenderer.render(
        refs.content,
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
      state.htmlRenderer.reset();
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
      if (interactionHoldRuntime && refs.content && typeof interactionHoldRuntime.bind === 'function') {
        interactionHoldRuntime.bind(refs.content);
      }

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
      if (refs && refs.window && refs.window.parentNode) {
        refs.window.parentNode.removeChild(refs.window);
      }
      state.visible = false;
      state.domRefs = null;
      state.htmlRenderer.reset();
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
