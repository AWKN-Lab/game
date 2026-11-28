// 稳定节点 flag 回归（W02 恒真条件修复）：vm 沙箱加载 engine.js，
// 验证 recordNodeChoice / choiceAt / choseAtNode 与 lastChoiceIndex 语义隔离
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

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
    querySelector: (sel) => idCache[sel] || (idCache[sel] = makeEl(sel)),
    querySelectorAll: () => [],
  },
  DataStore: { saveProgress: () => {}, loadProgress: () => null },
  AudioManager: { playBGM() {}, playSFX() {}, BGM: {}, SFX: {} },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// 页面级脚本变量先置空壳，避免引擎自动初始化触达未定义剧本
vm.runInContext('var DIALOG_SCRIPT = []; var WUXU_REFORM_ESSAY = null;', sandbox);

const engine = fs.readFileSync(root + 'engine.js', 'utf8');
vm.runInContext(engine, sandbox, { filename: 'engine.js' });

test('稳定节点 flag：记录后按节点+选项索引判定', () => {
  sandbox.recordNodeChoice('pc_ir_3_railway', 0);
  sandbox.recordNodeChoice('fr_boy_diary', 2);
  assert_ok(() => sandbox.choiceAt('pc_ir_3_railway', 0) === true, '节点+选项0 应命中');
  assert_ok(() => sandbox.choiceAt('pc_ir_3_railway', 1) === false, '同节点其他选项不应命中');
  assert_ok(() => sandbox.choiceAt('fr_boy_diary', 2) === true, '第二节点判定互不干扰');
});

test('稳定节点 flag：choseAtNode 区分「未到达」与「已作答任意选项」', () => {
  assert_ok(() => sandbox.choseAtNode('wx_tan_shitong') === false, '未到达节点应判定为否（修复恒真）');
  sandbox.recordNodeChoice('wx_tan_shitong', 1);
  assert_ok(() => sandbox.choseAtNode('wx_tan_shitong') === true, '任意选项作答后应判定为是');
  assert_ok(() => sandbox.choseAtNode('never_reached_node') === false, '未记录节点保持否');
});

test('稳定节点 flag：restartGame 重置节点记录，不影响 lastChoiceIndex 语义', () => {
  sandbox.recordNodeChoice('pc_xr_3_royalty', 0);
  assert_ok(() => sandbox.choseAtNode('pc_xr_3_royalty') === true, '前置：已记录');
  sandbox.restartGame();
  assert_ok(() => sandbox.choseAtNode('pc_xr_3_royalty') === false, '重开后节点记录应清空');
});

test('稳定节点 flag：空 nodeId 不写入', () => {
  sandbox.recordNodeChoice('', 0);
  sandbox.recordNodeChoice(null, 0);
  assert_ok(() => sandbox.choseAtNode('') === false, '空 nodeId 不产生记录');
});

function assert_ok(fn, msg) {
  if (!fn()) throw new Error(msg);
}
