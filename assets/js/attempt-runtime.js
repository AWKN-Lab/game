/*!
 * attempt-runtime.js — 尝试（attempt）生命周期纯逻辑（ENG-14 W04 §5.1）
 * 状态机：NEW → ACTIVE → STORY_COMPLETE → QUIZ_COMPLETE。
 * 设计边界（ENG-14 口径）：
 * - 退出仅暂停：续玩复用同一 attemptId，不重发 script.start；
 * - 显式重开：生成新随机 UUID，旧结局历史由调用方保留，本模块不删任何记录；
 * - 纯逻辑、无 DOM/存储依赖：持久化字段落地在 data-store.js（后续切片），此处只做状态与身份；
 * - 无可靠身份时保留游玩并标观测不完整（observedIncomplete），由调用方决定上报口径。
 * ESM 导出供 node --test 与后续 data-store/event 桥接使用；同时挂 window.TTAttemptRuntime。
 */

const STATES = ['NEW', 'ACTIVE', 'STORY_COMPLETE', 'QUIZ_COMPLETE'];

// 合法迁移表：键=当前状态，值=事件→目标状态
const TRANSITIONS = {
  NEW: { start: 'ACTIVE' },
  ACTIVE: { storyComplete: 'STORY_COMPLETE' },
  STORY_COMPLETE: { quizComplete: 'QUIZ_COMPLETE' },
  QUIZ_COMPLETE: {}
};

function assertValidState(state) {
  if (!STATES.includes(state)) {
    throw new Error(`attempt-runtime: 未知状态 ${state}`);
  }
}

/**
 * 生成 attempt 身份。crypto 不可用（极端环境）时退化为 Math.random 拼接，
 * 仍满足「显式重开换新 ID、续玩同 ID」的语义；正常环境为 UUID v4。
 * @returns {string}
 */
export function newAttemptId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'att-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/**
 * 新建一次尝试。
 * @param {object} [opts]
 * @param {string} [opts.scriptId] 剧本标识
 * @param {string} [opts.contentVersion] 内容版本（W03 口径：题意/判分/顺序变化必须升版本）
 * @param {boolean} [opts.observedIncomplete] 无可靠身份时置 true，标观测不完整
 * @returns {{attemptId:string, attemptState:'NEW', scriptId:string, contentVersion:string, observedIncomplete:boolean, startedAt:number}}
 */
export function createAttempt(opts = {}) {
  return {
    attemptId: newAttemptId(),
    attemptState: 'NEW',
    scriptId: String(opts.scriptId || ''),
    contentVersion: String(opts.contentVersion || '1'),
    observedIncomplete: Boolean(opts.observedIncomplete),
    startedAt: Date.now()
  };
}

/**
 * 续玩：校验既有记录并原样返回身份与状态（退出仅暂停，不换 ID、不重置）。
 * 记录非法（缺 attemptId 或状态未知）时抛错，由调用方走存储异常分支。
 * @param {object} record data-store 持久化的 attempt 记录
 * @returns {object} 同一记录（同一 attemptId）
 */
export function resumeAttempt(record) {
  if (!record || typeof record.attemptId !== 'string' || !record.attemptId) {
    throw new Error('attempt-runtime: 缺少 attemptId，无法续玩');
  }
  assertValidState(record.attemptState);
  return record;
}

/**
 * 显式重开：生成全新 attemptId 与 NEW 状态；旧记录由调用方保留为历史，本函数不触碰。
 * @param {object} [opts] 同 createAttempt
 * @returns {object} 全新 attempt 记录
 */
export function restartAttempt(opts = {}) {
  return createAttempt(opts);
}

/**
 * 状态迁移。非法迁移抛错（含终态再迁移、跳阶段），调用方据此拒绝而非静默。
 * @param {object} record attempt 记录（原地更新 attemptState）
 * @param {'start'|'storyComplete'|'quizComplete'} event 迁移事件
 * @returns {object} 同一记录
 */
export function transition(record, event) {
  assertValidState(record.attemptState);
  const next = TRANSITIONS[record.attemptState][event];
  if (!next) {
    throw new Error(`attempt-runtime: 状态 ${record.attemptState} 不允许事件 ${event}`);
  }
  record.attemptState = next;
  return record;
}

/**
 * 是否已发过 script.start（NEW 之前的阶段都发过；续玩不重发由调用方依此判断）。
 * @param {object} record
 * @returns {boolean}
 */
export function hasStarted(record) {
  return record.attemptState !== 'NEW';
}

export const ATTEMPT_STATES = STATES;

// 经典脚本环境挂载（与 event-initiator.js 同约定）
if (typeof window !== 'undefined') {
  window.TTAttemptRuntime = {
    newAttemptId, createAttempt, resumeAttempt, restartAttempt,
    transition, hasStarted, ATTEMPT_STATES
  };
}
