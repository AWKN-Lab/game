// W03 全量题目断言：五剧本 13 道证物 39 个选项 + 全部结业题，
// 逐题通过 question-runtime v1 旧数据映射（normalizeQuestion）验证稳定 ID 派生与判分可用
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert';
import * as qrt from '../assets/js/question-runtime.js';

const PAGES = {
  french_revolution: 'game-scene.html',
  american_revolution: 'american_revolution.html',
  industrial_revolution: 'industrial_revolution.html',
  wuxu_reform: 'wuxu_reform.html',
  xinhai_revolution: 'xinhai_revolution.html'
};

const BGM = new Proxy({}, { get: () => 'stub' });
const essayStub = new Proxy({}, { get: () => [] });

function extractPage(file) {
  const html = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
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
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {} }),
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: file });
  return sandbox.__result;
}

function collectEvidence(scriptId, dialog) {
  const rows = [];
  for (let i = 0; i < dialog.length; i++) {
    const line = dialog[i];
    if (line && line.type === 'evidence') {
      rows.push({ line, fallbackId: line.id || (scriptId + '_evidence_' + i) });
    }
  }
  return rows;
}

const pages = Object.entries(PAGES).map(([scriptId, file]) => ({ scriptId, file, ...extractPage(file) }));

test('W03 全量：五剧本均显式声明 contentVersion=1', () => {
  for (const { scriptId, file, GAME_CONFIG } of pages) {
    assert.strictEqual(GAME_CONFIG.contentVersion, 1, `${file} (${scriptId}) 需显式 contentVersion=1`);
  }
});

test('W03 全量：13 道证物 39 个选项逐题通过 v1 映射且判分正确', () => {
  let evidenceCount = 0;
  let optionCount = 0;
  for (const { scriptId, GAME_CONFIG, DIALOG_SCRIPT } of pages) {
    for (const { line, fallbackId } of collectEvidence(scriptId, DIALOG_SCRIPT)) {
      evidenceCount++;
      const opts = line.options;
      assert.ok(Array.isArray(opts) && opts.length >= 2, `${fallbackId} 选项数 ≥2`);
      optionCount += opts.length;
      // v1 不变量：correctIndex 标注一致且在范围内（engine 判分依据）
      const marks = opts.map((o) => o.correctIndex);
      for (const m of marks) {
        assert.ok(Number.isInteger(m) && m >= 0 && m < opts.length, `${fallbackId} correctIndex ${m} 越界`);
      }
      assert.strictEqual(new Set(marks).size, 1, `${fallbackId} 各选项 correctIndex 标注一致`);
      // v1 映射成功 + 正确项判分正确
      const nq = qrt.normalizeQuestion({ opts: opts.map((o) => o.text), ans: marks[0] }, GAME_CONFIG.contentVersion, fallbackId);
      assert.strictEqual(nq.correctOptionId, `o${marks[0] + 1}`, `${fallbackId} 正确项 optionId 派生`);
      for (const o of nq.options) {
        const res = qrt.evaluate(nq, o.optionId);
        assert.strictEqual(typeof res.correct, 'boolean', `${fallbackId} ${o.optionId} 判分可用`);
        assert.strictEqual(res.correct, o.optionId === nq.correctOptionId, `${fallbackId} ${o.optionId} 判分与标注一致`);
      }
      // 正确项应带反馈或效果（体验完整性）
      const correctOpt = opts[marks[0]];
      assert.ok(correctOpt.correctFeedback || correctOpt.effects, `${fallbackId} 正确项应有 correctFeedback 或 effects`);
    }
  }
  assert.strictEqual(evidenceCount, 13, '证物题总数 13');
  assert.strictEqual(optionCount, 39, '证物选项总数 39');
});

test('W03 全量：全部结业题逐题通过 v1 映射且判分正确', () => {
  let quizCount = 0;
  for (const { scriptId, GAME_CONFIG, DIALOG_SCRIPT } of pages) {
    void DIALOG_SCRIPT;
    const quiz = (GAME_CONFIG.QUIZ_DATA || []).map((q) => ({
      ...q,
      // 与 engine.js QUIZ_DATA 字段名兼容逻辑保持一致（question/options/answer/explanation → q/opts/ans/explain）
      q: q.q !== undefined ? q.q : q.question,
      opts: q.opts !== undefined ? q.opts : q.options,
      ans: q.ans !== undefined ? q.ans : q.answer,
      explain: q.explain !== undefined ? q.explain : q.explanation
    }));
    assert.ok(quiz.length > 0, `${scriptId} 结业题非空`);
    quiz.forEach((q, i) => {
      quizCount++;
      const fallbackId = q.id || (scriptId + '_quiz_' + (i + 1));
      assert.ok(q.q, `${fallbackId} 题干非空（字段名兼容后）`);
      assert.ok(Array.isArray(q.opts) && q.opts.length >= 2, `${fallbackId} 选项数 ≥2`);
      assert.ok(Number.isInteger(q.ans) && q.ans >= 0 && q.ans < q.opts.length, `${fallbackId} ans 越界`);
      assert.ok(q.explain, `${fallbackId} 解析非空`);
      const nq = qrt.normalizeQuestion({ opts: q.opts, ans: q.ans }, GAME_CONFIG.contentVersion, fallbackId);
      assert.strictEqual(nq.correctOptionId, `o${q.ans + 1}`, `${fallbackId} 正确项 optionId 派生`);
      for (const o of nq.options) {
        const res = qrt.evaluate(nq, o.optionId);
        assert.strictEqual(res.correct, o.optionId === nq.correctOptionId, `${fallbackId} ${o.optionId} 判分与标注一致`);
      }
    });
  }
  assert.ok(quizCount >= 10, `结业题总数 ${quizCount} ≥10`);
});
