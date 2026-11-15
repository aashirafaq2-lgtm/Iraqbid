
import pool from './src/config/db.js';

async function check() {
    try {
        const res = await pool.query(`
      SELECT id, title, created_at, seller_id
      FROM products 
      WHERE status = 'approved' AND auction_end_time > NOW()
      ORDER BY created_at DESC;
    `);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
