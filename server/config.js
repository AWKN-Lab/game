import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(here, '..');

function loadDotEnv(file = path.join(ROOT_DIR, '.env')) {
  if (!fs.existsSync(file)) return;
  const source = fs.readFileSync(file, 'utf8');
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

function bool(name, fallback) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

function integer(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

const dataDir = path.resolve(ROOT_DIR, process.env.DATA_DIR || './server/data');

export const config = Object.freeze({
  host: process.env.HOST || '127.0.0.1',
  port: integer('PORT', 8787),
  publicOrigin: process.env.PUBLIC_ORIGIN || 'http://localhost:8787',
  dataDir,
  dbPath: path.resolve(ROOT_DIR, process.env.DB_PATH || './server/data/time-theater.sqlite'),
  sessionTtlHours: integer('SESSION_TTL_HOURS', 12),
  cookieSecure: bool('COOKIE_SECURE', false),
  aiEnabled: bool('AI_ENABLED', true),
  aiBaseUrl: (process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, ''),
  aiModel: process.env.AI_MODEL || 'qwen-plus',
  aiApiKey: process.env.AI_API_KEY || process.env.DASHSCOPE_API_KEY || '',
  aiFallbackBaseUrl: (process.env.AI_FALLBACK_BASE_URL || '').replace(/\/$/, ''),
  aiFallbackModel: process.env.AI_FALLBACK_MODEL || '',
  aiFallbackApiKey: process.env.AI_FALLBACK_API_KEY || '',
  aiTimeoutMs: integer('AI_TIMEOUT_MS', 25000),
  eventTrackingEnabled: bool('EVENT_TRACKING_ENABLED', true),
  wishPoolEnabled: bool('WISH_POOL_ENABLED', true),
  adminDashboardEnabled: bool('ADMIN_DASHBOARD_ENABLED', true),
  maxJsonBytes: 64 * 1024
});

fs.mkdirSync(config.dataDir, { recursive: true });
