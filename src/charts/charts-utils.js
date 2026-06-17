(function (root, factory) {
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('../shared/chain-defaults')
    : root.ChainDefaults;
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(chainDefaults);
    return;
  }
  root.ChartsUtils = factory(chainDefaults);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (chainDefaults) {
  function getChartChainLabel(chain) {
    if (chainDefaults && typeof chainDefaults.getChainDisplayName === 'function') {
      return chainDefaults.getChainDisplayName(chain);
    }
    return chain || '';
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function tokenizeText(value) {
    return normalizeText(value)
      .split(/[^a-z0-9.+-]+/i)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function tokenizeChartSearch(value) {
    return normalizeText(value)
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function buildChartPairKey(quoteId, direction) {
    return `${quoteId}:${direction === 'inverse' ? 'inverse' : 'forward'}`;
  }

  function buildChartPairLabel(pair) {
    const chainLabel = getChartChainLabel(pair && pair.chain);
    const fromSymbol = pair && pair.fromSymbol ? pair.fromSymbol : '--';
    const toSymbol = pair && pair.toSymbol ? pair.toSymbol : '--';
    return `(${chainLabel}) ${fromSymbol} -> ${toSymbol}`;
  }

  function sanitizeChartPrefillPairs(pairs) {
    if (!Array.isArray(pairs)) return [];

    return pairs
      .map((item) => ({
        quoteId: Number(item && item.quoteId),
        direction: item && item.direction === 'inverse' ? 'inverse' : 'forward'
      }))
      .filter((item) => Number.isFinite(item.quoteId) && item.quoteId > 0);
  }

  function buildChartsPageHref(pairs) {
    const safePairs = sanitizeChartPrefillPairs(pairs);
    if (!safePairs.length) return '/charts';
    return `/charts?pairs=${encodeURIComponent(JSON.stringify(safePairs))}`;
  }

  function parseChartsPagePrefill(input) {
    const raw = String(input || '').trim();
    if (!raw) return [];

    let params = null;
    try {
      const url = raw.startsWith('http://') || raw.startsWith('https://')
        ? new URL(raw)
        : new URL(raw.startsWith('/') ? raw : `/${raw}`, 'https://codex.local');
      params = url.searchParams;
    } catch {
      return [];
    }

    const pairsValue = params.get('pairs');
    if (!pairsValue) return [];

    try {
      return sanitizeChartPrefillPairs(JSON.parse(pairsValue));
    } catch {
      return [];
    }
  }

  function buildChartSearchTerms(pair) {
    const label = pair && pair.label ? pair.label : buildChartPairLabel(pair);
    const chain = pair && pair.chain ? pair.chain : '';
    const chainLabel = getChartChainLabel(chain);
    const chainSearchText = chainDefaults && typeof chainDefaults.buildChainSearchText === 'function'
      ? chainDefaults.buildChainSearchText(chain)
      : chain;
    const fromSymbol = pair && pair.fromSymbol ? pair.fromSymbol : '';
    const toSymbol = pair && pair.toSymbol ? pair.toSymbol : '';
    const terms = new Set();

    for (const token of tokenizeText(`${label} ${chainSearchText} ${chainLabel} ${fromSymbol} ${toSymbol}`)) {
      terms.add(token);
    }

    return Array.from(terms);
  }

  function matchesChartSearch(pair, query) {
    const queryTokens = tokenizeChartSearch(query);
    if (!queryTokens.length) return true;

    const terms = buildChartSearchTerms(pair);
    return queryTokens.every((token) => terms.some((term) => term.startsWith(token)));
  }

  function shiftChartPointsToUtc8(points, offsetSeconds = 8 * 60 * 60) {
    if (!Array.isArray(points)) return [];
    return points.reduce((result, point) => {
      const rawTime = point && point.time;
      const rawValue = point && point.value;
      if (rawTime === null || rawTime === undefined || rawValue === null || rawValue === undefined || rawValue === '') {
        return result;
      }
      const time = Number(rawTime);
      const value = Number(rawValue);
      if (!Number.isFinite(time) || !Number.isFinite(value)) {
        return result;
      }
      const shiftedTime = time + offsetSeconds;
      const normalizedPoint = {
        time: shiftedTime,
        value
      };
      const lastPoint = result.length ? result[result.length - 1] : null;
      if (lastPoint && lastPoint.time === shiftedTime) {
        result[result.length - 1] = normalizedPoint;
        return result;
      }
      result.push(normalizedPoint);
      return result;
    }, []);
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function formatUtc8ChartTime(time) {
    const seconds = Number(time);
    if (!Number.isFinite(seconds)) return '--:--:--';
    const date = new Date(seconds * 1000);
    return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`;
  }

  function formatChartPrice(value, precision = 5) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '--';
    return num.toFixed(precision);
  }

  function buildProfitChartPoints(seriesList) {
    if (!Array.isArray(seriesList) || seriesList.length < 2) return [];

    const normalizedSeries = seriesList
      .filter((series) => Array.isArray(series) && series.length)
      .map((series) => new Map(series
        .filter((point) => point && Number.isFinite(point.time) && Number.isFinite(point.value))
        .map((point) => [point.time, point.value])));

    if (normalizedSeries.length < 2) return [];

    const baseTimes = Array.from(normalizedSeries[0].keys()).sort((left, right) => left - right);
    const points = [];

    for (const time of baseTimes) {
      let product = 1;
      let valid = true;

      for (const series of normalizedSeries) {
        if (!series.has(time)) {
          valid = false;
          break;
        }
        product *= series.get(time);
      }

      if (valid) {
        points.push({
          time,
          value: Number(product.toFixed(12))
        });
      }
    }

    return points;
  }

  return {
    buildChartPairKey,
    buildChartPairLabel,
    buildChartsPageHref,
    parseChartsPagePrefill,
    matchesChartSearch,
    shiftChartPointsToUtc8,
    formatUtc8ChartTime,
    formatChartPrice,
    buildProfitChartPoints
  };
}));
