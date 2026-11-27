/**
 * M12 课堂多人（教师导演制）服务。
 *
 * 硬边界（总 PRD 3.4 第二步 + CMP-03「不做」节）：
 *  - 不做 WebSocket 实时同步：教师设备是唯一入口，所有状态变更由教师端请求驱动；
 *  - 不做实时投票：选择分布来自教师录入的举手统计，不是学生端实时上报；
 *  - 学生角色卡为打印/本机查看的静态卡，信息不对称靠卡片内容切分，不靠在线状态。
 *
 * 事实边界：角色卡与主持人规则版只引用剧本知识库（knowledge_points / teaching_metadata）
 * 与 docs/npc/ 派生的人设公开面，不引入账本外数字，不虚构剧本内人物。
 */

import fs from 'node:fs';
import path from 'node:path';
import { loadPersonas, checkNumberGate } from '../../assets/js/npc-engine.js';
import { config, ROOT_DIR } from '../config.js';
import { id, cleanText, safeInteger } from '../lib/security.js';
import { json as toJson } from '../db/database.js';

const metadata = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/teaching_metadata.json'), 'utf8'));
const knowledgePoints = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/knowledge_points.json'), 'utf8'));
function loadKnowledgePoints() {
  return knowledgePoints;
}

/** 剧本中文名（与 script-registry.js 的 name 对齐；服务端无法直接引浏览器全局，故此处对齐维护）。 */
const SCRIPT_TITLES = {
  american_revolution: '美国独立战争', french_revolution: '法国大革命', industrial_revolution: '工业革命',
  wuxu_reform: '戊戌变法', xinhai_revolution: '辛亥革命'
};

export const SESSION_STATUSES = ['briefing', 'acting', 'discussion', 'paused', 'closed'];
export const STATUS_LABELS = {
  briefing: '导入', acting: '推进剧情', discussion: '小组讨论', paused: '暂停讨论', closed: '已结课'
};

/** 口令字符集：去掉 0/O/1/I/L 等易混淆字符。 */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;

const UNSAFE_PATTERNS = [/我(要|会|去).{0,8}(杀|炸|毒|砍)/, /自(杀|残)/, /弄死/];

function makeJoinCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function supportedScript(scriptId) {
  return Object.prototype.hasOwnProperty.call(metadata.scripts || {}, scriptId);
}

function scriptActs(scriptId) {
  return metadata.scripts[scriptId]?.acts || [];
}

function actTitle(scriptId, actId) {
  return (scriptActs(scriptId).find((a) => a.id === actId) || {}).title || null;
}

/** 创建课堂会话（教师端）。口令冲突时重试，最多 5 次。 */
export function createSession(db, { teacherActorId, scriptId, title }) {
  if (!supportedScript(scriptId)) {
    throw Object.assign(new Error('剧本不存在'), { code: 'UNKNOWN_SCRIPT' });
  }
  const acts = scriptActs(scriptId);
  const ts = new Date().toISOString();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const joinCode = makeJoinCode();
    try {
      const result = db.prepare(`INSERT INTO classroom_sessions(id,join_code,script_id,teacher_actor_id,title,act_id,status,created_at,updated_at)
        VALUES(?,?,?,?,?,?, 'briefing', ?, ?)`)
        .run(id('cls_'), joinCode, scriptId, teacherActorId || null, cleanText(title, 80) || null, acts[0]?.id || null, ts, ts);
      if (result.changes === 0) throw new Error('插入失败');
      const row = db.prepare('SELECT * FROM classroom_sessions WHERE join_code=?').get(joinCode);
      return sessionView(row);
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
}

export function getSessionByCode(db, code) {
  return db.prepare('SELECT * FROM classroom_sessions WHERE join_code=?').get(cleanText(code, 12).toUpperCase()) || null;
}

export function latestTally(db, sessionId) {
  const row = db.prepare('SELECT * FROM classroom_tallies WHERE session_id=? ORDER BY created_at DESC LIMIT 1').get(sessionId);
  return row ? { tallyId: row.id, actId: row.act_id, topic: row.topic, total: row.total, distribution: JSON.parse(row.counts_json), createdAt: row.created_at } : null;
}

export function sessionView(row, db) {
  const script = metadata.scripts[row.script_id] || {};
  return {
    id: row.id, joinCode: row.join_code, scriptId: row.script_id, scriptTitle: SCRIPT_TITLES[row.script_id] || row.script_id,
    title: row.title, teacherActorId: row.teacher_actor_id, actId: row.act_id, actTitle: actTitle(row.script_id, row.act_id),
    status: row.status, statusLabel: STATUS_LABELS[row.status] || row.status,
    acts: scriptActs(row.script_id).map((a) => ({ id: a.id, title: a.title, minutes: a.minutes })),
    latestTally: db ? latestTally(db, row.id) : null, createdAt: row.created_at, updatedAt: row.updated_at
  };
}

/** 教师控节奏：切换幕次与课堂状态。已结课的课堂只读。 */
export function updatePacing(db, code, { actId, status }) {
  const row = getSessionByCode(db, code);
  if (!row) throw Object.assign(new Error('课堂不存在'), { code: 'CLASSROOM_NOT_FOUND' });
  if (row.status === 'closed') throw Object.assign(new Error('课堂已结课'), { code: 'CLASSROOM_CLOSED' });
  const nextAct = actId === undefined ? row.act_id : cleanText(actId, 40);
  if (nextAct !== row.act_id) {
    if (!actTitle(row.script_id, nextAct)) throw Object.assign(new Error('幕次不存在'), { code: 'ACT_NOT_FOUND' });
  }
  const nextStatus = status === undefined ? row.status : cleanEnumStatus(status);
  if (nextAct === row.act_id && nextStatus === row.status) return sessionView(row, db);
  db.prepare('UPDATE classroom_sessions SET act_id=?, status=?, updated_at=? WHERE id=?')
    .run(nextAct, nextStatus, new Date().toISOString(), row.id);
  return sessionView(getSessionByCode(db, row.join_code), db);
}

function cleanEnumStatus(value) {
  const clean = cleanText(value, 20);
  if (!SESSION_STATUSES.includes(clean)) {
    throw Object.assign(new Error('课堂状态不合法'), { code: 'INVALID_STATUS' });
  }
  return clean;
}

/**
 * 教师录入举手统计并计算分布（不是实时投票：学生举手，教师录数）。
 * entries: [{label, count}]，1–8 项，单项 0–999 人。
 */
export function recordTally(db, code, { actId, topic, entries }) {
  const row = getSessionByCode(db, code);
  if (!row) throw Object.assign(new Error('课堂不存在'), { code: 'CLASSROOM_NOT_FOUND' });
  if (row.status === 'closed') throw Object.assign(new Error('课堂已结课'), { code: 'CLASSROOM_CLOSED' });
  const list = Array.isArray(entries) ? entries.slice(0, 8) : [];
  const clean = list
    .map((item) => ({ label: cleanText(item?.label, 60), count: safeInteger(item?.count, 0, 999, 0) }))
    .filter((item) => item.label);
  if (!clean.length) throw Object.assign(new Error('至少录入一个选项的举手数'), { code: 'TALLY_EMPTY' });
  const useAct = actId === undefined ? row.act_id : cleanText(actId, 40);
  if (!actTitle(row.script_id, useAct)) throw Object.assign(new Error('幕次不存在'), { code: 'ACT_NOT_FOUND' });
  const total = clean.reduce((sum, item) => sum + item.count, 0);
  const distribution = clean
    .map((item) => ({ ...item, pct: total > 0 ? Math.round((item.count * 100) / total) : 0 }))
    .sort((a, b) => b.count - a.count);
  const ts = new Date().toISOString();
  const tallyId = id('tal_');
  db.prepare(`INSERT INTO classroom_tallies(id,session_id,act_id,topic,counts_json,total,created_at)
    VALUES(?,?,?,?,?,?,?)`)
    .run(tallyId, row.id, useAct, cleanText(topic, 120) || null, toJson(distribution), total, ts);
  db.prepare('UPDATE classroom_sessions SET act_id=?, updated_at=? WHERE id=?').run(useAct, ts, row.id);
  return { tallyId, actId: useAct, actTitle: actTitle(row.script_id, useAct), topic: cleanText(topic, 120) || null, total, distribution, leader: distribution[0] };
}

/**
 * 学生角色卡（信息不对称）：从剧本知识库切分事实，每组只拿部分信息。
 * 见证者公开面取自该剧本 NPC 人设（docs/npc/ 派生），不虚构人物与数字。
 * 同一输入永远得到同一组卡（确定性切分），便于教师打印与分发。
 */
export async function buildRoleCards(scriptId) {
  if (!supportedScript(scriptId)) {
    throw Object.assign(new Error('剧本不存在'), { code: 'UNKNOWN_SCRIPT' });
  }
  const kp = (loadKnowledgePoints()[scriptId] || {}).history || [];
  const personas = (await loadPersonas()).npcs.filter((p) => p.script_id === scriptId);
  const witness = personas[0] || null;
  const script = metadata.scripts[scriptId] || {};
  const CARD_COUNT = Math.min(5, Math.max(2, Math.ceil(kp.length / 2)));
  const cards = [];
  for (let i = 0; i < CARD_COUNT; i += 1) {
    const facts = kp.filter((_, index) => index % CARD_COUNT === i).map((k) => ({ name: k.name, content: k.content, act: k.act }));
    const firstAct = facts[0]?.act;
    const actMeta = scriptActs(scriptId).find((a) => a.id === `act_${firstAct}`) || null;
    cards.push({
      cardId: `rc_${scriptId}_${i + 1}`,
      groupLabel: `第 ${i + 1} 组`,
      witness: witness ? { name: witness.name, role: witness.role, hook: witness.hook } : null,
      actFocus: actMeta ? { actId: actMeta.id, title: actMeta.title, focus: actMeta.focus } : null,
      knownFacts: facts,
      note: '本卡信息只给本组：其他组持有本剧其他关键信息，讨论时需要交换才能拼出完整因果。'
    });
  }
  return {
    scriptId, scriptTitle: SCRIPT_TITLES[scriptId] || scriptId,
    publicBrief: { objectives: script.objectives || [], misconceptions: script.commonMisconceptions || [] },
    cards
  };
}

/**
 * AI 主持人：分组讨论的主持与裁判。
 * 输入讨论实录（组号＋发言），输出：讨论小结、事实红旗（逐条规则门禁＋unsafe 拦截）、下一步追问。
 * AI 不可用时规则版兜底：小结用模板，红旗用数字门禁，追问取剧本常见误区。deps.callAi 可注入。
 */
export async function moderate(db, { scriptId, actId, topic, statements }, deps = {}) {
  if (!supportedScript(scriptId)) {
    throw Object.assign(new Error('剧本不存在'), { code: 'UNKNOWN_SCRIPT' });
  }
  const list = (Array.isArray(statements) ? statements : []).slice(0, 12)
    .map((item) => ({ group: cleanText(item?.group, 40) || '未分组', text: cleanText(item?.text, 500) }))
    .filter((item) => item.text);
  if (!list.length) throw Object.assign(new Error('讨论实录不能为空'), { code: 'STATEMENTS_REQUIRED' });
  const cleanTopic = cleanText(topic, 160) || actTitle(scriptId, cleanText(actId, 40)) || '本幕讨论';
  const script = metadata.scripts[scriptId] || {};

  // 规则层：unsafe 拦截 + 数字门禁（账本内事实核对，不依赖 AI）
  const flags = [];
  for (const item of list) {
    if (UNSAFE_PATTERNS.some((pattern) => pattern.test(item.text))) {
      flags.push({ group: item.group, verdict: 'unsafe', issue: '发言包含现实威胁或自伤内容，主持人应立即制止并按课堂规范处理' });
      continue;
    }
    const gate = checkNumberGate(await loadPersonasSafe(), scriptId, item.text);
    if (!gate.ok) {
      flags.push({ group: item.group, verdict: 'factual_error', issue: `与剧本知识库冲突：${gate.violations[0].label}`, quote: item.text.slice(0, 80) });
    }
  }

  const ruleOutput = {
    summary: `共收到 ${list.length} 条发言。围绕「${cleanTopic}」，请各组先互相补齐时间线，再对照板书要点检查因果是否讲通。`,
    factFlags: flags,
    nextQuestions: (script.commonMisconceptions || []).slice(0, 3)
      .map((m) => `追问：班里是否有人刚才把「${m}」说反了？请举手表态并当堂纠正。`),
    mode: 'rule'
  };

  const callAi = deps.callAi || defaultCallAi;
  let output = ruleOutput;
  if (callAi) {
    try {
      const kb = (script.boardOutline || []).concat((script.objectives || []).map((o) => `教学目标：${o}`));
      const system = [
        '你是历史课堂分组讨论的 AI 主持人。只依据给定的剧本知识库要点主持与裁判，不引入知识库以外的史实，不评价历史人物功过。',
        '只输出 JSON：{"summary":"两句话以内的小结","factFlags":[{"group":"组名","verdict":"anachronism|factual_error","issue":"一句话","quote":"原话摘录"}],"nextQuestions":["下一步追问1","追问2"]}。',
        'factFlags 只列确有问题的发言；没有就给空数组。nextQuestions 给 1–3 个推动讨论的追问。'
      ].join('\n');
      const raw = await callAi(system, [], JSON.stringify({ knowledgeBase: kb, topic: cleanTopic, statements: list }));
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;
      if (parsed && typeof parsed.summary === 'string' && Array.isArray(parsed.factFlags) && Array.isArray(parsed.nextQuestions)) {
        output = {
          summary: parsed.summary.slice(0, 300),
          factFlags: flags.concat(parsed.factFlags.slice(0, 12).map((f) => ({
            group: cleanText(f?.group, 40) || '未分组', verdict: ['anachronism', 'factual_error'].includes(f?.verdict) ? f.verdict : 'factual_error',
            issue: cleanText(f?.issue, 200), quote: cleanText(f?.quote, 120)
          }))),
          nextQuestions: parsed.nextQuestions.slice(0, 3).map((q) => cleanText(q, 160)).filter(Boolean),
          mode: 'ai'
        };
      }
    } catch {
      // AI 不可用：保持规则版输出
    }
  }

  const modId = id('mod_');
  db.prepare(`INSERT INTO classroom_moderations(id,session_id,act_id,topic,mode,output_json,created_at)
    VALUES(?,?,?,?,?,?,?)`)
    .run(modId, null, cleanText(actId, 40) || null, cleanTopic, output.mode, toJson(output), new Date().toISOString());
  return { moderationId: modId, topic: cleanTopic, ...output };
}

/** 默认 AI 调用：与 npc-chat-service 同一配置与降级约定；未配置时抛错，由调用方降级规则版。 */
async function defaultCallAi(systemPrompt, session, userMessage) {
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
          ...session.map((t) => ({ role: t.role === 'assistant' ? 'assistant' : 'user', content: t.text })),
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        top_p: 0.8,
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

let personasCache = null;
async function loadPersonasSafe() {
  if (!personasCache) personasCache = await loadPersonas();
  return personasCache;
}
