const assert = require('assert');

const {
  assertUniqueRenderKeys,
  createInteractionRuntime,
  createInteractionSafeHtmlRenderer,
  createInteractionSafeViewRuntime,
  getRenderNodeKey,
  morphElementChildren
} = require('../src/ui/interaction-safe-renderer');

function createEventTarget(name) {
  return {
    name,
    innerHTML: '',
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    removeEventListener(type, handler) {
      if (this.listeners[type] === handler) delete this.listeners[type];
    },
    contains(target) {
      return target === this || Boolean(target && target.inside === name);
    }
  };
}

let nextTimerId = 1;
const timers = new Map();
const setTimeoutImpl = (callback, delayMs) => {
  const id = nextTimerId;
  nextTimerId += 1;
  timers.set(id, { callback, delayMs });
  return id;
};
const clearTimeoutImpl = (id) => timers.delete(id);

const target = createEventTarget('content');
const releaseTarget = createEventTarget('document');
const commits = [];
const renderer = createInteractionSafeHtmlRenderer({
  getTarget: () => target,
  releaseTarget,
  releaseEventListenerOptions: { capture: true },
  setTimeout: setTimeoutImpl,
  clearTimeout: clearTimeoutImpl,
  commit(element, html) {
    element.innerHTML = html;
    commits.push(html);
  }
});

assert.strictEqual(renderer.update('<p>first</p>'), true);
assert.strictEqual(renderer.update('<p>first</p>'), false);
target.listeners.pointerdown({});
assert.strictEqual(renderer.update('<p>second</p>'), false);
assert.strictEqual(renderer.update('<p>latest</p>'), false);
assert.strictEqual(renderer.hasPending(), true);
releaseTarget.listeners.pointerup({});
assert.strictEqual(renderer.update('<p>after-pointerup</p>'), false);
const idleTimer = Array.from(timers.values()).at(-1);
assert.strictEqual(idleTimer.delayMs, 80);
idleTimer.callback();
assert.deepStrictEqual(commits, ['<p>first</p>', '<p>after-pointerup</p>']);
assert.deepStrictEqual(renderer.getMetrics(), {
  commits: 2,
  deferred: 3,
  requested: 5,
  skippedEqual: 1
});

let currentTarget = createEventTarget('first-target');
const dynamicCommits = [];
const dynamicRenderer = createInteractionSafeHtmlRenderer({
  getTarget: () => currentTarget,
  commit(element, html) {
    dynamicCommits.push([element.name, html]);
  }
});
dynamicRenderer.update('<p>same</p>');
currentTarget = createEventTarget('second-target');
dynamicRenderer.update('<p>same</p>');
assert.deepStrictEqual(dynamicCommits, [
  ['first-target', '<p>same</p>'],
  ['second-target', '<p>same</p>']
]);
assert.strictEqual(typeof currentTarget.listeners.pointerdown, 'function');

const sharedRuntime = createInteractionRuntime({
  setTimeout: setTimeoutImpl,
  clearTimeout: clearTimeoutImpl,
  trackFocus: false
});
const sharedTarget = createEventTarget('shared');
sharedRuntime.bind(sharedTarget);
const sharedCommits = [];
const sharedRenderTarget = createEventTarget('shared-render-target');
const sharedRenderer = createInteractionSafeHtmlRenderer({
  getTarget: () => sharedRenderTarget,
  interactionRuntime: sharedRuntime,
  commit(_element, html) {
    sharedCommits.push(html);
  }
});
sharedRenderer.update('initial');
sharedRuntime.hold();
sharedRenderer.update('pending');
assert.deepStrictEqual(sharedCommits, ['initial']);
sharedRuntime.release();
Array.from(timers.values()).at(-1).callback();
assert.deepStrictEqual(sharedCommits, ['initial', 'pending']);

let activeMode = 'arb';
let viewRenderCount = 0;
const viewTarget = createEventTarget('dashboard');
const viewRuntime = createInteractionSafeViewRuntime({
  activeMode: 'dashboard',
  getMode: () => activeMode,
  getTarget: () => viewTarget,
  render: () => { viewRenderCount += 1; },
  setTimeout: setTimeoutImpl,
  clearTimeout: clearTimeoutImpl,
  trackFocus: 'editable'
});
assert.strictEqual(viewRuntime.renderNow(), false);
assert.strictEqual(viewRuntime.isDirty(), true);
activeMode = 'dashboard';
assert.strictEqual(viewRuntime.ensureRendered(), true);
assert.strictEqual(viewRenderCount, 1);
viewTarget.listeners.focusin({ target: { tagName: 'INPUT', type: 'number' } });
viewRuntime.markDirty();
assert.strictEqual(viewRuntime.ensureRendered(), false);
assert.strictEqual(viewRuntime.hasDeferredRender(), true);
viewTarget.listeners.focusout({ relatedTarget: null });
Array.from(timers.values()).at(-1).callback();
assert.strictEqual(viewRenderCount, 2);
assert.strictEqual(viewRuntime.isDirty(), false);

assert.strictEqual(getRenderNodeKey({
  nodeType: 1,
  id: 'fallback-id',
  getAttribute: (name) => name === 'data-render-key' ? 'quote:1' : null
}), 'render:quote:1');
assert.throws(() => assertUniqueRenderKeys({
  querySelectorAll: () => [
    { getAttribute: () => 'duplicate' },
    { getAttribute: () => 'duplicate' }
  ]
}), /data-render-key 重复/);
assert.throws(() => morphElementChildren({
  cloneNode: () => ({ innerHTML: '', querySelectorAll: () => [] })
}, '<p>next</p>', { morphdom: true }), /morphdom 未加载/);
let morphCallCount = 0;
assert.strictEqual(morphElementChildren(
  { innerHTML: '<p>same</p>' },
  { nodeType: 1, innerHTML: '<p>same</p>', querySelectorAll: () => [] },
  { morphdom: () => { morphCallCount += 1; } }
), false);
assert.strictEqual(morphCallCount, 0);

const removableTarget = createEventTarget('removable');
const removableRuntime = createInteractionRuntime({ trackFocus: false });
removableRuntime.bind(removableTarget);
assert.strictEqual(removableRuntime.unbind(removableTarget), true);
assert.deepStrictEqual(removableTarget.listeners, {});
