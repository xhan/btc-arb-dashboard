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

  function removeClasses(element, classNames = []) {
    if (!element || !element.classList || typeof element.classList.remove !== 'function') return;
    classNames.forEach((className) => {
      element.classList.remove(className);
    });
  }

  function addClass(element, className) {
    if (element && element.classList && typeof element.classList.add === 'function' && className) {
      element.classList.add(className);
    }
  }

  function applyTooltipState(tooltipEl, targetEl, tooltipState = {}) {
    if (!tooltipEl || !targetEl || !tooltipState) return false;
    tooltipEl.innerHTML = tooltipState.html || '';
    removeClasses(tooltipEl, ['visible', 'cex-orderbook-tooltip-host']);
    addClass(tooltipEl, 'visible');
    addClass(tooltipEl, tooltipState.className);

    const rect = typeof targetEl.getBoundingClientRect === 'function'
      ? targetEl.getBoundingClientRect()
      : { top: 0, left: 0, width: 0 };
    if (tooltipEl.style) {
      tooltipEl.style.top = `${rect.top}px`;
      tooltipEl.style.left = `${rect.left + (rect.width / 2)}px`;
    }
    return true;
  }

  function hideTooltip(tooltipEl) {
    if (!tooltipEl) return false;
    removeClasses(tooltipEl, ['visible']);
    return true;
  }

  function applyTrendArrowState(arrowEl, trendState, options = {}) {
    if (!arrowEl || !trendState) return false;
    if (trendState.action === 'hide') {
      removeClasses(arrowEl, ['visible']);
      return true;
    }

    removeClasses(arrowEl, ['visible']);
    if (typeof options.forceReflow === 'function') {
      options.forceReflow(arrowEl);
    } else {
      void arrowEl.offsetWidth;
    }
    arrowEl.innerHTML = trendState.html || '';
    arrowEl.className = trendState.className || '';
    return true;
  }

  function resetTrendArrow(arrowEl) {
    if (!arrowEl) return false;
    arrowEl.className = 'trend-arrow';
    arrowEl.innerHTML = '';
    return true;
  }

  function clearQuoteHighlightUi(itemEl) {
    if (!itemEl) return false;
    removeClasses(itemEl, ['highlight', 'highlight-past']);
    const dismissButton = typeof itemEl.querySelector === 'function'
      ? itemEl.querySelector('.dismiss-highlight-btn')
      : null;
    if (dismissButton && typeof dismissButton.remove === 'function') {
      dismissButton.remove();
    }
    return true;
  }

  function applyQuoteAlertHighlightUi(itemEl, uiUpdate = {}) {
    if (!itemEl || !itemEl.classList || typeof itemEl.classList.toggle !== 'function') return false;
    itemEl.classList.toggle('highlight', Boolean(uiUpdate.highlighted));
    itemEl.classList.toggle('highlight-past', Boolean(uiUpdate.highlightPast));
    return true;
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
    applyTooltipState,
    applyTrendArrowState,
    applyQuoteAlertHighlightUi,
    bindDraggableElement,
    bindFloatingPanelFocus,
    clearQuoteHighlightUi,
    closestEventTarget,
    createElementFromHtml,
    createStableHtmlRenderer,
    escapeCssAttributeValue,
    hideTooltip,
    resetTrendArrow,
    resolveEventTargetElement
  };
}));
