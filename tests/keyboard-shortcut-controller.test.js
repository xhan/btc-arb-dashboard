const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { createKeyboardShortcutController } = require('../src/ui/keyboard-shortcut-controller');
const keyboardShortcutUtils = require('../src/ui/keyboard-shortcut-utils');

const calls = [];
let keydownHandler = null;
let arbDetailVisible = false;
const controller = createKeyboardShortcutController({
  keyboardShortcutUtils,
  documentImpl: {
    addEventListener(type, handler) {
      calls.push(['bind', type]);
      if (type === 'keydown') keydownHandler = handler;
    }
  },
  isArbDetailVisible: () => arbDetailVisible,
  actions: {
    'toggle-arb-panel': () => calls.push(['toggle-arb-panel']),
    'close-arb-detail': () => calls.push(['close-arb-detail'])
  }
});

assert.strictEqual(controller.bind(), true);
assert.deepStrictEqual(calls, [['bind', 'keydown']]);
assert.strictEqual(typeof keydownHandler, 'function');

const shortcutEvent = {
  key: 't',
  target: { closest: () => null },
  defaultPrevented: false,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  preventDefault() {
    calls.push(['preventDefault']);
  }
};
assert.strictEqual(keydownHandler(shortcutEvent), true);
assert.deepStrictEqual(calls.slice(1), [
  ['toggle-arb-panel'],
  ['preventDefault']
]);

assert.strictEqual(controller.handleKeydown({
  key: 'x',
  target: { closest: () => null },
  defaultPrevented: false
}), false);

arbDetailVisible = true;
assert.strictEqual(controller.handleKeydown({
  key: 'Escape',
  target: { closest: () => null },
  defaultPrevented: false,
  preventDefault() {
    calls.push(['preventEscapeDefault']);
  }
}), true);
assert.deepStrictEqual(calls.slice(-2), [
  ['close-arb-detail'],
  ['preventEscapeDefault']
]);

const missingActionController = createKeyboardShortcutController({
  keyboardShortcutUtils,
  actions: {}
});
assert.strictEqual(missingActionController.handleKeydown({
  key: 't',
  target: { closest: () => null },
  defaultPrevented: false,
  preventDefault() {
    throw new Error('should not prevent default without handler');
  }
}), false);
assert.strictEqual(createKeyboardShortcutController({ documentImpl: null }).bind(), false);

const browserCode = fs.readFileSync(path.join(__dirname, '..', 'src/ui/keyboard-shortcut-controller.js'), 'utf8');
const browserSandbox = { window: { KeyboardShortcutUtils: keyboardShortcutUtils } };
vm.createContext(browserSandbox);
assert.doesNotThrow(() => vm.runInContext(browserCode, browserSandbox));
assert.ok(browserSandbox.window.KeyboardShortcutController, 'expected KeyboardShortcutController to attach to window');
