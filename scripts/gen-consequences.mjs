#!/usr/bin/env node
/**
 * gen-consequences.mjs — 从剧本页面内联数据生成 MOD-ENGINE-04 后果登记。
 * 输出写入 data/teaching_metadata.json 的 scripts.<id>.consequences。
 * 运行：node scripts/gen-consequences.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import vm from 'vm';

const PAGES = {
  french_revolution: 'game-scene.html',
  american_revolution: 'american_revolution.html',
  industrial_revolution: 'industrial_revolution.html',
  wuxu_reform: 'wuxu_reform.html',
  xinhai_revolution: 'xinhai_revolution.html'
};

const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
function actIdFromScene(label) {
  const m = String(label || '').match(/第([一二三四五六七八九十]+)[幕程]/);
  const n = m && CN_NUM[m[1]];
  return n ? 'act_' + n : '';
}

const BGM = new Proxy({}, { get: () => 'stub' });
const essayStub = new Proxy({}, { get: () => [] });

function extractPage(file) {
  const html = readFileSync(file, 'utf8');
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const code = blocks.join('\n') + '; __result = { GAME_CONFIG, DIALOG_SCRIPT };';
  const sandbox = {
    AudioManager: { BGM, SFX: BGM },
    DataStore: {},
    VoiceManager: {},
    AMERICAN_REVOLUTION_ESSAY: essayStub,
    INDUSTRIAL_REVOLUTION_ESSAY: essayStub,
    WUXU_REFORM_ESSAY: essayStub,
    XINHAI_REVOLUTION_ESSAY: essayStub,
    console,
    __result: null
  };
  sandbox.window = sandbox;
  sandbox.document = {
    getElementById: () => null,
    addEventListener: () => {},
    createElement: () => ({ style: {} }),
    body: { appendChild: () => {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.__result;
}

const metaPath = 'data/teaching_metadata.json';
const meta = JSON.parse(readFileSync(metaPath, 'utf8'));

for (const [scriptId, file] of Object.entries(PAGES)) {
  const { DIALOG_SCRIPT } = extractPage(file);
  const byAct = {};
  let lastAct = '第一幕'; // 各剧本第一幕均无前置过渡，默认 act_1
  for (const line of DIALOG_SCRIPT) {
    if (line && line.type === 'act_transition') {
      lastAct = line.actTitle || lastAct;
      continue;
    }
    if (line && line.scene && /第[一二三四五六]幕/.test(line.scene)) lastAct = line.scene;
    if (!line || !['star_choice', 'pressure_choice', 'choice'].includes(line.type)) continue;
    const actId = actIdFromScene(lastAct);
    if (!actId) continue;
    byAct[actId] = byAct[actId] || [];
    byAct[actId].push(line);
  }

  const consequences = [];
  for (const [actId, nodes] of Object.entries(byAct)) {
    for (const node of nodes) {
      const entry = { actId, kind: 'key_choice', nodeType: node.type };
      if (node.id) entry.nodeId = node.id;
      entry.consequences = [];
      const fates = {};
      let effectKeys = new Set();
      for (const c of node.choices || []) {
        if (c.npcFate) {
          for (const [npcId, state] of Object.entries(c.npcFate)) {
            fates[npcId] = fates[npcId] || new Set();
            fates[npcId].add(state);
          }
        }
        if (c.effects) Object.keys(c.effects).forEach((k) => effectKeys.add(k));
      }
      for (const [npcId, states] of Object.entries(fates)) {
        entry.consequences.push({ type: 'npc_fate', npcId, states: [...states] });
      }
      if (effectKeys.size) entry.consequences.push({ type: 'resource', values: [...effectKeys] });
      if (entry.consequences.length) consequences.push(entry);
    }
  }
  for (const a of meta.scripts[scriptId].echoAnchors || []) {
    consequences.push({ actId: a.echoActId, kind: 'echo', anchorId: a.id, refersToActId: a.refersToActId });
  }
  meta.scripts[scriptId].consequences = consequences;
  console.log(scriptId, '->', consequences.length, '条后果登记');
}

writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
console.log('teaching_metadata.json 已更新');
