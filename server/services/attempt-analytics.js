/**
 * W05 尝试（attempt）维度纯聚合模块（ENG-14 §6 验收要求）。
 *
 * 硬边界：纯函数——输入事件行数组，输出聚合结果；不做任何数据库访问（查询留在 app.js），
 * 不改写原始数据（product_events.event_id UNIQUE 保留，旧接口兼容）。
 *
 * 口径（ENG-14 §6 + ENG-15/16 默认执行项）：
 *  - 身份分类：payload.attemptId（合法 UUID）与 payload.contentVersion（非空）均有效 → new；
 *    两字段全缺 → legacy；部分缺失或格式非法 → invalid（隔离计数，不进任何分子分母）。
 *  - 冲突隔离：同一 attemptId 出现多个归属身份（actor_id，缺省回落 session_id）或多个
 *    scriptId 时，该 attempt 整体隔离进 conflicts，不进任何统计。
 *  - cohort 分母：有合法 script.start 的 attempt；孤立 script.ending / quiz.complete
 *    （无 start）记 unknown，不进分子也不进分母。
 *  - 去重：开始/故事完成/测验完成按 attempt+事件名去重；幕漏斗按 attempt+actId；
 *    首次答题按 attempt+questionId（occurred_at 升序，并列取 event_id 字典序——服务端确定性）。
 *  - 北极星「自主有效探索率」：尝试内玩家自主探索事件（initiator='player'）≥ N 的合法开始
 *    尝试数 / 合法开始尝试数；N 默认 3（ENG-15 建议，老板默认执行可否决）；零分母返回
 *    null（不可计算），不显示 0%。
 *  - 迟到事件：聚合按 occurred_at 排序重算，不依赖接收顺序；全量重算保证迟到事件保存后
 *    结果自动修正。
 *  - 版本口径：结果按 contentVersion 分组输出，禁止跨版本拼接趋势。
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const START_EVENT = 'script.start';
const STORY_END_EVENT = 'script.ending';
const QUIZ_COMPLETE_EVENT = 'quiz.complete';
const ACT_ENTER_EVENT = 'script.act_enter';
const QUIZ_ANSWER_EVENT = 'quiz.answer';
const EXPLORE_EVENT_NAMES = new Set(['script.card', 'npc.message_sent', 'npc.free_input_submitted']);

export const DEFAULT_AUTONOMY_N = 3;

function parsePayload(payload) {
  if (payload == null) return {};
  if (typeof payload === 'object') return payload;
  try { return JSON.parse(payload); } catch { return {}; }
}

/**
 * 身份三字段分类（ENG-14 §6）：new / legacy / invalid。
 * @param {{payload:object|string}} event 载荷含 attemptId/contentVersion
 * @returns {{kind:'new'|'legacy'|'invalid', attemptId:string|null, contentVersion:string|null}}
 */
export function classifyIdentity(event) {
  const payload = parsePayload(event?.payload);
  const attemptId = payload.attemptId;
  const contentVersion = payload.contentVersion;
  const hasAttempt = typeof attemptId === 'string' && attemptId.length > 0;
  const hasVersion = typeof contentVersion === 'string' && contentVersion.length > 0;
  if (!hasAttempt && !hasVersion) return { kind: 'legacy', attemptId: null, contentVersion: null };
  if (hasAttempt && hasVersion && UUID_RE.test(attemptId)) {
    return { kind: 'new', attemptId, contentVersion };
  }
  return { kind: 'invalid', attemptId: hasAttempt ? attemptId : null, contentVersion: hasVersion ? contentVersion : null };
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}

/**
 * 尝试维度纯聚合。
 * @param {Array<{eventId:string,name:string,actorId:string|null,sessionId:string|null,occurredAt:string,payload:object|string}>} rows
 * @param {{autonomyN?:number}} options
 */
export function aggregateAttempts(rows, options = {}) {
  const autonomyN = Number.isInteger(options.autonomyN) && options.autonomyN >= 1 ? options.autonomyN : DEFAULT_AUTONOMY_N;
  const isolated = { invalidEvents: 0, legacyEvents: 0, conflictAttempts: [], unknownCompletions: [] };
  const byAttempt = new Map();

  for (const raw of rows || []) {
    const payload = parsePayload(raw?.payload);
    const event = {
      eventId: String(raw?.eventId ?? ''),
      name: String(raw?.name ?? ''),
      actorId: raw?.actorId ?? null,
      sessionId: raw?.sessionId ?? null,
      occurredAt: String(raw?.occurredAt ?? ''),
      payload
    };
    const identity = classifyIdentity(event);
    if (identity.kind === 'invalid') { isolated.invalidEvents += 1; continue; }
    if (identity.kind === 'legacy') { isolated.legacyEvents += 1; continue; }

    let attempt = byAttempt.get(identity.attemptId);
    if (!attempt) {
      attempt = {
        attemptId: identity.attemptId,
        actors: new Set(),
        scriptIds: new Set(),
        contentVersions: new Set(),
        events: []
      };
      byAttempt.set(identity.attemptId, attempt);
    }
    const owner = event.actorId || event.sessionId || null;
    if (owner) attempt.actors.add(owner);
    if (event.payload.scriptId) attempt.scriptIds.add(event.payload.scriptId);
    attempt.contentVersions.add(identity.contentVersion);
    attempt.events.push(event);
  }

  // 冲突隔离：同 attemptId 多归属身份或多剧本 → 整体剔除
  for (const attempt of byAttempt.values()) {
    if (attempt.actors.size > 1 || attempt.scriptIds.size > 1) {
      isolated.conflictAttempts.push(attempt.attemptId);
      byAttempt.delete(attempt.attemptId);
    }
  }

  const attempts = [];
  const actFunnels = new Map(); // actId -> attempts
  const firstAnswers = new Map(); // scriptId|questionId -> {attempts, correct}

  for (const attempt of byAttempt.values()) {
    const events = attempt.events;
    const starts = events.filter((e) => e.name === START_EVENT);
    const endings = events.filter((e) => e.name === STORY_END_EVENT);
    const quizCompletes = events.filter((e) => e.name === QUIZ_COMPLETE_EVENT);
    const started = starts.length > 0;
    const scriptId = [...attempt.scriptIds][0] || null;
    const contentVersion = [...attempt.contentVersions][0] || null;
    const actorId = [...attempt.actors][0] || null;

    // 幕漏斗：按 attempt+actId 去重
    const enteredActs = new Set();
    for (const e of events) {
      if (e.name !== ACT_ENTER_EVENT) continue;
      const actId = e.payload.actId;
      if (typeof actId === 'string' && actId && !enteredActs.has(actId)) {
        enteredActs.add(actId);
        const key = actId;
        const slot = actFunnels.get(key) || { actId: key, attempts: 0 };
        slot.attempts += 1;
        actFunnels.set(key, slot);
      }
    }

    // 首次答题：按 attempt+questionId，occurred_at 升序、并列取 event_id 字典序
    const firstByQuestion = new Map();
    for (const e of events) {
      if (e.name !== QUIZ_ANSWER_EVENT) continue;
      const questionId = e.payload.questionId;
      if (typeof questionId !== 'string' || !questionId) continue;
      const prev = firstByQuestion.get(questionId);
      const candidate = { occurredAt: e.occurredAt, eventId: e.eventId, correct: e.payload.correct === true };
      if (!prev || candidate.occurredAt < prev.occurredAt
        || (candidate.occurredAt === prev.occurredAt && candidate.eventId < prev.eventId)) {
        firstByQuestion.set(questionId, candidate);
      }
    }
    for (const [questionId, first] of firstByQuestion) {
      if (!started) continue; // 孤立答题不计入首次答题口径（无 cohort 归属）
      const key = `${scriptId}|${questionId}`;
      const slot = firstAnswers.get(key) || { scriptId, questionId, attempts: 0, correct: 0 };
      slot.attempts += 1;
      if (first.correct) slot.correct += 1;
      firstAnswers.set(key, slot);
    }

    // 探索计数：尝试内玩家自主探索事件（不去重：每次互动都是一次探索行为）
    const exploreEvents = events.filter((e) => EXPLORE_EVENT_NAMES.has(e.name) && e.payload.initiator === 'player').length;

    attempts.push({
      attemptId: attempt.attemptId,
      scriptId,
      contentVersion,
      actorId,
      started,
      startedAt: started ? starts.map((e) => e.occurredAt).sort()[0] : null,
      storyComplete: endings.length > 0,
      quizComplete: quizCompletes.length > 0,
      orphan: !started && (endings.length > 0 || quizCompletes.length > 0),
      acts: [...enteredActs].sort(),
      firstAnswerCount: started ? firstByQuestion.size : 0,
      exploreEvents,
      autonomous: started && exploreEvents >= autonomyN
    });
    if (!started && (endings.length > 0 || quizCompletes.length > 0)) {
      isolated.unknownCompletions.push(attempt.attemptId);
    }
  }

  attempts.sort((a, b) => (a.startedAt || '').localeCompare(b.startedAt || '') || a.attemptId.localeCompare(b.attemptId));

  const cohort = attempts.filter((a) => a.started);
  const validStarts = cohort.length;
  const completed = cohort.filter((a) => a.storyComplete).length;
  const quizCompleted = cohort.filter((a) => a.quizComplete).length;
  const autonomousAttempts = cohort.filter((a) => a.autonomous).length;

  // 按剧本×版本分组（禁止跨版本拼接趋势）
  const byScriptMap = new Map();
  for (const a of cohort) {
    const key = `${a.scriptId}|${a.contentVersion}`;
    const slot = byScriptMap.get(key) || { scriptId: a.scriptId, contentVersion: a.contentVersion, attempts: 0, completed: 0, quizCompleted: 0, autonomousAttempts: 0 };
    slot.attempts += 1;
    if (a.storyComplete) slot.completed += 1;
    if (a.quizComplete) slot.quizCompleted += 1;
    if (a.autonomous) slot.autonomousAttempts += 1;
    byScriptMap.set(key, slot);
  }
  const byScript = [...byScriptMap.values()].map((slot) => ({
    ...slot,
    autonomyRate: slot.attempts ? round4(slot.autonomousAttempts / slot.attempts) : null
  }));

  return {
    autonomyN,
    totals: {
      attempts: attempts.length,
      validStarts,
      completed,
      quizCompleted,
      autonomousAttempts,
      // 零分母 → null（不可计算），不显示 0%
      autonomyRate: validStarts ? round4(autonomousAttempts / validStarts) : null
    },
    byScript,
    actFunnels: [...actFunnels.values()].sort((a, b) => b.attempts - a.attempts || a.actId.localeCompare(b.actId)),
    firstAnswers: [...firstAnswers.values()]
      .map((s) => ({ ...s, correctRate: s.attempts ? round4(s.correct / s.attempts) : null }))
      .sort((a, b) => a.scriptId.localeCompare(b.scriptId) || a.questionId.localeCompare(b.questionId)),
    attemptsDetail: attempts,
    isolated: {
      invalidEvents: isolated.invalidEvents,
      legacyEvents: isolated.legacyEvents,
      conflictAttempts: isolated.conflictAttempts.sort(),
      unknownCompletions: isolated.unknownCompletions.sort()
    }
  };
}
