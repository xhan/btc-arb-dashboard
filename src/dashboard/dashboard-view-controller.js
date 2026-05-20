(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.DashboardViewController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardViewController(deps = {}) {
    const logger = deps.logger || console;

    function getDashboardState() {
      return typeof deps.getDashboardState === 'function' ? deps.getDashboardState() : [];
    }

    function getRequestChannelOptions() {
      return typeof deps.getRequestChannelOptions === 'function' ? deps.getRequestChannelOptions() : {};
    }

    function addDnDHandlers(itemEl, categoryId) {
      itemEl.draggable = true;

      itemEl.addEventListener('dragstart', (event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', JSON.stringify({
          quoteId: itemEl.id.replace('quote-item-', ''),
          categoryId
        }));
        itemEl.classList.add('dragging');
      });

      itemEl.addEventListener('dragend', () => {
        itemEl.classList.remove('dragging');
        deps.documentImpl.querySelectorAll('.quote-item').forEach((el) => el.classList.remove('drag-over'));
      });

      itemEl.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (!itemEl.classList.contains('dragging')) {
          itemEl.classList.add('drag-over');
        }
        event.dataTransfer.dropEffect = 'move';
      });

      itemEl.addEventListener('dragleave', () => {
        itemEl.classList.remove('drag-over');
      });

      itemEl.addEventListener('drop', (event) => {
        event.stopPropagation();
        event.preventDefault();
        itemEl.classList.remove('drag-over');

        const data = JSON.parse(event.dataTransfer.getData('text/plain'));
        const draggedId = Number.parseInt(data.quoteId, 10);
        const sourceCatId = Number.parseInt(data.categoryId, 10);
        const targetCatId = Number.parseInt(categoryId, 10);
        const targetQuoteId = Number.parseInt(itemEl.id.replace('quote-item-', ''), 10);

        if (sourceCatId !== targetCatId) return;
        if (draggedId === targetQuoteId) return;

        const category = deps.dashboardRuntimeUtils.findDashboardCategoryById(getDashboardState(), targetCatId);
        if (!category) return;

        const fromIndex = category.quotes.findIndex((quote) => quote.id === draggedId);
        const toIndex = category.quotes.findIndex((quote) => quote.id === targetQuoteId);
        if (fromIndex <= -1 || toIndex <= -1) return;

        const [movedQuote] = category.quotes.splice(fromIndex, 1);
        category.quotes.splice(toIndex, 0, movedQuote);

        const listEl = deps.documentImpl.getElementById(`quote-list-${targetCatId}`);
        const draggedNode = deps.documentImpl.getElementById(`quote-item-${draggedId}`);
        const targetNode = deps.documentImpl.getElementById(`quote-item-${targetQuoteId}`);
        if (listEl && draggedNode && targetNode) {
          listEl.insertBefore(draggedNode, fromIndex < toIndex ? targetNode.nextSibling : targetNode);
        }

        deps.saveData();
      });
    }

    function buildAmountInputHtml(quote, categoryId) {
      if (deps.isCexOrderbookChain(quote.chain)) return '';
      const initialAmount = quote.amount || 1;
      return `<input type="number" class="amount-input" value="${initialAmount}" step="any" min="0" data-category-id="${categoryId}" data-quote-id="${quote.id}">`;
    }

    function buildInitialInverseResultText(quote, monitorState) {
      if (deps.isQuotePaused(quote)) return '';
      if (typeof deps.shouldQueueInverseFetch !== 'function' || !deps.shouldQueueInverseFetch(quote)) return '';
      if (!monitorState || !Number.isFinite(Number(monitorState.inverseRawPrice))) return '';
      if (typeof deps.getInverseQuoteDisplayText !== 'function') return '';
      return deps.getInverseQuoteDisplayText(quote, monitorState);
    }

    function applyDexLinkCopyTarget(labelStackEl, quote) {
      const dexLinkConfig = {
        chain: quote.chain,
        fromTokenAddress: quote.fromToken,
        toTokenAddress: quote.toToken,
        inputAmount: quote.amount
      };
      const dexLinkLabel = deps.isCrossChainQuote(quote) ? null : deps.dexLinkUtils.getDexLinkLabel(dexLinkConfig);
      if (!labelStackEl || !dexLinkLabel) return;

      labelStackEl.classList.add('quote-dex-link-target');
      labelStackEl.dataset.dexLinkCopy = '1';
      labelStackEl.dataset.dexLinkLabel = dexLinkLabel;
      labelStackEl.dataset.dexLinkChain = quote.chain || '';
      labelStackEl.dataset.dexLinkFromTokenAddress = quote.fromToken || '';
      labelStackEl.dataset.dexLinkToTokenAddress = quote.toToken || '';
      const inputAmount = Number(quote.amount);
      if (Number.isFinite(inputAmount) && inputAmount > 0) {
        labelStackEl.dataset.dexLinkInputAmount = String(inputAmount);
      }
      labelStackEl.title = `点击复制 ${dexLinkLabel} 链接`;
      labelStackEl.setAttribute('draggable', 'false');
      labelStackEl.addEventListener('mousedown', (event) => event.stopPropagation());
    }

    function bindQuoteTextInteractions(itemEl, quote) {
      const textWrapper = itemEl.querySelector('.quote-text-wrapper');
      if (!textWrapper) return;

      textWrapper.addEventListener('mouseenter', (event) => deps.handleQuoteHover(event, quote.id));
      textWrapper.addEventListener('mousedown', (event) => event.stopPropagation());
      textWrapper.setAttribute('draggable', 'false');
    }

    function createQuoteItem(quote, categoryId) {
      const monitorState = deps.getQuoteMarketState(quote.id) || {};
      const requestChannel = deps.requestChannelUtils.getRequestChannelDisplayForQuote(quote, getRequestChannelOptions());
      const requestChannelTagHtml = deps.requestChannelUtils.buildRequestChannelTagHtml(quote, requestChannel);
      const quoteTextClassName = deps.isCexOrderbookChain(quote.chain) ? 'quote-text cex-orderbook-summary' : 'quote-text';
      const itemEl = deps.dashboardRenderer.createQuoteItemShellElement({
        quoteId: quote.id,
        categoryId,
        displayName: deps.getQuoteChainDisplayName(quote),
        requestChannelTagHtml,
        pairLabelHtml: `<span class="quote-pair-label" id="quote-pair-label-${quote.id}">${deps.quoteDisplayUtils.buildQuotePairLabelHtml(quote, monitorState)}</span>`,
        amountInputHtml: buildAmountInputHtml(quote, categoryId),
        quoteTextClassName,
        lastResultText: deps.getQuoteDisplayText(quote, monitorState),
        inverseResultText: buildInitialInverseResultText(quote, monitorState),
        paused: deps.isQuotePaused(quote)
      }, { documentImpl: deps.documentImpl });
      if (!itemEl) return null;

      addDnDHandlers(itemEl, categoryId);
      applyDexLinkCopyTarget(itemEl.querySelector('.quote-label-stack'), quote);
      bindQuoteTextInteractions(itemEl, quote);
      return itemEl;
    }

    function createCategoryModule(category) {
      const moduleEl = deps.dashboardRenderer.createCategoryModuleShellElement({
        categoryId: category.id,
        categoryName: category.name,
        categoryPauseAction: deps.getCategoryPauseAction(category.quotes || [])
      }, { documentImpl: deps.documentImpl });
      if (!moduleEl) return null;

      const quoteListEl = moduleEl.querySelector('.quote-list');
      if (category.quotes) {
        category.quotes.forEach((quote) => {
          const quoteItemEl = createQuoteItem(quote, category.id);
          if (quoteItemEl) quoteListEl.appendChild(quoteItemEl);
        });
      }
      return moduleEl;
    }

    function renderDashboard() {
      deps.dashboardEl.innerHTML = '';
      const dashboardState = getDashboardState();
      if (!Array.isArray(dashboardState)) {
        logger.error('Dashboard state is not an array:', dashboardState);
        return;
      }
      dashboardState.forEach((category) => {
        const moduleEl = createCategoryModule(category);
        if (moduleEl) deps.dashboardEl.appendChild(moduleEl);
      });
    }

    return {
      addDnDHandlers,
      createCategoryModule,
      createQuoteItem,
      renderDashboard
    };
  }

  return {
    createDashboardViewController
  };
});
