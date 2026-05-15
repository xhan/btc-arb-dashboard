(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.DomRenderUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createElementFromHtml(html, options = {}) {
    const documentImpl = options.documentImpl || (typeof document !== 'undefined' ? document : null);
    if (!documentImpl || typeof documentImpl.createElement !== 'function') return null;
    const wrapper = documentImpl.createElement('div');
    wrapper.innerHTML = String(html || '');
    return wrapper.firstElementChild || null;
  }

  function escapeCssAttributeValue(value, options = {}) {
    const cssImpl = options.cssImpl || (typeof CSS !== 'undefined' ? CSS : null);
    const text = String(value || '');
    if (cssImpl && typeof cssImpl.escape === 'function') {
      return cssImpl.escape(text);
    }
    return text.replace(/["\\]/g, '\\$&');
  }

  function createStableHtmlRenderer(options = {}) {
    const setHtml = typeof options.setHtml === 'function'
      ? options.setHtml
      : (element, html) => {
        element.innerHTML = html;
      };
    let renderedHtml = '';

    function reset() {
      renderedHtml = '';
    }

    function render(element, nextHtml) {
      if (!element) return false;
      const html = String(nextHtml || '');
      if (html === renderedHtml) return false;
      setHtml(element, html);
      renderedHtml = html;
      return true;
    }

    function getHtml() {
      return renderedHtml;
    }

    return {
      getHtml,
      render,
      reset
    };
  }

  return {
    createElementFromHtml,
    createStableHtmlRenderer,
    escapeCssAttributeValue
  };
}));
