(function (root, factory) {
  const chainDefaults = typeof module !== 'undefined' && module.exports
    ? require('../shared/chain-defaults')
    : root.ChainDefaults;
  const api = factory(chainDefaults);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.DexLinkUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.DexLinkUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (chainDefaults) {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeChain(chain) {
    if (chainDefaults && typeof chainDefaults.normalizeChain === 'function') {
      return chainDefaults.normalizeChain(chain);
    }
    return String(chain || '').trim().toLowerCase();
  }

  function getDexLinkLabel(config = {}) {
    const chain = normalizeChain(config.chain);
    if (!chain || chain === 'bybit' || chain === 'binance') return null;
    if (chain === 'sui') return 'cetus';
    if (chain === 'solana') return 'jup.ag';
    if (chain === 'starknet') return 'ekubo';
    if (chain === 'mantle') return 'jumper';
    return 'swap.defillama';
  }

  const JUMPER_CHAIN_IDS = {
    mantle: 5000
  };

  function buildDexLink(config = {}) {
    const normalizedChain = normalizeChain(config.chain);
    const fromTokenAddress = String(config.fromTokenAddress || '').trim();
    const toTokenAddress = String(config.toTokenAddress || '').trim();
    if (!fromTokenAddress || !toTokenAddress) return null;

    const label = getDexLinkLabel({ chain: normalizedChain });
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
        url: `https://ekubo.org/swap?inputCurrency=${encodeURIComponent(fromTokenAddress)}&amount=${encodeURIComponent(String(inputAmount))}&outputCurrency=${encodeURIComponent(toTokenAddress)}&chainId=0x534e5f4d41494e`
      };
    }

    if (JUMPER_CHAIN_IDS[normalizedChain]) {
      const chainId = JUMPER_CHAIN_IDS[normalizedChain];
      return {
        label,
        url: `https://jumper.xyz/zh?fromChain=${chainId}&fromToken=${encodeURIComponent(fromTokenAddress)}&toChain=${chainId}&toToken=${encodeURIComponent(toTokenAddress)}`
      };
    }

    return {
      label,
      url: `https://swap.defillama.com/?chain=${encodeURIComponent(normalizedChain)}&from=${encodeURIComponent(fromTokenAddress)}&tab=swap&to=${encodeURIComponent(toTokenAddress)}`
    };
  }

  function buildDexLinkCopyButtonHtml(config = {}, className = '', buttonText = '复制') {
    const dexLabel = getDexLinkLabel(config);
    if (!dexLabel) return '';
    const inputAmount = Number(config.inputAmount);
    const amountAttr = Number.isFinite(inputAmount) && inputAmount > 0
      ? ` data-dex-link-input-amount="${escapeHtml(String(inputAmount))}"`
      : '';
    return `
            <button
                type="button"
                class="${escapeHtml(className)}"
                data-dex-link-copy="1"
                data-dex-link-label="${escapeHtml(dexLabel)}"
                data-dex-link-chain="${escapeHtml(config.chain || '')}"
                data-dex-link-from-token-address="${escapeHtml(config.fromTokenAddress || '')}"
                data-dex-link-to-token-address="${escapeHtml(config.toTokenAddress || '')}"${amountAttr}
            >${escapeHtml(buttonText)}</button>
        `;
  }

  return {
    buildDexLink,
    buildDexLinkCopyButtonHtml,
    getDexLinkLabel
  };
});
