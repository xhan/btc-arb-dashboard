const assert = require('assert');

const domRenderUtils = require('../src/ui/dom-render-utils');
const arbPathConfigUtils = require('../src/arb/arb-path-config-utils');
const pathAlertUtils = require('../src/path-alerts/path-alert-utils');
const mutedPathLegUtils = require('../src/path-alerts/muted-path-leg-utils');
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
    get: (key) => map.get(key) || null,
    getState: () => map,
    isForceImmediateEnabled: () => forceImmediate,
    pruneInactive(alerts) {
      const activeIds = new Set(
        (Array.isArray(alerts) ? alerts : [])
          .filter((alert) => alert && alert.id && alert.enabled !== false)
          .map((alert) => alert.id)
      );
      for (const alertId of Array.from(map.keys())) {
        if (!activeIds.has(alertId)) {
          map.delete(alertId);
        }
      }
      return map;
    },
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
  const scheduledEvaluationCallbacks = [];
  const settingsContent = createElement('settings');
  const mutedContent = createElement('muted');
  const documentImpl = { activeElement: null };
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
      buildRuntimeDebugSnapshot: () => ({}),
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
    documentImpl,
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
    pathAlertNotificationUtils: {
      sortTriggeredPathAlertEntries: (entries) => entries
    },
    pathAlertPageUtils: {},
    pathAlertRuntimeState: createPathAlertRuntimeState(),
    pathAlertSchedulerRuntime: {
      restartDeadlineEvaluation: () => {
        schedulerCalls.push(['restartDeadlineEvaluation']);
        return true;
      },
      scheduleConfigSave: (callback) => callback(),
      scheduleEvaluation: (callback, delayMs) => {
        schedulerCalls.push(['scheduleEvaluation', delayMs]);
        scheduledEvaluationCallbacks.push(callback);
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
    documentImpl,
    mutedPathRuntime,
    mutedContent,
    schedulerCalls,
    scheduledEvaluationCallbacks,
    settingsContent,
    timers
  };
}

{
  const invalidationConfigs = [];
  const { deps } = createBaseDeps({
    arbAlertBridgeRuntime: {
      invalidateRuleSnapshot(config) {
        invalidationConfigs.push(config);
        return true;
      },
      refreshArbViewsAfterMutedPathLegChange: () => ({})
    },
    mutedPathLegUtils
  });
  const controller = createAlertRuntimeController(deps);

  controller.muteArbDetailLeg({
    quoteId: 1,
    direction: 'forward',
    pricingMode: 'raw',
    chain: 'ethereum',
    from: 'USDC',
    to: 'USDT'
  }, 2, 1000);

  assert.deepStrictEqual(invalidationConfigs, [{ bumpRevision: false }]);
}

{
  const evaluatedAlertIds = [];
  const manualAlerts = [
    { id: 'manual-1', enabled: true, target: { type: 'path', legs: [{ quoteId: 1 }] } },
    { id: 'manual-2', enabled: true, target: { type: 'path', legs: [{ quoteId: 2 }] } }
  ];
  const base = createBaseDeps();
  const { config, deps, scheduledEvaluationCallbacks } = createBaseDeps({
    dashboardRuntimeUtils: {
      ...base.deps.dashboardRuntimeUtils,
      getActivePathAlertEvaluationAlerts: () => manualAlerts
    },
    getDashboardState: () => [],
    getQuoteMarketStateMap: () => new Map(),
    pathAlertUtils: {
      ...pathAlertUtils,
      evaluatePathAlert(alert, context) {
        evaluatedAlertIds.push(alert.id);
        return pathAlertUtils.evaluatePathAlert(alert, context);
      }
    }
  });
  config.alerts = manualAlerts;
  const controller = createAlertRuntimeController(deps);

  controller.scheduleManualPathAlertEvaluation({ quoteId: 1 });
  controller.scheduleManualPathAlertEvaluation({ quoteId: 2 });
  scheduledEvaluationCallbacks[0]();

  assert.deepStrictEqual(evaluatedAlertIds, ['manual-1', 'manual-2']);
}

{
  const { deps, schedulerCalls } = createBaseDeps();
  const controller = createAlertRuntimeController(deps);
  controller.restartPathAlertScheduler();
  assert.deepStrictEqual(schedulerCalls, [['restartDeadlineEvaluation']]);
}

{
  const { config, deps, documentImpl, settingsContent, timers } = createBaseDeps();
  const controller = createAlertRuntimeController(deps);

  controller.renderAlertSettingsPanel();
  assert.strictEqual(settingsContent.innerHTML, '<section>sound-on:immediate-off</section>');
  assert.strictEqual(typeof settingsContent.listeners.pointerdown, 'function');
  assert.strictEqual(typeof settingsContent.listeners.focusin, 'function');

  settingsContent.listeners.pointerdown({});
  config.settings.localSoundEnabled = false;
  deps.pathAlertRuntimeState.setForceImmediate(true);
  controller.renderAlertSettingsPanel();
  assert.strictEqual(settingsContent.innerHTML, '<section>sound-on:immediate-off</section>');

  settingsContent.listeners.pointerup({});
  assert.strictEqual(timers.length, 1);
  timers[0].callback();
  assert.strictEqual(settingsContent.innerHTML, '<section>sound-off:immediate-on</section>');

  documentImpl.activeElement = { inside: 'settings', tagName: 'BUTTON' };
  config.settings.localSoundEnabled = true;
  deps.pathAlertRuntimeState.setForceImmediate(false);
  controller.renderAlertSettingsPanel();
  assert.strictEqual(settingsContent.innerHTML, '<section>sound-on:immediate-off</section>');

  documentImpl.activeElement = { inside: 'settings', tagName: 'INPUT', type: 'number' };
  settingsContent.listeners.focusin({ target: documentImpl.activeElement });
  config.settings.localSoundEnabled = false;
  deps.pathAlertRuntimeState.setForceImmediate(true);
  controller.renderAlertSettingsPanel();
  assert.strictEqual(settingsContent.innerHTML, '<section>sound-on:immediate-off</section>');

  documentImpl.activeElement = null;
  settingsContent.listeners.focusout({ relatedTarget: null });
  assert.strictEqual(timers.length, 2);
  timers[1].callback();
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
  const base = createBaseDeps();
  const manualAlert = { id: 'manual', target: { type: 'path', legs: [] } };
  const { deps, schedulerCalls } = createBaseDeps({
    dashboardRuntimeUtils: {
      ...base.deps.dashboardRuntimeUtils,
      getActivePathAlertEvaluationAlerts: () => [manualAlert]
    },
    pathAlertMarketChangeDelayMs: 88
  });
  const controller = createAlertRuntimeController(deps);

  assert.strictEqual(controller.schedulePathAlertEvaluation({ delayMs: 88 }), true);
  assert.deepStrictEqual(schedulerCalls, [['scheduleEvaluation', 88]]);
}

{
  const base = createBaseDeps();
  const manualAlert = { id: 'manual', target: { type: 'path', legs: [] } };
  const { deps, schedulerCalls } = createBaseDeps({
    dashboardRuntimeUtils: {
      ...base.deps.dashboardRuntimeUtils,
      getActivePathAlertEvaluationAlerts: () => [manualAlert]
    }
  });
  const controller = createAlertRuntimeController(deps);

  assert.strictEqual(controller.schedulePathAlertEvaluation(), true);
  assert.deepStrictEqual(schedulerCalls, [['scheduleEvaluation', 800]]);
}

{
  const unwatchedRuleAlert = {
    id: 'unwatched-rule',
    target: { type: 'rule', ruleKind: 'fixed', ruleId: 'fixed:missing' }
  };
  const { deps, schedulerCalls } = createBaseDeps({
    arbPathConfig: {
      watchItems: [
        { title: 'watched', type: 'fixed-rule', ruleId: 'fixed:watched' }
      ]
    },
    arbPathConfigUtils,
    dashboardRuntimeUtils: {
      getActivePathAlertEvaluationAlerts: () => [unwatchedRuleAlert],
      hasActivePathAlertEvaluationTarget: () => true,
      hasActivePathAlertSound: () => false,
      isPanelVisible: () => true,
      resolveMutedStateRefreshDelay: () => 0
    },
    pathAlertUtils: {
      ...createBaseDeps().deps.pathAlertUtils,
      buildAllLegSnapshots: () => [],
      evaluatePathAlert: () => {
        throw new Error('unwatched rule alert should not be evaluated');
      }
    }
  });
  const controller = createAlertRuntimeController(deps);

  controller.evaluatePathAlertsOnce();
  assert.strictEqual(controller.schedulePathAlertEvaluation({ delayMs: 88 }), false);
  assert.deepStrictEqual(schedulerCalls, []);
}

{
  const base = createBaseDeps();
  const { config, deps } = createBaseDeps({
    arbPathConfig: {
      watchItems: [
        { title: 'watched', type: 'fixed-rule', ruleId: 'fixed:watched' }
      ]
    },
    arbPathConfigUtils,
    dashboardRuntimeUtils: {
      ...base.deps.dashboardRuntimeUtils,
      getActivePathAlertEvaluationAlerts: (alertConfig) => (
        (alertConfig.alerts || []).filter((alert) => alert && alert.enabled !== false && alert.target && alert.target.type !== 'quote')
      )
    }
  });
  config.alerts = [
    {
      id: 'stale-unwatched',
      enabled: true,
      target: { type: 'rule', ruleKind: 'fixed', ruleId: 'fixed:unwatched' }
    }
  ];
  deps.pathAlertRuntimeState.set('stale-unwatched', { isSoundActive: true });
  const controller = createAlertRuntimeController(deps);

  controller.evaluatePathAlertsOnce();

  assert.strictEqual(deps.pathAlertRuntimeState.get('stale-unwatched'), null);
}

{
  const unwatchedQuoteAlert = {
    id: 'unwatched-quote',
    target: {
      type: 'quote',
      quoteId: 101,
      direction: 'inverse',
      ruleKind: 'targetAbove',
      value: 1
    }
  };
  const base = createBaseDeps();
  const { deps } = createBaseDeps({
    arbPathConfig: {
      watchItems: [
        { title: 'watched forward quote', type: 'quote-price', quoteId: 101, direction: 'forward' }
      ]
    },
    arbPathConfigUtils,
    dashboardRuntimeUtils: {
      ...base.deps.dashboardRuntimeUtils,
      buildQuoteAlertUiUpdate: () => ({
        nextState: { hasUnreadAlert: false },
        highlighted: false,
        highlightPast: false
      })
    },
    documentImpl: {
      getElementById: () => null
    },
    pathAlertUtils: {
      ...base.deps.pathAlertUtils,
      getQuoteAlertsForQuoteId: () => [unwatchedQuoteAlert],
      evaluatePathAlert: () => {
        throw new Error('unwatched quote alert should not be evaluated');
      }
    },
    quoteStateRuntime: {
      getUiState: () => ({}),
      setUiState: () => {}
    }
  });
  const controller = createAlertRuntimeController(deps);
  deps.pathAlertRuntimeState.set('unwatched-quote', { status: 'cooldown' });

  controller.checkPriceForAlerts({ id: 101 });

  assert.strictEqual(deps.pathAlertRuntimeState.get('unwatched-quote'), null);
}

{
  const base = createBaseDeps();
  const { config, deps } = createBaseDeps({
    arbPathConfig: {
      watchItems: [
        { title: 'missing quote watch', type: 'quote-price', quoteId: 202, direction: 'forward' }
      ]
    },
    arbPathConfigUtils,
    dashboardRuntimeUtils: {
      ...base.deps.dashboardRuntimeUtils,
      findDashboardQuoteById: () => null,
      getActivePathAlertEvaluationAlerts: () => []
    },
    getDashboardState: () => []
  });
  config.alerts = [
    {
      id: 'missing-quote-alert',
      enabled: true,
      target: {
        type: 'quote',
        quoteId: 202,
        direction: 'forward',
        ruleKind: 'targetAbove',
        value: 1
      }
    }
  ];
  deps.pathAlertRuntimeState.set('missing-quote-alert', { status: 'cooldown' });
  const controller = createAlertRuntimeController(deps);

  controller.evaluatePathAlertsOnce();

  assert.strictEqual(deps.pathAlertRuntimeState.get('missing-quote-alert'), null);
}

(async () => {
  const audioCalls = [];
  const panelCalls = [];
  const base = createBaseDeps();
  const { deps } = createBaseDeps({
    alertLogUiUtils: {
      ...base.deps.alertLogUiUtils,
      resolveAlertSettingsChangeAction: () => ({
        type: 'set-force-immediate',
        checked: false
      })
    },
    arbAlertBridgeRuntime: {
      refreshArbPanel: () => {
        panelCalls.push('refreshPanel');
        return true;
      }
    },
    audioUtils: {
      syncLoopingAudio: (audioEl, shouldPlay) => {
        audioCalls.push([audioEl, shouldPlay]);
      }
    },
    pathAlertUtils: {
      ...base.deps.pathAlertUtils,
      createPathAlertConfigClient: () => ({
        load: async () => base.config,
        loadStrict: async () => base.config
      })
    }
  });
  const controller = createAlertRuntimeController(deps);
  deps.pathAlertRuntimeState.set('active-sound', { isSoundActive: true });
  deps.pathAlertRuntimeState.setForceImmediate(true);

  controller.handleAlertSettingsChange({});
  await Promise.resolve();

  assert.deepStrictEqual(panelCalls, ['refreshPanel']);
  assert.deepStrictEqual(audioCalls, [[undefined, false]]);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
