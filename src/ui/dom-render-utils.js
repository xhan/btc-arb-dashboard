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
    let bound = false;
    if (header && typeof header.addEventListener === 'function') {
      header.addEventListener('mousedown', () => bringToFront(panel));
      header.addEventListener('click', () => bringToFront(panel));
      bound = true;
    }
    if (panel && typeof panel.addEventListener === 'function') {
      panel.addEventListener('mousedown', () => bringToFront(panel));
      bound = true;
    }
    return bound;
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

  function applyFloatingPanelViewportHeight(panelEl, viewportHeight, options = {}) {
    if (!panelEl || !panelEl.style) return false;
    const minHeight = Number.isFinite(Number(options.minHeight)) ? Number(options.minHeight) : 200;
    const nextHeight = Math.max(minHeight, Number(viewportHeight) || 0);
    panelEl.style.height = `${nextHeight}px`;
    return true;
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

  function applyQuoteAlertDismissButtonState(resultDiv, state = {}, quoteId = '', options = {}) {
    if (!resultDiv || typeof resultDiv.querySelector !== 'function') return false;
    const dismissButton = resultDiv.querySelector('.dismiss-highlight-btn');
    if (!state.hasUnreadAlert) {
      if (dismissButton && typeof dismissButton.remove === 'function') {
        dismissButton.remove();
        return true;
      }
      return false;
    }
    if (dismissButton) return false;

    const documentImpl = options.documentImpl || resultDiv.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!documentImpl || typeof documentImpl.createElement !== 'function') return false;
    const button = documentImpl.createElement('button');
    button.className = 'icon-btn dismiss-highlight-btn';
    button.title = '确认报警/清除状态';
    button.dataset.dismissHighlightId = quoteId;
    button.innerHTML = '✔️';

    const settingsButton = resultDiv.querySelector('[data-edit-alert-id]');
    if (settingsButton && settingsButton.parentElement && typeof settingsButton.parentElement.insertBefore === 'function') {
      settingsButton.parentElement.insertBefore(button, settingsButton);
      return true;
    }
    return false;
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
    refs.quoteTextEl.textContent = '报价失败';
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

  function bindFloatingPanelChrome(panel, header, options = {}) {
    const zIndexRuntime = options.zIndexRuntime || null;
    const bringToFront = typeof options.bringToFront === 'function'
      ? options.bringToFront
      : (
        zIndexRuntime && typeof zIndexRuntime.bringToFront === 'function'
          ? (targetPanel) => zIndexRuntime.bringToFront(targetPanel)
          : () => {}
      );
    const resetApplied = zIndexRuntime && typeof zIndexRuntime.resetPanel === 'function'
      ? zIndexRuntime.resetPanel(panel)
      : false;
    const focusBound = bindFloatingPanelFocus(panel, header, { bringToFront });
    const dragBound = options.draggable === false
      ? false
      : bindDraggableElement(panel, header, {
        documentImpl: options.documentImpl,
        onDragStart: bringToFront
      });
    return {
      resetApplied: Boolean(resetApplied),
      focusBound,
      dragBound
    };
  }

  function createStableHtmlRenderer(options = {}) {
    const setHtml = typeof options.setHtml === 'function'
      ? options.setHtml
      : (element, html) => {
        element.innerHTML = html;
      };
    const shouldDeferRender = typeof options.shouldDeferRender === 'function'
      ? options.shouldDeferRender
      : () => false;
    let renderedHtml = '';
    let pendingHtml = null;

    function reset() {
      renderedHtml = '';
      pendingHtml = null;
    }

    function write(element, html) {
      setHtml(element, html);
      renderedHtml = html;
      pendingHtml = null;
      return true;
    }

    function render(element, nextHtml) {
      if (!element) return false;
      const html = String(nextHtml || '');
      if (html === renderedHtml) {
        pendingHtml = null;
        return false;
      }
      if (shouldDeferRender(element, html)) {
        pendingHtml = html;
        return false;
      }
      return write(element, html);
    }

    function getHtml() {
      return renderedHtml;
    }

    function hasPending() {
      return pendingHtml !== null && pendingHtml !== renderedHtml;
    }

    function flush(element) {
      if (!element || !hasPending()) return false;
      return write(element, pendingHtml);
    }

    return {
      flush,
      getHtml,
      hasPending,
      render,
      reset
    };
  }

  function createRenderInteractionHoldRuntime(options = {}) {
    const setTimer = typeof options.setTimeout === 'function'
      ? options.setTimeout
      : (typeof setTimeout === 'function' ? setTimeout : null);
    const clearTimer = typeof options.clearTimeout === 'function'
      ? options.clearTimeout
      : (typeof clearTimeout === 'function' ? clearTimeout : null);
    const idleDelayMs = Number.isFinite(Number(options.idleDelayMs)) && Number(options.idleDelayMs) >= 0
      ? Number(options.idleDelayMs)
      : 80;
    const onIdle = typeof options.onIdle === 'function' ? options.onIdle : () => {};
    const trackFocus = options.trackFocus !== false;
    const eventListenerOptions = options.eventListenerOptions;
    const idleListeners = [];
    let boundTarget = null;
    let idleTimer = null;
    let manualHolding = false;
    let pointerDepth = 0;
    let keyActive = false;
    let focusInside = false;

    function clearIdleTimer() {
      if (idleTimer === null) return false;
      if (clearTimer) {
        clearTimer(idleTimer);
      }
      idleTimer = null;
      return true;
    }

    function notifyIdle() {
      onIdle();
      idleListeners.forEach((listener) => listener());
    }

    function isHolding() {
      return manualHolding || pointerDepth > 0 || keyActive || focusInside;
    }

    function scheduleIdle() {
      if (isHolding() || !setTimer) return false;
      clearIdleTimer();
      idleTimer = setTimer(() => {
        idleTimer = null;
        if (!isHolding()) {
          notifyIdle();
        }
      }, idleDelayMs);
      return true;
    }

    function hold() {
      manualHolding = true;
      clearIdleTimer();
      return true;
    }

    function release() {
      manualHolding = false;
      return scheduleIdle();
    }

    function pointerDown() {
      pointerDepth += 1;
      clearIdleTimer();
    }

    function pointerUp() {
      pointerDepth = Math.max(0, pointerDepth - 1);
      scheduleIdle();
    }

    function keyDown() {
      keyActive = true;
      clearIdleTimer();
    }

    function keyUp() {
      keyActive = false;
      scheduleIdle();
    }

    function focusIn() {
      if (!trackFocus) return;
      focusInside = true;
      clearIdleTimer();
    }

    function focusOut(event) {
      if (!trackFocus) return;
      const nextTarget = event && event.relatedTarget;
      if (
        nextTarget
        && boundTarget
        && typeof boundTarget.contains === 'function'
        && boundTarget.contains(nextTarget)
      ) {
        return;
      }
      focusInside = false;
      scheduleIdle();
    }

    function shouldDeferRender() {
      return isHolding();
    }

    function addIdleListener(listener) {
      if (typeof listener !== 'function') return false;
      idleListeners.push(listener);
      return true;
    }

    function bind(target) {
      if (!target || typeof target.addEventListener !== 'function') return false;
      if (boundTarget) return false;
      boundTarget = target;
      target.addEventListener('pointerdown', pointerDown, eventListenerOptions);
      target.addEventListener('pointerup', pointerUp, eventListenerOptions);
      target.addEventListener('pointercancel', pointerUp, eventListenerOptions);
      target.addEventListener('focusin', focusIn, eventListenerOptions);
      target.addEventListener('focusout', focusOut, eventListenerOptions);
      target.addEventListener('keydown', keyDown, eventListenerOptions);
      target.addEventListener('keyup', keyUp, eventListenerOptions);
      return true;
    }

    return {
      addIdleListener,
      bind,
      hold,
      isHolding,
      release,
      shouldDeferRender
    };
  }

  function createRenderInteractionDeferralRuntime(options = {}) {
    const getTarget = typeof options.getTarget === 'function'
      ? options.getTarget
      : () => options.target || null;
    const interactionRuntime = createRenderInteractionHoldRuntime({
      setTimeout: options.setTimeout,
      clearTimeout: options.clearTimeout,
      idleDelayMs: options.idleDelayMs,
      onIdle: options.onIdle
    });
    const sharedInteractionRuntime = options.interactionRuntime || null;
    if (
      sharedInteractionRuntime
      && typeof sharedInteractionRuntime.addIdleListener === 'function'
      && typeof options.onIdle === 'function'
    ) {
      sharedInteractionRuntime.addIdleListener(options.onIdle);
    }

    function bind(target = getTarget()) {
      return interactionRuntime.bind(target);
    }

    function shouldDeferRender(target = getTarget()) {
      if (interactionRuntime.shouldDeferRender(target)) return true;
      if (sharedInteractionRuntime && typeof sharedInteractionRuntime.shouldDeferRender === 'function') {
        return sharedInteractionRuntime.shouldDeferRender(target);
      }
      if (sharedInteractionRuntime && typeof sharedInteractionRuntime.isHolding === 'function') {
        return sharedInteractionRuntime.isHolding();
      }
      return false;
    }

    return {
      bind,
      hold: interactionRuntime.hold,
      isHolding: interactionRuntime.isHolding,
      release: interactionRuntime.release,
      shouldDeferRender
    };
  }

  function shouldDeferRenderWhileFocused(element, options = {}) {
    if (!element || typeof element.contains !== 'function') return false;
    const documentImpl = options.documentImpl || (typeof document !== 'undefined' ? document : null);
    const activeElement = options.activeElement || (documentImpl && documentImpl.activeElement) || null;
    return Boolean(activeElement && element.contains(activeElement));
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
    applyFloatingPanelViewportHeight,
    applyTooltipState,
    applyTrendArrowState,
    applyQuoteAlertDismissButtonState,
    applyQuoteAlertHighlightUi,
    bindDraggableElement,
    bindFloatingPanelFocus,
    bindFloatingPanelChrome,
    clearQuoteDataError,
    clearQuoteHighlightUi,
    closestEventTarget,
    createElementFromHtml,
    createFloatingPanelZIndexRuntime,
    createRenderInteractionDeferralRuntime,
    createRenderInteractionHoldRuntime,
    createStableHtmlRenderer,
    shouldDeferRenderWhileFocused,
    escapeCssAttributeValue,
    getQuoteDomRefs,
    hideTooltip,
    removeQuoteInverseElement,
    resetTrendArrow,
    resolveEventTargetElement,
    showTooltip
  };
}));
