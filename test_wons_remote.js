import pool from './src/config/db.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const userRes = await pool.query("SELECT id, phone, role FROM users WHERE phone LIKE '%7700914000%' OR id = 10");
  console.log('User found:', userRes.rows);
  if (userRes.rows.length > 0) {
    const user = userRes.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role || 'buyer' }, process.env.JWT_SECRET || 'your-secret-key-change-this-in-production');
    const res = await fetch('http://localhost:5055/api/buyer/bidding-history?status=won', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    console.log('Response status:', res.status);
    console.log('Response success:', data.success);
    console.log('Items count:', data.data ? data.data.length : 'none');
    if (data.data && data.data.length > 0) {
      console.log('Sample item:', data.data[0]);
    }
  }
  process.exit(0);
}
run().catch(e => { console.error('ERR:', e); process.exit(1); });
