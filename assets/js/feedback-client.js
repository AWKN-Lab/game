(function (global) {
  'use strict';

  function cleanText(value, max) {
    return String(value || '').trim().slice(0, max || 1000);
  }

  var DRAFT_KEY = 'st_feedback_draft_v1';

  function saveDraft(payload) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ payload: payload, savedAt: new Date().toISOString() })); } catch (e) { /* 存储不可用时静默跳过 */ }
  }
  function peekDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      var draft = JSON.parse(raw);
      return draft && draft.payload ? draft : null;
    } catch (e) { return null; }
  }
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* 忽略 */ }
  }

  async function submit(input) {
    input = input || {};
    var identity = global.TTIdentity?.getContext?.() || {};
    var payload = {
      anonymousId: identity.anonymousId || null,
      sessionId: identity.sessionId || null,
      role: identity.role || 'student',
      category: cleanText(input.category || 'general', 40),
      contextType: cleanText(input.contextType || 'page', 40),
      contextId: cleanText(input.contextId || '', 100),
      scriptId: cleanText(input.scriptId || '', 80),
      rating: Number(input.rating || 0) || null,
      message: cleanText(input.message, 1200),
      page: location.pathname
    };
    if (payload.message.length < 2) throw new Error('请至少写两个字');
    var response;
    try {
      response = await global.TTApi.post('/feedback', payload, { timeoutMs: 8000 });
    } catch (error) {
      saveDraft(payload);
      throw error;
    }
    clearDraft();
    global.TTEvents?.track('feedback.submitted', {
      category: payload.category,
      contextType: payload.contextType,
      scriptId: payload.scriptId
    });
    return response;
  }

  global.TTFeedback = { submit: submit, peekDraft: peekDraft, clearDraft: clearDraft };
})(window);
