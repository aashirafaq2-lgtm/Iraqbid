import pool from './src/config/db.js';

async function check() {
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'app_settings'");
  console.log('Existing app_settings columns:', cols.rows);
  const rows = await pool.query("SELECT * FROM app_settings LIMIT 5");
  console.log('Existing app_settings data:', rows.rows);
  await pool.end();
}
check().catch(console.error);

