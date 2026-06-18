(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.DashboardQuoteSpreadRuntime = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardQuoteSpreadRuntime(options = {}) {
    const modules = options.modules || {};
    const deps = options.deps || {};
    const refs = options.refs || {};
    const timers = options.timers || {};
    const quoteSpreadControllerUtils = options.quoteSpreadControllerUtils || modules.getQuoteSpreadController();
    const quoteSpreadController = quoteSpreadControllerUtils.createQuoteSpreadController({
      applyFloatingPanelDisplay: deps.applyFloatingPanelDisplay,
      documentImpl: deps.documentImpl,
      domRenderUtils: deps.domRenderUtils,
      formatChainLabel: deps.formatChainLabel,
      getDashboardState: deps.getDashboardState,
      getQuoteMarketStateMap: deps.getQuoteMarketStateMap,
      quoteSpreadUtils: modules.getQuoteSpreadUtils(),
      refs,
      setInterval: timers.setInterval,
      clearInterval: timers.clearInterval,
      zIndexRuntime: deps.zIndexRuntime
    });

    return {
      quoteSpreadController
    };
  }

  return {
    createDashboardQuoteSpreadRuntime
  };
}));
