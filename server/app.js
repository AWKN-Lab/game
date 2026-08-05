import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { config, ROOT_DIR } from './config.js';
import { openDatabase, json as toJson, parseJson } from './db/database.js';
import { id, publicId, token, sha256, hashPassword, verifyPassword, parseCookies, sessionCookie, cleanText, cleanEnum, safeInteger, ipHash } from './lib/security.js';
import { generate as generateTeaching, supportedScript } from './services/ai-service.js';

const eventCatalogValue = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/event_catalog.json'), 'utf8'));
const eventCatalog = new Map(eventCatalogValue.events.map((event) => [event.name, event]));
const rateBuckets = new Map();
const publicWishStatuses = ['public', 'researching', 'planned', 'developing', 'implemented'];
const wishStatuses = ['pending_review', 'needs_info', 'public', 'researching', 'planned', 'developing', 'implemented', 'duplicate', 'not_planned', 'rejected'];
const feedbackStatuses = ['new', 'reviewing', 'replied', 'resolved', 'closed'];
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon'
};

function now() { return new Date().toISOString(); }

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  response.end(JSON.stringify(body));
}

function sendError(response, status, code, message, details) {
  sendJson(response, status, { success: false, code, message, details: details || undefined });
}

async function readJson(request) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > config.maxJsonBytes) throw Object.assign(new Error('请求体过大'), { status: 413, code: 'PAYLOAD_TOO_LARGE' });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('JSON 格式错误'), { status: 400, code: 'INVALID_JSON' }); }
}

function rateLimit(request, key, max, windowMs) {
  const bucketKey = `${ipHash(request)}:${key}`;
  const current = Date.now();
  let bucket = rateBuckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= current) bucket = { count: 0, resetAt: current + windowMs };
  bucket.count += 1;
  rateBuckets.set(bucketKey, bucket);
  return bucket.count <= max;
}

function sanitizePayload(name, payload) {
  const definition = eventCatalog.get(name);
  if (!definition) return null;
  const output = {};
  for (const key of definition.allowedPayloadKeys || []) {
    const value = payload?.[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') output[key] = cleanText(value, 240);
    else if (typeof value === 'number' && Number.isFinite(value)) output[key] = value;
    else if (typeof value === 'boolean') output[key] = value;
  }
  return output;
}

function upsertActorAndSession(db, actorId, sessionId, role, timestamp) {
  if (actorId) {
    db.prepare(`INSERT INTO actors(id, role, first_seen_at, last_seen_at) VALUES(?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET role=excluded.role,last_seen_at=excluded.last_seen_at`).run(actorId, role, timestamp, timestamp);
  }
  if (sessionId) {
    db.prepare(`INSERT INTO product_sessions(id, actor_id, role, started_at, last_seen_at) VALUES(?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET actor_id=COALESCE(excluded.actor_id, product_sessions.actor_id),role=excluded.role,last_seen_at=excluded.last_seen_at`).run(sessionId, actorId || null, role, timestamp, timestamp);
  }
}

function audit(db, adminId, action, entityType, entityId, before, after, request) {
  db.prepare(`INSERT INTO audit_logs(id,admin_id,action,entity_type,entity_id,before_json,after_json,ip_hash,created_at)
    VALUES(?,?,?,?,?,?,?,?,?)`).run(id('audit_'), adminId || null, action, entityType || null, entityId || null, before ? toJson(before) : null, after ? toJson(after) : null, ipHash(request), now());
}

function getAdmin(request, db) {
  const raw = parseCookies(request.headers.cookie).tt_admin_session;
  if (!raw) return null;
  const row = db.prepare(`SELECT s.token_hash,s.expires_at,u.id,u.email,u.active FROM admin_sessions s
    JOIN admin_users u ON u.id=s.admin_id WHERE s.token_hash=?`).get(sha256(raw));
  if (!row || !row.active || new Date(row.expires_at).getTime() <= Date.now()) return null;
  db.prepare('UPDATE admin_sessions SET last_seen_at=? WHERE token_hash=?').run(now(), row.token_hash);
  return { id: row.id, email: row.email, token: raw };
}

function requireAdmin(request, response, db) {
  const admin = getAdmin(request, db);
  if (!admin) { sendError(response, 401, 'ADMIN_AUTH_REQUIRED', '请先登录管理员账号'); return null; }
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
    const origin = request.headers.origin;
    if (origin && origin !== config.publicOrigin) { sendError(response, 403, 'ORIGIN_REJECTED', '请求来源不受信任'); return null; }
  }
  return admin;
}

function rowEvent(row) {
  return { ...row, payload: parseJson(row.payload_json, {}) };
}

async function handleEvents(request, response, db) {
  if (!config.eventTrackingEnabled) return sendJson(response, 202, { success: true, accepted: 0, disabled: true });
  if (!rateLimit(request, 'events', 120, 60000)) return sendError(response, 429, 'RATE_LIMITED', '事件上传过于频繁');
  const body = await readJson(request);
  const events = Array.isArray(body.events) ? body.events.slice(0, 20) : [];
  if (!events.length) return sendError(response, 400, 'EVENTS_REQUIRED', 'events 不能为空');
  const results = [];
  const receivedAt = now();
  db.exec('BEGIN IMMEDIATE;');
  try {
    for (const raw of events) {
      const name = cleanText(raw?.name, 80);
      const payload = sanitizePayload(name, raw?.payload || {});
      if (!payload) { results.push({ eventId: raw?.eventId || null, accepted: false, code: 'EVENT_NOT_ALLOWED' }); continue; }
      const eventId = cleanText(raw.eventId, 100) || id('evt_');
      const actorId = cleanText(raw.anonymousId, 100) || null;
      const sessionId = cleanText(raw.sessionId, 100) || null;
      const role = cleanEnum(raw.role, ['student', 'teacher'], 'student');
      const occurredAt = Number.isFinite(Date.parse(raw.occurredAt)) ? new Date(raw.occurredAt).toISOString() : receivedAt;
      upsertActorAndSession(db, actorId, sessionId, role, receivedAt);
      const result = db.prepare(`INSERT OR IGNORE INTO product_events(event_id,actor_id,session_id,name,occurred_at,received_at,page,role,payload_json)
        VALUES(?,?,?,?,?,?,?,?,?)`).run(eventId, actorId, sessionId, name, occurredAt, receivedAt, cleanText(raw.page, 180), role, toJson(payload));
      results.push({ eventId, accepted: result.changes > 0, duplicate: result.changes === 0 });
    }
    db.exec('COMMIT;');
  } catch (error) { db.exec('ROLLBACK;'); throw error; }
  sendJson(response, 202, { success: true, accepted: results.filter((item) => item.accepted).length, results });
}

async function handleTeaching(request, response, db) {
  if (!rateLimit(request, 'teaching', 30, 60000)) return sendError(response, 429, 'RATE_LIMITED', '生成请求过于频繁');
  const body = await readJson(request);
  const task = cleanEnum(body.task, ['lesson_plan', 'learning_review'], null);
  const scriptId = cleanText(body.scriptId, 80);
  if (!task) return sendError(response, 400, 'INVALID_TASK', 'task 必须为 lesson_plan 或 learning_review');
  if (!supportedScript(scriptId)) return sendError(response, 400, 'UNKNOWN_SCRIPT', '剧本不存在');
  const actorId = cleanText(body.anonymousId, 100) || null;
  const sessionId = cleanText(body.sessionId, 100) || null;
  const started = Date.now();
  const input = task === 'lesson_plan' ? {
    scriptId,
    duration: [15, 20, 40].includes(Number(body.duration)) ? Number(body.duration) : 40,
    studentLevel: cleanEnum(body.studentLevel, ['weak', 'average', 'strong'], 'average'),
    teachingFocus: cleanText(body.teachingFocus, 160),
    usageMode: cleanEnum(body.usageMode, ['projection', 'self_study'], 'projection')
  } : {
    scriptId,
    learningData: {
      completed: !!body.learningData?.completed,
      quizCorrect: safeInteger(body.learningData?.quizCorrect, 0, 1000, 0),
      quizTotal: safeInteger(body.learningData?.quizTotal, 0, 1000, 0),
      quizPct: safeInteger(body.learningData?.quizPct, 0, 100, 0),
      essayPct: safeInteger(body.learningData?.essayPct, 0, 100, 0),
      tier: cleanText(body.learningData?.tier, 40),
      wrongAnswers: (Array.isArray(body.learningData?.wrongAnswers) ? body.learningData.wrongAnswers : []).slice(-12).map((item) => ({
        question: cleanText(item.question, 240), userAnswer: cleanText(item.userAnswer, 160), correctAnswer: cleanText(item.correctAnswer, 160), explanation: cleanText(item.explanation, 320), knowledgeId: cleanText(item.knowledgeId, 80)
      })),
      knowledgeSummary: (Array.isArray(body.learningData?.knowledgeSummary) ? body.learningData.knowledgeSummary : []).slice(0, 30).map((item) => ({
        knowledgeId: cleanText(item.knowledgeId, 80), title: cleanText(item.title, 120), mastered: !!item.mastered, correct: safeInteger(item.correct, 0, 1000, 0), wrong: safeInteger(item.wrong, 0, 1000, 0)
      }))
    }
  };
  const result = await generateTeaching(task, input);
  const traceId = id('trace_');
  db.prepare(`INSERT INTO ai_runs(id,actor_id,session_id,task,script_id,mode,success,duration_ms,input_summary_json,output_json,error_code,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(traceId, actorId, sessionId, task, scriptId, result.mode, 1, Date.now() - started, toJson({ scriptId, task }), toJson(result.data), result.errorCode, now());
  sendJson(response, 200, { success: true, mode: result.mode, data: result.data, provider: result.provider, traceId, fallbackReason: result.errorCode });
}

async function handleFeedbackCreate(request, response, db) {
  if (!rateLimit(request, 'feedback', 10, 86400000)) return sendError(response, 429, 'DAILY_LIMIT', '今天提交的反馈已经较多，请明天再试');
  const body = await readJson(request);
  const message = cleanText(body.message, 1200);
  if (message.length < 2) return sendError(response, 400, 'MESSAGE_TOO_SHORT', '反馈至少需要两个字');
  const timestamp = now();
  const row = {
    id: id('fb_'), publicId: publicId('FB'), actorId: cleanText(body.anonymousId, 100) || null, sessionId: cleanText(body.sessionId, 100) || null,
    role: cleanEnum(body.role, ['student', 'teacher'], 'student'), category: cleanText(body.category, 40) || 'general', contextType: cleanText(body.contextType, 40), contextId: cleanText(body.contextId, 100), scriptId: cleanText(body.scriptId, 80), rating: safeInteger(body.rating, 1, 5, null), message
  };
  db.prepare(`INSERT INTO feedback(id,public_id,actor_id,session_id,role,category,context_type,context_id,script_id,rating,message,status,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,'new',?,?)`).run(row.id, row.publicId, row.actorId, row.sessionId, row.role, row.category, row.contextType, row.contextId, row.scriptId, row.rating, row.message, timestamp, timestamp);
  sendJson(response, 201, { success: true, id: row.id, publicId: row.publicId, status: 'new' });
}

function handleFeedbackStatus(response, db, publicIdValue) {
  const row = db.prepare('SELECT public_id,status,admin_reply,updated_at FROM feedback WHERE public_id=?').get(cleanText(publicIdValue, 80));
  if (!row) return sendError(response, 404, 'NOT_FOUND', '反馈不存在');
  sendJson(response, 200, { success: true, publicId: row.public_id, status: row.status, adminReply: row.admin_reply, updatedAt: row.updated_at });
}

async function handleWishCreate(request, response, db) {
  if (!config.wishPoolEnabled) return sendError(response, 503, 'WISH_POOL_DISABLED', '许愿池暂时关闭');
  if (!rateLimit(request, 'wish-create', 5, 86400000)) return sendError(response, 429, 'DAILY_LIMIT', '今天提交的愿望已经较多，请明天再试');
  const body = await readJson(request);
  const title = cleanText(body.title, 120);
  if (title.length < 2) return sendError(response, 400, 'TITLE_TOO_SHORT', '愿望标题至少需要两个字');
  const timestamp = now();
  const row = {
    id: id('wish_'), publicId: publicId('WISH'), actorId: cleanText(body.anonymousId, 100) || null, role: cleanEnum(body.role, ['student', 'teacher'], 'student'),
    wishType: cleanEnum(body.wishType, ['script', 'feature', 'zijin_question', 'luoshu_question'], 'feature'), title,
    reason: cleanText(body.reason, 1000), problem: cleanText(body.problem, 800), grade: cleanText(body.grade, 40), scriptId: cleanText(body.scriptId, 80), allowPublic: body.allowPublic === false ? 0 : 1
  };
  db.prepare(`INSERT INTO wishes(id,public_id,actor_id,role,wish_type,title,reason,problem,grade,script_id,allow_public,status,vote_count,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,'pending_review',0,?,?)`).run(row.id, row.publicId, row.actorId, row.role, row.wishType, row.title, row.reason, row.problem, row.grade, row.scriptId, row.allowPublic, timestamp, timestamp);
  sendJson(response, 201, { success: true, id: row.id, publicId: row.publicId, status: 'pending_review' });
}

function handleWishList(requestUrl, response, db, admin = false) {
  const requestedStatus = cleanText(requestUrl.searchParams.get('status'), 40);
  const type = cleanText(requestUrl.searchParams.get('type'), 40);
  const limit = safeInteger(requestUrl.searchParams.get('limit'), 1, 100, 30);
  const offset = safeInteger(requestUrl.searchParams.get('offset'), 0, 100000, 0);
  const clauses = [];
  const params = [];
  if (admin) {
    if (requestedStatus && wishStatuses.includes(requestedStatus)) { clauses.push('status=?'); params.push(requestedStatus); }
  } else {
    if (requestedStatus && publicWishStatuses.includes(requestedStatus)) { clauses.push('status=?'); params.push(requestedStatus); }
    else clauses.push(`status IN (${publicWishStatuses.map(() => '?').join(',')})`), params.push(...publicWishStatuses);
    clauses.push('allow_public=1');
  }
  if (type) { clauses.push('wish_type=?'); params.push(type); }
  const sql = `SELECT id,public_id,wish_type,title,reason,problem,grade,script_id,status,vote_count,admin_reply,priority,target_version,created_at,updated_at FROM wishes
    ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''} ORDER BY vote_count DESC, created_at DESC LIMIT ? OFFSET ?`;
  const rows = db.prepare(sql).all(...params, limit, offset).map((row) => ({
    id: row.id, publicId: row.public_id, wishType: row.wish_type, title: row.title, reason: row.reason, problem: row.problem, grade: row.grade, scriptId: row.script_id,
    status: row.status, voteCount: row.vote_count, adminReply: row.admin_reply, priority: row.priority, targetVersion: row.target_version, createdAt: row.created_at, updatedAt: row.updated_at
  }));
  sendJson(response, 200, { success: true, items: rows, limit, offset });
}

async function handleWishVote(request, response, db, wishId, active) {
  if (!rateLimit(request, 'wish-vote', 120, 86400000)) return sendError(response, 429, 'RATE_LIMITED', '点亮操作过于频繁');
  const body = await readJson(request);
  const actorId = cleanText(body.anonymousId, 100);
  if (!actorId) return sendError(response, 400, 'ANONYMOUS_ID_REQUIRED', '缺少匿名用户ID');
  const wish = db.prepare('SELECT id,status FROM wishes WHERE id=?').get(cleanText(wishId, 100));
  if (!wish || !publicWishStatuses.includes(wish.status)) return sendError(response, 404, 'NOT_FOUND', '公开愿望不存在');
  db.exec('BEGIN IMMEDIATE;');
  try {
    if (active) db.prepare('INSERT OR IGNORE INTO wish_votes(wish_id,actor_id,created_at) VALUES(?,?,?)').run(wish.id, actorId, now());
    else db.prepare('DELETE FROM wish_votes WHERE wish_id=? AND actor_id=?').run(wish.id, actorId);
    const count = db.prepare('SELECT COUNT(*) count FROM wish_votes WHERE wish_id=?').get(wish.id).count;
    db.prepare('UPDATE wishes SET vote_count=?,updated_at=? WHERE id=?').run(count, now(), wish.id);
    db.exec('COMMIT;');
    sendJson(response, 200, { success: true, active, voteCount: count });
  } catch (error) { db.exec('ROLLBACK;'); throw error; }
}

async function handleAdminLogin(request, response, db) {
  if (!rateLimit(request, 'admin-login', 5, 600000)) return sendError(response, 429, 'LOGIN_RATE_LIMIT', '登录失败次数过多，请稍后再试');
  const body = await readJson(request);
  const email = cleanText(body.email, 160).toLowerCase();
  const user = db.prepare('SELECT id,email,password_hash,active FROM admin_users WHERE email=?').get(email);
  const valid = user && user.active && verifyPassword(body.password, user.password_hash);
  if (!valid) { audit(db, user?.id, 'admin.login_failed', 'admin_user', user?.id, null, { email }, request); return sendError(response, 401, 'INVALID_CREDENTIALS', '邮箱或密码错误'); }
  const rawToken = token();
  const createdAt = now();
  const expiresAt = new Date(Date.now() + config.sessionTtlHours * 3600000).toISOString();
  db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(createdAt);
  db.prepare('INSERT INTO admin_sessions(token_hash,admin_id,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?)').run(sha256(rawToken), user.id, expiresAt, createdAt, createdAt);
  audit(db, user.id, 'admin.login', 'admin_user', user.id, null, { email: user.email }, request);
  sendJson(response, 200, { success: true, admin: { id: user.id, email: user.email }, expiresAt }, { 'Set-Cookie': sessionCookie(rawToken, { secure: config.cookieSecure, maxAge: config.sessionTtlHours * 3600 }) });
}

function handleAdminLogout(request, response, db) {
  const cookies = parseCookies(request.headers.cookie);
  const admin = getAdmin(request, db);
  if (cookies.tt_admin_session) db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(sha256(cookies.tt_admin_session));
  if (admin) audit(db, admin.id, 'admin.logout', 'admin_user', admin.id, null, null, request);
  sendJson(response, 200, { success: true }, { 'Set-Cookie': sessionCookie('', { secure: config.cookieSecure }) });
}

function handleAdminDashboard(response, db) {
  const today = new Date(); today.setHours(0, 0, 0, 0); const since = today.toISOString();
  const counts = {
    sessionsToday: db.prepare('SELECT COUNT(*) count FROM product_sessions WHERE started_at>=?').get(since).count,
    eventsToday: db.prepare('SELECT COUNT(*) count FROM product_events WHERE received_at>=?').get(since).count,
    scriptsStartedToday: db.prepare("SELECT COUNT(*) count FROM product_events WHERE name='script.start' AND received_at>=?").get(since).count,
    scriptsEndedToday: db.prepare("SELECT COUNT(*) count FROM product_events WHERE name='script.ending' AND received_at>=?").get(since).count,
    aiRunsToday: db.prepare('SELECT COUNT(*) count FROM ai_runs WHERE created_at>=?').get(since).count,
    aiRuleFallbackToday: db.prepare("SELECT COUNT(*) count FROM ai_runs WHERE mode='rule' AND created_at>=?").get(since).count,
    newFeedback: db.prepare("SELECT COUNT(*) count FROM feedback WHERE status='new'").get().count,
    pendingWishes: db.prepare("SELECT COUNT(*) count FROM wishes WHERE status='pending_review'").get().count
  };
  sendJson(response, 200, { success: true, counts });
}

function handleAdminEvents(url, response, db) {
  const clauses = []; const params = [];
  for (const [query, column] of [['actorId','actor_id'],['sessionId','session_id'],['name','name'],['role','role']]) {
    const value = cleanText(url.searchParams.get(query), 100); if (value) { clauses.push(`${column}=?`); params.push(value); }
  }
  const scriptId = cleanText(url.searchParams.get('scriptId'), 80);
  if (scriptId) { clauses.push("json_extract(payload_json,'$.scriptId')=?"); params.push(scriptId); }
  const limit = safeInteger(url.searchParams.get('limit'), 1, 200, 50);
  const offset = safeInteger(url.searchParams.get('offset'), 0, 100000, 0);
  const rows = db.prepare(`SELECT event_id,actor_id,session_id,name,occurred_at,received_at,page,role,payload_json FROM product_events ${clauses.length ? 'WHERE '+clauses.join(' AND ') : ''} ORDER BY occurred_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset).map(rowEvent);
  sendJson(response, 200, { success: true, items: rows, limit, offset });
}

function handleAdminActor(actorId, response, db) {
  const actor = db.prepare('SELECT id,role,first_seen_at,last_seen_at FROM actors WHERE id=?').get(cleanText(actorId, 100));
  if (!actor) return sendError(response, 404, 'NOT_FOUND', '匿名用户不存在');
  const events = db.prepare('SELECT event_id,session_id,name,occurred_at,page,role,payload_json FROM product_events WHERE actor_id=? ORDER BY occurred_at ASC LIMIT 1000').all(actor.id).map(rowEvent);
  const feedback = db.prepare('SELECT public_id,category,context_type,script_id,rating,message,status,admin_reply,created_at FROM feedback WHERE actor_id=? ORDER BY created_at DESC').all(actor.id);
  const wishes = db.prepare('SELECT public_id,wish_type,title,status,vote_count,admin_reply,created_at FROM wishes WHERE actor_id=? ORDER BY created_at DESC').all(actor.id);
  sendJson(response, 200, { success: true, actor, events, feedback, wishes });
}

function handleAdminFeedbackList(url, response, db) {
  const status = cleanText(url.searchParams.get('status'), 40); const limit = safeInteger(url.searchParams.get('limit'), 1, 200, 50);
  const rows = status && feedbackStatuses.includes(status)
    ? db.prepare('SELECT * FROM feedback WHERE status=? ORDER BY created_at DESC LIMIT ?').all(status, limit)
    : db.prepare('SELECT * FROM feedback ORDER BY created_at DESC LIMIT ?').all(limit);
  sendJson(response, 200, { success: true, items: rows.map((row) => ({ ...row, publicId: row.public_id, actorId: row.actor_id, sessionId: row.session_id, contextType: row.context_type, contextId: row.context_id, scriptId: row.script_id, adminReply: row.admin_reply, createdAt: row.created_at, updatedAt: row.updated_at })) });
}

async function handleAdminFeedbackUpdate(request, response, db, admin, feedbackId) {
  const body = await readJson(request);
  const before = db.prepare('SELECT * FROM feedback WHERE id=?').get(cleanText(feedbackId, 100));
  if (!before) return sendError(response, 404, 'NOT_FOUND', '反馈不存在');
  const status = cleanEnum(body.status, feedbackStatuses, before.status);
  const reply = body.adminReply === undefined ? before.admin_reply : cleanText(body.adminReply, 1200);
  db.prepare('UPDATE feedback SET status=?,admin_reply=?,updated_at=? WHERE id=?').run(status, reply, now(), before.id);
  const after = db.prepare('SELECT * FROM feedback WHERE id=?').get(before.id);
  audit(db, admin.id, 'feedback.update', 'feedback', before.id, before, after, request);
  sendJson(response, 200, { success: true, item: after });
}

async function handleAdminWishUpdate(request, response, db, admin, wishId) {
  const body = await readJson(request);
  const before = db.prepare('SELECT * FROM wishes WHERE id=?').get(cleanText(wishId, 100));
  if (!before) return sendError(response, 404, 'NOT_FOUND', '愿望不存在');
  const nextStatus = cleanEnum(body.status, wishStatuses, before.status);
  const reply = body.adminReply === undefined ? before.admin_reply : cleanText(body.adminReply, 1200);
  const priority = body.priority === undefined ? before.priority : cleanText(body.priority, 30);
  const targetVersion = body.targetVersion === undefined ? before.target_version : cleanText(body.targetVersion, 60);
  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare('UPDATE wishes SET status=?,admin_reply=?,priority=?,target_version=?,updated_at=? WHERE id=?').run(nextStatus, reply, priority, targetVersion, now(), before.id);
    if (nextStatus !== before.status) db.prepare('INSERT INTO wish_status_history(id,wish_id,from_status,to_status,admin_id,note,created_at) VALUES(?,?,?,?,?,?,?)').run(id('wh_'), before.id, before.status, nextStatus, admin.id, cleanText(body.note, 500), now());
    db.exec('COMMIT;');
  } catch (error) { db.exec('ROLLBACK;'); throw error; }
  const after = db.prepare('SELECT * FROM wishes WHERE id=?').get(before.id);
  audit(db, admin.id, 'wish.update', 'wish', before.id, before, after, request);
  sendJson(response, 200, { success: true, item: after });
}

function handleAdminAudit(url, response, db) {
  const limit = safeInteger(url.searchParams.get('limit'), 1, 200, 100);
  const rows = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(limit).map((row) => ({ ...row, before: parseJson(row.before_json, null), after: parseJson(row.after_json, null) }));
  sendJson(response, 200, { success: true, items: rows });
}

function serveStatic(url, response) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/mvp' || pathname === '/ai') pathname = '/ai-mvp.html';
  if (/^\/(?:\.git|server\/data|\.env)/.test(pathname)) return sendError(response, 404, 'NOT_FOUND', '资源不存在');
  const target = path.resolve(ROOT_DIR, '.' + pathname);
  if (!target.startsWith(ROOT_DIR + path.sep)) return sendError(response, 403, 'FORBIDDEN', '非法路径');
  let file = target;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return sendError(response, 404, 'NOT_FOUND', '资源不存在');
  const extension = path.extname(file).toLowerCase();
  response.writeHead(200, { 'Content-Type': mimeTypes[extension] || 'application/octet-stream', 'Cache-Control': extension === '.html' || extension === '.json' ? 'no-cache' : 'public, max-age=3600' });
  fs.createReadStream(file).pipe(response);
}

export function createApp() {
  const db = openDatabase();
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, config.publicOrigin);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('X-Frame-Options', 'SAMEORIGIN');
    try {
      if (request.method === 'OPTIONS') { response.writeHead(204); return response.end(); }
      if (!url.pathname.startsWith('/api/v1/')) return serveStatic(url, response);

      if (request.method === 'GET' && url.pathname === '/api/v1/health/live') return sendJson(response, 200, { success: true, status: 'live', time: now() });
      if (request.method === 'GET' && url.pathname === '/api/v1/health/ready') {
        const dbReady = !!db.prepare('SELECT 1 value').get()?.value;
        return sendJson(response, dbReady ? 200 : 503, { success: dbReady, status: dbReady ? 'ready' : 'not_ready', aiConfigured: !!(config.aiApiKey || config.aiFallbackApiKey) });
      }
      if (request.method === 'POST' && url.pathname === '/api/v1/events/batch') return await handleEvents(request, response, db);
      if (request.method === 'POST' && url.pathname === '/api/v1/teaching-assistant') return await handleTeaching(request, response, db);
      if (request.method === 'POST' && url.pathname === '/api/v1/feedback') return await handleFeedbackCreate(request, response, db);
      const feedbackStatusMatch = url.pathname.match(/^\/api\/v1\/feedback\/([^/]+)\/status$/);
      if (request.method === 'GET' && feedbackStatusMatch) return handleFeedbackStatus(response, db, feedbackStatusMatch[1]);
      if (request.method === 'GET' && url.pathname === '/api/v1/wishes') return handleWishList(url, response, db, false);
      if (request.method === 'POST' && url.pathname === '/api/v1/wishes') return await handleWishCreate(request, response, db);
      const voteMatch = url.pathname.match(/^\/api\/v1\/wishes\/([^/]+)\/vote$/);
      if (voteMatch && request.method === 'POST') return await handleWishVote(request, response, db, voteMatch[1], true);
      if (voteMatch && request.method === 'DELETE') return await handleWishVote(request, response, db, voteMatch[1], false);

      if (request.method === 'POST' && url.pathname === '/api/v1/admin/auth/login') return await handleAdminLogin(request, response, db);
      if (request.method === 'POST' && url.pathname === '/api/v1/admin/auth/logout') return handleAdminLogout(request, response, db);
      if (request.method === 'GET' && url.pathname === '/api/v1/admin/auth/me') {
        const admin = requireAdmin(request, response, db); if (!admin) return;
        return sendJson(response, 200, { success: true, admin: { id: admin.id, email: admin.email } });
      }

      if (url.pathname.startsWith('/api/v1/admin/')) {
        if (!config.adminDashboardEnabled) return sendError(response, 503, 'ADMIN_DISABLED', '管理员后台暂时关闭');
        const admin = requireAdmin(request, response, db); if (!admin) return;
        if (request.method === 'GET' && url.pathname === '/api/v1/admin/dashboard') return handleAdminDashboard(response, db);
        if (request.method === 'GET' && url.pathname === '/api/v1/admin/events') return handleAdminEvents(url, response, db);
        const actorMatch = url.pathname.match(/^\/api\/v1\/admin\/actors\/([^/]+)$/);
        if (request.method === 'GET' && actorMatch) return handleAdminActor(actorMatch[1], response, db);
        if (request.method === 'GET' && url.pathname === '/api/v1/admin/feedback') return handleAdminFeedbackList(url, response, db);
        const adminFeedbackMatch = url.pathname.match(/^\/api\/v1\/admin\/feedback\/([^/]+)$/);
        if (request.method === 'PATCH' && adminFeedbackMatch) return await handleAdminFeedbackUpdate(request, response, db, admin, adminFeedbackMatch[1]);
        if (request.method === 'GET' && url.pathname === '/api/v1/admin/wishes') return handleWishList(url, response, db, true);
        const adminWishMatch = url.pathname.match(/^\/api\/v1\/admin\/wishes\/([^/]+)$/);
        if (request.method === 'PATCH' && adminWishMatch) return await handleAdminWishUpdate(request, response, db, admin, adminWishMatch[1]);
        if (request.method === 'GET' && url.pathname === '/api/v1/admin/audit') return handleAdminAudit(url, response, db);
      }

      return sendError(response, 404, 'ROUTE_NOT_FOUND', '接口不存在');
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', message: error.message, stack: error.stack, path: url.pathname }));
      if (!response.headersSent) sendError(response, error.status || 500, error.code || 'INTERNAL_ERROR', error.status ? error.message : '服务暂时不可用');
      else response.end();
    }
  });
}
