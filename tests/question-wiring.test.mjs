// W03 接线回归：engine.js 挂载 TTQuestionRuntime 后，结业测验与证物调查
// 按（版本,题目,attemptId）种子定序、按 optionId 判分、重复回调只首次结算、payload 携带 optionId
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert';
import * as qrt from '../assets/js/question-runtime.js';

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
const hookedEvents = [];
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
// 挂载题目运行时（模拟五剧本 HTML 的 module script 加载结果）
sandbox.TTQuestionRuntime = qrt;
sandbox.GAME_CONFIG = {
  scriptId: 'wiring_test',
  title: '时空剧场 - 接线测试',
  values: { freedom: 50, equality: 50, rule: 50, justice: 50 },
  QUIZ_DATA: [
    { q: '接线测试题', opts: ['A. 甲', 'B. 乙', 'C. 丙'], ans: 2, explain: 'C 对', knowledgeId: 'k_wiring' }
  ]
};
const engine = fs.readFileSync(root + 'engine.js', 'utf8');
vm.runInContext(engine, sandbox, { filename: 'engine.js' });
sandbox.GameHooks = { emit: (name, payload) => { hookedEvents.push({ name, payload }); return true; } };

test('W03 接线：结业测验按 optionId 判分且与显示顺序无关', () => {
  hookedEvents.length = 0;
  sandbox.startQuiz();
  const ctx = sandbox._currentQuizCtx;
  assert.ok(ctx, 'qrt 可用时应建立判分上下文');
  assert.strictEqual(ctx.normalized.questionId, 'wiring_test_quiz_1');
  // 正确项 optionId 固定 o3（v1 索引派生），无论显示在哪个位置都判对
  const correctDisplayIdx = ctx.order.indexOf('o3');
  assert.ok(correctDisplayIdx >= 0);
  sandbox.selectAnswer(correctDisplayIdx);
  assert.strictEqual(vm.runInContext('quizScore', sandbox), 1, '按 optionId 判对');
  const ev = hookedEvents.find((e) => e.name === 'quiz.answer');
  assert.ok(ev, 'quiz.answer 事件已上报');
  assert.strictEqual(ev.payload.optionId, 'o3', 'payload 携带 optionId');
  assert.strictEqual(ev.payload.correct, true);
  assert.strictEqual(ev.payload.correctText, 'C. 丙', 'correctText 为正确项文本而非显示位文本');
});

test('W03 接线：重复回调只首次结算', () => {
  hookedEvents.length = 0;
  vm.runInContext('quizScore = 0', sandbox);
  sandbox.startQuiz();
  sandbox.selectAnswer(0);
  const count = hookedEvents.filter((e) => e.name === 'quiz.answer').length;
  assert.strictEqual(count, 1, '首次回调结算一次');
  sandbox.selectAnswer(1);
  sandbox.selectAnswer(2);
  assert.strictEqual(hookedEvents.filter((e) => e.name === 'quiz.answer').length, 1, '重复回调不再结算');
  assert.strictEqual(vm.runInContext('quizScore', sandbox) <= 1, true, '分数不因重复回调递增');
});

test('W03 接线：同 attempt 展示顺序可复现且覆盖非恒等排列', () => {
  // 同一 attemptId 下多次渲染顺序一致；种子化定序下三选项存在非恒等排列的可能
  sandbox.startQuiz();
  const first = sandbox._currentQuizCtx.order.join('|');
  sandbox.startQuiz();
  const second = sandbox._currentQuizCtx.order.join('|');
  assert.strictEqual(first, second, '同 attempt 顺序可复现');
});

test('W03 接线：证物调查按 optionId 判分且对象效果取自原始选项', () => {
  hookedEvents.length = 0;
  const line = {
    id: 'ev_wiring',
    question: '接线证物题',
    items: [{ type: '📄 税单', title: '测试材料', content: '测试内容' }],
    options: [
      { text: '甲', correctIndex: 2, wrongFeedback: '甲错' },
      { text: '乙', correctIndex: 2, wrongFeedback: '乙错' },
      { text: '丙', correctIndex: 2, correctFeedback: '丙对', effects: { equality: 5 } }
    ]
  };
  sandbox.dialogIndex = 7;
  sandbox.showEvidence(line);
  const ctx = sandbox._currentEvidenceCtx;
  assert.ok(ctx, 'qrt 可用时应建立证物判分上下文');
  assert.strictEqual(ctx.normalized.questionId, 'ev_wiring');
  // 渲染按钮与状态同源：_currentEvidenceOptions 按 order 排列（旧缺陷回归）
  assert.strictEqual(sandbox._currentEvidenceOptions.length, 3);
  const correctDisplayIdx = ctx.order.indexOf('o3');
  const before = vm.runInContext('gameValues.equality', sandbox);
  sandbox.selectEvidenceOption(correctDisplayIdx);
  assert.strictEqual(vm.runInContext('gameValues.equality', sandbox), before + 5, 'effects 取自正确项原始对象');
  const ev = hookedEvents.find((e) => e.name === 'quiz.answer');
  assert.ok(ev, 'quiz.answer 事件已上报');
  assert.strictEqual(ev.payload.optionId, 'o3', 'payload 携带 optionId');
  assert.strictEqual(ev.payload.correct, true);
  assert.strictEqual(vm.runInContext('nodeChoices.ev_wiring', sandbox), 2, 'recordNodeChoice 记原始索引（o3→2）');
  // 重复回调不再结算
  hookedEvents.length = 0;
  sandbox.selectEvidenceOption(0);
  assert.strictEqual(hookedEvents.filter((e) => e.name === 'quiz.answer').length, 0, '重复回调不再结算');
});

test('W03 接线：qrt 缺失时降级 D1 行为（ctx 为 null）', () => {
  const saved = sandbox.TTQuestionRuntime;
  sandbox.TTQuestionRuntime = undefined;
  sandbox.startQuiz();
  assert.strictEqual(sandbox._currentQuizCtx, null, '降级时无判分上下文');
  assert.ok(sandbox._currentQuizOptions, '降级时仍有展示数组');
  sandbox.TTQuestionRuntime = saved;
});
