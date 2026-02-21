function extractPriceFromText(text) {
  if (!text) return null;
  const delimiterMatch = text.match(/(?:≈|=|:)\s*([-+]?\d*\.?\d+(?:e[+-]?\d+)?)/i);
  const raw = delimiterMatch ? delimiterMatch[1] : (text.match(/[-+]?\d*\.?\d+(?:e[+-]?\d+)?/i) || [])[0];
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
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
