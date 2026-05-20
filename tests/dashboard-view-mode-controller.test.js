const assert = require('assert');

const {
  APP_VIEW_ARB,
  APP_VIEW_DASHBOARD,
  createDashboardViewModeController,
  normalizeViewMode,
  setButtonActive
} = require('../src/app/dashboard-view-mode-controller');

function createClassList() {
  const classes = new Set();
  return {
    add(...classNames) {
      classNames.forEach((className) => classes.add(className));
    },
    remove(...classNames) {
      classNames.forEach((className) => classes.delete(className));
    },
    toggle(className, force) {
      const active = force === undefined ? !classes.has(className) : Boolean(force);
      if (active) classes.add(className);
      else classes.delete(className);
      return active;
    },
    contains(className) {
      return classes.has(className);
    }
  };
}

function createElement() {
  const listeners = {};
  const attributes = {};
  return {
    attributes,
    classList: createClassList(),
    listeners,
    style: { display: 'none' },
    addEventListener(type, handler) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
    },
    dispatch(type) {
      for (const handler of listeners[type] || []) {
        handler();
      }
    },
    setAttribute(name, value) {
      attributes[name] = value;
    }
  };
}

assert.strictEqual(normalizeViewMode('dashboard'), APP_VIEW_DASHBOARD);
assert.strictEqual(normalizeViewMode('unknown'), APP_VIEW_ARB);

const standaloneButton = createElement();
assert.strictEqual(setButtonActive(standaloneButton, true), true);
assert.strictEqual(standaloneButton.classList.contains('active'), true);
assert.strictEqual(standaloneButton.attributes['aria-selected'], 'true');

const bodyEl = createElement();
const dashboardEl = createElement();
const addCategoryBtn = createElement();
const arbPathWindow = createElement();
const viewArbBtn = createElement();
const viewDashboardBtn = createElement();
const calls = [];
const controller = createDashboardViewModeController({
  bodyEl,
  initialMode: 'dashboard',
  refs: {
    dashboardEl,
    addCategoryBtn,
    arbPathWindow,
    viewArbBtn,
    viewDashboardBtn
  },
  setArbPanelMaxHeight: () => calls.push(['setArbPanelMaxHeight']),
  updateArbPanel: (options) => calls.push(['updateArbPanel', options && options.force])
});

assert.strictEqual(controller.bind(), true);
assert.strictEqual(controller.bind(), false);
assert.strictEqual(controller.getMode(), APP_VIEW_DASHBOARD);
assert.strictEqual(bodyEl.classList.contains('app-view-dashboard'), true);
assert.strictEqual(bodyEl.classList.contains('app-view-arb'), false);
assert.strictEqual(viewDashboardBtn.classList.contains('active'), true);
assert.strictEqual(viewArbBtn.classList.contains('active'), false);
assert.strictEqual(calls.length, 0);
assert.strictEqual(dashboardEl.style.display, '');
assert.strictEqual(addCategoryBtn.style.display, '');
assert.strictEqual(arbPathWindow.style.display, '');

viewArbBtn.dispatch('click');
assert.strictEqual(controller.getMode(), APP_VIEW_ARB);
assert.strictEqual(bodyEl.classList.contains('app-view-arb'), true);
assert.strictEqual(bodyEl.classList.contains('app-view-dashboard'), false);
assert.strictEqual(viewArbBtn.classList.contains('active'), true);
assert.deepStrictEqual(calls, [
  ['updateArbPanel', true],
  ['setArbPanelMaxHeight']
]);

viewDashboardBtn.dispatch('click');
assert.strictEqual(controller.getMode(), APP_VIEW_DASHBOARD);
assert.strictEqual(bodyEl.classList.contains('app-view-dashboard'), true);
assert.deepStrictEqual(calls, [
  ['updateArbPanel', true],
  ['setArbPanelMaxHeight']
]);

controller.toggleArbView();
assert.strictEqual(controller.getMode(), APP_VIEW_ARB);
assert.deepStrictEqual(calls, [
  ['updateArbPanel', true],
  ['setArbPanelMaxHeight'],
  ['updateArbPanel', true],
  ['setArbPanelMaxHeight']
]);
