const assert = require('assert');

const {
  applyTooltipState,
  applyTrendArrowState,
  applyQuoteAlertHighlightUi,
  bindDraggableElement,
  bindFloatingPanelFocus,
  closestEventTarget,
  createElementFromHtml,
  createStableHtmlRenderer,
  escapeCssAttributeValue,
  hideTooltip,
  clearQuoteHighlightUi,
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
bindFloatingPanelFocus(panel, header, {
  bringToFront(targetPanel) {
    focusCalls.push(targetPanel);
  }
});
header.listeners.mousedown();
header.listeners.click();
panel.listeners.mousedown();
assert.deepStrictEqual(focusCalls, [panel, panel, panel]);

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
