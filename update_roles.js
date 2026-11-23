import pool from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
    console.log('✅ Dropped old constraint');
    await pool.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('superadmin', 'admin', 'manager', 'editor', 'employee', 'moderator', 'viewer', 'company_products', 'seller_products', 'buyer', 'user'))
    `);
    console.log('✅ Updated users_role_check with employee, manager, editor, etc.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
