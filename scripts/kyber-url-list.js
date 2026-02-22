const { ethers } = require('ethers');

const KYBER_SUPPORTED_CHAINS = new Set([
  'ethereum', 'bsc', 'arbitrum', 'polygon', 'optimism', 'avalanche',
  'base', 'linea', 'mantle', 'sonic', 'berachain', 'ronin',
  'unichain', 'hyperevm', 'plasma', 'etherlink', 'monad',
  'cronos', 'zksync', 'fantom', 'polygon-zkevm',
  'scroll', 'aurora', 'bittorrent', 'velas', 'oasis', 'blast',
  'moonbeam', 'boba', 'gnosis', 'celo', 'mode'
]);

const NON_EVM_CHAINS = new Set(['solana', 'sui', 'bybit']);

function isKyberQuote(quote) {
  const chain = String(quote.chain || '').toLowerCase();
  if (NON_EVM_CHAINS.has(chain)) return false;

  const pref = quote.preferredSource || 'Kyber';
  if (pref === '0x' || pref === 'Velora' || pref === 'LI.FI') return false;

  return KYBER_SUPPORTED_CHAINS.has(chain);
}

function getDecimalsFromMetadataCache(metadataCache, chain, tokenAddress) {
  if (!metadataCache || !tokenAddress) return null;

  const chainKey = String(chain || '').toLowerCase();
  const addressKey = String(tokenAddress).toLowerCase();
  const cacheKey = `${chainKey}-${addressKey}`;
  const hit = metadataCache[cacheKey];

  if (!hit || hit.decimals === undefined || hit.decimals === null) return null;

  const decimals = Number(hit.decimals);
  return Number.isFinite(decimals) ? decimals : null;
}

function buildKyberRouteUrl(chain, tokenIn, tokenOut, amount, decimals) {
  const amountIn = ethers.parseUnits(String(amount || 1), decimals).toString();
  return `https://aggregator-api.kyberswap.com/${chain}/api/v1/routes?tokenIn=${tokenIn}&tokenOut=${tokenOut}&amountIn=${amountIn}`;
}

function normalizeUrlList(input) {
  const list = Array.isArray(input) ? input : [];
  const seen = new Set();
  const out = [];

  for (const item of list) {
    const url = typeof item === 'string' ? item.trim() : '';
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }

  return out;
}

function buildKyberUrlsFromQuotes(quotes, metadataCache, options = {}) {
  const includeInverse = options.includeInverse !== false;
  const rawUrls = [];

  for (const quote of Array.isArray(quotes) ? quotes : []) {
    if (!isKyberQuote(quote)) continue;

    const chain = String(quote.chain || '').toLowerCase();
    const amount = quote.amount || 1;

    const fromDecimals = getDecimalsFromMetadataCache(metadataCache, chain, quote.fromToken);
    if (!Number.isFinite(fromDecimals)) continue;

    rawUrls.push(buildKyberRouteUrl(chain, quote.fromToken, quote.toToken, amount, fromDecimals));

    if (includeInverse && quote.showInverse) {
      const inverseDecimals = getDecimalsFromMetadataCache(metadataCache, chain, quote.toToken);
      if (!Number.isFinite(inverseDecimals)) continue;
      rawUrls.push(buildKyberRouteUrl(chain, quote.toToken, quote.fromToken, amount, inverseDecimals));
    }
  }

  return normalizeUrlList(rawUrls);
}

function readUrlsJsonFile(fs, filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error(`urls.json must be an array: ${filePath}`);
  }
  const urls = normalizeUrlList(parsed);
  if (!urls.length) {
    throw new Error(`urls.json has no usable urls: ${filePath}`);
  }
  return urls;
}

module.exports = {
  buildKyberRouteUrl,
  buildKyberUrlsFromQuotes,
  getDecimalsFromMetadataCache,
  isKyberQuote,
  normalizeUrlList,
  readUrlsJsonFile
};
