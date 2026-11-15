
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_xejr5zMtIH2v@ep-polished-credit-ahmwg7k7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function approveAll() {
    try {
        const res = await pool.query(`
      UPDATE products 
      SET status = 'approved', 
          auction_end_time = COALESCE(auction_end_time, NOW() + (duration * INTERVAL '1 day'))
      WHERE status = 'pending'
      RETURNING id, title;
    `);

        if (res.rowCount > 0) {
            console.log(`✅ Approved ${res.rowCount} pending products:`);
            console.table(res.rows);
        } else {
            console.log('✅ No pending products to approve.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

approveAll();
