const assert = require('assert');
const { parseHTML } = require('linkedom');

const { document, window } = parseHTML(`
  <div id="root">
    <input data-render-key="field" value="old">
    <button data-render-key="copy">复制</button>
    <span data-render-key="status">v1</span>
  </div>
`);
global.document = document;
global.HTMLElement = window.HTMLElement;

const {
  createInteractionSafeHtmlRenderer,
  morphElementChildren
} = require('../src/ui/interaction-safe-renderer');

const root = document.getElementById('root');
const input = root.querySelector('input');
const copyButton = root.querySelector('button');
let copyCount = 0;
copyButton.addEventListener('click', () => { copyCount += 1; });

assert.strictEqual(morphElementChildren(root, `
  <input data-render-key="field" value="old">
  <button data-render-key="copy">复制</button>
  <span data-render-key="status">v2</span>
`), true);
assert.strictEqual(root.querySelector('input'), input);
assert.strictEqual(root.querySelector('button'), copyButton);
assert.strictEqual(root.querySelector('[data-render-key="status"]').textContent, 'v2');
copyButton.click();
assert.strictEqual(copyCount, 1);

let nextTimerId = 1;
const timers = new Map();
const renderer = createInteractionSafeHtmlRenderer({
  target: root,
  releaseTarget: document,
  releaseEventListenerOptions: { capture: true },
  trackFocus: 'editable',
  windowImpl: window,
  setTimeout(callback, delayMs) {
    const id = nextTimerId;
    nextTimerId += 1;
    timers.set(id, { callback, delayMs });
    return id;
  },
  clearTimeout(id) {
    timers.delete(id);
  }
});

renderer.update(root.innerHTML);
input.value = 'typing';
input.dispatchEvent(new window.Event('focusin', { bubbles: true }));
renderer.update(`
  <input data-render-key="field" value="server">
  <button data-render-key="copy">复制</button>
  <span data-render-key="status">focused-pending</span>
`);
assert.strictEqual(root.querySelector('[data-render-key="status"]').textContent, 'v2');
assert.strictEqual(input.value, 'typing');

input.dispatchEvent(new window.Event('focusout', { bubbles: true }));
const focusIdleTimer = Array.from(timers.values()).at(-1);
assert.strictEqual(focusIdleTimer.delayMs, 80);
focusIdleTimer.callback();
assert.strictEqual(root.querySelector('input'), input);
assert.strictEqual(root.querySelector('[data-render-key="status"]').textContent, 'focused-pending');

copyButton.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
renderer.update(`
  <input data-render-key="field" value="server">
  <button data-render-key="copy">复制</button>
  <span data-render-key="status">pointer-pending</span>
`);
document.dispatchEvent(new window.Event('pointerup', { bubbles: true }));
copyButton.click();
assert.strictEqual(copyCount, 2);
assert.strictEqual(root.querySelector('[data-render-key="status"]').textContent, 'focused-pending');
const pointerIdleTimer = Array.from(timers.values()).at(-1);
assert.strictEqual(pointerIdleTimer.delayMs, 80);
pointerIdleTimer.callback();
assert.strictEqual(root.querySelector('button'), copyButton);
assert.strictEqual(root.querySelector('[data-render-key="status"]').textContent, 'pointer-pending');

assert.throws(() => morphElementChildren(root, `
  <span data-render-key="duplicate">a</span>
  <span data-render-key="duplicate">b</span>
`), /data-render-key 重复/);
