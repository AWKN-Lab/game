(function (global) {
  'use strict';

  function text(value, max) { return String(value || '').trim().slice(0, max || 500); }

  function identity() {
    return global.TTIdentity?.getContext?.() || {};
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
    var response = await global.TTApi.post('/wishes', payload, { timeoutMs: 8000 });
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

  global.TTWishes = { list: list, submit: submit, vote: vote };
})(window);
