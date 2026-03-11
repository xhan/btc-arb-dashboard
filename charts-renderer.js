(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ChartsRenderer = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getRoot() {
    return typeof globalThis !== 'undefined' ? globalThis : this;
  }

  function getUtils() {
    return getRoot().ChartsUtils || {};
  }

  function getChartsLib() {
    return getRoot().LightweightCharts;
  }

  function formatTimeTick(time) {
    const utils = getUtils();
    if (typeof utils.formatUtc8ChartTime === 'function') {
      return utils.formatUtc8ChartTime(time);
    }
    return String(time);
  }

  function formatPrice(value) {
    const utils = getUtils();
    if (typeof utils.formatChartPrice === 'function') {
      return utils.formatChartPrice(value);
    }
    return String(value);
  }

  function shiftPoints(points) {
    const utils = getUtils();
    if (typeof utils.shiftChartPointsToUtc8 === 'function') {
      return utils.shiftChartPointsToUtc8(points || []);
    }
    return Array.isArray(points) ? points : [];
  }

  function createChartInstance(container, options = {}) {
    const charts = getChartsLib();
    if (!charts || typeof charts.createChart !== 'function') {
      throw new Error('图表库加载失败');
    }

    const height = Number(options.height);
    const mini = options.mini !== false;
    return charts.createChart(container, {
      width: Math.max(180, container.clientWidth || 180),
      height: Number.isFinite(height) && height > 0 ? height : 112,
      layout: {
        background: { color: 'transparent' },
        textColor: mini ? '#64748b' : '#334155',
        attributionLogo: false
      },
      localization: {
        priceFormatter: formatPrice,
        timeFormatter: formatTimeTick
      },
      grid: {
        vertLines: { color: mini ? 'rgba(148, 163, 184, 0.10)' : 'rgba(148, 163, 184, 0.16)' },
        horzLines: { color: mini ? 'rgba(148, 163, 184, 0.10)' : 'rgba(148, 163, 184, 0.16)' }
      },
      rightPriceScale: {
        visible: !mini,
        borderColor: 'rgba(148, 163, 184, 0.18)'
      },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.18)',
        timeVisible: true,
        secondsVisible: !mini,
        tickMarkFormatter: formatTimeTick
      },
      crosshair: {
        vertLine: { color: 'rgba(15, 118, 110, 0.18)' },
        horzLine: { color: 'rgba(15, 118, 110, 0.18)' }
      },
      handleScroll: !mini,
      handleScale: !mini
    });
  }

  function createPriceSeries(chart, color) {
    const charts = getChartsLib();
    const options = {
      color: color || '#0f766e',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      priceFormat: {
        type: 'custom',
        minMove: 0.00001,
        formatter: formatPrice
      }
    };

    if (chart && typeof chart.addSeries === 'function' && charts && charts.LineSeries) {
      return chart.addSeries(charts.LineSeries, options);
    }
    if (chart && typeof chart.addLineSeries === 'function') {
      return chart.addLineSeries(options);
    }
    throw new Error('图表折线初始化失败');
  }

  function mountPriceHistoryChart(container, options = {}) {
    if (!container) {
      throw new Error('缺少图表容器');
    }

    const chart = createChartInstance(container, options);
    const series = createPriceSeries(chart, options.color);
    let resizeObserver = null;

    function resize() {
      chart.applyOptions({
        width: Math.max(180, container.clientWidth || 180),
        height: Number.isFinite(Number(options.height)) && Number(options.height) > 0 ? Number(options.height) : 112
      });
      chart.timeScale().fitContent();
    }

    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
    }

    function update(points) {
      const shiftedPoints = shiftPoints(points);
      series.setData(shiftedPoints);
      chart.timeScale().fitContent();
      return shiftedPoints;
    }

    function destroy() {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (typeof chart.remove === 'function') {
        chart.remove();
      }
    }

    return {
      chart,
      series,
      update,
      resize,
      destroy
    };
  }

  return {
    mountPriceHistoryChart
  };
}));
