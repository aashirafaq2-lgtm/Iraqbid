
import pool from './src/config/db.js';

async function check() {
  try {
    const res = await pool.query(`
      SELECT id, title, image_url, images, seller_id
      FROM products 
      WHERE status = 'approved' AND auction_end_time > NOW();
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
