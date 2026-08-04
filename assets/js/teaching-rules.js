(function (global) {
  'use strict';

  var cache = null;

  async function loadConfig() {
    if (cache) return cache;
    try {
      var responses = await Promise.all([
        fetch('data/teaching_metadata.json').then(function (r) { if (!r.ok) throw new Error('metadata'); return r.json(); }),
        fetch('data/rule_templates.json').then(function (r) { if (!r.ok) throw new Error('rules'); return r.json(); })
      ]);
      cache = { metadata: responses[0], rules: responses[1] };
      return cache;
    } catch (error) {
      cache = { metadata: { scripts: {} }, rules: { lessonPlan: { duration: {}, studentLevel: {} }, learningReview: {} } };
      return cache;
    }
  }

  function scriptFromRegistry(scriptId) {
    var registry = global.SCRIPT_REGISTRY || {};
    var script = registry[scriptId] || {};
    return {
      name: script.name || scriptId,
      subtitle: script.subtitle || '',
      facts: Array.isArray(script.facts) ? script.facts : [],
      knowledgePoints: script.knowledgePoints || 0
    };
  }

  function pickActs(acts, count, focus) {
    var words = String(focus || '').split(/[，。；、\s]+/).filter(Boolean);
    var scored = (acts || []).map(function (act, index) {
      var haystack = [act.title].concat(act.focus || []).join('');
      var score = words.reduce(function (sum, word) { return sum + (haystack.indexOf(word) >= 0 ? 2 : 0); }, 0);
      return { act: act, score: score, index: index };
    });
    scored.sort(function (a, b) { return b.score - a.score || a.index - b.index; });
    var selected = scored.slice(0, Math.max(1, count)).map(function (item) { return item.act; });
    selected.sort(function (a, b) { return (acts || []).indexOf(a) - (acts || []).indexOf(b); });
    return selected;
  }

  async function generateLessonPlan(input) {
    input = input || {};
    var config = await loadConfig();
    var metadata = config.metadata.scripts?.[input.scriptId] || {};
    var registry = scriptFromRegistry(input.scriptId);
    var duration = String(Number(input.duration) || 40);
    var durationRule = config.rules.lessonPlan?.duration?.[duration] || { actCount: duration === '15' ? 1 : 3, questionCount: 3, objectiveCount: 3 };
    var levelRule = config.rules.lessonPlan?.studentLevel?.[input.studentLevel] || config.rules.lessonPlan?.studentLevel?.average || {};
    var selectedActs = pickActs(metadata.acts || [], durationRule.actCount, input.teachingFocus);
    var objectives = (metadata.objectives || []).slice(0, durationRule.objectiveCount);
    if (input.teachingFocus) objectives.unshift('围绕“' + String(input.teachingFocus).slice(0, 80) + '”形成清楚表达');
    objectives = Array.from(new Set(objectives)).slice(0, durationRule.objectiveCount);
    var questions = (metadata.followupQuestions || []).slice(0, durationRule.questionCount);
    var board = (metadata.boardOutline || []).slice(0, duration === '15' ? 3 : 5);

    return {
      title: registry.name + '｜' + duration + '分钟导学卡',
      mode: 'rule',
      sourceLabel: '本地规则版',
      objectives: objectives,
      recommendedActs: selectedActs.map(function (act) {
        return {
          id: act.id,
          title: act.title,
          minutes: Math.min(act.minutes || 8, Math.max(4, Math.floor(Number(duration) / selectedActs.length))),
          reason: (act.focus || []).join('、') || '覆盖本节核心知识'
        };
      }),
      pauseQuestions: questions,
      boardOutline: board,
      summary: '请学生用“背景—事件—结果—影响”四句话收束本课，并明确区分容易混淆的概念。',
      homework: '用四句话复述本课，再选择一个最容易混淆的知识点写出区别。',
      teachingTip: '学生基础：' + (levelRule.label || '基础一般') + '；提问方式：' + (levelRule.questionStyle || '因果解释') + '；板书方式：' + (levelRule.boardStyle || '因果链') + '。',
      warnings: metadata.commonMisconceptions || [],
      generatedAt: new Date().toISOString()
    };
  }

  function normalizeWrongAnswers(value) {
    return (Array.isArray(value) ? value : []).slice(-8).map(function (item) {
      return {
        question: String(item.question || '').slice(0, 160),
        userAnswer: String(item.userAnswer || '').slice(0, 100),
        correctAnswer: String(item.correctAnswer || '').slice(0, 100),
        explanation: String(item.explanation || '').slice(0, 220),
        knowledgeId: item.knowledgeId || ''
      };
    });
  }

  async function generateLearningReview(input) {
    input = input || {};
    var context = input.learningData || input;
    var config = await loadConfig();
    var metadata = config.metadata.scripts?.[input.scriptId || context.scriptId] || {};
    var registry = scriptFromRegistry(input.scriptId || context.scriptId);
    var wrongAnswers = normalizeWrongAnswers(context.wrongAnswers);
    var quizPct = Number(context.quizPct || 0);
    var statuses = context.knowledgeSummary || [];
    var mastered = statuses.filter(function (item) { return item.mastered || item.correct > item.wrong; }).slice(0, 4).map(function (item) { return item.title || item.knowledgeId || item.id; });
    if (!mastered.length && quizPct >= 80) mastered = (metadata.objectives || []).slice(0, 3);
    if (!mastered.length && context.completed) mastered = ['已经完成剧情主线', '能够识别本课主要人物和事件'];

    var confusions = wrongAnswers.slice(0, 3).map(function (item) {
      return item.question ? '需要重新理解：' + item.question : '需要复习相关知识点';
    });
    if (!confusions.length) confusions = (metadata.commonMisconceptions || []).slice(0, quizPct >= 80 ? 1 : 3);

    var whyWrong;
    if (!context.completed && !context.quizTotal && !wrongAnswers.length) {
      whyWrong = '当前还没有足够的测试和错题数据。先完成一次知识测试，再生成更具体的复盘。';
    } else if (quizPct >= 80) {
      whyWrong = '基础知识已经比较稳，下一步要把零散知识连接成因果链，并尝试比较不同历史事件。';
    } else if (quizPct >= 60) {
      whyWrong = '主要事件已经记住，但概念区分和原因层次还不够稳定，需要把表面事件与深层原因分开。';
    } else {
      whyWrong = '目前更像是在记事件名称，时间线和“为什么发生”还没有连起来。先补核心线索，再做综合判断。';
    }

    var actions = (config.rules.learningReview?.defaultActions || [
      '重做相关错题，并说出选择依据',
      '画出一条因果链',
      '回看对应剧情段落'
    ]).slice(0, 3);
    var nextScriptId = (metadata.relatedScripts || [])[0] || null;
    var next = nextScriptId && global.SCRIPT_REGISTRY?.[nextScriptId];

    return {
      title: registry.name + '｜我的学习复盘',
      mode: 'rule',
      sourceLabel: '本地规则版',
      mastered: mastered.filter(Boolean),
      confusions: confusions.filter(Boolean),
      whyWrong: whyWrong,
      actions: actions,
      nextScript: next ? { id: nextScriptId, name: next.name, reason: '用下一部剧本比较相近概念和历史影响。' } : null,
      dataSummary: {
        completed: !!context.completed,
        quizPct: quizPct,
        wrongCount: wrongAnswers.length,
        tier: context.tier || 'completed'
      },
      generatedAt: new Date().toISOString()
    };
  }

  global.TTRules = {
    loadConfig: loadConfig,
    generateLessonPlan: generateLessonPlan,
    generateLearningReview: generateLearningReview
  };
})(window);
