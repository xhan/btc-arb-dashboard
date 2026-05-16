(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CopyUtils = api;
  if (root && root.window && root.window !== root) {
    root.window.CopyUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  async function copyTextToClipboard(text, env = {}) {
    if (!text) {
      throw new Error('Missing clipboard text');
    }

    const runtimeNavigator = env.navigator || (typeof navigator !== 'undefined' ? navigator : null);
    const secureContext = typeof env.isSecureContext === 'boolean'
      ? env.isSecureContext
      : (typeof window !== 'undefined' ? window.isSecureContext : false);

    if (runtimeNavigator && runtimeNavigator.clipboard && secureContext) {
      await runtimeNavigator.clipboard.writeText(text);
      return true;
    }

    const runtimeDocument = env.document || (typeof document !== 'undefined' ? document : null);
    if (!runtimeDocument || !runtimeDocument.body || typeof runtimeDocument.createElement !== 'function') {
      throw new Error('Clipboard fallback unavailable');
    }

    const textarea = runtimeDocument.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    runtimeDocument.body.appendChild(textarea);
    if (typeof textarea.focus === 'function') {
      textarea.focus();
    }
    textarea.select();
    if (typeof textarea.setSelectionRange === 'function') {
      textarea.setSelectionRange(0, textarea.value.length);
    }

    try {
      const copied = typeof runtimeDocument.execCommand === 'function'
        ? runtimeDocument.execCommand('copy')
        : false;
      if (!copied) {
        throw new Error('Clipboard fallback failed');
      }
      return true;
    } finally {
      if (typeof textarea.remove === 'function') {
        textarea.remove();
      }
    }
  }

  function createCopyToastRuntime(options = {}) {
    const setTimer = typeof options.setTimeout === 'function'
      ? options.setTimeout
      : (typeof setTimeout === 'function' ? setTimeout : null);
    const clearTimer = typeof options.clearTimeout === 'function'
      ? options.clearTimeout
      : (typeof clearTimeout === 'function' ? clearTimeout : null);
    const defaultDurationMs = Number.isFinite(Number(options.durationMs)) && Number(options.durationMs) >= 0
      ? Number(options.durationMs)
      : 1200;
    const visibleClass = String(options.visibleClass || 'visible');
    let timer = null;

    function clear() {
      if (timer === null) return false;
      if (clearTimer) {
        clearTimer(timer);
      }
      timer = null;
      return true;
    }

    function show(toastEl, message, durationMs = defaultDurationMs) {
      if (!toastEl) return false;
      clear();
      toastEl.textContent = message;
      if (toastEl.classList && typeof toastEl.classList.add === 'function') {
        toastEl.classList.add(visibleClass);
      }
      if (setTimer) {
        const safeDurationMs = Number.isFinite(Number(durationMs)) && Number(durationMs) >= 0
          ? Number(durationMs)
          : defaultDurationMs;
        timer = setTimer(() => {
          timer = null;
          if (toastEl.classList && typeof toastEl.classList.remove === 'function') {
            toastEl.classList.remove(visibleClass);
          }
        }, safeDurationMs);
      }
      return true;
    }

    return {
      clear,
      getTimer: () => timer,
      show
    };
  }

  function copyPriceFromText(text, options = {}) {
    const extractPrice = typeof options.extractPrice === 'function'
      ? options.extractPrice
      : null;
    const price = extractPrice ? extractPrice(text) : null;
    if (typeof price !== 'number' || Number.isNaN(price)) return false;

    if (typeof options.copyText === 'function') {
      options.copyText(String(price));
    }
    if (typeof options.showToast === 'function') {
      options.showToast(`已复制: ${price}`);
    }
    return true;
  }

  function bindCopyPriceHandler(targetEl, options = {}) {
    if (!targetEl || !targetEl.dataset || targetEl.dataset.copyBound) return false;
    if (typeof targetEl.addEventListener !== 'function') return false;
    targetEl.dataset.copyBound = '1';
    targetEl.addEventListener('click', (event) => {
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      const text = typeof options.getText === 'function'
        ? options.getText()
        : targetEl.textContent;
      copyPriceFromText(text, options);
    });
    return true;
  }

  async function copyDexLinkFromElement(targetEl, options = {}) {
    if (!targetEl) return false;
    const dataset = targetEl.dataset || {};
    const buildDexLink = typeof options.buildDexLink === 'function'
      ? options.buildDexLink
      : null;
    const dexLink = buildDexLink ? buildDexLink({
      chain: dataset.dexLinkChain || '',
      fromTokenAddress: dataset.dexLinkFromTokenAddress || '',
      toTokenAddress: dataset.dexLinkToTokenAddress || '',
      inputAmount: dataset.dexLinkInputAmount || ''
    }) : null;

    if (!dexLink || !dexLink.url) {
      if (typeof options.showToast === 'function') {
        options.showToast('该交易对不支持 DEX 链接');
      }
      return false;
    }

    try {
      if (typeof options.copyText === 'function') {
        await options.copyText(dexLink.url);
      }
      if (typeof options.showToast === 'function') {
        options.showToast(`已复制 ${(dataset.dexLinkLabel || dexLink.label || 'DEX')} 链接`);
      }
      return true;
    } catch (error) {
      if (typeof options.showToast === 'function') {
        options.showToast('复制失败');
      }
      return false;
    }
  }

  return {
    bindCopyPriceHandler,
    createCopyToastRuntime,
    copyDexLinkFromElement,
    copyPriceFromText,
    copyTextToClipboard
  };
});
