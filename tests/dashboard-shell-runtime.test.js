const assert = require('assert');

const {
  createDashboardShellRuntime
} = require('../src/app/dashboard-shell-runtime');

const calls = [];
let currentIntervals = { kyber: 1000 };
const refs = {
  bodyEl: { id: 'body' },
  themeToggleBtn: { id: 'theme' },
  manualSaveBtn: { id: 'manual-save' },
  manualSaveText: { id: 'manual-save-text' },
  settingsBtn: { id: 'settings' },
  settingsCancelBtn: { id: 'settings-cancel' },
  settingsSaveBtn: { id: 'settings-save' },
  settingsModal: { id: 'settings-modal' },
  settingsIntervalInputRefs: { kyber: { value: '1000' } },
  toggleMultiChannelBtn: { id: 'multi-channel' },
  copyToast: { id: 'copy-toast' }
};

const dashboardRuntimeUtils = {
  createButtonFeedbackRuntime(options) {
    calls.push(['createButtonFeedback', options.durationMs]);
    return {
      show(config) {
        calls.push(['showFeedback', config.text, config.resetState && config.resetState.text]);
      }
    };
  },
  createDashboardPersistenceRuntime(options) {
    calls.push(['createPersistence', options.saveRuntimeOptions.delayMs, options.feedbackOptions.button]);
    return {
      performSave(options = {}) {
        calls.push(['performSave', Boolean(options.manual)]);
      },
      scheduleSave() {
        calls.push(['scheduleSave']);
      }
    };
  }
};

const dashboardModalUtils = {
  createModalSelectionRuntime() {
    const runtime = { id: `selection-${calls.length}` };
    calls.push(['createModalSelection', runtime.id]);
    return runtime;
  },
  createConfirmActionRuntime() {
    calls.push(['createConfirm']);
    return { id: 'confirm' };
  },
  createSettingsModalRuntime(options) {
    calls.push(['createSettingsModal', options.modal, options.defaultIntervals]);
    return {
      options,
      save(nextIntervals) {
        options.setIntervals(nextIntervals);
        options.onSave(nextIntervals);
        options.showSaveFeedback(nextIntervals);
      }
    };
  }
};

const requestChannelRuntime = {
  defaultIntervals: [],
  getEffectiveChannelIdForQuote: () => 'default',
  updateTagForQuote: () => 'tagged',
  setDefaultIntervals(intervals) {
    this.defaultIntervals.push(intervals);
  }
};

const requestChannelUtils = {
  createMultiChannelToggleRuntime(options) {
    calls.push(['createMultiChannelToggle', options.button]);
    return { id: 'multi-channel-runtime' };
  },
  createRequestChannelRuntime(options) {
    calls.push(['createRequestChannel', options.defaultIntervals]);
    return requestChannelRuntime;
  },
  createRequestChannelTagVisibilityRuntime(options) {
    calls.push(['createTagVisibility', options.visible]);
    return { id: 'tag-visibility' };
  }
};

const runtime = createDashboardShellRuntime({
  clearTimeout: () => {},
  copyUtils: {
    createCopyToastRuntime() {
      calls.push(['createCopyToast']);
      return { id: 'copy-toast-runtime' };
    }
  },
  dashboardModalUtils,
  dashboardRenderer: {
    buildSettingsIntervalWritePlan: () => [],
    buildSettingsIntervalsFromFormValues: () => ({}),
    readSettingsIntervalFormValues: () => ({})
  },
  dashboardRuntimeUtils,
  defaultIntervals: { kyber: 1000, solana: 3500 },
  documentImpl: {
    getElementById(id) {
      return { id };
    }
  },
  getApiIntervals: () => currentIntervals,
  getDashboardLocalStorage: () => ({ id: 'storage' }),
  getDashboardState: () => [{ id: 'cat-a' }],
  refs,
  requestChannelUtils,
  saveDashboardConfig: (payload) => calls.push(['saveConfig', payload]),
  setApiIntervals(nextIntervals) {
    currentIntervals = nextIntervals;
    calls.push(['setApiIntervals', nextIntervals]);
  },
  setTimeout: () => {},
  themeUtils: {
    createThemeRuntime(options) {
      calls.push(['createTheme', options.body, options.button]);
      return { id: 'theme-runtime' };
    }
  },
  updateSchedulers: () => calls.push(['updateSchedulers'])
});

assert.strictEqual(runtime.themeRuntime.id, 'theme-runtime');
assert.strictEqual(runtime.copyToastRuntime.id, 'copy-toast-runtime');
assert.strictEqual(runtime.requestChannelRuntime, requestChannelRuntime);
assert.strictEqual(runtime.getEffectiveRequestChannelIdForQuote(), 'default');
assert.strictEqual(runtime.updateRequestChannelTagForQuote(), 'tagged');
assert.strictEqual(typeof runtime.performSave, 'function');
assert.strictEqual(typeof runtime.saveData, 'function');

runtime.settingsModalRuntime.save({ kyber: 2000 });
assert.deepStrictEqual(currentIntervals, { kyber: 2000 });
assert.deepStrictEqual(requestChannelRuntime.defaultIntervals, [{ kyber: 2000 }]);
assert.ok(calls.some((call) => call[0] === 'updateSchedulers'));
assert.ok(calls.some((call) => call[0] === 'scheduleSave'));
assert.ok(calls.some((call) => call[0] === 'showFeedback' && call[1] === '已保存!'));
