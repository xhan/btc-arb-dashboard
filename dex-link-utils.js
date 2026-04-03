(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.DexLinkUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.DexLinkUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getDexLinkLabel(config = {}) {
    const chain = String(config.chain || '').trim().toLowerCase();
    if (!chain || chain === 'bybit' || chain === 'binance') return null;
    if (chain === 'sui') return 'cetus';
    if (chain === 'solana') return 'jup.ag';
    if (chain === 'starknet') return 'ekubo';
    return 'swap.defillama';
  }

  function buildDexLink(config = {}) {
    const chain = String(config.chain || '').trim();
    const normalizedChain = chain.toLowerCase();
    const fromTokenAddress = String(config.fromTokenAddress || '').trim();
    const toTokenAddress = String(config.toTokenAddress || '').trim();
    if (!fromTokenAddress || !toTokenAddress) return null;

    const label = getDexLinkLabel({ chain });
    if (!label) {
      return null;
    }

    if (normalizedChain === 'sui') {
      return {
        label,
        url: `https://app.cetus.zone/swap/${encodeURIComponent(fromTokenAddress)}/${encodeURIComponent(toTokenAddress)}`
      };
    }

    if (normalizedChain === 'solana') {
      return {
        label,
        url: `https://jup.ag/?sell=${encodeURIComponent(fromTokenAddress)}&buy=${encodeURIComponent(toTokenAddress)}`
      };
    }

    if (normalizedChain === 'starknet') {
      const inputAmount = Number(config.inputAmount);
      if (!Number.isFinite(inputAmount) || inputAmount <= 0) return null;
      return {
        label,
        url: `https://ekubo.org/starknet/swap?inputCurrency=${encodeURIComponent(fromTokenAddress)}&amount=${encodeURIComponent(String(inputAmount))}&outputCurrency=${encodeURIComponent(toTokenAddress)}`
      };
    }

    return {
      label,
      url: `https://swap.defillama.com/?chain=${encodeURIComponent(normalizedChain)}&from=${encodeURIComponent(fromTokenAddress)}&tab=swap&to=${encodeURIComponent(toTokenAddress)}`
    };
  }

  return {
    buildDexLink,
    getDexLinkLabel
  };
});
