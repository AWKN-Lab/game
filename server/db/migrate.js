import { openDatabase, closeDatabase } from './database.js';

try {
  const db = openDatabase();
  const migrations = db.prepare('SELECT version,name,applied_at FROM schema_migrations ORDER BY version').all();
  console.log(JSON.stringify({ success: true, migrations }, null, 2));
} finally {
  closeDatabase();
}
