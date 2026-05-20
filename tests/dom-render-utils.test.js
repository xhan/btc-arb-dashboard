const assert = require('assert');

const {
  applyTooltipState,
  applyTrendArrowState,
  applyQuoteAlertDismissButtonState,
  applyQuoteAlertHighlightUi,
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
  bindDraggableElement,
  bindFloatingPanelFocus,
  bindFloatingPanelChrome,
  clearQuoteDataError,
  closestEventTarget,
  createElementFromHtml,
  createFloatingPanelZIndexRuntime,
  createStableHtmlRenderer,
  shouldDeferRenderWhileFocused,
  escapeCssAttributeValue,
  getQuoteDomRefs,
  showTooltip,
  hideTooltip,
  clearQuoteHighlightUi,
  removeQuoteInverseElement,
  resetTrendArrow,
  resolveEventTargetElement
} = require('../src/ui/dom-render-utils');

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    add(...classNames) {
      classNames.forEach((className) => values.add(className));
    },
    remove(...classNames) {
      classNames.forEach((className) => values.delete(className));
    },
    contains(className) {
      return values.has(className);
    }
  };
}

const writes = [];
const target = { innerHTML: '' };
const renderer = createStableHtmlRenderer({
  setHtml(element, html) {
    writes.push(html);
    element.innerHTML = html;
  }
});

assert.strictEqual(renderer.render(target, '<div>A</div>'), true);
assert.strictEqual(target.innerHTML, '<div>A</div>');
assert.deepStrictEqual(writes, ['<div>A</div>']);

assert.strictEqual(renderer.render(target, '<div>A</div>'), false);
assert.deepStrictEqual(writes, ['<div>A</div>']);

assert.strictEqual(renderer.render(target, '<div>B</div>'), true);
assert.strictEqual(target.innerHTML, '<div>B</div>');
assert.deepStrictEqual(writes, ['<div>A</div>', '<div>B</div>']);

renderer.reset();
assert.strictEqual(renderer.render(target, '<div>B</div>'), true);
assert.deepStrictEqual(writes, ['<div>A</div>', '<div>B</div>', '<div>B</div>']);

assert.strictEqual(renderer.render(null, '<div>C</div>'), false);

const deferredWrites = [];
const deferredTarget = {
  innerHTML: '',
  contains(element) {
    return element && element.inside === true;
  }
};
let activeElement = { inside: true };
const deferredRenderer = createStableHtmlRenderer({
  setHtml(element, html) {
    deferredWrites.push(html);
    element.innerHTML = html;
  },
  shouldDeferRender(element) {
    return element.contains(activeElement);
  }
});
assert.strictEqual(deferredRenderer.render(deferredTarget, '<div>first</div>'), false);
assert.strictEqual(deferredRenderer.getHtml(), '');
assert.strictEqual(deferredTarget.innerHTML, '');
assert.strictEqual(deferredRenderer.hasPending(), true);
assert.deepStrictEqual(deferredWrites, []);

assert.strictEqual(deferredRenderer.render(deferredTarget, '<div>latest</div>'), false);
activeElement = null;
assert.strictEqual(deferredRenderer.flush(deferredTarget), true);
assert.strictEqual(deferredRenderer.getHtml(), '<div>latest</div>');
assert.strictEqual(deferredTarget.innerHTML, '<div>latest</div>');
assert.deepStrictEqual(deferredWrites, ['<div>latest</div>']);
assert.strictEqual(deferredRenderer.hasPending(), false);
assert.strictEqual(deferredRenderer.flush(deferredTarget), false);

activeElement = { inside: true };
deferredRenderer.render(deferredTarget, '<div>pending</div>');
assert.strictEqual(deferredRenderer.hasPending(), true);
deferredRenderer.render(deferredTarget, '<div>latest</div>');
assert.strictEqual(deferredRenderer.hasPending(), false);
deferredRenderer.render(deferredTarget, '<div>pending</div>');
assert.strictEqual(deferredRenderer.hasPending(), true);
deferredRenderer.reset();
assert.strictEqual(deferredRenderer.hasPending(), false);
assert.strictEqual(deferredRenderer.flush(deferredTarget), false);

assert.strictEqual(
  shouldDeferRenderWhileFocused(deferredTarget, { activeElement: { inside: true } }),
  true
);
assert.strictEqual(
  shouldDeferRenderWhileFocused(deferredTarget, { activeElement: { inside: false } }),
  false
);
assert.strictEqual(shouldDeferRenderWhileFocused({}), false);

const quoteDomLookups = [];
const quoteDomRefs = getQuoteDomRefs({
  getElementById(id) {
    quoteDomLookups.push(id);
    return { id };
  }
}, 42);
assert.deepStrictEqual(quoteDomLookups, [
  'quote-item-42',
  'quote-data-42',
  'quote-text-wrapper-42',
  'quote-text-42'
]);
assert.deepStrictEqual(quoteDomRefs, {
  itemEl: { id: 'quote-item-42' },
  quoteDataEl: { id: 'quote-data-42' },
  quoteTextWrapperEl: { id: 'quote-text-wrapper-42' },
  quoteTextEl: { id: 'quote-text-42' }
});
assert.deepStrictEqual(getQuoteDomRefs(null, 42), {
  itemEl: null,
  quoteDataEl: null,
  quoteTextWrapperEl: null,
  quoteTextEl: null
});

const tooltipEl = {
  innerHTML: '',
  classList: createClassList(['visible', 'cex-orderbook-tooltip-host']),
  style: {}
};
const tooltipTargetEl = {
  getBoundingClientRect() {
    return { top: 12, left: 20, width: 40 };
  }
};
assert.strictEqual(
  applyTooltipState(tooltipEl, tooltipTargetEl, {
    html: '<strong>Kyber</strong>',
    className: 'cex-orderbook-tooltip-host'
  }),
  true
);
assert.strictEqual(tooltipEl.innerHTML, '<strong>Kyber</strong>');
assert.strictEqual(tooltipEl.classList.contains('visible'), true);
assert.strictEqual(tooltipEl.classList.contains('cex-orderbook-tooltip-host'), true);
assert.strictEqual(tooltipEl.style.top, '12px');
assert.strictEqual(tooltipEl.style.left, '40px');
assert.strictEqual(hideTooltip(tooltipEl), true);
assert.strictEqual(tooltipEl.classList.contains('visible'), false);
assert.strictEqual(applyTooltipState(null, tooltipTargetEl, { html: 'x' }), false);
assert.strictEqual(
  showTooltip(tooltipEl, tooltipTargetEl, '<em>Velora</em>', { className: 'source-tooltip' }),
  true
);
assert.strictEqual(tooltipEl.innerHTML, '<em>Velora</em>');
assert.strictEqual(tooltipEl.classList.contains('visible'), true);
assert.strictEqual(tooltipEl.classList.contains('source-tooltip'), true);
assert.strictEqual(showTooltip(null, tooltipTargetEl, 'x'), false);

const trendArrowEl = {
  classList: createClassList(['visible']),
  innerHTML: '',
  className: 'trend-arrow',
  offsetWidth: 12
};
let reflowCount = 0;
assert.strictEqual(
  applyTrendArrowState(trendArrowEl, {
    action: 'show',
    html: '&#8593;',
    className: 'trend-arrow trend-up visible'
  }, {
    forceReflow() {
      reflowCount += 1;
    }
  }),
  true
);
assert.strictEqual(reflowCount, 1);
assert.strictEqual(trendArrowEl.innerHTML, '&#8593;');
assert.strictEqual(trendArrowEl.className, 'trend-arrow trend-up visible');
assert.strictEqual(applyTrendArrowState(trendArrowEl, { action: 'hide' }), true);
assert.strictEqual(trendArrowEl.classList.contains('visible'), false);
assert.strictEqual(applyTrendArrowState(trendArrowEl, null), false);
trendArrowEl.className = 'trend-arrow trend-up visible';
trendArrowEl.innerHTML = '&#8593;';
assert.strictEqual(resetTrendArrow(trendArrowEl), true);
assert.strictEqual(trendArrowEl.className, 'trend-arrow');
assert.strictEqual(trendArrowEl.innerHTML, '');
assert.strictEqual(resetTrendArrow(null), false);

let dismissButtonRemoved = false;
const quoteHighlightEl = {
  classList: createClassList(['highlight', 'highlight-past', 'quote-item-paused']),
  querySelector(selector) {
    assert.strictEqual(selector, '.dismiss-highlight-btn');
    return {
      remove() {
        dismissButtonRemoved = true;
      }
    };
  }
};
assert.strictEqual(clearQuoteHighlightUi(quoteHighlightEl), true);
assert.strictEqual(quoteHighlightEl.classList.contains('highlight'), false);
assert.strictEqual(quoteHighlightEl.classList.contains('highlight-past'), false);
assert.strictEqual(quoteHighlightEl.classList.contains('quote-item-paused'), true);
assert.strictEqual(dismissButtonRemoved, true);
assert.strictEqual(clearQuoteHighlightUi(null), false);

const quoteHighlightToggleEl = {
  classList: {
    values: new Set(),
    toggle(className, enabled) {
      if (enabled) {
        this.values.add(className);
      } else {
        this.values.delete(className);
      }
    },
    contains(className) {
      return this.values.has(className);
    }
  }
};
assert.strictEqual(applyQuoteAlertHighlightUi(quoteHighlightToggleEl, {
  highlighted: true,
  highlightPast: false
}), true);
assert.strictEqual(quoteHighlightToggleEl.classList.contains('highlight'), true);
assert.strictEqual(quoteHighlightToggleEl.classList.contains('highlight-past'), false);
assert.strictEqual(applyQuoteAlertHighlightUi(quoteHighlightToggleEl, {
  highlighted: false,
  highlightPast: true
}), true);
assert.strictEqual(quoteHighlightToggleEl.classList.contains('highlight'), false);
assert.strictEqual(quoteHighlightToggleEl.classList.contains('highlight-past'), true);
assert.strictEqual(applyQuoteAlertHighlightUi(null, { highlighted: true }), false);

let insertedDismissButton = null;
const dismissSettingsButton = {};
dismissSettingsButton.parentElement = {
  insertBefore(button, beforeElement) {
    insertedDismissButton = button;
    assert.strictEqual(beforeElement, dismissSettingsButton);
  }
};
const dismissResultDiv = {
  querySelector(selector) {
    if (selector === '.dismiss-highlight-btn') return null;
    if (selector === '[data-edit-alert-id]') return dismissSettingsButton;
    return null;
  }
};
assert.strictEqual(applyQuoteAlertDismissButtonState(dismissResultDiv, { hasUnreadAlert: true }, 101, {
  documentImpl: {
    createElement(tagName) {
      assert.strictEqual(tagName, 'button');
      return { dataset: {} };
    }
  }
}), true);
assert.deepStrictEqual({
  className: insertedDismissButton.className,
  title: insertedDismissButton.title,
  dismissHighlightId: insertedDismissButton.dataset.dismissHighlightId,
  html: insertedDismissButton.innerHTML
}, {
  className: 'icon-btn dismiss-highlight-btn',
  title: '确认报警/清除状态',
  dismissHighlightId: 101,
  html: '✔️'
});

let removedDismissButton = false;
const dismissExistingResultDiv = {
  querySelector(selector) {
    return selector === '.dismiss-highlight-btn'
      ? { remove: () => { removedDismissButton = true; } }
      : null;
  }
};
assert.strictEqual(applyQuoteAlertDismissButtonState(dismissExistingResultDiv, { hasUnreadAlert: false }, 101), true);
assert.strictEqual(removedDismissButton, true);
assert.strictEqual(applyQuoteAlertDismissButtonState(null, { hasUnreadAlert: true }, 101), false);

function createAttributeTarget() {
  return {
    removedAttributes: [],
    removeAttribute(name) {
      this.removedAttributes.push(name);
    }
  };
}

const pausedQuoteRefs = {
  itemEl: { classList: createClassList([]) },
  quoteDataEl: {
    classList: createClassList(['error']),
    ...createAttributeTarget()
  },
  quoteTextWrapperEl: { classList: createClassList(['loading-text']) },
  quoteTextEl: { textContent: 'loading' }
};
assert.strictEqual(applyPausedQuoteDomState(pausedQuoteRefs), true);
assert.strictEqual(pausedQuoteRefs.itemEl.classList.contains('quote-item-paused'), true);
assert.strictEqual(pausedQuoteRefs.quoteDataEl.classList.contains('error'), false);
assert.deepStrictEqual(pausedQuoteRefs.quoteDataEl.removedAttributes, ['title']);
assert.strictEqual(pausedQuoteRefs.quoteTextWrapperEl.classList.contains('loading-text'), false);
assert.strictEqual(pausedQuoteRefs.quoteTextEl.textContent, '已暂停');
assert.strictEqual(applyPausedQuoteDomState({}), false);

const activeQuoteRefs = {
  itemEl: { classList: createClassList(['quote-item-paused', 'highlight', 'highlight-past', 'keep-class']) },
  quoteDataEl: {
    classList: createClassList(['error']),
    ...createAttributeTarget()
  },
  quoteTextWrapperEl: { classList: createClassList(['loading-text']) },
  quoteTextEl: { textContent: 'old' }
};
assert.strictEqual(applyActiveQuoteDomState(activeQuoteRefs, { loading: true, text: '刷新中...' }), true);
assert.strictEqual(activeQuoteRefs.itemEl.classList.contains('quote-item-paused'), false);
assert.strictEqual(activeQuoteRefs.itemEl.classList.contains('highlight'), false);
assert.strictEqual(activeQuoteRefs.itemEl.classList.contains('highlight-past'), false);
assert.strictEqual(activeQuoteRefs.itemEl.classList.contains('keep-class'), true);
assert.strictEqual(activeQuoteRefs.quoteDataEl.classList.contains('error'), false);
assert.deepStrictEqual(activeQuoteRefs.quoteDataEl.removedAttributes, ['title']);
assert.strictEqual(activeQuoteRefs.quoteTextWrapperEl.classList.contains('loading-text'), true);
assert.strictEqual(activeQuoteRefs.quoteTextEl.textContent, '刷新中...');
assert.strictEqual(applyActiveQuoteDomState({}, {}), false);

const quoteDataErrorEl = {
  classList: createClassList(['error']),
  removedAttributes: [],
  removeAttribute(name) {
    this.removedAttributes.push(name);
  }
};
assert.strictEqual(clearQuoteDataError(quoteDataErrorEl), true);
assert.strictEqual(quoteDataErrorEl.classList.contains('error'), false);
assert.deepStrictEqual(quoteDataErrorEl.removedAttributes, ['title']);
assert.strictEqual(clearQuoteDataError(null), false);

const switchingQuoteRefs = {
  quoteTextEl: { textContent: '' },
  quoteTextWrapperEl: { classList: createClassList([]) },
  inverseEl: { textContent: '' }
};
assert.strictEqual(applyQuoteSwitchingDomState(switchingQuoteRefs), true);
assert.strictEqual(switchingQuoteRefs.quoteTextEl.textContent, '切换中...');
assert.strictEqual(switchingQuoteRefs.quoteTextWrapperEl.classList.contains('loading-text'), true);
assert.strictEqual(switchingQuoteRefs.inverseEl.textContent, '刷新中...');
assert.strictEqual(applyQuoteSwitchingDomState({}), false);

const quoteDisplayTextRefs = {
  quoteTextEl: { textContent: 'old main' },
  inverseEl: { textContent: 'old inverse' }
};
assert.strictEqual(applyQuoteDisplayTextDomState(quoteDisplayTextRefs, {
  text: '1 ETH = 3000 USDC',
  inverseText: '3000 USDC = 1 ETH'
}), true);
assert.strictEqual(quoteDisplayTextRefs.quoteTextEl.textContent, '1 ETH = 3000 USDC');
assert.strictEqual(quoteDisplayTextRefs.inverseEl.textContent, '3000 USDC = 1 ETH');
assert.strictEqual(applyQuoteDisplayTextDomState(quoteDisplayTextRefs, {
  text: 'main only'
}), true);
assert.strictEqual(quoteDisplayTextRefs.quoteTextEl.textContent, 'main only');
assert.strictEqual(quoteDisplayTextRefs.inverseEl.textContent, '3000 USDC = 1 ETH');
assert.strictEqual(applyQuoteDisplayTextDomState({}, { text: 'x' }), false);

const quotePairLabelEl = { innerHTML: 'old' };
assert.strictEqual(applyQuotePairLabelDomState(quotePairLabelEl, 'ETH&lt;USDC&gt;'), true);
assert.strictEqual(quotePairLabelEl.innerHTML, 'ETH&lt;USDC&gt;');
assert.strictEqual(applyQuotePairLabelDomState(null, 'x'), false);

const quoteRunStateTagEl = {
  textContent: '',
  classList: createClassList(['running'])
};
assert.strictEqual(applyQuoteRunStateTagDomState(quoteRunStateTagEl, { text: '暂停中', tone: 'paused' }), true);
assert.strictEqual(quoteRunStateTagEl.textContent, '暂停中');
assert.strictEqual(quoteRunStateTagEl.classList.contains('running'), false);
assert.strictEqual(quoteRunStateTagEl.classList.contains('paused'), true);
assert.strictEqual(applyQuoteRunStateTagDomState(quoteRunStateTagEl, { text: '报价中' }), true);
assert.strictEqual(quoteRunStateTagEl.classList.contains('running'), true);
assert.strictEqual(quoteRunStateTagEl.classList.contains('paused'), false);
assert.strictEqual(applyQuoteRunStateTagDomState(null, { text: 'x' }), false);

function createDocumentImpl(createdElements) {
  return {
    createElement(tagName) {
      const element = {
        tagName,
        id: '',
        className: '',
        textContent: '',
        title: ''
      };
      createdElements.push(element);
      return element;
    }
  };
}

function createQuoteDataElement() {
  return {
    children: [],
    appendChild(element) {
      this.children.push(element);
      element.parentNode = this;
    }
  };
}

const queuedInverseCreatedElements = [];
const queuedInverseQuoteDataEl = createQuoteDataElement();
const queuedInverseEl = applyQuoteInverseQueuedDomState({
  quoteDataEl: queuedInverseQuoteDataEl
}, {
  id: 'inverse-quote-1',
  documentImpl: createDocumentImpl(queuedInverseCreatedElements)
});
assert.strictEqual(queuedInverseEl.id, 'inverse-quote-1');
assert.strictEqual(queuedInverseEl.className, 'inverse-quote-text');
assert.strictEqual(queuedInverseEl.textContent, '反向报价排队中...');
assert.strictEqual(queuedInverseQuoteDataEl.children[0], queuedInverseEl);
assert.strictEqual(queuedInverseCreatedElements.length, 1);
assert.strictEqual(applyQuoteInverseQueuedDomState({ inverseEl: queuedInverseEl }), queuedInverseEl);

const inverseResultCreatedElements = [];
const inverseResultQuoteDataEl = createQuoteDataElement();
const inverseResultEl = applyQuoteInverseResultDomState({
  quoteDataEl: inverseResultQuoteDataEl
}, {
  id: 'inverse-quote-2',
  documentImpl: createDocumentImpl(inverseResultCreatedElements),
  text: '1 ETH ≈ 3000 USDC'
});
assert.strictEqual(inverseResultEl.textContent, '1 ETH ≈ 3000 USDC');
assert.strictEqual(inverseResultEl.title, '');
assert.strictEqual(inverseResultQuoteDataEl.children[0], inverseResultEl);

const inverseErrorEl = applyQuoteInverseErrorDomState({
  quoteDataEl: createQuoteDataElement()
}, {
  id: 'inverse-quote-3',
  documentImpl: createDocumentImpl([]),
  title: 'RPC timeout'
});
assert.strictEqual(inverseErrorEl.textContent, '反向报价失败');
assert.strictEqual(inverseErrorEl.title, 'RPC timeout');

const removableInverseEl = {
  removed: false,
  remove() {
    this.removed = true;
  }
};
assert.strictEqual(removeQuoteInverseElement(removableInverseEl), true);
assert.strictEqual(removableInverseEl.removed, true);
assert.strictEqual(removeQuoteInverseElement(null), false);

const mainResultRefs = {
  quoteTextEl: { textContent: 'old quote' },
  quoteTextWrapperEl: { classList: createClassList(['loading-text']) }
};
assert.strictEqual(applyQuoteMainResultDomState(mainResultRefs, { text: '1 ETH ≈ 3000 USDC' }), true);
assert.strictEqual(mainResultRefs.quoteTextEl.textContent, '1 ETH ≈ 3000 USDC');
assert.strictEqual(mainResultRefs.quoteTextWrapperEl.classList.contains('loading-text'), false);
assert.strictEqual(applyQuoteMainResultDomState({}, { text: 'x' }), false);

const mainErrorRefs = {
  quoteTextEl: { textContent: 'old quote' },
  quoteTextWrapperEl: { classList: createClassList(['loading-text']) },
  quoteDataEl: {
    classList: createClassList([]),
    title: ''
  }
};
assert.strictEqual(applyQuoteMainErrorDomState(mainErrorRefs, {
  message: '网络失败',
  title: 'RPC timeout'
}), true);
assert.strictEqual(mainErrorRefs.quoteTextEl.textContent, '❌ 网络失败');
assert.strictEqual(mainErrorRefs.quoteTextWrapperEl.classList.contains('loading-text'), false);
assert.strictEqual(mainErrorRefs.quoteDataEl.classList.contains('error'), true);
assert.strictEqual(mainErrorRefs.quoteDataEl.title, 'RPC timeout');
assert.strictEqual(applyQuoteMainErrorDomState({}, { message: 'x' }), false);

const htmlElement = { tagName: 'ARTICLE' };
const documentImpl = {
  createElement(tagName) {
    assert.strictEqual(tagName, 'div');
    return {
      firstElementChild: null,
      set innerHTML(value) {
        this.firstElementChild = String(value || '').trim() ? htmlElement : null;
      }
    };
  }
};

assert.strictEqual(
  createElementFromHtml('<article>Log</article>', { documentImpl }),
  htmlElement
);
assert.strictEqual(createElementFromHtml('', { documentImpl }), null);
assert.strictEqual(createElementFromHtml('<div>Missing document</div>', { documentImpl: {} }), null);

assert.strictEqual(escapeCssAttributeValue('a"b\\c'), 'a\\"b\\\\c');
assert.strictEqual(
  escapeCssAttributeValue('a b', { cssImpl: { escape: (value) => `escaped:${value}` } }),
  'escaped:a b'
);

class FakeElement {
  constructor(match = null) {
    this.match = match;
    this.parentElement = null;
  }

  closest(selector) {
    return this.match === selector ? this : null;
  }
}

const targetEl = new FakeElement('button');
const parentEl = new FakeElement('.parent');
const textNode = { parentElement: parentEl };

assert.strictEqual(resolveEventTargetElement({ target: targetEl }, { elementImpl: FakeElement }), targetEl);
assert.strictEqual(resolveEventTargetElement({ target: textNode }, { elementImpl: FakeElement }), parentEl);
assert.strictEqual(resolveEventTargetElement({ target: {} }, { elementImpl: FakeElement }), null);
assert.strictEqual(resolveEventTargetElement({ target: targetEl }, { elementImpl: null }), null);
assert.strictEqual(closestEventTarget({ target: targetEl }, 'button', { elementImpl: FakeElement }), targetEl);
assert.strictEqual(closestEventTarget({ target: parentEl }, 'button', { elementImpl: FakeElement }), null);

function createListenerTarget() {
  const listeners = {};
  return {
    listeners,
    addEventListener(name, handler) {
      listeners[name] = handler;
    }
  };
}

const panel = createListenerTarget();
panel.style = {};
const header = createListenerTarget();
const focusCalls = [];
assert.strictEqual(bindFloatingPanelFocus(panel, header, {
  bringToFront(targetPanel) {
    focusCalls.push(targetPanel);
  }
}), true);
header.listeners.mousedown();
header.listeners.click();
panel.listeners.mousedown();
assert.deepStrictEqual(focusCalls, [panel, panel, panel]);
assert.strictEqual(bindFloatingPanelFocus(null, null), false);

const displayPanel = { style: { display: 'none' } };
const openDisplayResult = applyFloatingPanelDisplayState(displayPanel, 'open');
assert.deepStrictEqual(openDisplayResult, {
  panelFound: true,
  visible: true,
  shouldBringToFront: true,
  shouldRender: true
});
assert.strictEqual(displayPanel.style.display, 'flex');

const hideDisplayResult = applyFloatingPanelDisplayState(displayPanel, 'toggle', {
  getComputedStyle: () => ({ display: 'flex' })
});
assert.deepStrictEqual(hideDisplayResult, {
  panelFound: true,
  visible: false,
  shouldBringToFront: false,
  shouldRender: false
});
assert.strictEqual(displayPanel.style.display, 'none');

const showDisplayResult = applyFloatingPanelDisplayState(displayPanel, 'toggle', {
  getComputedStyle: () => ({ display: 'none' })
});
assert.deepStrictEqual(showDisplayResult, {
  panelFound: true,
  visible: true,
  shouldBringToFront: true,
  shouldRender: true
});
assert.strictEqual(displayPanel.style.display, 'flex');

assert.deepStrictEqual(applyFloatingPanelDisplayState(null, 'toggle'), {
  panelFound: false,
  visible: false,
  shouldBringToFront: false,
  shouldRender: false
});

const viewportHeightPanel = { style: {} };
assert.strictEqual(applyFloatingPanelViewportHeight(viewportHeightPanel, 680), true);
assert.strictEqual(viewportHeightPanel.style.height, '680px');
assert.strictEqual(applyFloatingPanelViewportHeight(viewportHeightPanel, 120, { minHeight: 240 }), true);
assert.strictEqual(viewportHeightPanel.style.height, '240px');
assert.strictEqual(applyFloatingPanelViewportHeight(null, 680), false);

const zIndexRuntime = createFloatingPanelZIndexRuntime({ baseZIndex: 2100 });
const zIndexPanel = { style: {} };
assert.strictEqual(zIndexRuntime.resetPanel(zIndexPanel), true);
assert.strictEqual(zIndexPanel.style.zIndex, '2100');
assert.strictEqual(zIndexRuntime.bringToFront(zIndexPanel), 2101);
assert.strictEqual(zIndexPanel.style.zIndex, '2101');
assert.strictEqual(zIndexRuntime.bringToFront(zIndexPanel), 2102);
assert.strictEqual(zIndexPanel.style.zIndex, '2102');
assert.strictEqual(zIndexRuntime.resetPanel(null), false);
assert.strictEqual(zIndexRuntime.bringToFront(null), null);

const chromePanel = createListenerTarget();
chromePanel.style = {};
const chromeHeader = createListenerTarget();
const chromeDocumentImpl = {};
const chromeFocusCalls = [];
const chromeRuntime = {
  resetPanel(targetPanel) {
    targetPanel.style.zIndex = '2100';
    return true;
  },
  bringToFront(targetPanel) {
    chromeFocusCalls.push(targetPanel);
    targetPanel.style.zIndex = '2101';
    return 2101;
  }
};
assert.deepStrictEqual(bindFloatingPanelChrome(chromePanel, chromeHeader, {
  documentImpl: chromeDocumentImpl,
  zIndexRuntime: chromeRuntime
}), {
  resetApplied: true,
  focusBound: true,
  dragBound: true
});
assert.strictEqual(chromePanel.style.zIndex, '2100');
chromeHeader.listeners.click();
assert.deepStrictEqual(chromeFocusCalls, [chromePanel]);
assert.strictEqual(chromePanel.style.zIndex, '2101');
assert.strictEqual(typeof chromeHeader.onmousedown, 'function');

const staticChromePanel = createListenerTarget();
staticChromePanel.style = {};
const staticChromeHeader = createListenerTarget();
assert.deepStrictEqual(bindFloatingPanelChrome(staticChromePanel, staticChromeHeader, {
  zIndexRuntime,
  draggable: false
}), {
  resetApplied: true,
  focusBound: true,
  dragBound: false
});
assert.strictEqual(staticChromeHeader.onmousedown, undefined);

const dragElement = {
  offsetTop: 50,
  offsetLeft: 40,
  style: {}
};
const dragHandle = {};
const dragDocumentImpl = {};
const dragStarts = [];
const prevented = [];
assert.strictEqual(bindDraggableElement(dragElement, dragHandle, {
  documentImpl: dragDocumentImpl,
  onDragStart(targetElement) {
    dragStarts.push(targetElement);
  }
}), true);
assert.strictEqual(typeof dragHandle.onmousedown, 'function');
dragHandle.onmousedown({
  clientX: 100,
  clientY: 200,
  preventDefault() {
    prevented.push('down');
  }
});
assert.deepStrictEqual(dragStarts, [dragElement]);
assert.strictEqual(typeof dragDocumentImpl.onmousemove, 'function');
assert.strictEqual(typeof dragDocumentImpl.onmouseup, 'function');
dragDocumentImpl.onmousemove({
  clientX: 90,
  clientY: 180,
  preventDefault() {
    prevented.push('move');
  }
});
assert.strictEqual(dragElement.style.top, '30px');
assert.strictEqual(dragElement.style.left, '30px');
dragDocumentImpl.onmouseup();
assert.strictEqual(dragDocumentImpl.onmousemove, null);
assert.strictEqual(dragDocumentImpl.onmouseup, null);
assert.deepStrictEqual(prevented, ['down', 'move']);
assert.strictEqual(bindDraggableElement(null, dragHandle, { documentImpl: dragDocumentImpl }), false);
