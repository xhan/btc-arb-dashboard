const { buildPathAlertCandidates } = require('../path-alerts/path-alert-candidate-utils');
const chainDefaults = require('../shared/chain-defaults');
const { splitCompactTradingPairSymbol } = require('../shared/trading-pair-utils');

function shortAddr(addr = '') {
  const s = String(addr || '');
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}...${s.slice(-6)}`;
}

function formatPathAlertChainLabel(chain) {
  return chainDefaults.getChainDisplayName(chain);
}

function buildPathAlertCandidateLabel(chain, fromSymbol, toSymbol, suffix = '') {
  return `(${formatPathAlertChainLabel(chain)}) ${fromSymbol || '--'} -> ${toSymbol || '--'}${suffix}`;
}

function isCexOrderbookChain(chain) {
  const normalized = String(chain || '').trim().toLowerCase();
  return normalized === 'bybit' || normalized === 'binance';
}

async function resolveQuoteTokenSymbols(quote, marketClients) {
  if (!quote || !quote.chain) {
    return { fromSymbol: shortAddr(quote && quote.fromToken), toSymbol: shortAddr(quote && quote.toToken) };
  }

  if (isCexOrderbookChain(quote.chain)) {
    const parsed = splitCompactTradingPairSymbol(quote.symbol);
    return {
      fromSymbol: parsed?.fromSymbol || shortAddr(quote.symbol),
      toSymbol: parsed?.toSymbol || 'QUOTE'
    };
  }

  try {
    if (String(quote.chain).toLowerCase() === 'solana') {
      const [fromMeta, toMeta] = await Promise.all([
        marketClients.getSolanaTokenMeta(quote.fromToken),
        marketClients.getSolanaTokenMeta(quote.toToken)
      ]);
      return { fromSymbol: fromMeta.symbol || shortAddr(quote.fromToken), toSymbol: toMeta.symbol || shortAddr(quote.toToken) };
    }

    if (String(quote.chain).toLowerCase() === 'sui') {
      const [fromMeta, toMeta] = await Promise.all([
        marketClients.getSuiTokenMeta(quote.fromToken),
        marketClients.getSuiTokenMeta(quote.toToken)
      ]);
      return { fromSymbol: fromMeta.symbol || shortAddr(quote.fromToken), toSymbol: toMeta.symbol || shortAddr(quote.toToken) };
    }

    if (String(quote.chain).toLowerCase() === 'starknet') {
      const [fromMeta, toMeta] = await Promise.all([
        marketClients.getStarknetTokenMeta(quote.fromToken),
        marketClients.getStarknetTokenMeta(quote.toToken)
      ]);
      return { fromSymbol: fromMeta.symbol || shortAddr(quote.fromToken), toSymbol: toMeta.symbol || shortAddr(quote.toToken) };
    }

    const [fromMeta, toMeta] = await Promise.all([
      marketClients.getEvmTokenMeta(quote.chain, quote.fromToken),
      marketClients.getEvmTokenMeta(quote.chain, quote.toToken)
    ]);
    return { fromSymbol: fromMeta.symbol || shortAddr(quote.fromToken), toSymbol: toMeta.symbol || shortAddr(quote.toToken) };
  } catch {
    return {
      fromSymbol: shortAddr(quote.fromToken),
      toSymbol: shortAddr(quote.toToken)
    };
  }
}

async function buildPathAlertQuoteCandidatesFromConfig(options = {}) {
  const config = await options.readJsonFile(options.configPath).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const dashboard = Array.isArray(config) ? config : (Array.isArray(config.dashboard) ? config.dashboard : []);
  const records = [];

  for (const category of dashboard) {
    for (const quote of (category.quotes || [])) {
      const resolved = await resolveQuoteTokenSymbols(quote, options.marketClients);
      records.push({
        categoryName: category.name,
        quote,
        fromSymbol: resolved.fromSymbol,
        toSymbol: resolved.toSymbol,
        searchText: `${category.name || ''} ${chainDefaults.buildChainSearchText(quote.chain)} ${quote.symbol || ''} ${quote.fromToken || ''} ${quote.toToken || ''} ${resolved.fromSymbol || ''} ${resolved.toSymbol || ''}`
      });
    }
  }

  return buildPathAlertCandidates(records, {
    buildLabel: (chain, fromSymbol, toSymbol, suffix = '') => buildPathAlertCandidateLabel(chain, fromSymbol, toSymbol, suffix)
  });
}

module.exports = {
  buildPathAlertCandidateLabel,
  buildPathAlertQuoteCandidatesFromConfig,
  formatPathAlertChainLabel,
  resolveQuoteTokenSymbols
};
