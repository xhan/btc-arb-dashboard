(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.DashboardAppConfig = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const AMOUNT_INPUT_DEBOUNCE_MS = 600;
  const DASHBOARD_SAVE_DEBOUNCE_MS = 1500;
  const CHART_AUTO_REFRESH_INTERVAL_MS = 5000;
  const FLOATING_PANEL_BASE_Z_INDEX = 2100;
  const DATA_TERMINAL_UPDATE_DELAY_MS = 1000;
  const DEFAULT_QUOTE_DISPLAY_MODE = 'rate';
  const ARB_PANEL_UPDATE_DELAY_MS = 500;
  const ARB_DETAIL_REFRESH_INTERVAL_MS = 2500;
  const MUTED_STATE_VISIBLE_REFRESH_MS = 1000;
  const MUTED_STATE_HIDDEN_MAX_REFRESH_MS = 60 * 1000;
  const GLOBAL_PATH_SOURCE_SELECTORS = Object.freeze([0, 1, 2, 3]);

  function buildBackendUrl(locationImpl) {
    const origin = String(locationImpl && locationImpl.origin || '').trim();
    if (origin && origin !== 'null') return origin;

    const protocol = String(locationImpl && locationImpl.protocol || 'http:').trim() || 'http:';
    const host = String(locationImpl && locationImpl.host || '').trim();
    if (host) return `${protocol}//${host}`;

    const hostname = String(locationImpl && locationImpl.hostname || 'localhost').trim() || 'localhost';
    return `${protocol}//${hostname}:3000`;
  }

  return {
    AMOUNT_INPUT_DEBOUNCE_MS,
    DASHBOARD_SAVE_DEBOUNCE_MS,
    CHART_AUTO_REFRESH_INTERVAL_MS,
    FLOATING_PANEL_BASE_Z_INDEX,
    DATA_TERMINAL_UPDATE_DELAY_MS,
    DEFAULT_QUOTE_DISPLAY_MODE,
    ARB_PANEL_UPDATE_DELAY_MS,
    ARB_DETAIL_REFRESH_INTERVAL_MS,
    MUTED_STATE_VISIBLE_REFRESH_MS,
    MUTED_STATE_HIDDEN_MAX_REFRESH_MS,
    GLOBAL_PATH_SOURCE_SELECTORS,
    buildBackendUrl
  };
}));
