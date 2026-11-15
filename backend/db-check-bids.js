
import pool from './src/config/db.js';

async function check() {
    try {
        const res = await pool.query(`
      SELECT id, total_bids FROM products WHERE status = 'approved' AND auction_end_time > NOW();
    `);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
