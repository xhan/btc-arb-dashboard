(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.QuoteFetchController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createQuoteFetchController(deps = {}) {
    const strategyDelayMs = Number.isFinite(Number(deps.strategyDelayMs))
      ? Number(deps.strategyDelayMs)
      : 600;

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function apiGetQuote(quote, signal, targetSource) {
      const resolvedConfig = deps.quoteRequestUtils.resolveQuoteRequestConfig(targetSource, quote);
      return deps.quoteRequestUtils.requestResolvedQuote({
        backendUrl: deps.backendUrl,
        fetchImpl: deps.fetchImpl,
        quote,
        signal,
        resolvedConfig,
        buildCexSummary: (symbol, orderbook) => deps.quoteDisplayUtils.buildCexOrderbookSummary(symbol, orderbook)
      });
    }

    async function fetchByStrategy(quote, options = {}) {
      const signal = options.signal;
      const beforeSourceAttempt = typeof options.beforeSourceAttempt === 'function'
        ? options.beforeSourceAttempt
        : null;
      const requestInput = deps.quoteRequestUtils.buildQuoteRequestInput(quote, {
        amount: options.amount,
        requestChannelId: options.requestChannelId,
        defaultRequestChannelId: deps.getEffectiveRequestChannelIdForQuote(quote),
        isInverseFetch: options.isInverseFetch
      });
      const { requestQuote, isInverseFetch } = requestInput;
      const strategy = deps.chainDefaults.buildQuoteStrategy(quote);
      let fetchError = null;
      let successSource = null;
      let data = null;

      for (const source of strategy) {
        try {
          if (deps.quoteRequestUtils.shouldSkipQuoteSource(source, quote)) continue;

          if (beforeSourceAttempt) {
            await beforeSourceAttempt(source, requestQuote);
          }

          if (deps.quoteRequestUtils.shouldDelayQuoteSource(source, strategy, {
            skipDelay: options.skipDelay
          })) {
            await sleep(strategyDelayMs);
          }

          deps.recordSourceAttempt(source);
          data = await apiGetQuote(requestQuote, signal, source);
          if (data) {
            successSource = source;
            data = deps.quoteRequestUtils.applyAutoFallbackSourceLabel(data, quote, source, { isInverseFetch });
            break;
          }
        } catch (error) {
          if (error.name === 'AbortError') throw error;
          fetchError = error;
          deps.logWarning(`${quote.chain} Quote Fetch Failed [${source}]:`, error.message);
        }
      }

      if (!data) {
        throw fetchError || new Error('All strategies failed');
      }

      return { data, successSource };
    }

    function getQuoteDomRefs(quote) {
      const quoteDataEl = deps.documentImpl.getElementById(`quote-data-${quote.id}`);
      const quoteTextWrapperEl = deps.documentImpl.getElementById(`quote-text-wrapper-${quote.id}`);
      const quoteTextEl = deps.documentImpl.getElementById(`quote-text-${quote.id}`);
      return {
        quoteDataEl,
        quoteTextWrapperEl,
        quoteTextEl
      };
    }

    function isDashboardUiActive() {
      return typeof deps.isDashboardUiActive === 'function' ? deps.isDashboardUiActive() : true;
    }

    function markDashboardUiDirty() {
      if (typeof deps.markDashboardUiDirty === 'function') {
        deps.markDashboardUiDirty();
      }
      return false;
    }

    function notifyQuoteMarketStateChanged(quote, state, context = {}) {
      if (typeof deps.onQuoteMarketStateChanged === 'function') {
        deps.onQuoteMarketStateChanged(quote, state, context);
      }
    }

    function notifyQuoteMainFetchSuccess(quote, context = {}) {
      if (typeof deps.onQuoteMainFetchSuccess === 'function') {
        deps.onQuoteMainFetchSuccess(quote, context);
      }
    }

    function handleInverseSuccess(quote, data, previousState, inverseEl, inverseContainerId, quoteDataEl, successSource) {
      if (!deps.shouldQueueInverseFetch(quote)) return;

      const inverseFallbackText = `${quote.amount || 1} ${data.symbols.from} ≈ ${data.finalAmountOut.toFixed(6)} ${data.symbols.to}`;
      const inverseState = deps.dashboardRuntimeUtils.buildQuoteResultMarketState(
        previousState,
        data,
        { isInverseFetch: true }
      );
      const marketStateChanged = deps.setQuoteMarketState(quote.id, inverseState);
      if (marketStateChanged) {
        notifyQuoteMarketStateChanged(quote, inverseState, {
          data,
          fetchMode: 'inverse',
          isInverseFetch: true,
          previousState,
          successSource
        });
      }
      if (!isDashboardUiActive()) {
        markDashboardUiDirty();
        return;
      }
      deps.domRenderUtils.applyQuoteInverseResultDomState(
        {
          quoteDataEl,
          inverseEl
        },
        {
          id: inverseContainerId,
          documentImpl: deps.documentImpl,
          text: deps.getInverseQuoteDisplayText(quote, inverseState, inverseFallbackText)
        }
      );
    }

    function handleMainSuccess(quote, data, successSource, refs, previousState, inverseEl, inverseContainerId) {
      const oldPrice = previousState.lastRawPrice;
      const oldSource = previousState.usedSourceReal;
      const newState = deps.dashboardRuntimeUtils.buildQuoteResultMarketState(
        previousState,
        data,
        { successSource }
      );
      const dashboardUiActive = isDashboardUiActive();

      if (dashboardUiActive) {
        deps.domRenderUtils.applyQuoteMainResultDomState({
          quoteTextEl: refs.quoteTextEl,
          quoteTextWrapperEl: refs.quoteTextWrapperEl
        }, {
          text: deps.getQuoteDisplayText(quote, newState)
        });
        deps.updateQuotePairLabel(quote, newState);

        if (deps.shouldQueueInverseFetch(quote)) {
          const inverseQueuedText = deps.quoteDisplayUtils.buildInverseQuoteQueuedDisplayText(
            quote,
            newState,
            inverseEl && inverseEl.textContent,
            { mode: deps.getQuoteDisplayMode() }
          );
          deps.domRenderUtils.applyQuoteInverseQueuedDomState({
            quoteDataEl: refs.quoteDataEl,
            inverseEl
          }, {
            id: inverseContainerId,
            documentImpl: deps.documentImpl,
            text: inverseQueuedText
          });
        } else {
          deps.domRenderUtils.removeQuoteInverseElement(inverseEl);
        }
      }

      if (!deps.shouldQueueInverseFetch(quote)) {
        newState.inverseRawPrice = null;
        newState.inverseTotalAmountOut = null;
        newState.inverseFromSymbol = null;
        newState.inverseToSymbol = null;
      }

      const marketStateChanged = deps.setQuoteMarketState(quote.id, newState);
      if (marketStateChanged) {
        notifyQuoteMarketStateChanged(quote, newState, {
          data,
          fetchMode: 'main',
          isInverseFetch: false,
          previousState,
          successSource
        });
      }

      if (dashboardUiActive) {
        deps.updateTrendArrow(quote.id, data.rawPrice, oldPrice, successSource, oldSource);
      } else {
        markDashboardUiDirty();
      }
      notifyQuoteMainFetchSuccess(quote, {
        data,
        fetchMode: 'main',
        isInverseFetch: false,
        marketStateChanged,
        previousState,
        state: newState,
        successSource
      });
    }

    function handleFetchError(quote, error, isInverseFetch, refs) {
      if (error.name === 'AbortError') return false;
      const errorTitle = deps.quoteRequestUtils.buildQuoteErrorTitle(error);
      const previousState = deps.getQuoteMarketState(quote.id) || {};
      const nextState = deps.dashboardRuntimeUtils.buildQuoteErrorMarketState(previousState, {
        isInverseFetch
      });
      const marketStateChanged = deps.setQuoteMarketState(quote.id, nextState);
      if (marketStateChanged) {
        notifyQuoteMarketStateChanged(quote, nextState, {
          error,
          fetchMode: isInverseFetch ? 'inverse' : 'main',
          isInverseFetch,
          previousState
        });
      }

      if (!isDashboardUiActive()) {
        return markDashboardUiDirty();
      }

      if (isInverseFetch) {
        const inverseEl = deps.documentImpl.getElementById(`inverse-quote-${quote.id}`);
        if (deps.shouldQueueInverseFetch(quote)) {
          deps.domRenderUtils.applyQuoteInverseErrorDomState({
            quoteDataEl: refs.quoteDataEl,
            inverseEl
          }, {
            id: `inverse-quote-${quote.id}`,
            documentImpl: deps.documentImpl,
            title: errorTitle
          });
        }
        return true;
      }

      deps.domRenderUtils.applyQuoteMainErrorDomState({
        quoteDataEl: refs.quoteDataEl,
        quoteTextEl: refs.quoteTextEl,
        quoteTextWrapperEl: refs.quoteTextWrapperEl
      }, {
        message: deps.quoteRequestUtils.formatQuoteErrorMessage(error),
        title: errorTitle
      });
      return true;
    }

    async function fetchSingle(quote, fetchMode = 'main') {
      const refs = getQuoteDomRefs(quote);
      if (deps.isQuotePaused(quote)) {
        const previousState = deps.getQuoteMarketState(quote.id) || {};
        deps.resetQuoteUiRuntimeState(quote.id);
        if (isDashboardUiActive()) {
          deps.applyPausedQuoteUiState(quote, previousState);
        } else {
          markDashboardUiDirty();
        }
        return;
      }

      const isInverseFetch = fetchMode === 'inverse' && deps.shouldQueueInverseFetch(quote);
      const controller = deps.activeFetchControllerRuntime.create(quote.id);
      const signal = controller ? controller.signal : null;

      if (!isInverseFetch && isDashboardUiActive()) {
        deps.domRenderUtils.clearQuoteDataError(refs.quoteDataEl);
      }

      try {
        const { data, successSource } = await fetchByStrategy(quote, {
          signal,
          isInverseFetch
        });
        const previousState = deps.getQuoteMarketState(quote.id) || {};
        const inverseContainerId = `inverse-quote-${quote.id}`;
        const inverseEl = deps.documentImpl.getElementById(inverseContainerId);

        if (isInverseFetch) {
          handleInverseSuccess(quote, data, previousState, inverseEl, inverseContainerId, refs.quoteDataEl, successSource);
        } else {
          handleMainSuccess(quote, data, successSource, refs, previousState, inverseEl, inverseContainerId);
        }
      } catch (error) {
        handleFetchError(quote, error, isInverseFetch, refs);
      } finally {
        deps.activeFetchControllerRuntime.deleteIfCurrent(quote.id, controller);
      }
    }

    return {
      fetchByStrategy,
      fetchSingle
    };
  }

  return {
    createQuoteFetchController
  };
});
