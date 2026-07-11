(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardAuxPanelsRuntime = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardAuxPanelsRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function setRuntime(runtimeRef, runtime) {
    return runtimeRef && typeof runtimeRef.set === 'function'
      ? runtimeRef.set(runtime)
      : runtime;
  }

  function createDashboardAuxPanelsRuntime(options = {}) {
    const modules = options.modules || {};
    const constants = options.constants || {};
    const deps = options.deps || {};
    const refs = options.refs || {};
    const timers = options.timers || {};
    const quoteSpreadRuntime = modules.getDashboardQuoteSpreadRuntime().createDashboardQuoteSpreadRuntime({
      modules,
      deps: {
        applyFloatingPanelDisplay: deps.applyFloatingPanelDisplay,
        documentImpl: deps.documentImpl,
        domRenderUtils: deps.domRenderUtils,
        formatChainLabel: deps.formatChainLabel,
        getDashboardState: deps.getDashboardState,
        getQuoteMarketStateMap: deps.getQuoteMarketStateMap,
        windowImpl: deps.windowImpl,
        zIndexRuntime: deps.zIndexRuntime
      },
      refs: refs.quoteSpread,
      timers
    });
    const dataTerminalRuntime = setRuntime(
      deps.dataTerminalRuntimeRef,
      modules.getDashboardDataTerminalRuntime().createDashboardDataTerminalRuntime({
        modules,
        constants,
        deps: {
          clearTimeout: deps.clearTimeout,
          closestEventTarget: deps.closestEventTarget,
          copyDexLinkFromElement: deps.copyDexLinkFromElement,
          dashboardRuntimeUtils: deps.dashboardRuntimeUtils,
          documentImpl: deps.documentImpl,
          domRenderUtils: deps.domRenderUtils,
          formatChainLabel: deps.formatChainLabel,
          formatDetailNumber: deps.formatDetailNumber,
          getAliasRules: deps.getAliasRules,
          getAnchorPanel: deps.getAnchorPanel,
          getDashboardState: deps.getDashboardState,
          getQuoteMarketStateMap: deps.getQuoteMarketStateMap,
          interactionRuntime: deps.interactionRuntime,
          isQuotePaused: deps.isQuotePaused,
          quoteStateRuntime: deps.quoteStateRuntime,
          setTimeout: deps.setTimeout,
          windowImpl: deps.windowImpl,
          zIndexRuntime: deps.zIndexRuntime
        }
      })
    );

    return {
      quoteSpreadController: quoteSpreadRuntime.quoteSpreadController,
      dataTerminalRuntime,
      renderDataTerminalPanel: dataTerminalRuntime.renderDataTerminalPanel,
      toggleDataTerminalPanel: dataTerminalRuntime.toggleDataTerminalPanel
    };
  }

  return {
    createDashboardAuxPanelsRuntime
  };
});
