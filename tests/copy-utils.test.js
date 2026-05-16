const assert = require('assert');

const {
  bindCopyPriceHandler,
  createCopyToastRuntime,
  copyDexLinkFromElement,
  copyPriceFromText,
  copyTextToClipboard
} = require('../src/ui/copy-utils');

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

  const copiedPrices = [];
  const copyToasts = [];
  assert.strictEqual(
    copyPriceFromText('1 ETH ≈ 3000 USDC', {
      extractPrice: () => 3000,
      copyText: (value) => copiedPrices.push(value),
      showToast: (message) => copyToasts.push(message)
    }),
    true
  );
  assert.deepStrictEqual(copiedPrices, ['3000']);
  assert.deepStrictEqual(copyToasts, ['已复制: 3000']);
  assert.strictEqual(
    copyPriceFromText('no price', {
      extractPrice: () => null,
      copyText: (value) => copiedPrices.push(value),
      showToast: (message) => copyToasts.push(message)
    }),
    false
  );
  assert.deepStrictEqual(copiedPrices, ['3000']);

  const clickHandlers = {};
  const copyTargetEl = {
    dataset: {},
    textContent: '1 BTC ≈ 100000 USDC',
    addEventListener(type, handler) {
      clickHandlers[type] = handler;
    }
  };
  assert.strictEqual(
    bindCopyPriceHandler(copyTargetEl, {
      extractPrice: () => 100000,
      copyText: (value) => copiedPrices.push(value),
      showToast: (message) => copyToasts.push(message)
    }),
    true
  );
  assert.strictEqual(copyTargetEl.dataset.copyBound, '1');
  assert.strictEqual(typeof clickHandlers.click, 'function');
  let propagationStopped = false;
  clickHandlers.click({
    stopPropagation() {
      propagationStopped = true;
    }
  });
  assert.strictEqual(propagationStopped, true);
  assert.strictEqual(copiedPrices[copiedPrices.length - 1], '100000');
  assert.strictEqual(bindCopyPriceHandler(copyTargetEl, {}), false);
  assert.strictEqual(bindCopyPriceHandler(null, {}), false);

  const copiedDexLinks = [];
  const dexLinkToasts = [];
  assert.strictEqual(
    await copyDexLinkFromElement({
      dataset: {
        dexLinkChain: 'arbitrum',
        dexLinkFromTokenAddress: '0xaaa',
        dexLinkToTokenAddress: '0xbbb',
        dexLinkInputAmount: '1.25',
        dexLinkLabel: 'swap.defillama'
      }
    }, {
      buildDexLink(config) {
        assert.deepStrictEqual(config, {
          chain: 'arbitrum',
          fromTokenAddress: '0xaaa',
          toTokenAddress: '0xbbb',
          inputAmount: '1.25'
        });
        return { label: 'fallback label', url: 'https://dex.example/swap' };
      },
      copyText: async (value) => copiedDexLinks.push(value),
      showToast: (message) => dexLinkToasts.push(message)
    }),
    true
  );
  assert.deepStrictEqual(copiedDexLinks, ['https://dex.example/swap']);
  assert.deepStrictEqual(dexLinkToasts, ['已复制 swap.defillama 链接']);

  assert.strictEqual(
    await copyDexLinkFromElement({ dataset: {} }, {
      buildDexLink: () => null,
      copyText: async () => copiedDexLinks.push('should-not-copy'),
      showToast: (message) => dexLinkToasts.push(message)
    }),
    false
  );
  assert.strictEqual(dexLinkToasts[dexLinkToasts.length - 1], '该交易对不支持 DEX 链接');

  assert.strictEqual(
    await copyDexLinkFromElement({ dataset: {} }, {
      buildDexLink: () => ({ label: 'DEX', url: 'https://dex.example/fail' }),
      copyText: async () => {
        throw new Error('clipboard denied');
      },
      showToast: (message) => dexLinkToasts.push(message)
    }),
    false
  );
  assert.strictEqual(dexLinkToasts[dexLinkToasts.length - 1], '复制失败');
  assert.strictEqual(await copyDexLinkFromElement(null, {}), false);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
