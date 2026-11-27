(function (global) {
  'use strict';

  function text(value, max) { return String(value || '').trim().slice(0, max || 500); }

  function identity() {
    return global.TTIdentity?.getContext?.() || {};
  }

  var DRAFT_KEY = 'st_wish_draft_v1';

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

  async function list(filters) {
    filters = filters || {};
    var params = new URLSearchParams();
    Object.keys(filters).forEach(function (key) {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') params.set(key, filters[key]);
    });
    var suffix = params.toString() ? '?' + params.toString() : '';
    return global.TTApi.get('/wishes' + suffix, { timeoutMs: 8000 });
  }

  async function submit(input) {
    var id = identity();
    var payload = {
      anonymousId: id.anonymousId || null,
      sessionId: id.sessionId || null,
      role: id.role || 'student',
      wishType: text(input.wishType || 'feature', 40),
      title: text(input.title, 120),
      reason: text(input.reason, 1000),
      problem: text(input.problem, 800),
      grade: text(input.grade, 40),
      scriptId: text(input.scriptId, 80),
      allowPublic: input.allowPublic !== false
    };
    if (payload.title.length < 2) throw new Error('愿望标题至少需要两个字');
    var response;
    try {
      response = await global.TTApi.post('/wishes', payload, { timeoutMs: 8000 });
    } catch (error) {
      saveDraft(payload);
      throw error;
    }
    clearDraft();
    global.TTEvents?.track('wish.submitted', { wishType: payload.wishType, scriptId: payload.scriptId, grade: payload.grade });
    return response;
  }

  async function vote(wishId, active) {
    var id = identity();
    var path = '/wishes/' + encodeURIComponent(wishId) + '/vote';
    var response = active
      ? await global.TTApi.post(path, { anonymousId: id.anonymousId }, { timeoutMs: 6000 })
      : await global.TTApi.delete(path, { anonymousId: id.anonymousId }, { timeoutMs: 6000 });
    global.TTEvents?.track('wish.voted', { wishId: String(wishId), active: !!active });
    return response;
  }

  global.TTWishes = { list: list, submit: submit, vote: vote, peekDraft: peekDraft, clearDraft: clearDraft };
})(window);
