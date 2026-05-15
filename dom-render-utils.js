(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.DomRenderUtils = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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
    createStableHtmlRenderer
  };
}));
