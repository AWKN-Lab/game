import test from 'node:test';
import assert from 'node:assert/strict';

const {
  actIdFromScene,
  buildRuleEcho,
  findEchoAnchors,
  trustTierOf,
  applyTrustDelta,
  trustNarrative,
  trustGateBlocked
} = await import('../assets/js/npc-presence.js');

test('幕次解析：五个剧本的场景标签都能映射到 act_N', () => {
  assert.equal(actIdFromScene('第三幕 · 国民议会'), 'act_3');
  assert.equal(actIdFromScene('第一幕 · 凡尔赛宫'), 'act_1');
  assert.equal(actIdFromScene('第六幕 · 自由星火永不灭'), 'act_6');
  assert.equal(actIdFromScene('第五幕 · 工业革命的代价'), 'act_5');
  assert.equal(actIdFromScene('第四幕 · 变法的失败与反思'), 'act_4');
});

test('幕次解析：非幕次标签返回空串', () => {
  assert.equal(actIdFromScene(''), '');
  assert.equal(actIdFromScene(null), '');
  assert.equal(actIdFromScene('1789年5月，凡尔赛宫'), '');
  assert.equal(actIdFromScene('星空抉择'), '');
});

test('规则版回响：代入标题与选择原文，相关率 100%', () => {
  const tpl = '还记得吗，在{actTitle}的时候，你说过「{choiceText}」。这话我排过版。';
  const out = buildRuleEcho(tpl, '旧制度危机', '我要自由。');
  assert.ok(out.includes('旧制度危机'));
  assert.ok(out.includes('我要自由。'));
  assert.ok(!out.includes('{'));
});

test('规则版回响：选择原文截断到 120 字，不产出占位文案', () => {
  const out = buildRuleEcho('{choiceText}', '', '长'.repeat(200));
  assert.equal(out.length, 120);
  const empty = buildRuleEcho('', 'x', 'y');
  assert.equal(empty, '');
});

test('回响锚点匹配：按 echoActId 过滤，空入参安全', () => {
  const anchors = [
    { id: 'a1', npcId: 'n1', echoActId: 'act_3', refersToActId: 'act_1' },
    { id: 'a2', npcId: 'n1', echoActId: 'act_4', refersToActId: 'act_2' }
  ];
  assert.deepEqual(findEchoAnchors(anchors, 'act_3').map((a) => a.id), ['a1']);
  assert.deepEqual(findEchoAnchors(anchors, 'act_9'), []);
  assert.deepEqual(findEchoAnchors(null, 'act_3'), []);
  assert.deepEqual(findEchoAnchors(anchors, ''), []);
});

test('信任档位：与 npc-engine 口径一致（>=5 high，>=2 normal，否则 low）', () => {
  assert.equal(trustTierOf(5), 'high');
  assert.equal(trustTierOf(10), 'high');
  assert.equal(trustTierOf(2), 'normal');
  assert.equal(trustTierOf(4), 'normal');
  assert.equal(trustTierOf(1), 'low');
  assert.equal(trustTierOf(-5), 'low');
  assert.equal(trustTierOf(undefined), 'low');
});

test('信任钳制：[-5, 10] 边界与非法入参', () => {
  assert.equal(applyTrustDelta(9, 5), 10);
  assert.equal(applyTrustDelta(-4, -5), -5);
  assert.equal(applyTrustDelta(0, 0), 0);
  assert.equal(applyTrustDelta(undefined, 2), 2);
  assert.equal(applyTrustDelta(3, undefined), 3);
});

test('信任叙事：只说态度不出现数值，方向与档位区分文案', () => {
  const up = trustNarrative('吕西安', 'high', 'up');
  const down = trustNarrative('吕西安', 'low', 'down');
  assert.ok(up.includes('吕西安'));
  assert.ok(!/\d/.test(up), '叙事文案不出现数字');
  assert.ok(!/\d/.test(down), '叙事文案不出现数字');
  assert.notEqual(up, down);
  assert.notEqual(trustNarrative('吕西安', 'normal', 'up'), trustNarrative('吕西安', 'high', 'up'));
});

test('信任门槛：不足时拒绝，不置灰选项', () => {
  assert.equal(trustGateBlocked(1, { value: 2 }), true);
  assert.equal(trustGateBlocked(2, { value: 2 }), false);
  assert.equal(trustGateBlocked(5, { value: 2 }), false);
  assert.equal(trustGateBlocked(5, null), false);
  assert.equal(trustGateBlocked(5, {}), false);
});
