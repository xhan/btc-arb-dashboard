(function (root, factory) {
  const morphdom = typeof module === 'object' && module.exports
    ? require('morphdom')
    : root.morphdom;
  const api = factory(root, morphdom);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.InteractionSafeRenderer = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root, morphdom) {
  const TEXT_EDITING_INPUT_TYPES = new Set([
    '', 'date', 'datetime-local', 'email', 'month', 'number', 'password',
    'search', 'tel', 'text', 'time', 'url', 'week'
  ]);

  function isTextEditingElement(element) {
    if (!element) return false;
    if (element.isContentEditable === true) return true;
    if (typeof element.getAttribute === 'function') {
      const contentEditable = String(element.getAttribute('contenteditable') || '').toLowerCase();
      if (contentEditable === 'true' || contentEditable === 'plaintext-only') return true;
    }
    const tagName = String(element.tagName || element.nodeName || '').toLowerCase();
    if (tagName === 'textarea') return true;
    if (tagName !== 'input') return false;
    const inputType = String((
      typeof element.type === 'string'
        ? element.type
        : (typeof element.getAttribute === 'function' ? element.getAttribute('type') : '')
    ) || '').toLowerCase();
    return TEXT_EDITING_INPUT_TYPES.has(inputType || 'text');
  }

  function createInteractionRuntime(options = {}) {
    const setTimer = typeof options.setTimeout === 'function'
      ? options.setTimeout
      : (typeof setTimeout === 'function' ? setTimeout : null);
    const clearTimer = typeof options.clearTimeout === 'function'
      ? options.clearTimeout
      : (typeof clearTimeout === 'function' ? clearTimeout : null);
    const idleDelayMs = Number.isFinite(Number(options.idleDelayMs))
      ? Math.max(0, Number(options.idleDelayMs))
      : 80;
    const focusMode = options.trackFocus === 'editable' ? 'editable' : 'all';
    const trackFocus = options.trackFocus !== false;
    const releaseTarget = options.releaseTarget || null;
    const listenerOptions = options.eventListenerOptions;
    const releaseListenerOptions = options.releaseEventListenerOptions || listenerOptions;
    const idleListeners = [];
    const boundTargets = [];
    const boundReleaseTargets = [];
    let idleTimer = null;
    let manualHolding = false;
    let pointerDepth = 0;
    let keyActive = false;
    let focusInside = false;
    let cancelEventsBound = false;

    function isBound(list, target) {
      return list.includes(target);
    }

    function clearIdleTimer() {
      if (idleTimer === null) return false;
      if (clearTimer) clearTimer(idleTimer);
      idleTimer = null;
      return true;
    }

    function hasActiveInteraction() {
      return manualHolding || pointerDepth > 0 || keyActive || focusInside;
    }

    function isHolding() {
      return hasActiveInteraction() || idleTimer !== null;
    }

    function notifyIdle() {
      idleListeners.slice().forEach((listener) => listener());
    }

    function scheduleIdle() {
      if (hasActiveInteraction()) return false;
      clearIdleTimer();
      if (!setTimer) {
        notifyIdle();
        return true;
      }
      idleTimer = setTimer(() => {
        idleTimer = null;
        if (!isHolding()) notifyIdle();
      }, idleDelayMs);
      return true;
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

    function isTrackedFocusTarget(target) {
      return focusMode !== 'editable' || isTextEditingElement(target);
    }

    function focusIn(event) {
      if (!trackFocus || !isTrackedFocusTarget(event && event.target)) return;
      focusInside = true;
      clearIdleTimer();
    }

    function focusOut(event) {
      if (!trackFocus) return;
      const nextTarget = event && event.relatedTarget;
      if (
        nextTarget
        && isTrackedFocusTarget(nextTarget)
        && boundTargets.some((target) => (
          target && typeof target.contains === 'function' && target.contains(nextTarget)
        ))
      ) {
        return;
      }
      focusInside = false;
      scheduleIdle();
    }

    function cancelInteraction() {
      pointerDepth = 0;
      keyActive = false;
      if (!trackFocus) focusInside = false;
      scheduleIdle();
    }

    function bindReleaseEvents(target) {
      if (!target || typeof target.addEventListener !== 'function' || isBound(boundReleaseTargets, target)) {
        return false;
      }
      boundReleaseTargets.push(target);
      target.addEventListener('pointerup', pointerUp, releaseListenerOptions);
      target.addEventListener('pointercancel', pointerUp, releaseListenerOptions);
      target.addEventListener('keyup', keyUp, releaseListenerOptions);
      return true;
    }

    function bindCancelEvents() {
      if (cancelEventsBound) return false;
      const windowImpl = options.windowImpl || (root && root.window) || null;
      if (!windowImpl || typeof windowImpl.addEventListener !== 'function') return false;
      cancelEventsBound = true;
      windowImpl.addEventListener('blur', cancelInteraction, true);
      return true;
    }

    function bind(target) {
      if (!target || typeof target.addEventListener !== 'function' || isBound(boundTargets, target)) {
        return false;
      }
      boundTargets.push(target);
      target.addEventListener('pointerdown', pointerDown, listenerOptions);
      target.addEventListener('focusin', focusIn, listenerOptions);
      target.addEventListener('focusout', focusOut, listenerOptions);
      target.addEventListener('keydown', keyDown, listenerOptions);
      bindReleaseEvents(
        releaseTarget && typeof releaseTarget.addEventListener === 'function'
          ? releaseTarget
          : target
      );
      bindCancelEvents();
      return true;
    }

    function unbind(target) {
      const targetIndex = boundTargets.indexOf(target);
      if (targetIndex < 0 || !target || typeof target.removeEventListener !== 'function') return false;
      boundTargets.splice(targetIndex, 1);
      target.removeEventListener('pointerdown', pointerDown, listenerOptions);
      target.removeEventListener('focusin', focusIn, listenerOptions);
      target.removeEventListener('focusout', focusOut, listenerOptions);
      target.removeEventListener('keydown', keyDown, listenerOptions);
      const releaseIndex = boundReleaseTargets.indexOf(target);
      if (releaseIndex >= 0 && (target !== releaseTarget || boundTargets.length === 0)) {
        boundReleaseTargets.splice(releaseIndex, 1);
        target.removeEventListener('pointerup', pointerUp, releaseListenerOptions);
        target.removeEventListener('pointercancel', pointerUp, releaseListenerOptions);
        target.removeEventListener('keyup', keyUp, releaseListenerOptions);
      }
      focusInside = false;
      scheduleIdle();
      return true;
    }

    function addIdleListener(listener) {
      if (typeof listener !== 'function') return false;
      idleListeners.push(listener);
      return true;
    }

    return {
      addIdleListener,
      bind,
      hold() {
        manualHolding = true;
        clearIdleTimer();
        return true;
      },
      isHolding,
      release() {
        manualHolding = false;
        return scheduleIdle();
      },
      shouldDeferRender: isHolding,
      unbind
    };
  }

  function getRenderNodeKey(node) {
    if (!node || node.nodeType !== 1) return undefined;
    if (typeof node.getAttribute === 'function') {
      const renderKey = node.getAttribute('data-render-key');
      if (renderKey) return `render:${renderKey}`;
    }
    return node.id ? `id:${node.id}` : undefined;
  }

  function assertUniqueRenderKeys(rootElement) {
    if (!rootElement || typeof rootElement.querySelectorAll !== 'function') return true;
    const keys = new Set();
    for (const element of rootElement.querySelectorAll('[data-render-key]')) {
      const key = String(element.getAttribute('data-render-key') || '');
      if (!key) throw new Error('data-render-key 不能为空');
      if (keys.has(key)) throw new Error(`data-render-key 重复: ${key}`);
      keys.add(key);
    }
    return true;
  }

  function createMorphTarget(target, nextContent) {
    if (nextContent && typeof nextContent === 'object' && nextContent.nodeType === 1) {
      return nextContent;
    }
    if (!target || typeof target.cloneNode !== 'function') return null;
    const nextTarget = target.cloneNode(false);
    nextTarget.innerHTML = String(nextContent == null ? '' : nextContent);
    return nextTarget;
  }

  function morphElementChildren(target, nextContent, options = {}) {
    if (!target) return false;
    const nextTarget = createMorphTarget(target, nextContent);
    const morph = options.morphdom || morphdom;
    if (!nextTarget) {
      target.innerHTML = String(nextContent == null ? '' : nextContent);
      return true;
    }
    assertUniqueRenderKeys(nextTarget);
    if (
      typeof target.innerHTML === 'string'
      && typeof nextTarget.innerHTML === 'string'
      && target.innerHTML === nextTarget.innerHTML
    ) {
      return false;
    }
    if (typeof morph !== 'function') {
      throw new Error('morphdom 未加载，无法执行结构化渲染');
    }
    morph(target, nextTarget, {
      childrenOnly: true,
      getNodeKey: options.getNodeKey || getRenderNodeKey
    });
    return true;
  }

  function createCommitRuntime(options = {}) {
    const getTarget = typeof options.getTarget === 'function'
      ? options.getTarget
      : () => options.target || null;
    const isActive = typeof options.isActive === 'function' ? options.isActive : () => true;
    const commit = typeof options.commit === 'function' ? options.commit : () => false;
    const getVersion = typeof options.getVersion === 'function' ? options.getVersion : (value) => value;
    const localInteraction = createInteractionRuntime(options);
    const sharedInteraction = options.interactionRuntime || null;
    let committedVersions = new WeakMap();
    let pending = null;
    const metrics = {
      commits: 0,
      deferred: 0,
      requested: 0,
      skippedEqual: 0
    };

    function isHolding() {
      if (localInteraction.isHolding()) return true;
      return Boolean(
        sharedInteraction
        && (
          (typeof sharedInteraction.shouldDeferRender === 'function' && sharedInteraction.shouldDeferRender())
          || (typeof sharedInteraction.isHolding === 'function' && sharedInteraction.isHolding())
        )
      );
    }

    function commitPending() {
      if (!pending || !isActive() || isHolding()) return false;
      const next = pending;
      pending = null;
      commit(next.target, next.value);
      committedVersions.set(next.target, next.version);
      metrics.commits += 1;
      return true;
    }

    function update(value, config = {}) {
      metrics.requested += 1;
      const target = config.target || getTarget();
      if (!target) return false;
      localInteraction.bind(target);
      const version = Object.prototype.hasOwnProperty.call(config, 'version')
        ? config.version
        : getVersion(value);
      const hasCommitted = committedVersions.has(target);
      if (config.force !== true && hasCommitted && Object.is(committedVersions.get(target), version)) {
        pending = null;
        metrics.skippedEqual += 1;
        return false;
      }
      pending = { target, value, version };
      if (hasCommitted && (isHolding() || !isActive())) {
        metrics.deferred += 1;
        return false;
      }
      return commitPending();
    }

    localInteraction.addIdleListener(commitPending);
    if (sharedInteraction && typeof sharedInteraction.addIdleListener === 'function') {
      sharedInteraction.addIdleListener(commitPending);
    }

    return {
      getMetrics: () => ({ ...metrics }),
      hasPending: () => Boolean(pending),
      isHolding,
      reset() {
        committedVersions = new WeakMap();
        pending = null;
      },
      unbind: localInteraction.unbind,
      update
    };
  }

  function createInteractionSafeHtmlRenderer(options = {}) {
    return createCommitRuntime({
      ...options,
      commit: typeof options.commit === 'function'
        ? options.commit
        : (target, html) => morphElementChildren(target, html, options),
      getVersion: (html) => String(html == null ? '' : html)
    });
  }

  function createInteractionSafeViewRuntime(options = {}) {
    const activeMode = options.activeMode;
    const getMode = typeof options.getMode === 'function' ? options.getMode : () => activeMode;
    const render = typeof options.render === 'function' ? options.render : () => {};
    let rendered = false;
    let dirty = false;
    let deferred = false;
    let revision = 0;
    const runtime = createCommitRuntime({
      ...options,
      isActive: () => getMode() === activeMode,
      commit() {
        render();
        rendered = true;
        dirty = false;
        deferred = false;
      }
    });

    function isActive() {
      return getMode() === activeMode;
    }

    function markDirty() {
      dirty = true;
      return false;
    }

    function renderNow() {
      if (!isActive()) {
        dirty = true;
        deferred = false;
        return false;
      }
      revision += 1;
      dirty = true;
      const committed = runtime.update(revision, { force: true, version: revision });
      deferred = !committed;
      return committed;
    }

    function ensureRendered() {
      if (!rendered || dirty) return renderNow();
      return true;
    }

    return {
      ensureRendered,
      getMetrics: runtime.getMetrics,
      hasDeferredRender: () => deferred,
      hasRendered: () => rendered,
      isActive,
      isDirty: () => dirty,
      markDirty,
      renderNow
    };
  }

  return {
    assertUniqueRenderKeys,
    createInteractionRuntime,
    createInteractionSafeHtmlRenderer,
    createInteractionSafeViewRuntime,
    getRenderNodeKey,
    isTextEditingElement,
    morphElementChildren
  };
}));
