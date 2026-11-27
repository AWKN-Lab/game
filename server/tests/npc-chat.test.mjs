import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npc-chat-test-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');
process.env.DATA_DIR = tempDir;
process.env.AI_ENABLED = 'false';

const { openDatabase, closeDatabase } = await import('../db/database.js');
const {
  sanitizeForStore,
  getNpcState,
  applyTrust,
  recordTurn,
  promoteKeyMemory,
  amendMemory,
  getActiveView,
  npcChat
} = await import('../services/npc-chat-service.js');

const db = openDatabase();
const ACTOR = 'actor_test_1';

test('DLP 过滤：手机号、证件号与长数字串入库前隐去', () => {
  assert.equal(sanitizeForStore('我手机是13812345678'), '我手机是[号码已隐去]');
  assert.equal(sanitizeForStore('证件号110101201001011234'), '证件号[证件号已隐去]');
  assert.equal(sanitizeForStore('编号123456789012345678'), '编号[证件号已隐去]');
  assert.equal(sanitizeForStore('1898年戊戌变法'), '1898年戊戌变法');
});

const { loadPersonas } = await import('../../assets/js/npc-engine.js');
const personas = await loadPersonas();

test('信任持久化：事件累加并跨调用保留，未知事件不生效', () => {
  const actor = ACTOR + '_trust';
  const r1 = applyTrust(db, actor, 'french_revolution', 'npc_lucien', personas, 'respect_his_type');
  assert.equal(r1.applied, true);
  assert.equal(r1.trust, 1);
  const r2 = applyTrust(db, actor, 'french_revolution', 'npc_lucien', personas, 'ask_about_brother_without_judgment');
  assert.equal(r2.trust, 2);
  const r3 = applyTrust(db, actor, 'french_revolution', 'npc_lucien', personas, 'no_such_event');
  assert.equal(r3.applied, false);
  assert.equal(r3.trust, 2);
  // 落库可查
  assert.equal(getNpcState(db, actor, 'french_revolution', 'npc_lucien').trust, 2);
});

test('npcChat：AI 不可用时降级规则版，信任与对话均持久化', async () => {
  const r1 = await npcChat(db, {
    actorId: ACTOR, scriptId: 'french_revolution', npcId: 'npc_lucien',
    message: '你见过国王吗？', trustEvent: 'respect_his_type'
  });
  assert.equal(r1.mode, 'rule');
  assert.equal(r1.trust, 1);
  assert.ok(r1.reply.length > 0);
  // 状态已落库
  const state = getNpcState(db, ACTOR, 'french_revolution', 'npc_lucien');
  assert.equal(state.trust, 1);
  assert.equal(state.version, 1);
  // 第二次调用读取到持久化的信任
  const r2 = await npcChat(db, {
    actorId: ACTOR, scriptId: 'french_revolution', npcId: 'npc_lucien', message: '排字快吗？'
  });
  assert.equal(r2.trust, 1);
  assert.equal(r2.mode, 'rule');
});

test('npcChat：NPC 与剧本不匹配时报错', async () => {
  await assert.rejects(
    npcChat(db, { actorId: ACTOR, scriptId: 'french_revolution', npcId: 'npc_tom', message: '你好' }),
    /NPC 与剧本不匹配/
  );
});

test('npcChat：注入的 AI 说漏账本外数字 → 重试修正；仍违规 → 门禁拦截降级', async () => {
  let calls = 0;
  const badAi = async () => {
    calls += 1;
    return calls === 1 ? '面包占日薪的88%，一天干十四个小时。' : '还是88%，没办法。';
  };
  const r = await npcChat(db, {
    actorId: ACTOR, scriptId: 'french_revolution', npcId: 'npc_lucien', message: '面包贵吗？'
  }, { callAi: badAi });
  assert.equal(calls, 2);
  assert.equal(r.retried, true);
  assert.equal(r.mode, 'rule');
  assert.equal(r.gateBlocked, true);
  assert.equal(r.fallbackReason, 'GATE_BLOCKED');
  // 落库的是规则版回复，不是违规原文
  const view = getActiveView(db, ACTOR, 'french_revolution', 'npc_lucien');
  const npcTurns = view.session.filter((t) => t.role === 'npc');
  assert.ok(!npcTurns.some((t) => t.text.includes('88%')));
});

test('npcChat：注入的 AI 首次违规、重试后合规 → 采用修正版', async () => {
  let calls = 0;
  const ai = async () => {
    calls += 1;
    return calls === 1 ? '签名的一千二百个人都记得。' : '那一份，我也签了。一千三百多个名字，我一个都记得。';
  };
  const r = await npcChat(db, {
    actorId: ACTOR + '_2', scriptId: 'wuxu_reform', npcId: 'npc_shen_yanqiu', message: '你真签了？'
  }, { callAi: ai });
  assert.equal(calls, 2);
  assert.equal(r.retried, true);
  assert.equal(r.mode, 'ai');
  assert.match(r.reply, /一千三百多个名字/);
});

test('记忆生命周期：窗口 7 轮，溢出归档 T4，活跃视图只看 ACTIVE', () => {
  const actor = ACTOR + '_mem';
  for (let i = 1; i <= 9; i++) recordTurn(db, actor, 'french_revolution', 'npc_lucien', 'user', `第${i}轮`);
  const view = getActiveView(db, actor, 'french_revolution', 'npc_lucien');
  assert.equal(view.session.length, 7);
  assert.equal(view.session[0].text, '第3轮');
  assert.equal(view.session[6].text, '第9轮');
  // 归档记录仍在库中（T4 证据可追溯）
  const archived = db.prepare(`SELECT COUNT(*) AS n FROM npc_memory_records
    WHERE actor_id=? AND tier='T4_ARCHIVE' AND state='ARCHIVED'`).get(actor);
  assert.equal(archived.n, 2);
});

test('内容哈希幂等：同角色同内容不重复入库', () => {
  const actor = ACTOR + '_dup';
  const r1 = recordTurn(db, actor, 'french_revolution', 'npc_lucien', 'user', '你敢印吗？');
  const r2 = recordTurn(db, actor, 'french_revolution', 'npc_lucien', 'user', '你敢印吗？');
  assert.equal(r1.duplicate, false);
  assert.equal(r2.duplicate, true);
  assert.equal(r2.memoryId, r1.memoryId);
});

test('关键记忆升格携带来源引用，修订操作走 CAS', () => {
  const actor = ACTOR + '_key';
  const turn = recordTurn(db, actor, 'french_revolution', 'npc_lucien', 'user', '你哥哥怎么样了？');
  const promoted = promoteKeyMemory(db, actor, 'french_revolution', 'npc_lucien', '学生问起哥哥，我没有接话。', '第四幕', [turn.memoryId]);
  assert.equal(promoted.duplicate, false);
  let view = getActiveView(db, actor, 'french_revolution', 'npc_lucien');
  assert.equal(view.keyMemories.length, 1);
  assert.equal(view.keyMemories[0].storyTime, '第四幕');

  // CAS：版本不匹配拒绝
  const conflict = amendMemory(db, actor, {
    memoryId: promoted.memoryId, operation: 'CORRECT', newContent: '改后的记忆', expectedVersion: 99
  });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.code, 'VERSION_CONFLICT');

  // CORRECT 成功后版本 +1
  const corrected = amendMemory(db, actor, {
    memoryId: promoted.memoryId, operation: 'CORRECT', newContent: '学生问起哥哥，我转去整理铅字。', expectedVersion: 1
  });
  assert.equal(corrected.ok, true);
  assert.equal(corrected.version, 2);

  // INVALIDATE 后退出活跃视图
  const invalidated = amendMemory(db, actor, {
    memoryId: promoted.memoryId, operation: 'INVALIDATE', expectedVersion: 2
  });
  assert.equal(invalidated.ok, true);
  view = getActiveView(db, actor, 'french_revolution', 'npc_lucien');
  assert.equal(view.keyMemories.length, 0);
});

test('FORGET 为硬删除（被遗忘权）', () => {
  const actor = ACTOR + '_forget';
  const turn = recordTurn(db, actor, 'french_revolution', 'npc_lucien', 'user', '说点别的吧');
  const forgotten = amendMemory(db, actor, {
    memoryId: turn.memoryId, operation: 'FORGET', expectedVersion: 1
  });
  assert.equal(forgotten.ok, true);
  assert.equal(forgotten.deleted, true);
  const row = db.prepare('SELECT * FROM npc_memory_records WHERE memory_id=?').get(turn.memoryId);
  assert.equal(row, undefined);
});

test('信任 CAS：状态行版本随更新递增，冲突可检测', () => {
  const actor = ACTOR + '_cas';
  const r1 = applyTrust(db, actor, 'wuxu_reform', 'npc_shen_yanqiu', personas, 'take_signature_seriously');
  assert.equal(r1.version, 1);
  const r2 = applyTrust(db, actor, 'wuxu_reform', 'npc_shen_yanqiu', personas, 'keep_his_secret_words');
  assert.equal(r2.version, 2);
  assert.equal(r2.trust, 2);
  // 版本单调：外部拿旧版本做比较可发现冲突
  const state = getNpcState(db, actor, 'wuxu_reform', 'npc_shen_yanqiu');
  assert.equal(state.version, 2);
  assert.notEqual(state.version, r1.version);
});

test.after(() => {
  closeDatabase();
});
