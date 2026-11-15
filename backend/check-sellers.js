
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_xejr5zMtIH2v@ep-polished-credit-ahmwg7k7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' });
async function run() {
    const res = await pool.query(`
    SELECT DISTINCT u.id, u.name, u.role, COUNT(p.id) as product_count
    FROM users u
    JOIN products p ON p.seller_id = u.id
    GROUP BY u.id, u.name, u.role
  `);
    console.table(res.rows);
    process.exit(0);
}
run();
