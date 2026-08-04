import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'time-theater-test-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');
process.env.DATA_DIR = tempDir;
process.env.AI_ENABLED = 'false';
process.env.EVENT_TRACKING_ENABLED = 'true';
process.env.WISH_POOL_ENABLED = 'true';
process.env.ADMIN_DASHBOARD_ENABLED = 'true';
process.env.COOKIE_SECURE = 'false';

const { createApp } = await import('../app.js');
const { openDatabase, closeDatabase } = await import('../db/database.js');
const { id, hashPassword } = await import('../lib/security.js');

const db = openDatabase();
const timestamp = new Date().toISOString();
db.prepare('INSERT INTO admin_users(id,email,password_hash,active,created_at,updated_at) VALUES(?,?,?,1,?,?)').run(id('admin_'), 'admin@test.local', hashPassword('testing-password-123'), timestamp, timestamp);

const server = createApp();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;

async function jsonRequest(pathname, options = {}) {
  const response = await fetch(base + pathname, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const body = await response.json();
  return { response, body };
}

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  closeDatabase();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('健康检查与规则版导学可用', async () => {
  const health = await jsonRequest('/api/v1/health/ready');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.success, true);

  const plan = await jsonRequest('/api/v1/teaching-assistant', {
    method: 'POST',
    body: JSON.stringify({ task: 'lesson_plan', scriptId: 'american_revolution', duration: 40, studentLevel: 'average', teachingFocus: '区分根本原因和导火线', usageMode: 'projection' })
  });
  assert.equal(plan.response.status, 200);
  assert.equal(plan.body.mode, 'rule');
  assert.equal(plan.body.data.recommendedActs.length, 3);
});

test('事件、反馈和许愿均可写入', async () => {
  const actor = 'actor-test';
  const session = 'session-test';
  const events = await jsonRequest('/api/v1/events/batch', {
    method: 'POST',
    body: JSON.stringify({ events: [{ eventId: 'event-test-1', name: 'script.choice', occurredAt: new Date().toISOString(), anonymousId: actor, sessionId: session, role: 'student', page: '/american_revolution.html', payload: { scriptId: 'american_revolution', nodeId: 'n1', choiceIndex: 0, choiceText: '先调查', forbidden: 'drop-me' } }] })
  });
  assert.equal(events.response.status, 202);
  assert.equal(events.body.accepted, 1);

  const feedback = await jsonRequest('/api/v1/feedback', {
    method: 'POST',
    body: JSON.stringify({ anonymousId: actor, sessionId: session, category: 'learning', message: '根本原因和导火线容易混淆' })
  });
  assert.equal(feedback.response.status, 201);
  assert.match(feedback.body.publicId, /^FB-/);

  const wish = await jsonRequest('/api/v1/wishes', {
    method: 'POST',
    body: JSON.stringify({ anonymousId: actor, wishType: 'script', title: '希望开发鸦片战争', reason: '这一课因果关系比较难', allowPublic: true })
  });
  assert.equal(wish.response.status, 201);
  assert.match(wish.body.publicId, /^WISH-/);
});

test('引擎正式钩子的全部关键事件都能落库', async () => {
  const actor = 'actor-hooks';
  const session = 'session-hooks';
  const scriptId = 'american_revolution';
  const at = () => new Date().toISOString();

  // 与 engine.js 中 ttHook 发射的事件一一对应
  const hookEvents = [
    { name: 'script.act_enter', payload: { scriptId, actId: '第一幕 · 波士顿', actTitle: '第一幕 · 波士顿' } },
    { name: 'script.choice', payload: { scriptId, nodeId: 'dialog_12', choiceIndex: 1, choiceText: '先听双方陈述', actId: '第一幕 · 波士顿', timed: false } },
    { name: 'script.choice', payload: { scriptId, nodeId: 'pressure_20', choiceIndex: 0, choiceText: '[超时默认] 保持沉默', actId: '第二幕', timed: true } },
    { name: 'script.evidence_open', payload: { scriptId, nodeId: 'evidence_31', evidenceId: 'evidence_31', evidenceTitle: '谁先开的枪？' } },
    { name: 'script.knowledge_open', payload: { scriptId, knowledgeId: 'no_taxation', title: '无代表不纳税' } },
    { name: 'script.card', payload: { scriptId, cardId: 'card_law', action: 'choose' } },
    { name: 'quiz.answer', payload: { scriptId, questionId: 'q1', choiceIndex: 2, correct: true, knowledgeId: 'no_taxation' } },
    { name: 'quiz.answer', payload: { scriptId, questionId: 'evidence_31', choiceIndex: 0, correct: false, knowledgeId: '' } },
    { name: 'quiz.complete', payload: { scriptId, score: 4, total: 5, pct: 80, learningTier: 'A' } },
    { name: 'script.ending', payload: { scriptId, endingType: 'historical', learningTier: 'A' } }
  ];

  const result = await jsonRequest('/api/v1/events/batch', {
    method: 'POST',
    body: JSON.stringify({
      events: hookEvents.map((event, index) => ({
        eventId: `hook-event-${index}`,
        name: event.name,
        occurredAt: at(),
        anonymousId: actor,
        sessionId: session,
        role: 'student',
        page: '/american_revolution.html',
        payload: event.payload
      }))
    })
  });

  assert.equal(result.response.status, 202);
  assert.equal(result.body.accepted, hookEvents.length, '所有正式钩子事件都必须被事件目录接受');

  const rows = db.prepare('SELECT name, payload_json FROM product_events WHERE session_id=? ORDER BY received_at').all(session);
  assert.equal(rows.length, hookEvents.length);

  const timed = rows.find((row) => row.name === 'script.choice' && JSON.parse(row.payload_json).timed === true);
  assert.ok(timed, '限时选择必须带 timed=true 落库');

  const wrongAnswer = rows.find((row) => row.name === 'quiz.answer' && JSON.parse(row.payload_json).correct === false);
  assert.ok(wrongAnswer, '答题对错必须如实落库，而不是靠 DOM 猜测');

  const complete = rows.find((row) => row.name === 'quiz.complete');
  assert.equal(JSON.parse(complete.payload_json).learningTier, 'A', '学习评级必须落库');
});

test('管理员登录后可以查看总览', async () => {
  const login = await jsonRequest('/api/v1/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@test.local', password: 'testing-password-123' })
  });
  assert.equal(login.response.status, 200);
  const cookie = login.response.headers.get('set-cookie').split(';')[0];
  const dashboard = await jsonRequest('/api/v1/admin/dashboard', { headers: { Cookie: cookie } });
  assert.equal(dashboard.response.status, 200);
  assert.ok(dashboard.body.counts.eventsToday >= 1);
  assert.ok(dashboard.body.counts.newFeedback >= 1);
  assert.ok(dashboard.body.counts.pendingWishes >= 1);
});
