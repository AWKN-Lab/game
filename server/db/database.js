import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

let instance = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'student',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS product_sessions (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  started_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY(actor_id) REFERENCES actors(id)
);
CREATE TABLE IF NOT EXISTS product_events (
  event_id TEXT PRIMARY KEY,
  actor_id TEXT,
  session_id TEXT,
  name TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  page TEXT,
  role TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY(actor_id) REFERENCES actors(id),
  FOREIGN KEY(session_id) REFERENCES product_sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_events_actor_time ON product_events(actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name_time ON product_events(name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON product_events(session_id, occurred_at);
CREATE TABLE IF NOT EXISTS ai_runs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  session_id TEXT,
  task TEXT NOT NULL,
  script_id TEXT,
  mode TEXT NOT NULL,
  success INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  input_summary_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_runs_created ON ai_runs(created_at DESC);
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  actor_id TEXT,
  session_id TEXT,
  role TEXT,
  category TEXT NOT NULL,
  context_type TEXT,
  context_id TEXT,
  script_id TEXT,
  rating INTEGER,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  admin_reply TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feedback_status_time ON feedback(status, created_at DESC);
CREATE TABLE IF NOT EXISTS wishes (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  actor_id TEXT,
  role TEXT,
  wish_type TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT,
  problem TEXT,
  grade TEXT,
  script_id TEXT,
  allow_public INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending_review',
  vote_count INTEGER NOT NULL DEFAULT 0,
  admin_reply TEXT,
  priority TEXT,
  target_version TEXT,
  github_issue TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wishes_status_votes ON wishes(status, vote_count DESC, created_at DESC);
CREATE TABLE IF NOT EXISTS wish_votes (
  wish_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(wish_id, actor_id),
  FOREIGN KEY(wish_id) REFERENCES wishes(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS wish_status_history (
  id TEXT PRIMARY KEY,
  wish_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  admin_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(wish_id) REFERENCES wishes(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY(admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE TABLE IF NOT EXISTS privacy_preferences (
  actor_id TEXT PRIMARY KEY,
  event_tracking INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS npc_states (
  actor_id TEXT NOT NULL,
  script_id TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  trust INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(actor_id, script_id, npc_id)
);
CREATE TABLE IF NOT EXISTS npc_memory_records (
  memory_id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  script_id TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  kind TEXT NOT NULL,
  role TEXT,
  content TEXT NOT NULL,
  story_time TEXT,
  source_refs_json TEXT NOT NULL DEFAULT '[]',
  content_hash TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'ACTIVE',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_npc_memory_view ON npc_memory_records(actor_id, script_id, npc_id, tier, state, created_at);
CREATE TABLE IF NOT EXISTS classroom_sessions (
  id TEXT PRIMARY KEY,
  join_code TEXT NOT NULL UNIQUE,
  script_id TEXT NOT NULL,
  teacher_actor_id TEXT,
  title TEXT,
  act_id TEXT,
  status TEXT NOT NULL DEFAULT 'briefing',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_classroom_updated ON classroom_sessions(updated_at DESC);
CREATE TABLE IF NOT EXISTS classroom_tallies (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  act_id TEXT,
  topic TEXT,
  counts_json TEXT NOT NULL DEFAULT '[]',
  total INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES classroom_sessions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_classroom_tallies ON classroom_tallies(session_id, created_at DESC);
CREATE TABLE IF NOT EXISTS classroom_moderations (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  act_id TEXT,
  topic TEXT,
  mode TEXT NOT NULL DEFAULT 'rule',
  output_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_classroom_mods ON classroom_moderations(created_at DESC);
`;

export function openDatabase() {
  if (instance) return instance;
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  instance = new DatabaseSync(config.dbPath);
  instance.exec('PRAGMA journal_mode=WAL;');
  instance.exec('PRAGMA foreign_keys=ON;');
  instance.exec('PRAGMA busy_timeout=5000;');
  migrate(instance);
  return instance;
}

export function migrate(db = openDatabase()) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    db.exec(SCHEMA);
    const existing = db.prepare('SELECT version FROM schema_migrations WHERE version = 1').get();
    if (!existing) db.prepare('INSERT INTO schema_migrations(version, name, applied_at) VALUES(1, ?, ?)').run('initial_mvp_schema', new Date().toISOString());
    // 幂等补列：老库升级到 GitHub Issue 联动字段（CREATE TABLE IF NOT EXISTS 不会改已有表）。
    const wishColumns = db.prepare('PRAGMA table_info(wishes)').all().map((column) => column.name);
    if (!wishColumns.includes('github_issue')) db.exec('ALTER TABLE wishes ADD COLUMN github_issue TEXT;');
    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
  return db;
}

export function closeDatabase() {
  if (instance) instance.close();
  instance = null;
}

export function json(value, fallback = {}) {
  try { return JSON.stringify(value ?? fallback); } catch { return JSON.stringify(fallback); }
}

export function parseJson(value, fallback = {}) {
  try { return JSON.parse(value || ''); } catch { return fallback; }
}
