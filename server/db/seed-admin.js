import process from 'node:process';
import { openDatabase, closeDatabase } from './database.js';
import { id, hashPassword, cleanText } from '../lib/security.js';

const email = cleanText(process.env.ADMIN_EMAIL, 160).toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';

if (!email || !email.includes('@')) {
  console.error('ADMIN_EMAIL 未配置或格式错误');
  process.exit(1);
}
if (password.length < 10 || /change-this/i.test(password)) {
  console.error('ADMIN_PASSWORD 至少 10 位，并且不能使用示例密码');
  process.exit(1);
}

const db = openDatabase();
try {
  const timestamp = new Date().toISOString();
  const existing = db.prepare('SELECT id FROM admin_users WHERE email=?').get(email);
  const passwordHash = hashPassword(password);
  if (existing) {
    db.prepare('UPDATE admin_users SET password_hash=?,active=1,updated_at=? WHERE id=?').run(passwordHash, timestamp, existing.id);
    console.log(JSON.stringify({ success: true, action: 'updated', id: existing.id, email }));
  } else {
    const adminId = id('admin_');
    db.prepare('INSERT INTO admin_users(id,email,password_hash,active,created_at,updated_at) VALUES(?,?,?,1,?,?)').run(adminId, email, passwordHash, timestamp, timestamp);
    console.log(JSON.stringify({ success: true, action: 'created', id: adminId, email }));
  }
} finally {
  closeDatabase();
}
