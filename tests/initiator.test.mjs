import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { defaultInitiator, applyInitiator } = await import('../assets/js/event-initiator.js');

test('默认分类：玩家自主事件判为 player', () => {
  assert.equal(defaultInitiator('script.card'), 'player');
  assert.equal(defaultInitiator('npc.message_sent'), 'player');
  assert.equal(defaultInitiator('npc.free_input_submitted'), 'player');
});

test('默认分类：剧情强制事件判为 script', () => {
  assert.equal(defaultInitiator('script.choice'), 'script');
  assert.equal(defaultInitiator('script.evidence_open'), 'script');
  assert.equal(defaultInitiator('script.knowledge_open'), 'script');
  assert.equal(defaultInitiator('quiz.answer'), 'script');
  assert.equal(defaultInitiator('quiz.complete'), 'script');
  assert.equal(defaultInitiator('script.ending'), 'script');
  assert.equal(defaultInitiator('npc.echo_referenced'), 'script');
  assert.equal(defaultInitiator('npc.trust_level_changed'), 'script');
});

test('默认分类：未知事件保守按 script 计，不虚高自主率', () => {
  assert.equal(defaultInitiator('page.view'), 'script');
  assert.equal(defaultInitiator('future.unknown_event'), 'script');
  assert.equal(defaultInitiator(''), 'script');
  assert.equal(defaultInitiator(null), 'script');
});

test('applyInitiator：缺失时注入默认值，原有负载字段不受影响', () => {
  const payload = applyInitiator('script.card', { scriptId: 'french_revolution', cardId: 'c1' });
  assert.equal(payload.initiator, 'player');
  assert.equal(payload.scriptId, 'french_revolution');
  assert.equal(payload.cardId, 'c1');

  const forced = applyInitiator('script.choice', { nodeId: 'n1' });
  assert.equal(forced.initiator, 'script');
  assert.equal(forced.nodeId, 'n1');
});

test('applyInitiator：调用方显式传合法值时优先，不覆盖', () => {
  assert.equal(applyInitiator('script.choice', { initiator: 'player' }).initiator, 'player');
  assert.equal(applyInitiator('script.card', { initiator: 'script' }).initiator, 'script');
});

test('applyInitiator：非法 initiator 值覆盖为默认分类', () => {
  assert.equal(applyInitiator('script.card', { initiator: 'auto' }).initiator, 'player');
  assert.equal(applyInitiator('script.choice', { initiator: null }).initiator, 'script');
  assert.equal(applyInitiator('script.choice', { initiator: 123 }).initiator, 'script');
});

test('applyInitiator：空负载与非对象负载安全', () => {
  assert.deepEqual(applyInitiator('script.card', {}), { initiator: 'player' });
  assert.deepEqual(applyInitiator('script.choice', null), { initiator: 'script' });
  assert.deepEqual(applyInitiator('script.choice', undefined), { initiator: 'script' });
  assert.deepEqual(applyInitiator('script.choice', 'bad'), { initiator: 'script' });
});

test('事件目录：探索类事件均已声明 initiator 字段（与 validate-events 门禁一致）', () => {
  const catalog = JSON.parse(fs.readFileSync(new URL('../data/event_catalog.json', import.meta.url), 'utf8'));
  const required = [
    'script.choice', 'script.evidence_open', 'script.knowledge_open', 'script.card',
    'quiz.answer', 'quiz.complete', 'script.ending',
    'npc.message_sent', 'npc.free_input_submitted', 'npc.echo_referenced', 'npc.trust_level_changed'
  ];
  for (const name of required) {
    const definition = catalog.events.find((event) => event.name === name);
    assert.ok(definition, `目录缺少事件 ${name}`);
    assert.ok(
      definition.allowedPayloadKeys.includes('initiator'),
      `${name} 未声明 initiator 字段`
    );
  }
});

test('事件目录：initiator 之外的事件未被误加字段（目录改动最小化）', () => {
  const catalog = JSON.parse(fs.readFileSync(new URL('../data/event_catalog.json', import.meta.url), 'utf8'));
  const withInitiator = catalog.events
    .filter((event) => (event.allowedPayloadKeys || []).includes('initiator'))
    .map((event) => event.name);
  assert.deepEqual(withInitiator.sort(), [
    'npc.echo_referenced', 'npc.free_input_submitted', 'npc.message_sent', 'npc.trust_level_changed',
    'quiz.answer', 'quiz.complete', 'script.card', 'script.choice', 'script.ending',
    'script.evidence_open', 'script.knowledge_open'
  ].sort());
});
