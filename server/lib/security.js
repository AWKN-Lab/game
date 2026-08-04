import crypto from 'node:crypto';

const SCRYPT_PARAMS = Object.freeze({ N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });

export function id(prefix = '') {
  return prefix + crypto.randomUUID();
}

export function publicId(prefix) {
  return String(prefix || 'TT').toUpperCase() + '-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

export function token(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

export function hashPassword(password) {
  if (String(password || '').length < 10) throw new Error('管理员密码至少 10 位');
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, 64, SCRYPT_PARAMS);
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export function verifyPassword(password, stored) {
  try {
    const [algorithm, n, r, p, saltValue, hashValue] = String(stored || '').split('$');
    if (algorithm !== 'scrypt') return false;
    const salt = Buffer.from(saltValue, 'base64url');
    const expected = Buffer.from(hashValue, 'base64url');
    const actual = crypto.scryptSync(String(password || ''), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT_PARAMS.maxmem
    });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function parseCookies(header) {
  const result = {};
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try { result[key] = decodeURIComponent(value); } catch { result[key] = value; }
  }
  return result;
}

export function sessionCookie(value, options = {}) {
  const attributes = [
    `tt_admin_session=${encodeURIComponent(value || '')}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    options.secure ? 'Secure' : '',
    value ? `Max-Age=${Math.max(0, Number(options.maxAge || 0))}` : 'Max-Age=0'
  ].filter(Boolean);
  return attributes.join('; ');
}

export function cleanText(value, max = 500) {
  return String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

export function cleanEnum(value, allowed, fallback) {
  const text = String(value || '');
  return allowed.includes(text) ? text : fallback;
}

export function safeInteger(value, min, max, fallback = null) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

export function ipHash(request) {
  const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return sha256(forwarded || request.socket.remoteAddress || 'unknown').slice(0, 24);
}

export function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}
