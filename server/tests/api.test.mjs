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

  // V1.1 P1 数据分析：漏斗、流失节点、选择分布、错题热力图
  const analytics = await jsonRequest('/api/v1/admin/analytics', { headers: { Cookie: cookie } });
  assert.equal(analytics.response.status, 200);
  assert.equal(analytics.body.success, true);
  const funnelSteps = analytics.body.funnel.map((item) => item.step);
  assert.deepEqual(funnelSteps, ['page.view', 'script.start', 'script.ending']);
  assert.ok(analytics.body.dropoff.some((row) => row.script_id === 'american_revolution' && row.act_id === '第一幕 · 波士顿'), '流失节点应按幕次聚合');
  assert.ok(analytics.body.dropoff.every((row) => row.startSessions >= 0), '流失节点必须带开演基数以计算留存');
  const choiceRow = analytics.body.choiceDistribution.find((row) => row.script_id === 'american_revolution' && row.node_id === 'dialog_12');
  assert.ok(choiceRow && choiceRow.count >= 1, '选择分布应按决策点与选项聚合');
  const wrongRow = analytics.body.wrongHeatmap.find((row) => row.script_id === 'american_revolution' && row.question_id === 'evidence_31');
  assert.ok(wrongRow && wrongRow.wrong >= 1 && wrongRow.total >= 1, '错题热力图应统计错误与总答次数');

  const unauthorized = await jsonRequest('/api/v1/admin/analytics');
  assert.equal(unauthorized.response.status, 401, '数据分析必须登录后才能访问');
});

test('D3 尝试聚合：自主有效探索率按（剧本×学习者）计算，N=3', async () => {
  const at = () => new Date().toISOString();
  const scriptId = 'french_revolution';

  // 学习者A：script.start + 3 次自主探索（initiator 省略，靠服务端默认注入）→ 有自主探索
  // 学习者B：script.start + 1 次自主探索 → 未达 N，不计入
  // 学习者C：只有探索事件没有 script.start → 不算尝试
  const build = (eventId, name, actor, session, payload) => ({
    eventId, name, occurredAt: at(), anonymousId: actor, sessionId: session, role: 'student', page: '/game-scene.html', payload
  });
  const events = [
    build('d3-a-start', 'script.start', 'actor-d3-a', 'session-d3-a', { scriptId, mode: 'normal' }),
    build('d3-a-card', 'script.card', 'actor-d3-a', 'session-d3-a', { scriptId, cardId: 'c1', action: 'use' }),
    build('d3-a-npc1', 'npc.message_sent', 'actor-d3-a', 'session-d3-a', { scriptId, npcId: 'n1' }),
    build('d3-a-npc2', 'npc.free_input_submitted', 'actor-d3-a', 'session-d3-a', { scriptId, npcId: 'n1' }),
    build('d3-b-start', 'script.start', 'actor-d3-b', 'session-d3-b', { scriptId, mode: 'normal' }),
    build('d3-b-card', 'script.card', 'actor-d3-b', 'session-d3-b', { scriptId, cardId: 'c2', action: 'use' }),
    build('d3-c-card', 'script.card', 'actor-d3-c', 'session-d3-c', { scriptId, cardId: 'c3', action: 'use' })
  ];
  const batch = await jsonRequest('/api/v1/events/batch', {
    method: 'POST',
    body: JSON.stringify({ events })
  });
  assert.equal(batch.response.status, 202);
  assert.equal(batch.body.accepted, events.length, 'D3 测试事件必须全部入库');

  const login = await jsonRequest('/api/v1/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@test.local', password: 'testing-password-123' })
  });
  const cookie = login.response.headers.get('set-cookie').split(';')[0];
  const analytics = await jsonRequest('/api/v1/admin/analytics', { headers: { Cookie: cookie } });
  assert.equal(analytics.response.status, 200);

  const autonomy = analytics.body.autonomy;
  assert.ok(autonomy, '分析结果必须带 autonomy 聚合');
  assert.equal(autonomy.n, 3, 'N 值按 ENG-15 建议口径为 3');
  const row = autonomy.byScript.find((item) => item.scriptId === scriptId);
  assert.ok(row, '自主探索率必须按剧本聚合');
  assert.equal(row.attempts, 2, '只有 script.start 过的学习者算尝试（学习者C 不算）');
  assert.equal(row.autonomousAttempts, 1, '学习者A 达 N=3 计入，学习者B 不计入');
  assert.equal(row.autonomousRate, 0.5);
});

test('GitHub Issue 联动：管理员可关联 Issue，公开列表带出链接字段', async () => {
  const actor = 'actor-issue';
  const created = await jsonRequest('/api/v1/wishes', {
    method: 'POST',
    body: JSON.stringify({ anonymousId: actor, wishType: 'feature', title: '希望支持离线模式', reason: '教室网络不稳', allowPublic: true })
  });
  assert.equal(created.response.status, 201);

  const login = await jsonRequest('/api/v1/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@test.local', password: 'testing-password-123' })
  });
  const cookie = login.response.headers.get('set-cookie').split(';')[0];
  const list = await jsonRequest('/api/v1/admin/wishes', { headers: { Cookie: cookie } });
  const target = (list.body.items || []).find((item) => item.title === '希望支持离线模式');
  assert.ok(target, '管理端列表必须能找到新愿望');

  const updated = await jsonRequest(`/api/v1/admin/wishes/${encodeURIComponent(target.id)}`, {
    method: 'PATCH', headers: { Cookie: cookie },
    body: JSON.stringify({ status: 'planned', githubIssue: 'https://github.com/AWKN-Lab/game/issues/42' })
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.item.githubIssue, 'https://github.com/AWKN-Lab/game/issues/42');

  const publicList = await jsonRequest('/api/v1/wishes?status=planned');
  const publicRow = (publicList.body.items || []).find((item) => item.title === '希望支持离线模式');
  assert.ok(publicRow, '公开列表应包含已计划愿望');
  assert.equal(publicRow.githubIssue, 'https://github.com/AWKN-Lab/game/issues/42', '公开列表必须带出 Issue 字段供路线图页链接');
});
