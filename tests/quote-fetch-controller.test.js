const assert = require('assert');

const { createQuoteFetchController } = require('../src/quote/quote-fetch-controller');

function createElement(id) {
  return {
    id,
    textContent: '',
    title: '',
    classList: {
      add() {},
      remove() {}
    }
  };
}

function createBaseDeps(overrides = {}) {
  const calls = [];
  const elements = {
    'quote-data-101': createElement('quote-data-101'),
    'quote-text-wrapper-101': createElement('quote-text-wrapper-101'),
    'quote-text-101': createElement('quote-text-101'),
    'inverse-quote-101': createElement('inverse-quote-101')
  };
  const quote = { id: 101, chain: 'ethereum', amount: 2, showInverse: true };
  const data = {
    rawPrice: 1.01,
    finalAmountOut: 2.02,
    symbols: {
      from: 'USDC',
      to: 'USDT'
    }
  };
  const previousState = {
    lastRawPrice: 1,
    usedSourceReal: '0x'
  };

  const deps = {
    activeFetchControllerRuntime: {
      create: (quoteId) => {
        calls.push(['createController', quoteId]);
        return { signal: `signal-${quoteId}` };
      },
      deleteIfCurrent: (quoteId, controller) => calls.push(['deleteController', quoteId, controller && controller.signal])
    },
    backendUrl: 'http://127.0.0.1:3000',
    chainDefaults: {
      buildQuoteStrategy: () => ['Kyber']
    },
    checkPriceForAlerts: (nextQuote) => calls.push(['checkAlerts', nextQuote.id]),
    dashboardRuntimeUtils: {
      buildQuoteResultMarketState: (state, result, options = {}) => ({
        ...state,
        fromSymbol: result.symbols.from,
        toSymbol: result.symbols.to,
        inverseFromSymbol: result.symbols.from,
        inverseToSymbol: result.symbols.to,
        lastRawPrice: result.rawPrice,
        inverseRawPrice: result.rawPrice,
        inverseTotalAmountOut: result.finalAmountOut,
        usedSourceReal: options.successSource || state.usedSourceReal,
        isInverseFetch: options.isInverseFetch === true
      }),
      buildQuoteErrorMarketState: (state, options = {}) => {
        if (options.isInverseFetch) {
          return {
            ...state,
            inverseRawPrice: null,
            inverseTotalAmountOut: null
          };
        }
        return {
          ...state,
          lastResultText: '',
          lastRawPrice: null,
          lastTotalAmountOut: null,
          cexOrderbook: null,
          usedSource: '',
          usedSourceReal: null
        };
      }
    },
    documentImpl: {
      getElementById: (id) => elements[id] || null
    },
    domRenderUtils: {
      clearQuoteDataError: (element) => calls.push(['clearError', element.id]),
      applyQuoteMainResultDomState: (refs, options) => calls.push(['mainResult', refs.quoteTextEl.id, options.text]),
      applyQuoteInverseQueuedDomState: (refs, options) => {
        calls.push(['inverseQueued', refs.quoteDataEl.id, options.id, options.text]);
        return refs.inverseEl || createElement(options.id);
      },
      applyQuoteInverseResultDomState: (refs, options) => {
        const nextEl = refs.inverseEl || createElement(options.id);
        nextEl.textContent = options.text;
        calls.push(['inverseResult', refs.quoteDataEl.id, options.id, options.text]);
        return nextEl;
      },
      applyQuoteInverseErrorDomState: (refs, options) => calls.push(['inverseError', refs.quoteDataEl.id, options.id, options.title]),
      applyQuoteMainErrorDomState: (refs, options) => calls.push(['mainError', refs.quoteTextEl.id, options.message, options.title]),
      removeQuoteInverseElement: (element) => calls.push(['removeInverse', element && element.id])
    },
    fetchImpl: () => Promise.resolve({}),
    getEffectiveRequestChannelIdForQuote: () => 'default',
    getInverseQuoteDisplayText: (nextQuote, state, fallbackText) => fallbackText || `${state.inverseRawPrice}`,
    getQuoteDisplayMode: () => 'rate',
    getQuoteDisplayText: (nextQuote, state) => `display-${state.lastRawPrice}`,
    getQuoteMarketState: () => previousState,
    isQuotePaused: () => false,
    logWarning: (...args) => calls.push(['warn', ...args]),
    quoteDisplayUtils: {
      buildCexOrderbookSummary: () => 'book',
      buildInverseQuoteQueuedDisplayText: () => 'queued-text'
    },
    quoteRequestUtils: {
      resolveQuoteRequestConfig: (source) => ({ source }),
      requestResolvedQuote: async (options) => {
        calls.push(['request', options.quote.id, options.signal, options.resolvedConfig.source]);
        return data;
      },
      buildQuoteRequestInput: (nextQuote, options) => {
        calls.push(['buildInput', nextQuote.id, options.defaultRequestChannelId, options.isInverseFetch === true]);
        return {
          requestQuote: { ...nextQuote, requestChannelId: options.defaultRequestChannelId },
          isInverseFetch: options.isInverseFetch === true
        };
      },
      shouldSkipQuoteSource: () => false,
      shouldDelayQuoteSource: () => false,
      applyAutoFallbackSourceLabel: (result, nextQuote, source) => ({ ...result, usedSource: source }),
      buildQuoteErrorTitle: (error) => `title:${error.message}`,
      formatQuoteErrorMessage: () => '报价失败'
    },
    recordSourceAttempt: (source) => calls.push(['recordSource', source]),
    resetQuoteUiRuntimeState: (quoteId) => calls.push(['resetUi', quoteId]),
    onQuoteMarketStateChanged: (nextQuote, state, context = {}) => calls.push([
      'marketChanged',
      nextQuote.id,
      state.lastRawPrice,
      state.isInverseFetch,
      context.fetchMode,
      context.successSource || null
    ]),
    onQuoteMainFetchSuccess: (nextQuote, context = {}) => calls.push([
      'mainSuccess',
      nextQuote.id,
      context.marketStateChanged === true,
      context.successSource || null
    ]),
    scheduleArbPanelUpdate: () => calls.push(['scheduleArb']),
    scheduleDataTerminalUpdate: () => calls.push(['scheduleDataTerminal']),
    setQuoteMarketState: (quoteId, state) => {
      calls.push(['setMarketState', quoteId, state.lastRawPrice, state.isInverseFetch]);
      return true;
    },
    shouldQueueInverseFetch: () => true,
    updateQuotePairLabel: (nextQuote, state) => calls.push(['updatePairLabel', nextQuote.id, state.fromSymbol, state.toSymbol]),
    updateTrendArrow: (...args) => calls.push(['trend', ...args]),
    applyPausedQuoteUiState: (nextQuote, state) => calls.push(['pausedUi', nextQuote.id, state.lastRawPrice]),
    ...overrides
  };

  return { calls, controller: createQuoteFetchController(deps), data, deps, elements, previousState, quote };
}

(async () => {
  {
    const { calls, controller, quote } = createBaseDeps();
    const result = await controller.fetchByStrategy(quote, {
      beforeSourceAttempt: (source, requestQuote) => calls.push(['before', source, requestQuote.requestChannelId])
    });
    assert.strictEqual(result.successSource, 'Kyber');
    assert.deepStrictEqual(
      calls.filter((call) => ['buildInput', 'before', 'recordSource', 'request'].includes(call[0])),
      [
        ['buildInput', 101, 'default', false],
        ['before', 'Kyber', 'default'],
        ['recordSource', 'Kyber'],
        ['request', 101, undefined, 'Kyber']
      ]
    );
  }

  {
    const { calls, controller, quote } = createBaseDeps();
    await controller.fetchSingle(quote);
    assert.deepStrictEqual(
      calls.filter((call) => ['createController', 'clearError', 'mainResult', 'inverseQueued', 'setMarketState', 'marketChanged', 'trend', 'mainSuccess', 'deleteController'].includes(call[0])),
      [
        ['createController', 101],
        ['clearError', 'quote-data-101'],
        ['mainResult', 'quote-text-101', 'display-1.01'],
        ['inverseQueued', 'quote-data-101', 'inverse-quote-101', 'queued-text'],
        ['setMarketState', 101, 1.01, false],
        ['marketChanged', 101, 1.01, false, 'main', 'Kyber'],
        ['trend', 101, 1.01, 1, 'Kyber', '0x'],
        ['mainSuccess', 101, true, 'Kyber'],
        ['deleteController', 101, 'signal-101']
      ]
    );
  }

  {
    const { calls, controller, quote } = createBaseDeps({
      isDashboardUiActive: () => false,
      markDashboardUiDirty: () => calls.push(['markDirty'])
    });
    await controller.fetchSingle(quote);
    assert.deepStrictEqual(
      calls.filter((call) => ['clearError', 'mainResult', 'inverseQueued', 'setMarketState', 'marketChanged', 'trend', 'mainSuccess', 'markDirty', 'deleteController'].includes(call[0])),
      [
        ['setMarketState', 101, 1.01, false],
        ['marketChanged', 101, 1.01, false, 'main', 'Kyber'],
        ['markDirty'],
        ['mainSuccess', 101, true, 'Kyber'],
        ['deleteController', 101, 'signal-101']
      ]
    );
  }

  {
    const { calls, controller, elements, quote } = createBaseDeps();
    elements['inverse-quote-101'].textContent = 'inverse text';
    await controller.fetchSingle(quote, 'inverse');
    assert.deepStrictEqual(
      calls.filter((call) => ['inverseResult', 'setMarketState', 'marketChanged', 'deleteController'].includes(call[0])),
      [
        ['setMarketState', 101, 1.01, true],
        ['marketChanged', 101, 1.01, true, 'inverse', 'Kyber'],
        ['inverseResult', 'quote-data-101', 'inverse-quote-101', '2 USDC ≈ 2.020000 USDT'],
        ['deleteController', 101, 'signal-101']
      ]
    );
  }

  {
    const { calls, controller, quote } = createBaseDeps({
      isQuotePaused: () => true
    });
    await controller.fetchSingle(quote);
    assert.deepStrictEqual(calls, [
      ['resetUi', 101],
      ['pausedUi', 101, 1]
    ]);
  }

  {
    const { calls, controller, quote } = createBaseDeps({
      documentImpl: {
        getElementById: () => null
      },
      domRenderUtils: {
        clearQuoteDataError: (element) => calls.push(['clearError', Boolean(element)]),
        applyQuoteMainResultDomState: (refs, options) => calls.push(['mainResult', Boolean(refs.quoteTextEl), options.text]),
        applyQuoteInverseQueuedDomState: (refs, options) => {
          calls.push(['inverseQueued', Boolean(refs.quoteDataEl), options.id, options.text]);
          return null;
        },
        applyQuoteInverseResultDomState: () => null,
        applyQuoteInverseErrorDomState: () => null,
        applyQuoteMainErrorDomState: () => false,
        removeQuoteInverseElement: () => false
      }
    });
    await controller.fetchSingle(quote);
    assert.deepStrictEqual(
      calls.filter((call) => ['request', 'setMarketState', 'marketChanged', 'mainSuccess', 'deleteController'].includes(call[0])),
      [
        ['request', 101, 'signal-101', 'Kyber'],
        ['setMarketState', 101, 1.01, false],
        ['marketChanged', 101, 1.01, false, 'main', 'Kyber'],
        ['mainSuccess', 101, true, 'Kyber'],
        ['deleteController', 101, 'signal-101']
      ]
    );
  }

  {
    const { calls, controller, quote } = createBaseDeps({
      quoteRequestUtils: {
        ...createBaseDeps().deps.quoteRequestUtils,
        requestResolvedQuote: async () => {
          throw new Error('boom');
        }
      }
    });
    await controller.fetchSingle(quote);
    assert.deepStrictEqual(
      calls.filter((call) => ['mainError', 'deleteController'].includes(call[0])),
      [
        ['mainError', 'quote-text-101', '报价失败', 'title:boom'],
        ['deleteController', 101, 'signal-101']
      ]
    );
  }

  {
    let capturedState = null;
    const { calls, controller, quote } = createBaseDeps({
      getQuoteMarketState: () => ({
        fromSymbol: 'cbBTC',
        toSymbol: 'LBTC',
        lastRawPrice: 400,
        lastTotalAmountOut: 400,
        inverseRawPrice: 0.0025,
        inverseTotalAmountOut: 0.0025,
        usedSourceReal: 'Jupiter'
      }),
      isDashboardUiActive: () => false,
      markDashboardUiDirty: () => calls.push(['markDirty']),
      quoteRequestUtils: {
        ...createBaseDeps().deps.quoteRequestUtils,
        requestResolvedQuote: async () => {
          throw new Error('no load');
        }
      },
      setQuoteMarketState: (quoteId, state) => {
        capturedState = state;
        calls.push(['setErrorState', quoteId, state.lastRawPrice, state.inverseRawPrice]);
        return true;
      }
    });
    await controller.fetchSingle(quote);
    assert.strictEqual(capturedState.lastRawPrice, null);
    assert.strictEqual(capturedState.lastTotalAmountOut, null);
    assert.strictEqual(capturedState.inverseRawPrice, 0.0025);
    assert.deepStrictEqual(
      calls.filter((call) => ['setErrorState', 'marketChanged', 'markDirty', 'deleteController'].includes(call[0])),
      [
        ['setErrorState', 101, null, 0.0025],
        ['marketChanged', 101, null, undefined, 'main', null],
        ['markDirty'],
        ['deleteController', 101, 'signal-101']
      ]
    );
  }

  {
    let capturedState = null;
    const { calls, controller, quote } = createBaseDeps({
      getQuoteMarketState: () => ({
        fromSymbol: 'cbBTC',
        toSymbol: 'LBTC',
        lastRawPrice: 400,
        lastTotalAmountOut: 400,
        inverseRawPrice: 0.0025,
        inverseTotalAmountOut: 0.0025
      }),
      quoteRequestUtils: {
        ...createBaseDeps().deps.quoteRequestUtils,
        requestResolvedQuote: async () => {
          throw new Error('inverse no load');
        }
      },
      setQuoteMarketState: (quoteId, state) => {
        capturedState = state;
        calls.push(['setErrorState', quoteId, state.lastRawPrice, state.inverseRawPrice]);
        return true;
      }
    });
    await controller.fetchSingle(quote, 'inverse');
    assert.strictEqual(capturedState.lastRawPrice, 400);
    assert.strictEqual(capturedState.inverseRawPrice, null);
    assert.strictEqual(capturedState.inverseTotalAmountOut, null);
    assert.deepStrictEqual(
      calls.filter((call) => ['setErrorState', 'marketChanged', 'inverseError', 'deleteController'].includes(call[0])),
      [
        ['setErrorState', 101, 400, null],
        ['marketChanged', 101, 400, undefined, 'inverse', null],
        ['inverseError', 'quote-data-101', 'inverse-quote-101', 'title:inverse no load'],
        ['deleteController', 101, 'signal-101']
      ]
    );
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
