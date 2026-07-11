(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.DashboardDataTerminalRuntime = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildPairLinkHtml(dexLinkUtils, row, className, label) {
    return dexLinkUtils.buildDexLinkCopyButtonHtml({
      chain: row.chain,
      fromTokenAddress: row.fromTokenAddress,
      toTokenAddress: row.toTokenAddress,
      inputAmount: row.amount
    }, className, label);
  }

  function createDashboardDataTerminalRuntime(options = {}) {
    const modules = options.modules || {};
    const deps = options.deps || {};
    const constants = options.constants || {};
    const dataTerminalControllerUtils = options.dataTerminalControllerUtils || modules.getDataTerminalController();
    const dexLinkUtils = options.dexLinkUtils || modules.getDexLinkUtils();
    const dataTerminalController = dataTerminalControllerUtils.createDataTerminalController({
      dataTerminalUtils: modules.getDataTerminalUtils(),
      dashboardRuntimeUtils: deps.dashboardRuntimeUtils,
      domRenderUtils: deps.domRenderUtils,
      interactionSafeRenderer: modules.getInteractionSafeRenderer(),
      interactionRuntime: deps.interactionRuntime,
      documentImpl: deps.documentImpl,
      windowImpl: deps.windowImpl,
      setTimeout: deps.setTimeout,
      clearTimeout: deps.clearTimeout,
      updateDelayMs: constants.dataTerminalUpdateDelayMs,
      getAnchorPanel: deps.getAnchorPanel,
      zIndexRuntime: deps.zIndexRuntime,
      getDashboardState: deps.getDashboardState,
      getQuoteMarketStateMap: deps.getQuoteMarketStateMap,
      getMarketRevision: () => deps.quoteStateRuntime.getMarketRevision(),
      isQuoteActive: (quote) => !deps.isQuotePaused(quote),
      getAliasRules: deps.getAliasRules,
      closestEventTarget: deps.closestEventTarget,
      formatChainLabel: deps.formatChainLabel,
      formatAmount: (amount) => deps.formatDetailNumber(Number(amount), 6),
      buildPairLinkHtml: (row, className, label) => buildPairLinkHtml(dexLinkUtils, row, className, label),
      copyDexLinkFromElement: deps.copyDexLinkFromElement
    });

    return {
      dataTerminalController,
      renderDataTerminalPanel: dataTerminalController.renderPanel,
      toggleDataTerminalPanel: dataTerminalController.togglePanel,
      scheduleDataTerminalUpdate: dataTerminalController.scheduleUpdate
    };
  }

  return {
    createDashboardDataTerminalRuntime
  };
}));
