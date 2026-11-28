/*!
 * question-runtime.js — 题目稳定 ID、种子化展示顺序与判分纯逻辑（ENG-14 W03）
 * 设计边界（ENG-14 §4 口径）：
 * - 每剧本显式 contentVersion；证物与结业测验均有稳定 questionId、optionId、唯一 correctOptionId；
 * - 旧 q.opts/q.ans（v1）通过旧版本映射适配：optionId 按索引派生（o1..oN），题意/答案/顺序算法变更必须提高版本；
 * - 展示顺序按（contentVersion, questionId, attemptId）种子派生，固定版本内可复现、跨 attempt 可变化；
 * - 判分只按稳定 optionId，禁止显示索引判定；非法选项不结算（抛错，由调用方 guard）；
 * - 纯逻辑、无 DOM/存储依赖；ESM 导出供 node --test，同时挂 window.TTQuestionRuntime。
 */

/** FNV-1a 32 位字符串哈希（确定性种子派生用） */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32：32 位种子 → 可复现 rng */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function assertNonEmptyString(v, name) {
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`question-runtime: ${name} 必须是非空字符串`);
  }
}

/**
 * 归一化题目：v1 旧数据（{q, opts, ans}）映射为稳定 ID 结构；v≥2 要求显式 ID。
 * @param {object} raw v1: {q, opts:[string], ans:number}；v≥2: {questionId, options:[{optionId,text}], correctOptionId}
 * @param {number|string} contentVersion 剧本内容版本
 * @param {string} fallbackQuestionId v1 无原生 ID 时由调用方按 剧本+节点 提供的稳定标识
 * @returns {{questionId, contentVersion, options:[{optionId,text}], correctOptionId}}
 */
export function normalizeQuestion(raw, contentVersion, fallbackQuestionId) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('question-runtime: raw 题目必须是非空对象');
  }
  const v = Number(contentVersion);
  if (!Number.isFinite(v) || v < 1) {
    throw new Error(`question-runtime: 非法 contentVersion ${contentVersion}`);
  }

  if (v === 1) {
    // v1 旧映射：optionId 按索引派生；questionId 由调用方提供（剧本+节点稳定标识）
    assertNonEmptyString(fallbackQuestionId, 'v1 fallbackQuestionId');
    if (!Array.isArray(raw.opts) || raw.opts.length < 2) {
      throw new Error(`question-runtime: ${fallbackQuestionId} 选项数必须 ≥2`);
    }
    if (!Number.isInteger(raw.ans) || raw.ans < 0 || raw.ans >= raw.opts.length) {
      throw new Error(`question-runtime: ${fallbackQuestionId} ans 越界`);
    }
    const options = raw.opts.map((text, i) => ({ optionId: `o${i + 1}`, text: String(text) }));
    const ids = options.map((o) => o.optionId);
    if (new Set(ids).size !== ids.length) {
      throw new Error(`question-runtime: ${fallbackQuestionId} optionId 重复`);
    }
    return {
      questionId: fallbackQuestionId,
      contentVersion: v,
      options,
      correctOptionId: `o${raw.ans + 1}`,
    };
  }

  // v≥2：显式 ID，逐项校验
  assertNonEmptyString(raw.questionId, 'questionId');
  if (!Array.isArray(raw.options) || raw.options.length < 2) {
    throw new Error(`question-runtime: ${raw.questionId} 选项数必须 ≥2`);
  }
  const options = raw.options.map((o) => {
    assertNonEmptyString(o && o.optionId, 'optionId');
    assertNonEmptyString(o && o.text, 'option text');
    return { optionId: o.optionId, text: o.text };
  });
  const ids = options.map((o) => o.optionId);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`question-runtime: ${raw.questionId} optionId 重复`);
  }
  assertNonEmptyString(raw.correctOptionId, 'correctOptionId');
  if (!ids.includes(raw.correctOptionId)) {
    throw new Error(`question-runtime: ${raw.questionId} correctOptionId 不在选项中`);
  }
  return {
    questionId: raw.questionId,
    contentVersion: v,
    options,
    correctOptionId: raw.correctOptionId,
  };
}

/**
 * 展示顺序：按（contentVersion, questionId, attemptId）种子 Fisher–Yates。
 * 同一三元组结果可复现；attemptId 不同则顺序可变化（不要求两两必不同）。
 * @returns {string[]} optionId 数组（与 question.options 等长、元素集合相同）
 */
export function getDisplayOrder(question, attemptId) {
  assertNonEmptyString(attemptId, 'attemptId');
  const seed = fnv1a(`${question.contentVersion}|${question.questionId}|${attemptId}`);
  const rng = mulberry32(seed);
  const arr = question.options.map((o) => o.optionId);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 判分：只按稳定 optionId。非法选项抛错（不结算），由调用方 guard 后再调。
 * @returns {{correct: boolean, correctOptionId: string}}
 */
export function evaluate(question, optionId) {
  assertNonEmptyString(optionId, 'optionId');
  if (!question.options.some((o) => o.optionId === optionId)) {
    throw new Error(`question-runtime: ${question.questionId} 不存在选项 ${optionId}，拒绝结算`);
  }
  return { correct: optionId === question.correctOptionId, correctOptionId: question.correctOptionId };
}

if (typeof window !== 'undefined') {
  window.TTQuestionRuntime = { normalizeQuestion, getDisplayOrder, evaluate };
}
