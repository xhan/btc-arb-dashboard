(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardViewModeController = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardViewModeController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const APP_VIEW_ARB = 'arb';
  const APP_VIEW_DASHBOARD = 'dashboard';
  const VIEW_CLASS_BY_MODE = Object.freeze({
    [APP_VIEW_ARB]: 'app-view-arb',
    [APP_VIEW_DASHBOARD]: 'app-view-dashboard'
  });

  function normalizeViewMode(mode) {
    return mode === APP_VIEW_DASHBOARD ? APP_VIEW_DASHBOARD : APP_VIEW_ARB;
  }

  function setButtonActive(button, active) {
    if (!button) return false;
    if (button.classList) {
      button.classList.toggle('active', Boolean(active));
    }
    if (typeof button.setAttribute === 'function') {
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.setAttribute('tabindex', active ? '0' : '-1');
    }
    return true;
  }

  function clearInlineDisplay(element) {
    if (element && element.style) {
      element.style.display = '';
    }
  }

  function createDashboardViewModeController(deps = {}) {
    const refs = deps.refs || {};
    const bodyEl = deps.bodyEl || null;
    let currentMode = normalizeViewMode(deps.initialMode);
    let bound = false;

    function applyBodyClass(mode) {
      if (!bodyEl || !bodyEl.classList) return false;
      bodyEl.classList.remove(VIEW_CLASS_BY_MODE[APP_VIEW_ARB], VIEW_CLASS_BY_MODE[APP_VIEW_DASHBOARD]);
      bodyEl.classList.add(VIEW_CLASS_BY_MODE[mode]);
      return true;
    }

    function applyMode(mode, options = {}) {
      const nextMode = normalizeViewMode(mode);
      const changed = nextMode !== currentMode;
      currentMode = nextMode;

      clearInlineDisplay(refs.dashboardEl);
      clearInlineDisplay(refs.addCategoryBtn);
      clearInlineDisplay(refs.arbPathWindow);
      applyBodyClass(currentMode);
      setButtonActive(refs.viewArbBtn, currentMode === APP_VIEW_ARB);
      setButtonActive(refs.viewDashboardBtn, currentMode === APP_VIEW_DASHBOARD);

      const shouldRunViewCallback = changed || options.force;
      if (!options.skipCallbacks && currentMode === APP_VIEW_DASHBOARD && shouldRunViewCallback) {
        if (typeof deps.onShowDashboard === 'function') {
          deps.onShowDashboard();
        }
      }

      const shouldRefreshArb = currentMode === APP_VIEW_ARB && shouldRunViewCallback;
      if (!options.skipCallbacks && shouldRefreshArb) {
        if (typeof deps.updateArbPanel === 'function') {
          deps.updateArbPanel({ force: true });
        }
        if (typeof deps.setArbPanelMaxHeight === 'function') {
          deps.setArbPanelMaxHeight();
        }
      }

      return currentMode;
    }

    function setMode(mode, options = {}) {
      return applyMode(mode, options);
    }

    function showArbView(options = {}) {
      return setMode(APP_VIEW_ARB, options);
    }

    function showDashboardView(options = {}) {
      return setMode(APP_VIEW_DASHBOARD, options);
    }

    function toggleArbView(options = {}) {
      return currentMode === APP_VIEW_ARB
        ? showDashboardView(options)
        : showArbView(options);
    }

    function bind() {
      if (bound) return false;
      bound = true;
      if (refs.viewArbBtn && typeof refs.viewArbBtn.addEventListener === 'function') {
        refs.viewArbBtn.addEventListener('click', () => showArbView());
      }
      if (refs.viewDashboardBtn && typeof refs.viewDashboardBtn.addEventListener === 'function') {
        refs.viewDashboardBtn.addEventListener('click', () => showDashboardView());
      }
      applyMode(currentMode, { skipCallbacks: true });
      return true;
    }

    return {
      bind,
      getMode: () => currentMode,
      setMode,
      showArbView,
      showDashboardView,
      toggleArbView
    };
  }

  function createDashboardViewRenderRuntime(options = {}) {
    const activeMode = normalizeViewMode(options.activeMode || APP_VIEW_DASHBOARD);
    const render = typeof options.render === 'function' ? options.render : () => {};
    const shouldDeferRender = typeof options.shouldDeferRender === 'function'
      ? options.shouldDeferRender
      : () => false;
    let rendered = false;
    let dirty = false;
    let deferredRender = false;

    function getMode() {
      return normalizeViewMode(typeof options.getMode === 'function' ? options.getMode() : null);
    }

    function isActive() {
      return getMode() === activeMode;
    }

    function markDirty() {
      dirty = true;
      return false;
    }

    function renderNow() {
      if (rendered && shouldDeferRender()) {
        dirty = true;
        deferredRender = true;
        return false;
      }
      render();
      rendered = true;
      dirty = false;
      deferredRender = false;
      return rendered;
    }

    function ensureRendered() {
      if (!rendered || dirty) {
        return renderNow();
      }
      return rendered;
    }

    return {
      ensureRendered,
      hasDeferredRender: () => deferredRender,
      hasRendered: () => rendered,
      isActive,
      isDirty: () => dirty,
      markDirty,
      renderNow
    };
  }

  return {
    APP_VIEW_ARB,
    APP_VIEW_DASHBOARD,
    VIEW_CLASS_BY_MODE,
    createDashboardViewRenderRuntime,
    createDashboardViewModeController,
    normalizeViewMode,
    setButtonActive
  };
});
