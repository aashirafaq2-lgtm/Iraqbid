import pool from './src/config/db.js';
import bcrypt from 'bcrypt';

async function updateAdmin() {
  const hash = await bcrypt.hash('admin123', 10);
  console.log('New hash generated');

  const res = await pool.query(
    "UPDATE users SET password = $1 WHERE email = 'admin@iraqbid.com' RETURNING id, email, role",
    [hash]
  );
  console.log('Admin password updated:', res.rows);

  const superRes = await pool.query(
    "UPDATE users SET password = $1 WHERE email = 'superadmin@iraqbid.com' RETURNING id, email, role",
    [hash]
  );
  console.log('Superadmin password updated:', superRes.rows);

  await pool.end();
}

updateAdmin().catch(console.error);
