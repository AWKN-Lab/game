import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  parseStructuredReply,
  buildStructuredInstruction,
  emotionToExpression
} from '../assets/js/npc-engine.js';

const root = process.cwd();
const consequences = JSON.parse(fs.readFileSync(path.join(root, 'data/npc_consequences.json'), 'utf8'));
const personas = JSON.parse(fs.readFileSync(path.join(root, 'data/npc_personas.json'), 'utf8'));

const parseOpts = {
  axes: consequences.axes,
  emotions: consequences.emotions,
  maxAxes: consequences.maxAxes,
  maxDelta: consequences.maxDelta,
  minDelta: consequences.minDelta
};

test('结构化输出：解析情绪与后果轴', () => {
  const raw = '（她把纸推到你面前。）\n{"emotion":"serious","consequence":{"insight":2,"sympathy":1}}';
  const result = parseStructuredReply(raw, parseOpts);
  assert.equal(result.reply, '（她把纸推到你面前。）');
  assert.equal(result.emotion, 'serious');
  assert.deepEqual(result.consequence, { insight: 2, sympathy: 1 });
});

test('结构化输出：白名单外的轴与情绪被丢弃', () => {
  const raw = '{"emotion":"angry","consequence":{"cheat":5,"insight":2}}';
  const result = parseStructuredReply(raw, parseOpts);
  assert.equal(result.emotion, null);
  assert.deepEqual(result.consequence, { insight: 2 });
});

test('结构化输出：数值被钳制在允许范围内', () => {
  const raw = '{"emotion":"calm","consequence":{"insight":99,"resolve":-99}}';
  const result = parseStructuredReply(raw, parseOpts);
  assert.equal(result.consequence.insight, consequences.maxDelta);
  assert.equal(result.consequence.resolve, consequences.minDelta);
});

test('结构化输出：没有 JSON 时保持原文', () => {
  const raw = '这只是一句普通的话。';
  const result = parseStructuredReply(raw, parseOpts);
  assert.equal(result.reply, raw);
  assert.deepEqual(result.consequence, {});
  assert.equal(result.emotion, null);
});

test('结构化输出：代码块包裹也能解析', () => {
  const raw = '正文。\n```json\n{"emotion":"calm","consequence":{"insight":1}}\n```';
  const result = parseStructuredReply(raw, parseOpts);
  assert.equal(result.reply, '正文。');
  assert.equal(result.consequence.insight, 1);
});

test('结构化指令里包含轴清单与情绪清单', () => {
  const instruction = buildStructuredInstruction({
    axes: consequences.axes,
    emotions: consequences.emotions,
    maxAxes: consequences.maxAxes,
    maxDelta: consequences.maxDelta
  });
  for (const axis of Object.keys(consequences.axes)) {
    assert.ok(instruction.includes(axis), `指令缺少轴：${axis}`);
  }
  for (const emotion of consequences.emotions) {
    assert.ok(instruction.includes(emotion), `指令缺少情绪：${emotion}`);
  }
});

test('每个 NPC 卡面都定义了情绪基线与情绪库', () => {
  for (const npc of personas.npcs) {
    assert.ok(npc.emotion_baseline, `${npc.npc_id} 缺少 emotion_baseline`);
    assert.ok(Array.isArray(npc.emotion_library) && npc.emotion_library.length, `${npc.npc_id} 缺少 emotion_library`);
    assert.ok(consequences.emotions.includes(npc.emotion_baseline), `${npc.npc_id} 的基线情绪不在词表内`);
    for (const emotion of npc.emotion_library) {
      assert.ok(consequences.emotions.includes(emotion), `${npc.npc_id} 的情绪 ${emotion} 不在词表内`);
    }
  }
});

test('情绪到立绘表情的映射可回落', () => {
  assert.equal(emotionToExpression('serious', ['normal', 'serious']), 'serious');
  assert.equal(emotionToExpression('hopeful', ['normal']), 'normal');
  assert.equal(emotionToExpression('unknown', ['normal', 'excited']), 'normal');
});

test('五个剧本都声明了后果轴映射与可对话角色', () => {
  const pages = [
    'xinhai_revolution.html',
    'wuxu_reform.html',
    'industrial_revolution.html',
    'american_revolution.html',
    'game-scene.html'
  ];
  for (const page of pages) {
    const source = fs.readFileSync(path.join(root, page), 'utf8');
    assert.ok(source.includes('consequenceAxes:'), `${page} 缺少 consequenceAxes`);
    assert.ok(source.includes('chatNpcs:'), `${page} 缺少 chatNpcs`);
    assert.ok(source.includes('in-game-npc-chat.js'), `${page} 未引入 in-game-npc-chat.js`);
    assert.ok(source.includes('npc-chat-client.js'), `${page} 未引入 npc-chat-client.js`);

    // 后果轴必须映射到本剧本真实存在的数值维度
    const labels = source.match(/valueLabels:\s*\{([^}]*)\}/);
    assert.ok(labels, `${page} 无法解析 valueLabels`);
    const dims = [...labels[1].matchAll(/([a-z_]+)\s*:/g)].map((m) => m[1]);
    const axesBlock = source.match(/consequenceAxes:\s*\{([^}]*)\}/);
    assert.ok(axesBlock, `${page} 无法解析 consequenceAxes`);
    for (const m of axesBlock[1].matchAll(/([a-z_]+)\s*:\s*'([a-z_]+)'/g)) {
      assert.ok(consequences.axes[m[1]], `${page} 的轴 ${m[1]} 不在词表内`);
      assert.ok(dims.includes(m[2]), `${page} 的轴 ${m[1]} 指向不存在的维度 ${m[2]}`);
    }
  }
});

test('服务端把结构化后果写进对话返回体', () => {
  const source = fs.readFileSync(path.join(root, 'server/services/npc-chat-service.js'), 'utf8');
  assert.ok(source.includes('parseStructuredReply'), '服务端未调用 parseStructuredReply');
  assert.ok(source.includes('buildStructuredInstruction'), '服务端未追加结构化指令');
  assert.ok(source.includes('emotion,'), '服务端返回体缺少 emotion');
  assert.ok(source.includes('consequence,'), '服务端返回体缺少 consequence');
  assert.ok(source.includes('unlockChoice,'), '服务端返回体缺少 unlockChoice');
});

test('引擎把对话结果接进游戏状态', () => {
  const source = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
  for (const fn of ['applyNpcTrust', 'applyNpcEmotion', 'applyNpcConsequence']) {
    assert.ok(source.includes(`function ${fn}(`), `engine.js 缺少 ${fn}`);
    assert.ok(source.includes(`window.gameHooks`), 'engine.js 未暴露 gameHooks');
  }
  assert.ok(source.includes("ttHook('npc.consequence_applied'"), 'engine.js 未上报后果事件');
  assert.ok(source.includes("ttHook('npc.emotion_changed'"), 'engine.js 未上报情绪事件');
});
