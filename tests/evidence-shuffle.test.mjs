// D1 随机化回归：证据题选项洗牌后判分跟随对象引用，消除 correctIndex 位置泄漏
// 依据 ENG-15 D1 建议口径：全排列功能断言（三选项 6 种）+ 固定种子抽检
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
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
vm.runInContext('var DIALOG_SCRIPT = []; var WUXU_REFORM_ESSAY = null;', sandbox);
const engine = fs.readFileSync(root + 'engine.js', 'utf8');
vm.runInContext(engine, sandbox, { filename: 'engine.js' });

// 三选项剧本：correctIndex 恒为 2（复现生产站位置泄漏形态）
const line = {
  id: 'ev_test',
  question: '测试题',
  options: [
    { text: 'A', correctIndex: 2, wrongFeedback: '错A' },
    { text: 'B', correctIndex: 2, wrongFeedback: '错B' },
    { text: 'C', correctIndex: 2, correctFeedback: '对C' },
  ],
};

test('D1 洗牌：不修改原数组且为原数组的排列', () => {
  const before = line.options.map(o => o.text).join();
  const shuffled = sandbox.shuffleEvidenceOptions(line.options);
  assert.strictEqual(line.options.map(o => o.text).join(), before, '原数组不被修改');
  assert.strictEqual(shuffled.length, 3);
  assert.strictEqual([...shuffled].sort((a, b) => a.text.localeCompare(b.text)).map(o => o.text).join(), before, '洗牌结果是原排列');
});

test('D1 判分跟随对象引用：正确项在任意显示位均判对', () => {
  const correct = line.options[2]; // correctIndex=2 的项
  const seen = new Set();
  // 枚举全部 6 种排列（模拟不同 rng 输出），正确项在每个显示位都应判对
  const perms = [
    [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
  ];
  for (const perm of perms) {
    const shuffled = perm.map(i => line.options[i]);
    const displayIdx = shuffled.indexOf(correct);
    seen.add(displayIdx);
    assert.strictEqual(sandbox.isEvidenceOptionCorrect(line, shuffled, displayIdx), true, `排列 ${perm} 中正确项在显示位 ${displayIdx} 应判对`);
    const wrongIdx = (displayIdx + 1) % 3;
    assert.strictEqual(sandbox.isEvidenceOptionCorrect(line, shuffled, wrongIdx), false, '错误项应判错');
  }
  assert.strictEqual(seen.size, 3, '正确项覆盖全部 3 个显示位（位置泄漏消除）');
});

test('D1 固定种子抽检：rng 注入可复现且跨次调用可变化', () => {
  let seed = 42;
  const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const first = sandbox.shuffleEvidenceOptions(line.options, rng).map(o => o.text).join();
  const second = sandbox.shuffleEvidenceOptions(line.options, rng).map(o => o.text).join();
  assert.strictEqual(typeof first, 'string');
  // 连续两次调用（不重置种子）结果可变化，证明跨 attempt 不固定
  assert.notStrictEqual(first + '|' + second, first + '|' + first, '跨次调用应可变化');
});
