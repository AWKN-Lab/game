import test from 'node:test';
import assert from 'node:assert/strict';
import { ruleLessonPlan, ruleLearningReview } from '../server/services/ai-service.js';

test('40分钟导学卡包含完整课堂结构', () => {
  const result = ruleLessonPlan({
    scriptId: 'american_revolution',
    duration: 40,
    studentLevel: 'average',
    teachingFocus: '区分根本原因和导火线',
    usageMode: 'projection'
  });
  assert.match(result.title, /美国独立战争/);
  assert.equal(result.recommendedActs.length, 3);
  assert.ok(result.objectives.length >= 2);
  assert.equal(result.pauseQuestions.length, 3);
  assert.ok(result.boardOutline.length >= 3);
});

test('复盘卡只给三个后续动作', () => {
  const result = ruleLearningReview({
    scriptId: 'american_revolution',
    learningData: {
      completed: true,
      quizPct: 60,
      quizTotal: 5,
      wrongAnswers: [{ question: '美国独立战争的根本原因是什么？', userAnswer: '税收高', correctAnswer: '殖民统治阻碍经济发展' }],
      knowledgeSummary: []
    }
  });
  assert.equal(result.actions.length, 3);
  assert.ok(result.confusions.length >= 1);
  assert.match(result.whyWrong, /原因|概念|事件/);
});

test('未知剧本被拒绝', () => {
  assert.throws(() => ruleLessonPlan({ scriptId: 'unknown', duration: 20 }), /未知剧本/);
});
