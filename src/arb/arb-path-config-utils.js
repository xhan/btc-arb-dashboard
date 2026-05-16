(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ArbPathConfigUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeDirection(value) {
    return value === 'inverse' ? 'inverse' : 'forward';
  }

  function normalizeQuotePriceWatchItem(item) {
    if (!item || typeof item !== 'object') return null;
    if (item.type !== 'quote-price') return null;
    const quoteId = Number(item.quoteId);
    if (!Number.isFinite(quoteId) || quoteId <= 0) return null;
    const title = String(item.title || '').trim();
    if (!title) return null;
    return {
      title,
      type: 'quote-price',
      quoteId,
      direction: normalizeDirection(item.direction)
    };
  }

  function getQuotePriceWatchItems(config) {
    const items = Array.isArray(config && config.watchItems) ? config.watchItems : [];
    return items.map(normalizeQuotePriceWatchItem).filter(Boolean);
  }

  function resolveQuotePriceValue(item, quoteState) {
    if (!item || !quoteState || typeof quoteState !== 'object') return null;
    const value = item.direction === 'inverse'
      ? Number(quoteState.inverseRawPrice)
      : Number(quoteState.lastRawPrice);
    return Number.isFinite(value) ? value : null;
  }

  return {
    normalizeDirection,
    normalizeQuotePriceWatchItem,
    getQuotePriceWatchItems,
    resolveQuotePriceValue
  };
}));
