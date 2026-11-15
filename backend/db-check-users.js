
import pool from './src/config/db.js';

async function check() {
    try {
        const res = await pool.query(`
      SELECT id, name, role FROM users WHERE id IN (55, 115, 129, 130);
    `);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
