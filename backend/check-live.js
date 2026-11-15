
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_xejr5zMtIH2v@ep-polished-credit-ahmwg7k7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' });
async function run() {
    const res = await pool.query(`
    SELECT u.role, COUNT(*) 
    FROM products p 
    JOIN users u ON p.seller_id = u.id 
    WHERE p.status = 'approved' AND p.auction_end_time > NOW()
    GROUP BY u.role
  `);
    console.log('Live products by seller role:');
    console.table(res.rows);

    const resNull = await pool.query(`
    SELECT COUNT(*) 
    FROM products p 
    WHERE p.seller_id IS NULL AND p.status = 'approved' AND p.auction_end_time > NOW()
  `);
    console.log('Live products with seller_id IS NULL:', resNull.rows[0].count);

    process.exit(0);
}
run();
