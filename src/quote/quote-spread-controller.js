(function (root, factory) {
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('../shared/chain-defaults')
    : root.ChainDefaults;
  const api = factory(root, chainDefaults);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.QuoteSpreadController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root, chainDefaults) {
  const DEFAULT_UPDATE_INTERVAL_MS = 1000;

  function createQuoteSpreadController(deps = {}) {
    const quoteSpreadUtils = deps.quoteSpreadUtils || (root && root.QuoteSpreadUtils);
    const domRenderUtils = deps.domRenderUtils || {};
    const interactionSafeRenderer = deps.interactionSafeRenderer || (root && root.InteractionSafeRenderer);
    const refs = deps.refs || {};
    const setIntervalFn = typeof deps.setInterval === 'function'
      ? deps.setInterval
      : (typeof setInterval === 'function' ? setInterval : null);
    const clearIntervalFn = typeof deps.clearInterval === 'function'
      ? deps.clearInterval
      : (typeof clearInterval === 'function' ? clearInterval : null);
    const updateIntervalMs = Number.isFinite(Number(deps.updateIntervalMs)) && Number(deps.updateIntervalMs) > 0
      ? Number(deps.updateIntervalMs)
      : DEFAULT_UPDATE_INTERVAL_MS;
    const htmlRenderer = deps.htmlRenderer || interactionSafeRenderer.createInteractionSafeHtmlRenderer({
      getTarget: () => refs.content,
      setTimeout: deps.setTimeout,
      clearTimeout: deps.clearTimeout,
      trackFocus: false,
      releaseTarget: deps.documentImpl,
      releaseEventListenerOptions: { capture: true },
      windowImpl: deps.windowImpl
    });
    let updateTimer = null;

    function getDashboardState() {
      return typeof deps.getDashboardState === 'function' ? deps.getDashboardState() : [];
    }

    function getQuoteMarketStateMap() {
      return typeof deps.getQuoteMarketStateMap === 'function' ? deps.getQuoteMarketStateMap() : new Map();
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

    function clearTimer() {
      if (!updateTimer || !clearIntervalFn) return false;
      clearIntervalFn(updateTimer);
      updateTimer = null;
      return true;
    }

    function clearPanel() {
      if (htmlRenderer && typeof htmlRenderer.reset === 'function') {
        htmlRenderer.reset();
      }
      if (refs.content) {
        refs.content.innerHTML = '';
      }
      return Boolean(refs.content);
    }

    function render() {
      if (!refs.content || !quoteSpreadUtils) return false;
      const rows = quoteSpreadUtils.buildQuoteSpreadRows(getDashboardState(), getQuoteMarketStateMap(), {
        limit: 20,
        formatChainLabel
      });
      return htmlRenderer.update(quoteSpreadUtils.buildQuoteSpreadPanelHtml(rows));
    }

    function startUpdates() {
      clearTimer();
      render();
      if (setIntervalFn) {
        updateTimer = setIntervalFn(render, updateIntervalMs);
      }
      return updateTimer;
    }

    function stopUpdates() {
      clearTimer();
      clearPanel();
    }

    function toggle() {
      const applyFloatingPanelDisplay = typeof deps.applyFloatingPanelDisplay === 'function'
        ? deps.applyFloatingPanelDisplay
        : null;
      if (!applyFloatingPanelDisplay) {
        stopUpdates();
        return {
          panelFound: false,
          visible: false
        };
      }
      const result = applyFloatingPanelDisplay(refs.window, 'toggle', {
        render: startUpdates,
        afterApply: (state) => {
          if (!state.visible) {
            stopUpdates();
          }
        }
      });
      if (!result || !result.panelFound) {
        stopUpdates();
      }
      return result || {
        panelFound: false,
        visible: false
      };
    }

    function bindPanelChrome() {
      if (!refs.window || !refs.header || typeof domRenderUtils.bindFloatingPanelChrome !== 'function') {
        return false;
      }
      return Boolean(domRenderUtils.bindFloatingPanelChrome(refs.window, refs.header, {
        documentImpl: deps.documentImpl,
        zIndexRuntime: deps.zIndexRuntime
      }));
    }

    function bindEvents() {
      let bound = false;
      if (refs.toggleButton && typeof refs.toggleButton.addEventListener === 'function') {
        refs.toggleButton.addEventListener('click', toggle);
        bound = true;
      }
      if (refs.minButton && typeof refs.minButton.addEventListener === 'function') {
        refs.minButton.addEventListener('click', (event) => {
          if (event && typeof event.stopPropagation === 'function') {
            event.stopPropagation();
          }
          return toggle();
        });
        bound = true;
      }
      return bound;
    }

    return {
      bindEvents,
      bindPanelChrome,
      clearPanel,
      clearTimer,
      render,
      startUpdates,
      stopUpdates,
      toggle
    };
  }

  return {
    DEFAULT_UPDATE_INTERVAL_MS,
    createQuoteSpreadController
  };
});
