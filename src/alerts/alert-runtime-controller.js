(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && root.window) {
    root.window.AlertRuntimeController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createNoopHtmlRenderer() {
    return {
      flush() {
        return false;
      },
      render(target, html) {
        if (target) target.innerHTML = html;
      }
    };
  }

  function getNow() {
    return Date.now();
  }

  function createAlertRuntimeController(deps = {}) {
    const pathAlertUtils = deps.pathAlertUtils || (root && root.PathAlertUtils);
    const mutedPathLegUtils = deps.mutedPathLegUtils || (root && root.MutedPathLegUtils);
    const mutedPathRuntimeUtils = deps.mutedPathRuntimeUtils || (root && root.MutedPathRuntimeUtils);
    const mutedPathStorageUtils = deps.mutedPathStorageUtils || (root && root.MutedPathStorageUtils);
    const alertLogUiUtils = deps.alertLogUiUtils || (root && root.AlertLogUiUtils);
    const domRenderUtils = deps.domRenderUtils || (root && root.DomRenderUtils);
    const dashboardRuntimeUtils = deps.dashboardRuntimeUtils || (root && root.DashboardRuntimeUtils);
    const audioUtils = deps.audioUtils || (root && root.AudioUtils);
    const alertDebugUtils = deps.alertDebugUtils || (root && root.AlertDebugUtils);
    const pathAlertNotificationUtils = deps.pathAlertNotificationUtils || (root && root.PathAlertNotificationUtils);
    const pathAlertPageUtils = deps.pathAlertPageUtils || (root && root.PathAlertPageUtils);
    const pathAlertRuleDefinitions = deps.pathAlertRuleDefinitions || (root && root.PathAlertRuleDefinitions) || {};
    const arbPathConfig = deps.arbPathConfig || (root && root.ArbPathConfig) || {};
    const arbPathConfigUtils = deps.arbPathConfigUtils || (root && root.ArbPathConfigUtils) || null;
    const arbRuntimeMemoryUtils = deps.arbRuntimeMemoryUtils || (root && root.ArbRuntimeMemoryUtils);
    const arbDetailUtils = deps.arbDetailUtils || (root && root.ArbDetailUtils);
    const quoteDisplayUtils = deps.quoteDisplayUtils || (root && root.QuoteDisplayUtils);
    const fetchImpl = deps.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    const documentImpl = deps.documentImpl || (typeof document !== 'undefined' ? document : null);
    const windowImpl = deps.windowImpl || (typeof window !== 'undefined' ? window : null);
    const refs = deps.refs || {};
    const maxLogEntries = Number.isFinite(Number(deps.maxLogEntries)) ? Number(deps.maxLogEntries) : 300;
    const muteExtendDurationMs = Number(pathAlertUtils.PATH_ALERT_MUTE_EXTEND_DURATION_MS) || (2 * 60 * 60 * 1000);
    const muteDurationMs = Number(pathAlertUtils.PATH_ALERT_MUTE_DURATION_MS) || (60 * 60 * 1000);
    const mutedPathLegExtendDurationMs = Number(deps.mutedPathLegExtendDurationMs) || (2 * 60 * 60 * 1000);
    const backendUrl = String(deps.backendUrl || '');
    const logWarning = typeof deps.logWarning === 'function' ? deps.logWarning : () => {};
    const logError = typeof deps.logError === 'function' ? deps.logError : () => {};
    const logInfo = typeof deps.logInfo === 'function' ? deps.logInfo : () => {};
    const pathAlertMarketChangeDelayMs = Number.isFinite(Number(deps.pathAlertMarketChangeDelayMs))
      ? Number(deps.pathAlertMarketChangeDelayMs)
      : 800;

    let pathAlertConfig = pathAlertUtils.normalizeAlertConfig();
    let pathAlertReloading = false;

    function flushAlertContentRenderer(getRenderer, getElement) {
      const renderer = typeof getRenderer === 'function' ? getRenderer() : null;
      const element = typeof getElement === 'function' ? getElement() : null;
      if (renderer && element && typeof renderer.flush === 'function') {
        renderer.flush(element);
      }
    }

    function createAlertContentInteractionRuntime(getRenderer, getElement, options = {}) {
      if (!domRenderUtils || typeof domRenderUtils.createRenderInteractionDeferralRuntime !== 'function') {
        return null;
      }
      return domRenderUtils.createRenderInteractionDeferralRuntime({
        getTarget: getElement,
        interactionRuntime: deps.interactionRuntime,
        setTimeout: deps.setTimeout,
        clearTimeout: deps.clearTimeout,
        trackFocus: options.trackFocus,
        onIdle: () => flushAlertContentRenderer(getRenderer, getElement)
      });
    }

    function shouldDeferAlertContentRender(runtime, element, options = {}) {
      if (
        runtime
        && typeof runtime.shouldDeferRender === 'function'
        && runtime.shouldDeferRender(element)
      ) {
        return true;
      }
      return Boolean(
        options.deferFocusedEditable === true
        && domRenderUtils
        && typeof domRenderUtils.shouldDeferRenderForFocusedEditable === 'function'
        && domRenderUtils.shouldDeferRenderForFocusedEditable(element, { documentImpl })
      );
    }

    function createAlertContentHtmlRenderer(runtime, options = {}) {
      if (!domRenderUtils || typeof domRenderUtils.createStableHtmlRenderer !== 'function') {
        return createNoopHtmlRenderer();
      }
      return domRenderUtils.createStableHtmlRenderer({
        shouldDeferRender: (element) => shouldDeferAlertContentRender(runtime, element, options)
      });
    }

    function bindAlertContentInteractionRuntime(runtime, element) {
      if (runtime && element && typeof runtime.bind === 'function') {
        runtime.bind(element);
      }
    }

    const pathAlertConfigClient = pathAlertUtils.createPathAlertConfigClient({
      fetch: fetchImpl,
      url: `${backendUrl}/api/get-alert-config`,
      logWarning(error) {
        logWarning('加载路径报警配置失败:', error);
      }
    });
    let alertSettingsHtmlRenderer = null;
    const alertSettingsInteractionRuntime = deps.alertSettingsHtmlRenderer
      ? null
      : createAlertContentInteractionRuntime(
        () => alertSettingsHtmlRenderer,
        () => refs.alertLogSettingsContent,
        { trackFocus: 'editable' }
      );
    alertSettingsHtmlRenderer = deps.alertSettingsHtmlRenderer
      || createAlertContentHtmlRenderer(alertSettingsInteractionRuntime, { deferFocusedEditable: true });
    let mutedAlertStateHtmlRenderer = null;
    const mutedAlertStateInteractionRuntime = deps.mutedAlertStateHtmlRenderer
      ? null
      : createAlertContentInteractionRuntime(
        () => mutedAlertStateHtmlRenderer,
        () => refs.alertLogMutedContent,
        { trackFocus: false }
      );
    mutedAlertStateHtmlRenderer = deps.mutedAlertStateHtmlRenderer
      || createAlertContentHtmlRenderer(mutedAlertStateInteractionRuntime);
    const pathAlertRuntimeState = deps.pathAlertRuntimeState || pathAlertUtils.createPathAlertRuntimeState();
    const pathAlertSchedulerRuntime = deps.pathAlertSchedulerRuntime || pathAlertUtils.createPathAlertSchedulerRuntime({
      setInterval: deps.setInterval,
      clearInterval: deps.clearInterval,
      setTimeout: deps.setTimeout,
      clearTimeout: deps.clearTimeout
    });
    const alertLogTabRuntime = deps.alertLogTabRuntime || alertLogUiUtils.createAlertLogTabRuntime();
    const mutedPathRuntime = deps.mutedPathRuntime || mutedPathRuntimeUtils.createMutedPathRuntime({
      pruneTargets: (entries, nowMs) => pathAlertUtils.pruneExpiredMutedPathTargets(entries, nowMs),
      pruneLegs: (entries, nowMs) => mutedPathLegUtils.pruneExpiredMutedPathLegs(entries, nowMs),
      resolveRefreshDelay: ({ mutedPathTargets, mutedPathLegs, nowMs }) => dashboardRuntimeUtils.resolveMutedStateRefreshDelay({
        mutedPathTargets,
        mutedPathLegs,
        nowMs,
        visible: dashboardRuntimeUtils.isPanelVisible(refs.alertLogWindow),
        visibleRefreshMs: deps.mutedStateVisibleRefreshMs,
        hiddenMaxRefreshMs: deps.mutedStateHiddenMaxRefreshMs
      }),
      clearTimeout: deps.clearTimeout,
      setTimeout: deps.setTimeout,
      now: getNow
    });
    const mutedPathStorageRuntime = deps.mutedPathStorageRuntime || mutedPathStorageUtils.createMutedPathStorageRuntime({
      getStorage: deps.getDashboardLocalStorage,
      getMutedPathLegUtils: () => mutedPathLegUtils,
      onTargetsLoadError: (error) => logWarning('读取沉默报警本地缓存失败:', error),
      onLegsLoadError: (error) => logWarning('读取屏蔽腿本地缓存失败:', error),
      onTargetsPersistError: (error) => logWarning('保存沉默报警本地缓存失败:', error),
      onLegsPersistError: (error) => logWarning('保存屏蔽腿本地缓存失败:', error)
    });
    const alertLogCardInsertionRuntime = deps.alertLogCardInsertionRuntime || alertLogUiUtils.createAlertLogCardInsertionRuntime({
      getActiveContainer: () => refs.alertLogContent,
      getMutedContainer: () => refs.alertLogMutedLogContent,
      selectorOptions: {
        escapeCssAttributeValue: (value) => domRenderUtils.escapeCssAttributeValue(value)
      },
      maxEntries: maxLogEntries,
      trimContainer: (container, limit) => arbRuntimeMemoryUtils.trimContainerChildren(container, limit),
      afterInsert: (nowMs) => {
        updateMutedPathAlertLogCards('', nowMs);
        syncMutedPathLogTimer();
      }
    });
    const alertDebugController = alertDebugUtils.createAlertDebugController({
      logger(message) {
        logInfo(message);
      }
    });
    const alertAudioRuntime = deps.alertAudioRuntime || audioUtils.createAudioUnlockRuntime({
      audioElements: [refs.pathAlertSound],
      noticeEl: refs.audioNoticeEl,
      logWarning,
      onUnlocked: updateAlertSoundState
    });

    if (windowImpl) {
      windowImpl.enableAlertDebug = function (enabled) {
        return alertDebugController.enable(enabled === true);
      };
    }

    function getDashboardState() {
      return typeof deps.getDashboardState === 'function' ? deps.getDashboardState() : [];
    }

    function getQuoteMarketState(quoteId, fallback = null) {
      return typeof deps.getQuoteMarketState === 'function' ? deps.getQuoteMarketState(quoteId, fallback) : fallback;
    }

    function getQuoteMarketStateMap() {
      return typeof deps.getQuoteMarketStateMap === 'function' ? deps.getQuoteMarketStateMap() : new Map();
    }

    function getSharedArbRuleSnapshot() {
      return typeof deps.getSharedArbRuleSnapshot === 'function' ? deps.getSharedArbRuleSnapshot() : {};
    }

    function findQuoteById(quoteId) {
      return typeof deps.findQuoteById === 'function' ? deps.findQuoteById(quoteId) : null;
    }

    function isCrossChainQuote(quote) {
      return typeof deps.isCrossChainQuote === 'function' ? deps.isCrossChainQuote(quote) : false;
    }

    function getQuoteChainDisplayName(quote) {
      return typeof deps.getQuoteChainDisplayName === 'function' ? deps.getQuoteChainDisplayName(quote) : '';
    }

    function buildLiveQuoteLabel(chain, fromSymbol, toSymbol) {
      return typeof deps.buildLiveQuoteLabel === 'function' ? deps.buildLiveQuoteLabel(chain, fromSymbol, toSymbol) : '';
    }

    function formatDetailNumber(value, decimals) {
      return typeof deps.formatDetailNumber === 'function' ? deps.formatDetailNumber(value, decimals) : String(value);
    }

    function formatArbPathLegLine(leg, options) {
      return typeof deps.formatArbPathLegLine === 'function' ? deps.formatArbPathLegLine(leg, options) : '';
    }

    function isRuleLeg(leg) {
      return typeof deps.isRuleLeg === 'function' ? deps.isRuleLeg(leg) : false;
    }

    function getQuoteStateRuntime() {
      return deps.quoteStateRuntime || {};
    }

    function buildQuoteAlertDisplayLabel(quote, monitorState = getQuoteMarketState(quote && quote.id) || {}, direction = 'forward') {
      return quoteDisplayUtils.buildQuoteAlertDisplayLabel(quote, monitorState, direction);
    }

    function updateAlertSoundState() {
      if (!alertAudioRuntime.isUnlocked()) return;
      audioUtils.syncLoopingAudio(
        refs.pathAlertSound,
        dashboardRuntimeUtils.hasActivePathAlertSound(pathAlertRuntimeState.getState()),
        { logPlayError: (error) => logError('Play failed', error) }
      );
    }

    function buildQuoteAlertTriggeredEntry(alert, quote, evaluation) {
      let dexLink = null;
      if (quote && !isCrossChainQuote(quote)) {
        dexLink = arbDetailUtils.buildArbDetailDexLink({
          chain: quote.chain,
          fromTokenAddress: quote.fromToken,
          toTokenAddress: quote.toToken,
          inputAmount: quote.amount
        });
      }

      return pathAlertNotificationUtils.buildQuoteAlertTriggeredEntryForQuote({
        alert,
        quote,
        state: quote && quote.id != null ? getQuoteMarketState(quote.id) || {} : {},
        displayName: getQuoteChainDisplayName(quote),
        evaluation,
        formatNumber: formatDetailNumber,
        dexLink,
        buildQuoteAlertDisplayLabel
      });
    }

    function markTriggeredArbOpportunities(alert, evaluation, nowMs = getNow()) {
      if (!deps.arbAlertBridgeRuntime || typeof deps.arbAlertBridgeRuntime.markTriggeredAlertOpportunity !== 'function') {
        return false;
      }
      return deps.arbAlertBridgeRuntime.markTriggeredAlertOpportunity(alert, evaluation, nowMs);
    }

    function appendQuoteAlertLogEntry(entry, nowMs = getNow()) {
      if (!refs.alertLogWindow || !refs.alertLogContent) return;
      const appendPlan = alertLogUiUtils.buildAlertLogAppendPlan([entry]);
      if (!appendPlan.entries.length) return;
      if (appendPlan.shouldAutoOpen) {
        applyAlertLogPanelDisplay('open');
      }
      const logEntry = appendPlan.entries[0];
      const mutedEntry = logEntry && logEntry.mutedTargetCandidate
        ? getMutedPathTargetEntry(logEntry.mutedTargetCandidate, nowMs)
        : null;
      const card = domRenderUtils.createElementFromHtml(
        alertLogUiUtils.buildQuoteAlertLogHtml(logEntry, {
          nowMs,
          mutedEntry,
          targetKey: logEntry && logEntry.mutedTargetCandidate ? buildMutedPathTargetKey(logEntry.mutedTargetCandidate) : '',
          statusText: mutedEntry ? pathAlertUtils.buildMutedPathStatusText(mutedEntry, nowMs) : '已触发'
        })
      );
      if (!card) return;
      const destination = alertLogCardInsertionRuntime.prepend(logEntry, card);
      alertLogCardInsertionRuntime.finalize([destination], nowMs);
    }

    function pruneMutedPathTargetsInPlace(nowMs = getNow()) {
      return mutedPathRuntime.pruneTargets(nowMs);
    }

    function getMutedPathTargetEntry(alertOrTarget, nowMs = getNow()) {
      pruneMutedPathTargetsInPlace(nowMs);
      return pathAlertUtils.findMutedPathAlert(mutedPathRuntime.getTargets(), alertOrTarget, nowMs);
    }

    function buildMutedPathTargetKey(alertOrTarget) {
      return pathAlertUtils.buildMutedPathTargetKey(alertOrTarget);
    }

    function buildMutedPathLegTitleSnapshot(leg) {
      return buildLiveQuoteLabel(
        leg && leg.chain,
        leg && (leg.fromSymbol || leg.from),
        leg && (leg.toSymbol || leg.to)
      );
    }

    function persistMutedPathTargets() {
      const list = mutedPathStorageRuntime.persistTargets(mutedPathRuntime.getTargets());
      if (Array.isArray(list)) {
        mutedPathRuntime.setTargets(list);
      }
    }

    function persistMutedPathLegs() {
      const list = mutedPathStorageRuntime.persistLegs(mutedPathRuntime.getLegs());
      if (Array.isArray(list)) {
        mutedPathRuntime.setLegs(list);
      }
    }

    function mutePathAlertTarget(entry, nowMs = getNow()) {
      const muteTarget = entry && entry.mutedTargetCandidate ? entry.mutedTargetCandidate : null;
      if (!muteTarget) return null;
      const targetKey = buildMutedPathTargetKey(muteTarget);
      if (!targetKey) return null;
      const logTitleSnapshot = pathAlertUtils.buildMutedPathLogTitleSnapshot(entry);
      pruneMutedPathTargetsInPlace(nowMs);
      const existingEntry = pathAlertUtils.findMutedPathTargetByKey(mutedPathRuntime.getTargets(), targetKey);
      const nextMutedEntry = existingEntry
        ? pathAlertUtils.extendMutedPathTargetEntry(existingEntry, nowMs, muteExtendDurationMs)
        : pathAlertUtils.createMutedPathTargetEntry(
          muteTarget,
          entry.summaryLines,
          nowMs,
          muteDurationMs,
          { logTitleSnapshot }
        );
      const mutedEntry = nextMutedEntry && !String(nextMutedEntry.logTitleSnapshot || '').trim()
        ? pathAlertUtils.normalizeMutedPathTarget({
          ...nextMutedEntry,
          logTitleSnapshot
        })
        : nextMutedEntry;
      if (!mutedEntry) return null;
      mutedPathRuntime.setTargets(pathAlertUtils.upsertMutedPathTargetEntry(mutedPathRuntime.getTargets(), mutedEntry));
      persistMutedPathTargets();
      renderMutedAlertStatePanel(nowMs);
      updateMutedPathAlertLogCards(targetKey, nowMs);
      syncMutedPathLogTimer();
      return mutedEntry;
    }

    function buildMutedPathLegKey(legOrEntry) {
      return mutedPathLegUtils.buildMutedPathLegKey(legOrEntry);
    }

    function pruneMutedPathLegsInPlace(nowMs = getNow()) {
      return mutedPathRuntime.pruneLegs(nowMs);
    }

    function invalidateArbRuleSnapshotCache() {
      if (!deps.arbAlertBridgeRuntime || typeof deps.arbAlertBridgeRuntime.invalidateRuleSnapshot !== 'function') {
        return false;
      }
      return deps.arbAlertBridgeRuntime.invalidateRuleSnapshot();
    }

    function refreshArbViewsAfterMutedPathLegChange(options = {}) {
      if (
        !deps.arbAlertBridgeRuntime
        || typeof deps.arbAlertBridgeRuntime.refreshArbViewsAfterMutedPathLegChange !== 'function'
      ) {
        return null;
      }
      return deps.arbAlertBridgeRuntime.refreshArbViewsAfterMutedPathLegChange(options);
    }

    function refreshArbPanel() {
      if (!deps.arbAlertBridgeRuntime || typeof deps.arbAlertBridgeRuntime.refreshArbPanel !== 'function') {
        return false;
      }
      return deps.arbAlertBridgeRuntime.refreshArbPanel();
    }

    function triggerMutedPathLegRefresh(options = {}) {
      invalidateArbRuleSnapshotCache();
      evaluatePathAlertsOnce();
      renderMutedAlertStatePanel(getNow());
      renderAlertSettingsPanel();
      updateAlertSoundState();
      refreshArbViewsAfterMutedPathLegChange(options);
    }

    function muteArbDetailLeg(leg, durationHours, nowMs = getNow()) {
      if (!leg) return null;
      const durationMs = Number(durationHours) * 60 * 60 * 1000;
      if (!Number.isFinite(durationMs) || durationMs <= 0) return null;
      const legKey = buildMutedPathLegKey(leg);
      if (!legKey) return null;
      pruneMutedPathLegsInPlace(nowMs);
      const existingEntry = mutedPathLegUtils.findMutedPathLegByKey(mutedPathRuntime.getLegs(), legKey);
      const nextEntry = existingEntry
        ? mutedPathLegUtils.extendMutedPathLegEntry(existingEntry, nowMs, durationMs)
        : mutedPathLegUtils.createMutedPathLegEntry(
          leg,
          nowMs,
          durationMs,
          { titleSnapshot: buildMutedPathLegTitleSnapshot(leg) }
        );
      if (!nextEntry) return null;
      const mutedEntry = !String(nextEntry.titleSnapshot || '').trim()
        ? mutedPathLegUtils.normalizeMutedPathLeg({
          ...nextEntry,
          titleSnapshot: buildMutedPathLegTitleSnapshot(leg)
        })
        : nextEntry;
      if (!mutedEntry) return null;
      mutedPathRuntime.setLegs(mutedPathLegUtils.upsertMutedPathLegEntry(mutedPathRuntime.getLegs(), mutedEntry));
      persistMutedPathLegs();
      syncMutedPathLogTimer();
      triggerMutedPathLegRefresh({ closeDetail: true });
      return mutedEntry;
    }

    function extendMutedPathTargetByKey(targetKey, nowMs = getNow()) {
      if (!targetKey) return null;
      pruneMutedPathTargetsInPlace(nowMs);
      const existingEntry = pathAlertUtils.findMutedPathTargetByKey(mutedPathRuntime.getTargets(), targetKey);
      if (!existingEntry) return null;
      const nextEntry = pathAlertUtils.extendMutedPathTargetEntry(existingEntry, nowMs, muteExtendDurationMs);
      if (!nextEntry) return null;
      mutedPathRuntime.setTargets(pathAlertUtils.upsertMutedPathTargetEntry(mutedPathRuntime.getTargets(), nextEntry));
      persistMutedPathTargets();
      renderMutedAlertStatePanel(nowMs);
      updateMutedPathAlertLogCards(targetKey, nowMs);
      syncMutedPathLogTimer();
      return nextEntry;
    }

    function removeMutedPathTargetByKey(targetKey, nowMs = getNow()) {
      if (!targetKey) return;
      mutedPathRuntime.setTargets(pathAlertUtils.removeMutedPathTargetByKey(mutedPathRuntime.getTargets(), targetKey));
      persistMutedPathTargets();
      renderMutedAlertStatePanel(nowMs);
      updateMutedPathAlertLogCards(targetKey, nowMs);
      syncMutedPathLogTimer();
    }

    function extendMutedPathLegByKey(targetKey, nowMs = getNow()) {
      if (!targetKey) return null;
      pruneMutedPathLegsInPlace(nowMs);
      const existingEntry = mutedPathLegUtils.findMutedPathLegByKey(mutedPathRuntime.getLegs(), targetKey);
      if (!existingEntry) return null;
      const nextEntry = mutedPathLegUtils.extendMutedPathLegEntry(existingEntry, nowMs, mutedPathLegExtendDurationMs);
      if (!nextEntry) return null;
      mutedPathRuntime.setLegs(mutedPathLegUtils.upsertMutedPathLegEntry(mutedPathRuntime.getLegs(), nextEntry));
      persistMutedPathLegs();
      syncMutedPathLogTimer();
      triggerMutedPathLegRefresh({ closeDetail: false });
      return nextEntry;
    }

    function removeMutedPathLegByKey(targetKey, nowMs = getNow()) {
      if (!targetKey) return;
      mutedPathRuntime.setLegs(mutedPathLegUtils.removeMutedPathLegByKey(mutedPathRuntime.getLegs(), targetKey));
      persistMutedPathLegs();
      syncMutedPathLogTimer();
      triggerMutedPathLegRefresh({ closeDetail: false });
    }

    function updateMutedPathAlertLogCards(targetKey = '', nowMs = getNow()) {
      const containers = [refs.alertLogContent, refs.alertLogMutedLogContent].filter(Boolean);
      if (!containers.length) return;
      pruneMutedPathTargetsInPlace(nowMs);
      containers.forEach((container) => {
        const cards = container.querySelectorAll('.log-entry[data-muted-target-key]');
        cards.forEach((card) => {
          if (targetKey && card.dataset.mutedTargetKey !== targetKey) return;
          const resolvedEntry = pathAlertUtils.findMutedPathTargetByKey(
            mutedPathRuntime.getTargets(),
            card.dataset.mutedTargetKey
          );
          const statusState = alertLogUiUtils.buildAlertLogMutedStatusState(resolvedEntry, {
            statusText: resolvedEntry ? pathAlertUtils.buildMutedPathStatusText(resolvedEntry, nowMs) : ''
          });
          alertLogUiUtils.applyAlertLogMutedStatusDomState(card, statusState);
        });
      });
    }

    function renderMutedAlertStatePanel(nowMs = getNow()) {
      if (!refs.alertLogMutedContent) return;
      bindAlertContentInteractionRuntime(mutedAlertStateInteractionRuntime, refs.alertLogMutedContent);
      pruneMutedPathTargetsInPlace(nowMs);
      pruneMutedPathLegsInPlace(nowMs);
      const panelHtml = alertLogUiUtils.buildMutedAlertStatePanelHtml({
        mutedPathTargets: mutedPathRuntime.getTargets(),
        mutedPathLegs: mutedPathRuntime.getLegs(),
        buildPathTargetKey: buildMutedPathTargetKey,
        buildPathStatusText: (entry) => pathAlertUtils.buildMutedPathStatusText(entry, nowMs),
        buildLegKey: buildMutedPathLegKey,
        buildLegTitle: (entry) => (
          entry && entry.titleSnapshot
          || buildLiveQuoteLabel(entry && entry.chain, entry && entry.fromSymbol, entry && entry.toSymbol)
        ),
        buildLegStatusText: (entry) => pathAlertUtils.buildMutedPathLegStatusText(entry, nowMs)
      });
      mutedAlertStateHtmlRenderer.render(refs.alertLogMutedContent, panelHtml);
    }

    function renderAlertSettingsPanel() {
      if (!refs.alertLogSettingsContent) return;
      bindAlertContentInteractionRuntime(alertSettingsInteractionRuntime, refs.alertLogSettingsContent);
      alertSettingsHtmlRenderer.render(refs.alertLogSettingsContent, alertLogUiUtils.buildAlertSettingsPanelHtml({
        settings: pathAlertConfig.settings || {},
        forceImmediateAlerts: pathAlertRuntimeState.isForceImmediateEnabled()
      }));
    }

    function renderAlertLogTabState() {
      alertLogUiUtils.applyAlertLogTabDomState({
        logTab: refs.alertLogLogTab,
        mutedLogTab: refs.alertLogMutedLogTab,
        mutedTab: refs.alertLogMutedTab,
        settingsTab: refs.alertLogSettingsTab,
        logContent: refs.alertLogContent,
        mutedLogContent: refs.alertLogMutedLogContent,
        mutedContent: refs.alertLogMutedContent,
        settingsContent: refs.alertLogSettingsContent
      }, alertLogTabRuntime.getState(), {
        renderMutedAlertStatePanel: () => renderMutedAlertStatePanel(getNow()),
        renderAlertSettingsPanel
      });
    }

    function refreshMutedPathRuntime(nowMs = getNow()) {
      const previousLegKeys = mutedPathRuntime.getLegKeySnapshot(buildMutedPathLegKey);
      pruneMutedPathTargetsInPlace(nowMs);
      pruneMutedPathLegsInPlace(nowMs);
      persistMutedPathTargets();
      persistMutedPathLegs();
      if (dashboardRuntimeUtils.isPanelVisible(refs.alertLogWindow)) {
        updateMutedPathAlertLogCards('', nowMs);
        if (alertLogTabRuntime.isActive('muted')) {
          renderMutedAlertStatePanel(nowMs);
        }
      }
      const nextLegKeys = mutedPathRuntime.getLegKeySnapshot(buildMutedPathLegKey);
      if (previousLegKeys !== nextLegKeys) {
        triggerMutedPathLegRefresh({ closeDetail: false });
      }
      return mutedPathRuntime.hasEntries();
    }

    function syncMutedPathLogTimer() {
      mutedPathRuntime.syncRefresh(refreshMutedPathRuntime);
    }

    function restoreMutedAlertLogEntries(nowMs = getNow()) {
      if (!refs.alertLogMutedLogContent || !mutedPathRuntime.getTargets().length) return;
      const renderPlan = alertLogUiUtils.buildRestoredMutedAlertLogPlan(mutedPathRuntime.getTargets(), {
        buildTargetKey: buildMutedPathTargetKey,
        buildStatusText: (entry) => pathAlertUtils.buildMutedPathStatusText(entry, nowMs)
      });
      renderPlan.forEach((item) => {
        if (alertLogUiUtils.hasMutedTargetLogCard(
          refs.alertLogMutedLogContent,
          item.targetKey,
          {
            escapeCssAttributeValue: (value) => domRenderUtils.escapeCssAttributeValue(value)
          }
        )) {
          return;
        }
        const card = domRenderUtils.createElementFromHtml(
          alertLogUiUtils.buildRestoredMutedAlertLogHtml(item.entry, {
            nowMs,
            targetKey: item.targetKey,
            statusText: item.statusText
          })
        );
        if (card) {
          refs.alertLogMutedLogContent.prepend(card);
        }
      });
      updateMutedPathAlertLogCards('', nowMs);
      syncMutedPathLogTimer();
      arbRuntimeMemoryUtils.trimContainerChildren(refs.alertLogMutedLogContent, maxLogEntries);
    }

    function appendPathAlertLogEntries(entries, nowMs = getNow()) {
      if (!refs.alertLogWindow || !refs.alertLogContent) return;
      const appendPlan = alertLogUiUtils.buildAlertLogAppendPlan(entries);
      if (!appendPlan.entries.length) return;
      if (appendPlan.shouldAutoOpen) {
        applyAlertLogPanelDisplay('open');
      }
      const destinations = [];
      for (const entry of appendPlan.entries) {
        const mutedEntry = entry && entry.mutedTargetCandidate
          ? getMutedPathTargetEntry(entry.mutedTargetCandidate, nowMs)
          : null;
        const card = domRenderUtils.createElementFromHtml(
          alertLogUiUtils.buildPathAlertLogCardHtml(entry, {
            nowMs,
            mutedEntry,
            targetKey: entry && entry.mutedTargetCandidate ? buildMutedPathTargetKey(entry.mutedTargetCandidate) : '',
            statusText: mutedEntry ? pathAlertUtils.buildMutedPathStatusText(mutedEntry, nowMs) : '已触发',
            profitText: pathAlertNotificationUtils.formatPathAlertEvaluationText(entry && entry.evaluation)
          })
        );
        if (card) {
          const destination = alertLogCardInsertionRuntime.prepend(entry, card);
          if (destination) destinations.push(destination);
        }
      }
      alertLogCardInsertionRuntime.finalize(destinations, nowMs);
    }

    function unlockAudio() {
      void alertAudioRuntime.unlockAndReport();
    }

    function bindAudioUnlockEvents() {
      const body = deps.bodyEl || (documentImpl && documentImpl.body);
      if (!body || typeof body.addEventListener !== 'function') return;
      body.addEventListener('click', unlockAudio, { once: true });
      body.addEventListener('pointerdown', unlockAudio, { once: true });
      body.addEventListener('touchstart', unlockAudio, { once: true });
      body.addEventListener('keydown', unlockAudio, { once: true });
    }

    function pruneInactiveAlertRuntimeState() {
      pathAlertRuntimeState.pruneInactive(pathAlertConfig && pathAlertConfig.alerts);
    }

    function filterWatchedPathAlertEvaluationAlerts(alerts) {
      if (arbPathConfigUtils && typeof arbPathConfigUtils.filterWatchedRuleAlerts === 'function') {
        return arbPathConfigUtils.filterWatchedRuleAlerts(alerts, arbPathConfig);
      }
      return Array.isArray(alerts) ? alerts : [];
    }

    function getActiveWatchedPathAlertEvaluationAlerts() {
      return filterWatchedPathAlertEvaluationAlerts(
        dashboardRuntimeUtils.getActivePathAlertEvaluationAlerts(pathAlertConfig)
      );
    }

    function filterWatchedQuoteAlerts(alerts) {
      if (arbPathConfigUtils && typeof arbPathConfigUtils.filterWatchedQuoteAlerts === 'function') {
        return arbPathConfigUtils.filterWatchedQuoteAlerts(alerts, arbPathConfig);
      }
      return Array.isArray(alerts) ? alerts : [];
    }

    function hasActiveWatchedPathAlertEvaluationTarget() {
      const hasActiveTarget = typeof dashboardRuntimeUtils.hasActivePathAlertEvaluationTarget === 'function'
        ? dashboardRuntimeUtils.hasActivePathAlertEvaluationTarget(pathAlertConfig)
        : dashboardRuntimeUtils.getActivePathAlertEvaluationAlerts(pathAlertConfig).length > 0;
      if (!hasActiveTarget) return false;
      if (!arbPathConfigUtils || typeof arbPathConfigUtils.filterWatchedRuleAlerts !== 'function') {
        return true;
      }
      return getActiveWatchedPathAlertEvaluationAlerts().length > 0;
    }

    function buildRuleAlertEvaluation(target, alert = null, sharedRuleSnapshot = getSharedArbRuleSnapshot()) {
      if (
        !deps.arbAlertBridgeRuntime
        || typeof deps.arbAlertBridgeRuntime.buildRuleAlertEvaluation !== 'function'
      ) {
        return { available: false };
      }
      const nowMs = getNow();
      return deps.arbAlertBridgeRuntime.buildRuleAlertEvaluation(target, alert, sharedRuleSnapshot, {
        isMutedCycle(candidate) {
          const muteTarget = candidate && Array.isArray(candidate.legs)
            ? buildMutedPathTargetFromCycleLegs(candidate.legs)
            : null;
          return Boolean(muteTarget && getMutedPathTargetEntry(muteTarget, nowMs));
        }
      });
    }

    function buildQuoteAlertSummaryLabel(target) {
      const match = findQuoteById(Number(target && target.quoteId));
      const quote = match ? match.quote : null;
      const monitorState = quote ? getQuoteMarketState(Number(quote.id)) : null;
      return pathAlertPageUtils.buildQuoteAlertSummaryLabel(target, quote, monitorState || {}, {
        buildQuoteAlertDisplayLabel,
        getQuoteAlertDirection: (item) => pathAlertNotificationUtils.getQuoteAlertDirection(item)
      });
    }

    function buildPathAlertSummaryLines(alert) {
      return pathAlertPageUtils.buildPathAlertPageSummaryLines(alert, {
        getDisplayTitle: (item) => String(item && item.name || '').trim(),
        buildQuoteAlertThresholdLine: (target) => pathAlertNotificationUtils.buildQuoteAlertThresholdLine(target),
        buildQuoteAlertQuoteLabel: buildQuoteAlertSummaryLabel,
        buildQuoteAlertRuleLine: (target) => pathAlertNotificationUtils.buildQuoteAlertSummaryRuleLine(target),
        buildPathAlertSummaryLines: (item, options) => pathAlertUtils.buildPathAlertSummaryLines(item, options),
        formatLeg(leg) {
          const match = findQuoteById(Number(leg.quoteId));
          const state = match ? getQuoteMarketState(Number(leg.quoteId)) : null;
          return pathAlertPageUtils.buildPathAlertSummaryLegLine(leg, state, {
            buildQuoteLabel: buildLiveQuoteLabel
          });
        },
        findRule(ruleKind, ruleId) {
          const sourceList = pathAlertRuleDefinitions.getRuleDefinitions(ruleKind);
          return sourceList.find((item) => item.id === ruleId) || null;
        }
      });
    }

    function buildPathAlertLegDisplayLine(leg) {
      return pathAlertPageUtils.buildPathAlertLegDisplayLine(leg, {
        buildQuoteLabel: buildLiveQuoteLabel
      });
    }

    function buildMutedPathTargetFromCycleLegs(legs) {
      return pathAlertNotificationUtils.buildMutedPathTargetFromCycleLegs(legs, { isRuleLeg });
    }

    async function sendPathAlertWebhookPayload(payload, errorMessage) {
      if (!pathAlertConfig.settings || pathAlertConfig.settings.webhookEnabled !== true) return;
      try {
        const response = await fetchImpl(`${backendUrl}/api/send-path-alert-webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error((data && data.error) || '请求失败');
        }
      } catch (error) {
        logError(errorMessage, error);
      }
    }

    function recordAlertDebug(kind, id, snapshot) {
      if (!alertDebugController || typeof alertDebugController.record !== 'function') return;
      alertDebugController.record(kind, id, snapshot);
    }

    function buildRuntimeDebugSnapshot(previous, next, evaluation) {
      return alertDebugUtils.buildRuntimeDebugSnapshot(previous, next, evaluation);
    }

    function buildTriggeredPathAlertEntry(alert, evaluation, changedLegs) {
      return pathAlertNotificationUtils.buildTriggeredPathAlertEntry({
        alert,
        evaluation,
        changedLegs,
        buildDisplayTitle(alertItem) {
          const name = String(alertItem && alertItem.name || '').trim();
          if (name) return name;
          const lines = buildPathAlertSummaryLines(alertItem);
          return lines[0] || (alertItem && alertItem.target && alertItem.target.type === 'quote' ? '交易对报警' : '未配置路径');
        },
        buildFallbackSummaryLines: buildPathAlertSummaryLines,
        buildMutedTargetCandidate: (alertItem, alertEvaluation) => (
          pathAlertNotificationUtils.buildMutedPathTargetCandidate(alertItem, alertEvaluation, { isRuleLeg })
        ),
        formatCycleLeg: formatArbPathLegLine,
        formatChangedLeg: buildPathAlertLegDisplayLine,
        getRealLegCount: (alertItem, alertEvaluation) => (
          pathAlertUtils.countPathAlertRealLegs(alertItem, alertEvaluation)
        ),
        isRuleLeg
      });
    }

    function sortTriggeredPathAlertEntries(entries) {
      return pathAlertNotificationUtils.sortTriggeredPathAlertEntries(entries, {
        sortEntries: pathAlertUtils.sortTriggeredPathAlerts,
        getRealLegCount: (alertItem, alertEvaluation) => (
          pathAlertUtils.countPathAlertRealLegs(alertItem, alertEvaluation)
        )
      });
    }

    function evaluatePathAlertsOnce() {
      const evaluationAlerts = getActiveWatchedPathAlertEvaluationAlerts();
      if (!evaluationAlerts.length) {
        pruneInactiveAlertRuntimeState();
        updateAlertSoundState();
        return;
      }
      pruneMutedPathTargetsInPlace(getNow());
      const sharedRuleSnapshot = getSharedArbRuleSnapshot();
      const context = {
        quoteStateById: getQuoteMarketStateMap(),
        resolveRuleEvaluation(target, alert) {
          return buildRuleAlertEvaluation(target, alert, sharedRuleSnapshot);
        }
      };
      const allLegSnapshots = pathAlertUtils.buildAllLegSnapshots(sharedRuleSnapshot.allQuotes || [], getQuoteMarketStateMap());
      const nowMs = getNow();
      const logTriggeredEntries = [];
      const remoteTriggeredEntries = [];
      let shouldRefreshArbPanelHighlights = false;

      for (const alert of evaluationAlerts) {
        const runtimeAlert = pathAlertUtils.buildEffectiveRuntimeAlert(alert, {
          forceImmediate: pathAlertRuntimeState.isForceImmediateEnabled()
        });
        const evaluation = pathAlertUtils.evaluatePathAlert(alert, context);
        const previous = pathAlertRuntimeState.get(alert.id);
        const next = pathAlertUtils.advancePathAlertRuntime(runtimeAlert, previous, evaluation, nowMs);
        const snapshotState = pathAlertUtils.resolvePathAlertSnapshotState(runtimeAlert, previous, next, evaluation, allLegSnapshots);
        next.evaluation = evaluation;
        const debugKind = alert && alert.target && alert.target.type === 'rule' && alert.target.ruleKind === 'special'
          ? 'special'
          : 'path';
        recordAlertDebug(
          debugKind,
          alert.id,
          buildRuntimeDebugSnapshot(previous, next, evaluation)
        );
        let isMuted = false;
        if (next.shouldTrigger) {
          const changedLegs = pathAlertUtils.buildTriggeredPathAlertChangedLegs(
            snapshotState,
            pathAlertConfig.settings
          );
          const triggeredEntry = buildTriggeredPathAlertEntry(alert, evaluation, changedLegs);
          const mutedEntry = triggeredEntry.mutedTargetCandidate
            ? getMutedPathTargetEntry(triggeredEntry.mutedTargetCandidate, nowMs)
            : null;
          if (mutedEntry) {
            triggeredEntry.mutedEntry = mutedEntry;
            isMuted = true;
          }
          if (markTriggeredArbOpportunities(alert, evaluation, nowMs)) {
            shouldRefreshArbPanelHighlights = true;
          }
          logTriggeredEntries.push(triggeredEntry);
          if (!isMuted) {
            remoteTriggeredEntries.push(triggeredEntry);
          }
        }
        next.isSoundActive = pathAlertUtils.shouldActivatePathAlertSound(next, {
          muted: isMuted,
          settings: pathAlertConfig.settings
        });
        pathAlertRuntimeState.set(alert.id, next);
      }

      pruneInactiveAlertRuntimeState();

      const sortedLogEntries = sortTriggeredPathAlertEntries(logTriggeredEntries).slice(0, 3);
      if (sortedLogEntries.length) {
        appendPathAlertLogEntries(sortedLogEntries, nowMs);
      }
      const aggregatedEntries = sortTriggeredPathAlertEntries(remoteTriggeredEntries).slice(0, 3);
      if (aggregatedEntries.length) {
        const payload = pathAlertNotificationUtils.buildPathAlertWebhookPayload(aggregatedEntries);
        sendPathAlertWebhookPayload(payload, '路径报警 webhook 发送失败:');
      }

      updateAlertSoundState();
      if (shouldRefreshArbPanelHighlights) {
        refreshArbPanel();
      }
      renderAlertSettingsPanel();
    }

    function restartPathAlertScheduler() {
      pathAlertSchedulerRuntime.restartEvaluation({
        hasActiveTarget: hasActiveWatchedPathAlertEvaluationTarget,
        intervalMs: pathAlertConfig && pathAlertConfig.settings
          ? pathAlertConfig.settings.pathAlertEvalIntervalMs
          : 0,
        evaluate: evaluatePathAlertsOnce
      });
    }

    function schedulePathAlertEvaluation(options = {}) {
      if (!hasActiveWatchedPathAlertEvaluationTarget()) return false;

      const delayMs = Number.isFinite(Number(options.delayMs))
        ? Number(options.delayMs)
        : pathAlertMarketChangeDelayMs;
      if (typeof pathAlertSchedulerRuntime.scheduleEvaluation === 'function') {
        return pathAlertSchedulerRuntime.scheduleEvaluation(evaluatePathAlertsOnce, delayMs);
      }
      evaluatePathAlertsOnce();
      return true;
    }

    function emitPathAlertConfigSync(source) {
      try {
        const storage = deps.getDashboardLocalStorage();
        if (storage) {
          storage.setItem(
            pathAlertUtils.PATH_ALERT_CONFIG_SYNC_KEY,
            pathAlertUtils.buildPathAlertConfigSyncPayload(source)
          );
        }
      } catch (error) {
        logWarning('[path-alert-config] sync emit failed', error);
      }
    }

    function scheduleExternalPathAlertReload(reason) {
      pathAlertSchedulerRuntime.scheduleExternalReload(() => {
        reloadPathAlertConfigFromServer().catch((error) => {
          logError('[path-alert-config] external reload failed', reason, error);
        });
      });
    }

    function handlePathAlertConfigSyncStorage(event) {
      const action = pathAlertUtils.resolvePathAlertConfigSyncStorageAction(event, {
        localSource: pathAlertUtils.PATH_ALERT_CONFIG_SYNC_SOURCE_MAIN
      });
      if (action.type !== 'reload') return;
      if (action.invalidPayload) {
        logWarning('[path-alert-config] invalid sync payload', action.error);
      }
      scheduleExternalPathAlertReload(action.reason);
    }

    async function persistPathAlertConfig() {
      const normalized = pathAlertUtils.normalizeAlertConfig(pathAlertConfig);
      pathAlertConfig = normalized;
      await fetchImpl(`${backendUrl}/api/save-alert-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized)
      });
      restartPathAlertScheduler();
      renderAlertSettingsPanel();
      emitPathAlertConfigSync(pathAlertUtils.PATH_ALERT_CONFIG_SYNC_SOURCE_MAIN);
    }

    function queuePathAlertConfigSave() {
      pathAlertSchedulerRuntime.scheduleConfigSave(() => {
        persistPathAlertConfig().catch((error) => logError('保存路径报警配置失败:', error));
      });
    }

    function applyAlertLogPanelDisplay(action) {
      return deps.applyFloatingPanelDisplay(refs.alertLogWindow, action, {
        render: renderAlertLogTabState,
        afterApply: syncMutedPathLogTimer
      });
    }

    function toggleAlertLogPanel() {
      applyAlertLogPanelDisplay('toggle');
    }

    function openAlertLogSettingsPanel() {
      if (!refs.alertLogWindow) return;
      alertLogTabRuntime.set('settings');
      applyAlertLogPanelDisplay('open');
    }

    function handleAlertLogClick(event) {
      const action = alertLogUiUtils.resolveAlertLogClickAction(event, { closestEventTarget: deps.closestEventTarget });
      if (action.type === 'set-tab') {
        alertLogTabRuntime.set(action.tab);
        renderAlertLogTabState();
        return;
      }
      if (action.type === 'copy-quote-dex-link') {
        event.preventDefault();
        if (typeof deps.copyDexLinkFromElement === 'function') {
          void deps.copyDexLinkFromElement(action.element);
        }
        return;
      }
      if (action.type === 'extend-muted-path-target') {
        extendMutedPathTargetByKey(action.key, getNow());
        return;
      }
      if (action.type === 'restore-muted-path-target') {
        removeMutedPathTargetByKey(action.key, getNow());
        return;
      }
      if (action.type === 'extend-muted-path-leg') {
        extendMutedPathLegByKey(action.key, getNow());
        return;
      }
      if (action.type === 'restore-muted-path-leg') {
        removeMutedPathLegByKey(action.key, getNow());
        return;
      }
      if (action.type === 'mute-alert-target') {
        if (action.mutedTargetKey && extendMutedPathTargetByKey(action.mutedTargetKey, getNow())) {
          return;
        }
        const alertId = action.alertId;
        if (!alertId) return;
        const runtime = pathAlertRuntimeState.get(alertId);
        if (!runtime || !runtime.evaluation) return;
        const alert = (pathAlertConfig.alerts || []).find((item) => item && item.id === alertId);
        if (!alert || !alert.target) return;
        if (alert.target.type === 'quote') {
          const quote = dashboardRuntimeUtils.findDashboardQuoteById(getDashboardState(), alert.target.quoteId);
          if (!quote) return;
          const triggeredEntry = buildQuoteAlertTriggeredEntry(
            alert,
            quote,
            runtime.evaluation
          );
          mutePathAlertTarget(triggeredEntry, getNow());
          return;
        }
        const triggeredEntry = buildTriggeredPathAlertEntry(
          alert,
          runtime.evaluation,
          pathAlertUtils.buildTriggeredPathAlertChangedLegs(
            runtime,
            pathAlertConfig.settings
          )
        );
        mutePathAlertTarget(triggeredEntry, getNow());
        return;
      }
      if (action.type === 'ignore') return;
      if (action.type === 'expand-collapsed-card') {
        alertLogUiUtils.applyExpandedAlertLogCardDomState(action.card);
      }
    }

    function handleAlertSettingsChange(event) {
      const action = alertLogUiUtils.resolveAlertSettingsChangeAction(event, { closestEventTarget: deps.closestEventTarget });
      if (action.type === 'set-force-immediate') {
        const forceImmediateEnabled = pathAlertRuntimeState.setForceImmediate(action.checked);
        if (forceImmediateEnabled) {
          evaluatePathAlertsOnce();
          evaluateQuoteAlertsOnce();
          renderAlertSettingsPanel();
          return;
        }
        reloadPathAlertConfigFromServer().catch((error) => {
          logError('关闭全部立即后重新加载路径报警配置失败:', error);
        });
        return;
      }
      if (action.type !== 'set-global-toggle' || !pathAlertConfig.settings) return;
      pathAlertConfig.settings[action.key] = action.checked;
      queuePathAlertConfigSave();
      updateAlertSoundState();
      renderAlertSettingsPanel();
    }

    async function reloadPathAlertConfigFromServer() {
      if (pathAlertReloading) return;
      pathAlertReloading = true;
      renderAlertSettingsPanel();
      try {
        pathAlertRuntimeState.reset({ forceImmediate: false });
        pathAlertConfig = await pathAlertConfigClient.loadStrict();
        restartPathAlertScheduler();
      } finally {
        pathAlertReloading = false;
        renderAlertSettingsPanel();
      }
    }

    function evaluateQuoteAlertsOnce() {
      getDashboardState().flatMap((category) => category.quotes || []).forEach((quote) => {
        checkPriceForAlerts(quote);
      });
    }

    function playPathAlertSoundOnce() {
      if (pathAlertConfig?.settings?.localSoundEnabled === false) {
        logInfo('[quote-alert] sound skipped: local sound disabled');
        return;
      }
      if (!refs.pathAlertSound) {
        logWarning('[quote-alert] sound skipped: path alert audio element missing');
        return;
      }
      if (!alertAudioRuntime.isUnlocked()) {
        logWarning('[quote-alert] sound skipped: audio not unlocked');
        return;
      }
      audioUtils.playAudioOnceFromSource(refs.pathAlertSound, {
        AudioCtor: deps.AudioCtor || (windowImpl && windowImpl.Audio),
        logPlayError: (error) => logError('[quote-alert] sound play failed', error)
      });
    }

    function triggerAlert(quote, alert, evaluation) {
      const entry = buildQuoteAlertTriggeredEntry(alert, quote, evaluation);
      const mutedEntry = entry && entry.mutedTargetCandidate
        ? getMutedPathTargetEntry(entry.mutedTargetCandidate, getNow())
        : null;
      if (mutedEntry) {
        entry.mutedEntry = mutedEntry;
      }
      logInfo('[quote-alert] trigger', {
        quoteId: quote.id,
        chain: entry.displayName,
        label: entry.label,
        message: entry.message,
        currentValueText: entry.currentValueText,
        muted: Boolean(mutedEntry)
      });
      appendQuoteAlertLogEntry(entry, getNow());
      if (mutedEntry) {
        logInfo('[quote-alert] muted trigger skipped', {
          alertId: alert && alert.id,
          quoteId: quote.id
        });
        return;
      }
      playPathAlertSoundOnce();
      const payload = pathAlertNotificationUtils.buildQuoteAlertRemotePayloadForEntry(entry);
      sendPathAlertWebhookPayload(payload, '报价提醒远程推送失败:');
    }

    function checkPriceForAlerts(quote) {
      if (typeof deps.isQuotePaused === 'function' && deps.isQuotePaused(quote)) return;
      const quoteStateRuntime = getQuoteStateRuntime();
      const uiState = quoteStateRuntime.getUiState(quote.id);
      const quoteAlerts = filterWatchedQuoteAlerts(
        pathAlertUtils.getQuoteAlertsForQuoteId(pathAlertConfig, quote.id)
      );
      let hasTriggeredThisTick = false;

      for (const alert of quoteAlerts) {
        const previous = pathAlertRuntimeState.get(alert.id);
        const evaluation = pathAlertUtils.evaluatePathAlert(alert, { quoteStateById: getQuoteMarketStateMap() });
        const next = pathAlertUtils.advanceQuoteAlertRuntime(alert, previous, evaluation, {
          forceImmediate: pathAlertRuntimeState.isForceImmediateEnabled(),
          nowMs: getNow()
        });
        pathAlertRuntimeState.set(alert.id, next);
        recordAlertDebug(
          'quote',
          alert.id,
          buildRuntimeDebugSnapshot(previous, next)
        );
        if (!next.shouldTrigger) continue;
        hasTriggeredThisTick = true;
        triggerAlert(quote, alert, evaluation);
      }

      const itemEl = documentImpl.getElementById(`quote-item-${quote.id}`);
      const resultDiv = itemEl ? itemEl.querySelector('.quote-result') : null;
      const uiUpdate = dashboardRuntimeUtils.buildQuoteAlertUiUpdate(uiState, hasTriggeredThisTick);
      domRenderUtils.applyQuoteAlertHighlightUi(itemEl, uiUpdate);
      quoteStateRuntime.setUiState(quote.id, uiUpdate.nextState);
      domRenderUtils.applyQuoteAlertDismissButtonState(resultDiv, uiUpdate.nextState, quote.id, { documentImpl });
      updateAlertSoundState();
    }

    async function loadPathAlertConfig() {
      pathAlertConfig = await pathAlertConfigClient.load();
      return pathAlertConfig;
    }

    function loadMutedPathState() {
      mutedPathRuntime.setTargets(mutedPathStorageRuntime.loadTargets());
      mutedPathRuntime.setLegs(mutedPathStorageRuntime.loadLegs());
    }

    return {
      applyAlertLogPanelDisplay,
      bindAudioUnlockEvents,
      buildMutedPathLegKey,
      buildMutedPathTargetFromCycleLegs,
      buildMutedPathTargetKey,
      buildQuoteAlertDisplayLabel,
      checkPriceForAlerts,
      evaluatePathAlertsOnce,
      evaluateQuoteAlertsOnce,
      getConfig: () => pathAlertConfig,
      getMutedPathLegs: () => mutedPathRuntime.getLegs(),
      getMutedPathTargetEntry,
      handleAlertLogClick,
      handleAlertSettingsChange,
      handlePathAlertConfigSyncStorage,
      loadMutedPathState,
      loadPathAlertConfig,
      muteArbDetailLeg,
      openAlertLogSettingsPanel,
      pruneMutedPathLegsInPlace,
      renderAlertLogTabState,
      renderAlertSettingsPanel,
      renderMutedAlertStatePanel,
      restartPathAlertScheduler,
      restoreMutedAlertLogEntries,
      schedulePathAlertEvaluation,
      syncMutedPathLogTimer,
      toggleAlertLogPanel,
      updateAlertSoundState
    };
  }

  return {
    createAlertRuntimeController
  };
});
