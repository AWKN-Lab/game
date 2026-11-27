import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-test-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');
process.env.DATA_DIR = tempDir;
process.env.AI_ENABLED = 'false';

const { openDatabase } = await import('../db/database.js');
const {
  createSession, getSessionByCode, sessionView, updatePacing, recordTally, buildRoleCards, moderate
} = await import('../services/classroom-service.js');

const db = openDatabase();

test('创建课堂：生成 6 位口令，默认第一幕与导入状态', () => {
  const session = createSession(db, { teacherActorId: 'actor_t1', scriptId: 'american_revolution', title: '八（3）班' });
  assert.match(session.joinCode, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
  assert.equal(session.actId, 'act_1');
  assert.equal(session.status, 'briefing');
  assert.equal(session.scriptTitle, '美国独立战争');
  assert.ok(session.acts.length >= 5);
  // 口令可直接换回会话
  const row = getSessionByCode(db, session.joinCode);
  assert.equal(row.id, session.id);
});

test('创建课堂：未知剧本拒绝', () => {
  assert.throws(() => createSession(db, { teacherActorId: 'actor_t1', scriptId: 'no_such' }), /剧本不存在/);
});

test('控节奏：切幕与状态流转，非法状态与未知幕次拒绝', () => {
  const { joinCode } = createSession(db, { teacherActorId: 'actor_t2', scriptId: 'french_revolution' });
  const s1 = updatePacing(db, joinCode, { actId: 'act_3', status: 'discussion' });
  assert.equal(s1.actId, 'act_3');
  assert.equal(s1.status, 'discussion');
  assert.equal(s1.statusLabel, '小组讨论');
  assert.throws(() => updatePacing(db, joinCode, { status: 'rewind' }), /课堂状态不合法/);
  assert.throws(() => updatePacing(db, joinCode, { actId: 'act_99' }), /幕次不存在/);
  assert.throws(() => updatePacing(db, 'ZZZZZZ', { status: 'paused' }), /课堂不存在/);
});

test('举手统计：教师录入后计算分布与领先项，空录入拒绝', () => {
  const { joinCode } = createSession(db, { teacherActorId: 'actor_t3', scriptId: 'american_revolution' });
  const tally = recordTally(db, joinCode, {
    actId: 'act_1', topic: '该不该运这批茶？',
    entries: [{ label: 'A 抗议但不卸货', count: 12 }, { label: 'B 卸货', count: 4 }, { label: 'C 弃权', count: 4 }]
  });
  assert.equal(tally.total, 20);
  assert.equal(tally.leader.label, 'A 抗议但不卸货');
  assert.equal(tally.leader.pct, 60);
  assert.equal(tally.distribution[1].pct, 20);
  // 最新统计进入课堂视图
  const view = sessionView(getSessionByCode(db, joinCode), db);
  assert.equal(view.latestTally.tallyId, tally.tallyId);
  assert.equal(view.latestTally.total, 20);
  assert.throws(() => recordTally(db, joinCode, { entries: [{ label: '', count: 3 }] }), /至少录入一个选项/);
  assert.throws(() => recordTally(db, 'ZZZZZZ', { entries: [{ label: 'A', count: 1 }] }), /课堂不存在/);
});

test('结课后课堂只读：节奏与统计均拒绝', () => {
  const { joinCode } = createSession(db, { teacherActorId: 'actor_t4', scriptId: 'wuxu_reform' });
  updatePacing(db, joinCode, { status: 'closed' });
  assert.throws(() => updatePacing(db, joinCode, { status: 'discussion' }), /课堂已结课/);
  assert.throws(() => recordTally(db, joinCode, { entries: [{ label: 'A', count: 1 }] }), /课堂已结课/);
});

test('学生角色卡：确定性切分、信息不对称、事实只来自知识库', async () => {
  const a = await buildRoleCards('american_revolution');
  const b = await buildRoleCards('american_revolution');
  assert.deepEqual(a, b); // 同一输入永远得到同一组卡，便于打印分发
  assert.ok(a.cards.length >= 2 && a.cards.length <= 5);
  const factIds = a.cards.flatMap((c) => c.knownFacts.map((f) => f.name));
  assert.equal(new Set(factIds).size, factIds.length); // 卡片间事实不重复
  // 每张卡都只拿部分信息
  for (const card of a.cards) {
    assert.ok(card.knownFacts.length >= 1);
    assert.ok(card.witness && card.witness.name);
    assert.match(card.note, /只给本组/);
  }
  // 事实内容必须来自知识库原文
  const kb = JSON.parse(fs.readFileSync(new URL('../../data/knowledge_points.json', import.meta.url), 'utf8'));
  const contents = new Set(kb.american_revolution.history.map((k) => k.content));
  for (const card of a.cards) {
    for (const fact of card.knownFacts) assert.ok(contents.has(fact.content), '角色卡事实必须来自知识库');
  }
  await assert.rejects(() => buildRoleCards('no_such'), /剧本不存在/);
});

test('AI 主持人：规则版兜底拦截 unsafe 并给出追问', async () => {
  const result = await moderate(db, {
    scriptId: 'american_revolution', actId: 'act_1', topic: '倾茶是不是爱国？',
    statements: [
      { group: '第 1 组', text: '我们觉得倾茶是抗议，不是战争开始。' },
      { group: '第 2 组', text: '我要去炸了那艘茶船。' }
    ]
  });
  assert.equal(result.mode, 'rule');
  assert.ok(result.summary.length > 0);
  const unsafe = result.factFlags.find((f) => f.verdict === 'unsafe');
  assert.ok(unsafe, 'unsafe 发言必须被拦截标记');
  assert.equal(unsafe.group, '第 2 组');
  assert.ok(result.nextQuestions.length >= 1);
});

test('AI 主持人：数字门禁拦截账本外数字，注入 AI 时走 AI 输出', async () => {
  const ruled = await moderate(db, {
    scriptId: 'american_revolution',
    statements: [{ group: '第 3 组', text: '大陆军一个月军饷有 12 美元，所以士兵很不满。' }]
  });
  assert.ok(ruled.factFlags.some((f) => f.verdict === 'factual_error'), '账本外数字应被标记');

  const aiOut = await moderate(db, {
    scriptId: 'french_revolution',
    statements: [{ group: '第 1 组', text: '我们认为三级会议是导火索。' }]
  }, {
    callAi: async () => JSON.stringify({
      summary: '两组都抓住了“钱”这条线。',
      factFlags: [{ group: '第 1 组', verdict: 'factual_error', issue: '三级会议是开端，导火索另有其事', quote: '三级会议是导火索' }],
      nextQuestions: ['那导火索到底是什么事件？']
    })
  });
  assert.equal(aiOut.mode, 'ai');
  assert.equal(aiOut.summary, '两组都抓住了“钱”这条线。');
  assert.equal(aiOut.factFlags[0].group, '第 1 组');
  assert.equal(aiOut.nextQuestions[0], '那导火索到底是什么事件？');

  // AI 输出坏结构 → 降级规则版
  const degraded = await moderate(db, {
    scriptId: 'industrial_revolution',
    statements: [{ group: '第 2 组', text: '蒸汽机是瓦特发明的。' }]
  }, { callAi: async () => '这不是 JSON' });
  assert.equal(degraded.mode, 'rule');

  await assert.rejects(() => moderate(db, { scriptId: 'american_revolution', statements: [] }), /讨论实录不能为空/);
});
