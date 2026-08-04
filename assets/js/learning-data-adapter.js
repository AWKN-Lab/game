(function (global) {
  'use strict';

  function safeCall(fn, fallback) {
    try { return typeof fn === 'function' ? fn() : fallback; } catch (error) { return fallback; }
  }

  function scriptName(scriptId) {
    return global.SCRIPT_REGISTRY?.[scriptId]?.name || scriptId;
  }

  function normalizeWrongAnswers(scriptId, answers) {
    var name = scriptName(scriptId);
    var filtered = (answers || []).filter(function (item) {
      var subject = String(item.subject || '');
      return !subject || subject.indexOf(scriptId) >= 0 || subject.indexOf(name) >= 0;
    });
    if (!filtered.length) filtered = (answers || []).slice(-6);
    return filtered.slice(-12).map(function (item, index) {
      return {
        id: item.id || scriptId + '-wrong-' + index,
        question: String(item.question || '').slice(0, 240),
        userAnswer: String(item.userAnswer || '').slice(0, 160),
        correctAnswer: String(item.correctAnswer || '').slice(0, 160),
        explanation: String(item.explanation || '').slice(0, 320),
        subject: String(item.subject || '').slice(0, 80),
        knowledgeId: item.knowledgeId || '',
        timestamp: item.timestamp || null
      };
    });
  }

  function getContext(scriptId) {
    var store = global.DataStore || {};
    var completion = safeCall(function () { return store.getScriptCompletion(scriptId); }, {}) || {};
    var assessment = safeCall(function () { return store.getScriptAssessment(scriptId); }, null) || {};
    var statuses = safeCall(function () { return store.getKnowledgeStatuses(); }, {}) || {};
    var wrong = normalizeWrongAnswers(scriptId, safeCall(function () { return store.getWrongAnswers(); }, []));
    var progress = safeCall(function () { return store.loadProgress(scriptId); }, null);
    var knowledgeSummary = Object.keys(statuses).filter(function (key) {
      return key.indexOf(scriptId) === 0 || Object.keys(statuses).length <= 20;
    }).map(function (key) {
      var value = statuses[key];
      if (value && typeof value === 'object') {
        return {
          knowledgeId: key,
          mastered: !!value.mastered,
          correct: Number(value.correct || value.correctCount || 0),
          wrong: Number(value.wrong || value.wrongCount || 0),
          title: value.title || key
        };
      }
      return { knowledgeId: key, mastered: !!value, correct: value ? 1 : 0, wrong: value ? 0 : 1, title: key };
    });

    var quizTotal = Number(assessment.quizTotal || 0);
    var quizCorrect = Number(assessment.quizCorrect || 0);
    var quizPct = Number(assessment.quizPct || (quizTotal ? Math.round(quizCorrect / quizTotal * 100) : 0));

    return {
      schemaVersion: 1,
      scriptId: scriptId,
      scriptName: scriptName(scriptId),
      completed: !!completion.completed,
      endings: Array.isArray(completion.endings) ? completion.endings : [],
      collectibles: Array.isArray(completion.collectibles) ? completion.collectibles : [],
      playTime: Number(completion.playTime || 0),
      progress: progress ? {
        dialogIndex: Number(progress.dialogIndex || 0),
        currentAct: String(progress.currentAct || ''),
        savedAt: progress.savedAt || null
      } : null,
      quizCorrect: quizCorrect,
      quizTotal: quizTotal,
      quizPct: quizPct,
      essayPct: Number(assessment.essayPct || 0),
      learningPct: Number(assessment.learningPct || assessment.bestLearningPct || quizPct),
      tier: assessment.bestTier || assessment.tier || 'completed',
      attemptCount: Number(assessment.attemptCount || 0),
      wrongAnswers: wrong,
      knowledgeSummary: knowledgeSummary.slice(0, 30)
    };
  }

  function hasEnoughData(context) {
    return !!(context && (context.completed || context.quizTotal || context.wrongAnswers?.length || context.knowledgeSummary?.length));
  }

  global.TTLearning = {
    getContext: getContext,
    hasEnoughData: hasEnoughData,
    getAvailableScripts: function () {
      return Object.keys(global.SCRIPT_REGISTRY || {}).map(function (id) {
        var context = getContext(id);
        return { id: id, name: scriptName(id), hasData: hasEnoughData(context), context: context };
      });
    }
  };
})(window);
