import test from 'node:test';
import assert from 'node:assert/strict';

const {
  newAttemptId, createAttempt, resumeAttempt, restartAttempt,
  transition, hasStarted, ATTEMPT_STATES
} = await import('../assets/js/attempt-runtime.js');

test('状态表：四个状态齐全', () => {
  assert.deepEqual([...ATTEMPT_STATES].sort(),
    ['ACTIVE', 'NEW', 'QUIZ_COMPLETE', 'STORY_COMPLETE']);
});

test('合法迁移链：NEW→ACTIVE→STORY_COMPLETE→QUIZ_COMPLETE 原地更新', () => {
  const rec = createAttempt({ scriptId: 's1', contentVersion: '2' });
  assert.equal(rec.attemptState, 'NEW');
  assert.equal(rec.scriptId, 's1');
  assert.equal(rec.contentVersion, '2');
  assert.equal(rec.observedIncomplete, false);
  assert.ok(rec.attemptId);
  assert.ok(Number.isFinite(rec.startedAt));

  assert.equal(transition(rec, 'start').attemptState, 'ACTIVE');
  assert.equal(transition(rec, 'storyComplete').attemptState, 'STORY_COMPLETE');
  assert.equal(transition(rec, 'quizComplete').attemptState, 'QUIZ_COMPLETE');
  assert.equal(rec.attemptState, 'QUIZ_COMPLETE');
});

test('非法迁移：跳阶段与错误事件均抛错，状态不被破坏', () => {
  const rec = createAttempt();
  assert.throws(() => transition(rec, 'quizComplete'), /不允许事件/);
  assert.throws(() => transition(rec, 'storyComplete'), /不允许事件/);
  assert.equal(rec.attemptState, 'NEW');

  transition(rec, 'start');
  assert.throws(() => transition(rec, 'start'), /不允许事件/);
  assert.throws(() => transition(rec, 'quizComplete'), /不允许事件/);
  assert.equal(rec.attemptState, 'ACTIVE');
});

test('终态再迁移抛错：QUIZ_COMPLETE 无出边', () => {
  const rec = createAttempt();
  transition(rec, 'start');
  transition(rec, 'storyComplete');
  transition(rec, 'quizComplete');
  for (const ev of ['start', 'storyComplete', 'quizComplete']) {
    assert.throws(() => transition(rec, ev), /不允许事件/);
  }
  assert.equal(rec.attemptState, 'QUIZ_COMPLETE');
});

test('未知状态抛错：transition 与 resumeAttempt 均拒绝', () => {
  assert.throws(() => transition({ attemptState: 'WEIRD' }, 'start'), /未知状态/);
  assert.throws(() => resumeAttempt({ attemptId: 'a1', attemptState: 'WEIRD' }), /未知状态/);
});

test('resume：同 ID 原样返回，不重置不换 ID', () => {
  const rec = createAttempt({ scriptId: 's2' });
  transition(rec, 'start');
  const same = resumeAttempt(rec);
  assert.equal(same, rec);
  assert.equal(same.attemptId, rec.attemptId);
  assert.equal(same.attemptState, 'ACTIVE');
});

test('resume：缺 ID 抛错（null/空串/非字符串）', () => {
  assert.throws(() => resumeAttempt(null), /缺少 attemptId/);
  assert.throws(() => resumeAttempt({ attemptState: 'NEW' }), /缺少 attemptId/);
  assert.throws(() => resumeAttempt({ attemptId: '', attemptState: 'NEW' }), /缺少 attemptId/);
  assert.throws(() => resumeAttempt({ attemptId: 42, attemptState: 'NEW' }), /缺少 attemptId/);
});

test('restart：新 ID 新状态，旧记录原样保留', () => {
  const old = createAttempt({ scriptId: 's3', contentVersion: '1' });
  transition(old, 'start');
  transition(old, 'storyComplete');
  const fresh = restartAttempt({ scriptId: 's3', contentVersion: '2' });

  assert.notEqual(fresh.attemptId, old.attemptId);
  assert.equal(fresh.attemptState, 'NEW');
  assert.equal(fresh.contentVersion, '2');
  // 旧记录不被触碰
  assert.equal(old.attemptState, 'STORY_COMPLETE');
  assert.equal(old.scriptId, 's3');
  assert.equal(old.contentVersion, '1');
});

test('newAttemptId：多次调用不重复，形如 UUID v4', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(newAttemptId());
  assert.equal(seen.size, 200);
  for (const id of seen) {
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  }
});

test('hasStarted：NEW 为未开始，其余状态均已开始', () => {
  const rec = createAttempt();
  assert.equal(hasStarted(rec), false);
  transition(rec, 'start');
  assert.equal(hasStarted(rec), true);
  const resumed = resumeAttempt({ attemptId: 'a9', attemptState: 'STORY_COMPLETE' });
  assert.equal(hasStarted(resumed), true);
});

test('observedIncomplete：无可靠身份时置 true 并保留游玩语义', () => {
  const rec = createAttempt({ observedIncomplete: true });
  assert.equal(rec.observedIncomplete, true);
  assert.equal(rec.attemptState, 'NEW');
  assert.ok(transition(rec, 'start'));
});
