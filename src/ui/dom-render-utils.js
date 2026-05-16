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

  function readElementDisplay(element, getComputedStyle) {
    if (typeof getComputedStyle === 'function') {
      const computedStyle = getComputedStyle(element);
      return String(computedStyle && computedStyle.display || '');
    }
    return String(element && element.style && element.style.display || '');
  }

  function applyFloatingPanelDisplayState(panelEl, action = 'toggle', options = {}) {
    if (!panelEl || !panelEl.style) {
      return {
        panelFound: false,
        visible: false,
        shouldBringToFront: false,
        shouldRender: false
      };
    }

    const displayValue = String(options.displayValue || 'flex');
    if (action === 'open') {
      panelEl.style.display = displayValue;
      return {
        panelFound: true,
        visible: true,
        shouldBringToFront: true,
        shouldRender: true
      };
    }

    const isHidden = readElementDisplay(panelEl, options.getComputedStyle) === 'none';
    panelEl.style.display = isHidden ? displayValue : 'none';
    return {
      panelFound: true,
      visible: isHidden,
      shouldBringToFront: isHidden,
      shouldRender: isHidden
    };
  }

  function createFloatingPanelZIndexRuntime(options = {}) {
    const baseZIndex = Number.isFinite(Number(options.baseZIndex))
      ? Number(options.baseZIndex)
      : 2100;
    let currentZIndex = baseZIndex;

    function resetPanel(panel) {
      if (!panel || !panel.style) return false;
      panel.style.zIndex = String(baseZIndex);
      return true;
    }

    function bringToFront(panel) {
      if (!panel || !panel.style) return null;
      currentZIndex += 1;
      panel.style.zIndex = String(currentZIndex);
      return currentZIndex;
    }

    return {
      bringToFront,
      resetPanel
    };
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

  function showTooltip(tooltipEl, targetEl, htmlContent, options = {}) {
    return applyTooltipState(tooltipEl, targetEl, {
      html: htmlContent,
      className: options.className || ''
    });
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

  function clearQuoteDataError(quoteDataEl) {
    if (!quoteDataEl) return false;
    removeClasses(quoteDataEl, ['error']);
    if (typeof quoteDataEl.removeAttribute === 'function') {
      quoteDataEl.removeAttribute('title');
    }
    return true;
  }

  function getQuoteDomRefs(documentImpl, quoteId) {
    const getElementById = documentImpl && typeof documentImpl.getElementById === 'function'
      ? documentImpl.getElementById.bind(documentImpl)
      : () => null;
    return {
      itemEl: getElementById(`quote-item-${quoteId}`),
      quoteDataEl: getElementById(`quote-data-${quoteId}`),
      quoteTextWrapperEl: getElementById(`quote-text-wrapper-${quoteId}`),
      quoteTextEl: getElementById(`quote-text-${quoteId}`)
    };
  }

  function applyPausedQuoteDomState(refs = {}) {
    let changed = false;
    if (refs.itemEl) {
      addClass(refs.itemEl, 'quote-item-paused');
      changed = true;
    }
    changed = clearQuoteDataError(refs.quoteDataEl) || changed;
    if (refs.quoteTextWrapperEl) {
      removeClasses(refs.quoteTextWrapperEl, ['loading-text']);
      changed = true;
    }
    if (refs.quoteTextEl) {
      refs.quoteTextEl.textContent = '已暂停';
      changed = true;
    }
    return changed;
  }

  function applyActiveQuoteDomState(refs = {}, options = {}) {
    let changed = false;
    if (refs.itemEl) {
      removeClasses(refs.itemEl, ['quote-item-paused', 'highlight', 'highlight-past']);
      changed = true;
    }
    changed = clearQuoteDataError(refs.quoteDataEl) || changed;
    if (refs.quoteTextWrapperEl) {
      removeClasses(refs.quoteTextWrapperEl, ['loading-text']);
      if (options.loading) {
        addClass(refs.quoteTextWrapperEl, 'loading-text');
      }
      changed = true;
    }
    if (refs.quoteTextEl && options.text) {
      refs.quoteTextEl.textContent = options.text;
      changed = true;
    }
    return changed;
  }

  function applyQuoteSwitchingDomState(refs = {}) {
    if (!refs.quoteTextEl || !refs.quoteTextWrapperEl) return false;
    refs.quoteTextEl.textContent = '切换中...';
    addClass(refs.quoteTextWrapperEl, 'loading-text');
    if (refs.inverseEl) {
      refs.inverseEl.textContent = '刷新中...';
    }
    return true;
  }

  function applyQuoteDisplayTextDomState(refs = {}, options = {}) {
    let changed = false;
    if (refs.quoteTextEl) {
      refs.quoteTextEl.textContent = options.text || '';
      changed = true;
    }
    if (refs.inverseEl && options.inverseText) {
      refs.inverseEl.textContent = options.inverseText;
      changed = true;
    }
    return changed;
  }

  function applyQuotePairLabelDomState(pairLabelEl, html) {
    if (!pairLabelEl) return false;
    pairLabelEl.innerHTML = String(html || '');
    return true;
  }

  function applyQuoteRunStateTagDomState(tagEl, state = {}) {
    if (!tagEl || !tagEl.classList) return false;
    tagEl.textContent = state.text || '';
    removeClasses(tagEl, ['running', 'paused']);
    addClass(tagEl, state.tone || 'running');
    return true;
  }

  function ensureQuoteInverseElement(refs = {}, options = {}) {
    if (refs.inverseEl) return refs.inverseEl;
    if (!refs.quoteDataEl || typeof refs.quoteDataEl.appendChild !== 'function') return null;
    const documentImpl = options.documentImpl
      || refs.quoteDataEl.ownerDocument
      || (typeof document !== 'undefined' ? document : null);
    if (!documentImpl || typeof documentImpl.createElement !== 'function') return null;

    const inverseEl = documentImpl.createElement('div');
    inverseEl.id = options.id || '';
    inverseEl.className = 'inverse-quote-text';
    refs.quoteDataEl.appendChild(inverseEl);
    return inverseEl;
  }

  function applyQuoteInverseQueuedDomState(refs = {}, options = {}) {
    const inverseEl = ensureQuoteInverseElement(refs, options);
    if (!inverseEl) return null;
    inverseEl.textContent = options.text || '反向报价排队中...';
    inverseEl.title = '';
    return inverseEl;
  }

  function applyQuoteInverseResultDomState(refs = {}, options = {}) {
    const inverseEl = ensureQuoteInverseElement(refs, options);
    if (!inverseEl) return null;
    inverseEl.textContent = options.text || '';
    inverseEl.title = '';
    return inverseEl;
  }

  function applyQuoteInverseErrorDomState(refs = {}, options = {}) {
    const inverseEl = ensureQuoteInverseElement(refs, options);
    if (!inverseEl) return null;
    inverseEl.textContent = options.text || '反向报价失败';
    inverseEl.title = options.title || '';
    return inverseEl;
  }

  function removeQuoteInverseElement(inverseEl) {
    if (!inverseEl || typeof inverseEl.remove !== 'function') return false;
    inverseEl.remove();
    return true;
  }

  function applyQuoteMainResultDomState(refs = {}, options = {}) {
    if (!refs.quoteTextEl || !refs.quoteTextWrapperEl) return false;
    refs.quoteTextEl.textContent = options.text || '';
    removeClasses(refs.quoteTextWrapperEl, ['loading-text']);
    return true;
  }

  function applyQuoteMainErrorDomState(refs = {}, options = {}) {
    if (!refs.quoteTextEl || !refs.quoteTextWrapperEl || !refs.quoteDataEl) return false;
    refs.quoteTextEl.textContent = `❌ ${options.message || ''}`;
    removeClasses(refs.quoteTextWrapperEl, ['loading-text']);
    addClass(refs.quoteDataEl, 'error');
    refs.quoteDataEl.title = options.title || '';
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
    applyActiveQuoteDomState,
    applyPausedQuoteDomState,
    applyQuoteDisplayTextDomState,
    applyQuoteInverseErrorDomState,
    applyQuoteInverseQueuedDomState,
    applyQuoteInverseResultDomState,
    applyQuoteMainErrorDomState,
    applyQuoteMainResultDomState,
    applyQuotePairLabelDomState,
    applyQuoteRunStateTagDomState,
    applyQuoteSwitchingDomState,
    applyFloatingPanelDisplayState,
    applyTooltipState,
    applyTrendArrowState,
    applyQuoteAlertHighlightUi,
    bindDraggableElement,
    bindFloatingPanelFocus,
    clearQuoteDataError,
    clearQuoteHighlightUi,
    closestEventTarget,
    createElementFromHtml,
    createFloatingPanelZIndexRuntime,
    createStableHtmlRenderer,
    escapeCssAttributeValue,
    getQuoteDomRefs,
    hideTooltip,
    removeQuoteInverseElement,
    resetTrendArrow,
    resolveEventTargetElement,
    showTooltip
  };
}));
