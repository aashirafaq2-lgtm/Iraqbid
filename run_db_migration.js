const { Pool } = require('/var/www/bid-backend/Bid-app-Backend/node_modules/pg');
require('/var/www/bid-backend/Bid-app-Backend/node_modules/dotenv').config({ path: '/var/www/bid-backend/Bid-app-Backend/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log('Connecting to DB...');
    await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;');
    console.log('Dropped old constraint.');
    await pool.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'manager', 'editor', 'employee', 'moderator', 'viewer', 'company_products', 'seller_products', 'buyer', 'user'));");
    console.log('Added new constraint.');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);');
    console.log('Ensured username column.');

    const res = await pool.query("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'users'::regclass AND contype = 'c';");
    console.log('Current constraints:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
