import pool from './src/config/db.js';

async function audit() {
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('Tables in DB:', tables.rows.map(r => r.table_name));
  await pool.end();
}
audit().catch(console.error);

