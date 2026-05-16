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

  function getElementImpl(options = {}) {
    return options.elementImpl || (typeof Element !== 'undefined' ? Element : null);
  }

  function resolveEventTargetElement(event, options = {}) {
    const ElementImpl = getElementImpl(options);
    if (!ElementImpl) return null;
    const target = event && event.target;
    if (target instanceof ElementImpl) {
      return target;
    }
    if (target && target.parentElement instanceof ElementImpl) {
      return target.parentElement;
    }
    return null;
  }

  function closestEventTarget(event, selector, options = {}) {
    const target = resolveEventTargetElement(event, options);
    return target && typeof target.closest === 'function'
      ? target.closest(selector)
      : null;
  }

  function bindFloatingPanelFocus(panel, header, options = {}) {
    const bringToFront = typeof options.bringToFront === 'function'
      ? options.bringToFront
      : () => {};
    if (header && typeof header.addEventListener === 'function') {
      header.addEventListener('mousedown', () => bringToFront(panel));
      header.addEventListener('click', () => bringToFront(panel));
    }
    if (panel && typeof panel.addEventListener === 'function') {
      panel.addEventListener('mousedown', () => bringToFront(panel));
    }
  }

  function bindDraggableElement(element, handle, options = {}) {
    if (!element || !handle) return false;
    const documentImpl = options.documentImpl || (typeof document !== 'undefined' ? document : null);
    if (!documentImpl) return false;
    const onDragStart = typeof options.onDragStart === 'function'
      ? options.onDragStart
      : () => {};
    let previousX = 0;
    let previousY = 0;

    function stopDrag() {
      documentImpl.onmouseup = null;
      documentImpl.onmousemove = null;
    }

    function dragElement(event) {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      const currentX = Number(event && event.clientX);
      const currentY = Number(event && event.clientY);
      const deltaX = previousX - (Number.isFinite(currentX) ? currentX : previousX);
      const deltaY = previousY - (Number.isFinite(currentY) ? currentY : previousY);
      previousX -= deltaX;
      previousY -= deltaY;
      element.style.top = `${element.offsetTop - deltaY}px`;
      element.style.left = `${element.offsetLeft - deltaX}px`;
    }

    handle.onmousedown = (event) => {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      onDragStart(element);
      previousX = Number(event && event.clientX) || 0;
      previousY = Number(event && event.clientY) || 0;
      documentImpl.onmouseup = stopDrag;
      documentImpl.onmousemove = dragElement;
    };
    return true;
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
    bindDraggableElement,
    bindFloatingPanelFocus,
    closestEventTarget,
    createElementFromHtml,
    createStableHtmlRenderer,
    escapeCssAttributeValue,
    resolveEventTargetElement
  };
}));
