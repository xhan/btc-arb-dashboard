const assert = require('assert');

const { createDashboardFixedPathActionsController } = require('../src/app/dashboard-fixed-path-actions-controller');
const arbPathNotesUtils = require('../src/arb/arb-path-notes-utils');
const pathAlertEditorUtils = require('../src/path-alerts/path-alert-editor-utils');
const pathAlertPageUtils = require('../src/path-alerts/path-alert-page-utils');
const pathAlertRuleDefinitions = require('../src/path-alerts/path-alert-rule-definitions');
const pathAlertUtils = require('../src/path-alerts/path-alert-utils');

function createClassList() {
  const values = new Set();
  return {
    add: (...items) => items.forEach((item) => values.add(item)),
    remove: (...items) => items.forEach((item) => values.delete(item)),
    contains: (item) => values.has(item)
  };
}

function createElement(extra = {}) {
  return {
    classList: createClassList(),
    innerHTML: '',
    textContent: '',
    value: '',
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    ...extra
  };
}

const noteModal = createElement();
const noteTextarea = createElement();
const noteTitle = createElement();
const noteError = createElement();
const alertModal = createElement();
const alertTitle = createElement();
const alertEditor = createElement();
const noteAction = createElement({ dataset: { arbFixedNoteRuleId: 'fixed:wbtc-lbtc' } });
const fetchCalls = [];
const notesSnapshots = [];
let savedAlertConfig = null;
let alertChangedCount = 0;

const initialAlertConfig = pathAlertUtils.normalizeAlertConfig({
  settings: { defaultCooldownSec: 180 },
  alerts: [
    {
      id: 'fixed-alert',
      name: '',
      enabled: true,
      thresholdBp: 1,
      triggerMode: 'delayed',
      confirmDelaySec: 13,
      cooldownSec: 180,
      target: { type: 'rule', ruleKind: 'fixed', ruleId: 'fixed:wbtc-lbtc' }
    }
  ]
});

const controller = createDashboardFixedPathActionsController({
  arbPathNotesUtils,
  backendUrl: 'http://localhost:3000',
  fetchImpl: async (url, options = {}) => {
    fetchCalls.push([url, options]);
    if (!options.method) {
      return { ok: true, json: async () => ({ 'fixed:wbtc-lbtc': '现有备注' }) };
    }
    return { ok: true, json: async () => ({ notes: JSON.parse(options.body) }) };
  },
  documentImpl: {
    addEventListener() {},
    querySelectorAll: () => [noteAction]
  },
  getAlertConfig: () => initialAlertConfig,
  onNotesChanged: (notes) => notesSnapshots.push(notes),
  onAlertChanged: () => { alertChangedCount += 1; },
  pathAlertEditorUtils,
  pathAlertPageUtils,
  pathAlertRuleDefinitions,
  pathAlertUtils,
  refs: {
    noteModal,
    noteTitle,
    noteTextarea,
    noteError,
    alertModal,
    alertTitle,
    alertEditor
  },
  saveAlertConfig: async (config) => {
    savedAlertConfig = config;
  }
});

(async () => {
  await controller.initialize();
  assert.deepStrictEqual(controller.getNotes(), { 'fixed:wbtc-lbtc': '现有备注' });
  assert.strictEqual(noteAction.classList.contains('has-note'), true);
  assert.strictEqual(fetchCalls.filter(([url]) => url.endsWith('/api/arb-path-notes')).length, 1);

  assert.strictEqual(controller.openNote('fixed:wbtc-lbtc'), true);
  assert.strictEqual(noteModal.classList.contains('visible'), true);
  assert.strictEqual(noteTitle.textContent, 'WBTC - LBTC · Note');
  assert.strictEqual(noteTextarea.value, '现有备注');
  noteTextarea.value = ' 更新后的备注 ';
  await controller.saveNote();
  assert.deepStrictEqual(controller.getNotes(), { 'fixed:wbtc-lbtc': '更新后的备注' });
  assert.deepStrictEqual(notesSnapshots.at(-1), { 'fixed:wbtc-lbtc': '更新后的备注' });
  assert.strictEqual(JSON.parse(fetchCalls.at(-1)[1].body)['fixed:wbtc-lbtc'], '更新后的备注');
  assert.strictEqual(noteModal.classList.contains('visible'), false);

  assert.strictEqual(controller.openAlert('fixed:wbtc-lbtc'), true);
  assert.strictEqual(alertModal.classList.contains('visible'), true);
  assert.strictEqual(alertTitle.textContent, 'WBTC - LBTC · 报警设置');
  assert.ok(alertEditor.innerHTML.includes('报警名称（可选）'));
  assert.ok(alertEditor.innerHTML.includes('收益阈值 (bp)'));
  assert.ok(!alertEditor.innerHTML.includes('data-editor-type='));

  controller.handleAlertFieldChange({ target: { id: 'editor-threshold', value: '2.5' } });
  await controller.saveAlert();
  assert.strictEqual(savedAlertConfig.alerts[0].thresholdBp, 2.5);
  assert.strictEqual(alertChangedCount, 1);
  assert.strictEqual(alertModal.classList.contains('visible'), false);

  assert.strictEqual(controller.openAlert('fixed:missing'), false);
  assert.strictEqual(alertModal.classList.contains('visible'), true);
  assert.ok(alertEditor.innerHTML.includes('尚未配置'));

  let resolveNotesLoad;
  const delayedFetchCalls = [];
  const delayedNoteTextarea = createElement();
  const delayedController = createDashboardFixedPathActionsController({
    arbPathNotesUtils,
    fetchImpl: async (url, options = {}) => {
      delayedFetchCalls.push([url, options]);
      if (!options.method) {
        await new Promise((resolve) => { resolveNotesLoad = resolve; });
        return { ok: true, json: async () => ({ 'fixed:gho-usdt': '保留备注' }) };
      }
      const body = JSON.parse(options.body);
      return { ok: true, json: async () => ({ notes: body }) };
    },
    pathAlertEditorUtils,
    pathAlertPageUtils,
    pathAlertRuleDefinitions,
    pathAlertUtils,
    refs: {
      noteModal: createElement(),
      noteTextarea: delayedNoteTextarea,
      noteError: createElement()
    }
  });
  const initializePromise = delayedController.initialize();
  delayedController.openNote('fixed:wbtc-lbtc');
  delayedNoteTextarea.value = '竞态备注';
  const delayedSavePromise = delayedController.saveNote();
  await Promise.resolve();
  assert.strictEqual(delayedFetchCalls.length, 1);
  resolveNotesLoad();
  await initializePromise;
  await delayedSavePromise;
  assert.deepStrictEqual(JSON.parse(delayedFetchCalls[1][1].body), {
    'fixed:gho-usdt': '保留备注',
    'fixed:wbtc-lbtc': '竞态备注'
  });
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
