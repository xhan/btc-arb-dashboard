function extractPriceFromText(text) {
  if (!text) return null;
  const delimiterMatch = text.match(/(?:≈|=|:)\s*([-+]?\d*\.?\d+(?:e[+-]?\d+)?)/i);
  const raw = delimiterMatch ? delimiterMatch[1] : (text.match(/[-+]?\d*\.?\d+(?:e[+-]?\d+)?/i) || [])[0];
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

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

function buildCalculatorEntry(input) {
  if (!input) return null;
  const price = Number(input.price);
  if (!Number.isFinite(price)) return null;

  return {
    chainLabel: input.chainLabel || '',
    fromSymbol: input.fromSymbol || '',
    toSymbol: input.toSymbol || '',
    price
  };
}

function formatCalculatorEntry(entry, precision) {
  if (!entry) return '';
  const fixed = Number.isFinite(entry.price) ? entry.price.toFixed(precision || 6) : '--';
  return `${entry.chainLabel} ${entry.fromSymbol} -> ${entry.toSymbol} ${fixed}`.trim();
}

function calculateProduct(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return entries.reduce((acc, item) => acc * Number(item.price || 0), 1);
}

function buildApi() {
  return {
    extractPriceFromText,
    splitCompactTradingPairSymbol,
    buildCalculatorEntry,
    formatCalculatorEntry,
    calculateProduct
  };
}

(function attachApi(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QuoteCalculator = factory();
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), buildApi);
