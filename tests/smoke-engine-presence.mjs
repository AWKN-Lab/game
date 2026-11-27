// 冒烟：vm 沙箱加载 engine.js + 戊戌页配置，验证回响触发与信任门槛（MOD-ENGINE-04/05）
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert';

const root = new URL('..', import.meta.url).pathname;

function makeEl(id = '') {
  const el = {
    id, className: '', innerHTML: '', textContent: '', style: {}, value: '',
    children: [], dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild(c) { this.children.push(c); return c; },
    removeChild() {}, remove() {}, focus() {}, click() {},
    setAttribute() {}, getAttribute: () => null, addEventListener() {},
    querySelector(sel) { this._qs = this._qs || {}; return this._qs[sel] || (this._qs[sel] = makeEl(sel)); },
    querySelectorAll: () => [],
  };
  return el;
}

const savedProgressCalls = [];
const idCache = {};
const sandbox = {
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: (fn) => fn(),
  localStorage: (() => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; })(),
  Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, Map, Set, Promise, Error,
  document: {
    readyState: 'complete',
    body: makeEl('body'),
    head: makeEl('head'),
    documentElement: makeEl('html'),
    addEventListener() {},
    removeEventListener() {},
    getElementById: (id) => idCache[id] || (idCache[id] = makeEl(id)),
    createElement: (tag) => makeEl(tag),
    querySelector: () => null,
    querySelectorAll: () => [],
  },
  DataStore: {
    saveProgress: (p) => savedProgressCalls.push(p),
    loadProgress: () => null,
  },
  AudioManager: { playBGM() {}, playSFX() {}, BGM: {}, SFX: {} },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
// 浏览器中 npc-presence.js 以 ESM 挂载 window.NpcPresence；沙箱中直接注入
const presence = await import('../assets/js/npc-presence.js');
sandbox.NpcPresence = presence;
vm.createContext(sandbox);

// 注入戊戌页 GAME_CONFIG（页内引用的常量先置空壳）
const wuxu = fs.readFileSync(root + 'wuxu_reform.html', 'utf8');
const cfgMatch = wuxu.match(/window\.GAME_CONFIG = \{[\s\S]*?\n    \};/);
assert.ok(cfgMatch, '未能从戊戌页提取 GAME_CONFIG');
vm.runInContext('var WUXU_REFORM_ESSAY = null; var DIALOG_SCRIPT = [];', sandbox);
vm.runInContext(cfgMatch[0], sandbox, { filename: 'wuxu-config.js' });

// 加载引擎
const engine = fs.readFileSync(root + 'engine.js', 'utf8');
vm.runInContext(engine, sandbox, { filename: 'engine.js' });

// —— 回响：进第一幕记录选择，进第三幕应触发规则版回响 ——
sandbox.ttEmitActEnter('第一程', '第一程');
sandbox.recordChoiceForEcho('毫不犹豫地签上自己的名字', '第一幕');
sandbox.ttEmitActEnter('第三程', '第三程');
const panel = idCache.npcEchoPanel;
assert.ok(panel, '回响面板未出现');
assert.ok(panel.querySelector('.echo-panel-text').textContent.includes('毫不犹豫地签上自己的名字'), '回响未回读玩家选择原文');
assert.ok(panel.innerHTML.includes('沈砚秋'), '回响 NPC 名不对');

// —— 信任门槛：信任 0 时被拒，两次 +1 后通过 ——
const gated = { trust: { npc_shen_yanqiu: 1 }, minTrust: { npcId: 'npc_shen_yanqiu', value: 2, refuseText: '太险了。' } };
assert.equal(sandbox.applyChoiceTrust(gated), true, '信任不足应被拒绝');
const refusal = idCache.npcTrustRefusalOverlay;
assert.ok(refusal, '拒绝卡未出现');
assert.ok(refusal.querySelector('.trust-refusal-text').textContent.includes('太险了'), '拒绝文案不对');

sandbox.applyChoiceTrust({ trust: { npc_shen_yanqiu: 1 } });
sandbox.applyChoiceTrust({ trust: { npc_shen_yanqiu: 1 } });
assert.equal(sandbox.applyChoiceTrust(gated), false, '信任达门槛后不应再被拒绝');

// —— 持久化：npcTrust 已写入存档 ——
const last = savedProgressCalls[savedProgressCalls.length - 1];
assert.ok(last && last.npcTrust && last.npcTrust.npc_shen_yanqiu >= 2, '信任值未持久化');
assert.ok(last.choicesByAct && last.choicesByAct.act_1, '选择轨迹未持久化');

console.log('冒烟通过：回响触发、信任门槛、拒绝卡、持久化均正常');
