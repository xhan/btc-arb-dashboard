const assert = require('assert');

const { createStableHtmlRenderer } = require('../dom-render-utils');

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
