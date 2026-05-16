const assert = require('assert');

const {
  createCopyToastRuntime,
  copyTextToClipboard
} = require('../copy-utils');

async function run() {
  let timerId = 0;
  const timers = [];
  const clearedTimers = [];
  const classNames = new Set();
  const toastRuntime = createCopyToastRuntime({
    durationMs: 1200,
    setTimeout(callback, delayMs) {
      const timer = { id: ++timerId, callback, delayMs };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) {
      clearedTimers.push(timer.id);
    }
  });
  const toastEl = {
    textContent: '',
    classList: {
      add(className) {
        classNames.add(className);
      },
      remove(className) {
        classNames.delete(className);
      }
    }
  };
  assert.strictEqual(toastRuntime.show(toastEl, 'copied'), true);
  assert.strictEqual(toastEl.textContent, 'copied');
  assert.strictEqual(classNames.has('visible'), true);
  assert.strictEqual(timers[0].delayMs, 1200);
  toastRuntime.show(toastEl, 'copied again', 600);
  assert.deepStrictEqual(clearedTimers, [1]);
  assert.strictEqual(timers[1].delayMs, 600);
  timers[1].callback();
  assert.strictEqual(classNames.has('visible'), false);
  assert.strictEqual(toastRuntime.getTimer(), null);

  let clipboardText = null;
  await copyTextToClipboard('hello', {
    navigator: {
      clipboard: {
        async writeText(value) {
          clipboardText = value;
        }
      }
    },
    isSecureContext: true
  });
  assert.strictEqual(clipboardText, 'hello');

  const textareaNodes = [];
  const fakeBody = {
    appended: [],
    appendChild(node) {
      this.appended.push(node);
    }
  };
  const fakeDocument = {
    body: fakeBody,
    createElement(tag) {
      const node = {
        tag,
        value: '',
        style: {},
        setAttribute() {},
        focusCalled: false,
        focus() {
          this.focusCalled = true;
        },
        selectCalled: false,
        select() {
          this.selectCalled = true;
        },
        selectionRange: null,
        setSelectionRange(start, end) {
          this.selectionRange = [start, end];
        },
        removeCalled: false,
        remove() {
          this.removeCalled = true;
        }
      };
      textareaNodes.push(node);
      return node;
    },
    execCommand(command) {
      assert.strictEqual(command, 'copy');
      return true;
    }
  };

  await copyTextToClipboard('fallback-copy', {
    navigator: {},
    isSecureContext: false,
    document: fakeDocument
  });
  assert.strictEqual(textareaNodes.length, 1);
  assert.strictEqual(textareaNodes[0].value, 'fallback-copy');
  assert.strictEqual(textareaNodes[0].focusCalled, true);
  assert.strictEqual(textareaNodes[0].selectCalled, true);
  assert.deepStrictEqual(textareaNodes[0].selectionRange, [0, 'fallback-copy'.length]);
  assert.strictEqual(textareaNodes[0].removeCalled, true);

  await assert.rejects(
    copyTextToClipboard('should-fail', {
      navigator: {},
      isSecureContext: false,
      document: {
        body: {
          appendChild() {}
        },
        createElement() {
          return {
            value: '',
            style: {},
            setAttribute() {},
            select() {},
            remove() {}
          };
        },
        execCommand() {
          return false;
        }
      }
    }),
    /Clipboard fallback failed/
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
