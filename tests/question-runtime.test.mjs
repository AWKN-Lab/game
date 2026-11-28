// W03：question-runtime 纯逻辑回归——稳定 ID 映射、种子化展示顺序、按 ID 判分
// 依据 ENG-14 §4：三选项 6 种、四选项 24 种全排列逐项断言；种子覆盖各位置；重复输入稳定；跨 attempt 可变化
import test from 'node:test';
import assert from 'node:assert';
import { normalizeQuestion, getDisplayOrder, evaluate } from '../assets/js/question-runtime.js';

const V1_Q3 = { q: '测试题三选', opts: ['A. 甲', 'B. 乙', 'C. 丙'], ans: 1, explain: 'x' };
const V1_Q4 = { q: '测试题四选', opts: ['A. 甲', 'B. 乙', 'C. 丙', 'D. 丁'], ans: 3, explain: 'x' };

test('v1 旧映射：索引 ans → 稳定 correctOptionId，optionId 按索引派生', () => {
  const n = normalizeQuestion(V1_Q3, 1, 'game-scene_evidence_3');
  assert.strictEqual(n.questionId, 'game-scene_evidence_3');
  assert.strictEqual(n.contentVersion, 1);
  assert.deepStrictEqual(n.options.map((o) => o.optionId), ['o1', 'o2', 'o3']);
  assert.strictEqual(n.correctOptionId, 'o2');
  assert.strictEqual(n.options[1].text, 'B. 乙');
});

test('v1 非法输入拒绝构建：ans 越界、选项不足、缺 fallbackQuestionId', () => {
  assert.throws(() => normalizeQuestion({ ...V1_Q3, ans: 9 }, 1, 'x'), /ans 越界/);
  assert.throws(() => normalizeQuestion({ q: 't', opts: ['只有一项'], ans: 0 }, 1, 'x'), /选项数/);
  assert.throws(() => normalizeQuestion(V1_Q3, 1, ''), /fallbackQuestionId/);
});

test('v≥2 显式 ID：重复 optionId 与悬空 correctOptionId 拒绝构建', () => {
  const ok = { questionId: 'q2', options: [{ optionId: 'a', text: '甲' }, { optionId: 'b', text: '乙' }], correctOptionId: 'b' };
  const n = normalizeQuestion(ok, 2);
  assert.strictEqual(n.correctOptionId, 'b');
  assert.throws(() => normalizeQuestion({ ...ok, options: [{ optionId: 'a', text: '甲' }, { optionId: 'a', text: '乙' }] }, 2), /重复/);
  assert.throws(() => normalizeQuestion({ ...ok, correctOptionId: 'zz' }, 2), /不在选项中/);
});

function allPermutations(items) {
  if (items.length <= 1) return [items.slice()];
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const rest = items.slice(0, i).concat(items.slice(i + 1));
    for (const p of allPermutations(rest)) out.push([items[i], ...p]);
  }
  return out;
}

test('三选项 6 种全排列均可由种子空间覆盖，且每个位置都当过正确项', () => {
  const q = normalizeQuestion(V1_Q3, 1, 'q3');
  const seen = new Set();
  const correctPositions = new Set();
  for (let k = 0; k < 400; k++) {
    const order = getDisplayOrder(q, `attempt-${k}`);
    seen.add(order.join('|'));
    correctPositions.add(order.indexOf('o2'));
  }
  assert.strictEqual(seen.size, 6, `三选项应覆盖 6 种排列，实际 ${seen.size}`);
  assert.deepStrictEqual([...correctPositions].sort(), [0, 1, 2], '正确项应覆盖全部显示位');
});

test('四选项 24 种全排列均可由种子空间覆盖', () => {
  const q = normalizeQuestion(V1_Q4, 1, 'q4');
  const seen = new Set();
  for (let k = 0; k < 1200; k++) {
    seen.add(getDisplayOrder(q, `attempt-${k}`).join('|'));
  }
  assert.strictEqual(seen.size, 24, `四选项应覆盖 24 种排列，实际 ${seen.size}`);
});

test('重复输入稳定：同（版本,题目,attempt）多次调用结果一致', () => {
  const q = normalizeQuestion(V1_Q4, 1, 'q4');
  const a = getDisplayOrder(q, 'attempt-abc');
  const b = getDisplayOrder(q, 'attempt-abc');
  assert.strictEqual(a.join('|'), b.join('|'));
});

test('跨 attempt 可变化：1200 个 attempt 至少出现 ≥2 种顺序（不要求两两必不同）', () => {
  const q = normalizeQuestion(V1_Q3, 1, 'q3');
  const seen = new Set();
  for (let k = 0; k < 1200; k++) {
    seen.add(getDisplayOrder(q, `attempt-${k}`).join('|'));
  }
  assert.ok(seen.size >= 2, '跨 attempt 顺序应可变化');
});

test('展示顺序是原集合的置换（不增不减不重）', () => {
  const q = normalizeQuestion(V1_Q4, 1, 'q4');
  for (let k = 0; k < 50; k++) {
    const order = getDisplayOrder(q, `attempt-${k}`);
    assert.strictEqual(order.length, 4);
    assert.strictEqual([...order].sort().join('|'), 'o1|o2|o3|o4');
  }
});

test('判分只按稳定 optionId：正确/错误/非法拒绝结算', () => {
  const q = normalizeQuestion(V1_Q4, 1, 'q4');
  assert.deepStrictEqual(evaluate(q, 'o4'), { correct: true, correctOptionId: 'o4' });
  assert.deepStrictEqual(evaluate(q, 'o1'), { correct: false, correctOptionId: 'o4' });
  assert.throws(() => evaluate(q, 'o9'), /拒绝结算/);
  assert.throws(() => evaluate(q, ''), /optionId/);
});

test('判分与展示顺序解耦：任意展示位上的 optionId 判分结果一致', () => {
  const q = normalizeQuestion(V1_Q3, 1, 'q3');
  for (let k = 0; k < 6 * 10; k++) {
    const order = getDisplayOrder(q, `attempt-${k}`);
    for (const optId of order) {
      const r = evaluate(q, optId);
      assert.strictEqual(r.correct, optId === 'o2');
    }
  }
});
