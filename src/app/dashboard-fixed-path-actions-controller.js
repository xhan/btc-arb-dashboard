(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.DashboardFixedPathActionsController = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createDashboardFixedPathActionsController(options = {}) {
    const refs = options.refs || {};
    const fetchImpl = options.fetchImpl;
    const backendUrl = String(options.backendUrl || '');
    const notesUtils = options.arbPathNotesUtils;
    const editorUtils = options.pathAlertEditorUtils;
    const pageUtils = options.pathAlertPageUtils;
    const ruleDefinitions = options.pathAlertRuleDefinitions;
    const pathAlertUtils = options.pathAlertUtils;
    let notes = {};
    let activeRuleId = '';
    let alertDraft = null;
    let alertError = '';
    let initialized = false;
    let notesLoadPromise = null;

    function getRule(ruleId) {
      return ruleDefinitions && typeof ruleDefinitions.findRule === 'function'
        ? ruleDefinitions.findRule('fixed', ruleId)
        : null;
    }

    function setModalVisible(modal, visible) {
      if (!modal || !modal.classList) return;
      modal.classList.toggle
        ? modal.classList.toggle('visible', visible)
        : (visible ? modal.classList.add('visible') : modal.classList.remove('visible'));
    }

    function closeNote() {
      setModalVisible(refs.noteModal, false);
      if (refs.noteError) refs.noteError.textContent = '';
    }

    function closeAlert() {
      setModalVisible(refs.alertModal, false);
      alertDraft = null;
      alertError = '';
    }

    function closeAll() {
      closeNote();
      closeAlert();
    }

    function findFixedRuleAlert(ruleId) {
      const config = typeof options.getAlertConfig === 'function' ? options.getAlertConfig() : null;
      return (Array.isArray(config && config.alerts) ? config.alerts : []).find((alert) => (
        alert
        && alert.target
        && alert.target.type === 'rule'
        && alert.target.ruleKind === 'fixed'
        && alert.target.ruleId === ruleId
      )) || null;
    }

    function syncNoteIndicators() {
      if (!options.documentImpl || typeof options.documentImpl.querySelectorAll !== 'function') return;
      const buttons = options.documentImpl.querySelectorAll('[data-arb-fixed-note-rule-id]');
      for (const button of buttons) {
        const ruleId = button && button.dataset ? button.dataset.arbFixedNoteRuleId : '';
        if (!button || !button.classList) continue;
        if (notes[ruleId]) button.classList.add('has-note');
        else button.classList.remove('has-note');
      }
    }

    function notifyNotesChanged() {
      syncNoteIndicators();
      if (typeof options.onNotesChanged === 'function') options.onNotesChanged(notes);
    }

    function buildEditorDraft(alert) {
      const config = typeof options.getAlertConfig === 'function' ? options.getAlertConfig() : null;
      return editorUtils.buildPathAlertEditorDraftFromAlert(alert, {
        defaultCooldownSec: config && config.settings && config.settings.defaultCooldownSec,
        normalizePathAlert: (value) => pathAlertUtils.normalizePathAlert(value, config && config.settings)
      });
    }

    function renderAlertEditor() {
      if (!refs.alertEditor) return;
      const rule = getRule(activeRuleId);
      if (!alertDraft) {
        refs.alertEditor.innerHTML = '<div class="path-alert-editor-unconfigured">尚未配置</div>';
        return;
      }
      const config = typeof options.getAlertConfig === 'function' ? options.getAlertConfig() : null;
      const summaryHtml = pageUtils.renderPathAlertRouteLinesHtml(
        [rule && rule.title ? rule.title : activeRuleId],
        'summary-line'
      );
      refs.alertEditor.innerHTML = editorUtils.renderPathAlertEditorHtml({
        mode: 'edit',
        draft: alertDraft,
        errorMessage: alertError,
        summaryHtml,
        defaultCooldownSec: config && config.settings && config.settings.defaultCooldownSec
      });
    }

    function openNote(ruleId) {
      const rule = getRule(ruleId);
      if (!rule) return false;
      closeAll();
      activeRuleId = rule.id;
      if (refs.noteTitle) refs.noteTitle.textContent = `${rule.title} · Note`;
      if (refs.noteTextarea) refs.noteTextarea.value = notes[rule.id] || '';
      setModalVisible(refs.noteModal, true);
      if (refs.noteTextarea && typeof refs.noteTextarea.focus === 'function') refs.noteTextarea.focus();
      return true;
    }

    function openAlert(ruleId) {
      const rule = getRule(ruleId);
      closeAll();
      activeRuleId = String(ruleId || '');
      if (refs.alertTitle) refs.alertTitle.textContent = `${rule && rule.title ? rule.title : activeRuleId} · 报警设置`;
      const alert = findFixedRuleAlert(activeRuleId);
      alertDraft = alert ? buildEditorDraft(alert) : null;
      renderAlertEditor();
      setModalVisible(refs.alertModal, true);
      return Boolean(alert);
    }

    async function loadNotes() {
      const response = await fetchImpl(`${backendUrl}/api/arb-path-notes`);
      if (!response.ok) throw new Error('获取固定路径备注失败');
      notes = notesUtils.normalizeArbPathNotes(await response.json());
      notifyNotesChanged();
      return notes;
    }

    async function saveNote() {
      if (!activeRuleId || !refs.noteTextarea) return false;
      try {
        await (notesLoadPromise || initialize());
        const nextNotes = notesUtils.setArbPathNote(notes, activeRuleId, refs.noteTextarea.value);
        const response = await fetchImpl(`${backendUrl}/api/arb-path-notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextNotes)
        });
        if (!response.ok) throw new Error('保存固定路径备注失败');
        const payload = await response.json().catch(() => null);
        notes = notesUtils.normalizeArbPathNotes(payload && payload.notes ? payload.notes : nextNotes);
        notifyNotesChanged();
        closeNote();
        return true;
      } catch (error) {
        if (refs.noteError) refs.noteError.textContent = error.message || '保存失败';
        return false;
      }
    }

    function handleAlertFieldChange(event) {
      if (!alertDraft || !event || !event.target) return false;
      const config = typeof options.getAlertConfig === 'function' ? options.getAlertConfig() : null;
      return editorUtils.updatePathAlertEditorDraftField(alertDraft, event.target, {
        defaultCooldownSec: config && config.settings && config.settings.defaultCooldownSec
      });
    }

    async function saveAlert() {
      if (!alertDraft) return false;
      const config = typeof options.getAlertConfig === 'function' ? options.getAlertConfig() : null;
      const error = editorUtils.validatePathAlertEditorDraft(alertDraft, {
        findRule: (kind, ruleId) => ruleDefinitions.findRule(kind, ruleId)
      });
      if (error) {
        alertError = error;
        renderAlertEditor();
        return false;
      }
      const nextAlert = editorUtils.buildPathAlertFromEditorDraft(alertDraft, {
        defaultCooldownSec: config && config.settings && config.settings.defaultCooldownSec,
        buildDefaultAlertName: () => '',
        normalizePathAlert: (value) => pathAlertUtils.normalizePathAlert(value, config && config.settings)
      });
      const nextConfig = pathAlertUtils.normalizeAlertConfig({
        ...config,
        alerts: (config.alerts || []).map((alert) => alert.id === nextAlert.id ? nextAlert : alert)
      });
      try {
        await options.saveAlertConfig(nextConfig);
        closeAlert();
        if (typeof options.onAlertChanged === 'function') options.onAlertChanged(nextAlert);
        return true;
      } catch (saveError) {
        alertError = saveError.message || '保存报警配置失败';
        renderAlertEditor();
        return false;
      }
    }

    function bindEvents() {
      if (refs.noteSaveBtn) refs.noteSaveBtn.addEventListener('click', () => { void saveNote(); });
      if (refs.noteCancelBtn) refs.noteCancelBtn.addEventListener('click', closeNote);
      if (refs.noteCloseBtn) refs.noteCloseBtn.addEventListener('click', closeNote);
      if (refs.alertCloseBtn) refs.alertCloseBtn.addEventListener('click', closeAlert);
      if (refs.alertEditor) {
        refs.alertEditor.addEventListener('input', handleAlertFieldChange);
        refs.alertEditor.addEventListener('change', (event) => {
          handleAlertFieldChange(event);
          if (event.target && event.target.id === 'editor-trigger') renderAlertEditor();
        });
        refs.alertEditor.addEventListener('click', (event) => {
          if (event.target.closest('#editor-save-btn')) void saveAlert();
          else if (event.target.closest('#editor-cancel-btn')) closeAlert();
        });
      }
      if (options.documentImpl) {
        options.documentImpl.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') closeAll();
        });
      }
    }

    async function initialize() {
      if (!initialized) {
        initialized = true;
        bindEvents();
      }
      if (!notesLoadPromise) notesLoadPromise = loadNotes();
      return notesLoadPromise;
    }

    return {
      closeAll,
      getNotes: () => ({ ...notes }),
      handleAlertFieldChange,
      initialize,
      openAlert,
      openNote,
      saveAlert,
      saveNote
    };
  }

  return {
    createDashboardFixedPathActionsController
  };
}));
