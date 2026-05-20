(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardShellRuntime = api;
  if (root && root.window && root.window !== root) {
    root.window.DashboardShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardShellRuntime(options = {}) {
    const refs = options.refs || {};
    const dashboardRuntimeUtils = options.dashboardRuntimeUtils || {};
    const dashboardModalUtils = options.dashboardModalUtils || {};
    const dashboardRenderer = options.dashboardRenderer || {};
    const requestChannelUtils = options.requestChannelUtils || {};
    const themeUtils = options.themeUtils || {};
    const copyUtils = options.copyUtils || {};
    const getApiIntervals = typeof options.getApiIntervals === 'function' ? options.getApiIntervals : () => ({});
    const setApiIntervals = typeof options.setApiIntervals === 'function' ? options.setApiIntervals : () => {};
    const saveDashboardConfig = typeof options.saveDashboardConfig === 'function' ? options.saveDashboardConfig : () => {};
    const updateSchedulers = typeof options.updateSchedulers === 'function' ? options.updateSchedulers : () => {};
    const getDashboardLocalStorage = typeof options.getDashboardLocalStorage === 'function'
      ? options.getDashboardLocalStorage
      : () => null;
    const logger = options.logger || {};

    const themeRuntime = themeUtils.createThemeRuntime({
      body: refs.bodyEl,
      button: refs.themeToggleBtn,
      getStorage: getDashboardLocalStorage,
      onLoadError: (error) => logger.warn && logger.warn('读取主题本地缓存失败:', error)
    });
    const settingsSaveFeedbackRuntime = dashboardRuntimeUtils.createButtonFeedbackRuntime({
      setTimeout: options.setTimeout,
      clearTimeout: options.clearTimeout,
      durationMs: options.settingsSaveFeedbackDurationMs || 1500
    });
    const dashboardPersistenceRuntime = dashboardRuntimeUtils.createDashboardPersistenceRuntime({
      saveRuntimeOptions: {
        setTimeout: options.setTimeout,
        clearTimeout: options.clearTimeout,
        delayMs: options.dashboardSaveDebounceMs
      },
      feedbackOptions: {
        button: refs.manualSaveBtn,
        textEl: refs.manualSaveText,
        setTimeout: options.setTimeout,
        clearTimeout: options.clearTimeout
      },
      getDashboardState: options.getDashboardState,
      getApiIntervals,
      saveDashboardConfig,
      logger
    });
    const performSave = dashboardPersistenceRuntime.performSave;
    const saveData = dashboardPersistenceRuntime.scheduleSave;
    const addQuoteModalSelectionRuntime = dashboardModalUtils.createModalSelectionRuntime();
    const quoteSettingsSelectionRuntime = dashboardModalUtils.createModalSelectionRuntime();
    const confirmActionRuntime = dashboardModalUtils.createConfirmActionRuntime();
    const multiChannelToggleRuntime = requestChannelUtils.createMultiChannelToggleRuntime({
      button: refs.toggleMultiChannelBtn,
      getStorage: getDashboardLocalStorage,
      onLoadError: (error) => logger.warn && logger.warn('读取多渠道开关本地缓存失败:', error),
      onPersistError: (error) => logger.warn && logger.warn('保存多渠道开关本地缓存失败:', error)
    });
    const requestChannelRuntime = requestChannelUtils.createRequestChannelRuntime({
      payload: { channels: [] },
      defaultIntervals: getApiIntervals(),
      multiChannelToggleRuntime,
      tagOptions: {
        getElementById: (id) => options.documentImpl && options.documentImpl.getElementById(id)
      }
    });
    const requestChannelTagVisibilityRuntime = requestChannelUtils.createRequestChannelTagVisibilityRuntime({
      getBody: () => refs.bodyEl,
      visible: true
    });
    const settingsModalRuntime = dashboardModalUtils.createSettingsModalRuntime({
      openButton: refs.settingsBtn,
      cancelButton: refs.settingsCancelBtn,
      saveButton: refs.settingsSaveBtn,
      modal: refs.settingsModal,
      intervalInputRefs: refs.settingsIntervalInputRefs,
      defaultIntervals: options.defaultIntervals,
      getIntervals: getApiIntervals,
      setIntervals: setApiIntervals,
      buildSettingsIntervalWritePlan: dashboardRenderer.buildSettingsIntervalWritePlan,
      readSettingsIntervalFormValues: dashboardRenderer.readSettingsIntervalFormValues,
      buildSettingsIntervalsFromFormValues: dashboardRenderer.buildSettingsIntervalsFromFormValues,
      onSave: () => {
        requestChannelRuntime.setDefaultIntervals(getApiIntervals());
        updateSchedulers();
        saveData();
      },
      showSaveFeedback: () => {
        settingsSaveFeedbackRuntime.show({
          button: refs.settingsSaveBtn,
          text: '已保存!',
          resetState: {
            button: refs.settingsSaveBtn,
            text: '保存'
          }
        });
      }
    });
    const copyToastRuntime = copyUtils.createCopyToastRuntime({
      setTimeout: options.setTimeout,
      clearTimeout: options.clearTimeout
    });

    return {
      addQuoteModalSelectionRuntime,
      confirmActionRuntime,
      copyToastRuntime,
      dashboardPersistenceRuntime,
      getEffectiveRequestChannelIdForQuote: requestChannelRuntime.getEffectiveChannelIdForQuote,
      multiChannelToggleRuntime,
      performSave,
      quoteSettingsSelectionRuntime,
      requestChannelRuntime,
      requestChannelTagVisibilityRuntime,
      saveData,
      settingsModalRuntime,
      settingsSaveFeedbackRuntime,
      themeRuntime,
      updateRequestChannelTagForQuote: requestChannelRuntime.updateTagForQuote
    };
  }

  return {
    createDashboardShellRuntime
  };
});
