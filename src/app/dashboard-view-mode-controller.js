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

      const shouldRefreshArb = currentMode === APP_VIEW_ARB && (changed || options.force);
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

  return {
    APP_VIEW_ARB,
    APP_VIEW_DASHBOARD,
    VIEW_CLASS_BY_MODE,
    createDashboardViewModeController,
    normalizeViewMode,
    setButtonActive
  };
});
