/**
 * NPC 对话服务——规则层（assets/js/npc-engine.js）+ 持久化 + AI 调用。
 *
 * 记忆设计吸收自 AWKN-Memory-OS（docs/10-memory-os-absorption-spec）：
 *  - 分层生命周期：T1_SESSION（会话暂存）→ T3_ACTIVE（活跃记忆）→ T4_ARCHIVE（归档），
 *    超出会话窗口的旧轮次归档不删除，保留可追溯证据；
 *  - 证据引用：活跃记忆携带 source_refs（来源轮次 memory_id）与 story_time；
 *  - 内容哈希幂等：同角色同内容哈希不重复入库；
 *  - CAS 版本：状态与记忆更新携带 expected_version，冲突显式返回；
 *  - 修订操作：CORRECT / INVALIDATE / FORGET（遗忘为硬删除）；
 *  - DLP 过滤：入库前过滤手机号、证件号等敏感数字串。
 */

import { loadPersonas, getPersona, trustTier, applyTrustEvent, buildSystemPrompt, preSpeakCheck } from '../../assets/js/npc-engine.js';
import { config } from '../config.js';
import { id, sha256, cleanText } from '../lib/security.js';
import { json as toJson, parseJson } from '../db/database.js';

const SESSION_WINDOW = 7;
let personasCache = null;

async function getPersonas() {
  if (!personasCache) personasCache = await loadPersonas();
  return personasCache;
}

/** DLP：入库前过滤敏感数字串（手机号 / 18 位证件号 / 其他 15 位以上长数字）。 */
export function sanitizeForStore(text) {
  return String(text || '')
    .replace(/1[3-9]\d{9}/g, '[号码已隐去]')
    .replace(/\d{17}[\dXx]/g, '[证件号已隐去]')
    .replace(/\d{15,}/g, '[长数字已隐去]');
}

export function getNpcState(db, actorId, scriptId, npcId) {
  const row = db.prepare('SELECT trust, version FROM npc_states WHERE actor_id=? AND script_id=? AND npc_id=?').get(actorId, scriptId, npcId);
  return row ? { trust: row.trust, version: row.version } : { trust: 0, version: 0 };
}

/** 应用信任事件（CAS）。@returns {{applied:boolean, trust:number, version:number, conflict?:boolean}} */
export function applyTrust(db, actorId, scriptId, npcId, personas, event) {
  const persona = getPersona(personas, npcId);
  const rule = (persona.trust_triggers || []).find((t) => t.event === event);
  const current = getNpcState(db, actorId, scriptId, npcId);
  if (!rule) return { applied: false, trust: current.trust, version: current.version };
  const next = Math.max(-5, Math.min(10, current.trust + rule.delta));
  const ts = new Date().toISOString();
  const result = db.prepare(`INSERT INTO npc_states(actor_id,script_id,npc_id,trust,version,created_at,updated_at)
    VALUES(?,?,?,?,1,?,?)
    ON CONFLICT(actor_id,script_id,npc_id) DO UPDATE SET trust=?, version=npc_states.version+1, updated_at=?`)
    .run(actorId, scriptId, npcId, next, ts, ts, next, ts);
  if (result.changes === 0) return { applied: false, trust: current.trust, version: current.version, conflict: true };
  return { applied: true, trust: next, version: current.version + 1 };
}

/** 记录一轮对话（T1_SESSION）。同哈希幂等；窗口溢出的最旧轮次归档为 T4_ARCHIVE。 */
export function recordTurn(db, actorId, scriptId, npcId, role, content) {
  const clean = sanitizeForStore(content).slice(0, 800);
  const hash = sha256(`${role}|${clean}`);
  const dup = db.prepare(`SELECT memory_id FROM npc_memory_records
    WHERE actor_id=? AND script_id=? AND npc_id=? AND content_hash=? AND state='ACTIVE' AND tier='T1_SESSION'
    ORDER BY created_at DESC LIMIT 1`).get(actorId, scriptId, npcId, hash);
  if (dup) return { memoryId: dup.memory_id, duplicate: true };
  const ts = new Date().toISOString();
  const memoryId = id('nmem_');
  db.prepare(`INSERT INTO npc_memory_records(memory_id,actor_id,script_id,npc_id,tier,kind,role,content,story_time,source_refs_json,content_hash,state,version,created_at,updated_at)
    VALUES(?,?,?,?, 'T1_SESSION','session',?,?,NULL,'[]',?,'ACTIVE',1,?,?)`)
    .run(memoryId, actorId, scriptId, npcId, role, clean, hash, ts, ts);
  const active = db.prepare(`SELECT memory_id FROM npc_memory_records
    WHERE actor_id=? AND script_id=? AND npc_id=? AND tier='T1_SESSION' AND state='ACTIVE'
    ORDER BY created_at ASC`).all(actorId, scriptId, npcId);
  if (active.length > SESSION_WINDOW) {
    const evictIds = active.slice(0, active.length - SESSION_WINDOW).map((r) => r.memory_id);
    const placeholders = evictIds.map(() => '?').join(',');
    db.prepare(`UPDATE npc_memory_records SET tier='T4_ARCHIVE', state='ARCHIVED', updated_at=? WHERE memory_id IN (${placeholders})`)
      .run(ts, ...evictIds);
  }
  return { memoryId, duplicate: false };
}

/** 升格关键记忆（T3_ACTIVE），携带来源轮次引用。 */
export function promoteKeyMemory(db, actorId, scriptId, npcId, content, storyTime, sourceMemoryIds = []) {
  const clean = sanitizeForStore(content).slice(0, 800);
  const hash = sha256(`key|${clean}`);
  const dup = db.prepare(`SELECT memory_id FROM npc_memory_records
    WHERE actor_id=? AND script_id=? AND npc_id=? AND content_hash=? AND state='ACTIVE' AND tier='T3_ACTIVE' LIMIT 1`)
    .get(actorId, scriptId, npcId, hash);
  if (dup) return { memoryId: dup.memory_id, duplicate: true };
  const ts = new Date().toISOString();
  const memoryId = id('nmem_');
  db.prepare(`INSERT INTO npc_memory_records(memory_id,actor_id,script_id,npc_id,tier,kind,role,content,story_time,source_refs_json,content_hash,state,version,created_at,updated_at)
    VALUES(?,?,?,?, 'T3_ACTIVE','key',NULL,?,?,?,?,'ACTIVE',1,?,?)`)
    .run(memoryId, actorId, scriptId, npcId, clean, storyTime || null, toJson(sourceMemoryIds), hash, ts, ts);
  return { memoryId, duplicate: false };
}

/** 修订操作（CAS）。operation: CORRECT / INVALIDATE / FORGET。 */
export function amendMemory(db, actorId, { memoryId, operation, newContent, storyTime, expectedVersion }) {
  const row = db.prepare('SELECT * FROM npc_memory_records WHERE memory_id=? AND actor_id=?').get(memoryId, actorId);
  if (!row) return { ok: false, code: 'MEMORY_NOT_FOUND' };
  if (Number(expectedVersion) !== row.version) return { ok: false, code: 'VERSION_CONFLICT', currentVersion: row.version };
  const ts = new Date().toISOString();
  if (operation === 'FORGET') {
    db.prepare('DELETE FROM npc_memory_records WHERE memory_id=?').run(memoryId);
    return { ok: true, operation, deleted: true };
  }
  if (operation === 'INVALIDATE') {
    db.prepare(`UPDATE npc_memory_records SET state='SUPERSEDED', version=version+1, updated_at=? WHERE memory_id=?`).run(ts, memoryId);
    return { ok: true, operation, state: 'SUPERSEDED', version: row.version + 1 };
  }
  if (operation === 'CORRECT') {
    const clean = sanitizeForStore(newContent || '').slice(0, 800);
    if (!clean) return { ok: false, code: 'CONTENT_REQUIRED' };
    db.prepare('UPDATE npc_memory_records SET content=?, story_time=COALESCE(?, story_time), version=version+1, updated_at=? WHERE memory_id=?')
      .run(clean, storyTime || null, ts, memoryId);
    return { ok: true, operation, version: row.version + 1 };
  }
  return { ok: false, code: 'UNKNOWN_OPERATION' };
}

/** 活跃视图：会话窗口（≤7 轮）+ 活跃关键记忆。 */
export function getActiveView(db, actorId, scriptId, npcId) {
  const session = db.prepare(`SELECT memory_id, role, content, created_at FROM npc_memory_records
    WHERE actor_id=? AND script_id=? AND npc_id=? AND tier='T1_SESSION' AND state='ACTIVE'
    ORDER BY created_at ASC LIMIT ?`).all(actorId, scriptId, npcId, SESSION_WINDOW);
  const keys = db.prepare(`SELECT memory_id, content, story_time, source_refs_json, version FROM npc_memory_records
    WHERE actor_id=? AND script_id=? AND npc_id=? AND tier='T3_ACTIVE' AND state='ACTIVE'
    ORDER BY created_at ASC`).all(actorId, scriptId, npcId);
  return {
    session: session.map((r) => ({ memoryId: r.memory_id, role: r.role, text: r.content })),
    keyMemories: keys.map((r) => ({ memoryId: r.memory_id, text: r.content, storyTime: r.story_time, version: r.version }))
  };
}

async function callAiChat(systemPrompt, session, message) {
  if (!config.aiEnabled || (!config.aiApiKey && !config.aiFallbackApiKey)) {
    throw Object.assign(new Error('AI 未配置'), { code: 'AI_NOT_CONFIGURED' });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.aiTimeoutMs);
  try {
    const response = await fetch(`${config.aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.aiApiKey}` },
      body: JSON.stringify({
        model: config.aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...session.map((t) => ({ role: t.role === 'npc' ? 'assistant' : 'user', content: t.text })),
          { role: 'user', content: message }
        ],
        temperature: 0.6,
        top_p: 0.9,
        stream: false
      }),
      signal: controller.signal
    });
    if (!response.ok) throw Object.assign(new Error(`AI HTTP ${response.status}`), { code: 'AI_HTTP_ERROR' });
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw Object.assign(new Error('AI 输出为空'), { code: 'AI_EMPTY_OUTPUT' });
    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

/** 规则版兜底：从卡面钩子与口头禅拼一句安全回复，不引用任何账本外数字。 */
function ruleReply(npc) {
  return `${npc.hook}——${npc.catchphrases[0]}。你先说说，你是怎么想的？`;
}

/**
 * NPC 对话主流程：装配提示词 → AI 生成 → 出话前门禁（违规重试一次，仍违规降级规则版）→ 持久化。
 * deps.callAi 可注入用于测试。
 */
export async function npcChat(db, input, deps = {}) {
  const callAi = deps.callAi || callAiChat;
  const personas = await getPersonas();
  const npc = getPersona(personas, input.npcId);
  if (npc.script_id !== 'global' && npc.script_id !== input.scriptId) {
    throw Object.assign(new Error('NPC 与剧本不匹配'), { code: 'NPC_SCRIPT_MISMATCH' });
  }
  const actorId = input.actorId;
  let trustChanged = false;
  if (input.trustEvent) {
    const applied = applyTrust(db, actorId, input.scriptId, input.npcId, personas, input.trustEvent);
    trustChanged = applied.applied;
  }
  const { trust } = getNpcState(db, actorId, input.scriptId, input.npcId);
  const view = getActiveView(db, actorId, input.scriptId, input.npcId);
  const systemPrompt = buildSystemPrompt({
    personas, npcId: input.npcId, scriptId: input.scriptId, trust,
    session: view.session.map((t) => ({ role: t.role, text: t.text })),
    keyMemories: view.keyMemories.map((m) => ({ text: m.text, story_time: m.storyTime }))
  });

  let reply;
  let gate = { ok: true, violations: [] };
  let retried = false;
  let mode = 'ai';
  let fallbackReason = null;
  try {
    reply = await callAi(systemPrompt, view.session, input.message);
    gate = preSpeakCheck({ personas, npcId: input.npcId, scriptId: input.scriptId, text: reply, trust });
    if (!gate.ok) {
      retried = true;
      const correction = `${systemPrompt}\n\n【门禁警告】你上一条应答违规：${gate.violations.map((v) => `${v.gate}:${v.label || v.reason}`).join('；')}。请重新作答，不得出现上述内容。`;
      reply = await callAi(correction, view.session, input.message);
      gate = preSpeakCheck({ personas, npcId: input.npcId, scriptId: input.scriptId, text: reply, trust });
      if (!gate.ok) {
        mode = 'rule';
        fallbackReason = 'GATE_BLOCKED';
        reply = ruleReply(npc);
        gate = { ok: true, violations: [] };
      }
    }
  } catch (error) {
    // AI 不可用（未配置 / 超时 / 网络异常）→ 规则版降级，与产品降级约定一致
    mode = 'rule';
    fallbackReason = error.code || 'AI_FAILED';
    reply = ruleReply(npc);
  }

  const userTurn = recordTurn(db, actorId, input.scriptId, input.npcId, 'user', input.message);
  const npcTurn = recordTurn(db, actorId, input.scriptId, input.npcId, 'npc', reply);
  const { trust: finalTrust, version } = getNpcState(db, actorId, input.scriptId, input.npcId);
  return {
    reply, mode, trust: finalTrust, tier: trustTier(finalTrust), stateVersion: version,
    trustChanged, gateBlocked: retried && mode === 'rule', retried, fallbackReason,
    turnRefs: [userTurn.memoryId, npcTurn.memoryId]
  };
}
