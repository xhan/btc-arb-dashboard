const assert = require('assert');

const { copyTextToClipboard } = require('../copy-utils');

async function run() {
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
