
import pool from './src/config/db.js';

async function check() {
    try {
        const res = await pool.query(`
      SELECT p.id, p.title, p.seller_id, c.name as cat_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'approved' AND p.auction_end_time > NOW();
    `);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
