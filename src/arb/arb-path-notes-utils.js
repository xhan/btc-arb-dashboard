(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.ArbPathNotesUtils = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MAX_NOTE_LENGTH = 500;

  function normalizeArbPathNotes(notes) {
    if (!notes || typeof notes !== 'object' || Array.isArray(notes)) return {};
    const normalized = {};
    for (const [ruleId, value] of Object.entries(notes)) {
      if (!String(ruleId).startsWith('fixed:')) continue;
      const note = String(value == null ? '' : value).trim().slice(0, MAX_NOTE_LENGTH);
      if (note) normalized[ruleId] = note;
    }
    return normalized;
  }

  function setArbPathNote(notes, ruleId, value) {
    const normalized = normalizeArbPathNotes(notes);
    const safeRuleId = String(ruleId || '').trim();
    if (!safeRuleId.startsWith('fixed:')) return normalized;
    const note = String(value == null ? '' : value).trim().slice(0, MAX_NOTE_LENGTH);
    if (note) normalized[safeRuleId] = note;
    else delete normalized[safeRuleId];
    return normalized;
  }

  return {
    MAX_NOTE_LENGTH,
    normalizeArbPathNotes,
    setArbPathNote
  };
}));
