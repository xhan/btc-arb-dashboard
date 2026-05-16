const assert = require('assert');

const {
  bindDraggableElement,
  bindFloatingPanelFocus,
  closestEventTarget,
  createElementFromHtml,
  createStableHtmlRenderer,
  escapeCssAttributeValue,
  resolveEventTargetElement
} = require('../dom-render-utils');

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
