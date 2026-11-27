import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadPersonas,
  getPersona,
  trustTier,
  applyTrustEvent,
  checkSecretGate,
  checkNumberGate,
  createMemoryStore,
  buildSystemPrompt,
  checkFourWay,
  preSpeakCheck
} from '../assets/js/npc-engine.js';

const NPC_IDS = [
  'npc_zijin',
  'npc_luoshu',
  'npc_lin_wenqing',
  'npc_shen_yanqiu',
  'npc_tom',
  'npc_captain_miller',
  'npc_lucien'
];

const REQUIRED_FIELDS = [
  'npc_id',
  'script_id',
  'name',
  'role',
  'mask',
  'obsession',
  'hook',
  'catchphrases',
  'avoid',
  'knowledge_boundary',
  'speech_examples',
  'trust_triggers',
  'secrets'
];

let personas;

test.before(async () => {
  personas = await loadPersonas();
});

test('七张 NPC 卡齐全且必填字段完整', () => {
  assert.equal(personas.npcs.length, 7);
  for (const npcId of NPC_IDS) {
    const npc = getPersona(personas, npcId);
    for (const field of REQUIRED_FIELDS) {
      assert.ok(npc[field] !== undefined && npc[field] !== null, `${npcId} 缺字段 ${field}`);
    }
    assert.ok(Array.isArray(npc.speech_examples) && npc.speech_examples.length >= 2, `${npcId} 示例对话不足`);
    assert.ok(Array.isArray(npc.trust_triggers) && npc.trust_triggers.length >= 1, `${npcId} 缺信任触发器`);
  }
});

test('每个剧本账本都有 forbidden/allowed 结构', () => {
  for (const scriptId of ['xinhai_revolution', 'wuxu_reform', 'industrial_revolution', 'american_revolution', 'french_revolution']) {
    const ledger = personas.ledger[scriptId];
    assert.ok(ledger, `缺 ${scriptId} 账本`);
    assert.ok(Array.isArray(ledger.forbidden));
    assert.ok(Array.isArray(ledger.allowed));
  }
});

test('buildSystemPrompt 含面具/执念/钩子/边界与剧本隔离声明', () => {
  const prompt = buildSystemPrompt({
    personas,
    npcId: 'npc_shen_yanqiu',
    scriptId: 'wuxu_reform',
    trust: 3
  });
  assert.match(prompt, /沈砚秋/);
  assert.match(prompt, /外在面具/);
  assert.match(prompt, /内在执念/);
  assert.match(prompt, /口头钩子/);
  assert.match(prompt, /知识边界/);
  assert.match(prompt, /剧本隔离/);
  assert.match(prompt, /《wuxu_reform》/);
  assert.doesNotMatch(prompt, /french_revolution/);
});

test('buildSystemPrompt 不注入其他剧本的记忆', () => {
  const prompt = buildSystemPrompt({
    personas,
    npcId: 'npc_tom',
    scriptId: 'industrial_revolution',
    trust: 2,
    session: [{ role: 'student', text: '你每天干多久？' }],
    keyMemories: [{ text: '学生帮他捡了工牌', story_time: '第二幕' }]
  });
  assert.match(prompt, /你每天干多久？/);
  assert.match(prompt, /第二幕/);
  assert.doesNotMatch(prompt, /吕西安/);
  assert.doesNotMatch(prompt, /断头台/);
});

test('信任档位边界：1=low，2=normal，5=high', () => {
  assert.equal(trustTier(1), 'low');
  assert.equal(trustTier(2), 'normal');
  assert.equal(trustTier(4), 'normal');
  assert.equal(trustTier(5), 'high');
});

test('信任事件按卡面 delta 累加，未知事件不生效', () => {
  const state = { personas, trust: {} };
  const r1 = applyTrustEvent(state, 'npc_shen_yanqiu', 'take_signature_seriously');
  assert.equal(r1.trust, 1);
  assert.equal(r1.tier, 'low');
  const r2 = applyTrustEvent(state, 'npc_shen_yanqiu', 'keep_his_secret_words');
  assert.equal(r2.trust, 2);
  assert.equal(r2.tier, 'normal');
  const r3 = applyTrustEvent(state, 'npc_shen_yanqiu', 'no_such_event');
  assert.equal(r3.applied, false);
  assert.equal(r3.trust, 2);
});

test('信任值钳制在 [-5, 10]', () => {
  const state = { personas, trust: {} };
  for (let i = 0; i < 20; i++) applyTrustEvent(state, 'npc_tom', 'treat_as_equal');
  assert.equal(state.trust.npc_tom, 10);
  for (let i = 0; i < 20; i++) applyTrustEvent(state, 'npc_lin_wenqing', 'ask_about_family');
  assert.equal(state.trust.npc_lin_wenqing, -5);
});

test('秘密门禁：吕西安低信任说漏判决公告 → 违规；高信任 → 通过', () => {
  const text = '排完那份判决公告，我把手洗了三遍。';
  const low = checkSecretGate(personas, 'npc_lucien', text, 2);
  assert.equal(low.ok, false);
  assert.equal(low.violations[0].secret_id, 'verdict_typesetting');
  const high = checkSecretGate(personas, 'npc_lucien', text, 5);
  assert.equal(high.ok, true);
});

test('秘密门禁：沈砚秋交抄件仅高信任可说', () => {
  const text = '那份抄件，我给你拿来了。';
  const low = checkSecretGate(personas, 'npc_shen_yanqiu', text, 4);
  assert.equal(low.ok, false);
  assert.equal(low.violations[0].secret_id, 'qian_list_delivery');
  const high = checkSecretGate(personas, 'npc_shen_yanqiu', text, 5);
  assert.equal(high.ok, true);
});

test('数字门禁：戊戌「一千二百」违规，「一千三百多」通过', () => {
  const bad = checkNumberGate(personas, 'wuxu_reform', '一千二百个名字，都签了。');
  assert.equal(bad.ok, false);
  const good = checkNumberGate(personas, 'wuxu_reform', '一千三百多个名字，我一个都记得。');
  assert.equal(good.ok, true);
});

test('数字门禁：工业「十二个钟头」违规，「十四个钟头」通过', () => {
  const bad = checkNumberGate(personas, 'industrial_revolution', '我一天干十二个钟头。');
  assert.equal(bad.ok, false);
  const good = checkNumberGate(personas, 'industrial_revolution', '我一天看十四个钟头的纱锭。');
  assert.equal(good.ok, true);
});

test('数字门禁：美国「五十分之一」违规，法国「十四个小时」违规', () => {
  const badUs = checkNumberGate(personas, 'american_revolution', '我们的税不到本土的五十分之一。');
  assert.equal(badUs.ok, false);
  const badFr = checkNumberGate(personas, 'french_revolution', '印刷工一天只干十四个小时。');
  assert.equal(badFr.ok, false);
  assert.equal(badFr.violations[0].label, '史实参考（印刷工特权工时），仅供编剧取用');
});

test('记忆窗口 7 轮逐出，且跨剧本隔离', () => {
  const mem = createMemoryStore();
  for (let i = 1; i <= 9; i++) {
    mem.addTurn('industrial_revolution', 'npc_tom', 'student', `第${i}轮`);
  }
  const session = mem.getSession('industrial_revolution', 'npc_tom');
  assert.equal(session.length, 7);
  assert.equal(session[0].text, '第3轮');
  assert.equal(session[6].text, '第9轮');
  // 同一 NPC 在另一剧本看不到工业剧本的对话
  assert.equal(mem.getSession('french_revolution', 'npc_tom').length, 0);
  // 关键记忆同样隔离
  mem.addKeyMemory('french_revolution', 'npc_tom', '另一剧本的记忆', '第一幕');
  assert.equal(mem.getKeyMemories('industrial_revolution', 'npc_tom').length, 0);
  assert.equal(mem.getKeyMemories('french_revolution', 'npc_tom').length, 1);
});

test('四联对账：位置/持有物/伤势/人际任一不一致即阻断', () => {
  const state = {
    location: '报馆二楼',
    inventory: ['一封同行来信'],
    injuries: ['左手被墨水烫伤'],
    relations: { 沈砚秋: '点头之交' }
  };
  const ok = checkFourWay(state, { location: '报馆二楼', items: ['一封同行来信'] });
  assert.equal(ok.ok, true);

  const bad = checkFourWay(state, {
    location: '码头仓库',
    items: ['一把手枪'],
    injuries: ['右腿中弹'],
    relations: { 林文清: '生死之交' }
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.violations.length, 4);
  assert.match(bad.violations[0], /位置不一致/);
  assert.match(bad.violations[1], /持有物不存在/);
  assert.match(bad.violations[2], /伤势未登记/);
  assert.match(bad.violations[3], /人际未登记/);

  const mismatch = checkFourWay(state, { relations: { 沈砚秋: '结拜兄弟' } });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.violations[0], /人际不一致/);
});

test('preSpeakCheck 一步自检：数字与秘密门禁合并报违规', () => {
  const bad = preSpeakCheck({
    personas,
    npcId: 'npc_shen_yanqiu',
    scriptId: 'wuxu_reform',
    text: '那份抄件我给你，上面一千二百个名字。',
    trust: 2
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.violations.some((v) => v.gate === 'number'));
  assert.ok(bad.violations.some((v) => v.gate === 'secret'));

  const good = preSpeakCheck({
    personas,
    npcId: 'npc_shen_yanqiu',
    scriptId: 'wuxu_reform',
    text: '那一份，我也签了。一千三百多个名字，我一个都记得。',
    trust: 2
  });
  assert.equal(good.ok, true);
});
