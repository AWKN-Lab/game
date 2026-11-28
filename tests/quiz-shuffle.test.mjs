// W03 回归：结业测验选项洗牌后判分跟随对象引用，消除 ans 位置泄漏
// 依据 ENG-14 W03 口径：三选项 6 种、四选项 24 种全排列逐项断言 + 固定种子抽检
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
  DataStore: { saveProgress: () => {}, loadProgress: () => null, saveWrongAnswer: () => {} },
  AudioManager: { playBGM() {}, playSFX() {}, BGM: {}, SFX: {} },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext('var DIALOG_SCRIPT = []; var WUXU_REFORM_ESSAY = null;', sandbox);
const engine = fs.readFileSync(root + 'engine.js', 'utf8');
vm.runInContext(engine, sandbox, { filename: 'engine.js' });

// 三选项题：ans 恒为 2（复现生产站位置泄漏形态）
const q3 = { q: '三选项题', opts: ['A. 甲', 'B. 乙', 'C. 丙'], ans: 2, explain: 'C 对' };
// 四选项题：ans 恒为 1（工业革命剧本实际形态）
const q4 = { q: '四选项题', opts: ['A. 甲', 'B. 乙', 'C. 丙', 'D. 丁'], ans: 1, explain: 'B 对' };

test('W03 洗牌：不修改原数组且为原数组的排列', () => {
  const before = q4.opts.join('|');
  const shuffled = sandbox.shuffleQuizOptions(q4.opts);
  assert.strictEqual(q4.opts.join('|'), before, '原数组不被修改');
  assert.strictEqual(shuffled.length, 4);
  assert.strictEqual([...shuffled].sort().join('|'), before, '洗牌结果是原排列');
});

function assertAllPermutations(q, n) {
  // 递归枚举全部 n! 种排列，正确项在每个显示位都应判对
  const perms = [];
  const arr = q.opts.map((_, i) => i);
  function permute(cur, rest) {
    if (rest.length === 0) { perms.push(cur); return; }
    for (let i = 0; i < rest.length; i++) permute([...cur, rest[i]], rest.filter((_, j) => j !== i));
  }
  permute([], arr);
  assert.strictEqual(perms.length, factorial(n), `应枚举 ${n}! 种排列`);
  const seen = new Set();
  for (const perm of perms) {
    const shuffled = perm.map(i => q.opts[i]);
    const correctOpt = q.opts[q.ans];
    const displayIdx = shuffled.indexOf(correctOpt);
    seen.add(displayIdx);
    assert.strictEqual(sandbox.isQuizOptionCorrect(q, shuffled, displayIdx), true, `排列 ${perm} 中正确项在显示位 ${displayIdx} 应判对`);
    const wrongIdx = (displayIdx + 1) % n;
    assert.strictEqual(sandbox.isQuizOptionCorrect(q, shuffled, wrongIdx), false, '错误项应判错');
  }
  assert.strictEqual(seen.size, n, `正确项覆盖全部 ${n} 个显示位（位置泄漏消除）`);
}

function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }

test('W03 三选项全排列 6 种：判分跟随对象引用', () => {
  assertAllPermutations(q3, 3);
});

test('W03 四选项全排列 24 种：判分跟随对象引用', () => {
  assertAllPermutations(q4, 4);
});

test('W03 固定种子抽检：rng 注入可复现且跨次调用可变化', () => {
  let seed = 42;
  const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const first = sandbox.shuffleQuizOptions(q4.opts, rng).join('|');
  const second = sandbox.shuffleQuizOptions(q4.opts, rng).join('|');
  assert.strictEqual(typeof first, 'string');
  assert.notStrictEqual(first + '|' + second, first + '|' + first, '跨次调用应可变化');
  // 同种子重置后可复现
  seed = 42;
  assert.strictEqual(sandbox.shuffleQuizOptions(q4.opts, rng).join('|'), first, '同种子应可复现');
});
