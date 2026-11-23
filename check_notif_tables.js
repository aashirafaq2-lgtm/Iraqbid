const { Pool } = require('/var/www/bid-backend/Bid-app-Backend/node_modules/pg');
require('/var/www/bid-backend/Bid-app-Backend/node_modules/dotenv').config({ path: '/var/www/bid-backend/Bid-app-Backend/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%notif%' OR table_name LIKE '%token%' OR table_name LIKE '%device%');");
    console.log('Notification related tables:', tables.rows);

    const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';");
    console.log('Users columns:', cols.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

check();
