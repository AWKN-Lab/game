(function (global) {
  'use strict';

  function requireFields(value, fields) {
    return value && fields.every(function (field) { return value[field] !== undefined && value[field] !== null; });
  }

  async function callServer(task, payload) {
    if (!global.TTApi) throw new Error('API client unavailable');
    var identity = global.TTIdentity?.getContext?.() || {};
    var requestBody = Object.assign({
      task: task,
      anonymousId: identity.anonymousId || null,
      sessionId: identity.sessionId || null,
      role: identity.role || 'student'
    }, payload);
    var response = await global.TTApi.post('/teaching-assistant', requestBody, { timeoutMs: 15000 });
    if (!response || response.success === false || !response.data) throw new Error(response?.message || 'AI response invalid');
    return Object.assign({}, response.data, {
      mode: response.mode || response.data.mode || 'ai',
      sourceLabel: (response.mode || response.data.mode) === 'rule' ? '服务端规则版' : 'AI版',
      traceId: response.traceId || null,
      fallbackReason: response.fallbackReason || null
    });
  }

  async function generateLessonPlan(input) {
    var started = performance.now();
    global.TTEvents?.track('lesson_plan.request', {
      scriptId: input.scriptId,
      duration: Number(input.duration || 40),
      studentLevel: input.studentLevel,
      usageMode: input.usageMode
    });
    try {
      var result = await callServer('lesson_plan', input);
      if (!requireFields(result, ['title', 'objectives', 'recommendedActs', 'pauseQuestions', 'boardOutline', 'summary', 'homework'])) throw new Error('lesson plan schema invalid');
      global.TTEvents?.track('lesson_plan.generated', { scriptId: input.scriptId, mode: result.mode || 'ai', durationMs: Math.round(performance.now() - started), success: true });
      return result;
    } catch (error) {
      var fallback = await global.TTRules.generateLessonPlan(input);
      fallback.fallbackReason = error.message || 'AI unavailable';
      global.TTEvents?.track('lesson_plan.generated', { scriptId: input.scriptId, mode: 'rule', durationMs: Math.round(performance.now() - started), success: true });
      return fallback;
    }
  }

  async function generateLearningReview(input) {
    var started = performance.now();
    var context = input.learningData || {};
    global.TTEvents?.track('learning_review.request', { scriptId: input.scriptId, quizPct: Number(context.quizPct || 0), completed: !!context.completed });
    try {
      var result = await callServer('learning_review', input);
      if (!requireFields(result, ['title', 'mastered', 'confusions', 'whyWrong', 'actions'])) throw new Error('learning review schema invalid');
      global.TTEvents?.track('learning_review.generated', { scriptId: input.scriptId, mode: result.mode || 'ai', durationMs: Math.round(performance.now() - started), success: true });
      return result;
    } catch (error) {
      var fallback = await global.TTRules.generateLearningReview(input);
      fallback.fallbackReason = error.message || 'AI unavailable';
      global.TTEvents?.track('learning_review.generated', { scriptId: input.scriptId, mode: 'rule', durationMs: Math.round(performance.now() - started), success: true });
      return fallback;
    }
  }

  global.TTAI = { generateLessonPlan: generateLessonPlan, generateLearningReview: generateLearningReview };
})(window);
