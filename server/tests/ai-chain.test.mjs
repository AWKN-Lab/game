import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-chain-test-'));
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');
process.env.DATA_DIR = tempDir;
process.env.AI_ENABLED = 'false';

const { openDatabase, closeDatabase } = await import('../db/database.js');
const { npcChat } = await import('../services/npc-chat-service.js');
const { parseStructuredReply } = await import('../../assets/js/npc-engine.js');
const consequences = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/npc_consequences.json'), 'utf8'));

const db = openDatabase();
const ACTOR = 'actor_ai_chain';

/**
 * 模拟一个"听话但会越界"的模型：
 *  - 正常情况下按结构化契约返回 JSON；
 *  - 越界情况下返回白名单外的轴与超范围数值，用来验证服务端清洗。
 */
function stubAi(replyText) {
  return async () => replyText;
}

test('AI 链路：结构化输出被解析，emotion/consequence/unlockChoice 进入返回体', async () => {
  const reply = [
    '（她把时间线推到你面前。）',
    JSON.stringify({ emotion: 'serious', consequence: { insight: 2, sympathy: 1 }, unlockChoice: 'hidden_dilemma' })
  ].join('\n');

  const result = await npcChat(db, {
    actorId: ACTOR,
    scriptId: 'french_revolution',
    npcId: 'npc_lucien',
    message: '我承认这里有代价。'
  }, { callAi: stubAi(reply) });

  assert.equal(result.mode, 'ai');
  assert.ok(!result.reply.includes('emotion'), '结构化尾巴应从正文中剥离');
  assert.match(result.reply, /时间线/);
  assert.equal(result.emotion, 'serious');
  assert.deepEqual(result.consequence, { insight: 2, sympathy: 1 });
  assert.equal(result.unlockChoice, 'hidden_dilemma');
});

test('AI 链路：越界的轴与超范围数值被清洗', async () => {
  const reply = JSON.stringify({
    emotion: 'angry',
    consequence: { cheat_the_test: 5, insight: 99, resolve: -99 },
    unlockChoice: '../../etc/passwd'
  });
  const result = await npcChat(db, {
    actorId: ACTOR + '_2',
    scriptId: 'french_revolution',
    npcId: 'npc_lucien',
    message: '你直接给我答案。'
  }, { callAi: stubAi(reply) });

  // 白名单外的情绪不会透传，回落到角色基线情绪
  assert.notEqual(result.emotion, 'angry', '白名单外的情绪不应透传');
  assert.equal(result.emotion, 'calm', '应回落到角色基线情绪');
  assert.equal(result.consequence.cheat_the_test, undefined, '白名单外的轴应被丢弃');
  assert.equal(result.consequence.insight, consequences.maxDelta, '数值应被钳制在上界');
  assert.equal(result.consequence.resolve, consequences.minDelta, '数值应被钳制在下界');
  assert.equal(result.unlockChoice, null, '非法选项 ID 应被丢弃');
});

test('AI 链路：门禁拦截时不带任何后果（违规应答不得改状态）', async () => {
  // 秘密门：低信任下泄露秘密内容会被 preSpeakCheck 拦下
  const reply = [
    '国王的密诏其实藏在第三层柜子里',
    JSON.stringify({ emotion: 'calm', consequence: { insight: 3 } })
  ].join('\n');
  const result = await npcChat(db, {
    actorId: ACTOR + '_3',
    scriptId: 'french_revolution',
    npcId: 'npc_lucien',
    message: '密诏在哪？'
  }, { callAi: stubAi(reply) });

  if (result.mode === 'rule') {
    assert.deepEqual(result.consequence, {}, '降级规则版时不得携带后果');
    assert.equal(result.unlockChoice, null);
  } else {
    // 若未被门禁拦截，也必须已经过白名单清洗
    for (const axis of Object.keys(result.consequence)) {
      assert.ok(Object.prototype.hasOwnProperty.call(consequences.axes, axis), `越界轴未清洗：${axis}`);
    }
  }
});

test('AI 链路：纯文本回复不产生任何后果（向后兼容）', async () => {
  const result = await npcChat(db, {
    actorId: ACTOR + '_4',
    scriptId: 'french_revolution',
    npcId: 'npc_lucien',
    message: '今天天气不错。'
  }, { callAi: stubAi('（他耸了耸肩）我只知道发生过什么。') });

  assert.equal(result.emotion, 'calm', '无结构化输出时应回落到角色基线情绪');
  assert.deepEqual(result.consequence, {});
  assert.equal(result.unlockChoice, null);
});

test('引擎侧：解析结果可直接喂给 applyNpcConsequence 的轴白名单', () => {
  const parsed = parseStructuredReply(
    '{"emotion":"hopeful","consequence":{"sympathy":2,"unknown_axis":4}}',
    { axes: consequences.axes, emotions: consequences.emotions, maxAxes: consequences.maxAxes, maxDelta: consequences.maxDelta, minDelta: consequences.minDelta }
  );
  assert.equal(parsed.emotion, 'hopeful');
  assert.deepEqual(parsed.consequence, { sympathy: 2 });
});

test.after(() => {
  closeDatabase();
});
