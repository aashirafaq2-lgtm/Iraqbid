import pool from './src/config/db.js';
import bcrypt from 'bcrypt';

async function check() {
  const hash = await bcrypt.hash('Admin@123456', 10);
  await pool.query("UPDATE users SET password = $1 WHERE email = 'superadmin@iraqbid.com'", [hash]);
  console.log('Password reset to Admin@123456 for superadmin@iraqbid.com');
  await pool.end();
}
check().catch(console.error);
