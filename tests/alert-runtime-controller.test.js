const assert = require('assert');

const domRenderUtils = require('../src/ui/dom-render-utils');
const {
  createAlertRuntimeController
} = require('../src/alerts/alert-runtime-controller');

function createElement(name) {
  return {
    name,
    innerHTML: '',
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    contains(target) {
      return target === this || Boolean(target && target.inside === name);
    }
  };
}

function createPathAlertRuntimeState() {
  let forceImmediate = false;
  const map = new Map();
  return {
    get: (key) => map.get(key),
    getState: () => map,
    isForceImmediateEnabled: () => forceImmediate,
    pruneInactive: () => {},
    reset(options = {}) {
      forceImmediate = options.forceImmediate === true;
      map.clear();
    },
    set: (key, value) => map.set(key, value),
    setForceImmediate(enabled) {
      forceImmediate = enabled === true;
      return forceImmediate;
    }
  };
}

function createMutedPathRuntime(initial = {}) {
  let targets = Array.isArray(initial.targets) ? initial.targets.slice() : [];
  let legs = Array.isArray(initial.legs) ? initial.legs.slice() : [];
  return {
    getLegKeySnapshot: () => legs.map((entry) => entry && entry.key).join('|'),
    getLegs: () => legs,
    getTargets: () => targets,
    hasEntries: () => targets.length > 0 || legs.length > 0,
    pruneLegs: () => legs,
    pruneTargets: () => targets,
    setLegs(next) {
      legs = Array.isArray(next) ? next.slice() : [];
    },
    setTargets(next) {
      targets = Array.isArray(next) ? next.slice() : [];
    },
    syncRefresh: () => {}
  };
}

function createBaseDeps(overrides = {}) {
  const timers = [];
  const schedulerCalls = [];
  const settingsContent = createElement('settings');
  const mutedContent = createElement('muted');
  const config = {
    settings: {
      localSoundEnabled: true,
      webhookEnabled: false
    },
    alerts: []
  };
  const mutedPathRuntime = createMutedPathRuntime({
    targets: [{ key: 'old-muted' }]
  });

  const deps = {
    alertAudioRuntime: {
      isUnlocked: () => true,
      unlockAndReport: async () => true
    },
    alertDebugUtils: {
      createAlertDebugController: () => ({
        enable: () => true,
        record: () => {}
      })
    },
    alertLogCardInsertionRuntime: {
      finalize: () => {},
      prepend: () => null
    },
    alertLogTabRuntime: {
      getState: () => ({ showSettingsTab: true, showMutedStateTab: true }),
      isActive: () => true,
      set: () => {}
    },
    alertLogUiUtils: {
      applyAlertLogTabDomState: () => {},
      buildAlertLogAppendPlan: () => ({ entries: [], shouldAutoOpen: false }),
      buildAlertSettingsPanelHtml: ({ settings, forceImmediateAlerts }) => (
        `<section>${settings.localSoundEnabled ? 'sound-on' : 'sound-off'}:${forceImmediateAlerts ? 'immediate-on' : 'immediate-off'}</section>`
      ),
      buildMutedAlertStatePanelHtml: ({ mutedPathTargets }) => (
        `<section>${mutedPathTargets.map((entry) => entry.key).join(',')}</section>`
      ),
      createAlertLogTabRuntime: () => ({}),
      createAlertLogCardInsertionRuntime: () => ({ finalize: () => {}, prepend: () => null })
    },
    arbDetailUtils: {},
    arbRuntimeMemoryUtils: {
      trimContainerChildren: () => {}
    },
    audioUtils: {
      syncLoopingAudio: () => {}
    },
    clearTimeout: () => {},
    dashboardRuntimeUtils: {
      getActivePathAlertEvaluationAlerts: () => [],
      hasActivePathAlertEvaluationTarget: () => true,
      hasActivePathAlertSound: () => false,
      isPanelVisible: () => true,
      resolveMutedStateRefreshDelay: () => 0
    },
    domRenderUtils,
    fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
    getDashboardLocalStorage: () => null,
    mutedPathLegUtils: {
      buildMutedPathLegKey: (entry) => entry && entry.key || '',
      pruneExpiredMutedPathLegs: (entries) => entries
    },
    mutedPathRuntime,
    mutedPathRuntimeUtils: {},
    mutedPathStorageRuntime: {
      loadLegs: () => [],
      loadTargets: () => [],
      persistLegs: (entries) => entries,
      persistTargets: (entries) => entries
    },
    mutedPathStorageUtils: {},
    pathAlertNotificationUtils: {},
    pathAlertPageUtils: {},
    pathAlertRuntimeState: createPathAlertRuntimeState(),
    pathAlertSchedulerRuntime: {
      restartEvaluation: () => {},
      scheduleConfigSave: (callback) => callback(),
      scheduleEvaluation: (callback, delayMs) => {
        schedulerCalls.push(['scheduleEvaluation', delayMs]);
        callback();
        return true;
      },
      scheduleExternalReload: (callback) => callback()
    },
    pathAlertUtils: {
      PATH_ALERT_MUTE_DURATION_MS: 60 * 60 * 1000,
      PATH_ALERT_MUTE_EXTEND_DURATION_MS: 2 * 60 * 60 * 1000,
      buildMutedPathLegStatusText: (entry) => entry && entry.key || '',
      buildMutedPathStatusText: (entry) => entry && entry.key || '',
      buildMutedPathTargetKey: (entry) => entry && entry.key || '',
      createPathAlertConfigClient: () => ({
        load: async () => config,
        loadStrict: async () => config
      }),
      normalizeAlertConfig: () => config,
      pruneExpiredMutedPathTargets: (entries) => entries
    },
    quoteDisplayUtils: {
      buildQuoteAlertDisplayLabel: () => ''
    },
    refs: {
      alertLogSettingsContent: settingsContent,
      alertLogMutedContent: mutedContent
    },
    setTimeout(callback, delayMs) {
      timers.push({ callback, delayMs });
      return `timer-${timers.length}`;
    },
    windowImpl: {},
    ...overrides
  };

  return {
    config,
    deps,
    mutedPathRuntime,
    mutedContent,
    schedulerCalls,
    settingsContent,
    timers
  };
}

{
  const { config, deps, settingsContent, timers } = createBaseDeps();
  const controller = createAlertRuntimeController(deps);

  controller.renderAlertSettingsPanel();
  assert.strictEqual(settingsContent.innerHTML, '<section>sound-on:immediate-off</section>');
  assert.strictEqual(typeof settingsContent.listeners.pointerdown, 'function');

  settingsContent.listeners.pointerdown({});
  config.settings.localSoundEnabled = false;
  deps.pathAlertRuntimeState.setForceImmediate(true);
  controller.renderAlertSettingsPanel();
  assert.strictEqual(settingsContent.innerHTML, '<section>sound-on:immediate-off</section>');

  settingsContent.listeners.pointerup({});
  assert.strictEqual(timers.length, 1);
  timers[0].callback();
  assert.strictEqual(settingsContent.innerHTML, '<section>sound-off:immediate-on</section>');
}

{
  const { deps, mutedPathRuntime, mutedContent, timers } = createBaseDeps();
  const controller = createAlertRuntimeController(deps);

  controller.renderMutedAlertStatePanel();
  assert.strictEqual(mutedContent.innerHTML, '<section>old-muted</section>');
  assert.strictEqual(typeof mutedContent.listeners.pointerdown, 'function');

  mutedContent.listeners.pointerdown({});
  mutedPathRuntime.setTargets([{ key: 'new-muted' }]);
  controller.renderMutedAlertStatePanel();
  assert.strictEqual(mutedContent.innerHTML, '<section>old-muted</section>');

  mutedContent.listeners.pointerup({});
  assert.strictEqual(timers.length, 1);
  timers[0].callback();
  assert.strictEqual(mutedContent.innerHTML, '<section>new-muted</section>');
}

{
  const { deps, schedulerCalls } = createBaseDeps({
    pathAlertMarketChangeDelayMs: 88
  });
  const controller = createAlertRuntimeController(deps);

  assert.strictEqual(controller.schedulePathAlertEvaluation({ delayMs: 88 }), true);
  assert.deepStrictEqual(schedulerCalls, [['scheduleEvaluation', 88]]);
}
