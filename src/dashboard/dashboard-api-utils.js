(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.DashboardApiUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_PRICE_SNAPSHOT_CONFIG = Object.freeze({ enabled: false, intervalSec: 10 });

  function joinBackendUrl(backendUrl, pathname) {
    return `${String(backendUrl || '').replace(/\/$/, '')}${pathname}`;
  }

  function normalizePriceSnapshotConfigResponse(data) {
    const intervalSec = Number.parseInt(data && data.intervalSec, 10);
    return {
      enabled: Boolean(data && data.enabled === true),
      intervalSec: Number.isFinite(intervalSec) && intervalSec > 0 ? intervalSec : DEFAULT_PRICE_SNAPSHOT_CONFIG.intervalSec
    };
  }

  function normalizeDashboardConfigResponse(rawData, defaultIntervals = {}) {
    if (Array.isArray(rawData)) {
      return {
        dashboardState: rawData,
        apiIntervals: { ...defaultIntervals },
        migratedSolanaInterval: false,
        quoteMarketStateById: {}
      };
    }

    if (rawData && typeof rawData === 'object') {
      const apiIntervals = rawData.settings
        ? { ...defaultIntervals, ...rawData.settings }
        : { ...defaultIntervals };
      const migratedSolanaInterval = apiIntervals.solana === 1200;
      if (migratedSolanaInterval) {
        apiIntervals.solana = 3500;
      }
      const quoteMarketStateById = rawData.quoteMarketStateById && typeof rawData.quoteMarketStateById === 'object'
        ? rawData.quoteMarketStateById
        : {};
      return {
        dashboardState: Array.isArray(rawData.dashboard) ? rawData.dashboard : [],
        apiIntervals,
        migratedSolanaInterval,
        quoteMarketStateById
      };
    }

    return {
      dashboardState: [],
      apiIntervals: { ...defaultIntervals },
      migratedSolanaInterval: false,
      quoteMarketStateById: {}
    };
  }

  function createDashboardApiClient(options = {}) {
    const backendUrl = String(options.backendUrl || '').replace(/\/$/, '');
    const fetchImpl = options.fetchImpl || fetch;
    const logger = options.logger || console;

    function buildUrl(pathname) {
      return joinBackendUrl(backendUrl, pathname);
    }

    async function postJson(pathname, payload) {
      return fetchImpl(buildUrl(pathname), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    async function saveDashboardConfig(payload) {
      await postJson('/api/save-config', payload);
    }

    async function requestBackendConfigRefresh() {
      try {
        const response = await postJson('/api/request-update-config', {});
        if (!response.ok) {
          throw new Error('刷新后端配置失败');
        }
        return true;
      } catch (error) {
        logger.warn('刷新后端配置失败:', error);
        return false;
      }
    }

    async function loadPriceSnapshotConfig() {
      try {
        const response = await fetchImpl(buildUrl('/api/get-price-snapshot-config'));
        if (!response.ok) throw new Error('获取价格快照配置失败');
        return normalizePriceSnapshotConfigResponse(await response.json());
      } catch (error) {
        logger.warn('加载价格快照配置失败:', error);
        return { ...DEFAULT_PRICE_SNAPSHOT_CONFIG };
      }
    }

    async function loadArbSettings(options = {}) {
      const normalizePriority = typeof options.normalizePriority === 'function'
        ? options.normalizePriority
        : (value) => value;
      const defaultPriority = Array.isArray(options.defaultPriority) ? options.defaultPriority : [];
      try {
        const response = await fetchImpl(buildUrl('/api/get-arb-settings'));
        if (!response.ok) throw new Error('获取套利路径配置失败');
        const data = await response.json();
        return normalizePriority(data && data.cycleStartPriority);
      } catch (error) {
        logger.warn('加载套利路径配置失败:', error);
        return Array.from(defaultPriority);
      }
    }

    async function loadRequestChannels() {
      try {
        const response = await fetchImpl(buildUrl('/api/get-request-channels'));
        if (!response.ok) throw new Error('获取请求通道失败');
        const data = await response.json();
        return data && typeof data === 'object' ? data : { channels: [] };
      } catch (error) {
        logger.warn('加载请求通道失败:', error);
        return { channels: [] };
      }
    }

    async function loadDashboardConfig(defaultIntervals = {}) {
      try {
        const response = await fetchImpl(buildUrl('/api/get-config'));
        if (!response.ok) {
          logger.warn('Server returned error, initializing empty dashboard');
          return normalizeDashboardConfigResponse(null, defaultIntervals);
        }
        return normalizeDashboardConfigResponse(await response.json(), defaultIntervals);
      } catch (error) {
        logger.warn('加载看板配置失败:', error);
        return normalizeDashboardConfigResponse(null, defaultIntervals);
      }
    }

    async function savePriceSnapshot(payload) {
      await postJson('/api/save-price-snapshot', payload);
    }

    return {
      loadArbSettings,
      loadDashboardConfig,
      loadPriceSnapshotConfig,
      loadRequestChannels,
      requestBackendConfigRefresh,
      saveDashboardConfig,
      savePriceSnapshot
    };
  }

  return {
    createDashboardApiClient,
    joinBackendUrl,
    normalizeDashboardConfigResponse,
    normalizePriceSnapshotConfigResponse
  };
});
