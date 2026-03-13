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

  return {
    copyTextToClipboard
  };
});
