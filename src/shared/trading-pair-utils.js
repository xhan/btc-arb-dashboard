(function attachApi(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TradingPairUtils = factory();
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function buildApi() {
  function splitCompactTradingPairSymbol(symbol) {
    if (typeof symbol !== 'string') return null;

    const raw = symbol.trim().toUpperCase();
    if (!raw) return null;

    const separated = raw.match(/^([A-Z0-9.]+)\s*[-_/:]\s*([A-Z0-9.]+)$/);
    if (separated) {
      return { fromSymbol: separated[1], toSymbol: separated[2] };
    }

    const quoteSuffixes = [
      'USDT', 'USDC', 'FDUSD', 'USDE', 'TUSD',
      'DAI', 'BTC', 'ETH', 'EUR', 'TRY', 'BRL'
    ];

    for (const suffix of quoteSuffixes) {
      if (!raw.endsWith(suffix) || raw.length <= suffix.length) continue;
      const base = raw.slice(0, -suffix.length);
      if (!base) continue;
      return { fromSymbol: base, toSymbol: suffix };
    }

    return null;
  }

  function parseCexTradingPairSymbol(symbol) {
    const compactPair = splitCompactTradingPairSymbol(symbol);
    if (compactPair && compactPair.fromSymbol && compactPair.toSymbol) {
      return compactPair;
    }

    const [fromSymbol, toSymbol] = String(symbol || '').split('/').map((item) => item.trim().toUpperCase());
    if (!fromSymbol || !toSymbol) return null;
    return { fromSymbol, toSymbol };
  }

  return {
    parseCexTradingPairSymbol,
    splitCompactTradingPairSymbol
  };
});
