const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  isTypingShortcutTarget,
  resolveGlobalShortcutAction
} = require('../src/ui/keyboard-shortcut-utils');

function createTarget(match = null, overrides = {}) {
  return {
    isContentEditable: false,
    closest: (selector) => (selector === 'input, textarea, select, [contenteditable="true"]' ? match : null),
    ...overrides
  };
}

function createEvent(key, overrides = {}) {
  return {
    key,
    target: createTarget(),
    defaultPrevented: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    ...overrides
  };
}

assert.strictEqual(isTypingShortcutTarget(null), false);
assert.strictEqual(isTypingShortcutTarget({}), false);
assert.strictEqual(isTypingShortcutTarget(createTarget()), false);
assert.strictEqual(isTypingShortcutTarget(createTarget({ tagName: 'INPUT' })), true);
assert.strictEqual(isTypingShortcutTarget(createTarget(null, { isContentEditable: true })), true);

assert.strictEqual(resolveGlobalShortcutAction(null), null);
assert.strictEqual(resolveGlobalShortcutAction(createEvent('t', { defaultPrevented: true })), null);
assert.strictEqual(resolveGlobalShortcutAction(createEvent('t', { metaKey: true })), null);
assert.strictEqual(resolveGlobalShortcutAction(createEvent('t', { ctrlKey: true })), null);
assert.strictEqual(resolveGlobalShortcutAction(createEvent('t', { altKey: true })), null);
assert.strictEqual(resolveGlobalShortcutAction(createEvent('t', { target: createTarget({ tagName: 'INPUT' }) })), null);
assert.strictEqual(resolveGlobalShortcutAction(createEvent('')), null);
assert.strictEqual(resolveGlobalShortcutAction(createEvent('x')), null);

assert.strictEqual(resolveGlobalShortcutAction(createEvent('Escape')), null);
assert.strictEqual(resolveGlobalShortcutAction(createEvent('Escape'), { arbDetailVisible: true }), 'close-arb-detail');
assert.strictEqual(resolveGlobalShortcutAction(createEvent('T')), 'toggle-arb-panel');
assert.strictEqual(resolveGlobalShortcutAction(createEvent('s')), 'toggle-data-terminal');
assert.strictEqual(resolveGlobalShortcutAction(createEvent('p')), 'toggle-quote-display');
assert.strictEqual(resolveGlobalShortcutAction(createEvent('a')), 'toggle-path-alert');
assert.strictEqual(resolveGlobalShortcutAction(createEvent('l')), 'toggle-alert-log');
assert.strictEqual(resolveGlobalShortcutAction(createEvent('c')), 'toggle-request-channel-tags');

const browserCode = fs.readFileSync(path.join(__dirname, '..', 'src/ui/keyboard-shortcut-utils.js'), 'utf8');
const browserSandbox = { window: {} };
vm.createContext(browserSandbox);
assert.doesNotThrow(() => vm.runInContext(browserCode, browserSandbox));
assert.ok(browserSandbox.window.KeyboardShortcutUtils, 'expected KeyboardShortcutUtils to attach to window');
