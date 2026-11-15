
import pool from './src/config/db.js';

async function checkColumns() {
    try {
        const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('users', 'products', 'orders') 
      AND column_name IN ('reward_balance', 'referral_code', 'auction_processed', 'points', 'hours_left');
    `);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkColumns();
