import test from 'node:test';
import assert from 'node:assert/strict';

const { classifyIdentity, aggregateAttempts, validateEventIdentity, DEFAULT_AUTONOMY_N } = await import('../services/attempt-analytics.js');

const UUID_A = 'a0000000-0000-4000-8000-000000000001';
const UUID_B = 'b0000000-0000-4000-8000-000000000002';
const UUID_C = 'c0000000-0000-4000-8000-000000000003';

function ev(eventId, name, { attemptId, contentVersion = '1', actorId = 'actor_1', sessionId = null, occurredAt, payload = {} } = {}) {
  return { eventId, name, actorId, sessionId, occurredAt, payload: { attemptId, contentVersion, scriptId: 'french_revolution', ...payload } };
}

test('classifyIdentity：三字段全有效为 new，全缺为 legacy，部分缺失或非法 UUID 为 invalid', () => {
  assert.equal(classifyIdentity({ payload: { attemptId: UUID_A, contentVersion: '1' } }).kind, 'new');
  assert.equal(classifyIdentity({ payload: {} }).kind, 'legacy');
  assert.equal(classifyIdentity({ payload: { attemptId: UUID_A } }).kind, 'invalid');
  assert.equal(classifyIdentity({ payload: { contentVersion: '1' } }).kind, 'invalid');
  assert.equal(classifyIdentity({ payload: { attemptId: 'not-a-uuid', contentVersion: '1' } }).kind, 'invalid');
  assert.equal(classifyIdentity({ payload: { attemptId: 123, contentVersion: '1' } }).kind, 'invalid');
});

test('去重：同 attempt 多次 script.start / ending / quiz.complete 各只计一次', () => {
  const rows = [
    ev('e1', 'script.start', { attemptId: UUID_A, occurredAt: '2026-11-28T10:00:00Z' }),
    ev('e2', 'script.start', { attemptId: UUID_A, occurredAt: '2026-11-28T10:01:00Z' }),
    ev('e3', 'script.ending', { attemptId: UUID_A, occurredAt: '2026-11-28T10:20:00Z' }),
    ev('e4', 'script.ending', { attemptId: UUID_A, occurredAt: '2026-11-28T10:21:00Z' }),
    ev('e5', 'quiz.complete', { attemptId: UUID_A, occurredAt: '2026-11-28T10:22:00Z' }),
    ev('e6', 'quiz.complete', { attemptId: UUID_A, occurredAt: '2026-11-28T10:23:00Z' })
  ];
  const result = aggregateAttempts(rows);
  assert.equal(result.totals.validStarts, 1);
  assert.equal(result.totals.completed, 1);
  assert.equal(result.totals.quizCompleted, 1);
});

test('冲突隔离：同 attemptId 出现两个归属身份 → 整体隔离，不进分子分母', () => {
  const rows = [
    ev('e1', 'script.start', { attemptId: UUID_A, actorId: 'actor_1', occurredAt: '2026-11-28T10:00:00Z' }),
    ev('e2', 'script.ending', { attemptId: UUID_A, actorId: 'actor_2', occurredAt: '2026-11-28T10:05:00Z' })
  ];
  const result = aggregateAttempts(rows);
  assert.deepEqual(result.isolated.conflictAttempts, [UUID_A]);
  assert.equal(result.totals.validStarts, 0);
  assert.equal(result.totals.autonomyRate, null);
});

test('冲突隔离：同 attemptId 出现两个 scriptId → 整体隔离', () => {
  const rows = [
    ev('e1', 'script.start', { attemptId: UUID_A, occurredAt: '2026-11-28T10:00:00Z' }),
    ev('e2', 'script.ending', { attemptId: UUID_A, occurredAt: '2026-11-28T10:05:00Z', payload: { scriptId: 'wuxu_reform' } })
  ];
  const result = aggregateAttempts(rows);
  assert.deepEqual(result.isolated.conflictAttempts, [UUID_A]);
});

test('孤立完成：无 script.start 的 ending/quiz.complete 记 unknown，不进分子分母', () => {
  const rows = [
    ev('e1', 'script.ending', { attemptId: UUID_B, occurredAt: '2026-11-28T10:00:00Z' }),
    ev('e2', 'quiz.complete', { attemptId: UUID_B, occurredAt: '2026-11-28T10:01:00Z' })
  ];
  const result = aggregateAttempts(rows);
  assert.deepEqual(result.isolated.unknownCompletions, [UUID_B]);
  assert.equal(result.totals.validStarts, 0);
  assert.equal(result.totals.completed, 0);
  assert.equal(result.totals.autonomyRate, null);
});

test('零分母：无合法开始时自主探索率为 null（不可计算），有分母时按 N 计算并四舍五入到 4 位', () => {
  const empty = aggregateAttempts([]);
  assert.equal(empty.totals.autonomyRate, null);

  const rows = [
    ev('e1', 'script.start', { attemptId: UUID_A, occurredAt: '2026-11-28T10:00:00Z' }),
    ev('e2', 'script.start', { attemptId: UUID_B, occurredAt: '2026-11-28T11:00:00Z' }),
    // attempt A：3 次玩家自主探索（默认 N=3）→ autonomous
    ev('e3', 'script.card', { attemptId: UUID_A, occurredAt: '2026-11-28T10:01:00Z', payload: { initiator: 'player' } }),
    ev('e4', 'npc.message_sent', { attemptId: UUID_A, occurredAt: '2026-11-28T10:02:00Z', payload: { initiator: 'player' } }),
    ev('e5', 'npc.free_input_submitted', { attemptId: UUID_A, occurredAt: '2026-11-28T10:03:00Z', payload: { initiator: 'player' } }),
    // attempt B：剧情触发不算（initiator 缺省），仅 2 次玩家自主 → not autonomous
    ev('e6', 'script.card', { attemptId: UUID_B, occurredAt: '2026-11-28T11:01:00Z', payload: { initiator: 'player' } }),
    ev('e7', 'script.card', { attemptId: UUID_B, occurredAt: '2026-11-28T11:02:00Z', payload: { initiator: 'player' } }),
    ev('e8', 'script.card', { attemptId: UUID_B, occurredAt: '2026-11-28T11:03:00Z' })
  ];
  const result = aggregateAttempts(rows);
  assert.equal(result.autonomyN, DEFAULT_AUTONOMY_N);
  assert.equal(result.totals.validStarts, 2);
  assert.equal(result.totals.autonomousAttempts, 1);
  assert.equal(result.totals.autonomyRate, 0.5);
});

test('幕漏斗：同 attempt 重复进入同一幕只计一次', () => {
  const rows = [
    ev('e1', 'script.start', { attemptId: UUID_A, occurredAt: '2026-11-28T10:00:00Z' }),
    ev('e2', 'script.act_enter', { attemptId: UUID_A, occurredAt: '2026-11-28T10:01:00Z', payload: { actId: 'act1' } }),
    ev('e3', 'script.act_enter', { attemptId: UUID_A, occurredAt: '2026-11-28T10:02:00Z', payload: { actId: 'act1' } }),
    ev('e4', 'script.act_enter', { attemptId: UUID_A, occurredAt: '2026-11-28T10:03:00Z', payload: { actId: 'act2' } })
  ];
  const result = aggregateAttempts(rows);
  assert.deepEqual(result.actFunnels.map((s) => ({ actId: s.actId, attempts: s.attempts })),
    [{ actId: 'act1', attempts: 1 }, { actId: 'act2', attempts: 1 }]);
});

test('首次答题：occurred_at 升序取首答；并列时取 event_id 字典序较小者', () => {
  const base = [
    ev('e1', 'script.start', { attemptId: UUID_A, occurredAt: '2026-11-28T10:00:00Z' })
  ];
  const ordered = aggregateAttempts([
    ...base,
    ev('e2', 'quiz.answer', { attemptId: UUID_A, occurredAt: '2026-11-28T10:01:00Z', payload: { questionId: 'q1', correct: false } }),
    ev('e3', 'quiz.answer', { attemptId: UUID_A, occurredAt: '2026-11-28T10:02:00Z', payload: { questionId: 'q1', correct: true } })
  ]);
  assert.equal(ordered.firstAnswers.find((s) => s.questionId === 'q1').correct, 0);

  const tied = aggregateAttempts([
    ...base,
    ev('e_b', 'quiz.answer', { attemptId: UUID_A, occurredAt: '2026-11-28T10:01:00Z', payload: { questionId: 'q1', correct: true } }),
    ev('e_a', 'quiz.answer', { attemptId: UUID_A, occurredAt: '2026-11-28T10:01:00Z', payload: { questionId: 'q1', correct: false } })
  ]);
  assert.equal(tied.firstAnswers.find((s) => s.questionId === 'q1').correct, 0, '并列时取 event_id 字典序较小（e_a）');
});

test('legacy/invalid 计数隔离，不进 attempt 聚合', () => {
  const rows = [
    ev('e1', 'script.start', { attemptId: UUID_A, occurredAt: '2026-11-28T10:00:00Z' }),
    { eventId: 'e2', name: 'script.start', actorId: 'actor_1', sessionId: null, occurredAt: '2026-11-28T10:01:00Z', payload: { scriptId: 'french_revolution' } },
    ev('e3', 'script.ending', { attemptId: 'bad-uuid', occurredAt: '2026-11-28T10:02:00Z' })
  ];
  const result = aggregateAttempts(rows);
  assert.equal(result.isolated.legacyEvents, 1);
  assert.equal(result.isolated.invalidEvents, 1);
  assert.equal(result.totals.attempts, 1);
});

test('迟到事件：聚合按 occurred_at 重算，晚到的更早事件修正 startedAt 与首答', () => {
  const first = aggregateAttempts([
    ev('e1', 'script.start', { attemptId: UUID_A, occurredAt: '2026-11-28T10:05:00Z' }),
    ev('e2', 'quiz.answer', { attemptId: UUID_A, occurredAt: '2026-11-28T10:06:00Z', payload: { questionId: 'q1', correct: false } })
  ]);
  const late = aggregateAttempts([
    ev('e1', 'script.start', { attemptId: UUID_A, occurredAt: '2026-11-28T10:05:00Z' }),
    ev('e2', 'quiz.answer', { attemptId: UUID_A, occurredAt: '2026-11-28T10:06:00Z', payload: { questionId: 'q1', correct: false } }),
    ev('e0', 'script.start', { attemptId: UUID_A, occurredAt: '2026-11-28T10:00:00Z' }),
    ev('e9', 'quiz.answer', { attemptId: UUID_A, occurredAt: '2026-11-28T10:01:00Z', payload: { questionId: 'q1', correct: true } })
  ]);
  assert.equal(late.attemptsDetail[0].startedAt, '2026-11-28T10:00:00Z');
  assert.equal(late.firstAnswers.find((s) => s.questionId === 'q1').correct, 1);
  assert.notEqual(first.totals, late.totals);
});

test('版本口径：同剧本不同 contentVersion 分组输出，不跨版本拼接', () => {
  const rows = [
    ev('e1', 'script.start', { attemptId: UUID_A, contentVersion: '1', occurredAt: '2026-11-28T10:00:00Z' }),
    ev('e2', 'script.start', { attemptId: UUID_B, contentVersion: '2', occurredAt: '2026-11-28T11:00:00Z' })
  ];
  const result = aggregateAttempts(rows);
  assert.equal(result.byScript.length, 2);
  assert.deepEqual(result.byScript.map((s) => s.contentVersion).sort(), ['1', '2']);
});

test('孤立答题（无 start 的 quiz.answer）不计入首次答题口径', () => {
  const result = aggregateAttempts([
    ev('e1', 'quiz.answer', { attemptId: UUID_C, occurredAt: '2026-11-28T10:00:00Z', payload: { questionId: 'q1', correct: true } })
  ]);
  assert.equal(result.firstAnswers.length, 0);
  assert.deepEqual(result.isolated.unknownCompletions, []); // 仅答题不构成孤立完成
});

test('validateEventIdentity：身份成对合法放行，部分缺失/非法 UUID 拒绝，legacy 全缺放行', () => {
  assert.equal(validateEventIdentity('script.start', { attemptId: UUID_A, contentVersion: '1' }), null);
  assert.equal(validateEventIdentity('script.start', {}), null, '全缺为 legacy，放行');
  assert.equal(validateEventIdentity('script.start', { attemptId: UUID_A }), 'INVALID_ATTEMPT_ID', '缺 contentVersion');
  assert.equal(validateEventIdentity('script.start', { contentVersion: '1' }), 'INVALID_ATTEMPT_ID', '缺 attemptId');
  assert.equal(validateEventIdentity('script.start', { attemptId: 'bad', contentVersion: '1' }), 'INVALID_ATTEMPT_ID');
});

test('validateEventIdentity：quiz.answer correct 须布尔；quiz.complete score/total/pct 须自洽', () => {
  assert.equal(validateEventIdentity('quiz.answer', { correct: true }), null);
  assert.equal(validateEventIdentity('quiz.answer', { correct: 1 }), 'INVALID_QUIZ_FIELDS');
  assert.equal(validateEventIdentity('quiz.answer', {}), null, 'correct 缺省不校验');
  assert.equal(validateEventIdentity('quiz.complete', { score: 8, total: 10, pct: 80 }), null);
  assert.equal(validateEventIdentity('quiz.complete', { score: 8, total: 10, pct: 95 }), 'INVALID_QUIZ_FIELDS');
  assert.equal(validateEventIdentity('quiz.complete', { score: 8, total: 10 }), null, 'pct 缺省不校验一致性');
});
